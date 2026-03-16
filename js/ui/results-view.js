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

export function renderResultsSummary({ container, summary }) {
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
  heading.textContent = "Summary";

  const grid = document.createElement("div");
  grid.className = "results-summary-grid";

  grid.append(
    createMetricCard("Success rate", formatPercentage(summary.successRate)),
    createMetricCard("Median terminal wealth", formatCurrency(summary.medianTerminalWealth)),
    createMetricCard("10th percentile", formatCurrency(summary.p10TerminalWealth)),
    createMetricCard("90th percentile", formatCurrency(summary.p90TerminalWealth))
  );

  wrapper.append(heading, grid);
  container.appendChild(wrapper);
}