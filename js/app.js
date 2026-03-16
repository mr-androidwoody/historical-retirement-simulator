import { renderResultsSummary } from "./ui/results-view.js";
import { renderScenarioTable } from "./ui/yearly-table.js";
import { renderHistoricalChart } from "./ui/charts.js";

console.log("APP VERSION 4");
const worker = new Worker("./js/worker/worker.js?v=6", { type: "module" });

worker.onmessage = (event) => {
  const { ok, result, error } = event.data || {};

  if (!ok) {
    console.error("Worker error:", error);
    return;
  }

  console.group("Worker response");
  console.log("Dataset summary", result.dataset);
  console.log("Scenario results", result.scenarios);
  console.log("Scenario summary", result.summary);
  console.groupEnd();

  const resultsSummaryElement = document.getElementById("resultsSummary");
  const scenarioTableElement = document.getElementById("scenarioTable");
  const historicalChartElement = document.getElementById("historicalChart");
    
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

  console.group("Scenario results");
  console.log("Scenario count:", result.scenarios.length);
  console.table(
    result.scenarios.map((scenario) => ({
      startYear: scenario.startYear,
      endYear: scenario.endYear,
      depleted: scenario.result.depleted,
      terminalNominal:
        scenario.result.pathNominal[
          scenario.result.pathNominal.length - 1
        ] ?? 0,
      terminalReal:
        scenario.result.pathReal[
          scenario.result.pathReal.length - 1
        ] ?? 0
    }))
  );
  console.groupEnd();
};

worker.onerror = (event) => {
  console.error("Worker crashed");
  console.error("Message:", event.message);
  console.error("File:", event.filename);
  console.error("Line:", event.lineno);
  console.error("Column:", event.colno);
  console.error("Error object:", event.error);
};

worker.postMessage({
  type: "run",
  inputs: {
    initialPortfolio: 1000000,
    annualSpending: 40000,
    years: 30,
    equityAllocation: 0.6,
    bondAllocation: 0.3,
    cashAllocation: 0.1,
    fees: 0.002,
    rebalance: false,
    guardrails: false,
    statePensionIncome: 0,
    statePensionStartYear: 0
  }
});