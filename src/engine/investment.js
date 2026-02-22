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
 * Before-retirement presets: growth-phase allocations.
 *
 * Conservative: ~60/40 balanced (VBIAX-like), 8.5% / 12%
 * Moderate: Total stock market (VTSAX/VTI), 10.5% / 16%
 * Aggressive: Equity-heavy with small/mid tilt, 11.5% / 19%
 */
export const BEFORE_PRESETS = {
  conservative: { rate: 0.085, volatility: 0.12, label: 'Conservative — 60/40 balanced (8.5% / 12%)' },
  moderate:     { rate: 0.105, volatility: 0.16, label: 'Moderate — Total market (10.5% / 16%)' },
  aggressive:   { rate: 0.115, volatility: 0.19, label: 'Aggressive — Equity-heavy (11.5% / 19%)' },
};

/**
 * After-retirement presets: drawdown-phase allocations.
 *
 * Conservative: Short-term bonds (3.5% / 4%)
 * Moderate: Total bond (4% / 5%)
 * Balanced: Balanced fund (7% / 10%)
 */
export const AFTER_PRESETS = {
  conservative: { rate: 0.035, volatility: 0.04, label: 'Conservative — Short-term bonds (3.5% / 4%)' },
  moderate:     { rate: 0.04,  volatility: 0.05, label: 'Moderate — Total bond (4% / 5%)' },
  balanced:     { rate: 0.07,  volatility: 0.10, label: 'Balanced — Balanced fund (7% / 10%)' },
};

/**
 * Build investmentParams from before/after preset keys.
 */
export function buildInvestmentParams(beforeKey, afterKey, overrides = {}) {
  const before = BEFORE_PRESETS[beforeKey] || BEFORE_PRESETS.moderate;
  const after = AFTER_PRESETS[afterKey] || AFTER_PRESETS.moderate;
  return {
    highYieldRate: before.rate,
    highYieldVolatility: before.volatility,
    conservativeRate: after.rate,
    conservativeVolatility: after.volatility,
    steepness: 0.5,
    strategy: 'lifecycle',
    df: 5,
    ...overrides,
  };
}

/** @deprecated Use BEFORE_PRESETS + AFTER_PRESETS instead */
export const RISK_PRESETS = {
  conservative: {
    highYieldRate: 0.085, highYieldVolatility: 0.12,
    conservativeRate: 0.035, conservativeVolatility: 0.04,
    steepness: 0.5, strategy: 'lifecycle', df: 5,
  },
  moderate: {
    highYieldRate: 0.105, highYieldVolatility: 0.16,
    conservativeRate: 0.04, conservativeVolatility: 0.05,
    steepness: 0.5, strategy: 'lifecycle', df: 5,
  },
  aggressive: {
    highYieldRate: 0.115, highYieldVolatility: 0.19,
    conservativeRate: 0.07, conservativeVolatility: 0.10,
    steepness: 0.5, strategy: 'none', df: 5,
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
    aggressiveFraction * p.highYieldVolatility +
    conservativeFraction * p.conservativeVolatility;

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
