export function createDeterministicReturnsProvider() {

  const RETURNS = {
    equities: 0.07,
    bonds: 0.03,
    cashlike: 0.02,
    inflation: 0.02
  };

  return {
    getYearReturns() {
      return RETURNS;
    }
  };

}