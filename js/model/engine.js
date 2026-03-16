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
        terminalNominal: portfolio,
        terminalReal: realPortfolio,
        depleted: true
      };
    }
  }

  return {
    yearlyRows,
    pathNominal,
    pathReal,
    terminalNominal: pathNominal[pathNominal.length - 1] ?? initialPortfolio,
    terminalReal: pathReal[pathReal.length - 1] ?? initialPortfolio,
    depleted: false
  };
}