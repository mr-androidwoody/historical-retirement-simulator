import { runHistoricalMode } from "./modes/run-historical.js?v=debug9";
import { runMonteCarloMode } from "./modes/run-montecarlo.js?v=debug9";

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