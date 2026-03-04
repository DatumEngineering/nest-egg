/**
 * Investment portfolio model with configurable derisking.
 *
 * Derisking: linear taper over `deriskYears` ending at `kneeYear`.
 * Setting deriskYears=0 keeps aggressive allocation through retirement.
 */

const DEFAULTS = {
  highYieldRate: 0.105,
  highYieldVolatility: 0.16,
  conservativeRate: 0.04,
  conservativeVolatility: 0.05,
  kneeYear: 20,
  deriskYears: 20,
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
 *
 * Primary mode: linear taper over `deriskYears` ending at `kneeYear`.
 * Legacy strategy values in saved files are still handled for compatibility.
 */
export function getAllocationFraction(year, kneeYear, deriskYears, steepness, strategy) {
  // Legacy strategies preserved for file compatibility
  if (strategy === 'target-date') return year >= kneeYear ? 1 : 0;
  if (strategy === 'none') return 0;
  if (strategy === 'sigmoid') return 1 / (1 + Math.exp(-steepness * (year - kneeYear)));

  // Default: configurable linear taper (lifecycle)
  const taperYears = deriskYears ?? 20;
  if (taperYears === 0) return year >= kneeYear ? 1 : 0;
  const taperStart = Math.max(0, kneeYear - taperYears);
  if (year <= taperStart) return 0;
  if (year >= kneeYear) return 1;
  return (year - taperStart) / (kneeYear - taperStart);
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
    year, p.kneeYear, p.deriskYears, p.steepness, p.strategy
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
      year, p.kneeYear, p.deriskYears, p.steepness, p.strategy
    );
    curve.push({ year, mean, volatility, conservativePct });
  }

  return curve;
}

export { DEFAULTS as INVESTMENT_DEFAULTS };
