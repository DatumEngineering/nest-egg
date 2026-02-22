/**
 * Monte Carlo engine + deterministic calculations.
 *
 * - runMonteCarlo: N stochastic simulation runs
 * - calculateCoastNumber: binary search over portfolio for MC coast number
 * - calculateCoastYear: binary search over age for MC coast year
 * - calculateCoastCurve: MC coast number at each age (slow, post-Run)
 * - calculateDeterministicCoast: instant coast curve using mean returns (pre-Run)
 */

import { runSimulation } from './simulation.js';
import { getBlendedParams } from './investment.js';

/**
 * Run Monte Carlo simulation with N iterations.
 */
export function runMonteCarlo(config) {
  const numRuns = config.numRuns ?? 1000;
  const totalYears = config.deathAge - config.primaryCurrentAge;

  let successes = 0;
  const failureAges = [];
  const portfolioByYear = Array.from({ length: totalYears }, () => []);

  for (let run = 0; run < numRuns; run++) {
    const result = runSimulation(config);

    if (result.success) {
      successes++;
    } else {
      failureAges.push(result.failureAge);
    }

    for (let y = 0; y < result.yearlyData.length; y++) {
      portfolioByYear[y].push(result.yearlyData[y].portfolio);
    }
  }

  for (const yearData of portfolioByYear) {
    yearData.sort((a, b) => a - b);
  }

  const percentiles = [0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95];
  const percentileBands = portfolioByYear.map((yearData, yearIndex) => {
    const bands = {};
    for (const p of percentiles) {
      const index = Math.floor(p * yearData.length);
      bands[`p${Math.round(p * 100)}`] = yearData[Math.min(index, yearData.length - 1)];
    }
    bands.age = config.primaryCurrentAge + yearIndex;
    bands.mean = yearData.reduce((s, v) => s + v, 0) / yearData.length;
    return bands;
  });

  const successRate = successes / numRuns;

  const failureAgeDistribution = {};
  for (const age of failureAges) {
    failureAgeDistribution[age] = (failureAgeDistribution[age] || 0) + 1;
  }

  return {
    successRate,
    numRuns,
    successes,
    failures: numRuns - successes,
    percentileBands,
    failureAgeDistribution,
    meetsConfidence: successRate >= (config.confidenceTarget ?? 0.90),
  };
}

/**
 * Calculate the Coast FIRE number via MC binary search.
 * Uses config.coastAge if provided, otherwise defaults to primaryCurrentAge.
 */
export function calculateCoastNumber(config, searchMin = 0, searchMax = 10000000, tolerance = 1000) {
  const confidenceTarget = config.confidenceTarget ?? 0.90;

  const coastConfig = {
    ...config,
    coastAge: config.coastAge ?? config.primaryCurrentAge,
    numRuns: config.numRuns ?? 1000,
  };

  let low = searchMin;
  let high = searchMax;
  let bestResult = null;

  const maxResult = runMonteCarlo({ ...coastConfig, startingPortfolio: high });
  if (maxResult.successRate < confidenceTarget) {
    return {
      coastNumber: high,
      successRateAtCoast: maxResult.successRate,
      exceededSearchMax: true,
    };
  }

  while (high - low > tolerance) {
    const mid = Math.round((low + high) / 2);
    const result = runMonteCarlo({ ...coastConfig, startingPortfolio: mid });

    if (result.successRate >= confidenceTarget) {
      high = mid;
      bestResult = result;
    } else {
      low = mid;
    }
  }

  const finalResult = bestResult || runMonteCarlo({ ...coastConfig, startingPortfolio: high });

  return {
    coastNumber: high,
    successRateAtCoast: finalResult.successRate,
    exceededSearchMax: false,
  };
}

/**
 * Calculate the Coast FIRE year via MC binary search.
 */
export function calculateCoastYear(config) {
  const confidenceTarget = config.confidenceTarget ?? 0.90;
  const primaryAge = config.primaryCurrentAge;
  const retAge = config.retirementAge;

  const makeCoastConfig = (coastAge) => ({
    ...config,
    coastAge,
  });

  const nowResult = runMonteCarlo(makeCoastConfig(primaryAge));
  if (nowResult.successRate >= confidenceTarget) {
    return {
      coastYear: new Date().getFullYear(),
      coastAge: primaryAge,
      successRateAtCoast: nowResult.successRate,
      alreadyCoasting: true,
    };
  }

  const fullResult = runMonteCarlo(makeCoastConfig(retAge));
  if (fullResult.successRate < confidenceTarget) {
    return {
      coastYear: null,
      coastAge: null,
      successRateAtCoast: fullResult.successRate,
      alreadyCoasting: false,
      neverReaches: true,
    };
  }

  let low = primaryAge;
  let high = retAge;
  let bestAge = retAge;
  let bestRate = fullResult.successRate;

  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    const result = runMonteCarlo(makeCoastConfig(mid));

    if (result.successRate >= confidenceTarget) {
      bestAge = mid;
      bestRate = result.successRate;
      high = mid;
    } else {
      low = mid;
    }
  }

  const currentYear = new Date().getFullYear();
  return {
    coastYear: currentYear + (bestAge - primaryAge),
    coastAge: bestAge,
    successRateAtCoast: bestRate,
    alreadyCoasting: false,
  };
}

