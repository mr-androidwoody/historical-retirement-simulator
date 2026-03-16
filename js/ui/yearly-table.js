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
  const result = scenario?.result ?? {};
  const terminalNominal = getLastValue(result.pathNominal);
  const terminalReal = getLastValue(result.pathReal);

  return {
    startYear: scenario?.startYear ?? 0,
    endYear: scenario?.endYear ?? 0,
    depleted: Boolean(result.depleted),
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

export function renderScenarioTable({ container, scenarios }) {
  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    return;
  }

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