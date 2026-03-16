function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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

  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  const lowerValue = sortedValues[lowerIndex];
  const upperValue = sortedValues[upperIndex];
  const weight = index - lowerIndex;

  return lowerValue + (upperValue - lowerValue) * weight;
}

function formatCurrencyCompact(value) {
  const number = toFiniteNumber(value);

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(number);
}

function getScenarioPath(scenario, mode) {
  if (!scenario || !scenario.result) {
    return null;
  }

  const pathKey = mode === "nominal" ? "pathNominal" : "pathReal";
  const path = scenario.result[pathKey];

  return Array.isArray(path) && path.length > 0 ? path : null;
}

function buildPercentilePaths(scenarios, mode) {
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    return [];
  }

  const validPaths = scenarios
    .map((scenario) => getScenarioPath(scenario, mode))
    .filter((path) => Array.isArray(path) && path.length > 0);

  if (validPaths.length === 0) {
    return [];
  }

  const pointCount = Math.max(...validPaths.map((path) => path.length));
  const rows = [];

  for (let index = 0; index < pointCount; index += 1) {
    const valuesAtIndex = validPaths
      .map((path) => toFiniteNumber(path[index]))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

    rows.push({
      year: index + 1,
      p10: percentileFromSorted(valuesAtIndex, 10),
      p50: percentileFromSorted(valuesAtIndex, 50),
      p90: percentileFromSorted(valuesAtIndex, 90)
    });
  }

  return rows;
}

