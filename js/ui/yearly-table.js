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

  if (!Array.isArray(rows) || rows.length === 0) {
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

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    tr.append(
      createCell("td", String(row.year ?? "")),
      createCell("td", formatCurrency(row.startPortfolio), "numeric"),
      createCell("td", formatCurrency(row.targetSpending), "numeric"),
      createCell("td", formatCurrency(row.actualSpending), "numeric"),
      createCell("td", formatCurrency(row.cut), "numeric"),
      createCell("td", formatCurrency(row.shortfall), "numeric"),
      createCell("td", formatCurrency(row.statePension), "numeric"),
      createCell("td", formatCurrency(row.otherIncome), "numeric"),
      createCell("td", formatCurrency(row.windfall), "numeric"),
      createCell("td", formatCurrency(row.portfolioWithdrawal), "numeric"),
      createCell("td", formatCurrency(row.endPortfolio), "numeric"),
      createCell(
        "td",
        formatDepleted(row.depleted),
        row.depleted ? "is-depleted" : "is-success"
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