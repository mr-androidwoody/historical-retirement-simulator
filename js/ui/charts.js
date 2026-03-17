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

function percentileFromSorted(sortedValues, percentile) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) {
    return 0;
  }

  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  const index = (percentile / 100) * (sortedValues.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  const weight = index - lowerIndex;
  return sortedValues[lowerIndex] + (sortedValues[upperIndex] - sortedValues[lowerIndex]) * weight;
}

function createSvgElement(tagName) {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}

function getPathForMode(scenario, chartMode) {
  if (!scenario) {
    return [];
  }

  if (chartMode === "real" && Array.isArray(scenario.pathReal) && scenario.pathReal.length > 0) {
    return scenario.pathReal.map((value) => toFiniteNumber(value));
  }

  if (Array.isArray(scenario.pathNominal) && scenario.pathNominal.length > 0) {
    return scenario.pathNominal.map((value) => toFiniteNumber(value));
  }

  const rows = scenario.yearlyRows ?? [];
  if (rows.length === 0) {
    return [];
  }

  return rows.map((row) => toFiniteNumber(row?.endPortfolio));
}

function buildPercentileInvestmentRows(scenarios, chartMode) {
  const paths = (Array.isArray(scenarios) ? scenarios : [])
    .map((scenario) => getPathForMode(scenario, chartMode))
    .filter((path) => path.length > 0);

  if (paths.length === 0) {
    return [];
  }

  const count = Math.max(...paths.map((path) => path.length));

  return Array.from({ length: count }, (_, index) => {
    const values = paths
      .map((path) => toFiniteNumber(path[index]))
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right);

    return {
      year: index + 1,
      p10: percentileFromSorted(values, 10),
      p50: percentileFromSorted(values, 50),
      p90: percentileFromSorted(values, 90)
    };
  });
}

