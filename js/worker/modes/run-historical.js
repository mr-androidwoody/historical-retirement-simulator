import { simulateScenario } from "../../model/engine.js";
import { createHistoricalReturnsProvider } from "../../model/returns/historical.js";
import { aggregateScenarioResults } from "../../model/analysis/aggregator.js";

export function runHistoricalMode(inputs) {
  const dataset = inputs?.dataset;

  if (!dataset) {
    throw new Error("Historical simulation requires dataset.");
  }

  const series = dataset?.composites?.gdpWeighted?.series;

  if (!Array.isArray(series) || series.length === 0) {
    throw new Error("Historical dataset series is missing or invalid.");
  }

  const horizon = Number(inputs?.simulationYears);

  if (!Number.isFinite(horizon) || horizon <= 0) {
    throw new Error("Historical simulation requires a valid simulationYears value.");
  }

  if (series.length < horizon) {
    throw new Error("Historical dataset is shorter than the simulation horizon.");
  }

  const scenarios = [];
  const windowCount = series.length - horizon + 1;

  for (let startIndex = 0; startIndex < windowCount; startIndex += 1) {
    const window = series.slice(startIndex, startIndex + horizon);
    const returnsProvider = createHistoricalReturnsProvider(window);

    const scenario = simulateScenario({
      inputs,
      returnsProvider
    });

    scenarios.push({
      scenarioId: startIndex + 1,
      startYear: window[0]?.year ?? "",
      endYear: window[window.length - 1]?.year ?? "",
      ...scenario
    });
  }

  const summary = aggregateScenarioResults(scenarios);

  return {
    scenarios,
    summary
  };
}