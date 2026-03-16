function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getLastNumber(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  return toFiniteNumber(values[values.length - 1]);
}

function getTerminalWealth(scenario) {
  if (!scenario || typeof scenario !== "object") {
    return 0;
  }

  const realTerminalWealth = getLastNumber(scenario.pathReal);

  if (realTerminalWealth !== 0) {
    return realTerminalWealth;
  }

  return getLastNumber(scenario.pathNominal);
}

function isSuccessfulScenario(scenario) {
  if (!scenario || typeof scenario !== "object") {
    return false;
  }

  if (typeof scenario.depleted === "boolean") {
    return scenario.depleted === false;
  }

  return getTerminalWealth(scenario) > 0;
}

function percentileFromSorted(sortedValues, percentile) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) {
    return 0;
  }

  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  const clampedPercentile = Math.max(0, Math.min(100, percentile));
  const index = (clampedPercentile / 100) * (sortedValues.length - 1);

  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  const lowerValue = sortedValues[lowerIndex];
  const upperValue = sortedValues[upperIndex];
  const weight = index - lowerIndex;

  return lowerValue + (upperValue - lowerValue) * weight;
}

export function aggregateScenarioResults(scenarios) {
  const safeScenarios = Array.isArray(scenarios) ? scenarios : [];

  if (safeScenarios.length === 0) {
    return {
      scenarioCount: 0,
      successRate: 0,
      medianTerminalWealth: 0,
      p10TerminalWealth: 0,
      p90TerminalWealth: 0
    };
  }

  const terminalWealths = safeScenarios
    .map(getTerminalWealth)
    .sort((a, b) => a - b);

  const successCount = safeScenarios.filter(isSuccessfulScenario).length;

  return {
    scenarioCount: safeScenarios.length,
    successRate: successCount / safeScenarios.length,
    medianTerminalWealth: percentileFromSorted(terminalWealths, 50),
    p10TerminalWealth: percentileFromSorted(terminalWealths, 10),
    p90TerminalWealth: percentileFromSorted(terminalWealths, 90)
  };
}