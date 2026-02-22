/**
 * Investment portfolio model with configurable derisking strategies.
 *
 * Strategies:
 *   lifecycle  - 20-year linear taper to knee year (matches Vanguard TDF)
 *   sigmoid    - Smooth S-curve transition
 *   target-date - 100% aggressive until knee year, then 100% conservative
 *   none       - Stays aggressive allocation forever
 */

const DEFAULTS = {
  highYieldRate: 0.105,
  highYieldVolatility: 0.16,
  conservativeRate: 0.04,
  conservativeVolatility: 0.05,
  kneeYear: 20,
  steepness: 0.5,
  strategy: 'lifecycle',
  df: 5,
};

/**
 * Risk presets calibrated to Vanguard index fund data.
 *
 * Aggressive phase based on VTSAX/VTI (total stock market):
 *   ~10.5% mean return, ~16% standard deviation (30-year)
 *
 * Conservative phase based on VBTLX/BND (total bond market):
 *   ~4.0% mean return, ~5% standard deviation (30-year)
 *
 * See src/data/vanguardDefaults.json for sources.
 */
export const RISK_PRESETS = {
  conservative: {
    highYieldRate: 0.095,
    highYieldVolatility: 0.16,
    conservativeRate: 0.04,
    conservativeVolatility: 0.05,
    steepness: 0.5,
    strategy: 'lifecycle',
    df: 5,
  },
  moderate: {
    highYieldRate: 0.105,
    highYieldVolatility: 0.16,
    conservativeRate: 0.04,
    conservativeVolatility: 0.05,
    steepness: 0.5,
    strategy: 'lifecycle',
    df: 5,
  },
  aggressive: {
    highYieldRate: 0.105,
    highYieldVolatility: 0.16,
    conservativeRate: 0.04,
    conservativeVolatility: 0.05,
    steepness: 0.5,
    strategy: 'none',
    df: 5,
  },
};

/**
 * Compute the conservative allocation fraction for a given year.
 * Returns 0 = fully aggressive, 1 = fully conservative.
 */
export function getAllocationFraction(year, kneeYear, steepness, strategy) {
  switch (strategy) {
    case 'lifecycle': {
      // 20-year linear taper ending at knee year (matches Vanguard TDF glide path)
      const taperStart = Math.max(0, kneeYear - 20);
      if (year <= taperStart) return 0;
      if (year >= kneeYear) return 1;
      return (year - taperStart) / (kneeYear - taperStart);
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
