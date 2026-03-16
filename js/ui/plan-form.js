const DEFAULTS = {
  mode: "historical",
  startingPortfolio: 1000000,
  annualSpending: 40000,
  simulationYears: 30,

  equityAllocation: 60,
  bondAllocation: 40,
  cashAllocation: 0,

  annualFees: 0,
  rebalance: true,

  useGuardrails: false,
  guardrailFloor: 20,
  guardrailCeiling: 20,
  guardrailCut: 10,
  guardrailRaise: 10,

  statePensionToday: 0,
  statePensionStartAge: 67,
  includeStatePension: false,

  spendingBasis: "real",
  displayValues: "real",

  monteCarloRuns: 1000,

  equityReturnMean: 7,
  equityReturnStdDev: 15,
  bondReturnMean: 2,
  bondReturnStdDev: 7,
  inflationMean: 2.5,
  inflationStdDev: 2,

  equityReturn: 6,
  bondReturn: 2,
  inflation: 2,

  people: [
    {
      name: "",
      currentAge: 57,
      statePensionAge: 67,
      include: true,
      receivesFullStatePension: true,
      otherIncome: 0,
      incomeYears: 0,
      windfallAmount: 0,
      windfallYear: 0
    },
    {
      name: "",
      currentAge: 58,
      statePensionAge: 67,
      include: true,
      receivesFullStatePension: true,
      otherIncome: 0,
      incomeYears: 0,
      windfallAmount: 0,
      windfallYear: 0
    }
  ]
};

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

