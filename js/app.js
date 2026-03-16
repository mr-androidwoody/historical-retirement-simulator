import { bindPlanForm, getPlanInputs } from "./ui/plan-form.js";
import { renderResultsSummary } from "./ui/results-view.js";
import { renderScenarioTable } from "./ui/yearly-table.js";
import { renderHistoricalChart } from "./ui/charts.js";

const worker = new Worker("./js/worker/worker.js", { type: "module" });

const resultsSummaryElement = document.getElementById("resultsSummary");
const scenarioTableElement = document.getElementById("scenarioTable");
const historicalChartElement = document.getElementById("historicalChart");

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

function showError(message) {
  clearResults();

  if (resultsSummaryElement) {
    resultsSummaryElement.innerHTML = `
      <div class="card error-card">
        <h2>Simulation error</h2>
        <p>${message}</p>
      </div>
    `;
  }
}

function getTerminalNominal(scenario) {
  if (typeof scenario.terminalNominal === "number") {
    return scenario.terminalNominal;
  }

  if (Array.isArray(scenario.pathNominal) && scenario.pathNominal.length > 0) {
    return scenario.pathNominal[scenario.pathNominal.length - 1];
  }

  if (
    scenario.result &&
    Array.isArray(scenario.result.pathNominal) &&
    scenario.result.pathNominal.length > 0
  ) {
    return scenario.result.pathNominal[scenario.result.pathNominal.length - 1];
  }

  return 0;
}

function getTerminalReal(scenario) {
  if (typeof scenario.terminalReal === "number") {
    return scenario.terminalReal;
  }

  if (Array.isArray(scenario.pathReal) && scenario.pathReal.length > 0) {
    return scenario.pathReal[scenario.pathReal.length - 1];
  }

  if (
    scenario.result &&
    Array.isArray(scenario.result.pathReal) &&
    scenario.result.pathReal.length > 0
  ) {
    return scenario.result.pathReal[scenario.result.pathReal.length - 1];
  }

  return 0;
}

function getDepleted(scenario) {
  if (typeof scenario.depleted === "boolean") {
    return scenario.depleted;
  }

  if (scenario.result && typeof scenario.result.depleted === "boolean") {
    return scenario.result.depleted;
  }

  return false;
}

function logScenarioResults(scenarios) {
  console.group("Scenario results");
  console.log("Scenario count:", scenarios.length);

  console.table(
    scenarios.map((scenario, index) => ({
      scenarioId: scenario.scenarioId ?? index + 1,
      startYear: scenario.startYear ?? "",
      endYear: scenario.endYear ?? "",
      depleted: getDepleted(scenario),
      terminalNominal: getTerminalNominal(scenario),
      terminalReal: getTerminalReal(scenario)
    }))
  );

  console.groupEnd();
}

function renderResults(result) {
  renderResultsSummary({
    container: resultsSummaryElement,
    summary: result.summary
  });

  renderHistoricalChart({
    container: historicalChartElement,
    scenarios: result.scenarios
  });

  renderScenarioTable({
    container: scenarioTableElement,
    scenarios: result.scenarios
  });
}

function runSimulation(inputs) {
  worker.postMessage({
    type: "run",
    mode: inputs.mode || "historical",
    inputs
  });
}

worker.onmessage = (event) => {
  const { ok, result, error } = event.data || {};

  if (!ok) {
    console.error("Worker error:", error);
    showError(error || "Unknown worker error.");
    return;
  }

  console.group("Worker response");
  console.log("Scenario results", result.scenarios);
  console.log("Scenario summary", result.summary);
  console.groupEnd();

  renderResults(result);
  logScenarioResults(result.scenarios || []);
};

worker.onerror = (event) => {
  console.error("Worker crashed");
  console.error("Message:", event.message);
  console.error("File:", event.filename);
  console.error("Line:", event.lineno);
  console.error("Column:", event.colno);
  console.error("Error object:", event.error);

  showError("The simulation worker crashed. Check the browser console for details.");
};

bindPlanForm({
  form: document.getElementById("planForm"),
  onSubmit(inputs) {
    runSimulation(inputs);
  }
});

const initialInputs = getPlanInputs(document.getElementById("planForm"));
runSimulation(initialInputs);