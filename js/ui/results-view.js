function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(toFiniteNumber(value));
}

function formatPercent(value, digits = 0) {
  return `${toFiniteNumber(value).toFixed(digits)}%`;
}

function sumBy(rows, selector) {
  return rows.reduce((total, row, index) => total + toFiniteNumber(selector(row, index)), 0);
}

function countBy(rows, predicate) {
  return rows.reduce((count, row, index) => count + (predicate(row, index) ? 1 : 0), 0);
}

function getLastRow(rows) {
  return Array.isArray(rows) && rows.length > 0 ? rows[rows.length - 1] : null;
}

function getFirstMatchingRow(rows, predicate) {
  return Array.isArray(rows) ? rows.find(predicate) ?? null : null;
}

function getMinimumEndPortfolio(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  return rows.reduce((minimum, row) => {
    return Math.min(minimum, toFiniteNumber(row?.endPortfolio));
  }, toFiniteNumber(rows[0]?.endPortfolio));
}

function getDepletionYearFromRows(rows) {
  const row = getFirstMatchingRow(rows, (item) => Boolean(item?.depleted));
  return row?.year ?? null;
}

function getScenarioTerminalNominal(scenario) {
  return toFiniteNumber(
    scenario?.terminalNominal ??
      getLastRow(scenario?.yearlyRows ?? [])?.endPortfolio ??
      getLastRow(scenario?.pathNominal ?? []) ??
      0
  );
}

function getScenarioTerminalReal(scenario) {
  return toFiniteNumber(
    scenario?.terminalReal ??
      getLastRow(scenario?.pathReal ?? []) ??
      0
  );
}

function getScenarioMinimumWealth(scenario) {
  if (scenario?.minimumWealth != null) {
    return toFiniteNumber(scenario.minimumWealth);
  }

  return getMinimumEndPortfolio(scenario?.yearlyRows ?? []);
}

function getScenarioDepletionYear(scenario) {
  if (scenario?.depletionYear != null) {
    return scenario.depletionYear;
  }

  return getDepletionYearFromRows(scenario?.yearlyRows ?? []);
}

function safeRatioPercent(numerator, denominator) {
  const top = toFiniteNumber(numerator);
  const bottom = toFiniteNumber(denominator);

  if (!bottom) {
    return 0;
  }

  return (top / bottom) * 100;
}

function getComfortFloorYears(rows, threshold = 0.9) {
  return countBy(rows, (row) => {
    const target = toFiniteNumber(row?.targetSpending);
    const actual = toFiniteNumber(row?.actualSpending);

    return target > 0 && actual < target * threshold;
  });
}

function getWorstCut(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  return rows.reduce((worst, row) => Math.max(worst, toFiniteNumber(row?.cut)), 0);
}

function getCutsCount(rows) {
  return countBy(rows, (row) => toFiniteNumber(row?.cut) > 0);
}

function getShortfallYears(rows) {
  return countBy(rows, (row) => toFiniteNumber(row?.shortfall) > 0);
}

function getFirstCutYear(rows) {
  return getFirstMatchingRow(rows, (row) => toFiniteNumber(row?.cut) > 0)?.year ?? null;
}

function getSingleScenarioMetrics(summary, scenario) {
  const rows = scenario?.yearlyRows ?? [];
  const firstRow = rows[0] ?? null;

  const totalWithdrawals = sumBy(rows, (row) => row?.portfolioWithdrawal);
  const totalNonPortfolioIncome = sumBy(
    rows,
    (row) => toFiniteNumber(row?.statePension) + toFiniteNumber(row?.otherIncome) + toFiniteNumber(row?.windfall)
  );

  const terminalNominal = toFiniteNumber(summary?.terminalNominal ?? getScenarioTerminalNominal(scenario));
  const minimumWealth = toFiniteNumber(summary?.minimumWealth ?? getScenarioMinimumWealth(scenario));
  const depleted = Boolean(summary?.depleted ?? scenario?.depleted);
  const depletionYear = summary?.depletionYear ?? getScenarioDepletionYear(scenario);

  const initialPortfolio = toFiniteNumber(firstRow?.startPortfolio);
  const initialWithdrawal = toFiniteNumber(firstRow?.portfolioWithdrawal);

  return {
    terminalNominal,
    minimumWealth,
    depleted,
    depletionYear,
    totalWithdrawals,
    totalNonPortfolioIncome,
    cutsApplied: getCutsCount(rows),
    firstCutYear: getFirstCutYear(rows),
    worstCut: getWorstCut(rows),
    shortfallYears: getShortfallYears(rows),
    yearsBelowComfortFloor: getComfortFloorYears(rows, 0.9),
    initialWithdrawalRate: safeRatioPercent(initialWithdrawal, initialPortfolio),
    portfolioDependence: safeRatioPercent(
      totalWithdrawals,
      totalWithdrawals + totalNonPortfolioIncome
    )
  };
}

