function renderPlanFormMarkup(values = DEFAULTS) {
  const people = Array.isArray(values.people) && values.people.length >= 2
    ? values.people
    : DEFAULTS.people;

  return `
    <form class="plan-form" novalidate>
      <div class="plan-form-grid">

        <section class="plan-form-section plan-form-section-wide">
          <h4 class="plan-form-section-title">Fixed income</h4>
          <div class="people-grid">
            ${renderPersonCard(people[0], 0)}
            ${renderPersonCard(people[1], 1)}
          </div>
        </section>

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

      </div>
    </form>
  `;
}