function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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

function getDepletionYear(scenario) {
  if (!scenario || !Array.isArray(scenario.yearlyRows)) {
    return null;
  }

  const row = scenario.yearlyRows.find((r) => r.depleted === true);

  return row ? row.year : null;
}

function isSuccessfulScenario(scenario) {
  if (!scenario || typeof scenario !== "object") {
    return false;
  }

  return scenario.depleted === false;
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

  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sortedValues[lower];
  }

  const weight = index - lower;

  return (
    sortedValues[lower] +
    (sortedValues[upper] - sortedValues[lower]) * weight
  );
}

function buildSingleScenarioSummary(scenario) {
  return {
    type: "single",

    startYear: scenario.startYear ?? "",
    endYear: scenario.endYear ?? "",

    terminalNominal: toFiniteNumber(scenario.terminalNominal),

    depleted: Boolean(scenario.depleted),
    depletionYear: getDepletionYear(scenario),

    minimumWealth: getMinimumWealth(scenario)
  };
}

function buildMultiScenarioSummary(scenarios) {
  const terminalValues = scenarios
    .map((s) => toFiniteNumber(s.terminalNominal))
    .sort((a, b) => a - b);

  const successCount = scenarios.filter(isSuccessfulScenario).length;

  return {
    type: "multi",

    scenarioCount: scenarios.length,
    successRate: successCount / scenarios.length,

    medianTerminalWealth: percentileFromSorted(terminalValues, 50),
    p10TerminalWealth: percentileFromSorted(terminalValues, 10),
    p90TerminalWealth: percentileFromSorted(terminalValues, 90)
  };
}

export function aggregateScenarioResults(scenarios) {
  const safe = Array.isArray(scenarios) ? scenarios : [];

  if (safe.length === 0) {
    return {
      type: "multi",
      scenarioCount: 0,
      successRate: 0,
      medianTerminalWealth: 0,
      p10TerminalWealth: 0,
      p90TerminalWealth: 0
    };
  }

  if (safe.length === 1) {
    return buildSingleScenarioSummary(safe[0]);
  }

  return buildMultiScenarioSummary(safe);
}