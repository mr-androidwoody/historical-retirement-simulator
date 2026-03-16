const worker = new Worker("./js/worker/worker.js?v=2", { type: "module" });

worker.onmessage = (event) => {
  const { ok, result, error } = event.data || {};

  if (!ok) {
    console.error("Worker error:", error);
    return;
  }

  console.group("Worker response");

  console.group("Dataset summary");
  console.log("Series length:", result.dataset.seriesLength);
  console.log("Window count:", result.dataset.windowCount);
  console.table(result.dataset.windows);
  console.groupEnd();

  console.group("Aggregate results");
  console.log("Scenario count:", result.summary.scenarioCount);
  console.log("Success rate:", result.summary.successRate);
  console.log("Median terminal wealth:", result.summary.medianTerminalWealth);
  console.log("10th percentile:", result.summary.percentile10);
  console.log("90th percentile:", result.summary.percentile90);
  console.groupEnd();

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