function deflateRows(rows) {
  let inflationIndex = 1;

  return (Array.isArray(rows) ? rows : []).map((row) => {
    const deflatedRow = {
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

    return deflatedRow;
  });
}

function getDisplayRowsForScenario(scenario, chartMode) {
  const rows = scenario?.yearlyRows ?? [];
  return chartMode === "real" ? deflateRows(rows) : rows.map((row) => ({ ...row }));
}

function buildMedianSeriesFromRows(scenarios, chartMode) {
  const rowSets = (Array.isArray(scenarios) ? scenarios : [])
    .map((scenario) => getDisplayRowsForScenario(scenario, chartMode))
    .filter((rows) => rows.length > 0);

  if (rowSets.length === 0) {
    return [];
  }

  const count = Math.max(...rowSets.map((rows) => rows.length));
  const fields = [
    "targetSpending",
    "actualSpending",
    "statePension",
    "otherIncome",
    "windfall",
    "portfolioWithdrawal",
    "shortfall"
  ];

  return Array.from({ length: count }, (_, index) => {
    const row = {
      year: index + 1
    };

    fields.forEach((field) => {
      const values = rowSets
        .map((rows) => toFiniteNumber(rows[index]?.[field]))
        .filter((value) => Number.isFinite(value))
        .sort((left, right) => left - right);

      row[field] = percentileFromSorted(values, 50);
    });

    return row;
  });
}

function buildChartGeometry(seriesList) {
  const width = 980;
  const height = 420;
  const margin = { top: 22, right: 18, bottom: 50, left: 78 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const allValues = seriesList.flatMap((series) => series.values).map((value) => toFiniteNumber(value));
  const minValue = Math.min(0, ...allValues);
  const maxValue = Math.max(1, ...allValues);
  const yMin = minValue;
  const yMax = maxValue === yMin ? yMin + 1 : maxValue;

  const maxLength = Math.max(...seriesList.map((series) => series.values.length), 1);

  return {
    width,
    height,
    margin,
    innerWidth,
    innerHeight,
    yMin,
    yMax,
    xScale(index) {
      if (maxLength === 1) {
        return margin.left + innerWidth / 2;
      }

      return margin.left + (index / (maxLength - 1)) * innerWidth;
    },
    yScale(value) {
      const ratio = (toFiniteNumber(value) - yMin) / (yMax - yMin);
      return margin.top + innerHeight - ratio * innerHeight;
    }
  };
}

function buildLinePath(values, geometry) {
  return values
    .map((value, index) => {
      const x = geometry.xScale(index);
      const y = geometry.yScale(value);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function buildAreaPath(topValues, baseValue, geometry) {
  if (!topValues.length) {
    return "";
  }

  const firstX = geometry.xScale(0);
  const baseY = geometry.yScale(baseValue);

  const topPath = topValues
    .map((value, index) => {
      const x = geometry.xScale(index);
      const y = geometry.yScale(value);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const bottomPath = topValues
    .map((_, reverseIndex) => {
      const index = topValues.length - 1 - reverseIndex;
      const x = geometry.xScale(index);
      return `L ${x} ${baseY}`;
    })
    .join(" ");

  return `${topPath} ${bottomPath} L ${firstX} ${baseY} Z`;
}

function buildBandPath(upperValues, lowerValues, geometry) {
  if (!upperValues.length || !lowerValues.length) {
    return "";
  }

  const topPath = upperValues
    .map((value, index) => {
      const x = geometry.xScale(index);
      const y = geometry.yScale(value);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const bottomPath = lowerValues
    .map((value, reverseIndex) => {
      const index = lowerValues.length - 1 - reverseIndex;
      const x = geometry.xScale(index);
      const y = geometry.yScale(value);
      return `L ${x} ${y}`;
    })
    .join(" ");

  return `${topPath} ${bottomPath} Z`;
}

function appendAxes(svg, geometry, tickLabels) {
  const tickCount = 5;

  for (let tick = 0; tick <= tickCount; tick += 1) {
    const value = geometry.yMin + ((geometry.yMax - geometry.yMin) / tickCount) * tick;
    const y = geometry.yScale(value);

    const line = createSvgElement("line");
    line.setAttribute("x1", String(geometry.margin.left));
    line.setAttribute("x2", String(geometry.width - geometry.margin.right));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("class", "results-svg-grid-line");
    svg.appendChild(line);

    const label = createSvgElement("text");
    label.setAttribute("x", String(geometry.margin.left - 12));
    label.setAttribute("y", String(y + 4));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "results-svg-axis-label");
    label.textContent = formatCurrencyCompact(value);
    svg.appendChild(label);
  }

  tickLabels.forEach((labelText, index) => {
    const x = geometry.xScale(index);

    const label = createSvgElement("text");
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(geometry.height - 14));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "results-svg-axis-label");
    label.textContent = labelText;
    svg.appendChild(label);
  });

  const axisX = createSvgElement("line");
  axisX.setAttribute("x1", String(geometry.margin.left));
  axisX.setAttribute("x2", String(geometry.width - geometry.margin.right));
  axisX.setAttribute("y1", String(geometry.height - geometry.margin.bottom));
  axisX.setAttribute("y2", String(geometry.height - geometry.margin.bottom));
  axisX.setAttribute("class", "results-svg-axis-line");
  svg.appendChild(axisX);

  const axisY = createSvgElement("line");
  axisY.setAttribute("x1", String(geometry.margin.left));
  axisY.setAttribute("x2", String(geometry.margin.left));
  axisY.setAttribute("y1", String(geometry.margin.top));
  axisY.setAttribute("y2", String(geometry.height - geometry.margin.bottom));
  axisY.setAttribute("class", "results-svg-axis-line");
  svg.appendChild(axisY);
}

function buildTickLabels(length) {
  if (length <= 0) {
    return [];
  }

  if (length === 1) {
    return ["1"];
  }

  const indexes = Array.from(new Set([
    0,
    Math.floor((length - 1) / 3),
    Math.floor(((length - 1) * 2) / 3),
    length - 1
  ]));

  const labels = new Array(length).fill("");
  indexes.forEach((index) => {
    labels[index] = String(index + 1);
  });
  return labels;
}

function renderLegend(container, items) {
  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="results-inline-legend">
      ${items
        .map(
          (item) => `
            <div class="results-inline-legend-item">
              <span class="results-inline-legend-line ${item.className}"></span>
              <span>${item.label}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSvgChart({ container, seriesList, areas = [], bands = [], legendItems, ariaLabel }) {
  if (!container) {
    return;
  }

  container.innerHTML = "";

  const usableSeries = (Array.isArray(seriesList) ? seriesList : []).filter((series) => Array.isArray(series.values) && series.values.length > 0);
  if (usableSeries.length === 0) {
    container.innerHTML = `<div class="results-chart-empty">No chart data available for this view.</div>`;
    return;
  }

  const geometry = buildChartGeometry(usableSeries);
  const svg = createSvgElement("svg");
  svg.setAttribute("class", "results-svg-chart");
  svg.setAttribute("viewBox", `0 0 ${geometry.width} ${geometry.height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", ariaLabel);

  appendAxes(svg, geometry, buildTickLabels(Math.max(...usableSeries.map((series) => series.values.length))));

  areas.forEach((area) => {
    const path = buildAreaPath(area.values, area.baseValue ?? 0, geometry);
    if (!path) {
      return;
    }

    const element = createSvgElement("path");
    element.setAttribute("d", path);
    element.setAttribute("class", area.className);
    svg.appendChild(element);
  });

  bands.forEach((band) => {
    const path = buildBandPath(band.upperValues, band.lowerValues, geometry);
    if (!path) {
      return;
    }

    const element = createSvgElement("path");
    element.setAttribute("d", path);
    element.setAttribute("class", band.className);
    svg.appendChild(element);
  });

  usableSeries.forEach((series) => {
    const path = createSvgElement("path");
    path.setAttribute("d", buildLinePath(series.values, geometry));
    path.setAttribute("class", series.className);
    svg.appendChild(path);
  });

  container.appendChild(svg);
  renderLegend(container.nextElementSibling, legendItems);
}

export function renderInvestmentProjectionChart({
  container,
  legendContainer,
  scenarios = [],
  chartMode = "nominal"
}) {
  if (!container) {
    return;
  }

  const percentileRows = buildPercentileInvestmentRows(scenarios, chartMode);
  const selectedPath = getPathForMode((Array.isArray(scenarios) ? scenarios[0] : null), chartMode);

  const p10 = percentileRows.map((row) => row.p10);
  const p50 = percentileRows.map((row) => row.p50);
  const p90 = percentileRows.map((row) => row.p90);

  renderSvgChart({
    container,
    seriesList: [
      { values: p50, className: "results-svg-line results-svg-line--primary" },
      { values: selectedPath, className: "results-svg-line results-svg-line--secondary" }
    ],
    bands: p10.length && p90.length
      ? [{ upperValues: p90, lowerValues: p10, className: "results-svg-band" }]
      : [],
    legendItems: [
      { label: "Median simulation", className: "results-inline-legend-line--primary" },
      { label: "Selected path", className: "results-inline-legend-line--secondary" }
    ],
    ariaLabel: `Investment projection chart showing ${chartMode} portfolio paths.`
  });

  renderLegend(legendContainer, [
    { label: "Median simulation", className: "results-inline-legend-line--primary" },
    { label: "Selected path", className: "results-inline-legend-line--secondary" }
  ]);
}

export function renderSpendingPathChart({
  container,
  legendContainer,
  scenarios = [],
  chartMode = "nominal",
  guardrails = "on"
}) {
  if (!container) {
    return;
  }

  const sourceRows =
    Array.isArray(scenarios) && scenarios.length === 1
      ? getDisplayRowsForScenario(scenarios[0], chartMode)
      : buildMedianSeriesFromRows(scenarios, chartMode);

  const planned = sourceRows.map((row) => toFiniteNumber(row?.targetSpending));
  const actual = sourceRows.map((row) =>
    guardrails === "on"
      ? toFiniteNumber(row?.actualSpending)
      : toFiniteNumber(row?.targetSpending)
  );
  const statePension = sourceRows.map((row) => toFiniteNumber(row?.statePension));
  const otherIncome = sourceRows.map((row) => toFiniteNumber(row?.otherIncome) + toFiniteNumber(row?.windfall));
  const withdrawals = sourceRows.map((row) => toFiniteNumber(row?.portfolioWithdrawal));
  const shortfall = sourceRows.map((row) => toFiniteNumber(row?.shortfall));

  renderSvgChart({
    container,
    seriesList: [
      { values: planned, className: "results-svg-line results-svg-line--planned" },
      { values: actual, className: "results-svg-line results-svg-line--actual" },
      { values: statePension, className: "results-svg-line results-svg-line--pension" },
      { values: otherIncome, className: "results-svg-line results-svg-line--income" },
      { values: withdrawals, className: "results-svg-line results-svg-line--withdrawal" },
      { values: shortfall, className: "results-svg-line results-svg-line--shortfall" }
    ],
    areas: [
      { values: actual, baseValue: 0, className: "results-svg-area results-svg-area--actual" },
      { values: statePension, baseValue: 0, className: "results-svg-area results-svg-area--pension" }
    ],
    legendItems: [
      { label: "Planned household spending", className: "results-inline-legend-line--planned" },
      { label: "Actual spending after guardrails", className: "results-inline-legend-line--actual" },
      { label: "State pension income", className: "results-inline-legend-line--pension" },
      { label: "Other income", className: "results-inline-legend-line--income" },
      { label: "Portfolio withdrawals", className: "results-inline-legend-line--withdrawal" },
      { label: "Shortfall gap", className: "results-inline-legend-line--shortfall" }
    ],
    ariaLabel: `Spending path chart showing ${chartMode} spending and income series.`
  });

  renderLegend(legendContainer, [
    { label: "Planned household spending", className: "results-inline-legend-line--planned" },
    { label: "Actual spending after guardrails", className: "results-inline-legend-line--actual" },
    { label: "State pension income", className: "results-inline-legend-line--pension" },
    { label: "Other income", className: "results-inline-legend-line--income" },
    { label: "Portfolio withdrawals", className: "results-inline-legend-line--withdrawal" },
    { label: "Shortfall gap", className: "results-inline-legend-line--shortfall" }
  ]);
}