import { simulateScenario } from "../../model/engine.js";
import { createMonteCarloReturnsProvider } from "../../model/returns/montecarlo.js";
import { aggregateScenarioResults } from "../../model/analysis/aggregator.js";

export function runMonteCarloMode(inputs) {
  const scenarioCount = Number(inputs?.monteCarloRuns) || 1000;

  if (scenarioCount <= 0) {
    throw new Error("Monte Carlo simulation requires monteCarloRuns greater than zero.");
  }

  const scenarios = [];

  for (let i = 0; i < scenarioCount; i += 1) {
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

  const summary = aggregateScenarioResults(scenarios);

  return {
    scenarios,
    summary
  };
}