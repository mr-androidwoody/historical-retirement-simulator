function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getLastValue(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  return toFiniteNumber(values[values.length - 1]);
}

function formatCurrency(value) {
  const number = toFiniteNumber(value);

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(number);
}

function createCell(tagName, text, className = "") {
  const cell = document.createElement(tagName);

  if (className) {
    cell.className = className;
  }

  cell.textContent = text;
  return cell;
}

function buildScenarioRow(scenario) {
  const terminalNominal =
    scenario?.terminalNominal !== undefined
      ? toFiniteNumber(scenario.terminalNominal)
      : getLastValue(scenario?.pathNominal);

  const terminalReal =
    scenario?.terminalReal !== undefined
      ? toFiniteNumber(scenario.terminalReal)
      : getLastValue(scenario?.pathReal);

  return {
    startYear: scenario?.startYear ?? 0,
    endYear: scenario?.endYear ?? 0,
    depleted: Boolean(scenario?.depleted),
    terminalNominal,
    terminalReal
  };
}

function getSeverityRatio(amount, baseline) {
  const numerator = toFiniteNumber(amount);
  const denominator = toFiniteNumber(baseline);

  if (numerator <= 0 || denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}

function getCutSeverityClass(row) {
  const cut = toFiniteNumber(row?.cut);

  if (cut <= 0) {
    return "is-zero";
  }

  const ratio = getSeverityRatio(cut, row?.targetSpending);

  if (ratio >= 0.2) {
    return "cut-severe";
  }

  if (ratio >= 0.1) {
    return "cut-moderate";
  }

  return "";
}

function getShortfallSeverityClass(row) {
  const shortfall = toFiniteNumber(row?.shortfall);

  if (shortfall <= 0) {
    return "is-zero";
  }

  const ratio = getSeverityRatio(shortfall, row?.targetSpending);

  if (ratio >= 0.2) {
    return "shortfall-severe";
  }

  if (ratio >= 0.1) {
    return "shortfall-moderate";
  }

  return "";
}

function getSingleScenarioRowClass(row) {
  if (toFiniteNumber(row?.shortfall) > 0) {
    return "is-crisis";
  }

  if (toFiniteNumber(row?.cut) > 0) {
    return "is-stress";
  }

  return "is-normal";
}

function formatYearLabel(row) {
  const yearNumber = toFiniteNumber(row?.year);

  if (toFiniteNumber(row?.shortfall) > 0) {
    return `Year ${yearNumber} • Shortfall`;
  }

  if (toFiniteNumber(row?.cut) > 0) {
    return `Year ${yearNumber} • Cut`;
  }

  return `Year ${yearNumber}`;
}

function getMedianIndex(length) {
  if (length <= 0) {
    return -1;
  }

  return Math.floor((length - 1) / 2);
}

function computeScenarioRankings(rows) {
  const indexedRows = rows.map((row, originalIndex) => ({
    row,
    originalIndex
  }));

  const sorted = indexedRows
    .slice()
    .sort((a, b) => a.row.terminalReal - b.row.terminalReal);

  const medianIndex = getMedianIndex(sorted.length);
  const rankingByOriginalIndex = new Map();

  sorted.forEach((entry, sortedIndex) => {
    const denominator = sorted.length > 1 ? sorted.length - 1 : 1;
    const percentile = sortedIndex / denominator;

    let bucketLabel = "Median";

    if (percentile <= 0.1) {
      bucketLabel = "Bottom decile";
    } else if (percentile <= 0.25) {
      bucketLabel = "Bottom quartile";
    } else if (percentile >= 0.75) {
      bucketLabel = "Top quartile";
    }

    rankingByOriginalIndex.set(entry.originalIndex, {
      rankIndex: sortedIndex,
      percentile,
      isWorst: sortedIndex === 0,
      isBest: sortedIndex === sorted.length - 1,
      isMedian: sortedIndex === medianIndex,
      isBottomDecile: percentile <= 0.1,
      isBottomQuartile: percentile <= 0.25,
      isTopQuartile: percentile >= 0.75,
      bucketLabel
    });
  });

  return rankingByOriginalIndex;
}

function getDepletionYear(scenario) {
  const yearlyRows = Array.isArray(scenario?.yearlyRows)
    ? scenario.yearlyRows
    : [];

  const depletedRow = yearlyRows.find((row) => Boolean(row?.depleted));

  if (!depletedRow) {
    return null;
  }

  return toFiniteNumber(depletedRow.year);
}

function computeStressMetrics(scenario) {
  const yearlyRows = Array.isArray(scenario?.yearlyRows)
    ? scenario.yearlyRows
    : [];

  let firstStressYear = null;
  let stressYears = 0;
  let maxCutRatio = 0;

  yearlyRows.forEach((row) => {
    const hasStress =
      toFiniteNumber(row?.cut) > 0 || toFiniteNumber(row?.shortfall) > 0;

    if (hasStress) {
      stressYears += 1;

      if (firstStressYear === null) {
        firstStressYear = toFiniteNumber(row?.year);
      }
    }

    const cutRatio = getSeverityRatio(row?.cut, row?.targetSpending);
    maxCutRatio = Math.max(maxCutRatio, cutRatio);
  });

  return {
    firstStressYear,
    stressYears,
    maxCutRatio,
    hasStress: stressYears > 0,
    hasEarlyStress: firstStressYear !== null && firstStressYear <= 5
  };
}

function getScenarioPrimaryTag(row, ranking) {
  if (ranking.isWorst) {
    return "Worst";
  }

  if (ranking.isBest) {
    return "Best";
  }

  if (ranking.isMedian) {
    return "Median";
  }

  if (!row.depleted && ranking.isBottomQuartile) {
    return "Weak";
  }

  return "";
}

function getScenarioSecondaryTag(stressMetrics) {
  if (stressMetrics.hasEarlyStress) {
    return "Early stress";
  }

  if (!stressMetrics.hasStress) {
    return "Stable";
  }

  return "";
}

function buildScenarioLabel(row, ranking, stressMetrics) {
  const parts = [String(row.startYear)];

  const primaryTag = getScenarioPrimaryTag(row, ranking);
  const secondaryTag = getScenarioSecondaryTag(stressMetrics);

  if (primaryTag) {
    parts.push(primaryTag);
  }

  if (secondaryTag) {
    parts.push(secondaryTag);
  }

  return parts.join(" • ");
}

function formatDepletedEnhanced(row, depletionYear, stressMetrics) {
  if (row.depleted) {
    if (depletionYear !== null) {
      return `DEPLETED (yr ${depletionYear})`;
    }

    return "DEPLETED";
  }

  if (stressMetrics.hasStress) {
    return "No • stressed";
  }

  return "No";
}

function getStressSeverityLabel(stressMetrics) {
  if (stressMetrics.maxCutRatio >= 0.2) {
    return "severe stress";
  }

  if (stressMetrics.maxCutRatio >= 0.1) {
    return "moderate stress";
  }

  if (stressMetrics.hasStress) {
    return "stress";
  }

  return "stable";
}

function buildTerminalRealSecondary(ranking, stressMetrics) {
  return `${ranking.bucketLabel} • ${getStressSeverityLabel(stressMetrics)}`;
}

function getScenarioRowStateClass(row, ranking, stressMetrics) {
  if (row.depleted || ranking.isBottomDecile) {
    return "is-crisis";
  }

  if (!row.depleted && ranking.isTopQuartile && !stressMetrics.hasStress) {
    return "is-strong";
  }

  if (ranking.isBottomQuartile || stressMetrics.hasStress) {
    return "is-stress";
  }

  return "is-normal";
}

function renderMultiScenarioTable(container, scenarios) {
  const rows = scenarios.map(buildScenarioRow);
  const rankingMap = computeScenarioRankings(rows);

  const enrichedRows = rows.map((row, index) => {
    const scenario = scenarios[index];
    const ranking = rankingMap.get(index) || {
      rankIndex: index,
      percentile: 0.5,
      isWorst: false,
      isBest: false,
      isMedian: false,
      isBottomDecile: false,
      isBottomQuartile: false,
      isTopQuartile: false,
      bucketLabel: "Median"
    };
    const stressMetrics = computeStressMetrics(scenario);
    const depletionYear = getDepletionYear(scenario);

    return {
      ...row,
      ranking,
      stressMetrics,
      depletionYear
    };
  });

  const section = document.createElement("section");
  section.className = "scenario-table-section";

  const heading = document.createElement("h2");
  heading.className = "scenario-table-title";
  heading.textContent = "Historical scenarios";

  const tableWrapper = document.createElement("div");
  tableWrapper.className = "scenario-table-wrapper";

  const table = document.createElement("table");
  table.className = "scenario-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  headRow.append(
    createCell("th", "Start year"),
    createCell("th", "End year"),
    createCell("th", "Depleted"),
    createCell("th", "Ending value (real)"),
    createCell("th", "Ending value (nominal)")
  );

  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");

  enrichedRows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.classList.add(
      getScenarioRowStateClass(row, row.ranking, row.stressMetrics)
    );

    tr.append(
      createCell(
        "td",
        buildScenarioLabel(row, row.ranking, row.stressMetrics)
      ),
      createCell("td", String(row.endYear)),
      createCell(
        "td",
        formatDepletedEnhanced(row, row.depletionYear, row.stressMetrics),
        row.depleted ? "is-depleted" : "is-success"
      ),
      createCell("td", formatCurrency(row.terminalReal), "numeric"),
      createCell("td", formatCurrency(row.terminalNominal), "numeric")
    );

    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  tableWrapper.appendChild(table);
  section.append(heading, tableWrapper);
  container.appendChild(section);
}

