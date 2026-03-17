function formatCurrency(value) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatPercent(value, digits = 0) {
  const amount = Number(value ?? 0);

  return `${amount.toFixed(digits)}%`;
}

function formatSignedPercent(value, digits = 0) {
  const amount = Number(value ?? 0);
  const sign = amount > 0 ? "+" : "";
  return `${sign}${amount.toFixed(digits)}%`;
}

function sumBy(rows, selector) {
  return rows.reduce((total, row) => total + Number(selector(row) ?? 0), 0);
}

function countBy(rows, predicate) {
  return rows.reduce((count, row) => count + (predicate(row) ? 1 : 0), 0);
}

function getFirstMatchingRow(rows, predicate) {
  return rows.find(predicate) ?? null;
}

function getLastRow(rows) {
  return rows.length ? rows[rows.length - 1] : null;
}

function getMinimumEndPortfolio(rows) {
  if (!rows.length) {
    return 0;
  }

  return rows.reduce((minValue, row) => {
    const endPortfolio = Number(row.endPortfolio ?? 0);
    return Math.min(minValue, endPortfolio);
  }, Number(rows[0].endPortfolio ?? 0));
}

function safeRatio(numerator, denominator) {
  const top = Number(numerator ?? 0);
  const bottom = Number(denominator ?? 0);

  if (!bottom) {
    return 0;
  }

  return (top / bottom) * 100;
}

function getComfortFloorYears(rows, threshold = 0.9) {
  return countBy(rows, (row) => {
    const target = Number(row.targetSpending ?? 0);
    const actual = Number(row.actualSpending ?? 0);

    if (target <= 0) {
      return false;
    }

    return actual < target * threshold;
  });
}

function getWorstCut(rows) {
  if (!rows.length) {
    return 0;
  }

  return rows.reduce((worst, row) => {
    const cut = Number(row.cut ?? 0);
    return Math.max(worst, cut);
  }, 0);
}

function getCutsCount(rows) {
  return countBy(rows, (row) => Number(row.cut ?? 0) > 0);
}

function getShortfallYears(rows) {
  return countBy(rows, (row) => Number(row.shortfall ?? 0) > 0);
}

function getFirstCutYear(rows) {
  const row = getFirstMatchingRow(rows, (item) => Number(item.cut ?? 0) > 0);
  return row ? row.year : null;
}

function getDepletionYearFromRows(rows) {
  const row = getFirstMatchingRow(rows, (item) => Boolean(item.depleted));
  return row ? row.year : null;
}

function getScenarioTerminalNominal(scenario) {
  return Number(
    scenario?.terminalNominal ??
      getLastRow(scenario?.yearlyRows ?? [])?.endPortfolio ??
      0
  );
}

function getScenarioMinimumWealth(scenario) {
  if (scenario?.minimumWealth != null) {
    return Number(scenario.minimumWealth);
  }

  return getMinimumEndPortfolio(scenario?.yearlyRows ?? []);
}

function getScenarioDepletionYear(scenario) {
  if (scenario?.depletionYear != null) {
    return scenario.depletionYear;
  }

  return getDepletionYearFromRows(scenario?.yearlyRows ?? []);
}

function getStartYearLabel(scenario) {
  return scenario?.startYear ?? "—";
}

function getEndYearLabel(scenario) {
  return scenario?.endYear ?? "—";
}

