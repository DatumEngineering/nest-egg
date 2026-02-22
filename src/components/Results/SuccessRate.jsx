const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function SuccessRate({ results, coastResult, coastYearResult, perEarnerCoast, confidenceTarget }) {
  if (!results) return null;

  const successPct = (results.successRate * 100).toFixed(1);
  const targetPct = (confidenceTarget * 100).toFixed(0);
  const meetsTarget = results.meetsConfidence;

  return (
    <div className="results-summary">
      <div className={`success-card ${meetsTarget ? 'success' : 'failure'}`}>
        <div className="big-number">{successPct}%</div>
        <div className="label">Success Rate</div>
        <div className="detail">
          {results.successes} of {results.numRuns} scenarios survived
        </div>
        <div className={`confidence ${meetsTarget ? 'met' : 'not-met'}`}>
          {meetsTarget
            ? `Meets ${targetPct}% confidence target`
            : `Below ${targetPct}% confidence target`}
        </div>
      </div>

      {coastResult && (
        <div className="coast-card">
          <div className="big-number">{fmt(coastResult.coastNumber)}</div>
          <div className="label">Coast FIRE Number</div>
          <div className="detail">
            Minimum portfolio to stop all contributions now
          </div>
          {coastResult.exceededSearchMax && (
            <div className="warning">
              Exceeds search range — may need more savings.
            </div>
          )}
        </div>
      )}

      {coastYearResult && (
        <div className="coast-year-card">
          {coastYearResult.alreadyCoasting ? (
            <>
              <div className="big-number coast-success">Now</div>
              <div className="label">Coast FIRE Year</div>
              <div className="detail">
                You can stop contributing today and still achieve {targetPct}% success
              </div>
            </>
          ) : coastYearResult.neverReaches ? (
            <>
              <div className="big-number coast-warning">N/A</div>
              <div className="label">Coast FIRE Year</div>
              <div className="detail">
                Even contributing until retirement doesn&apos;t reach {targetPct}% confidence
                ({(coastYearResult.successRateAtCoast * 100).toFixed(1)}% with full contributions)
              </div>
            </>
          ) : (
            <>
              <div className="big-number">{coastYearResult.coastYear}</div>
              <div className="label">Coast FIRE Year</div>
              <div className="detail">
                Stop contributing at age {coastYearResult.coastAge} and still achieve{' '}
                {targetPct}% success ({(coastYearResult.successRateAtCoast * 100).toFixed(1)}%)
              </div>
            </>
          )}
        </div>
      )}

      {/* Per-earner coast info */}
      {perEarnerCoast && perEarnerCoast.length > 0 && (
        <div className="per-earner-coast-card">
          <div className="label" style={{ marginBottom: '0.5rem' }}>Per-Earner Coast</div>
          {perEarnerCoast.map((ec) => (
            <div key={ec.earnerIndex} className="per-earner-item">
              <strong>{ec.earnerName}:</strong>{' '}
              {ec.alreadyCoasting ? (
                <span className="coast-success">Can coast now</span>
              ) : ec.neverReaches ? (
                <span className="coast-warning">Cannot coast early</span>
              ) : (
                <span>Age {ec.coastAge} ({ec.coastYear}) — {(ec.successRateAtCoast * 100).toFixed(1)}%</span>
              )}
            </div>
          ))}
        </div>
      )}

      {!meetsTarget && results.failures > 0 && (
        <div className="failure-info">
          <h4>Failure Analysis</h4>
          <p>
            {results.failures} scenarios ran out of money.
            {Object.keys(results.failureAgeDistribution).length > 0 && (
              <> Most common failure ages:{' '}
                {Object.entries(results.failureAgeDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([age, count]) => `${age} (${count}x)`)
                  .join(', ')}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
