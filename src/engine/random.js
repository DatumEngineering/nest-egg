/**
 * Random number generation utilities for Monte Carlo simulation.
 * Implements Box-Muller transform, Student's t distribution,
 * and bivariate distributions with Cholesky decomposition.
 */

/**
 * Generate a standard normal random variable using Box-Muller transform.
 * Returns two independent N(0,1) draws.
 */
export function boxMuller() {
  let u1, u2;
  do {
    u1 = Math.random();
  } while (u1 === 0); // avoid log(0)
  u2 = Math.random();

  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
  return [z0, z1];
}

/**
 * Draw from a normal distribution N(mean, std^2).
 */
export function normalRandom(mean = 0, std = 1) {
  const [z] = boxMuller();
  return mean + std * z;
}

/**
 * Generate a chi-squared random variable with `df` degrees of freedom.
 * Sum of df squared standard normals.
 */
function chiSquared(df, rngFn) {
  let sum = 0;
  for (let i = 0; i < df; i++) {
    let u1, u2;
    do { u1 = rngFn(); } while (u1 === 0);
    u2 = rngFn();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    sum += z * z;
  }
  return sum;
}

/**
 * Draw correlated pair (x, y) from a bivariate Student's t distribution.
 * Uses Cholesky decomposition with fat-tailed marginals.
 *
 * When df is null/undefined or >= 30, falls back to normal distribution.
 * Lower df = fatter tails (df=5 is common for financial modeling).
 */
export function bivariateStudentT(meanX, stdX, meanY, stdY, rho, df) {
  const [z1, z2] = boxMuller();

  let t1, t2;
  if (df != null && df < 30) {
    // Scale normal draws by sqrt(df / chi2) to get t-distributed marginals
    const chi2 = chiSquared(df, Math.random);
    const scale = Math.sqrt(df / chi2);
    t1 = z1 * scale;
    t2 = z2 * scale;
  } else {
    t1 = z1;
    t2 = z2;
  }

  // Cholesky decomposition of 2x2 correlation matrix
  const x = meanX + stdX * t1;
  const y = meanY + stdY * (rho * t1 + Math.sqrt(1 - rho * rho) * t2);

  return [x, y];
}

// Keep backward-compatible alias
export const bivariateNormal = bivariateStudentT;

/**
 * Seed-based PRNG using mulberry32 for reproducible simulations.
 * Returns a function that produces uniform random numbers in [0, 1).
 */
export function seededRandom(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a seeded bivariate Student's t generator for reproducible Monte Carlo runs.
 */
export function createSeededBivariateStudentT(seed) {
  const rng = seededRandom(seed);

  return function (meanX, stdX, meanY, stdY, rho, df) {
    // Box-Muller with seeded RNG
    let u1;
    do { u1 = rng(); } while (u1 === 0);
    const u2 = rng();

    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

    let t1, t2;
    if (df != null && df < 30) {
      const chi2 = chiSquared(df, rng);
      const scale = Math.sqrt(df / chi2);
      t1 = z1 * scale;
      t2 = z2 * scale;
    } else {
      t1 = z1;
      t2 = z2;
    }

    const x = meanX + stdX * t1;
    const y = meanY + stdY * (rho * t1 + Math.sqrt(1 - rho * rho) * t2);

    return [x, y];
  };
}

// Backward-compatible alias
export const createSeededBivariateNormal = createSeededBivariateStudentT;
