import { runSimulationByMode } from "./run-simulation.js";

let historicalDatasetPromise = null;

async function loadHistoricalDataset() {
  if (!historicalDatasetPromise) {
    historicalDatasetPromise = fetch(
      "/historical-retirement-simulator/data/global-market-history-composite.json"
    ).then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load historical dataset.");
      }

      return response.json();
    });
  }

  return historicalDatasetPromise;
}

self.onmessage = async (event) => {
  const { type, mode = "historical", inputs } = event.data || {};

  if (type !== "run") {
    return;
  }

  try {
    const resolvedInputs = { ...(inputs || {}) };

    if (mode === "historical") {
      resolvedInputs.dataset = await loadHistoricalDataset();
    }

    const result = runSimulationByMode({
      mode,
      inputs: resolvedInputs
    });

    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown worker error."
    });
  }
};