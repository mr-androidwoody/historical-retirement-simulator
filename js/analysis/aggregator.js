export function aggregateScenarioResults(scenarios) {

  const terminalValues = [];
  let failures = 0;

  for (const scenario of scenarios) {

    const result = scenario.result;

    const terminal = result.pathReal[result.pathReal.length - 1] ?? 0;

    terminalValues.push(terminal);

    if (result.depleted) {
      failures += 1;
    }

  }

  terminalValues.sort((a, b) => a - b);

  const successRate = 1 - failures / scenarios.length;

  const median = percentile(terminalValues, 0.5);
  const p10 = percentile(terminalValues, 0.1);
  const p90 = percentile(terminalValues, 0.9);

  return {
    scenarioCount: scenarios.length,
    successRate,
    medianTerminalWealth: median,
    percentile10: p10,
    percentile90: p90
  };

}

function percentile(arr, p) {

  const index = (arr.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return arr[lower];

  return arr[lower] + (arr[upper] - arr[lower]) * (index - lower);

}