function formatNumberInput(value) {
  return Number.isFinite(Number(value)) ? String(value) : "";
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderPersonCard(person, index) {
  const personNumber = index + 1;
  const idPrefix = `person${personNumber}`;
  const showIncludeToggle = personNumber === 2;

  return `
    <div class="person-card">
      <div class="person-header">
        <div class="person-title">Person ${personNumber}</div>
        ${
          showIncludeToggle
            ? `
              <label class="field-checkbox person-include-toggle">
                <input id="includePerson2" type="checkbox"${person.include ? " checked" : ""} />
                <span>Include person 2</span>
              </label>
            `
            : ""
        }
      </div>

      <div class="person-grid">
        <label class="field">
          <span class="field-label">Name</span>
          <input
            id="${idPrefix}Name"
            type="text"
            placeholder="Enter name"
            value="${escapeAttribute(person.name)}"
          />
        </label>

        <label class="field">
          <span class="field-label">Current age</span>
          <input
            id="${idPrefix}CurrentAge"
            type="text"
            inputmode="numeric"
            value="${formatNumberInput(person.currentAge)}"
          />
        </label>

        <label class="field">
          <span class="field-label">State pension age</span>
          <input
            id="${idPrefix}StatePensionAge"
            type="text"
            inputmode="numeric"
            value="${formatNumberInput(person.statePensionAge)}"
          />
        </label>

        <label class="field field-checkbox field-checkbox-inline">
          <span>Receives full state pension</span>
          <input
            id="${idPrefix}ReceivesStatePension"
            type="checkbox"
            ${person.receivesFullStatePension ? "checked" : ""}
          />
        </label>

        <label class="field">
          <span class="field-label">Other income</span>
          <input
            id="${idPrefix}OtherIncome"
            type="text"
            inputmode="decimal"
            value="${formatNumberInput(person.otherIncome)}"
          />
        </label>

        <label class="field">
          <span class="field-label">Number of years</span>
          <input
            id="${idPrefix}IncomeYears"
            type="text"
            inputmode="numeric"
            value="${formatNumberInput(person.incomeYears)}"
          />
        </label>

        <label class="field">
          <span class="field-label">Windfall amount</span>
          <input
            id="${idPrefix}WindfallAmount"
            type="text"
            inputmode="decimal"
            value="${formatNumberInput(person.windfallAmount)}"
          />
        </label>

        <label class="field">
          <span class="field-label">In which year</span>
          <input
            id="${idPrefix}WindfallYear"
            type="text"
            inputmode="numeric"
            value="${formatNumberInput(person.windfallYear)}"
          />
        </label>
      </div>
    </div>
  `;
}

function renderPlanFormMarkup(values = DEFAULTS) {
  const people = Array.isArray(values.people) && values.people.length >= 2
    ? values.people
    : DEFAULTS.people;

  return `
    <form class="plan-form" novalidate>
      <div class="plan-form-grid">
        <section class="plan-form-section">
          <h4 class="plan-form-section-title">Core assumptions</h4>

          <label class="field">
            <span class="field-label">Simulation mode</span>
            <select id="simulationMode">
              <option value="historical"${values.mode === "historical" ? " selected" : ""}>Historical</option>
              <option value="deterministic"${values.mode === "deterministic" ? " selected" : ""}>Deterministic</option>
              <option value="montecarlo"${values.mode === "montecarlo" ? " selected" : ""}>Monte Carlo</option>
            </select>
          </label>

          <label class="field">
            <span class="field-label">Starting portfolio (£)</span>
            <input
              id="startingPortfolio"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.startingPortfolio)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Annual spending (£)</span>
            <input
              id="annualSpending"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.annualSpending)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Simulation years</span>
            <input
              id="simulationYears"
              type="text"
              inputmode="numeric"
              value="${formatNumberInput(values.simulationYears)}"
            />
          </label>
        </section>

        <section class="plan-form-section plan-form-section-wide">
          <h4 class="plan-form-section-title">Fixed income</h4>
          <div class="people-grid">
            ${renderPersonCard(people[0], 0)}
            ${renderPersonCard(people[1], 1)}
          </div>
        </section>

        <section class="plan-form-section">
          <h4 class="plan-form-section-title">Allocation and fees</h4>

          <label class="field">
            <span class="field-label">Equity allocation (%)</span>
            <input
              id="equityAllocation"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.equityAllocation)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Bond allocation (%)</span>
            <input
              id="bondAllocation"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.bondAllocation)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Cash allocation (%)</span>
            <input
              id="cashAllocation"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.cashAllocation)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Annual fees (%)</span>
            <input
              id="annualFees"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.annualFees)}"
            />
          </label>

          <label class="field field-checkbox">
            <input id="rebalance" type="checkbox"${values.rebalance ? " checked" : ""} />
            <span>Rebalance annually</span>
          </label>
        </section>

        <section class="plan-form-section">
          <h4 class="plan-form-section-title">Guardrails</h4>

          <label class="field field-checkbox">
            <input id="useGuardrails" type="checkbox"${values.useGuardrails ? " checked" : ""} />
            <span>Use guardrails</span>
          </label>

          <label class="field">
            <span class="field-label">Guardrail floor (%)</span>
            <input
              id="guardrailFloor"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.guardrailFloor)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Guardrail ceiling (%)</span>
            <input
              id="guardrailCeiling"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.guardrailCeiling)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Guardrail cut (%)</span>
            <input
              id="guardrailCut"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.guardrailCut)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Guardrail raise (%)</span>
            <input
              id="guardrailRaise"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.guardrailRaise)}"
            />
          </label>
        </section>

        <section class="plan-form-section">
          <h4 class="plan-form-section-title">Pension and display</h4>

          <label class="field">
            <span class="field-label">State pension today (£)</span>
            <input
              id="statePensionToday"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.statePensionToday)}"
            />
          </label>

          <label class="field">
            <span class="field-label">State pension start age</span>
            <input
              id="statePensionStartAge"
              type="text"
              inputmode="numeric"
              value="${formatNumberInput(values.statePensionStartAge)}"
            />
          </label>

          <label class="field field-checkbox">
            <input id="includeStatePension" type="checkbox"${values.includeStatePension ? " checked" : ""} />
            <span>Include state pension</span>
          </label>

          <label class="field">
            <span class="field-label">Spending basis</span>
            <select id="spendingBasis">
              <option value="real"${values.spendingBasis === "real" ? " selected" : ""}>Real</option>
              <option value="nominal"${values.spendingBasis === "nominal" ? " selected" : ""}>Nominal</option>
            </select>
          </label>

          <label class="field">
            <span class="field-label">Display values</span>
            <select id="displayValues">
              <option value="real"${values.displayValues === "real" ? " selected" : ""}>Real</option>
              <option value="nominal"${values.displayValues === "nominal" ? " selected" : ""}>Nominal</option>
            </select>
          </label>
        </section>

        <section class="plan-form-section">
          <h4 class="plan-form-section-title">Monte Carlo assumptions</h4>

          <label class="field">
            <span class="field-label">Monte Carlo runs</span>
            <input
              id="monteCarloRuns"
              type="text"
              inputmode="numeric"
              value="${formatNumberInput(values.monteCarloRuns)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Equity return mean (%)</span>
            <input
              id="equityReturnMean"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.equityReturnMean)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Equity return volatility (%)</span>
            <input
              id="equityReturnStdDev"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.equityReturnStdDev)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Bond return mean (%)</span>
            <input
              id="bondReturnMean"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.bondReturnMean)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Bond return volatility (%)</span>
            <input
              id="bondReturnStdDev"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.bondReturnStdDev)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Inflation mean (%)</span>
            <input
              id="inflationMean"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.inflationMean)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Inflation volatility (%)</span>
            <input
              id="inflationStdDev"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.inflationStdDev)}"
            />
          </label>
        </section>

        <section class="plan-form-section">
          <h4 class="plan-form-section-title">Deterministic assumptions</h4>

          <label class="field">
            <span class="field-label">Equity return (%)</span>
            <input
              id="equityReturn"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.equityReturn)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Bond return (%)</span>
            <input
              id="bondReturn"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.bondReturn)}"
            />
          </label>

          <label class="field">
            <span class="field-label">Inflation (%)</span>
            <input
              id="inflation"
              type="text"
              inputmode="decimal"
              value="${formatNumberInput(values.inflation)}"
            />
          </label>
        </section>
      </div>
    </form>
  `;
}

function ensureFormElement(host) {
  if (!host) {
    throw new Error('Plan form not found. Expected an element matching "#planForm".');
  }

  if (host.tagName === "FORM") {
    if (!host.querySelector("#startingPortfolio")) {
      host.innerHTML = renderPlanFormMarkup(DEFAULTS);
      return host.querySelector("form") || host;
    }

    return host;
  }

  if (!host.querySelector("#startingPortfolio")) {
    host.innerHTML = renderPlanFormMarkup(DEFAULTS);
  }

  return host.querySelector("form");
}

function buildPeopleInputs(actualForm) {
  return [
    {
      include: true,
      name: getTextValue(actualForm, "#person1Name", DEFAULTS.people[0].name),
      currentAge: getNumberValue(actualForm, "#person1CurrentAge", DEFAULTS.people[0].currentAge),
      statePensionAge: getNumberValue(actualForm, "#person1StatePensionAge", DEFAULTS.people[0].statePensionAge),
      receivesFullStatePension: getCheckboxValue(
        actualForm,
        "#person1ReceivesStatePension",
        DEFAULTS.people[0].receivesFullStatePension
      ),
      otherIncome: getNumberValue(actualForm, "#person1OtherIncome", DEFAULTS.people[0].otherIncome),
      incomeYears: getNumberValue(actualForm, "#person1IncomeYears", DEFAULTS.people[0].incomeYears),
      windfallAmount: getNumberValue(actualForm, "#person1WindfallAmount", DEFAULTS.people[0].windfallAmount),
      windfallYear: getNumberValue(actualForm, "#person1WindfallYear", DEFAULTS.people[0].windfallYear)
    },
    {
      include: getCheckboxValue(actualForm, "#includePerson2", DEFAULTS.people[1].include),
      name: getTextValue(actualForm, "#person2Name", DEFAULTS.people[1].name),
      currentAge: getNumberValue(actualForm, "#person2CurrentAge", DEFAULTS.people[1].currentAge),
      statePensionAge: getNumberValue(actualForm, "#person2StatePensionAge", DEFAULTS.people[1].statePensionAge),
      receivesFullStatePension: getCheckboxValue(
        actualForm,
        "#person2ReceivesStatePension",
        DEFAULTS.people[1].receivesFullStatePension
      ),
      otherIncome: getNumberValue(actualForm, "#person2OtherIncome", DEFAULTS.people[1].otherIncome),
      incomeYears: getNumberValue(actualForm, "#person2IncomeYears", DEFAULTS.people[1].incomeYears),
      windfallAmount: getNumberValue(actualForm, "#person2WindfallAmount", DEFAULTS.people[1].windfallAmount),
      windfallYear: getNumberValue(actualForm, "#person2WindfallYear", DEFAULTS.people[1].windfallYear)
    }
  ];
}

function bindPerson2Toggle(actualForm) {
  const includePerson2Field = actualForm.querySelector("#includePerson2");
  const person2Card = includePerson2Field?.closest(".person-card");

  if (!includePerson2Field || !person2Card) {
    return () => {};
  }

  const person2Inputs = Array.from(
    person2Card.querySelectorAll(
      "#person2Name, #person2CurrentAge, #person2StatePensionAge, #person2ReceivesStatePension, #person2OtherIncome, #person2IncomeYears, #person2WindfallAmount, #person2WindfallYear"
    )
  );

  const applyState = () => {
    const isIncluded = includePerson2Field.checked;
    person2Card.classList.toggle("is-disabled", !isIncluded);

    person2Inputs.forEach((input) => {
      input.disabled = !isIncluded;
    });
  };

  includePerson2Field.addEventListener("change", applyState);
  applyState();

  return () => {
    includePerson2Field.removeEventListener("change", applyState);
  };
}

export function getPlanInputs(form = document.querySelector("#planForm form, #planForm")) {
  const actualForm = ensureFormElement(form);

  const mode = getTextValue(actualForm, "#simulationMode", DEFAULTS.mode) || DEFAULTS.mode;

  const inputs = {
    mode,

    startingPortfolio: getNumberValue(actualForm, "#startingPortfolio", DEFAULTS.startingPortfolio),
    annualSpending: getNumberValue(actualForm, "#annualSpending", DEFAULTS.annualSpending),
    simulationYears: getNumberValue(actualForm, "#simulationYears", DEFAULTS.simulationYears),

    equityAllocation: normaliseAllocation(
      getNumberValue(actualForm, "#equityAllocation", DEFAULTS.equityAllocation)
    ),
    bondAllocation: normaliseAllocation(
      getNumberValue(actualForm, "#bondAllocation", DEFAULTS.bondAllocation)
    ),
    cashAllocation: normaliseAllocation(
      getNumberValue(actualForm, "#cashAllocation", DEFAULTS.cashAllocation)
    ),

    annualFees: normaliseRate(getNumberValue(actualForm, "#annualFees", DEFAULTS.annualFees)),
    rebalance: getCheckboxValue(actualForm, "#rebalance", DEFAULTS.rebalance),

    useGuardrails: getCheckboxValue(actualForm, "#useGuardrails", DEFAULTS.useGuardrails),
    guardrailFloor: normaliseRate(getNumberValue(actualForm, "#guardrailFloor", DEFAULTS.guardrailFloor)),
    guardrailCeiling: normaliseRate(getNumberValue(actualForm, "#guardrailCeiling", DEFAULTS.guardrailCeiling)),
    guardrailCut: normaliseRate(getNumberValue(actualForm, "#guardrailCut", DEFAULTS.guardrailCut)),
    guardrailRaise: normaliseRate(getNumberValue(actualForm, "#guardrailRaise", DEFAULTS.guardrailRaise)),

    statePensionToday: getNumberValue(actualForm, "#statePensionToday", DEFAULTS.statePensionToday),
    statePensionStartAge: getNumberValue(actualForm, "#statePensionStartAge", DEFAULTS.statePensionStartAge),
    includeStatePension: getCheckboxValue(actualForm, "#includeStatePension", DEFAULTS.includeStatePension),

    spendingBasis: getTextValue(actualForm, "#spendingBasis", DEFAULTS.spendingBasis),
    displayValues: getTextValue(actualForm, "#displayValues", DEFAULTS.displayValues),

    monteCarloRuns: getNumberValue(actualForm, "#monteCarloRuns", DEFAULTS.monteCarloRuns),

    equityReturnMean: normaliseRate(
      getNumberValue(actualForm, "#equityReturnMean", DEFAULTS.equityReturnMean)
    ),
    equityReturnStdDev: normaliseRate(
      getNumberValue(actualForm, "#equityReturnStdDev", DEFAULTS.equityReturnStdDev)
    ),
    bondReturnMean: normaliseRate(
      getNumberValue(actualForm, "#bondReturnMean", DEFAULTS.bondReturnMean)
    ),
    bondReturnStdDev: normaliseRate(
      getNumberValue(actualForm, "#bondReturnStdDev", DEFAULTS.bondReturnStdDev)
    ),
    inflationMean: normaliseRate(
      getNumberValue(actualForm, "#inflationMean", DEFAULTS.inflationMean)
    ),
    inflationStdDev: normaliseRate(
      getNumberValue(actualForm, "#inflationStdDev", DEFAULTS.inflationStdDev)
    ),

    equityReturn: normaliseRate(getNumberValue(actualForm, "#equityReturn", DEFAULTS.equityReturn)),
    bondReturn: normaliseRate(getNumberValue(actualForm, "#bondReturn", DEFAULTS.bondReturn)),
    inflation: normaliseRate(getNumberValue(actualForm, "#inflation", DEFAULTS.inflation)),

    people: buildPeopleInputs(actualForm)
  };

  inputs.stockAllocation = inputs.equityAllocation;

  return inputs;
}

export function bindPlanForm({
  form = document.querySelector("#planForm"),
  onSubmit
} = {}) {
  const host = form;

  if (!host) {
    throw new Error('Plan form not found. Expected an element matching "#planForm".');
  }

  if (typeof onSubmit !== "function") {
    throw new Error("bindPlanForm requires an onSubmit callback.");
  }

  let actualForm = ensureFormElement(host);
  let unbindPerson2Toggle = bindPerson2Toggle(actualForm);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(getPlanInputs(actualForm));
  };

  const runButton = document.getElementById("runSimulationButton");
  const resetButton = document.getElementById("resetDefaultsButton");

  const bindCurrentForm = () => {
    actualForm.addEventListener("submit", handleSubmit);
    unbindPerson2Toggle = bindPerson2Toggle(actualForm);
  };

  const unbindCurrentForm = () => {
    actualForm.removeEventListener("submit", handleSubmit);
    unbindPerson2Toggle();
  };

  const handleRunClick = () => {
    actualForm.requestSubmit();
  };

  const handleResetClick = () => {
    unbindCurrentForm();

    const refreshedHost = document.querySelector("#planForm");
    if (refreshedHost) {
      refreshedHost.innerHTML = renderPlanFormMarkup(DEFAULTS);
      actualForm = refreshedHost.querySelector("form");
      bindCurrentForm();
    }
  };

  bindCurrentForm();

  if (runButton) {
    runButton.addEventListener("click", handleRunClick);
  }

  if (resetButton) {
    resetButton.addEventListener("click", handleResetClick);
  }

  return {
    destroy() {
      unbindCurrentForm();

      if (runButton) {
        runButton.removeEventListener("click", handleRunClick);
      }

      if (resetButton) {
        resetButton.removeEventListener("click", handleResetClick);
      }
    }
  };
}