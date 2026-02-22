import NumericInput from './NumericInput.jsx';

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function computeNetMonthly(prop) {
  const effectiveRent = prop.grossMonthlyRent * (1 - (prop.vacancyRate ?? 0.05));
  const maintenance = prop.grossMonthlyRent * (prop.maintenancePct ?? 0.10);
  const mortgage = prop.mortgagePayment ?? 0;
  return effectiveRent - maintenance - mortgage;
}

export default function RentalProperties({ properties, addProperty, updateProperty, removeProperty }) {
  if (properties.length === 0) {
    return (
      <div className="windfall-section">
        <button type="button" className="add-pension-btn" onClick={addProperty}>
          + Add Investment Property
        </button>
        <span className="hint">
          Rental income, property appreciation, and optional sale
        </span>
      </div>
    );
  }

  return (
    <div className="windfall-section">
      {properties.map((prop, i) => {
        const netMonthly = computeNetMonthly(prop);

        return (
          <div key={i} className="windfall-card">
            <div className="windfall-card-header">
              <input
                type="text"
                className="earner-name-input"
                value={prop.name}
                onChange={(e) => updateProperty(i, 'name', e.target.value)}
                placeholder={`Property ${i + 1} (e.g., Rental House)`}
              />
              <button
                type="button"
                className="remove-pension-btn"
                onClick={() => removeProperty(i)}
              >
                Remove
              </button>
            </div>

            <div className="form-grid">
              <label>
                Gross Monthly Rent
                <NumericInput
                  value={prop.grossMonthlyRent}
                  onChange={(e) => updateProperty(i, 'grossMonthlyRent', Number(e.target.value))}
                  min={0} step={100}
                />
              </label>
              <label>
                Monthly Mortgage
                <NumericInput
                  value={prop.mortgagePayment}
                  onChange={(e) => updateProperty(i, 'mortgagePayment', Number(e.target.value))}
                  min={0} step={100}
                />
              </label>
              <label>
                Maintenance (%)
                <NumericInput
                  value={(prop.maintenancePct * 100).toFixed(0)}
                  onChange={(e) => updateProperty(i, 'maintenancePct', Number(e.target.value) / 100)}
                  min={0} max={30} step={1}
                />
              </label>
              <label>
                Vacancy Rate (%)
                <NumericInput
                  value={(prop.vacancyRate * 100).toFixed(0)}
                  onChange={(e) => updateProperty(i, 'vacancyRate', Number(e.target.value) / 100)}
                  min={0} max={50} step={1}
                />
              </label>
              <label>
                Property Value
                <NumericInput
                  value={prop.currentValue}
                  onChange={(e) => updateProperty(i, 'currentValue', Number(e.target.value))}
                  min={0} step={10000}
                />
              </label>
              <label>
                Appreciation (%)
                <NumericInput
                  value={(prop.appreciationRate * 100).toFixed(1)}
                  onChange={(e) => updateProperty(i, 'appreciationRate', Number(e.target.value) / 100)}
                  min={0} max={15} step={0.5}
                />
              </label>
              <label>
                Mortgage Ends In (yrs)
                <NumericInput
                  value={prop.mortgageEndYears ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    updateProperty(i, 'mortgageEndYears', val);
                  }}
                  min={0} max={60} step={1}
                />
                <span className="hint">
                  Leave empty if no mortgage
                </span>
              </label>
              <label>
                Sell In (years)
                <NumericInput
                  value={prop.sellInYears ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    updateProperty(i, 'sellInYears', val);
                  }}
                  min={0} max={60} step={1}
                />
                <span className="hint">
                  Leave empty to hold indefinitely
                </span>
              </label>
              <label>
                Sale Costs (%)
                <NumericInput
                  value={(prop.sellCostPct * 100).toFixed(0)}
                  onChange={(e) => updateProperty(i, 'sellCostPct', Number(e.target.value) / 100)}
                  min={0} max={15} step={1}
                />
              </label>
            </div>

            <div className="pension-preview" style={{ marginTop: '0.35rem' }}>
              <strong>Net cash flow:</strong> {fmt(netMonthly)}/mo ({fmt(netMonthly * 12)}/yr)
              {netMonthly < 0 && <span className="warning"> (negative — costs exceed income)</span>}
              {prop.mortgageEndYears != null && prop.mortgagePayment > 0 && (
                <span className="hint" style={{ marginLeft: '0.5rem' }}>
                  Mortgage paid off yr {prop.mortgageEndYears} (+{fmt(prop.mortgagePayment)}/mo)
                </span>
              )}
              {prop.sellInYears != null && (
                <span className="hint" style={{ marginLeft: '0.5rem' }}>
                  Sale in yr {prop.sellInYears}: ~{fmt(prop.currentValue * Math.pow(1 + (prop.appreciationRate ?? 0.03), prop.sellInYears) * (1 - (prop.sellCostPct ?? 0.06)))} net
                </span>
              )}
            </div>
          </div>
        );
      })}

      <button type="button" className="add-pension-btn" onClick={addProperty}>
        + Add Another Property
      </button>
    </div>
  );
}
