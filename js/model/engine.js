export function simulateScenario({ inputs, returnsProvider }) {
  const initialPortfolio = toNumber(
    inputs.startingPortfolio ?? inputs.initialPortfolio ?? 0
  );

  const annualSpending = toNumber(inputs.annualSpending ?? 0);
  const years = toInteger(inputs.simulationYears ?? inputs.years ?? 0);

  const equityAllocation = toNumber(inputs.equityAllocation ?? 0);
  const bondAllocation = toNumber(inputs.bondAllocation ?? 0);
  const cashAllocation = toNumber(inputs.cashAllocation ?? 0);

  const annualFees = toNumber(inputs.annualFees ?? inputs.fees ?? 0);
  const statePensionToday = toNumber(inputs.statePensionToday ?? 0);
  const includeStatePension = Boolean(inputs.includeStatePension);
  const spendingBasis = String(inputs.spendingBasis ?? "nominal").toLowerCase();

  const people = Array.isArray(inputs.people) ? inputs.people : [];

  const guardrailsEnabled = Boolean(inputs.useGuardrails ?? false);
  const guardrailFloor = toNumber(inputs.guardrailFloor ?? 0);
  const guardrailCeiling = toNumber(inputs.guardrailCeiling ?? 0);
  const guardrailCut = toNumber(inputs.guardrailCut ?? 0);
  const guardrailRaise = toNumber(inputs.guardrailRaise ?? 0);

  let portfolio = initialPortfolio;
  let depleted = false;

  const yearlyRows = [];
  const pathNominal = [];
  const pathReal = [];

  let inflationIndex = 1;
  let currentPlannedSpending = annualSpending;
  let previousPortfolioReturn = null;

  for (let year = 0; year < years; year += 1) {
    const returns = returnsProvider.getYearReturns(year) ?? {};
    const inflation = toNumber(returns.inflation ?? 0);

    const startPortfolio = portfolio;

    let statePension = 0;
    let otherIncome = 0;
    let windfall = 0;

    for (const person of people) {
      if (!person || person.include === false) continue;

      const currentAge = toNumber(person.currentAge ?? 0);
      const statePensionAge = toNumber(person.statePensionAge ?? 0);
      const receivesFullStatePension = Boolean(person.receivesFullStatePension);
      const personOtherIncome = toNumber(person.otherIncome ?? 0);
      const incomeYears = toInteger(person.incomeYears ?? 0);
      const windfallAmount = toNumber(person.windfallAmount ?? 0);
      const windfallYear = toInteger(person.windfallYear ?? -1);

      const age = currentAge + year;

      if (
        includeStatePension &&
        receivesFullStatePension &&
        age >= statePensionAge
      ) {
        statePension += statePensionToday;
      }

      if (year < incomeYears) {
        otherIncome += personOtherIncome;
      }

      if (year === windfallYear) {
        windfall += windfallAmount;
      }
    }

    // Proper GK inflation rule:
    // for real spending, skip the inflation increase after a negative prior-year return.
    const inflationApplied =
      year > 0 &&
      spendingBasis === "real" &&
      previousPortfolioReturn !== null &&
      previousPortfolioReturn >= 0;

    if (inflationApplied) {
      currentPlannedSpending *= 1 + inflation;
    }

    const targetSpending = currentPlannedSpending;

    // DEBUG — first 3 years only
    if (year < 3) {
      console.log("ENGINE VERSION: GK_STRICT_V1");
      console.log("GK INPUT CHECK", {
        year,
        guardrailsEnabled,
        guardrailFloor,
        guardrailCeiling,
        guardrailCut,
        guardrailRaise,
        spendingBasis,
        annualSpending,
        currentPlannedSpending,
        targetSpending,
        startPortfolio,
        initialPortfolio
      });
    }

    const { actualSpending, cut, raise, decision } = applyGuardrailsGK({
      enabled: guardrailsEnabled,
      targetSpending,
      startPortfolio,
      initialPortfolio,
      initialSpending: annualSpending,
      floorGuardrail: guardrailFloor,
      ceilingGuardrail: guardrailCeiling,
      cutPercent: guardrailCut,
      raisePercent: guardrailRaise
    });

    if (year < 3) {
      console.log("GK RESULT CHECK", {
        year,
        targetSpending,
        actualSpending,
        cut,
        raise,
        decision
      });
    }

    // Persist the chosen spending as next year's base.
    currentPlannedSpending = actualSpending;

    const totalIncome = statePension + otherIncome + windfall;
    const requiredWithdrawal = Math.max(0, actualSpending - totalIncome);
    const portfolioWithdrawal = Math.min(requiredWithdrawal, startPortfolio);
    const shortfall = Math.max(0, requiredWithdrawal - startPortfolio);

    portfolio = startPortfolio - portfolioWithdrawal;

    if (requiredWithdrawal > startPortfolio) {
      depleted = true;
    }

    const portfolioReturn = getPortfolioReturn({
      returns,
      equityAllocation,
      bondAllocation,
      cashAllocation
    });

    portfolio *= 1 + portfolioReturn;
    portfolio *= 1 - annualFees;

    if (portfolio <= 0) {
      portfolio = 0;
      depleted = true;
    }

    inflationIndex *= 1 + inflation;

    const endPortfolio = portfolio;
    const realPortfolio =
      inflationIndex > 0 ? endPortfolio / inflationIndex : endPortfolio;

    yearlyRows.push({
      year,
      startPortfolio,
      targetSpending,
      actualSpending,
      cut,
      raise,
      decision,
      shortfall,
      statePension,
      otherIncome,
      windfall,
      portfolioWithdrawal,
      endPortfolio,
      portfolioReturn,
      inflation,
      realPortfolio,
      depleted,
      inflationApplied
    });

    pathNominal.push(endPortfolio);
    pathReal.push(realPortfolio);

    previousPortfolioReturn = portfolioReturn;
  }

  const terminalNominal =
    pathNominal.length > 0
      ? pathNominal[pathNominal.length - 1]
      : initialPortfolio;

  const terminalReal =
    pathReal.length > 0
      ? pathReal[pathReal.length - 1]
      : initialPortfolio;

  return {
    yearlyRows,
    pathNominal,
    pathReal,
    terminalNominal,
    terminalReal,
    depleted
  };
}

