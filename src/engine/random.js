/**
 * Random number generation utilities for Monte Carlo simulation.
 * Implements Box-Muller transform and bivariate normal distribution
 * with Cholesky decomposition for correlated draws.
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
 * Draw correlated pair (x, y) from a bivariate normal distribution.
 * Uses Cholesky decomposition of the correlation matrix.
 *
 * @param {number} meanX - Mean of X
 * @param {number} stdX - Standard deviation of X
 * @param {number} meanY - Mean of Y
 * @param {number} stdY - Standard deviation of Y
 * @param {number} rho - Correlation coefficient (-1 to 1)
 * @returns {[number, number]} Correlated pair [x, y]
 */
export function bivariateNormal(meanX, stdX, meanY, stdY, rho) {
  const [z1, z2] = boxMuller();

  // Cholesky decomposition of 2x2 correlation matrix:
  // [[1, rho], [rho, 1]] = L * L^T
  // L = [[1, 0], [rho, sqrt(1 - rho^2)]]
  const x = meanX + stdX * z1;
  const y = meanY + stdY * (rho * z1 + Math.sqrt(1 - rho * rho) * z2);

  return [x, y];
}

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
 * Create a seeded bivariate normal generator for reproducible Monte Carlo runs.
 * Replaces Math.random with a seeded PRNG for the duration of draws.
 */
export function createSeededBivariateNormal(seed) {
  const rng = seededRandom(seed);

  return function (meanX, stdX, meanY, stdY, rho) {
    // Box-Muller with seeded RNG
    let u1;
    do {
      u1 = rng();
    } while (u1 === 0);
    const u2 = rng();

    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

    const x = meanX + stdX * z1;
    const y = meanY + stdY * (rho * z1 + Math.sqrt(1 - rho * rho) * z2);

    return [x, y];
  };
}