function getMultiScenarioMetrics(summary, scenarios) {
  const allScenarios = Array.isArray(scenarios) ? scenarios : [];

  const enriched = allScenarios.map((scenario) => ({
    scenario,
    terminalNominal: getScenarioTerminalNominal(scenario),
    terminalReal: getScenarioTerminalReal(scenario),
    minimumWealth: getScenarioMinimumWealth(scenario),
    depletionYear: getScenarioDepletionYear(scenario),
    depleted: Boolean(scenario?.depleted)
  }));

  const depletedScenarios = enriched.filter((item) => item.depleted);

  const worstScenario = enriched.reduce((worst, item) => {
    if (!worst || item.terminalNominal < worst.terminalNominal) {
      return item;
    }
    return worst;
  }, null);

  const bestScenario = enriched.reduce((best, item) => {
    if (!best || item.terminalNominal > best.terminalNominal) {
      return item;
    }
    return best;
  }, null);

  const weakCaseScenario =
    enriched
      .slice()
      .sort((left, right) => left.terminalNominal - right.terminalNominal)[
      Math.max(0, Math.floor((enriched.length - 1) * 0.1))
    ] ?? null;

  const scenarioCount = toFiniteNumber(summary?.scenarioCount ?? enriched.length);
  const successRate = toFiniteNumber(summary?.successRate);
  const medianTerminalWealth = toFiniteNumber(summary?.medianTerminalWealth);
  const p10TerminalWealth = toFiniteNumber(summary?.p10TerminalWealth);
  const p90TerminalWealth = toFiniteNumber(summary?.p90TerminalWealth);

  return {
    scenarioCount,
    successRate,
    medianTerminalWealth,
    p10TerminalWealth,
    p90TerminalWealth,
    depletedCount: depletedScenarios.length,
    depletedShare: safeRatioPercent(depletedScenarios.length, scenarioCount),
    downsideSpread: medianTerminalWealth - p10TerminalWealth,
    weakCaseDepletionYear: weakCaseScenario?.depletionYear ?? null,
    worstStartYear: worstScenario?.scenario?.startYear ?? null,
    bestStartYear: bestScenario?.scenario?.startYear ?? null,
    worstTerminalOutcome: worstScenario?.terminalNominal ?? 0
  };
}

function getSingleWarning(metrics) {
  if (metrics.depleted) {
    return {
      tone: "risk",
      label: "Risk",
      text: `This selected path depletes in ${metrics.depletionYear}, so the current spending pattern does not last the full horizon.`
    };
  }

  if (metrics.shortfallYears > 0 || metrics.yearsBelowComfortFloor >= 3 || metrics.worstCut >= 15) {
    return {
      tone: "watch",
      label: "Watch",
      text: "This selected path survives, but it does so with noticeable spending pressure and should be watched closely."
    };
  }

  return {
    tone: "strong",
    label: "No major risks",
    text: "This selected path stays intact without material spending stress under the current assumptions."
  };
}

function getMultiWarning(metrics) {
  if (metrics.successRate < 70 || metrics.depletedShare > 30) {
    return {
      tone: "risk",
      label: "Risk",
      text: "A meaningful share of historical paths fail, which suggests the plan is vulnerable to poor sequence risk."
    };
  }

  if (metrics.successRate < 90 || metrics.p10TerminalWealth <= 0) {
    return {
      tone: "watch",
      label: "Watch",
      text: "The plan is workable in many paths, but the weak case is thin enough to deserve attention."
    };
  }

  return {
    tone: "strong",
    label: "No major risks",
    text: "Historical coverage looks resilient across most tested scenarios, with no major weakness standing out."
  };
}

function getSingleHeadline(metrics) {
  if (metrics.depleted) {
    return {
      tone: "risk",
      badge: "Risk",
      title: "This selected path runs out of money before the plan ends.",
      text: `Depletion occurs in ${metrics.depletionYear}, with spending pressure building before that point.`
    };
  }

  if (metrics.shortfallYears > 0 || metrics.cutsApplied >= 3 || metrics.yearsBelowComfortFloor >= 3) {
    return {
      tone: "watch",
      badge: "Watch",
      title: "This selected path holds together, but only with visible spending pressure.",
      text: "Guardrail-driven spending changes appear to be doing real work in keeping the plan on track."
    };
  }

  return {
    tone: "strong",
    badge: "Strong",
    title: "This selected path remains stable under the current assumptions.",
    text: "Spending is broadly maintained and the plan does not show material stress in this historical path."
  };
}

