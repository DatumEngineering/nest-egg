const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtPct = (n) => `${(n * 100).toFixed(0)}%`;

export default function WhatIfButtons({
  results,
  inputs,
  whatIfResult,
  whatIfLabel,
  runWhatIf,
  clearWhatIf,
  isRunning,
  primaryAge,
}) {
  if (!results) return null;

  const retirementYears = inputs.retirementAge - primaryAge;

  // Monthly dollar change from ±10% of current savings
  const monthlySavingsDelta = inputs.earners.reduce(
    (sum, e) => sum + (e.salary * e.savingsRate * 0.10) / 12,
    0
  );

  // Context-aware retire-later button: active FERS only (deferred/separated employees
  // have frozen service years — working to 62 doesn't add YOS or trigger the 1.1× multiplier)
  const fersBumpEarner = inputs.earners.find(
    (e) => e.fers?.mode === 'active' && e.retirementAge < 62
  );

  const handleCrash = () => {
    const year = Math.max(0, retirementYears - 2);
    runWhatIf(
      { _simOverrides: { stressShockEnabled: true, stressShockYear: year, stressShockMagnitude: -0.50 } },
      '50% market crash 2 yrs before retirement'
    );
  };

  const handleSaveMore = () => {
    runWhatIf(
      {
        earners: inputs.earners.map((e) => ({
          ...e,
          savingsRate: Math.min(1.0, e.savingsRate * 1.10),
        })),
      },
      `Save 10% more (~+${fmt(monthlySavingsDelta)}/mo)`
    );
  };

  const handleSaveLess = () => {
    runWhatIf(
      {
        earners: inputs.earners.map((e) => ({
          ...e,
          savingsRate: e.savingsRate * 0.90,
        })),
      },
      `Save 10% less (~-${fmt(monthlySavingsDelta)}/mo)`
    );
  };

  const handleRetireLater = () => {
    if (fersBumpEarner) {
      const updatedEarners = inputs.earners.map((e) =>
        e === fersBumpEarner
          ? { ...e, retirementAge: 62, fers: { ...e.fers, startAge: 62 } }
          : e
      );
      const newRetirementAge = Math.max(...updatedEarners.map((e) => e.retirementAge));
      runWhatIf(
        { earners: updatedEarners, retirementAge: newRetirementAge },
        `${fersBumpEarner.name}: work to 62 (FERS 1.1× bump)`
      );
    } else {
      runWhatIf(
        {
          retirementAge: inputs.retirementAge + 2,
          earners: inputs.earners.map((e) => ({ ...e, retirementAge: e.retirementAge + 2 })),
        },
        'Retire 2 years later'
      );
    }
  };

  const baseRate = results.successRate;
  const scenarioRate = whatIfResult?.successRate;

  return (
    <div className="what-if-section">
      <h4 className="what-if-heading">Explore scenarios</h4>
      <div className="what-if-buttons">
        <button
          type="button"
          className="what-if-btn what-if-btn-crash"
          onClick={handleCrash}
          disabled={isRunning}
        >
          50% crash 2 yrs before retirement
        </button>
        <button
          type="button"
          className="what-if-btn what-if-btn-more"
          onClick={handleSaveMore}
          disabled={isRunning}
        >
          Save 10% more&thinsp;(~+{fmt(monthlySavingsDelta)}/mo)
        </button>
        <button
          type="button"
          className="what-if-btn what-if-btn-less"
          onClick={handleSaveLess}
          disabled={isRunning}
        >
          Save 10% less&thinsp;(~-{fmt(monthlySavingsDelta)}/mo)
        </button>
        {!results.meetsConfidence && (
          <button
            type="button"
            className="what-if-btn what-if-btn-retire"
            onClick={handleRetireLater}
            disabled={isRunning}
          >
            {fersBumpEarner
              ? `${fersBumpEarner.name}: work to 62 (FERS 1.1×)`
              : 'Retire 2 years later'}
          </button>
        )}
      </div>

      {whatIfResult && (
        <div className="what-if-comparison">
          <div className="what-if-comparison-row">
            <span className="what-if-label">{whatIfLabel}</span>
            <button
              type="button"
              className="what-if-clear"
              onClick={clearWhatIf}
              aria-label="Clear scenario"
            >
              ✕
            </button>
          </div>
          <div className="what-if-rates">
            <span>Baseline: <strong>{fmtPct(baseRate)}</strong></span>
            <span className="what-if-arrow">→</span>
            <span className={scenarioRate >= baseRate ? 'what-if-better' : 'what-if-worse'}>
              Scenario: <strong>{fmtPct(scenarioRate)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
