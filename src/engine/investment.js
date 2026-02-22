/**
 * Investment portfolio model with configurable derisking strategies.
 *
 * Strategies:
 *   sigmoid  - Smooth S-curve transition (default)
 *   linear   - Straight-line transition over time
 *   target-date - 100% aggressive until knee year, then 100% conservative
 *   none     - Stays aggressive allocation forever
 */

const DEFAULTS = {
  highYieldRate: 0.10,
  highYieldVolatility: 0.15,
  conservativeRate: 0.04,
  conservativeVolatility: 0.02,
  kneeYear: 20,
  steepness: 0.5,
  strategy: 'sigmoid',
};

/** Risk presets map a simple label to full parameter sets. */
export const RISK_PRESETS = {
  conservative: {
    highYieldRate: 0.07,
    highYieldVolatility: 0.10,
    conservativeRate: 0.03,
    conservativeVolatility: 0.015,
    steepness: 0.5,
    strategy: 'sigmoid',
  },
  moderate: {
    highYieldRate: 0.10,
    highYieldVolatility: 0.15,
    conservativeRate: 0.04,
    conservativeVolatility: 0.02,
    steepness: 0.5,
    strategy: 'sigmoid',
  },
  aggressive: {
    highYieldRate: 0.12,
    highYieldVolatility: 0.18,
    conservativeRate: 0.05,
    conservativeVolatility: 0.03,
    steepness: 0.5,
    strategy: 'sigmoid',
  },
};

/**
 * Compute the conservative allocation fraction for a given year.
 * Returns 0 = fully aggressive, 1 = fully conservative.
 */
export function getAllocationFraction(year, kneeYear, steepness, strategy) {
  switch (strategy) {
    case 'linear': {
      // Linear from 0% conservative at year 0 to 100% at 2×kneeYear
      const span = kneeYear * 2;
      return Math.max(0, Math.min(1, year / span));
    }
    case 'target-date':
      // Sudden shift at knee year
      return year >= kneeYear ? 1 : 0;
    case 'none':
      // Always aggressive
      return 0;
    case 'sigmoid':
    default:
      return 1 / (1 + Math.exp(-steepness * (year - kneeYear)));
  }
}

/**
 * Get the blended mean return and volatility for a given year.
 *
 * @param {number} year - Year index (0 = now)
 * @param {object} params - Investment parameters
 * @returns {{ mean: number, volatility: number }}
 */
export function getBlendedParams(year, params = {}) {
  const p = { ...DEFAULTS, ...params };

  const conservativeFraction = getAllocationFraction(
    year, p.kneeYear, p.steepness, p.strategy
  );
  const aggressiveFraction = 1 - conservativeFraction;

  const mean =
    aggressiveFraction * p.highYieldRate +
    conservativeFraction * p.conservativeRate;

  const volatility =
    Math.sqrt(
      (aggressiveFraction * p.highYieldVolatility) ** 2 +
      (conservativeFraction * p.conservativeVolatility) ** 2
    );

  return { mean, volatility };
}

/**
 * Generate the full yield curve for visualization.
 *
 * @param {number} totalYears
 * @param {object} params
 * @returns {Array<{ year: number, mean: number, volatility: number, conservativePct: number }>}
 */
export function getYieldCurve(totalYears, params = {}) {
  const p = { ...DEFAULTS, ...params };
  const curve = [];

  for (let year = 0; year <= totalYears; year++) {
    const { mean, volatility } = getBlendedParams(year, p);
    const conservativePct = getAllocationFraction(
      year, p.kneeYear, p.steepness, p.strategy
    );
    curve.push({ year, mean, volatility, conservativePct });
  }

  return curve;
}

export { DEFAULTS as INVESTMENT_DEFAULTS };
