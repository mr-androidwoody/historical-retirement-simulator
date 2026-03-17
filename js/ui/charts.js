function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrencyCompact(value) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(toFiniteNumber(value));
}

function createSvgElement(tagName) {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}

function getPathForMode(scenario, chartMode) {
  if (!scenario) return [];

  if (chartMode === "real" && Array.isArray(scenario.pathReal)) {
    return scenario.pathReal.map(toFiniteNumber);
  }

  if (Array.isArray(scenario.pathNominal)) {
    return scenario.pathNominal.map(toFiniteNumber);
  }

  const rows = scenario.yearlyRows ?? [];
  return rows.map((row) => toFiniteNumber(row?.endPortfolio));
}

function deflateRows(rows) {
  let inflationIndex = 1;

  return rows.map((row) => {
    const out = {
      ...row,
      targetSpending: toFiniteNumber(row?.targetSpending) / inflationIndex,
      actualSpending: toFiniteNumber(row?.actualSpending) / inflationIndex,
      statePension: toFiniteNumber(row?.statePension) / inflationIndex,
      otherIncome: toFiniteNumber(row?.otherIncome) / inflationIndex,
      windfall: toFiniteNumber(row?.windfall) / inflationIndex,
      portfolioWithdrawal: toFiniteNumber(row?.portfolioWithdrawal) / inflationIndex,
      shortfall: toFiniteNumber(row?.shortfall) / inflationIndex
    };

    inflationIndex *= 1 + toFiniteNumber(row?.inflation);
    return out;
  });
}

function getDisplayRows(scenario, chartMode) {
  const rows = scenario?.yearlyRows ?? [];
  return chartMode === "real" ? deflateRows(rows) : rows;
}

function buildGeometry(values) {
  const width = 980;
  const height = 420;
  const margin = { top: 20, right: 20, bottom: 50, left: 70 };

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);

  return {
    width,
    height,
    margin,
    x(i, len) {
      return margin.left + (i / Math.max(1, len - 1)) * innerW;
    },
    y(v) {
      return margin.top + innerH - ((v - min) / (max - min)) * innerH;
    }
  };
}

function buildLine(values, geo) {
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${geo.x(i, values.length)} ${geo.y(v)}`)
    .join(" ");
}

function renderChart(container, series, ariaLabel) {
  container.innerHTML = "";

  if (!series.length) {
    container.innerHTML = `<div>No data</div>`;
    return;
  }

  const allValues = series.flatMap((s) => s.values);
  const geo = buildGeometry(allValues);

  const svg = createSvgElement("svg");
  svg.setAttribute("viewBox", `0 0 ${geo.width} ${geo.height}`);
  svg.setAttribute("class", "results-svg-chart");
  svg.setAttribute("aria-label", ariaLabel);

  series.forEach((s) => {
    const path = createSvgElement("path");
    path.setAttribute("d", buildLine(s.values, geo));
    path.setAttribute("class", s.className);
    svg.appendChild(path);
  });

  container.appendChild(svg);
}

export function renderInvestmentProjectionChart({
  container,
  legendContainer,
  scenarios = [],
  chartMode = "nominal"
}) {
  const scenario = scenarios[0];
  const path = getPathForMode(scenario, chartMode);

  renderChart(
    container,
    [
      {
        values: path,
        className: "results-svg-line results-svg-line--primary"
      }
    ],
    "Investment projection"
  );

  if (legendContainer) {
    legendContainer.innerHTML = `
      <div class="results-inline-legend">
        <div><span class="results-inline-legend-line--primary"></span> Portfolio path</div>
      </div>
    `;
  }
}

export function renderSpendingPathChart({
  container,
  legendContainer,
  scenarios = [],
  chartMode = "nominal",
  guardrails = "on"
}) {
  const scenario = scenarios[0];
  const rows = getDisplayRows(scenario, chartMode);

  const planned = rows.map((r) => toFiniteNumber(r.targetSpending));
  const actual = rows.map((r) =>
    guardrails === "on"
      ? toFiniteNumber(r.actualSpending)
      : toFiniteNumber(r.targetSpending)
  );

  renderChart(
    container,
    [
      { values: planned, className: "results-svg-line--planned" },
      { values: actual, className: "results-svg-line--actual" }
    ],
    "Spending path"
  );

  if (legendContainer) {
    legendContainer.innerHTML = `
      <div class="results-inline-legend">
        <div><span class="results-inline-legend-line--planned"></span> Planned</div>
        <div><span class="results-inline-legend-line--actual"></span> Actual</div>
      </div>
    `;
  }
}