function getSingleScenarioMetrics(summary, scenario) {
  const rows = scenario?.yearlyRows ?? [];

  const totalWithdrawals = sumBy(rows, (row) => row.portfolioWithdrawal);
  const totalNonPortfolioIncome = sumBy(
    rows,
    (row) => Number(row.statePension ?? 0) + Number(row.otherIncome ?? 0) + Number(row.windfall ?? 0)
  );

  const cutsApplied = getCutsCount(rows);
  const firstCutYear = getFirstCutYear(rows);
  const worstCut = getWorstCut(rows);
  const shortfallYears = getShortfallYears(rows);
  const yearsBelowComfortFloor = getComfortFloorYears(rows, 0.9);

  const firstRow = rows[0] ?? null;
  const initialPortfolio = Number(firstRow?.startPortfolio ?? 0);
  const initialWithdrawal = Number(firstRow?.portfolioWithdrawal ?? 0);
  const initialWithdrawalRate = safeRatio(initialWithdrawal, initialPortfolio);

  const portfolioDependence = safeRatio(
    totalWithdrawals,
    totalWithdrawals + totalNonPortfolioIncome
  );

  const terminalNominal = Number(summary?.terminalNominal ?? getScenarioTerminalNominal(scenario));
  const minimumWealth = Number(summary?.minimumWealth ?? getScenarioMinimumWealth(scenario));
  const depleted = Boolean(summary?.depleted ?? scenario?.depleted);
  const depletionYear = summary?.depletionYear ?? getScenarioDepletionYear(scenario);

  return {
    terminalNominal,
    minimumWealth,
    depleted,
    depletionYear,
    totalWithdrawals,
    totalNonPortfolioIncome,
    cutsApplied,
    firstCutYear,
    worstCut,
    shortfallYears,
    yearsBelowComfortFloor,
    initialWithdrawalRate,
    portfolioDependence
  };
}

function getMultiScenarioMetrics(summary, scenarios) {
  const allScenarios = Array.isArray(scenarios) ? scenarios : [];

  const withTerminal = allScenarios.map((scenario) => ({
    scenario,
    terminalNominal: getScenarioTerminalNominal(scenario),
    minimumWealth: getScenarioMinimumWealth(scenario),
    depletionYear: getScenarioDepletionYear(scenario),
    depleted: Boolean(scenario?.depleted)
  }));

  const depletedScenarios = withTerminal.filter((item) => item.depleted);
  const worstScenario = withTerminal.reduce((worst, item) => {
    if (!worst || item.terminalNominal < worst.terminalNominal) {
      return item;
    }
    return worst;
  }, null);

  const bestScenario = withTerminal.reduce((best, item) => {
    if (!best || item.terminalNominal > best.terminalNominal) {
      return item;
    }
    return best;
  }, null);

  const weakCaseScenario = withTerminal
    .slice()
    .sort((a, b) => a.terminalNominal - b.terminalNominal)[
      Math.max(0, Math.floor((withTerminal.length - 1) * 0.1))
    ] ?? null;

  const scenarioCount = Number(summary?.scenarioCount ?? withTerminal.length);
  const successRate = Number(summary?.successRate ?? 0);
  const medianTerminalWealth = Number(summary?.medianTerminalWealth ?? 0);
  const p10TerminalWealth = Number(summary?.p10TerminalWealth ?? 0);
  const p90TerminalWealth = Number(summary?.p90TerminalWealth ?? 0);

  const depletedCount = depletedScenarios.length;
  const depletedShare = scenarioCount ? (depletedCount / scenarioCount) * 100 : 0;
  const downsideSpread = medianTerminalWealth - p10TerminalWealth;

  return {
    scenarioCount,
    successRate,
    medianTerminalWealth,
    p10TerminalWealth,
    p90TerminalWealth,
    depletedCount,
    depletedShare,
    downsideSpread,
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
      text: `This path depletes in ${metrics.depletionYear}, so the current spending pattern is not sustainable through the full plan horizon.`
    };
  }

  if (metrics.shortfallYears > 0 || metrics.yearsBelowComfortFloor >= 3 || metrics.worstCut >= 15) {
    return {
      tone: "watch",
      label: "Watch",
      text: "This path survives, but spending pressure appears in several years and should be monitored closely."
    };
  }

  return {
    tone: "strong",
    label: "No major risks",
    text: "This selected path remains intact without material spending stress under the current assumptions."
  };
}

