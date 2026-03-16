export function aggregateScenarioResults(scenarios) {
  const safeScenarios = Array.isArray(scenarios) ? scenarios : [];

  const terminalValues = [];
  let failures = 0;

  for (const scenario of safeScenarios) {
    const result = scenario?.result;

    if (!result) {
      continue;
    }

    if (result.depleted) {
      failures += 1;
    }

    const pathReal = Array.isArray(result.pathReal) ? result.pathReal : [];
    const terminalValue =
      pathReal.length > 0 && Number.isFinite(pathReal[pathReal.length - 1])
        ? pathReal[pathReal.length - 1]
        : 0;

    terminalValues.push(terminalValue);
  }

  terminalValues.sort((a, b) => a - b);

  return {
    scenarioCount: safeScenarios.length,
    successRate: safeScenarios.length > 0 ? (safeScenarios.length - failures) / safeScenarios.length : 0,
    medianTerminalWealth: percentile(terminalValues, 0.5),
    percentile10: percentile(terminalValues, 0.1),
    percentile90: percentile(terminalValues, 0.9)
  };
}

function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  if (values.length === 1) {
    return values[0];
  }

  const index = (values.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return values[lower];
  }

  const lowerValue = values[lower];
  const upperValue = values[upper];
  const weight = index - lower;

  return lowerValue + (upperValue - lowerValue) * weight;
}