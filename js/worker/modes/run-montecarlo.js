import { simulateScenario } from "../../model/engine.js";
import { createMonteCarloReturnsProvider } from "../../model/returns/montecarlo.js";
import { aggregateResults } from "../../model/analysis/aggregator.js";

export function runMonteCarloMode(inputs) {
  const scenarioCount = inputs.monteCarloRuns || 1000;

  const scenarios = [];

  for (let i = 0; i < scenarioCount; i++) {
    const returnsProvider = createMonteCarloReturnsProvider(inputs);

    const scenario = simulateScenario({
      inputs,
      returnsProvider
    });

    scenarios.push({
      scenarioId: i + 1,
      ...scenario
    });
  }

  const summary = aggregateResults(scenarios);

  return {
    scenarios,
    summary
  };
}