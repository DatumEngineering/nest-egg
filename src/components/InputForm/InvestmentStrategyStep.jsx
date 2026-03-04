import { useMemo } from 'react';
import { BEFORE_PRESETS, AFTER_PRESETS } from '../../engine/investment.js';
import NumericInput from './NumericInput.jsx';

const InfoIcon = ({ tip }) => (
  <span className="info-icon" data-tip={tip}>ⓘ</span>
);

function detectBeforePreset(params) {
  for (const [key, preset] of Object.entries(BEFORE_PRESETS)) {
    if (
      Math.abs(params.highYieldRate - preset.rate) < 0.001 &&
      Math.abs(params.highYieldVolatility - preset.volatility) < 0.001
    ) {
      return key;
    }
  }
  return 'custom';
}

function detectAfterPreset(params) {
  for (const [key, preset] of Object.entries(AFTER_PRESETS)) {
    if (
      Math.abs(params.conservativeRate - preset.rate) < 0.001 &&
      Math.abs(params.conservativeVolatility - preset.volatility) < 0.001
    ) {
      return key;
    }
  }
  return 'custom';
}

export default function InvestmentStrategyStep({
  inputs,
  updateInput,
  updateNestedInput,
  effectiveKneeYear,
  totalYears,
}) {
  const params = inputs.investmentParams;

  const beforeKey = useMemo(() => detectBeforePreset(params), [params]);
  const afterKey = useMemo(() => detectAfterPreset(params), [params]);

  const handleBeforeChange = (e) => {
    const key = e.target.value;
    if (key === 'custom') return;
    const preset = BEFORE_PRESETS[key];
    updateInput('investmentParams', {
      ...params,
      highYieldRate: preset.rate,
      highYieldVolatility: preset.volatility,
    });
  };

  const handleAfterChange = (e) => {
    const key = e.target.value;
    if (key === 'custom') return;
    const preset = AFTER_PRESETS[key];
    updateInput('investmentParams', {
      ...params,
      conservativeRate: preset.rate,
      conservativeVolatility: preset.volatility,
    });
  };

  return (
    <fieldset className="step-fieldset">
      <legend>
        Step 4: Investment Strategy
        <InfoIcon tip="Choose how aggressively to invest before and after retirement. The simulation transitions between these allocations using the derisking strategy." />
      </legend>

      <div className="form-grid risk-dropdowns">
        <label>
          Before Retirement
          <InfoIcon tip="Growth-phase allocation while you're still working and saving. Higher return means higher volatility." />
          <select value={beforeKey} onChange={handleBeforeChange}>
            {Object.entries(BEFORE_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>{preset.label}</option>
            ))}
            {beforeKey === 'custom' && (
              <option value="custom">(Custom)</option>
            )}
          </select>
        </label>

        <label>
          In Retirement
          <InfoIcon tip="Drawdown-phase allocation after you stop working. Lower volatility protects against sequence-of-returns risk." />
          <select value={afterKey} onChange={handleAfterChange}>
            {Object.entries(AFTER_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>{preset.label}</option>
            ))}
            {afterKey === 'custom' && (
              <option value="custom">(Custom)</option>
            )}
          </select>
        </label>
      </div>

      <div className="form-grid" style={{ marginTop: '0.75rem' }}>
        <label>
          Derisk over (years)
          <InfoIcon tip="How many years to gradually shift from your growth allocation to your conservative allocation, ending at the knee year. Set to 0 to stay aggressive until retirement." />
          <NumericInput
            value={params.deriskYears ?? 20}
            onChange={(e) => updateNestedInput('investmentParams', 'deriskYears', Number(e.target.value))}
            min={0} max={50} step={5}
          />
          <span className="hint">
            {(params.deriskYears ?? 20) === 0
              ? 'Stays at growth allocation until retirement.'
              : `Shifts to conservative over ${params.deriskYears ?? 20} years ending at retirement.`}
          </span>
        </label>
        <label>
          Knee year
          <InfoIcon tip="The year (from now) when the portfolio reaches its full conservative allocation. Defaults to your retirement year." />
          <NumericInput
            value={effectiveKneeYear}
            onChange={(e) => {
              const val = Number(e.target.value);
              const auto = Math.max(1, inputs.retirementAge - (inputs.earners?.[0]?.currentAge ?? 30));
              updateNestedInput('investmentParams', 'kneeYear', val === auto ? null : val);
            }}
            min={1} max={totalYears}
          />
          <span className="hint">
            Full conservative allocation at year {effectiveKneeYear}{params.kneeYear == null && ' [auto = retirement]'}
          </span>
        </label>
      </div>

      <details>
        <summary>Advanced: Simulation Settings</summary>
        <div className="form-grid" style={{ marginTop: '0.5rem' }}>
          <label>
            Simulation Runs
            <NumericInput
              value={inputs.numRuns}
              onChange={(e) => updateInput('numRuns', Number(e.target.value))}
              min={100} max={10000} step={100}
            />
          </label>
          <label>
            Confidence Target (%)
            <NumericInput
              value={(inputs.confidenceTarget * 100).toFixed(0)}
              onChange={(e) => updateInput('confidenceTarget', Number(e.target.value) / 100)}
              min={50} max={99} step={5}
            />
          </label>
          <label>
            Tail Weight (df)
            <NumericInput
              value={params.df ?? 5}
              onChange={(e) => updateNestedInput('investmentParams', 'df', Number(e.target.value))}
              min={3} max={30} step={1}
            />
            <span className="hint">
              Lower = fatter tails (more crashes/booms). 5 = financial standard, 30 = normal
            </span>
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!inputs.guardrailsEnabled}
                onChange={(e) => updateInput('guardrailsEnabled', e.target.checked)}
              />
              Spending Guardrails (Guyton-Klinger)
            </label>
            <span className="hint">Adjusts spending ±10% when withdrawal rate drifts beyond thresholds. Models realistic spending flexibility.</span>
          </label>
          {inputs.guardrailsEnabled && (<>
            <label>
              Upper Guardrail (%)
              <NumericInput
                value={((inputs.upperGuardrail ?? 0.25) * 100).toFixed(0)}
                onChange={(e) => updateInput('upperGuardrail', Number(e.target.value) / 100)}
                min={5} max={50} step={5}
              />
              <span className="hint">Cut spending 10% if withdrawal rate rises this far above initial</span>
            </label>
            <label>
              Lower Guardrail (%)
              <NumericInput
                value={((inputs.lowerGuardrail ?? 0.25) * 100).toFixed(0)}
                onChange={(e) => updateInput('lowerGuardrail', Number(e.target.value) / 100)}
                min={5} max={50} step={5}
              />
              <span className="hint">Raise spending 10% if withdrawal rate drops this far below initial</span>
            </label>
            <label>
              Spending Floor (%)
              <NumericInput
                value={((inputs.spendingFloor ?? 0.85) * 100).toFixed(0)}
                onChange={(e) => updateInput('spendingFloor', Number(e.target.value) / 100)}
                min={50} max={100} step={5}
              />
              <span className="hint">Never spend less than this % of original plan</span>
            </label>
            <label>
              Spending Ceiling (%)
              <NumericInput
                value={((inputs.spendingCeiling ?? 1.20) * 100).toFixed(0)}
                onChange={(e) => updateInput('spendingCeiling', Number(e.target.value) / 100)}
                min={100} max={200} step={5}
              />
              <span className="hint">Never spend more than this % of original plan</span>
            </label>
          </>)}
          <label style={{ gridColumn: '1 / -1' }}>
            Survivor Expense Fraction (%)
            <NumericInput
              value={((inputs.survivorExpenseFraction ?? 0.75) * 100).toFixed(0)}
              onChange={(e) => updateInput('survivorExpenseFraction', Number(e.target.value) / 100)}
              min={50} max={100} step={5}
            />
            <span className="hint">
              When one partner dies (and both are retired), expenses drop to this % of the couple total. Only affects multi-earner plans. Default 75%.
            </span>
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!inputs.stressShockEnabled}
                onChange={(e) => updateInput('stressShockEnabled', e.target.checked)}
              />
              Market Stress Shock
              <InfoIcon tip="Force a single-year crash at a specific year to stress-test sequence-of-returns risk. All 1000 simulation runs will experience the crash in that year." />
            </label>
            <span className="hint">Pin a crash to one year across all runs — useful for testing worst-case timing scenarios.</span>
          </label>
          {inputs.stressShockEnabled && (<>
            <label>
              Shock Year (from now)
              <NumericInput
                value={inputs.stressShockYear ?? 15}
                onChange={(e) => updateInput('stressShockYear', Number(e.target.value))}
                min={0} max={totalYears - 1} step={1}
              />
              <span className="hint">0 = this year, 15 = 15 years from now</span>
            </label>
            <label>
              Crash Magnitude (%)
              <NumericInput
                value={((inputs.stressShockMagnitude ?? -0.30) * 100).toFixed(0)}
                onChange={(e) => updateInput('stressShockMagnitude', Number(e.target.value) / 100)}
                min={-80} max={-5} step={5}
              />
              <span className="hint">Portfolio loss that year. −30% is a typical bear market; −50% is 2008-level.</span>
            </label>
          </>)}
        </div>
      </details>
    </fieldset>
  );
}
