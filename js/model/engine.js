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

  // Cash runway inputs
  const cashRunwayYears = Math.max(0, toNumber(inputs.cashRunwayYears ?? 0));
  const cashRefillCap = Math.max(0, toNumber(inputs.cashRefillCap ?? 0.1));

  let depleted = false;

  const yearlyRows = [];
  const pathNominal = [];
  const pathReal = [];

  let inflationIndex = 1;
  let currentPlannedSpending = annualSpending;
  let previousPortfolioReturn = null;

  // Split opening portfolio into cash runway + invested assets
  let cashBucket = Math.min(initialPortfolio, annualSpending * cashRunwayYears);
  let investedPortfolio = Math.max(0, initialPortfolio - cashBucket);

  for (let year = 0; year < years; year += 1) {
    const returns = returnsProvider.getYearReturns(year) ?? {};
    const inflation = toNumber(returns.inflation ?? 0);

    const startCashBucket = cashBucket;
    const startInvestedPortfolio = investedPortfolio;
    const startPortfolio = startCashBucket + startInvestedPortfolio;

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

    // Inflation handling
    let inflationApplied = false;

    if (year > 0 && spendingBasis === "real") {
      if (guardrailsEnabled) {
        inflationApplied =
          previousPortfolioReturn !== null &&
          previousPortfolioReturn >= 0;
      } else {
        inflationApplied = true;
      }
    }

    if (inflationApplied) {
      currentPlannedSpending *= 1 + inflation;
    }

    const targetSpending = currentPlannedSpending;

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

    // Persist chosen spending
    currentPlannedSpending = actualSpending;

    const totalIncome = statePension + otherIncome + windfall;
    const requiredWithdrawal = Math.max(0, actualSpending - totalIncome);

    // Determine this year's invested portfolio return first
    const portfolioReturn = getPortfolioReturn({
      returns,
      equityAllocation,
      bondAllocation,
      cashAllocation
    });

    const isBadYear = portfolioReturn < 0;

    let withdrawalFromCash = 0;
    let withdrawalFromInvested = 0;

    if (isBadYear && cashBucket > 0) {
      withdrawalFromCash = Math.min(requiredWithdrawal, cashBucket);
      withdrawalFromInvested = requiredWithdrawal - withdrawalFromCash;
    } else {
      withdrawalFromInvested = requiredWithdrawal;
    }

    const availableTotal = startPortfolio;
    const totalWithdrawal = withdrawalFromCash + withdrawalFromInvested;
    const shortfall = Math.max(0, totalWithdrawal - availableTotal);

    // Cap to available assets if needed
    if (totalWithdrawal > availableTotal) {
      const remainingNeededAfterCash = Math.max(
        0,
        availableTotal - withdrawalFromCash
      );
      withdrawalFromInvested = Math.min(
        remainingNeededAfterCash,
        startInvestedPortfolio
      );
    }

    cashBucket = Math.max(0, cashBucket - withdrawalFromCash);
    investedPortfolio = Math.max(0, investedPortfolio - withdrawalFromInvested);

    // Apply returns only to invested assets
    investedPortfolio *= 1 + portfolioReturn;
    investedPortfolio *= 1 - annualFees;

    if (investedPortfolio < 0) {
      investedPortfolio = 0;
    }

    // Optional refill in non-bad years only
    const targetCashBucket = currentPlannedSpending * cashRunwayYears;
    let cashRefill = 0;

    if (!isBadYear && cashRunwayYears > 0 && cashBucket < targetCashBucket) {
      const refillNeeded = targetCashBucket - cashBucket;
      const maxRefill = investedPortfolio * cashRefillCap;
      cashRefill = Math.min(refillNeeded, maxRefill);

      if (cashRefill > 0) {
        investedPortfolio -= cashRefill;
        cashBucket += cashRefill;
      }
    }

    const endPortfolio = cashBucket + investedPortfolio;

    if (endPortfolio <= 0) {
      cashBucket = 0;
      investedPortfolio = 0;
      depleted = true;
    }

    inflationIndex *= 1 + inflation;

    const realPortfolio =
      inflationIndex > 0 ? endPortfolio / inflationIndex : endPortfolio;

    yearlyRows.push({
      year,
      startPortfolio,
      startCashBucket,
      startInvestedPortfolio,
      targetSpending,
      actualSpending,
      cut,
      raise,
      decision,
      statePension,
      otherIncome,
      windfall,
      requiredWithdrawal,
      withdrawalFromCash,
      withdrawalFromInvested,
      portfolioWithdrawal: withdrawalFromCash + withdrawalFromInvested,
      cashRefill,
      endCashBucket: cashBucket,
      endInvestedPortfolio: investedPortfolio,
      endPortfolio,
      shortfall,
      portfolioReturn,
      inflation,
      inflationApplied,
      isBadYear,
      realPortfolio,
      depleted
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