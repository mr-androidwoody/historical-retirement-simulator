import { simulateScenario } from "../../model/engine.js";
import { createHistoricalReturnsProvider } from "../../model/returns/historical.js";
import { aggregateResults } from "../../model/analysis/aggregator.js";

export function runHistoricalMode(inputs) {
  const dataset = inputs.dataset;

  if (!dataset) {
    throw new Error("Historical simulation requires dataset.");
  }

  const series = dataset.composites.gdpWeighted.series;

  const horizon = inputs.simulationYears;

  const datasetLength = series.length;

  const windowCount = datasetLength - horizon + 1;

  const scenarios = [];

  for (let startIndex = 0; startIndex < windowCount; startIndex++) {
    const window = series.slice(startIndex, startIndex + horizon);

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