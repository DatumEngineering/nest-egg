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
          <li>Healthcare inflation modeled at 2&times; general CPI; all other categories track CPI</li>
          <li>Configurable investment derisking (linear lifecycle glide path)</li>
          <li>Fat-tailed return modeling (Student&apos;s t-distribution)</li>
          <li>Coast FIRE number and coast year calculations</li>
          <li>Windfall events with stochastic timing (inheritance, equity, etc.)</li>
          <li>Investment property income with appreciation and optional sale</li>
          <li>Cost-of-living adjustment by metro area</li>
          <li>Spending guardrails (Guyton-Klinger): automatic 10% spending cuts/raises based on withdrawal rate drift</li>
          <li>Survivor benefit modeling: Social Security max-not-sum, FERS survivor annuity, pension stop on death</li>
          <li>Primary residence downsizing: net equity flows to portfolio at a specified future year</li>
          <li>What-if scenario explorer: market crash, save more/less, retire later &mdash; overlaid on chart</li>
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
            General inflation drawn stochastically based on{' '}
            <a href="https://www.bls.gov/cpi/" target="_blank" rel="noopener noreferrer">
              BLS Consumer Price Index
            </a>
            {' '}historical data (mean 3%, &sigma; 1.5%). Healthcare is modeled at 2&times; general CPI
            to reflect persistently higher medical cost inflation. All other expense categories track
            general CPI.
          </dd>
          <dt>Investment Returns</dt>
          <dd>
            Default parameters calibrated to{' '}
            <a href="https://investor.vanguard.com/investment-products/mutual-funds/profile/vtsax" target="_blank" rel="noopener noreferrer">
              Vanguard Total Stock Market (VTSAX)
            </a>
            {' '}and{' '}
            <a href="https://investor.vanguard.com/investment-products/mutual-funds/profile/vbtlx" target="_blank" rel="noopener noreferrer">
              Vanguard Total Bond Market (VBTLX)
            </a>
            {' '}30-year historical data. Equity: 10.5%/16%, Bond: 4.0%/5% (mean/volatility).
            Lifecycle derisking follows{' '}
            <a href="https://investor.vanguard.com/investment-products/mutual-funds/profile/vlxvx" target="_blank" rel="noopener noreferrer">
              Vanguard Target Retirement
            </a>
            {' '}glide path (20-year taper).
          </dd>
        </dl>

        <h3>Methodology</h3>
        <p>
          Each simulation run draws correlated market returns and inflation from a
          bivariate Student&apos;s t-distribution (df=5 default) using Cholesky decomposition,
          producing fat-tailed returns that better model market crashes and booms.
          Expenses compound with per-category stochastic inflation. The Monte Carlo
          engine runs 3,000 independent paths (configurable) and reports success rate,
          percentile bands, and Coast FIRE metrics via binary search.
        </p>

        <h3>License</h3>
        <p>
          NestEgg is open source software released under the{' '}
          <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer">
            GNU Affero General Public License v3
          </a>
          . You are free to use, modify, and redistribute it. Any derivative work or hosted
          deployment must also be released under AGPL-3.0 with source code made available.
        </p>

        <p className="about-disclaimer">
          This tool is for educational and planning purposes only. It is not financial advice.
          Consult a qualified financial advisor for decisions about your retirement.
        </p>
      </div>
    </div>
  );
}
