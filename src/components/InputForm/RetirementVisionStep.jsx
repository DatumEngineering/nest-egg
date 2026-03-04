import { useState } from 'react';
import blsData from '../../data/blsExpenses.json';
import NumericInput from './NumericInput.jsx';

const metroOptions = Object.entries(blsData.metros)
  .sort((a, b) => b[1].multiplier - a[1].multiplier);

const tierOptions = Object.entries(blsData.colMultipliers);

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const InfoIcon = ({ tip }) => (
  <span className="info-icon" data-tip={tip}>ⓘ</span>
);

function SpendingPromptHelper({ inputs }) {
  const [copied, setCopied] = useState(false);

  const numPeople = inputs.earners?.length ?? 1;
  const currentYear = new Date().getFullYear();
  const location = inputs.selectedMetro ?? 'your area';
  const hasFEHB = inputs.earners?.some(e => e.fers != null) ?? false;

  const healthcareLine = hasFEHB
    ? `Healthcare coverage: Federal employee FEHB (kept in retirement at active-employee premium rates). Use current FEHB plan rates — a high-deductible plan like GEHA HDHP runs roughly $150–$200/month for self+spouse; Blue Cross Standard Option runs $550–$650/month for self+spouse. Include dental/vision (FEDVIP, ~$50–$80/month). At age 65, Medicare Part A is free; Medicare Part B (~$185/month per person in ${currentYear}) is optional but often worth adding since FEHB then waives most copays — please give separate estimates for pre-65 and post-65 healthcare costs.`
    : `Healthcare coverage: [FEHB / employer retiree coverage / Medicare + supplement / marketplace — fill in before sending]`;

  const prompt = `Help me estimate annual retirement expenses for a ${numPeople}-person household retiring in the ${location} area.

Give all estimates in ${currentYear} dollars (today's purchasing power). Do NOT adjust for inflation or project future costs — I handle inflation separately in my model.

Housing situation: [renting / owning a paid-off home / undecided — fill in before sending]
${healthcareLine}

Please give me realistic annual estimates in ${currentYear} dollars for each category:
• Housing (rent or HOA/maintenance/insurance, utilities)
• Food (groceries and dining out)
• Transportation (insurance, fuel, maintenance, registration — assume no car payment)
• Healthcare (all-in: premiums, copays, dental, vision, long-term care)
• Travel & vacations
• Entertainment & hobbies
• Clothing & personal care
• Subscriptions & technology
• Other / miscellaneous

For each category, give me a low / middle / high estimate and briefly explain your assumptions. I'll enter these numbers into a 30+ year Monte Carlo retirement projection.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <details className="spending-prompt-helper">
      <summary>How do I refine these retirement expense estimates?</summary>
      <div style={{ marginTop: '0.5rem' }}>
        <p className="hint" style={{ marginBottom: '0.5rem' }}>
          Copy this prompt and paste it into any AI assistant (Claude, ChatGPT, etc.) to get a realistic spending breakdown for your situation. Fill in the brackets before sending.
        </p>
        <pre className="prompt-template">{prompt}</pre>
        <button type="button" className="copy-prompt-btn" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy prompt'}
        </button>
      </div>
    </details>
  );
}

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

      <SpendingPromptHelper inputs={inputs} />

      <details className="vision-section" open>
        <summary className="expense-summary">
          Annual Retirement Expenses: <strong>{fmt(total)}</strong>
          <span className="hint" style={{ marginLeft: '0.5rem' }}>
            {inputs.selectedMetro}
            {inputs.earners.length > 1 && ` / ${inputs.earners.length} people`}
          </span>
          <InfoIcon tip="National averages from BLS Consumer Expenditure Survey (2023, 65+ households), adjusted by BEA Regional Price Parities and C2ER Cost of Living Index." />
        </summary>

        <div className="expense-table-wrapper">
        <table className="expense-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount / yr</th>
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
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <p className="hint" style={{ marginTop: '0.4rem' }}>
          All expenses grow with CPI. Healthcare is modeled at 2× CPI to reflect higher medical cost inflation.
        </p>
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
          <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem' }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={inputs.guardrailsEnabled ?? true}
                onChange={(e) => updateInput('guardrailsEnabled', e.target.checked)}
              />
              Flexible spending in retirement
            </label>
            <details style={{ marginTop: '0.25rem', marginLeft: '1.5rem' }}>
              <summary className="hint" style={{ cursor: 'pointer' }}>What does this do?</summary>
              <p className="hint" style={{ marginTop: '0.25rem' }}>
                In bad market years, spending trims by up to 10% (but never below 85% of your plan).
                In good years, spending can rise up to 10% (capped at 120%). This models realistic
                spending flexibility rather than rigid fixed withdrawals. Based on the Guyton-Klinger
                guardrail rule. Uncheck to model completely rigid spending.
              </p>
            </details>
          </div>
        </div>
      </details>
    </fieldset>
  );
}
