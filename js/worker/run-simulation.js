import { runHistoricalMode } from "./modes/run-historical.js";
import { runDeterministicMode } from "./modes/run-deterministic.js";

export function runSimulationByMode({ mode = "historical", inputs }) {
  let result;

  switch (mode) {
    case "historical":
      result = runHistoricalMode(inputs);
      break;

    case "deterministic":
      result = runDeterministicMode(inputs);
      break;

    case "montecarlo":
      throw new Error("Monte Carlo mode is not implemented yet.");

    default:
      throw new Error(`Unsupported simulation mode: ${mode}`);
  }

  return {
    mode,
    ...result
  };
}