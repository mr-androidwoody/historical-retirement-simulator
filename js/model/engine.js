export function simulateScenario({ inputs, returnsProvider }) {

  const {
    initialPortfolio,
    annualSpending,
    years,
    equityAllocation,
    bondAllocation,
    cashAllocation,
    fees
  } = inputs;

  let portfolio = initialPortfolio;

  const yearlyRows = [];
  const pathNominal = [];
  const pathReal = [];

  let inflationIndex = 1;

  for (let year = 0; year < years; year++) {

    const returns = returnsProvider.getYearReturns(year);

    const startPortfolio = portfolio;

    const withdrawal = annualSpending;

    portfolio -= withdrawal;

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
      withdrawal,
      portfolioReturn: weightedReturn,
      endPortfolio: portfolio,
      inflation: returns.inflation,
      realPortfolio
    });

    pathNominal.push(portfolio);
    pathReal.push(realPortfolio);

    if (portfolio <= 0) {
      return {
        yearlyRows,
        pathNominal,
        pathReal,
        depleted: true
      };
    }
  }

  return {
    yearlyRows,
    pathNominal,
    pathReal,
    depleted: false
  };
}