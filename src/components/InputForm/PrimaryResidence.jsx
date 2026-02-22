import NumericInput from './NumericInput.jsx';

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function mortgageAtDownsize(pr, years) {
  const remaining = pr.remainingMortgage ?? 0;
  const yearsLeft = pr.mortgageYearsLeft;
  if (!remaining || remaining <= 0) return 0;
  if (yearsLeft == null) return remaining; // no payoff info, use as-is
  if (years >= yearsLeft) return 0; // fully paid off by then
  return remaining * (1 - years / yearsLeft); // linear paydown approximation
}

function computeDownsizeEquity(pr, retirementAge, primaryAge) {
  const years = (pr.downsizeYear ?? (retirementAge - primaryAge));
  if (years <= 0) return 0;
  const appreciated = pr.currentValue * Math.pow(1 + (pr.appreciationRate ?? 0.03), years);
  const saleProceeds = appreciated * (1 - (pr.saleCostPct ?? 0.06));
  const targetAppreciated = (pr.downsizeTargetValue ?? 0) *
    Math.pow(1 + (pr.appreciationRate ?? 0.03), years);
  const newHomeCost = targetAppreciated * (1 + (pr.purchaseCostPct ?? 0.02));
  const mortgageOwed = mortgageAtDownsize(pr, years);
  return saleProceeds - mortgageOwed - newHomeCost;
}

export default function PrimaryResidence({
  primaryResidence,
  addPrimaryResidence,
  updatePrimaryResidence,
  clearPrimaryResidence,
  retirementAge,
  primaryAge,
}) {
  if (!primaryResidence) {
    return (
      <div className="windfall-section">
        <button type="button" className="add-pension-btn" onClick={addPrimaryResidence}>
          + Add Primary Residence
        </button>
        <span className="hint">
          Model equity release from downsizing your home at retirement
        </span>
      </div>
    );
  }

  const pr = primaryResidence;
  const downsizeYearDisplay = pr.downsizeYear ?? (retirementAge - primaryAge);
  const equity = computeDownsizeEquity(pr, retirementAge, primaryAge);

  return (
    <div className="windfall-section">
      <div className="windfall-card">
        <div className="windfall-card-header">
          <span className="earner-name-input" style={{ fontWeight: 600 }}>Primary Residence Downsize</span>
          <button
            type="button"
            className="remove-pension-btn"
            onClick={clearPrimaryResidence}
          >
            Remove
          </button>
        </div>

        <div className="form-grid">
          <label>
            Current Home Value
            <NumericInput
              value={pr.currentValue}
              onChange={(e) => updatePrimaryResidence('currentValue', Number(e.target.value))}
              min={0} step={10000}
            />
          </label>
          <label>
            Appreciation (%)
            <NumericInput
              value={(pr.appreciationRate * 100).toFixed(1)}
              onChange={(e) => updatePrimaryResidence('appreciationRate', Number(e.target.value) / 100)}
              min={0} max={15} step={0.5}
            />
          </label>
          <label>
            Remaining Mortgage
            <NumericInput
              value={pr.remainingMortgage}
              onChange={(e) => updatePrimaryResidence('remainingMortgage', Number(e.target.value))}
              min={0} step={5000}
            />
          </label>
          <label>
            Mortgage Paid Off In (yrs)
            <NumericInput
              value={pr.mortgageYearsLeft ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                updatePrimaryResidence('mortgageYearsLeft', val);
              }}
              min={0} max={40} step={1}
            />
            <span className="hint">
              {pr.mortgageYearsLeft != null
                ? (downsizeYearDisplay >= pr.mortgageYearsLeft
                  ? 'Paid off before downsize'
                  : `~${fmt(mortgageAtDownsize(pr, downsizeYearDisplay))} owed at downsize`)
                : 'Leave empty to use full balance'}
            </span>
          </label>
          <label>
            Downsize Target Value
            <NumericInput
              value={pr.downsizeTargetValue}
              onChange={(e) => updatePrimaryResidence('downsizeTargetValue', Number(e.target.value))}
              min={0} step={10000}
            />
            <span className="hint">
              What you'd buy today (appreciates same rate)
            </span>
          </label>
          <label>
            Downsize In (years)
            <NumericInput
              value={pr.downsizeYear ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                updatePrimaryResidence('downsizeYear', val);
              }}
              min={0} max={60} step={1}
            />
            <span className="hint">
              {pr.downsizeYear == null ? `At retirement (yr ${downsizeYearDisplay})` : ''}
            </span>
          </label>
          <label>
            Sale Costs (%)
            <NumericInput
              value={(pr.saleCostPct * 100).toFixed(0)}
              onChange={(e) => updatePrimaryResidence('saleCostPct', Number(e.target.value) / 100)}
              min={0} max={15} step={1}
            />
          </label>
          <label>
            Purchase Costs (%)
            <NumericInput
              value={(pr.purchaseCostPct * 100).toFixed(0)}
              onChange={(e) => updatePrimaryResidence('purchaseCostPct', Number(e.target.value) / 100)}
              min={0} max={10} step={1}
            />
          </label>
        </div>

        <div className="pension-preview" style={{ marginTop: '0.35rem' }}>
          <strong>Net equity at downsize (yr {downsizeYearDisplay}):</strong> {fmt(equity)}
          {equity < 0 && <span className="warning"> (negative — upsizing or underwater)</span>}
        </div>
      </div>
    </div>
  );
}
