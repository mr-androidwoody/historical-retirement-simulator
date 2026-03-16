import { runSimulationByMode } from "./run-simulation.js?v=debug9";

self.onmessage = (event) => {
  const { type, mode = "historical", inputs } = event.data || {};

  if (type !== "run") {
    return;
  }

  try {
    const result = runSimulationByMode({
      mode,
      inputs
    });

    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown worker error."
    });
  }
};