function getMultiHeadline(metrics) {
  if (metrics.successRate < 70 || metrics.p10TerminalWealth <= 0) {
    return {
      tone: "risk",
      badge: "Risk",
      title: "The plan is vulnerable across the historical range tested.",
      text: "Weak-case outcomes are poor enough that this plan likely needs either lower withdrawals or more flexibility."
    };
  }

  if (metrics.successRate < 90 || metrics.depletedCount > 0) {
    return {
      tone: "watch",
      badge: "Watch",
      title: "The plan is broadly workable, but the downside tail is not fully comfortable.",
      text: "Most scenarios survive, though weaker start years produce materially worse outcomes than the middle case."
    };
  }

  return {
    tone: "strong",
    badge: "Strong",
    title: "The plan looks resilient across the historical scenarios tested.",
    text: "Most paths remain intact and the weak case stays meaningfully above depletion."
  };
}

function createMetricTile(label, value, hint = "") {
  return `
    <article class="insight-metric-card">
      <div class="insight-metric-label">${label}</div>
      <div class="insight-metric-value">${value}</div>
      ${hint ? `<div class="insight-metric-hint">${hint}</div>` : ""}
    </article>
  `;
}

function createMetricGroup(title, items) {
  return `
    <section class="insight-group">
      <div class="insight-group-title">${title}</div>
      <div class="insight-metric-grid">
        ${items.join("")}
      </div>
    </section>
  `;
}

function renderWarningsBlock(warning) {
  return `
    <section class="plan-warnings plan-warnings--${warning.tone}">
      <div class="plan-warnings-header">
        <div class="plan-warnings-title">Plan warnings</div>
        <span class="plan-warnings-chip">${warning.label}</span>
      </div>
      <p class="plan-warnings-text">${warning.text}</p>
    </section>
  `;
}

function renderLegendRow() {
  return `
    <div class="plan-outlook-legend" aria-label="Outlook legend">
      <div class="plan-outlook-legend-item">
        <span class="plan-outlook-dot plan-outlook-dot--strong"></span>
        <span class="plan-outlook-legend-label">Strong</span>
        <span class="plan-outlook-legend-text">Resilient under current assumptions</span>
      </div>
      <div class="plan-outlook-legend-item">
        <span class="plan-outlook-dot plan-outlook-dot--watch"></span>
        <span class="plan-outlook-legend-label">Watch</span>
        <span class="plan-outlook-legend-text">Viable, but pressure points matter</span>
      </div>
      <div class="plan-outlook-legend-item">
        <span class="plan-outlook-dot plan-outlook-dot--risk"></span>
        <span class="plan-outlook-legend-label">Risk</span>
        <span class="plan-outlook-legend-text">Vulnerable to cuts, shortfalls, or depletion</span>
      </div>
    </div>
  `;
}

function renderHeadlineCard(headline) {
  return `
    <section class="plan-headline-card plan-headline-card--${headline.tone}">
      <div class="plan-headline-top">
        <span class="plan-headline-badge">${headline.badge}</span>
      </div>
      <h3 class="plan-headline-title">${headline.title}</h3>
      <p class="plan-headline-text">${headline.text}</p>
    </section>
  `;
}

function getSingleChartStats(summary, scenario) {
  return [
    {
      label: "Start year",
      value: String(scenario?.startYear ?? "—")
    },
    {
      label: "End year",
      value: String(scenario?.endYear ?? "—")
    },
    {
      label: "Ending portfolio",
      value: formatCurrency(summary?.terminalNominal ?? getScenarioTerminalNominal(scenario))
    },
    {
      label: "Minimum value",
      value: formatCurrency(summary?.minimumWealth ?? getScenarioMinimumWealth(scenario))
    }
  ];
}

function getMultiChartStats(summary) {
  return [
    {
      label: "10th percentile",
      value: formatCurrency(summary?.p10TerminalWealth)
    },
    {
      label: "Median",
      value: formatCurrency(summary?.medianTerminalWealth)
    },
    {
      label: "90th percentile",
      value: formatCurrency(summary?.p90TerminalWealth)
    },
    {
      label: "Success rate",
      value: formatPercent(summary?.successRate, 1)
    }
  ];
}

