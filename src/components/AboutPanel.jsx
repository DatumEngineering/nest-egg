export default function AboutPanel({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="about-overlay" onClick={onClose}>
      <div className="about-panel" onClick={(e) => e.stopPropagation()}>
        <button className="about-close" onClick={onClose} type="button">&times;</button>

        <h2>About NestEgg</h2>
        <p>
          NestEgg is a retirement readiness calculator that uses Monte Carlo simulation
          to model thousands of possible futures for your portfolio. Instead of assuming
          fixed returns, it draws stochastic market returns and inflation each year to
          show you the probability of your plan succeeding.
        </p>

        <h3>Privacy</h3>
        <p>
          Your financial data never leaves your browser. There are no accounts, no logins,
          no cookies, no analytics, and no server-side processing. All calculations run
          entirely in your browser using JavaScript. When you close the tab, your data is gone.
        </p>

        <h3>Features</h3>
        <ul>
          <li>Multiple earners with individual retirement ages and portfolios</li>
          <li>Transitional retirement phase (staggered retirements)</li>
          <li>FERS pension calculator with immediate/deferred eligibility</li>
          <li>Social Security with early/delayed claiming adjustments</li>
          <li>Generic pensions and defined benefit plans</li>
          <li>Per-category inflation modeling (healthcare, housing, etc.)</li>
          <li>Investment derisking strategies (S-curve, linear, target-date)</li>
          <li>Coast FIRE number and coast year calculations</li>
          <li>Windfall events with stochastic timing (inheritance, equity, etc.)</li>
          <li>Cost-of-living adjustment by metro area</li>
        </ul>

        <h3>Data Sources</h3>
        <dl className="about-sources">
          <dt>Expense Categories</dt>
          <dd>
            National averages based on the{' '}
            <a href="https://www.bls.gov/cex/" target="_blank" rel="noopener noreferrer">
              BLS Consumer Expenditure Survey
            </a>
            , 65+ households, 2023 data.
          </dd>
          <dt>Cost of Living</dt>
          <dd>
            Metro multipliers derived from{' '}
            <a href="https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area" target="_blank" rel="noopener noreferrer">
              BEA Regional Price Parities
            </a>
            {' '}and the{' '}
            <a href="https://www.coli.org/" target="_blank" rel="noopener noreferrer">
              C2ER Cost of Living Index
            </a>.
          </dd>
          <dt>Inflation Assumptions</dt>
          <dd>
            Per-category inflation rates based on historical CPI sub-indices from the{' '}
            <a href="https://www.bls.gov/cpi/" target="_blank" rel="noopener noreferrer">
              BLS Consumer Price Index
            </a>. Healthcare trends at 5-6% vs 3% general CPI.
          </dd>
          <dt>Investment Returns</dt>
          <dd>
            Default parameters approximate historical US equity/bond blends.
            Conservative: 7%/10%, Moderate: 10%/15%, Aggressive: 12%/18% (mean/volatility).
          </dd>
        </dl>

        <h3>Methodology</h3>
        <p>
          Each simulation run draws correlated market returns and inflation from a
          bivariate normal distribution using the Cholesky decomposition. Expenses
          compound with per-category stochastic inflation. The Monte Carlo engine runs
          1,000 independent paths (configurable) and reports success rate, percentile
          bands, and Coast FIRE metrics via binary search.
        </p>

        <p className="about-disclaimer">
          This tool is for educational and planning purposes only. It is not financial advice.
          Consult a qualified financial advisor for decisions about your retirement.
        </p>
      </div>
    </div>
  );
}
