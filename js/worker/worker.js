self.onmessage = (event) => {
  const { type } = event.data || {};

  if (type !== "run") {
    return;
  }

  self.postMessage({
    ok: true,
    result: {
      scenarios: [],
      summary: {
        successRate: 0,
        medianTerminalWealth: 0,
        p10TerminalWealth: 0,
        p90TerminalWealth: 0,
        scenarioCount: 0
      }
    }
  });
};