import blsData from '../../data/blsExpenses.json';
import NumericInput from './NumericInput.jsx';

const metroOptions = Object.entries(blsData.metros)
  .sort((a, b) => b[1].multiplier - a[1].multiplier);

const tierOptions = Object.entries(blsData.colMultipliers);

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const InfoIcon = ({ tip }) => (
  <span className="info-icon" data-tip={tip}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  </span>
);

export default function RetirementVisionStep({ inputs, updateInput, setLocation }) {
  const expenses = inputs.expenses;
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const updateExpense = (index, key, value) => {
    const updated = expenses.map((e, i) =>
      i === index ? { ...e, [key]: value } : e
    );
    updateInput('expenses', updated);
  };

  const handleMetroChange = (e) => {
    const value = e.target.value;
    let multiplier = 1.0;
    if (blsData.metros[value]) {
      multiplier = blsData.metros[value].multiplier;
    } else if (blsData.colMultipliers[value]) {
      multiplier = blsData.colMultipliers[value];
    }
    setLocation(value, multiplier);
  };

  return (
    <fieldset className="step-fieldset">
      <legend>
        Step 2: Retirement Vision
        <InfoIcon tip="Define where you'll live and how much you'll spend in retirement. Expenses are pre-filled from BLS data for 65+ households, adjusted by location." />
      </legend>

      <div className="vision-section">
        <h4>Where do you see yourself in retirement?</h4>
        <div className="form-grid">
          <label>
            Location
            <select value={inputs.selectedMetro} onChange={handleMetroChange}>
              <optgroup label="By Cost Tier">
                {tierOptions.map(([name]) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </optgroup>
              <optgroup label="By Metro Area">
                {metroOptions.map(([name, data]) => (
                  <option key={name} value={name}>
                    {name} ({(data.multiplier * 100).toFixed(0)}%)
                  </option>
                ))}
              </optgroup>
            </select>
            <span className="hint">
              Selecting a location adjusts expense amounts below
            </span>
          </label>
        </div>
      </div>

      <details className="vision-section" open>
        <summary className="expense-summary">
          Annual Retirement Expenses: <strong>{fmt(total)}</strong>
          <span className="hint" style={{ marginLeft: '0.5rem' }}>
            {inputs.selectedMetro}
            {inputs.earners.length > 1 && ` / ${inputs.earners.length} people`}
          </span>
          <InfoIcon tip="National averages from BLS Consumer Expenditure Survey (2023, 65+ households), adjusted by BEA Regional Price Parities and C2ER Cost of Living Index." />
        </summary>

        <table className="expense-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount / yr</th>
              <th>Infl. %</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense, i) => (
              <tr key={expense.key}>
                <td>{expense.label}</td>
                <td>
                  <NumericInput
                    value={expense.amount}
                    onChange={(e) => updateExpense(i, 'amount', Number(e.target.value))}
                    step={500} min={0}
                  />
                </td>
                <td>
                  <NumericInput
                    value={(expense.inflationRate * 100).toFixed(1)}
                    onChange={(e) => updateExpense(i, 'inflationRate', Number(e.target.value) / 100)}
                    step={0.5} min={0} max={15}
                    className="inflation-input"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <details>
        <summary>
          Advanced: Tax & Inflation
          <InfoIcon tip="Set your effective tax rate and inflation assumptions. Tax rate determines pre-tax income needed. CPI parameters affect expense growth in the simulation." />
        </summary>
        <div className="form-grid" style={{ marginTop: '0.5rem' }}>
          <label>
            Effective Tax Rate (%)
            <NumericInput
              value={(inputs.effectiveTaxRate * 100).toFixed(0)}
              onChange={(e) => updateInput('effectiveTaxRate', Number(e.target.value) / 100)}
              min={0} max={50} step={1}
            />
            <span className="hint">
              Pre-tax income needed = expenses / (1 - tax rate).
              Withdrawal = pre-tax needed - pension income.
            </span>
          </label>
          <label>
            Mean CPI (%)
            <NumericInput
              value={(inputs.inflationParams.meanInflation * 100).toFixed(1)}
              onChange={(e) =>
                updateInput('inflationParams', {
                  ...inputs.inflationParams,
                  meanInflation: Number(e.target.value) / 100,
                })
              }
              step={0.5}
            />
          </label>
          <label>
            CPI Volatility (%)
            <NumericInput
              value={(inputs.inflationParams.inflationVolatility * 100).toFixed(1)}
              onChange={(e) =>
                updateInput('inflationParams', {
                  ...inputs.inflationParams,
                  inflationVolatility: Number(e.target.value) / 100,
                })
              }
              step={0.5}
            />
          </label>
          <label>
            Return-Inflation Correlation
            <NumericInput
              value={inputs.inflationParams.returnInflationCorrelation}
              onChange={(e) =>
                updateInput('inflationParams', {
                  ...inputs.inflationParams,
                  returnInflationCorrelation: Number(e.target.value),
                })
              }
              step={0.05} min={-1} max={1}
            />
          </label>
        </div>
      </details>
    </fieldset>
  );
}
