import { runHistoricalMode } from "./modes/run-historical.js";
import { runMonteCarloMode } from "./modes/run-montecarlo.js";

export function runSimulationByMode({ mode = "historical", inputs }) {
  return {
    scenarios: [],
    summary: {
      successRate: 0,
      medianTerminalWealth: 0,
      p10TerminalWealth: 0,
      p90TerminalWealth: 0,
      scenarioCount: 0,
      test: {
        historicalLoaded: typeof runHistoricalMode === "function",
        monteCarloLoaded: typeof runMonteCarloMode === "function"
      }
    }
  };
}