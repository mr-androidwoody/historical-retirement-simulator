import { simulateScenario } from "../../model/engine.js";
import { createDeterministicReturnsProvider } from "../../model/returns/deterministic.js";
import { aggregateScenarioResults } from "../../model/analysis/aggregator.js";

export function runDeterministicMode(inputs) {
  const returnsProvider = createDeterministicReturnsProvider(inputs);

  const scenario = simulateScenario({
    inputs,
    returnsProvider
  });

  const scenarios = [
    {
      scenarioId: 1,
      ...scenario
    }
  ];

  const summary = aggregateScenarioResults(scenarios);

  return {
    scenarios,
    summary
  };
}