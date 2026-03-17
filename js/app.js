import { bindPlanForm } from "./ui/plan-form.js";
import { renderResultsDashboard, bindResultsDashboardEvents } from "./ui/results-view.js";
import { renderScenarioTable } from "./ui/yearly-table.js";
import { renderInvestmentProjectionChart, renderSpendingPathChart } from "./ui/charts.js";

const WORKER_URL = "./js/worker/worker.js?v=debug11";

const planFormElement = document.getElementById("planForm");

const resultsSummaryElement = document.getElementById("resultsSummary");
const resultsChartElement = document.getElementById("resultsChart");
const scenarioTableElement = document.getElementById("scenarioTable");

const tabInputsElement = document.getElementById("tabInputs");
const tabResultsElement = document.getElementById("tabResults");
const inputsScreenElement = document.getElementById("inputsScreen");
const resultsScreenElement = document.getElementById("resultsScreen");

const heroSuccessRateElement = document.getElementById("heroSuccessRate");
const heroMedianWealthElement = document.getElementById("heroMedianWealth");
const heroWorstScenarioElement = document.getElementById("heroWorstScenario");
const heroScenarioCountElement = document.getElementById("heroScenarioCount");

let worker = null;
let latestResult = null;

const uiState = {
  chartMode: "nominal",
  guardrails: "on",
  showYearlyTable: true
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatPercentage(value) {
  return `${(toFiniteNumber(value) * 100).toFixed(1)}%`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(toFiniteNumber(value));
}

function formatWholeNumber(value) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 0
  }).format(toFiniteNumber(value));
}

function showScreen(screen) {
  const showInputs = screen === "inputs";

  if (inputsScreenElement) {
    inputsScreenElement.hidden = !showInputs;
    inputsScreenElement.classList.toggle("screen-panel-active", showInputs);
  }

  if (resultsScreenElement) {
    resultsScreenElement.hidden = showInputs;
    resultsScreenElement.classList.toggle("screen-panel-active", !showInputs);
  }

  if (tabInputsElement) {
    tabInputsElement.classList.toggle("is-active", showInputs);
    tabInputsElement.setAttribute("aria-selected", String(showInputs));
  }

  if (tabResultsElement) {
    tabResultsElement.classList.toggle("is-active", !showInputs);
    tabResultsElement.setAttribute("aria-selected", String(!showInputs));
  }
}

function createWorker() {
  if (worker) {
    worker.terminate();
  }

  worker = new Worker(WORKER_URL, { type: "module" });
  worker.onmessage = handleWorkerMessage;
  worker.onerror = handleWorkerError;

  return worker;
}

function clearResults() {
  if (resultsSummaryElement) {
    resultsSummaryElement.innerHTML = "";
  }

  if (resultsChartElement) {
    resultsChartElement.innerHTML = "";
  }

  if (scenarioTableElement) {
    scenarioTableElement.innerHTML = "";
  }
}

function clearHeroMetrics() {
  if (heroSuccessRateElement) {
    heroSuccessRateElement.textContent = "—";
  }

  if (heroMedianWealthElement) {
    heroMedianWealthElement.textContent = "—";
  }

  if (heroWorstScenarioElement) {
    heroWorstScenarioElement.textContent = "—";
  }

  if (heroScenarioCountElement) {
    heroScenarioCountElement.textContent = "—";
  }
}

function updateHeroMetrics(summary) {
  if (!summary || typeof summary !== "object") {
    clearHeroMetrics();
    return;
  }

  const isSingleScenario = summary.type === "single-scenario" || summary.type === "single";

  if (isSingleScenario) {
    if (heroSuccessRateElement) {
      heroSuccessRateElement.textContent = summary.depleted ? "Depleted" : "Sustained";
    }

    if (heroMedianWealthElement) {
      heroMedianWealthElement.textContent = formatCurrency(summary.terminalNominal);
    }

    if (heroWorstScenarioElement) {
      heroWorstScenarioElement.textContent = formatCurrency(summary.minimumWealth);
    }

    if (heroScenarioCountElement) {
      heroScenarioCountElement.textContent = "1";
    }

    return;
  }

  if (heroSuccessRateElement) {
    heroSuccessRateElement.textContent = formatPercentage(summary.successRate);
  }

  if (heroMedianWealthElement) {
    heroMedianWealthElement.textContent = formatCurrency(summary.medianTerminalWealth);
  }

  if (heroWorstScenarioElement) {
    heroWorstScenarioElement.textContent = formatCurrency(summary.p10TerminalWealth);
  }

  if (heroScenarioCountElement) {
    heroScenarioCountElement.textContent = formatWholeNumber(summary.scenarioCount);
  }
}

