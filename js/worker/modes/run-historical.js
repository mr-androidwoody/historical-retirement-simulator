import { simulateScenario } from "../../model/engine.js";
import { createHistoricalReturnsProvider } from "../../model/returns/historical.js";
import { aggregateResults } from "../../model/analysis/aggregator.js";

export function runHistoricalMode(inputs) {
  return {
    scenarios: [],
    summary: {
      successRate: 0,
      medianTerminalWealth: 0,
      p10TerminalWealth: 0,
      p90TerminalWealth: 0,
      scenarioCount: 0,
      test: {
        simulateScenarioLoaded: typeof simulateScenario === "function",
        createHistoricalReturnsProviderLoaded: typeof createHistoricalReturnsProvider === "function",
        aggregateResultsLoaded: typeof aggregateResults === "function"
      }
    }
  };
}