function getSingleSpendingStats(scenario) {
  const rows = scenario?.yearlyRows ?? [];

  return [
    {
      label: "State pension",
      value: formatCurrency(sumBy(rows, (row) => row?.statePension))
    },
    {
      label: "Other income",
      value: formatCurrency(sumBy(rows, (row) => toFiniteNumber(row?.otherIncome) + toFiniteNumber(row?.windfall)))
    },
    {
      label: "Withdrawals",
      value: formatCurrency(sumBy(rows, (row) => row?.portfolioWithdrawal))
    },
    {
      label: "Shortfall years",
      value: String(countBy(rows, (row) => toFiniteNumber(row?.shortfall) > 0))
    }
  ];
}

function getMultiSpendingStats(summary, scenarios) {
  const scenarioCount = toFiniteNumber(summary?.scenarioCount ?? scenarios?.length ?? 0);
  const successRate = toFiniteNumber(summary?.successRate);
  const depletedCount = Math.max(0, Math.round(scenarioCount * (1 - successRate / 100)));

  return [
    {
      label: "Success rate",
      value: formatPercent(successRate, 1)
    },
    {
      label: "Scenarios",
      value: String(scenarioCount)
    },
    {
      label: "Depleted",
      value: String(depletedCount)
    },
    {
      label: "Weak case ending",
      value: formatCurrency(summary?.p10TerminalWealth)
    }
  ];
}