function getMultiWarning(metrics) {
  if (metrics.successRate < 70 || metrics.depletedShare > 30) {
    return {
      tone: "risk",
      label: "Risk",
      text: "A meaningful share of historical paths fail, which suggests the plan is vulnerable to adverse market sequences."
    };
  }

  if (metrics.successRate < 90 || metrics.p10TerminalWealth <= 0) {
    return {
      tone: "watch",
      label: "Watch",
      text: "The plan is viable in many paths, but the weak case remains thin and deserves attention."
    };
  }

  return {
    tone: "strong",
    label: "No major risks",
    text: "Historical coverage is resilient across most scenarios, with no major weakness showing up in the broad result set."
  };
}

function getSingleHeadline(metrics) {
  if (metrics.depleted) {
    return {
      tone: "risk",
      badge: "Risk",
      title: "This selected path runs out of money before the end of the plan.",
      text: `Depletion occurs in ${metrics.depletionYear}, with spending pressure building before that point.`
    };
  }

  if (metrics.shortfallYears > 0 || metrics.cutsApplied >= 3 || metrics.yearsBelowComfortFloor >= 3) {
    return {
      tone: "watch",
      badge: "Watch",
      title: "This selected path holds together, but only with noticeable spending pressure.",
      text: "Guardrails and reduced spending appear to be doing real work in keeping the plan on track."
    };
  }

  return {
    tone: "strong",
    badge: "Strong",
    title: "This selected path remains stable under the current assumptions.",
    text: "Spending is largely maintained and the plan does not show material stress in this scenario."
  };
}

