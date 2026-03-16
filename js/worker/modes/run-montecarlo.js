import { simulateScenario } from "../../model/engine.js";
import { createMonteCarloReturnsProvider } from "../../model/returns/montecarlo.js";
import { aggregateResults } from "../../model/analysis/aggregator.js";

export function runMonteCarloMode(inputs) {
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
        createMonteCarloReturnsProviderLoaded:
          typeof createMonteCarloReturnsProvider === "function",
        aggregateResultsLoaded: typeof aggregateResults === "function"
      }
    }
  };
}