function renderSingleScenarioTable(container, scenario) {
  const rows = Array.isArray(scenario?.yearlyRows) ? scenario.yearlyRows : [];

  if (!rows.length) {
    return;
  }

  const section = document.createElement("section");
  section.className = "scenario-table-section";

  const heading = document.createElement("h2");
  heading.className = "scenario-table-title";
  heading.textContent = "Year-by-year results";

  const tableWrapper = document.createElement("div");
  tableWrapper.className = "scenario-table-wrapper";

  const table = document.createElement("table");
  table.className = "scenario-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  headRow.append(
    createCell("th", "Year"),
    createCell("th", "Start"),
    createCell("th", "Target"),
    createCell("th", "Actual"),
    createCell("th", "Cut"),
    createCell("th", "Shortfall"),
    createCell("th", "State pension"),
    createCell("th", "Other income"),
    createCell("th", "Windfall"),
    createCell("th", "Withdrawal"),
    createCell("th", "End")
  );

  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.classList.add(getSingleScenarioRowClass(row));

    if (row.year === 10 || row.year === 20) {
      tr.classList.add("year-divider");
    }

    tr.append(
      createCell("td", formatYearLabel(row)),
      createCell("td", formatCurrency(row.startPortfolio), "numeric"),
      createCell("td", formatCurrency(row.targetSpending), "numeric"),
      createCell("td", formatCurrency(row.actualSpending), "numeric"),
      createCell(
        "td",
        formatCurrency(row.cut),
        `numeric ${getCutSeverityClass(row)}`.trim()
      ),
      createCell(
        "td",
        formatCurrency(row.shortfall),
        `numeric ${getShortfallSeverityClass(row)}`.trim()
      ),
      createCell("td", formatCurrency(row.statePension), "numeric"),
      createCell("td", formatCurrency(row.otherIncome), "numeric"),
      createCell("td", formatCurrency(row.windfall), "numeric"),
      createCell("td", formatCurrency(row.portfolioWithdrawal), "numeric"),
      createCell("td", formatCurrency(row.endPortfolio), "numeric")
    );

    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  tableWrapper.appendChild(table);
  section.append(heading, tableWrapper);
  container.appendChild(section);
}

export function renderScenarioTable({ container, scenarios }) {
  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    return;
  }

  renderSingleScenarioTable(container, scenarios[0]);
}