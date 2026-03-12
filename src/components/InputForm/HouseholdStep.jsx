import { calculateFERS, calculateDeferredFERS, calculateSocialSecurity } from '../../engine/pensions.js';
import { estimateMonthlyPIA } from '../../engine/socialSecurity.js';
import NumericInput from './NumericInput.jsx';

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ── FERS sub-component ──────────────────────────────────────────

function FERSInputs({ earner, updateField }) {
  const fers = earner.fers;
  const isDeferred = fers.mode === 'deferred';

  const updateFERS = (key, value) => updateField('fers', { ...fers, [key]: value });

  // For active FERS, always use the earner's current salary and wage growth
  const fersCalc = isDeferred
    ? calculateDeferredFERS({ ...fers, currentAge: earner.currentAge })
    : calculateFERS({
        ...fers,
        currentSalary: earner.salary,
        wageGrowthRate: earner.wageGrowthRate,
        currentAge: earner.currentAge,
        retirementAge: earner.retirementAge,
      });

  return (
    <div className="pension-subsection">
      <div className="form-grid">
        <label>
          FERS Status
          <select
            value={fers.mode}
            onChange={(e) => {
              const mode = e.target.value;
              if (mode === 'deferred') {
                updateField('fers', {
                  mode: 'deferred',
                  highThree: fers.highThree || fers.currentSalary || 100000,
                  yearsOfService: fers.yearsOfService || fers.currentYearsOfService || 10,
                  collectionAge: fers.collectionAge || 62,
                  mra: fers.mra || 57,
                });
              } else {
                updateField('fers', {
                  mode: 'active',
                  currentSalary: earner.salary,
                  currentYearsOfService: fers.currentYearsOfService || fers.yearsOfService || 5,
                  mra: fers.mra || 57,
                });
              }
            }}
          >
            <option value="active">Active (Currently Employed)</option>
            <option value="deferred">Deferred (Separated)</option>
          </select>
        </label>
      </div>

      {isDeferred ? (
        <div className="form-grid">
          <label>
            High-3 Salary
            <NumericInput value={fers.highThree} onChange={(e) => updateFERS('highThree', Number(e.target.value))} step={1000} />
          </label>
          <label>
            Years of Service
            <NumericInput value={fers.yearsOfService} onChange={(e) => updateFERS('yearsOfService', Number(e.target.value))} min={0} />
          </label>
          <label>
            Collection Age
            <NumericInput value={fers.collectionAge} onChange={(e) => updateFERS('collectionAge', Number(e.target.value))} min={earner.currentAge} max={70} />
            <span className="hint">57 (MRA) = reduced; 62+ = unreduced</span>
          </label>
          <label>
            MRA
            <NumericInput value={fers.mra} onChange={(e) => updateFERS('mra', Number(e.target.value))} min={55} max={62} />
          </label>
        </div>
      ) : (
        <div className="form-grid">
          <label>
            Years of Service (now)
            <NumericInput value={fers.currentYearsOfService} onChange={(e) => updateFERS('currentYearsOfService', Number(e.target.value))} min={0} />
          </label>
          <label>
            MRA
            <NumericInput value={fers.mra} onChange={(e) => updateFERS('mra', Number(e.target.value))} min={55} max={62} />
          </label>
          {fersCalc && !fersCalc.immediateEligible && (
            <label>
              Collection Age
              <NumericInput
                value={fers.collectionAge || 62}
                onChange={(e) => updateFERS('collectionAge', Number(e.target.value))}
                min={fers.mra || 57} max={70}
              />
              <span className="hint">Not eligible for immediate retirement</span>
            </label>
          )}
        </div>
      )}

      {!isDeferred && (
        <label className="checkbox-label" style={{ marginTop: '0.5rem' }}>
          <input
            type="checkbox"
            checked={!!fers.survivorBenefitElected}
            onChange={(e) => updateFERS('survivorBenefitElected', e.target.checked)}
          />
          Survivor benefit elected
          <span className="info-icon" data-tip="Reduces your FERS annuity by 10% during your lifetime. After your death, your spouse receives 50% of your full (unreduced) annuity.">i</span>
        </label>
      )}

      {fersCalc && (() => {
        const yearsToCollection = fersCalc.startAge - earner.currentAge;
        const meanInflation = 0.03;
        const todayDollars = fersCalc.annualAmount / Math.pow(1 + meanInflation, yearsToCollection);

        return (
          <div className="pension-preview">
            <div>
              <strong>FERS:</strong> {fmt(fers.survivorBenefitElected ? fersCalc.annualAmount * 0.90 : fersCalc.annualAmount)}/yr starting at age {fersCalc.startAge}
              {fersCalc.isReduced && (
                <span className="warning"> (reduced {(fersCalc.reductionPct * 100).toFixed(0)}%)</span>
              )}
              {!isDeferred && fers.survivorBenefitElected && (
                <span className="hint"> · survivor benefit elected</span>
              )}
            </div>
            <div className="hint" style={{ marginTop: '0.25rem' }}>
              {!isDeferred && (
                <>
                  {fersCalc.totalYearsOfService} total years of service |
                  Projected high-3: {fmt(fersCalc.high3)} |{' '}
                </>
              )}
              In today&apos;s dollars: ~{fmt(todayDollars)}/yr
              {fersCalc.immediateEligible && ' (immediate)'}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Social Security sub-component ───────────────────────────────

function SSInputs({ earner, updateField }) {
  const ss = earner.socialSecurity;
  const updateSS = (key, value) => updateField('socialSecurity', { ...ss, [key]: value });
  const ssCalc = calculateSocialSecurity(ss);

  return (
    <div className="pension-subsection">
      <div className="form-grid">
        <label>
          Monthly Benefit at FRA
          <NumericInput value={ss.monthlyBenefitAtFRA} onChange={(e) => updateSS('monthlyBenefitAtFRA', Number(e.target.value))} step={100} />
        </label>
        <label>
          Claiming Age (62-70)
          <NumericInput value={ss.claimingAge} onChange={(e) => updateSS('claimingAge', Number(e.target.value))} min={62} max={70} />
        </label>
        <label>
          Full Retirement Age
          <NumericInput value={ss.fullRetirementAge} onChange={(e) => updateSS('fullRetirementAge', Number(e.target.value))} min={65} max={70} />
        </label>
      </div>
      <div className="pension-preview">
        <strong>SS:</strong> {fmt(ssCalc.annualAmount)}/yr starting at age {ssCalc.startAge}
        {' '}({(ssCalc.adjustmentFactor * 100).toFixed(1)}% of FRA benefit, CPI-adjusted)
      </div>
    </div>
  );
}

// ── Generic Pension sub-component ───────────────────────────────

function GenericPensionItem({ pension, onUpdate, onRemove }) {
  const colaMode = pension.inflationAdjusted ? 'cpi' : pension.colaRate > 0 ? 'fixed' : 'none';

  return (
    <div className="pension-subsection">
      <div className="pension-item-header">
        <span>Pension: {fmt(pension.annualAmount)}/yr at age {pension.startAge}</span>
        <button type="button" className="remove-pension-btn" onClick={onRemove}>Remove</button>
      </div>
      <div className="form-grid">
        <label>
          Annual Amount
          <NumericInput value={pension.annualAmount} onChange={(e) => onUpdate({ annualAmount: Number(e.target.value) })} step={1000} min={0} />
        </label>
        <label>
          Start Age
          <NumericInput value={pension.startAge} onChange={(e) => onUpdate({ startAge: Number(e.target.value) })} min={40} max={85} />
        </label>
        <label>
          Adjustment
          <select value={colaMode} onChange={(e) => {
            if (e.target.value === 'cpi') onUpdate({ inflationAdjusted: true, colaRate: 0 });
            else if (e.target.value === 'fixed') onUpdate({ inflationAdjusted: false, colaRate: 0.02 });
            else onUpdate({ inflationAdjusted: false, colaRate: 0 });
          }}>
            <option value="none">Fixed (No COLA)</option>
            <option value="cpi">CPI-Linked</option>
            <option value="fixed">Fixed COLA Rate</option>
          </select>
        </label>
        {colaMode === 'fixed' && (
          <label>
            COLA Rate (%)
            <NumericInput value={(pension.colaRate * 100).toFixed(1)} onChange={(e) => onUpdate({ colaRate: Number(e.target.value) / 100 })} step={0.5} min={0} max={10} />
          </label>
        )}
      </div>
    </div>
  );
}

// ── Defined Benefit sub-component ───────────────────────────────

function DBPensionItem({ pension, onUpdate, onRemove }) {
  const colaMode = pension.inflationAdjusted ? 'cpi' : pension.colaRate > 0 ? 'fixed' : 'none';
  const computed = pension.yearsOfService * pension.multiplier * pension.finalAvgSalary;

  return (
    <div className="pension-subsection">
      <div className="pension-item-header">
        <span>DB Pension: {fmt(computed)}/yr at age {pension.startAge}</span>
        <button type="button" className="remove-pension-btn" onClick={onRemove}>Remove</button>
      </div>
      <div className="form-grid">
        <label>
          Years of Service
          <NumericInput value={pension.yearsOfService} onChange={(e) => onUpdate({ yearsOfService: Number(e.target.value) })} min={0} max={50} />
        </label>
        <label>
          Multiplier (%)
          <NumericInput value={(pension.multiplier * 100).toFixed(2)} onChange={(e) => onUpdate({ multiplier: Number(e.target.value) / 100 })} step={0.1} min={0} max={5} />
        </label>
        <label>
          Final Avg Salary
          <NumericInput value={pension.finalAvgSalary} onChange={(e) => onUpdate({ finalAvgSalary: Number(e.target.value) })} step={5000} min={0} />
        </label>
        <label>
          Start Age
          <NumericInput value={pension.startAge} onChange={(e) => onUpdate({ startAge: Number(e.target.value) })} min={40} max={85} />
        </label>
        <label>
          Adjustment
          <select value={colaMode} onChange={(e) => {
            if (e.target.value === 'cpi') onUpdate({ inflationAdjusted: true, colaRate: 0 });
            else if (e.target.value === 'fixed') onUpdate({ inflationAdjusted: false, colaRate: 0.02 });
            else onUpdate({ inflationAdjusted: false, colaRate: 0 });
          }}>
            <option value="none">Fixed (No COLA)</option>
            <option value="cpi">CPI-Linked</option>
            <option value="fixed">Fixed COLA Rate</option>
          </select>
        </label>
        {colaMode === 'fixed' && (
          <label>
            COLA Rate (%)
            <NumericInput value={(pension.colaRate * 100).toFixed(1)} onChange={(e) => onUpdate({ colaRate: Number(e.target.value) / 100 })} step={0.5} min={0} max={10} />
          </label>
        )}
      </div>
    </div>
  );
}

// ── Main HouseholdStep ──────────────────────────────────────────

export default function HouseholdStep({ inputs, updateEarner, addEarner, removeEarner, totalPortfolio }) {
  return (
    <fieldset className="step-fieldset">
      <legend>
        Step 1: Who's Planning?
        <span className="info-icon" data-tip="Add each earner in your household. Set their age, salary, savings rate, and any pensions (FERS, Social Security, etc.). Portfolio values are combined for the simulation.">i</span>
      </legend>

      <div className="household-summary">
        Total household portfolio: <strong>{fmt(totalPortfolio)}</strong>
      </div>

      {inputs.earners.map((earner, index) => {
        const updateField = (key, value) => updateEarner(index, key, value);

        const updateGenericPension = (pi, updates) => {
          const pensions = [...(earner.genericPensions || [])];
          pensions[pi] = { ...pensions[pi], ...updates };
          updateField('genericPensions', pensions);
        };
        const addGenericPension = () => {
          const pensions = [...(earner.genericPensions || [])];
          pensions.push({ annualAmount: 12000, startAge: 65, inflationAdjusted: false, colaRate: 0 });
          updateField('genericPensions', pensions);
        };
        const removeGenericPension = (pi) => {
          updateField('genericPensions', (earner.genericPensions || []).filter((_, i) => i !== pi));
        };

        const updateDBPension = (pi, updates) => {
          const pensions = [...(earner.dbPensions || [])];
          pensions[pi] = { ...pensions[pi], ...updates };
          updateField('dbPensions', pensions);
        };
        const addDBPension = () => {
          const pensions = [...(earner.dbPensions || [])];
          pensions.push({ yearsOfService: 20, multiplier: 0.02, finalAvgSalary: 75000, startAge: 62, inflationAdjusted: false, colaRate: 0.02 });
          updateField('dbPensions', pensions);
        };
        const removeDBPension = (pi) => {
          updateField('dbPensions', (earner.dbPensions || []).filter((_, i) => i !== pi));
        };

        return (
          <div key={index} className="earner-card">
            <div className="earner-card-header">
              <input
                type="text"
                className="earner-name-input"
                value={earner.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
              {inputs.earners.length > 1 && index > 0 && (
                <button type="button" className="remove-earner-btn" onClick={() => removeEarner(index)}>
                  Remove
                </button>
              )}
            </div>

            <div className="form-grid">
              <label>
                Age
                <NumericInput
                  value={earner.currentAge}
                  onChange={(e) => updateField('currentAge', Number(e.target.value))}
                  min={18} max={80}
                />
              </label>
              <label>
                Portfolio
                <NumericInput
                  value={earner.portfolio}
                  onChange={(e) => updateField('portfolio', Number(e.target.value))}
                  step={5000} min={0}
                />
              </label>
              <label>
                Annual Income
                <NumericInput
                  value={earner.salary}
                  onChange={(e) => updateField('salary', Number(e.target.value))}
                  step={5000} min={0}
                />
              </label>
              <label>
                Savings Rate (%)
                <NumericInput
                  value={(earner.savingsRate * 100).toFixed(0)}
                  onChange={(e) => updateField('savingsRate', Number(e.target.value) / 100)}
                  min={0} max={100} step={5}
                />
                <span className="hint">Saving {fmt(earner.salary * earner.savingsRate)}/yr</span>
              </label>
              <label>
                Retirement Age
                <NumericInput
                  value={earner.retirementAge}
                  onChange={(e) => updateField('retirementAge', Number(e.target.value))}
                  min={earner.currentAge + 1} max={80}
                />
              </label>
              <label>
                Plan Through Age
                <NumericInput
                  value={earner.deathAge || 95}
                  onChange={(e) => updateField('deathAge', Number(e.target.value))}
                  min={earner.retirementAge + 1} max={110}
                />
              </label>
            </div>

            <details className="earner-advanced">
              <summary>Advanced: Growth, Pensions & Benefits</summary>

              <div className="form-grid" style={{ marginTop: '0.5rem' }}>
                <label>
                  Wage Growth (%)
                  <NumericInput
                    value={(earner.wageGrowthRate * 100).toFixed(1)}
                    onChange={(e) => updateField('wageGrowthRate', Number(e.target.value) / 100)}
                    step={0.5}
                  />
                  <span className="hint">
                    {(() => {
                      const cpi = inputs.inflationParams?.meanInflation ?? 0.03;
                      const diff = ((earner.wageGrowthRate - cpi) * 100).toFixed(1);
                      return `CPI ${diff >= 0 ? '+' : ''}${diff}% real · Moves with simulated CPI`;
                    })()}
                  </span>
                </label>
              </div>

              {/* FERS */}
              <div className="pension-toggle">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={!!earner.fers}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateField('fers', {
                          mode: 'active',
                          currentSalary: earner.salary,
                          currentYearsOfService: 5,
                          wageGrowthRate: earner.wageGrowthRate,
                          mra: 57,
                        });
                      } else {
                        updateField('fers', null);
                      }
                    }}
                  />
                  FERS Pension
                </label>
                {earner.fers && <FERSInputs earner={earner} updateField={updateField} />}
              </div>

              {/* Social Security */}
              <div className="pension-toggle">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={!!earner.socialSecurity}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const estimated = estimateMonthlyPIA(
                          earner.salary,
                          earner.currentAge,
                          earner.wageGrowthRate
                        );
                        updateField('socialSecurity', {
                          monthlyBenefitAtFRA: Math.round(estimated / 100) * 100,
                          claimingAge: 67,
                          fullRetirementAge: 67,
                        });
                      } else {
                        updateField('socialSecurity', null);
                      }
                    }}
                  />
                  Social Security
                </label>
                {earner.socialSecurity && <SSInputs earner={earner} updateField={updateField} />}
              </div>

              {/* Generic Pensions */}
              <div className="pension-section-group">
                <div className="pension-section-header">Pensions & Annuities</div>
                {(earner.genericPensions || []).map((gp, pi) => (
                  <GenericPensionItem
                    key={pi}
                    pension={gp}
                    onUpdate={(u) => updateGenericPension(pi, u)}
                    onRemove={() => removeGenericPension(pi)}
                  />
                ))}
                <button type="button" className="add-pension-btn" onClick={addGenericPension}>
                  + Add Pension / Annuity
                </button>
              </div>

              {/* DB Pensions */}
              <div className="pension-section-group">
                <div className="pension-section-header">Defined Benefit Pensions</div>
                {(earner.dbPensions || []).map((db, pi) => (
                  <DBPensionItem
                    key={pi}
                    pension={db}
                    onUpdate={(u) => updateDBPension(pi, u)}
                    onRemove={() => removeDBPension(pi)}
                  />
                ))}
                <button type="button" className="add-pension-btn" onClick={addDBPension}>
                  + Add DB Pension
                </button>
              </div>
            </details>
          </div>
        );
      })}

      <button type="button" className="add-earner-btn" onClick={addEarner}>
        + Add Earner / Partner
      </button>
    </fieldset>
  );
}
