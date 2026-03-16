export function runSimulationByMode({ mode = "historical", inputs }) {
  return {
    scenarios: [],
    summary: {
      successRate: 0,
      medianTerminalWealth: 0,
      p10TerminalWealth: 0,
      p90TerminalWealth: 0,
      scenarioCount: 0,
      modeUsed: mode
    }
  };
}