function applyGuardrailsGK({
  enabled,
  targetSpending,
  startPortfolio,
  initialPortfolio,
  initialSpending,
  floorGuardrail,
  ceilingGuardrail,
  cutPercent,
  raisePercent
}) {
  if (!enabled) {
    return {
      actualSpending: targetSpending,
      cut: 0,
      raise: 0,
      decision: "none"
    };
  }

  if (startPortfolio <= 0 || initialPortfolio <= 0 || initialSpending <= 0) {
    return {
      actualSpending: targetSpending,
      cut: 0,
      raise: 0,
      decision: "none"
    };
  }

  const currentWithdrawalRate = targetSpending / startPortfolio;
  const initialWithdrawalRate = initialSpending / initialPortfolio;

  const lowerGuardrailRate = initialWithdrawalRate * (1 - floorGuardrail);
  const upperGuardrailRate = initialWithdrawalRate * (1 + ceilingGuardrail);

  let actualSpending = targetSpending;
  let cut = 0;
  let raise = 0;
  let decision = "none";

  if (currentWithdrawalRate > upperGuardrailRate) {
    actualSpending = targetSpending * (1 - cutPercent);
    cut = Math.max(0, targetSpending - actualSpending);
    decision = "cut";
  } else if (currentWithdrawalRate < lowerGuardrailRate) {
    actualSpending = targetSpending * (1 + raisePercent);
    raise = Math.max(0, actualSpending - targetSpending);
    decision = "raise";
  }

  return {
    actualSpending,
    cut,
    raise,
    decision
  };
}

function getPortfolioReturn({
  returns,
  equityAllocation,
  bondAllocation,
  cashAllocation
}) {
  if (typeof returns.portfolioReturn === "number") {
    return returns.portfolioReturn;
  }

  const equityReturn = toNumber(
    returns.equityReturn ?? returns.equities ?? 0
  );

  const bondReturn = toNumber(
    returns.bondReturn ?? returns.bonds ?? 0
  );

  const cashReturn = toNumber(
    returns.cashReturn ??
      returns.cashlikeReturn ??
      returns.cashlike ??
      0
  );

  return (
    equityReturn * equityAllocation +
    bondReturn * bondAllocation +
    cashReturn * cashAllocation
  );
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
}