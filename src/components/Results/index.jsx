import { useState } from 'react';
import SuccessRate from './SuccessRate.jsx';
import PortfolioChart from './PortfolioChart.jsx';
import CoastCurveChart from './CoastCurveChart.jsx';
import YieldCurveChart from './YieldCurveChart.jsx';
import SpendingChart from './SpendingChart.jsx';
import ScenarioSuggestions from './ScenarioSuggestions.jsx';

export default function Results({
  results,
  coastResult,
  coastYearResult,
  perEarnerCoast,
  yieldCurveData,
  deterministicCoastData,
  spendingProjectionData,
  inputs,
  totalPortfolio,
  primaryAge,
  error,
}) {
  const [showYieldCurve, setShowYieldCurve] = useState(false);
  const [showCoastCurve, setShowCoastCurve] = useState(false);
  const [showSpending, setShowSpending] = useState(false);

  return (
    <div className="results">
      {/* Unified chart toggle bar */}
      <div className="chart-toggles">
        <button
          type="button"
          className={`toggle-btn${showYieldCurve ? ' active' : ''}`}
          onClick={() => setShowYieldCurve(!showYieldCurve)}
        >
          Glide Path
        </button>
        <button
          type="button"
          className={`toggle-btn${showCoastCurve ? ' active' : ''}`}
          onClick={() => setShowCoastCurve(!showCoastCurve)}
        >
          Coast Number
        </button>
        <button
          type="button"
          className={`toggle-btn${showSpending ? ' active' : ''}`}
          onClick={() => setShowSpending(!showSpending)}
        >
          Spending
        </button>
      </div>

      {showYieldCurve && (
        <YieldCurveChart curveData={yieldCurveData} />
      )}

      {showCoastCurve && (
        <CoastCurveChart
          coastCurve={deterministicCoastData}
          currentPortfolio={totalPortfolio}
          currentAge={primaryAge}
          title="What You Need to Coast"
          hint="Portfolio needed at each age to coast to retirement. Where the blue line crosses the green curve, you can stop contributing."
        />
      )}

      {showSpending && (
        <SpendingChart
          spendingData={spendingProjectionData}
          effectiveTaxRate={inputs.effectiveTaxRate}
        />
      )}

      {/* Error display */}
      {error && (
        <div className="simulation-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Simulation results - shown after Run */}
      {results && (
        <>
          <h2>Results</h2>
          <SuccessRate
            results={results}
            coastResult={coastResult}
            coastYearResult={coastYearResult}
            perEarnerCoast={perEarnerCoast}
            confidenceTarget={inputs.confidenceTarget}
          />
          <PortfolioChart
            percentileBands={results.percentileBands}
            retirementAge={inputs.retirementAge}
          />

          <ScenarioSuggestions
            results={results}
            inputs={inputs}
            coastYearResult={coastYearResult}
            perEarnerCoast={perEarnerCoast}
          />
        </>
      )}

      {!results && !error && (
        <div className="results-placeholder">
          Configure your inputs and run the simulation to see results.
        </div>
      )}
    </div>
  );
}
