const worker = new Worker("./js/worker/worker.js", { type: "module" });

worker.onmessage = (event) => {
  const { ok, result, error } = event.data || {};

  if (!ok) {
    console.error("Worker error:", error);
    return;
  }

  console.group("Worker response");

  console.log("Dataset summary");
  console.log("Series length:", result.dataset.seriesLength);
  console.log("Window count:", result.dataset.windowCount);
  console.table(result.dataset.windows);

  console.log("Simulation summary");
  console.log("Depleted:", result.simulation.depleted);
  console.table(result.simulation.yearlyRows);

  console.groupEnd();
};

worker.onerror = (error) => {
  console.error("Worker crashed:", error.message);
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