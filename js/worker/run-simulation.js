import { runHistoricalMode } from "./modes/run-historical.js";
import { runMonteCarloMode } from "./modes/run-montecarlo.js";
import { runDeterministicMode } from "./modes/run-deterministic.js";

export function runSimulationByMode({ mode = "historical", inputs }) {
  switch (mode) {
    case "historical":
      return runHistoricalMode(inputs);

    case "montecarlo":
      return runMonteCarloMode(inputs);

    case "deterministic":
      return runDeterministicMode(inputs);

    default:
      throw new Error(`Unsupported simulation mode: ${mode}`);
  }
}