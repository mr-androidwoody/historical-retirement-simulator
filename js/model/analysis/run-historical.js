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

  const historicalScope = inputs?.historicalScope ?? "all";
  const selectedHistoricalStartYear = Number(inputs?.selectedHistoricalStartYear);

  if (historicalScope !== "single" && series.length < horizon) {
    throw new Error("Historical dataset is shorter than the simulation horizon.");
  }

  let startIndices = [];
  const windowCount = series.length - horizon + 1;

  if (historicalScope === "single") {
    const matchedStartIndex = series.findIndex((entry) => {
      return Number(entry?.year) === selectedHistoricalStartYear;
    });

    if (matchedStartIndex === -1) {
      throw new Error(
        `Historical start year ${selectedHistoricalStartYear} was not found in the dataset.`
      );
    }

    startIndices = [matchedStartIndex];
  } else {
    startIndices = Array.from({ length: windowCount }, (_, index) => index);
  }

  const scenarios = [];

  for (const startIndex of startIndices) {
    const endIndexExclusive =
      historicalScope === "single"
        ? series.length
        : startIndex + horizon;

    const window = series.slice(startIndex, endIndexExclusive);

    if (!Array.isArray(window) || window.length === 0) {
      throw new Error(`No historical data available for start index ${startIndex}.`);
    }

    const returnsProvider = createHistoricalReturnsProvider(window);

    const scenarioInputs =
      historicalScope === "single"
        ? {
            ...inputs,
            simulationYears: window.length
          }
        : inputs;

    const scenario = simulateScenario({
      inputs: scenarioInputs,
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