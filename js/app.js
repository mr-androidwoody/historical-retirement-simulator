import { bindPlanForm, getPlanInputs } from "./ui/plan-form.js";
import { renderResultsSummary } from "./ui/results-view.js";
import { renderScenarioTable } from "./ui/yearly-table.js";
import { renderHistoricalChart } from "./ui/charts.js";

const WORKER_URL = "./js/worker/worker.js?v=debug5";

const resultsSummaryElement = document.getElementById("resultsSummary");
const scenarioTableElement = document.getElementById("scenarioTable");
const historicalChartElement = document.getElementById("historicalChart");
const planFormElement = document.getElementById("planForm");

let worker = null;

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

  if (scenarioTableElement) {
    scenarioTableElement.innerHTML = "";
  }

  if (historicalChartElement) {
    historicalChartElement.innerHTML = "";
  }
}

function showLoading() {
  if (!resultsSummaryElement) {
    return;
  }

  resultsSummaryElement.innerHTML = `
    <div class="card">
      <h2>Running simulation</h2>
      <p>Please wait…</p>
    </div>
  `;

  if (scenarioTableElement) {
    scenarioTableElement.innerHTML = "";
  }

  if (historicalChartElement) {
    historicalChartElement.innerHTML = "";
  }
}

function showError(message) {
  clearResults();

  if (resultsSummaryElement) {
    resultsSummaryElement.innerHTML = `
      <div class="card error-card">
        <h2>Simulation error</h2>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
    return result.pathNominal[result.pathNominal.length - 1];
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
    return result.pathReal[result.pathReal.length - 1];
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
      ...scenario,
      ...result,
      scenarioId: scenario?.scenarioId ?? index + 1,
      startYear: scenario?.startYear ?? "",
      endYear: scenario?.endYear ?? "",
      depleted: getDepleted(scenario),
      terminalNominal: getTerminalNominal(scenario),
      terminalReal: getTerminalReal(scenario)
    };
  });
}

function normaliseSummary(summary, scenarios) {
  return {
    successRate: Number(summary?.successRate ?? 0),
    medianTerminalWealth: Number(summary?.medianTerminalWealth ?? 0),
    p10TerminalWealth: Number(summary?.p10TerminalWealth ?? 0),
    p90TerminalWealth: Number(summary?.p90TerminalWealth ?? 0),
    scenarioCount: Number(summary?.scenarioCount ?? scenarios.length ?? 0)
  };
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

function renderResults(result) {
  const scenarios = normaliseScenarios(result?.scenarios);
  const summary = normaliseSummary(result?.summary, scenarios);

  renderResultsSummary({
    container: resultsSummaryElement,
    summary
  });

  renderHistoricalChart({
    container: historicalChartElement,
    scenarios
  });

  renderScenarioTable({
    container: scenarioTableElement,
    scenarios
  });

  logScenarioResults(scenarios);
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

function initialiseApp() {
  if (!planFormElement) {
    throw new Error('Plan form not found. Expected element with id "planForm".');
  }

  createWorker();

  bindPlanForm({
    form: planFormElement,
    onSubmit(inputs) {
      runSimulation(inputs);
    }
  });

  const initialInputs = getPlanInputs(planFormElement);
  runSimulation(initialInputs);
}

initialiseApp();