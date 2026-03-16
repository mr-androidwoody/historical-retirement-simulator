function toNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function getTerminalWealth(scenario) {
  if (!scenario || !Array.isArray(scenario.yearly)) {
    return 0;
  }

  const lastYear = scenario.yearly[scenario.yearly.length - 1];

  if (!lastYear) {
    return 0;
  }

  return toNumber(lastYear.endingPortfolio);
}

function getSuccessFlag(scenario) {
  if (!scenario) {
    return false;
  }

  if (typeof scenario.success === "boolean") {
    return scenario.success;
  }

  if (!Array.isArray(scenario.yearly) || scenario.yearly.length === 0) {
    return false;
  }

  const lastYear = scenario.yearly[scenario.yearly.length - 1];
  return toNumber(lastYear.endingPortfolio) > 0;
}

function percentileFromSorted(sortedValues, percentile) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) {
    return 0;
  }

  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  const clamped = Math.max(0, Math.min(100, percentile));
  const index = (clamped / 100) * (sortedValues.length - 1);

  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  const weight = index - lowerIndex;
  const lowerValue = sortedValues[lowerIndex];
  const upperValue = sortedValues[upperIndex];

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

  const successCount = safeScenarios.filter(getSuccessFlag).length;

  return {
    scenarioCount: safeScenarios.length,
    successRate: successCount / safeScenarios.length,
    medianTerminalWealth: percentileFromSorted(terminalWealths, 50),
    p10TerminalWealth: percentileFromSorted(terminalWealths, 10),
    p90TerminalWealth: percentileFromSorted(terminalWealths, 90)
  };
}