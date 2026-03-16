import { simulateScenario } from "./engine.js";
import { aggregateResults } from "./analysis/aggregator.js";
import { createHistoricalReturnsProvider } from "./returns/historical.js";

export function runRetirementSimulation(inputs) {
  const scenarios = [];

  const horizon = inputs.simulationYears;
  const dataset = inputs.dataset;

  const series = dataset.composites.gdpWeighted.series;
  const datasetLength = series.length;

  const windowCount = datasetLength - horizon + 1;

  for (let startIndex = 0; startIndex < windowCount; startIndex++) {
    const endIndex = startIndex + horizon;

    const window = series.slice(startIndex, endIndex);

    const returnsProvider = createHistoricalReturnsProvider(window);

    const scenario = simulateScenario({
      inputs,
      returnsProvider
    });

    scenarios.push({
      startYear: window[0].year,
      endYear: window[window.length - 1].year,
      ...scenario
    });
  }

  const summary = aggregateResults(scenarios);

  return {
    scenarios,
    summary
  };
}