/**
 * Generate MC-based coast number curve (slow — run after simulation).
 */
export function calculateCoastCurve(config, step = 5) {
  const primaryAge = config.primaryCurrentAge;
  const retAge = config.retirementAge;
  const points = [];

  for (let age = primaryAge; age <= retAge; age += step) {
    const coastConfig = {
      ...config,
      coastAge: age,
      numRuns: Math.min(config.numRuns ?? 1000, 500),
    };
    const result = calculateCoastNumber(coastConfig);
    points.push({ age, coastNumber: result.coastNumber });
  }

  if (points.length === 0 || points[points.length - 1].age !== retAge) {
    const coastConfig = { ...config, coastAge: retAge, numRuns: Math.min(config.numRuns ?? 1000, 500) };
    const result = calculateCoastNumber(coastConfig);
    points.push({ age: retAge, coastNumber: result.coastNumber });
  }

  return points;
}

/**
 * Calculate deterministic coast curve using mean returns.
 * Instant — no Monte Carlo. Shows "what you need" based on averages.
 *
 * For each coast age, finds the minimum portfolio needed AT THAT AGE
 * to coast (no more contributions) through death. The coast number
 * grows over time because later coast ages have fewer compounding years
 * before retirement expenses begin.
 *
 * @param {object} config - Same config as runMonteCarlo
 * @returns {Array<{ age: number, coastNumber: number }>}
 */
export function calculateDeterministicCoast(config) {
  const primaryAge = config.primaryCurrentAge;
  const retAge = config.retirementAge;

  // Deterministic RNG: always returns [mean, meanInflation]
  const deterministicRng = (meanReturn, _vol, meanInf) => [meanReturn, meanInf];

  const points = [];

  for (let coastAge = primaryAge; coastAge <= retAge; coastAge++) {
    // Binary search for minimum starting portfolio (today's value)
    let low = 0;
    let high = 10000000;

    // Quick check if even max portfolio fails
    const maxCheck = runSimulation({
      ...config,
      startingPortfolio: high,
      coastAge,
      rngFn: deterministicRng,
    });
    if (!maxCheck.success) {
      points.push({ age: coastAge, coastNumber: high });
      continue;
    }

    while (high - low > 1000) {
      const mid = Math.round((low + high) / 2);
      const result = runSimulation({
        ...config,
        startingPortfolio: mid,
        coastAge,
        rngFn: deterministicRng,
      });

      if (result.success) {
        high = mid;
      } else {
        low = mid;
      }
    }

    // Run with the found minimum to get portfolio value AT the coast age
    const finalRun = runSimulation({
      ...config,
      startingPortfolio: high,
      coastAge,
      rngFn: deterministicRng,
    });
    const coastYearIndex = coastAge - primaryAge;
    const portfolioAtCoastAge = coastYearIndex > 0 && coastYearIndex <= finalRun.yearlyData.length
      ? finalRun.yearlyData[coastYearIndex - 1].portfolio
      : high;

    points.push({ age: coastAge, coastNumber: Math.round(portfolioAtCoastAge) });
  }

  return points;
}

/**
 * Calculate deterministic spending projection.
 * Shows inflation-adjusted total spending over time using mean inflation.
 */
export function calculateSpendingProjection(config) {
  const primaryAge = config.primaryCurrentAge;
  const deathAge = config.deathAge;
  const retAge = config.retirementAge;
  const meanInflation = config.inflationParams?.meanInflation ?? 0.03;
  const expenses = config.expenses || [];
  const effectiveTaxRate = config.effectiveTaxRate ?? 0;
  const taxMultiplier = effectiveTaxRate > 0 ? 1 / (1 - effectiveTaxRate) : 1;

  const points = [];

  for (let age = retAge; age <= deathAge; age++) {
    const yearsFromNow = age - primaryAge;
    // Each category inflates at its own rate
    const totalExpenses = expenses.reduce((sum, cat) => {
      const inflated = cat.amount * Math.pow(1 + (cat.inflationRate ?? meanInflation), yearsFromNow);
      return sum + inflated;
    }, 0);

    const preTaxNeeded = totalExpenses * taxMultiplier;
    points.push({
      age,
      expenses: Math.round(totalExpenses),
      preTaxNeeded: Math.round(preTaxNeeded),
    });
  }

  return points;
}
