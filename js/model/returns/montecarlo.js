export function createMonteCarloReturnsProvider(inputs = {}) {

  const equityMean = Number(inputs.equityMean ?? 0.06);
  const equityStd = Number(inputs.equityStd ?? 0.15);

  const bondMean = Number(inputs.bondMean ?? 0.02);
  const bondStd = Number(inputs.bondStd ?? 0.06);

  const inflationMean = Number(inputs.inflationMean ?? 0.02);
  const inflationStd = Number(inputs.inflationStd ?? 0.01);

  const cashlikeReturn = Number(inputs.cashReturn ?? 0.01);

  function normal(mean, std) {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
  }

  return {
    getYearReturns() {
      return {
        equities: normal(equityMean, equityStd),
        bonds: normal(bondMean, bondStd),
        cashlike: cashlikeReturn,
        inflation: normal(inflationMean, inflationStd)
      };
    }
  };
}