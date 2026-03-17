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
  if (!scenario) {
    return [];
  }

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
      startPortfolio: toFiniteNumber(row?.startPortfolio) / inflationIndex,
      endPortfolio: toFiniteNumber(row?.endPortfolio) / inflationIndex,
      targetSpending: toFiniteNumber(row?.targetSpending) / inflationIndex,
      actualSpending: toFiniteNumber(row?.actualSpending) / inflationIndex,
      statePension: toFiniteNumber(row?.statePension) / inflationIndex,
      statePensionPerson1: toFiniteNumber(row?.statePensionPerson1) / inflationIndex,
      statePensionPerson2: toFiniteNumber(row?.statePensionPerson2) / inflationIndex,
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

function getScenarioYears(scenario, pointCount) {
  const startYear = toFiniteNumber(scenario?.startYear);
  const hasStartYear = Number.isFinite(startYear) && startYear > 0;

  if (!hasStartYear) {
    return Array.from({ length: pointCount }, (_, index) => index);
  }

  return Array.from({ length: pointCount }, (_, index) => startYear + index);
}

function getNiceStep(rawStep) {
  if (rawStep <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalised = rawStep / magnitude;

  if (normalised <= 1) return 1 * magnitude;
  if (normalised <= 2) return 2 * magnitude;
  if (normalised <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function getTickValues(minValue, maxValue, targetTickCount = 5) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return [0, 1];
  }

  if (minValue === maxValue) {
    if (minValue === 0) {
      return [0, 1];
    }
    return [0, minValue];
  }

  const range = maxValue - minValue;
  const step = getNiceStep(range / Math.max(1, targetTickCount));
  const start = Math.floor(minValue / step) * step;
  const end = Math.ceil(maxValue / step) * step;

  const ticks = [];
  for (let value = start; value <= end + step * 0.5; value += step) {
    ticks.push(value);
  }

  if (!ticks.length) {
    ticks.push(minValue, maxValue);
  }

  return ticks;
}

function buildGeometry(values, { width = 980, height = 420, minOverride = null, maxOverride = null } = {}) {
  const margin = { top: 28, right: 20, bottom: 56, left: 78 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const computedMin = values.length ? Math.min(...values) : 0;
  const computedMax = values.length ? Math.max(...values) : 1;

  const minValue = minOverride != null ? minOverride : Math.min(0, computedMin);
  const maxValue = maxOverride != null ? maxOverride : Math.max(1, computedMax);

  const safeMax = maxValue === minValue ? minValue + 1 : maxValue;

  return {
    width,
    height,
    margin,
    innerW,
    innerH,
    minValue,
    maxValue: safeMax,
    x(index, length) {
      if (length <= 1) {
        return margin.left + innerW / 2;
      }
      return margin.left + (index / (length - 1)) * innerW;
    },
    y(value) {
      return margin.top + innerH - ((value - minValue) / (safeMax - minValue)) * innerH;
    }
  };
}

function buildLinePath(values, geo) {
  if (!values.length) {
    return "";
  }

  return values
    .map((value, index) => `${index === 0 ? "M" : "L"} ${geo.x(index, values.length)} ${geo.y(value)}`)
    .join(" ");
}

function buildAreaPath(values, geo, baseline = 0) {
  if (!values.length) {
    return "";
  }

  const top = values
    .map((value, index) => `${index === 0 ? "M" : "L"} ${geo.x(index, values.length)} ${geo.y(value)}`)
    .join(" ");

  const bottom = values
    .map((_, index) => {
      const reverseIndex = values.length - 1 - index;
      return `L ${geo.x(reverseIndex, values.length)} ${geo.y(baseline)}`;
    })
    .join(" ");

  return `${top} ${bottom} Z`;
}

function buildLegendMarkup(items = []) {
  if (!items.length) {
    return "";
  }

  return `
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

function renderEmptyChart(container) {
  container.innerHTML = `<div class="results-chart-empty">No data</div>`;
}

function renderAxesAndGrid(svg, geo, years, yTicks) {
  yTicks.forEach((tick) => {
    const y = geo.y(tick);

    const gridLine = createSvgElement("line");
    gridLine.setAttribute("x1", geo.margin.left);
    gridLine.setAttribute("x2", geo.width - geo.margin.right);
    gridLine.setAttribute("y1", y);
    gridLine.setAttribute("y2", y);
    gridLine.setAttribute("class", "results-svg-grid-line");
    svg.appendChild(gridLine);

    const label = createSvgElement("text");
    label.setAttribute("x", geo.margin.left - 12);
    label.setAttribute("y", y + 4);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "results-svg-axis-label");
    label.textContent = formatCurrencyCompact(tick);
    svg.appendChild(label);
  });

  const xAxis = createSvgElement("line");
  xAxis.setAttribute("x1", geo.margin.left);
  xAxis.setAttribute("x2", geo.width - geo.margin.right);
  xAxis.setAttribute("y1", geo.height - geo.margin.bottom);
  xAxis.setAttribute("y2", geo.height - geo.margin.bottom);
  xAxis.setAttribute("class", "results-svg-axis-line");
  svg.appendChild(xAxis);

  const yAxis = createSvgElement("line");
  yAxis.setAttribute("x1", geo.margin.left);
  yAxis.setAttribute("x2", geo.margin.left);
  yAxis.setAttribute("y1", geo.margin.top);
  yAxis.setAttribute("y2", geo.height - geo.margin.bottom);
  yAxis.setAttribute("class", "results-svg-axis-line");
  svg.appendChild(yAxis);

  const xLabelIndexes = Array.from(
    new Set(
      [0, Math.floor((years.length - 1) / 2), years.length - 1].filter(
        (index) => index >= 0 && index < years.length
      )
    )
  );

  xLabelIndexes.forEach((index) => {
    const label = createSvgElement("text");
    label.setAttribute("x", geo.x(index, years.length));
    label.setAttribute("y", geo.height - geo.margin.bottom + 24);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "results-svg-axis-label");
    label.textContent = String(years[index]);
    svg.appendChild(label);
  });
}

function renderAreas(svg, geo, areas = []) {
  areas.forEach((areaConfig) => {
    const pathData = buildAreaPath(areaConfig.values, geo, areaConfig.baseline ?? 0);
    if (!pathData) {
      return;
    }

    const area = createSvgElement("path");
    area.setAttribute("d", pathData);
    area.setAttribute("class", `results-svg-area ${areaConfig.className}`);
    svg.appendChild(area);
  });
}

function renderLines(svg, geo, lines = []) {
  lines.forEach((lineConfig) => {
    const pathData = buildLinePath(lineConfig.values, geo);
    if (!pathData) {
      return;
    }

    const path = createSvgElement("path");
    path.setAttribute("d", pathData);
    path.setAttribute("class", `results-svg-line ${lineConfig.className}`);
    svg.appendChild(path);
  });
}

function renderAnnotations(svg, geo, annotations = [], pointCount = 0) {
  annotations.forEach((annotation, index) => {
    if (!Number.isInteger(annotation.pointIndex) || annotation.pointIndex < 0 || annotation.pointIndex >= pointCount) {
      return;
    }

    const x = geo.x(annotation.pointIndex, pointCount);

    const line = createSvgElement("line");
    line.setAttribute("x1", x);
    line.setAttribute("x2", x);
    line.setAttribute("y1", geo.margin.top);
    line.setAttribute("y2", geo.height - geo.margin.bottom);
    line.setAttribute("stroke", annotation.stroke ?? "#94a3b8");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-dasharray", annotation.dashArray ?? "6 5");
    line.setAttribute("opacity", annotation.opacity ?? "0.95");
    svg.appendChild(line);

    const label = createSvgElement("text");
    label.setAttribute("x", x + 6);
    label.setAttribute("y", geo.margin.top + 18 + (index % 3) * 18);
    label.setAttribute("class", "results-svg-axis-label");
    label.setAttribute("fill", annotation.stroke ?? "#64748b");
    label.textContent = annotation.label;
    svg.appendChild(label);
  });
}

function renderLayeredChart({
  container,
  lines = [],
  areas = [],
  annotations = [],
  ariaLabel = "",
  minOverride = null
}) {
  container.innerHTML = "";

  const values = [
    ...lines.flatMap((line) => line.values ?? []),
    ...areas.flatMap((area) => area.values ?? []),
    0
  ].map(toFiniteNumber);

  if (!values.length || !lines.some((line) => Array.isArray(line.values) && line.values.length)) {
    renderEmptyChart(container);
    return;
  }

  const pointCount = Math.max(
    ...lines.map((line) => line.values.length),
    ...areas.map((area) => area.values.length),
    0
  );

  const years = getScenarioYears({ startYear: lines[0]?.startYear }, pointCount);
  const geo = buildGeometry(values, { minOverride });
  const yTicks = getTickValues(geo.minValue, geo.maxValue, 5);

  const svg = createSvgElement("svg");
  svg.setAttribute("viewBox", `0 0 ${geo.width} ${geo.height}`);
  svg.setAttribute("class", "results-svg-chart");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", ariaLabel);

  renderAxesAndGrid(svg, geo, years, yTicks);
  renderAreas(svg, geo, areas);
  renderLines(svg, geo, lines);
  renderAnnotations(svg, geo, annotations, pointCount);

  container.appendChild(svg);
}

function getWindfallAnnotations(rows) {
  return rows
    .map((row, index) => {
      const windfall = toFiniteNumber(row?.windfall);
      if (windfall <= 0) {
        return null;
      }

      return {
        pointIndex: index,
        label: `Windfall ${formatCurrencyCompact(windfall)}`,
        stroke: "#1f8a7a",
        dashArray: "5 5"
      };
    })
    .filter(Boolean);
}

function getPensionStartAnnotations(rows) {
  const annotations = [];

  const person1Index = rows.findIndex((row, index) => {
    const current = toFiniteNumber(row?.statePensionPerson1);
    const previous = index > 0 ? toFiniteNumber(rows[index - 1]?.statePensionPerson1) : 0;
    return current > 0 && previous <= 0;
  });

  const person2Index = rows.findIndex((row, index) => {
    const current = toFiniteNumber(row?.statePensionPerson2);
    const previous = index > 0 ? toFiniteNumber(rows[index - 1]?.statePensionPerson2) : 0;
    return current > 0 && previous <= 0;
  });

  if (person1Index >= 0) {
    annotations.push({
      pointIndex: person1Index,
      label: "Person 1 pension starts",
      stroke: "#ff8a3d",
      dashArray: "7 5"
    });
  }

  if (person2Index >= 0) {
    annotations.push({
      pointIndex: person2Index,
      label: "Person 2 pension starts",
      stroke: "#8a63ff",
      dashArray: "7 5"
    });
  }

  return annotations;
}

export function renderInvestmentProjectionChart({
  container,
  legendContainer,
  scenarios = [],
  chartMode = "nominal"
}) {
  const scenario = scenarios[0];

  if (!container || !scenario) {
    if (container) {
      renderEmptyChart(container);
    }
    if (legendContainer) {
      legendContainer.innerHTML = "";
    }
    return;
  }

  const path = getPathForMode(scenario, chartMode);
  const displayRows = getDisplayRows(scenario, chartMode);
  const annotations = [
    ...getWindfallAnnotations(displayRows),
    ...getPensionStartAnnotations(displayRows)
  ];

  renderLayeredChart({
    container,
    ariaLabel: "Investment projection",
    areas: [
      {
        values: path,
        baseline: 0,
        className: "results-svg-area--actual"
      }
    ],
    lines: [
      {
        values: path,
        className: "results-svg-line--primary",
        startYear: scenario?.startYear
      }
    ],
    annotations,
    minOverride: 0
  });

  if (legendContainer) {
    legendContainer.innerHTML = buildLegendMarkup([
      {
        className: "results-inline-legend-line--primary",
        label: "Portfolio path"
      },
      {
        className: "results-inline-legend-line--income",
        label: "Windfall marker"
      },
      {
        className: "results-inline-legend-line--pension",
        label: "Person 1 pension start"
      },
      {
        className: "results-inline-legend-line--planned",
        label: "Person 2 pension start"
      }
    ]);
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

  if (!container || !scenario) {
    if (container) {
      renderEmptyChart(container);
    }
    if (legendContainer) {
      legendContainer.innerHTML = "";
    }
    return;
  }

  const rows = getDisplayRows(scenario, chartMode);

  const planned = rows.map((row) => toFiniteNumber(row?.targetSpending));
  const actual = rows.map((row) => {
    if (guardrails === "on") {
      return toFiniteNumber(row?.actualSpending);
    }
    return toFiniteNumber(row?.targetSpending);
  });

  const pension = rows.map((row) => toFiniteNumber(row?.statePension));
  const otherIncome = rows.map((row) => toFiniteNumber(row?.otherIncome));
  const withdrawals = rows.map((row) => toFiniteNumber(row?.portfolioWithdrawal));
  const shortfall = rows.map((row) => toFiniteNumber(row?.shortfall));

  renderLayeredChart({
    container,
    ariaLabel: "Spending path",
    areas: [
      {
        values: actual,
        baseline: 0,
        className: "results-svg-area--actual"
      },
      {
        values: pension,
        baseline: 0,
        className: "results-svg-area--pension"
      }
    ],
    lines: [
      {
        values: planned,
        className: "results-svg-line--planned",
        startYear: scenario?.startYear
      },
      {
        values: actual,
        className: "results-svg-line--actual",
        startYear: scenario?.startYear
      },
      {
        values: pension,
        className: "results-svg-line--pension",
        startYear: scenario?.startYear
      },
      {
        values: otherIncome,
        className: "results-svg-line--income",
        startYear: scenario?.startYear
      },
      {
        values: withdrawals,
        className: "results-svg-line--withdrawal",
        startYear: scenario?.startYear
      },
      {
        values: shortfall,
        className: "results-svg-line--shortfall",
        startYear: scenario?.startYear
      }
    ],
    annotations: getPensionStartAnnotations(rows),
    minOverride: 0
  });

  if (legendContainer) {
    legendContainer.innerHTML = buildLegendMarkup([
      {
        className: "results-inline-legend-line--planned",
        label: "Planned spending"
      },
      {
        className: "results-inline-legend-line--actual",
        label: "Actual spending"
      },
      {
        className: "results-inline-legend-line--pension",
        label: "State pension"
      },
      {
        className: "results-inline-legend-line--income",
        label: "Other income"
      },
      {
        className: "results-inline-legend-line--withdrawal",
        label: "Portfolio withdrawals"
      },
      {
        className: "results-inline-legend-line--shortfall",
        label: "Shortfall"
      }
    ]);
  }
}