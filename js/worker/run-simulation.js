import { runHistoricalMode } from "./modes/run-historical.js";

export function runSimulationByMode({ mode = "historical", inputs }) {
  if (mode !== "historical") {
    return {
      scenarios: [],
      summary: {
        successRate: 0,
        medianTerminalWealth: 0,
        p10TerminalWealth: 0,
        p90TerminalWealth: 0,
        scenarioCount: 0
      }
    };
  }

  return runHistoricalMode(inputs);
}