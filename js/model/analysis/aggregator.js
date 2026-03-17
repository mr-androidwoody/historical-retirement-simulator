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

function getMinimumWealth(scenario) {
  if (!scenario || typeof scenario !== "object") {
    return 0;
  }

  const path =
    Array.isArray(scenario.pathReal) && scenario.pathReal.length > 0
      ? scenario.pathReal
      : scenario.pathNominal;

  if (!Array.isArray(path) || path.length === 0) {
    return 0;
  }

  return path.reduce((min, value) => {
    const num = toFiniteNumber(value);
    return num < min ? num : min;
  }, Number.POSITIVE_INFINITY);
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

function buildSingleScenarioSummary(scenario) {
  return {
    type: "single",

    startYear: scenario.startYear ?? "",
    endYear: scenario.endYear ?? "",

    terminalWealth: getTerminalWealth(scenario),

    depleted: Boolean(scenario.depleted),
    depletionYear:
      typeof scenario.depletionYear === "number"
        ? scenario.depletionYear
        : null,

    minimumWealth: getMinimumWealth(scenario)
  };
}

function buildMultiScenarioSummary(scenarios) {
  const terminalWealths = scenarios
    .map(getTerminalWealth)
    .sort((a, b) => a - b);

  const successCount = scenarios.filter(isSuccessfulScenario).length;

  return {
    type: "multi",

    scenarioCount: scenarios.length,
    successRate: successCount / scenarios.length,

    medianTerminalWealth: percentileFromSorted(terminalWealths, 50),
    p10TerminalWealth: percentileFromSorted(terminalWealths, 10),
    p90TerminalWealth: percentileFromSorted(terminalWealths, 90)
  };
}

export function aggregateScenarioResults(scenarios) {
  const safeScenarios = Array.isArray(scenarios) ? scenarios : [];

  if (safeScenarios.length === 0) {
    return {
      type: "multi",
      scenarioCount: 0,
      successRate: 0,
      medianTerminalWealth: 0,
      p10TerminalWealth: 0,
      p90TerminalWealth: 0
    };
  }

  if (safeScenarios.length === 1) {
    return buildSingleScenarioSummary(safeScenarios[0]);
  }

  return buildMultiScenarioSummary(safeScenarios);
}