function buildLinePath(values, xScale, yScale) {
  return values
    .map((value, index) => {
      const x = xScale(index);
      const y = yScale(value);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function buildBandPath(upperValues, lowerValues, xScale, yScale) {
  const upperPath = upperValues
    .map((value, index) => {
      const x = xScale(index);
      const y = yScale(value);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const lowerPath = [...lowerValues]
    .reverse()
    .map((value, reverseIndex) => {
      const index = lowerValues.length - 1 - reverseIndex;
      const x = xScale(index);
      const y = yScale(value);
      return `L ${x} ${y}`;
    })
    .join(" ");

  return `${upperPath} ${lowerPath} Z`;
}

function createSvgElement(tagName) {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}

function createToggleButton(label, mode, activeMode, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `chart-toggle-button${mode === activeMode ? " is-active" : ""}`;
  button.textContent = label;
  button.setAttribute("aria-pressed", String(mode === activeMode));
  button.addEventListener("click", () => onClick(mode));
  return button;
}

function createChartSvg(percentileRows, mode) {
  const width = 980;
  const height = 420;
  const margin = { top: 24, right: 24, bottom: 48, left: 72 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const p10Values = percentileRows.map((row) => row.p10);
  const p50Values = percentileRows.map((row) => row.p50);
  const p90Values = percentileRows.map((row) => row.p90);

  const allValues = [...p10Values, ...p50Values, ...p90Values];
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, 1);
  const yMin = minValue;
  const yMax = maxValue === yMin ? yMin + 1 : maxValue;

  const xScale = (index) => {
    if (percentileRows.length === 1) {
      return margin.left + innerWidth / 2;
    }

    return margin.left + (index / (percentileRows.length - 1)) * innerWidth;
  };

  const yScale = (value) => {
    const ratio = (value - yMin) / (yMax - yMin);
    return margin.top + innerHeight - ratio * innerHeight;
  };

  const svg = createSvgElement("svg");
  svg.setAttribute("class", "historical-chart");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    `Historical ${mode} portfolio paths showing 10th percentile, median, and 90th percentile outcomes.`
  );

  const yTicks = 5;
  for (let tick = 0; tick <= yTicks; tick += 1) {
    const value = yMin + ((yMax - yMin) / yTicks) * tick;
    const y = yScale(value);

    const line = createSvgElement("line");
    line.setAttribute("x1", String(margin.left));
    line.setAttribute("x2", String(width - margin.right));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("class", "chart-grid-line");
    svg.appendChild(line);

    const label = createSvgElement("text");
    label.setAttribute("x", String(margin.left - 12));
    label.setAttribute("y", String(y + 4));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "chart-axis-label");
    label.textContent = formatCurrencyCompact(value);
    svg.appendChild(label);
  }

  const xTickIndexes = [0];
  if (percentileRows.length > 2) {
    xTickIndexes.push(Math.floor((percentileRows.length - 1) / 2));
  }
  if (percentileRows.length > 1) {
    xTickIndexes.push(percentileRows.length - 1);
  }

  [...new Set(xTickIndexes)].forEach((index) => {
    const x = xScale(index);

    const label = createSvgElement("text");
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(height - 14));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "chart-axis-label");
    label.textContent = `Year ${index + 1}`;
    svg.appendChild(label);
  });

  const axisX = createSvgElement("line");
  axisX.setAttribute("x1", String(margin.left));
  axisX.setAttribute("x2", String(width - margin.right));
  axisX.setAttribute("y1", String(height - margin.bottom));
  axisX.setAttribute("y2", String(height - margin.bottom));
  axisX.setAttribute("class", "chart-axis-line");
  svg.appendChild(axisX);

  const axisY = createSvgElement("line");
  axisY.setAttribute("x1", String(margin.left));
  axisY.setAttribute("x2", String(margin.left));
  axisY.setAttribute("y1", String(margin.top));
  axisY.setAttribute("y2", String(height - margin.bottom));
  axisY.setAttribute("class", "chart-axis-line");
  svg.appendChild(axisY);

  const bandPath = createSvgElement("path");
  bandPath.setAttribute(
    "d",
    buildBandPath(p90Values, p10Values, xScale, yScale)
  );
  bandPath.setAttribute("class", "chart-band");
  svg.appendChild(bandPath);

  const p90Path = createSvgElement("path");
  p90Path.setAttribute("d", buildLinePath(p90Values, xScale, yScale));
  p90Path.setAttribute("class", "chart-line chart-line-p90");
  svg.appendChild(p90Path);

  const p50Path = createSvgElement("path");
  p50Path.setAttribute("d", buildLinePath(p50Values, xScale, yScale));
  p50Path.setAttribute("class", "chart-line chart-line-p50");
  svg.appendChild(p50Path);

  const p10Path = createSvgElement("path");
  p10Path.setAttribute("d", buildLinePath(p10Values, xScale, yScale));
  p10Path.setAttribute("class", "chart-line chart-line-p10");
  svg.appendChild(p10Path);

  return svg;
}

export function renderHistoricalChart({ container, scenarios }) {
  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    return;
  }

  const section = document.createElement("section");
  section.className = "chart-section";

  const header = document.createElement("div");
  header.className = "chart-header";

  const titleBlock = document.createElement("div");

  const heading = document.createElement("h2");
  heading.className = "chart-title";
  heading.textContent = "Historical portfolio paths";

  const subheading = document.createElement("p");
  subheading.className = "chart-subtitle";
  subheading.textContent =
    "10th percentile, median, and 90th percentile portfolio values across all historical rolling windows.";

  titleBlock.append(heading, subheading);

  const toggle = document.createElement("div");
  toggle.className = "chart-toggle";
  toggle.setAttribute("role", "group");
  toggle.setAttribute("aria-label", "Chart value mode");

  const legend = document.createElement("div");
  legend.className = "chart-legend";

  const legendItems = [
    { label: "90th percentile", className: "is-p90" },
    { label: "Median", className: "is-p50" },
    { label: "10th percentile", className: "is-p10" }
  ];

  legendItems.forEach((item) => {
    const legendItem = document.createElement("div");
    legendItem.className = `chart-legend-item ${item.className}`;

    const swatch = document.createElement("span");
    swatch.className = "chart-legend-swatch";

    const label = document.createElement("span");
    label.textContent = item.label;

    legendItem.append(swatch, label);
    legend.appendChild(legendItem);
  });

  const chartWrapper = document.createElement("div");
  chartWrapper.className = "chart-wrapper";

  let activeMode = "real";

  function drawChart(mode) {
    activeMode = mode;

    const percentileRows = buildPercentilePaths(scenarios, mode);
    chartWrapper.innerHTML = "";

    if (percentileRows.length === 0) {
      return;
    }

    chartWrapper.appendChild(createChartSvg(percentileRows, mode));

    toggle.innerHTML = "";
    toggle.append(
      createToggleButton("Real", "real", activeMode, drawChart),
      createToggleButton("Nominal", "nominal", activeMode, drawChart)
    );

    subheading.textContent =
      mode === "nominal"
        ? "10th percentile, median, and 90th percentile nominal portfolio values across all historical rolling windows."
        : "10th percentile, median, and 90th percentile real portfolio values across all historical rolling windows.";
  }

  header.append(titleBlock, toggle);
  section.append(header, legend, chartWrapper);
  container.appendChild(section);

  drawChart(activeMode);
}