function getMultiHeadline(metrics) {
  if (metrics.successRate < 70 || metrics.p10TerminalWealth <= 0) {
    return {
      tone: "risk",
      badge: "Risk",
      title: "The plan is vulnerable across the historical range tested.",
      text: "Weak-case outcomes are poor enough that this plan likely needs either more flexibility or lower withdrawals."
    };
  }

  if (metrics.successRate < 90 || metrics.depletedCount > 0) {
    return {
      tone: "watch",
      badge: "Watch",
      title: "The plan is broadly workable, but the downside tail is not fully comfortable.",
      text: "Most scenarios survive, though weaker start years create materially worse outcomes than the middle case."
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

function renderSingleModeGroups(summary, scenario) {
  const metrics = getSingleScenarioMetrics(summary, scenario);

  const outcomeSummary = createMetricGroup("Outcome summary", [
    createMetricTile(
      "End portfolio",
      formatCurrency(metrics.terminalNominal),
      `${getStartYearLabel(scenario)}–${getEndYearLabel(scenario)} path`
    ),
    createMetricTile(
      "Depletion",
      metrics.depleted ? String(metrics.depletionYear) : "Not depleted",
      metrics.depleted ? "First year of exhaustion" : "Full plan survived"
    ),
    createMetricTile(
      "Minimum portfolio",
      formatCurrency(metrics.minimumWealth),
      "Lowest point reached"
    )
  ]);

  const lifestyleResilience = createMetricGroup("Lifestyle resilience", [
    createMetricTile(
      "Years with cuts",
      String(metrics.cutsApplied),
      metrics.cutsApplied ? "Guardrails reduced spending" : "No spending cuts"
    ),
    createMetricTile(
      "Worst cut",
      formatPercent(metrics.worstCut, 0),
      "Largest single-year reduction"
    ),
    createMetricTile(
      "Years with shortfall",
      String(metrics.shortfallYears),
      metrics.shortfallYears ? "Target spending not fully met" : "No shortfall years"
    )
  ]);

  const incomeSupport = createMetricGroup("Income support", [
    createMetricTile(
      "Non-portfolio income",
      formatCurrency(metrics.totalNonPortfolioIncome),
      "State pension, other income, and windfalls"
    ),
    createMetricTile(
      "Total withdrawals",
      formatCurrency(metrics.totalWithdrawals),
      "Taken from invested assets"
    ),
    createMetricTile(
      "Portfolio dependence",
      formatPercent(metrics.portfolioDependence, 0),
      "Share of funding from withdrawals"
    )
  ]);

  const spendingStability = createMetricGroup("Spending stability", [
    createMetricTile(
      "Initial withdrawal rate",
      formatPercent(metrics.initialWithdrawalRate, 1),
      "Year 1 only"
    ),
    createMetricTile(
      "Years below comfort floor",
      String(metrics.yearsBelowComfortFloor),
      "Actual spending under 90% of target"
    ),
    createMetricTile(
      "First cut year",
      metrics.firstCutYear ? String(metrics.firstCutYear) : "None",
      metrics.firstCutYear ? "First guardrail reduction" : "No cuts applied"
    )
  ]);

  const warning = getSingleWarning(metrics);
  const headline = getSingleHeadline(metrics);

  return {
    warning,
    headline,
    groups: [outcomeSummary, lifestyleResilience, incomeSupport, spendingStability]
  };
}

function renderMultiModeGroups(summary, scenarios) {
  const metrics = getMultiScenarioMetrics(summary, scenarios);

  const outcomeSummary = createMetricGroup("Outcome summary", [
    createMetricTile(
      "Plan success",
      formatPercent(metrics.successRate, 1),
      "Share of scenarios that avoid depletion"
    ),
    createMetricTile(
      "Median ending portfolio",
      formatCurrency(metrics.medianTerminalWealth),
      "Middle historical outcome"
    ),
    createMetricTile(
      "Weak-case ending portfolio",
      formatCurrency(metrics.p10TerminalWealth),
      "10th percentile outcome"
    )
  ]);

  const downsideResilience = createMetricGroup("Downside resilience", [
    createMetricTile(
      "Depleted scenarios",
      String(metrics.depletedCount),
      "Count of failed historical paths"
    ),
    createMetricTile(
      "Weak-case depletion",
      metrics.weakCaseDepletionYear ? String(metrics.weakCaseDepletionYear) : "None",
      metrics.weakCaseDepletionYear ? "10th percentile path depletes" : "Weak case still survives"
    ),
    createMetricTile(
      "Downside spread",
      formatCurrency(metrics.downsideSpread),
      "Gap between median and weak case"
    )
  ]);

  const rangeOfOutcomes = createMetricGroup("Range of outcomes", [
    createMetricTile(
      "Upside ending portfolio",
      formatCurrency(metrics.p90TerminalWealth),
      "90th percentile outcome"
    ),
    createMetricTile(
      "Worst start year",
      metrics.worstStartYear ? String(metrics.worstStartYear) : "—",
      "Lowest terminal outcome"
    ),
    createMetricTile(
      "Best start year",
      metrics.bestStartYear ? String(metrics.bestStartYear) : "—",
      "Highest terminal outcome"
    )
  ]);

  const planBreadth = createMetricGroup("Plan breadth", [
    createMetricTile(
      "Scenario count",
      String(metrics.scenarioCount),
      "Historical windows tested"
    ),
    createMetricTile(
      "Share depleted",
      formatPercent(metrics.depletedShare, 1),
      "Fraction of paths that fail"
    ),
    createMetricTile(
      "Worst terminal outcome",
      formatCurrency(metrics.worstTerminalOutcome),
      "Most adverse end state"
    )
  ]);

  const warning = getMultiWarning(metrics);
  const headline = getMultiHeadline(metrics);

  return {
    warning,
    headline,
    groups: [outcomeSummary, downsideResilience, rangeOfOutcomes, planBreadth]
  };
}

function renderPlanInsights({ summary, scenarios }) {
  const isSingleScenario = summary?.type === "single-scenario";
  const selectedScenario = isSingleScenario
    ? scenarios?.[0] ?? null
    : null;

  const content = isSingleScenario
    ? renderSingleModeGroups(summary, selectedScenario)
    : renderMultiModeGroups(summary, scenarios);

  const description = isSingleScenario
    ? "Interpretation for the currently selected historical path."
    : "Interpretation across the full range of historical scenarios tested.";

  return `
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

export function renderResultsSummary({ container, summary, scenarios = [] }) {
  if (!container) {
    return;
  }

  if (!summary) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = renderPlanInsights({ summary, scenarios });
}