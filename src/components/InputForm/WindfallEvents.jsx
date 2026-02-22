import NumericInput from './NumericInput.jsx';

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function WindfallEvents({ events, addWindfall, updateWindfall, removeWindfall }) {
  if (events.length === 0) {
    return (
      <div className="windfall-section">
        <button type="button" className="add-pension-btn" onClick={addWindfall}>
          + Add Windfall Event
        </button>
        <span className="hint">
          Inheritance, company equity, property sale, or other one-time cash events
        </span>
      </div>
    );
  }

  return (
    <div className="windfall-section">
      {events.map((event, i) => (
        <div key={i} className="windfall-card">
          <div className="windfall-card-header">
            <input
              type="text"
              className="earner-name-input"
              value={event.name}
              onChange={(e) => updateWindfall(i, 'name', e.target.value)}
              placeholder={`Event ${i + 1} (e.g., Inheritance)`}
            />
            <button
              type="button"
              className="remove-pension-btn"
              onClick={() => removeWindfall(i)}
            >
              Remove
            </button>
          </div>

          <div className="form-grid">
            <label>
              Amount (gross)
              <NumericInput
                value={event.amount}
                onChange={(e) => updateWindfall(i, 'amount', Number(e.target.value))}
                min={0} step={5000}
              />
            </label>
            <label>
              Tax Rate (%)
              <NumericInput
                value={(event.taxRate * 100).toFixed(0)}
                onChange={(e) => updateWindfall(i, 'taxRate', Number(e.target.value) / 100)}
                min={0} max={50} step={1}
              />
              <span className="hint">
                Net: {fmt(event.amount * (1 - event.taxRate))}
              </span>
            </label>
            <label>
              Expected In (years)
              <NumericInput
                value={event.yearsFromNow}
                onChange={(e) => updateWindfall(i, 'yearsFromNow', Number(e.target.value))}
                min={0} max={60} step={1}
              />
            </label>
            <label>
              Timing Uncertainty (yrs)
              <NumericInput
                value={event.stdDev}
                onChange={(e) => updateWindfall(i, 'stdDev', Number(e.target.value))}
                min={0} max={20} step={1}
              />
              <span className="hint">
                Standard deviation on arrival
              </span>
            </label>
            <label>
              Probability (%)
              <NumericInput
                value={(event.probability * 100).toFixed(0)}
                onChange={(e) => updateWindfall(i, 'probability', Number(e.target.value) / 100)}
                min={0} max={100} step={5}
              />
            </label>
          </div>
        </div>
      ))}

      <button type="button" className="add-pension-btn" onClick={addWindfall}>
        + Add Another Event
      </button>
    </div>
  );
}
