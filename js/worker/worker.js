import {
  loadHistoricalSeries,
  generateRollingHistoricalWindows,
  createHistoricalWindowLookup,
  createHistoricalReturnsProvider
} from "../model/returns/historical.js";

import { runRetirementSimulation } from "../model/simulator.js";
import { aggregateScenarioResults } from "../model/analysis/aggregator.js";

self.onmessage = async (event) => {
  const { type, inputs } = event.data || {};

  if (type !== "run") {
    return;
  }

  try {
    const years = normaliseYears(inputs?.years);

    const series = await loadHistoricalSeries();
    const windows = generateRollingHistoricalWindows(series, years);
    const windowSummary = createHistoricalWindowLookup(windows);

    console.group("Historical dataset loaded");
    console.log("Series length:", series.length);
    console.log("Requested window length:", years);
    console.log("Generated rolling windows:", windows.length);
    console.table(windowSummary);
    console.groupEnd();

    const scenarios = [];

    for (const window of windows) {
      console.log("Running scenario:", window.startYear, "-", window.endYear);
    
      const returnsProvider = createHistoricalReturnsProvider(window.rows);
    
      const simulation = runRetirementSimulation({
        inputs: {
          ...inputs,
          years
        },
        returnsProvider
      });
    
      scenarios.push({
        startYear: window.startYear,
        endYear: window.endYear,
        result: simulation
      });
    }

    console.log("Historical scenarios run:", scenarios.length);

    const summary = aggregateScenarioResults(scenarios);

    console.log("Aggregate summary:", summary);

    self.postMessage({
      ok: true,
      result: {
        dataset: {
          years,
          seriesLength: series.length,
          windowCount: windows.length,
          windows: windowSummary
        },
        summary,
        scenarios
      }
    });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown worker error."
    });
  }
};

function normaliseYears(value) {
  const fallbackYears = 30;

  if (value == null) {
    return fallbackYears;
  }

  const years = Number(value);

  if (!Number.isInteger(years) || years <= 0) {
    throw new Error("inputs.years must be a positive integer.");
  }

  return years;
}