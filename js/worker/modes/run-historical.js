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

  const historicalScope = inputs?.historicalScope ?? "all";
  const selectedHistoricalStartYear = Number(inputs?.selectedHistoricalStartYear);

  let startIndices = [];
  const windowCount = series.length - horizon + 1;

  if (historicalScope === "single") {
    const matchedStartIndex = series.findIndex((entry, index) => {
      const year = Number(entry?.year);
      const hasFullWindow = index + horizon <= series.length;
      return year === selectedHistoricalStartYear && hasFullWindow;
    });

    if (matchedStartIndex === -1) {
      throw new Error(
        `Historical start year ${selectedHistoricalStartYear} was not found or does not support a ${horizon}-year simulation window.`
      );
    }

    startIndices = [matchedStartIndex];
  } else {
    startIndices = Array.from({ length: windowCount }, (_, index) => index);
  }

  const scenarios = [];

    for (const startIndex of startIndices) {
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
    
    // ADD THIS (debug only)
    console.log(
      scenarios
        .filter(s => s.depleted === false)
        .map(s => s.startYear)
    );
    
    const summary = aggregateScenarioResults(scenarios);

  return {
    scenarios,
    summary
  };
}