import {
  loadHistoricalSeries,
  generateRollingHistoricalWindows,
  createHistoricalWindowLookup,
  createHistoricalReturnsProvider
} from "../model/returns/historical.js";

import { runRetirementSimulation } from "../model/simulator.js";

console.log("WORKER VERSION 4");

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

    console.log("About to start scenario loop");

    for (const window of windows) {
      try {
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
      } catch (error) {
        console.error("Scenario failed:", window.startYear, "-", window.endYear);
        console.error(error);

        self.postMessage({
          ok: false,
          error: `Scenario failed for ${window.startYear}-${window.endYear}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        });

        return;
      }
    }

    console.log("Finished scenario loop");
    console.log("Historical scenarios run:", scenarios.length);

    self.postMessage({
      ok: true,
      result: {
        dataset: {
          years,
          seriesLength: series.length,
          windowCount: windows.length,
          windows: windowSummary
        },
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