function renderStatRow(items) {
  return `
    <div class="results-stat-row">
      ${items
        .map(
          (item) => `
            <article class="results-stat-card">
              <div class="results-stat-label">${item.label}</div>
              <div class="results-stat-value">${item.value}</div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderModeNote(uiState) {
  const chartMode = uiState?.chartMode ?? "nominal";
  const guardrails = uiState?.guardrails ?? "on";

  const chartModeCopy =
    chartMode === "real"
      ? [
          "Real removes inflation so everything is shown in today’s spending power.",
          "That is usually the better planning view because it makes spending pressure easier to compare over time."
        ]
      : [
          "Nominal shows the future pound amounts you would actually see at the time.",
          "Use real when you want the cleaner planning view. Use nominal when you want to see future cash amounts."
        ];

  const guardrailCopy =
    guardrails === "on"
      ? "Guardrails view highlights spending after adjustments where those adjusted series exist."
      : "Guardrails off is a display view. It removes the adjusted-spending emphasis, but it does not rerun a separate no-guardrails simulation.";

  return `
    <div class="results-context-note">
      <p>${chartModeCopy[0]}</p>
      <p>${chartModeCopy[1]}</p>
      <p>${guardrailCopy}</p>
    </div>
  `;
}

function renderSegmentButton({ value, label, selectedValue, action }) {
  const isActive = value === selectedValue;

  return `
    <button
      type="button"
      class="results-segment-button${isActive ? " is-active" : ""}"
      data-action="${action}"
      data-value="${value}"
      aria-pressed="${isActive ? "true" : "false"}"
    >
      ${label}
    </button>
  `;
}

function renderToolbar(uiState) {
  return `
    <div class="results-toolbar">
      <div class="results-toolbar-group">
        <div class="results-toolbar-label">Chart mode</div>
        <div class="results-segmented-control" role="group" aria-label="Chart mode">
          ${renderSegmentButton({
            value: "nominal",
            label: "Nominal",
            selectedValue: uiState?.chartMode ?? "nominal",
            action: "set-chart-mode"
          })}
          ${renderSegmentButton({
            value: "real",
            label: "Real",
            selectedValue: uiState?.chartMode ?? "nominal",
            action: "set-chart-mode"
          })}
        </div>
      </div>

      <div class="results-toolbar-group">
        <div class="results-toolbar-label">Guardrails</div>
        <div class="results-segmented-control" role="group" aria-label="Guardrails">
          ${renderSegmentButton({
            value: "on",
            label: "On",
            selectedValue: uiState?.guardrails ?? "on",
            action: "set-guardrails"
          })}
          ${renderSegmentButton({
            value: "off",
            label: "Off",
            selectedValue: uiState?.guardrails ?? "on",
            action: "set-guardrails"
          })}
        </div>
      </div>

      <label class="results-checkbox-pill">
        <input
          type="checkbox"
          data-action="toggle-yearly-table"
          ${(uiState?.showYearlyTable ?? true) ? "checked" : ""}
        />
        <span>Show full yearly table</span>
      </label>
    </div>
  `;
}

function renderResultsHeader(container, uiState) {
  if (!container) {
    return;
  }

  container.innerHTML = `
    <section class="results-header-card">
      <div class="results-header-top">
        <h2 class="results-title">Results</h2>
        <p class="results-subtitle">
          Charts and yearly outputs from the current simulation, including the effect of guardrails where enabled.
        </p>
      </div>
      ${renderToolbar(uiState)}
      ${renderModeNote(uiState)}
    </section>
  `;
}

function renderInvestmentPanel({ summary, scenarios, isSingleScenario }) {
  const scenario = isSingleScenario ? scenarios?.[0] ?? null : null;
  const stats = isSingleScenario ? getSingleChartStats(summary, scenario) : getMultiChartStats(summary);

  return `
    <section class="results-panel">
      <div class="results-panel-header">
        <h3 class="results-panel-title">Investment projection</h3>
        <p class="results-panel-subtitle">
          Shows the central outcome, the likely range of outcomes, and the selected path.
        </p>
      </div>

      <div id="investmentProjectionChart" class="results-chart-slot"></div>
      <div id="investmentProjectionLegend" class="results-legend-slot"></div>

      ${renderStatRow(stats)}
    </section>
  `;
}

function renderSpendingPanel({ summary, scenarios, isSingleScenario }) {
  const scenario = isSingleScenario ? scenarios?.[0] ?? null : null;
  const stats = isSingleScenario ? getSingleSpendingStats(scenario) : getMultiSpendingStats(summary, scenarios);

  return `
    <section class="results-panel">
      <div class="results-panel-header">
        <h3 class="results-panel-title">Spending path</h3>
        <p class="results-panel-subtitle">
          Shows spending, pension income, other income, withdrawals, and any shortfall pressure.
        </p>
      </div>

      <div id="spendingPathChart" class="results-chart-slot"></div>
      <div id="spendingPathLegend" class="results-legend-slot"></div>

      ${renderStatRow(stats)}
    </section>
  `;
}

function renderSingleModeGroups(summary, scenario) {
  const metrics = getSingleScenarioMetrics(summary, scenario);

  return {
    warning: getSingleWarning(metrics),
    headline: getSingleHeadline(metrics),
    groups: [
      createMetricGroup("Outcome summary", [
        createMetricTile("End portfolio", formatCurrency(metrics.terminalNominal), "Value at end of selected path"),
        createMetricTile("Depletion", metrics.depleted ? String(metrics.depletionYear) : "Not depleted", metrics.depleted ? "First year of exhaustion" : "Plan survived"),
        createMetricTile("Minimum portfolio", formatCurrency(metrics.minimumWealth), "Lowest point reached")
      ]),
      createMetricGroup("Lifestyle resilience", [
        createMetricTile("Years with cuts", String(metrics.cutsApplied), metrics.cutsApplied ? "Guardrails reduced spending" : "No spending cuts"),
        createMetricTile("Worst cut", formatPercent(metrics.worstCut, 0), "Largest single-year reduction"),
        createMetricTile("Years with shortfall", String(metrics.shortfallYears), metrics.shortfallYears ? "Target spending not fully met" : "No shortfall years")
      ]),
      createMetricGroup("Income support", [
        createMetricTile("Non-portfolio income", formatCurrency(metrics.totalNonPortfolioIncome), "State pension, other income, and windfalls"),
        createMetricTile("Total withdrawals", formatCurrency(metrics.totalWithdrawals), "Taken from invested assets"),
        createMetricTile("Portfolio dependence", formatPercent(metrics.portfolioDependence, 0), "Share of funding from withdrawals")
      ]),
      createMetricGroup("Spending stability", [
        createMetricTile("Initial withdrawal rate", formatPercent(metrics.initialWithdrawalRate, 1), "Year 1 only"),
        createMetricTile("Years below comfort floor", String(metrics.yearsBelowComfortFloor), "Actual spending below 90% of target"),
        createMetricTile("First cut year", metrics.firstCutYear ? String(metrics.firstCutYear) : "None", metrics.firstCutYear ? "First guardrail reduction" : "No cuts applied")
      ])
    ]
  };
}

function renderMultiModeGroups(summary, scenarios) {
  const metrics = getMultiScenarioMetrics(summary, scenarios);

  return {
    warning: getMultiWarning(metrics),
    headline: getMultiHeadline(metrics),
    groups: [
      createMetricGroup("Outcome summary", [
        createMetricTile("Plan success", formatPercent(metrics.successRate, 1), "Share of scenarios that avoid depletion"),
        createMetricTile("Median ending portfolio", formatCurrency(metrics.medianTerminalWealth), "Middle historical outcome"),
        createMetricTile("Weak-case ending portfolio", formatCurrency(metrics.p10TerminalWealth), "10th percentile outcome")
      ]),
      createMetricGroup("Downside resilience", [
        createMetricTile("Depleted scenarios", String(metrics.depletedCount), "Count of failed historical paths"),
        createMetricTile("Weak-case depletion", metrics.weakCaseDepletionYear ? String(metrics.weakCaseDepletionYear) : "None", metrics.weakCaseDepletionYear ? "Weak case depletes" : "Weak case still survives"),
        createMetricTile("Downside spread", formatCurrency(metrics.downsideSpread), "Gap between median and weak case")
      ]),
      createMetricGroup("Range of outcomes", [
        createMetricTile("Upside ending portfolio", formatCurrency(metrics.p90TerminalWealth), "90th percentile outcome"),
        createMetricTile("Worst start year", metrics.worstStartYear ? String(metrics.worstStartYear) : "—", "Lowest terminal outcome"),
        createMetricTile("Best start year", metrics.bestStartYear ? String(metrics.bestStartYear) : "—", "Highest terminal outcome")
      ]),
      createMetricGroup("Plan breadth", [
        createMetricTile("Scenario count", String(metrics.scenarioCount), "Historical windows tested"),
        createMetricTile("Share depleted", formatPercent(metrics.depletedShare, 1), "Fraction of paths that fail"),
        createMetricTile("Worst terminal outcome", formatCurrency(metrics.worstTerminalOutcome), "Most adverse end state")
      ])
    ]
  };
}

function renderPlanInsights({ container, summary, scenarios }) {
  if (!container) {
    return;
  }

  const isSingleScenario = summary?.type === "single-scenario" || summary?.type === "single";
  const selectedScenario = isSingleScenario ? scenarios?.[0] ?? null : null;

  const content = isSingleScenario
    ? renderSingleModeGroups(summary, selectedScenario)
    : renderMultiModeGroups(summary, scenarios);

  const description = isSingleScenario
    ? "Interpretation for the currently selected path."
    : "Interpretation across the full historical range tested.";

  container.innerHTML = `
    <div class="plan-insights-wrap">
      ${renderWarningsBlock(content.warning)}

      <section class="plan-outlook-card">
        <div class="plan-outlook-header">
          <div>
            <h2 class="plan-outlook-title">Plan outlook</h2>
            <p class="plan-outlook-description">${description}</p>
          </div>
          <button class="plan-outlook-button" type="button" disabled aria-disabled="true">
            Explain these terms
          </button>
        </div>

        ${renderLegendRow()}
        ${renderHeadlineCard(content.headline)}

        <div class="plan-insights-groups">
          ${content.groups.join("")}
        </div>
      </section>
    </div>
  `;
}

export function renderResultsDashboard({
  summaryContainer,
  dashboardContainer,
  summary,
  scenarios = [],
  uiState
}) {
  if (!summaryContainer || !dashboardContainer) {
    return;
  }

  const isSingleScenario = summary?.type === "single-scenario" || summary?.type === "single";

  renderResultsHeader(summaryContainer, uiState);

  dashboardContainer.innerHTML = `
    <section class="results-chart-grid">
      ${renderInvestmentPanel({ summary, scenarios, isSingleScenario })}
      ${renderSpendingPanel({ summary, scenarios, isSingleScenario })}
    </section>
    <div id="planInsights"></div>
  `;

  renderPlanInsights({
    container: dashboardContainer.querySelector("#planInsights"),
    summary,
    scenarios
  });
}

export function bindResultsDashboardEvents(container, handlers = {}) {
  if (!container) {
    return;
  }

  const actionButtons = container.querySelectorAll("[data-action='set-chart-mode'], [data-action='set-guardrails']");
  const yearlyToggle = container.querySelector("[data-action='toggle-yearly-table']");

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-action");
      const value = button.getAttribute("data-value");

      if (action === "set-chart-mode") {
        handlers.onChartModeChange?.(value);
        return;
      }

      if (action === "set-guardrails") {
        handlers.onGuardrailsChange?.(value);
      }
    });
  });

  if (yearlyToggle) {
    yearlyToggle.addEventListener("change", () => {
      handlers.onToggleYearlyTable?.(Boolean(yearlyToggle.checked));
    });
  }
}