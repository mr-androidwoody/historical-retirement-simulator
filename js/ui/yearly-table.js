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

function formatPercent(value) {
  return `${Math.round(toFiniteNumber(value) * 100)}%`;
}

function formatDrawdown(value) {
  const number = toFiniteNumber(value);

  if (number >= 0) {
    return "";
  }

  return `↓ ${formatPercent(number)} from peak`;
}

function formatDepleted(value) {
  return value ? "Yes" : "No";
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

function createCell(tagName, text, className = "") {
  const cell = document.createElement(tagName);

  if (className) {
    cell.className = className;
  }

  cell.textContent = text;
  return cell;
}

function createEnhancedValueCell({ primary, secondary = "", className = "" }) {
  const cell = document.createElement("td");

  if (className) {
    cell.className = className;
  }

  const stack = document.createElement("div");
  stack.className = "cell-stack";

  const primaryValue = document.createElement("div");
  primaryValue.className = "cell-main";
  primaryValue.textContent = primary;
  stack.appendChild(primaryValue);

  if (secondary) {
    const secondaryValue = document.createElement("div");
    secondaryValue.className = "cell-sub";
    secondaryValue.textContent = secondary;
    stack.appendChild(secondaryValue);
  }

  cell.appendChild(stack);
  return cell;
}

function enrichYearlyRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  let runningPeak = 0;
  let previousEndDrawdown = 0;

  return rows.map((row) => {
    const startPortfolio = toFiniteNumber(row?.startPortfolio);
    const endPortfolio = toFiniteNumber(row?.endPortfolio);
    const portfolioWithdrawal = toFiniteNumber(row?.portfolioWithdrawal);

    const peakBeforeYear = Math.max(runningPeak, startPortfolio);
    const startDrawdown =
      peakBeforeYear > 0 ? startPortfolio / peakBeforeYear - 1 : 0;

    runningPeak = Math.max(peakBeforeYear, endPortfolio);

    const endDrawdown =
      runningPeak > 0 ? endPortfolio / runningPeak - 1 : 0;

    const withdrawalRate =
      startPortfolio > 0 ? portfolioWithdrawal / startPortfolio : 0;

    const isRecovery =
      endDrawdown > previousEndDrawdown &&
      previousEndDrawdown < 0 &&
      toFiniteNumber(row?.cut) <= 0 &&
      toFiniteNumber(row?.shortfall) <= 0 &&
      !row?.depleted;

    previousEndDrawdown = endDrawdown;

    return {
      ...row,
      peakBeforeYear,
      runningPeak,
      startDrawdown,
      endDrawdown,
      withdrawalRate,
      isRecovery
    };
  });
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

function getRowStateClass(row) {
  const cutRatio = getSeverityRatio(row?.cut, row?.targetSpending);
  const shortfallRatio = getSeverityRatio(row?.shortfall, row?.targetSpending);
  const endDrawdown = toFiniteNumber(row?.endDrawdown);

  const isCrisis =
    Boolean(row?.depleted) ||
    cutRatio >= 0.2 ||
    shortfallRatio >= 0.2 ||
    endDrawdown <= -0.3;

  if (isCrisis) {
    return "is-crisis";
  }

  const isStress =
    toFiniteNumber(row?.cut) > 0 ||
    toFiniteNumber(row?.shortfall) > 0;

  if (isStress) {
    return "is-stress";
  }

  return "is-normal";
}

function formatYearLabel(row) {
  const yearNumber = toFiniteNumber(row?.year);
  const tags = [];

  if (toFiniteNumber(row?.cut) > 0) {
    tags.push("Cut");
  } else if (toFiniteNumber(row?.shortfall) > 0) {
    tags.push("Shortfall");
  } else if (row?.isRecovery) {
    tags.push("Recovery");
  }

  return tags.length > 0
    ? `Year ${yearNumber} • ${tags.join(" • ")}`
    : `Year ${yearNumber}`;
}

/* ============================
   MULTI-SCENARIO TABLE
   ============================ */

function renderMultiScenarioTable(container, scenarios) {
  const rows = scenarios.map(buildScenarioRow);

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
    createCell("th", "Terminal real"),
    createCell("th", "Terminal nominal")
  );

  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    tr.append(
      createCell("td", String(row.startYear)),
      createCell("td", String(row.endYear)),
      createCell(
        "td",
        formatDepleted(row.depleted),
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

/* ============================
   SINGLE-SCENARIO YEAR TABLE
   ============================ */

function renderSingleScenarioTable(container, scenario) {
  const rows = scenario?.yearlyRows || [];
  const enrichedRows = enrichYearlyRows(rows);

  if (!Array.isArray(enrichedRows) || enrichedRows.length === 0) {
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
    createCell("th", "End"),
    createCell("th", "Depleted")
  );

  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");

  enrichedRows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.classList.add(getRowStateClass(row));

    if (row.year === 10 || row.year === 20) {
      tr.classList.add("year-divider");
    }

    tr.append(
      createCell("td", formatYearLabel(row)),
      createEnhancedValueCell({
        primary: formatCurrency(row.startPortfolio),
        secondary: formatDrawdown(row.startDrawdown),
        className: "numeric"
      }),
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
      createEnhancedValueCell({
        primary: formatCurrency(row.portfolioWithdrawal),
        secondary:
          toFiniteNumber(row.startPortfolio) > 0
            ? `(${formatPercent(row.withdrawalRate)})`
            : "",
        className: "numeric"
      }),
      createEnhancedValueCell({
        primary: formatCurrency(row.endPortfolio),
        secondary: formatDrawdown(row.endDrawdown),
        className: "numeric"
      }),
      createCell(
        "td",
        row.depleted ? "DEPLETED" : "",
        row.depleted ? "is-depleted" : ""
      )
    );

    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  tableWrapper.appendChild(table);
  section.append(heading, tableWrapper);
  container.appendChild(section);
}

/* ============================
   ENTRY POINT
   ============================ */

export function renderScenarioTable({ container, scenarios }) {
  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    return;
  }

  if (scenarios.length === 1) {
    renderSingleScenarioTable(container, scenarios[0]);
  } else {
    renderMultiScenarioTable(container, scenarios);
  }
}