/**
 * Shared test helpers: config factories and deterministic RNG utilities.
 */

import { buildInvestmentParams } from '../engine/investment.js';

/** Deterministic RNG: every simulation year returns the exact same return and inflation. */
export const fixedRng = (returnRate, inflationRate) => () => [returnRate, inflationRate];

/** Earner in pure accumulation mode (working, not yet retired). */
export function makeEarner(overrides = {}) {
  return {
    currentAge: 40,
    retirementAge: 65,
    salary: 80000,
    contributionPeriods: [{ fromAge: 40, rate: 0.15 }],
    wageGrowthRate: 0.03,
    ...overrides,
  };
}

/**
 * Minimal config for runSimulation / runMonteCarlo.
 *
 * Defaults to a deterministic 7% return / 3% inflation so tests are
 * not sensitive to random draws unless rngFn is explicitly overridden.
 */
export function makeConfig(overrides = {}) {
  const earners = overrides.earners ?? [makeEarner()];
  const primaryAge = earners[0]?.currentAge ?? 40;
  const retirementAge = overrides.retirementAge ?? earners[0]?.retirementAge ?? 65;

  return {
    primaryCurrentAge: primaryAge,
    retirementAge,
    deathAge: 90,
    startingPortfolio: 200000,
    earners,
    expenses: [{ amount: 55000, inflationMultiplier: 1.0 }],
    pensions: [],
    investmentParams: {
      ...buildInvestmentParams('moderate', 'moderate'),
      kneeYear: retirementAge - primaryAge,
      deriskYears: 20,
    },
    inflationParams: {
      meanInflation: 0.03,
      inflationVolatility: 0,
      returnInflationCorrelation: 0,
    },
    effectiveTaxRate: 0,
    coastAge: null,
    earnerCoastIndex: null,
    windfallEvents: [],
    rentalProperties: [],
    primaryResidence: null,
    guardrailsEnabled: false,
    stressShockEnabled: false,
    rngFn: fixedRng(0.07, 0.03),
    ...overrides,
  };
}

/** Config for a household already in full retirement (currentAge === retirementAge). */
export function makeRetiredConfig(overrides = {}) {
  const age = overrides.currentAge ?? 65;
  const earners = [makeEarner({ currentAge: age, retirementAge: age, salary: 0, contributionPeriods: [{ fromAge: age, rate: 0 }], wageGrowthRate: 0 })];
  return makeConfig({ earners, retirementAge: age, primaryCurrentAge: age, ...overrides });
}
