import {
  loadHistoricalSeries,
  generateRollingHistoricalWindows,
  createHistoricalWindowLookup
} from "../model/returns/historical.js";

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

    self.postMessage({
      ok: true,
      result: {
        mode: "historical",
        years,
        seriesLength: series.length,
        windowCount: windows.length,
        windows: windowSummary
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