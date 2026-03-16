import { simulateScenario } from "./engine.js";

export function runRetirementSimulation({ inputs, returnsProvider }) {

  const result = simulateScenario({
    inputs,
    returnsProvider
  });

  return result;
}