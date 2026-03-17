function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatPercentage(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0.0%";
  }

  return `${(number * 100).toFixed(1)}%`;
}

function formatCurrency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "£0";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(number);
}

function createMetricCard(label, value) {
  const card = document.createElement("article");
  card.className = "result-card";

  const labelElement = document.createElement("div");
  labelElement.className = "result-card-label";
  labelElement.textContent = label;

  const valueElement = document.createElement("div");
  valueElement.className = "result-card-value";
  valueElement.textContent = value;

  card.append(labelElement, valueElement);
  return card;
}

function renderMultiScenario(grid, summary) {
  grid.append(
    createMetricCard("Success rate", formatPercentage(summary.successRate)),
    createMetricCard(
      "Median terminal wealth",
      formatCurrency(summary.medianTerminalWealth)
    ),
    createMetricCard(
      "10th percentile",
      formatCurrency(summary.p10TerminalWealth)
    ),
    createMetricCard(
      "90th percentile",
      formatCurrency(summary.p90TerminalWealth)
    )
  );
}

function renderSingleScenario(grid, scenarios) {
  const scenario = Array.isArray(scenarios) ? scenarios[0] : null;
  const rows = Array.isArray(scenario?.yearlyRows) ? scenario.yearlyRows : [];

  if (rows.length === 0) {
    grid.append(
      createMetricCard("Total withdrawals", "£0"),
      createMetricCard("Income received", "£0"),
      createMetricCard("Cuts applied", "0"),
      createMetricCard("First cut year", "None")
    );
    return;
  }

  let totalWithdrawals = 0;
  let totalIncome = 0;
  let cutYears = 0;
  let firstCutYear = null;

  rows.forEach((row) => {
    totalWithdrawals += toFiniteNumber(row.portfolioWithdrawal);
    totalIncome +=
      toFiniteNumber(row.statePension) +
      toFiniteNumber(row.otherIncome) +
      toFiniteNumber(row.windfall);

    if (toFiniteNumber(row.cut) > 0) {
      cutYears += 1;

      if (firstCutYear === null) {
        firstCutYear = row.year;
      }
    }
  });

  grid.append(
    createMetricCard("Total withdrawals", formatCurrency(totalWithdrawals)),
    createMetricCard("Income received", formatCurrency(totalIncome)),
    createMetricCard("Cuts applied", String(cutYears)),
    createMetricCard(
      "First cut year",
      firstCutYear !== null ? String(firstCutYear) : "None"
    )
  );
}

export function renderResultsSummary({ container, summary, scenarios }) {
  if (!container) {
    return;
  }

  if (!summary) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = "";

  const wrapper = document.createElement("section");
  wrapper.className = "results-summary";

  const heading = document.createElement("h2");
  heading.className = "results-summary-title";
  heading.textContent =
    summary.type === "single" ? "Plan insights" : "Summary";

  const grid = document.createElement("div");
  grid.className = "results-summary-grid";

  if (summary.type === "single") {
    renderSingleScenario(grid, scenarios);
  } else {
    renderMultiScenario(grid, summary);
  }

  wrapper.append(heading, grid);
  container.appendChild(wrapper);
}