import { useMemo } from 'react';
import { getAllocationFraction } from '../../engine/investment.js';
import NumericInput from './NumericInput.jsx';

const STRATEGY_OPTIONS = [
  { key: 'lifecycle', label: 'Lifecycle', desc: '20-yr taper' },
  { key: 'sigmoid', label: 'S-Curve', desc: 'Smooth transition' },
  { key: 'target-date', label: 'Target Date', desc: 'Sudden shift' },
  { key: 'none', label: 'Stay Aggressive', desc: 'No derisking' },
];

function GlidePreview({ strategy, kneeYear, steepness, totalYears }) {
  const w = 120;
  const h = 36;
  const points = useMemo(() => {
    const pts = [];
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const year = (i / n) * totalYears;
      const frac = getAllocationFraction(year, kneeYear, steepness, strategy);
      pts.push(`${(i / n) * w},${frac * h}`);
    }
    return pts;
  }, [strategy, kneeYear, steepness, totalYears]);

  return (
    <svg width={w} height={h} className="glide-preview" viewBox={`0 0 ${w} ${h}`}>
      <rect x={0} y={0} width={w} height={h} fill="#f0f4f8" rx={3} />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2"
      />
      <text x={2} y={10} fontSize={8} fill="#888">Aggr.</text>
      <text x={w - 28} y={h - 3} fontSize={8} fill="#888">Cons.</text>
    </svg>
  );
}

export default function StrategyStep({
  inputs,
  updateInput,
  updateNestedInput,
  setRiskPreset,
  effectiveKneeYear,
  totalYears,
}) {
  const preset = inputs.riskPreset;
  const strategy = inputs.investmentParams.strategy || 'lifecycle';
  const steepness = inputs.investmentParams.steepness ?? 0.5;

  return (
    <fieldset className="step-fieldset">
      <legend>Step 3: Investment Strategy</legend>

      <div className="risk-preset-group">
        <span className="risk-label">Risk Profile</span>
        <div className="risk-preset-buttons">
          {['conservative', 'moderate', 'aggressive'].map((p) => (
            <button
              key={p}
              type="button"
              className={`risk-preset-btn ${preset === p ? 'active' : ''}`}
              onClick={() => setRiskPreset(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <span className="hint">
          {preset === 'conservative' && 'Lifecycle derisking, lower equity return (9.5% / 16%)'}
          {preset === 'moderate' && 'Lifecycle derisking, market returns (10.5% / 16%)'}
          {preset === 'aggressive' && 'No derisking, stays equity-heavy (10.5% / 16%)'}
        </span>
      </div>

      <details>
        <summary>Advanced: Derisking & Customization</summary>

        <div className="strategy-section">
          <span className="risk-label">Derisking Strategy</span>
          <div className="strategy-options">
            {STRATEGY_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`strategy-btn ${strategy === opt.key ? 'active' : ''}`}
                onClick={() => updateNestedInput('investmentParams', 'strategy', opt.key)}
              >
                <GlidePreview
                  strategy={opt.key}
                  kneeYear={effectiveKneeYear}
                  steepness={steepness}
                  totalYears={totalYears}
                />
                <span className="strategy-label">{opt.label}</span>
                <span className="strategy-desc">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-grid" style={{ marginTop: '0.75rem' }}>
          <label>
            Aggressive Return (%)
            <NumericInput
              value={(inputs.investmentParams.highYieldRate * 100).toFixed(1)}
              onChange={(e) => updateNestedInput('investmentParams', 'highYieldRate', Number(e.target.value) / 100)}
              step={0.5}
            />
          </label>
          <label>
            Aggressive Volatility (%)
            <NumericInput
              value={(inputs.investmentParams.highYieldVolatility * 100).toFixed(1)}
              onChange={(e) => updateNestedInput('investmentParams', 'highYieldVolatility', Number(e.target.value) / 100)}
              step={0.5}
            />
          </label>
          <label>
            Conservative Return (%)
            <NumericInput
              value={(inputs.investmentParams.conservativeRate * 100).toFixed(1)}
              onChange={(e) => updateNestedInput('investmentParams', 'conservativeRate', Number(e.target.value) / 100)}
              step={0.5}
            />
          </label>
          <label>
            Conservative Volatility (%)
            <NumericInput
              value={(inputs.investmentParams.conservativeVolatility * 100).toFixed(1)}
              onChange={(e) => updateNestedInput('investmentParams', 'conservativeVolatility', Number(e.target.value) / 100)}
              step={0.5}
            />
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
              50/50 point{inputs.investmentParams.kneeYear == null && ' [auto]'}
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

        <div className="form-grid" style={{ marginTop: '0.75rem' }}>
          <label>
            Tail Weight (df)
            <NumericInput
              value={inputs.investmentParams.df ?? 5}
              onChange={(e) => updateNestedInput('investmentParams', 'df', Number(e.target.value))}
              min={3} max={30} step={1}
            />
            <span className="hint">
              Lower = fatter tails (more crashes/booms). 5 = financial standard, 30 = normal
            </span>
          </label>
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
        </div>
      </details>
    </fieldset>
  );
}
