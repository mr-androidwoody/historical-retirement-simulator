import { runHistoricalMode } from "./modes/run-historical.js";
import { runDeterministicMode } from "./modes/run-deterministic.js";

export function runSimulationByMode({ mode = "historical", inputs }) {
  switch (mode) {
    case "historical":
      return runHistoricalMode(inputs);

    case "deterministic":
      return runDeterministicMode(inputs);

    case "montecarlo":
      throw new Error("Monte Carlo mode is not implemented yet.");

    default:
      throw new Error(`Unsupported simulation mode: ${mode}`);
  }
}