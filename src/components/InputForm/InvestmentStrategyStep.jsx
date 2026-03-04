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
          <span>Before Retirement <InfoIcon tip="Growth-phase allocation while you're still working and saving. Higher return means higher volatility." /></span>
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
          <span>In Retirement <InfoIcon tip="Drawdown-phase allocation after you stop working. Lower volatility protects against sequence-of-returns risk." /></span>
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
          <span>Derisk over (years) <InfoIcon tip="How many years to gradually shift from your growth allocation to your conservative allocation. Set to 0 to stay aggressive until retirement." /></span>
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
          <span>Derisked by year <InfoIcon tip="The year from now when the portfolio finishes shifting to its conservative allocation. Defaults to your retirement year." /></span>
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
              min={100} max={5000} step={100}
            />
            <span className="hint">
              ±{(1.96 * Math.sqrt(0.09 / inputs.numRuns) * 100).toFixed(1)}% margin of error (95% CI)
            </span>
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
        </div>
      </details>
    </fieldset>
  );
}
