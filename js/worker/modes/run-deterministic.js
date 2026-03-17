import { simulateScenario } from "../../model/engine.js";
import { createDeterministicReturnsProvider } from "../../model/returns/deterministic.js";
import { aggregateScenarioResults } from "../../model/analysis/aggregator.js";

export function runDeterministicMode(inputs) {
  const returnsProvider = createDeterministicReturnsProvider(inputs);

  const scenario = simulateScenario({
    inputs,
    returnsProvider
  });

  const years = Number(inputs?.simulationYears ?? 0);

  const scenarios = [
    {
      scenarioId: 1,
      startYear: 1,
      endYear: years,
      ...scenario
    }
  ];

  const summary = aggregateScenarioResults(scenarios);

  return {
    scenarios,
    summary
  };
}