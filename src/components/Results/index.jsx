import SuccessRate from './SuccessRate.jsx';
import PortfolioChart from './PortfolioChart.jsx';
import WhatIfButtons from './WhatIfButtons.jsx';

export default function Results({
  results,
  coastResult,
  coastYearResult,
  perEarnerCoast,
  inputs,
  error,
  whatIfResult,
  whatIfLabel,
  runWhatIf,
  clearWhatIf,
  isRunning,
}) {
  return (
    <div className="results">
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
            whatIfBands={whatIfResult?.percentileBands}
            retirementAge={inputs.retirementAge}
          />

          <WhatIfButtons
            results={results}
            inputs={inputs}
            whatIfResult={whatIfResult}
            whatIfLabel={whatIfLabel}
            runWhatIf={runWhatIf}
            clearWhatIf={clearWhatIf}
            isRunning={isRunning}
            primaryAge={inputs.earners[0]?.currentAge ?? 30}
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
