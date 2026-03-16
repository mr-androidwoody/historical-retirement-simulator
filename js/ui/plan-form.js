function getField(form, selector) {
  return form.querySelector(selector);
}

function getRawValue(form, selector, fallback = "") {
  const field = getField(form, selector);
  return field ? field.value : fallback;
}

function getTextValue(form, selector, fallback = "") {
  const value = getRawValue(form, selector, fallback);
  return String(value).trim();
}

function parseNumber(value, fallback = 0) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/£/g, "")
    .replace(/%/g, "")
    .trim();

  if (cleaned === "") {
    return fallback;
  }

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getNumberValue(form, selector, fallback = 0) {
  return parseNumber(getRawValue(form, selector, ""), fallback);
}

function getCheckboxValue(form, selector, fallback = false) {
  const field = getField(form, selector);
  return field ? Boolean(field.checked) : fallback;
}

function normaliseRate(value) {
  return value > 1 ? value / 100 : value;
}

function normaliseAllocation(value) {
  return value > 1 ? value / 100 : value;
}

export function getPlanInputs(form = document.querySelector("#planForm")) {
  if (!form) {
    throw new Error('Plan form not found. Expected an element matching "#planForm".');
  }

  const mode = getTextValue(form, "#simulationMode", "historical") || "historical";

  const inputs = {
    mode,

    startingPortfolio: getNumberValue(form, "#startingPortfolio", 1000000),
    annualSpending: getNumberValue(form, "#annualSpending", 40000),
    simulationYears: getNumberValue(form, "#simulationYears", 30),

    equityAllocation: normaliseAllocation(getNumberValue(form, "#equityAllocation", 60)),
    bondAllocation: normaliseAllocation(getNumberValue(form, "#bondAllocation", 40)),
    cashAllocation: normaliseAllocation(getNumberValue(form, "#cashAllocation", 0)),

    annualFees: normaliseRate(getNumberValue(form, "#annualFees", 0)),
    rebalance: getCheckboxValue(form, "#rebalance", true),

    useGuardrails: getCheckboxValue(form, "#useGuardrails", false),
    guardrailFloor: normaliseRate(getNumberValue(form, "#guardrailFloor", 0)),
    guardrailCeiling: normaliseRate(getNumberValue(form, "#guardrailCeiling", 0)),
    guardrailCut: normaliseRate(getNumberValue(form, "#guardrailCut", 0)),
    guardrailRaise: normaliseRate(getNumberValue(form, "#guardrailRaise", 0)),

    statePensionToday: getNumberValue(form, "#statePensionToday", 0),
    statePensionStartAge: getNumberValue(form, "#statePensionStartAge", 67),
    includeStatePension: getCheckboxValue(form, "#includeStatePension", false),

    spendingBasis: getTextValue(form, "#spendingBasis", "real"),
    displayValues: getTextValue(form, "#displayValues", "real"),

    monteCarloRuns: getNumberValue(form, "#monteCarloRuns", 1000),

    equityReturnMean: normaliseRate(getNumberValue(form, "#equityReturnMean", 7)),
    equityReturnStdDev: normaliseRate(getNumberValue(form, "#equityReturnStdDev", 15)),
    bondReturnMean: normaliseRate(getNumberValue(form, "#bondReturnMean", 2)),
    bondReturnStdDev: normaliseRate(getNumberValue(form, "#bondReturnStdDev", 7)),
    inflationMean: normaliseRate(getNumberValue(form, "#inflationMean", 2.5)),
    inflationStdDev: normaliseRate(getNumberValue(form, "#inflationStdDev", 2)),

    equityReturn: normaliseRate(getNumberValue(form, "#equityReturn", 6)),
    bondReturn: normaliseRate(getNumberValue(form, "#bondReturn", 2)),
    inflation: normaliseRate(getNumberValue(form, "#inflation", 2))
  };

  inputs.stockAllocation = inputs.equityAllocation;

  return inputs;
}

export function bindPlanForm({
  form = document.querySelector("#planForm"),
  onSubmit
} = {}) {
  if (!form) {
    throw new Error('Plan form not found. Expected an element matching "#planForm".');
  }

  if (typeof onSubmit !== "function") {
    throw new Error("bindPlanForm requires an onSubmit callback.");
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(getPlanInputs(form));
  };

  form.addEventListener("submit", handleSubmit);

  return {
    destroy() {
      form.removeEventListener("submit", handleSubmit);
    }
  };
}