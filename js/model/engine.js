export function simulateScenario({ inputs, returnsProvider }) {
  const initialPortfolio = Number(
    inputs.startingPortfolio ?? inputs.initialPortfolio ?? 0
  );

  const annualSpending = Number(inputs.annualSpending ?? 0);

  const years = Number(
    inputs.simulationYears ?? inputs.years ?? 0
  );

  const equityAllocation = Number(inputs.equityAllocation ?? 0);
  const bondAllocation = Number(inputs.bondAllocation ?? 0);
  const cashAllocation = Number(inputs.cashAllocation ?? 0);

  const fees = Number(
    inputs.annualFees ?? inputs.fees ?? 0
  );

  let portfolio = initialPortfolio;

  const yearlyRows = [];
  const pathNominal = [];
  const pathReal = [];

  let inflationIndex = 1;

  for (let year = 0; year < years; year += 1) {
    const returns = returnsProvider.getYearReturns(year);

    const startPortfolio = portfolio;

    const targetSpending = annualSpending;
    const actualSpending = targetSpending;

    const statePension = 0;
    const otherIncome = 0;
    const windfall = 0;

    const cut = Math.max(0, targetSpending - actualSpending);
    const shortfall = Math.max(
      0,
      actualSpending - (statePension + otherIncome + windfall + startPortfolio)
    );

    const totalNonPortfolioFunding = statePension + otherIncome + windfall;

    const portfolioWithdrawal = Math.max(
      0,
      actualSpending - totalNonPortfolioFunding
    );

    portfolio -= portfolioWithdrawal;

    const weightedReturn =
      equityAllocation * returns.equities +
      bondAllocation * returns.bonds +
      cashAllocation * returns.cashlike;

    portfolio = portfolio * (1 + weightedReturn);
    portfolio = portfolio * (1 - fees);

    inflationIndex = inflationIndex * (1 + returns.inflation);

    const realPortfolio = portfolio / inflationIndex;

    yearlyRows.push({
      year,
      startPortfolio,

      targetSpending,
      actualSpending,
      cut,
      shortfall,

      statePension,
      otherIncome,
      windfall,

      portfolioWithdrawal,

      portfolioReturn: weightedReturn,
      inflation: returns.inflation,

      endPortfolio: portfolio,
      realPortfolio,

      depleted: portfolio <= 0
    });

    pathNominal.push(portfolio);
    pathReal.push(realPortfolio);

    if (portfolio <= 0) {
      return {
        yearlyRows,
        pathNominal,
        pathReal,
        terminalNominal: pathNominal[pathNominal.length - 1] ?? 0,
        terminalReal: pathReal[pathReal.length - 1] ?? 0,
        depleted: true
      };
    }
  }

  return {
    yearlyRows,
    pathNominal,
    pathReal,
    terminalNominal: pathNominal[pathNominal.length - 1] ?? 0,
    terminalReal: pathReal[pathReal.length - 1] ?? 0,
    depleted: false
  };
}