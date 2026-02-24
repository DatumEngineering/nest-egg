import { useMemo } from 'react';
import { BEFORE_PRESETS, AFTER_PRESETS } from '../../engine/investment.js';
import NumericInput from './NumericInput.jsx';

const InfoIcon = ({ tip }) => (
  <span className="info-icon" data-tip={tip}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  </span>
);

const STRATEGY_OPTIONS = [
  { key: 'lifecycle', label: 'Lifecycle (20-yr taper)' },
  { key: 'sigmoid', label: 'S-Curve (smooth transition)' },
  { key: 'target-date', label: 'Target Date (sudden shift)' },
  { key: 'none', label: 'None (stay aggressive)' },
];

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
  const strategy = params.strategy || 'lifecycle';
  const steepness = params.steepness ?? 0.5;

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

      <details>
        <summary>
          Advanced: Returns & Derisking
          <InfoIcon tip="Fine-tune return assumptions and how the portfolio transitions from aggressive to conservative over time." />
        </summary>

        <div className="form-grid" style={{ marginTop: '0.75rem' }}>
          <label>
            Before: Return (%)
            <NumericInput
              value={(params.highYieldRate * 100).toFixed(1)}
              onChange={(e) => updateNestedInput('investmentParams', 'highYieldRate', Number(e.target.value) / 100)}
              step={0.5}
            />
          </label>
          <label>
            Before: Volatility (%)
            <NumericInput
              value={(params.highYieldVolatility * 100).toFixed(1)}
              onChange={(e) => updateNestedInput('investmentParams', 'highYieldVolatility', Number(e.target.value) / 100)}
              step={0.5}
            />
          </label>
          <label>
            After: Return (%)
            <NumericInput
              value={(params.conservativeRate * 100).toFixed(1)}
              onChange={(e) => updateNestedInput('investmentParams', 'conservativeRate', Number(e.target.value) / 100)}
              step={0.5}
            />
          </label>
          <label>
            After: Volatility (%)
            <NumericInput
              value={(params.conservativeVolatility * 100).toFixed(1)}
              onChange={(e) => updateNestedInput('investmentParams', 'conservativeVolatility', Number(e.target.value) / 100)}
              step={0.5}
            />
          </label>
        </div>

        <div className="form-grid" style={{ marginTop: '0.75rem' }}>
          <label>
            Derisking Strategy
            <select
              value={strategy}
              onChange={(e) => updateNestedInput('investmentParams', 'strategy', e.target.value)}
            >
              {STRATEGY_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
            <span className="hint">
              How the portfolio transitions from before-retirement to in-retirement allocation
            </span>
          </label>
          <label>
            Knee Year
            <NumericInput
              value={effectiveKneeYear}
              onChange={(e) => {
                const val = Number(e.target.value);
                const auto = Math.max(1, inputs.retirementAge - (inputs.earners?.[0]?.currentAge ?? 30) - 10);
                updateNestedInput('investmentParams', 'kneeYear', val === auto ? null : val);
              }}
              min={1} max={50}
            />
            <span className="hint">
              50/50 point{params.kneeYear == null && ' [auto]'}
            </span>
          </label>
          {strategy === 'sigmoid' && (
            <label>
              Steepness
              <NumericInput
                value={steepness}
                onChange={(e) => updateNestedInput('investmentParams', 'steepness', Number(e.target.value))}
                step={0.1} min={0.1} max={2}
              />
            </label>
          )}
        </div>
      </details>

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
        </div>
      </details>
    </fieldset>
  );
}