function showLoading() {
  showScreen("results");

  if (resultsSummaryElement) {
    resultsSummaryElement.innerHTML = `
      <section class="results-header-card">
        <div class="results-header-top">
          <h2 class="results-title">Results</h2>
          <p class="results-subtitle">Preparing the simulation output.</p>
        </div>
        <div class="results-context-note">
          <p>Running simulation. Please wait.</p>
        </div>
      </section>
    `;
  }

  if (resultsChartElement) {
    resultsChartElement.innerHTML = "";
  }

  if (scenarioTableElement) {
    scenarioTableElement.innerHTML = "";
  }
}

function showError(message) {
  clearResults();
  clearHeroMetrics();
  showScreen("results");

  if (resultsSummaryElement) {
    resultsSummaryElement.innerHTML = `
      <div class="card error-card">
        <h2>Simulation error</h2>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }
}

function getScenarioResultObject(scenario) {
  if (scenario && typeof scenario === "object") {
    return scenario.result && typeof scenario.result === "object"
      ? scenario.result
      : scenario;
  }

  return {};
}

function getTerminalNominal(scenario) {
  const result = getScenarioResultObject(scenario);

  if (typeof scenario?.terminalNominal === "number") {
    return scenario.terminalNominal;
  }

  if (typeof result.terminalNominal === "number") {
    return result.terminalNominal;
  }

  if (Array.isArray(result.pathNominal) && result.pathNominal.length > 0) {
    return toFiniteNumber(result.pathNominal[result.pathNominal.length - 1]);
  }

  if (Array.isArray(result.yearlyRows) && result.yearlyRows.length > 0) {
    return toFiniteNumber(result.yearlyRows[result.yearlyRows.length - 1]?.endPortfolio);
  }

  return 0;
}

function getTerminalReal(scenario) {
  const result = getScenarioResultObject(scenario);

  if (typeof scenario?.terminalReal === "number") {
    return scenario.terminalReal;
  }

  if (typeof result.terminalReal === "number") {
    return result.terminalReal;
  }

  if (Array.isArray(result.pathReal) && result.pathReal.length > 0) {
    return toFiniteNumber(result.pathReal[result.pathReal.length - 1]);
  }

  return 0;
}

function getDepleted(scenario) {
  const result = getScenarioResultObject(scenario);

  if (typeof scenario?.depleted === "boolean") {
    return scenario.depleted;
  }

  if (typeof result.depleted === "boolean") {
    return result.depleted;
  }

  return false;
}

function normaliseScenarios(scenarios) {
  if (!Array.isArray(scenarios)) {
    return [];
  }

  return scenarios.map((scenario, index) => {
    const result = getScenarioResultObject(scenario);

    return {
      ...result,
      ...scenario,
      scenarioId: scenario?.scenarioId ?? index + 1,
      startYear: scenario?.startYear ?? result?.startYear ?? "",
      endYear: scenario?.endYear ?? result?.endYear ?? "",
      yearlyRows: Array.isArray(scenario?.yearlyRows) ? scenario.yearlyRows : result?.yearlyRows ?? [],
      pathNominal: Array.isArray(scenario?.pathNominal) ? scenario.pathNominal : result?.pathNominal ?? [],
      pathReal: Array.isArray(scenario?.pathReal) ? scenario.pathReal : result?.pathReal ?? [],
      depleted: getDepleted(scenario),
      terminalNominal: getTerminalNominal(scenario),
      terminalReal: getTerminalReal(scenario)
    };
  });
}

function logScenarioResults(scenarios) {
  console.group("Scenario results");
  console.log("Scenario count:", scenarios.length);

  console.table(
    scenarios.map((scenario) => ({
      scenarioId: scenario.scenarioId,
      startYear: scenario.startYear,
      endYear: scenario.endYear,
      depleted: scenario.depleted,
      terminalNominal: scenario.terminalNominal,
      terminalReal: scenario.terminalReal
    }))
  );

  console.groupEnd();
}

function renderCharts(scenarios) {
  renderInvestmentProjectionChart({
    container: resultsChartElement?.querySelector("#investmentProjectionChart"),
    legendContainer: resultsChartElement?.querySelector("#investmentProjectionLegend"),
    scenarios,
    chartMode: uiState.chartMode
  });

  renderSpendingPathChart({
    container: resultsChartElement?.querySelector("#spendingPathChart"),
    legendContainer: resultsChartElement?.querySelector("#spendingPathLegend"),
    scenarios,
    chartMode: uiState.chartMode,
    guardrails: uiState.guardrails
  });
}

function renderTable(scenarios) {
  if (!scenarioTableElement) {
    return;
  }

  scenarioTableElement.style.display = uiState.showYearlyTable ? "" : "none";

  if (!uiState.showYearlyTable) {
    scenarioTableElement.innerHTML = "";
    return;
  }

  renderScenarioTable({
    container: scenarioTableElement,
    scenarios
  });
}

function bindDashboardHandlers() {
  bindResultsDashboardEvents(resultsSummaryElement, {
    onChartModeChange(nextValue) {
      uiState.chartMode = nextValue;
      if (latestResult) {
        renderResults(latestResult);
      }
    },
    onGuardrailsChange(nextValue) {
      uiState.guardrails = nextValue;
      if (latestResult) {
        renderResults(latestResult);
      }
    },
    onToggleYearlyTable(nextValue) {
      uiState.showYearlyTable = nextValue;
      if (latestResult) {
        renderResults(latestResult);
      }
    }
  });
}

function renderResults(result) {
  latestResult = result;

  const scenarios = normaliseScenarios(result?.scenarios);
  const summary = result?.summary || {};

  updateHeroMetrics(summary);

  renderResultsDashboard({
    summaryContainer: resultsSummaryElement,
    dashboardContainer: resultsChartElement,
    summary,
    scenarios,
    uiState
  });

  renderCharts(scenarios);
  renderTable(scenarios);
  bindDashboardHandlers();

  logScenarioResults(scenarios);
  showScreen("results");
}

function runSimulation(inputs) {
  if (!worker) {
    createWorker();
  }

  showLoading();

  worker.postMessage({
    type: "run",
    mode: inputs?.mode || "historical",
    inputs
  });
}

function handleWorkerMessage(event) {
  const { ok, result, error } = event.data || {};

  if (!ok) {
    console.error("Worker error:", error);
    showError(error || "Unknown worker error.");
    return;
  }

  console.group("Worker response");
  console.log("Scenario results", result?.scenarios);
  console.log("Scenario summary", result?.summary);
  console.groupEnd();

  renderResults(result || { scenarios: [], summary: {} });
}

function handleWorkerError(event) {
  console.error("Worker crashed");
  console.error("Message:", event?.message);
  console.error("File:", event?.filename);
  console.error("Line:", event?.lineno);
  console.error("Column:", event?.colno);
  console.error("Error object:", event?.error);

  showError("The simulation worker crashed. Check the browser console for details.");
}

function bindScreenTabs() {
  if (tabInputsElement) {
    tabInputsElement.addEventListener("click", () => {
      showScreen("inputs");
    });
  }

  if (tabResultsElement) {
    tabResultsElement.addEventListener("click", () => {
      showScreen("results");
    });
  }
}

function initialiseApp() {
  if (!planFormElement) {
    throw new Error('Plan form not found. Expected element with id "planForm".');
  }

  if (!resultsSummaryElement) {
    throw new Error('Results summary not found. Expected element with id "resultsSummary".');
  }

  if (!resultsChartElement) {
    throw new Error('Results chart not found. Expected element with id "resultsChart".');
  }

  if (!scenarioTableElement) {
    throw new Error('Scenario table not found. Expected element with id "scenarioTable".');
  }

  createWorker();
  bindScreenTabs();
  clearHeroMetrics();
  showScreen("inputs");

  bindPlanForm({
    form: planFormElement,
    onSubmit(inputs) {
      runSimulation(inputs);
    }
  });
}

initialiseApp();