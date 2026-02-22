/**
 * Stochastic inflation model defaults.
 *
 * The bivariate normal draw produces a correlated (marketReturn, CPI)
 * pair each year. Per-category inflation rates are handled in expenses.js
 * using the getCategoryInflation function which applies category-specific
 * differentials on top of the stochastic CPI draw.
 *
 * Historical US CPI inflation: ~3.0% mean, ~1.5% std dev (post-war).
 * Inflation-equity correlation: historically modest positive (~0.2-0.4).
 */

const DEFAULTS = {
  meanInflation: 0.03,
  inflationVolatility: 0.015,
  returnInflationCorrelation: 0.3,
};

export { DEFAULTS as INFLATION_DEFAULTS };
