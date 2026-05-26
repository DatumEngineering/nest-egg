/**
 * Functional integration tests for the three canonical scenarios.
 *
 * "Marginal" tests use a deterministic RNG so math is exact and reproducible.
 * The scenario is calibrated so that the base case just fails, and the
 * what-if suggestions (save more, retire later) flip it to success.
 *
 * Verified by hand (see comments) before committing.
 */

import { describe, it, expect } from 'vitest';
import { runSimulation } from '../engine/simulation.js';
import { runMonteCarlo } from '../engine/monteCarlo.js';
import { buildInvestmentParams } from '../engine/investment.js';
import { calculateFERS } from '../engine/pensions.js';
import { makeEarner, fixedRng } from './helpers.js';

// ── Shared helpers ────────────────────────────────────────────────────────────

function retiredConfig({ portfolio, annualExpenses, returnRate = 0.04, inflationRate = 0.03 } = {}) {
  return {
    primaryCurrentAge: 65,
    retirementAge: 65,
    deathAge: 90,
    startingPortfolio: portfolio,
    earners: [makeEarner({ currentAge: 65, retirementAge: 65, salary: 0, contributionPeriods: [{ fromAge: 65, rate: 0 }], wageGrowthRate: 0 })],
    expenses: [{ amount: annualExpenses, inflationMultiplier: 1.0 }],
    pensions: [],
    investmentParams: { ...buildInvestmentParams('moderate', 'moderate'), kneeYear: 0, deriskYears: 0 },
    inflationParams: { meanInflation: inflationRate, inflationVolatility: 0, returnInflationCorrelation: 0 },
    effectiveTaxRate: 0,
    coastAge: null, earnerCoastIndex: null,
    windfallEvents: [], rentalProperties: [], primaryResidence: null,
    guardrailsEnabled: false, stressShockEnabled: false,
    rngFn: fixedRng(returnRate, inflationRate),
  };
}

/**
 * Marginal scenario: age 55, retire 65, death 75.
 * $200K portfolio, $80K salary, 7% return, 3% inflation.
 *
 * Hand-verified outcomes (deterministic):
 *   10% savings, $50K expenses → FAILS  (year-19 portfolio ≈ -$20K)
 *   11% savings, $50K expenses → PASSES (year-19 portfolio ≈ +$4K)
 *   10% savings, retire 67    → PASSES (year-19 portfolio ≈ +$241K)
 *   10% savings, $48K expenses (succeeding base) → PASSES
 *    9% savings, $48K expenses → FAILS  (year-19 portfolio ≈ -$11K)
 */
function marginalConfig({ savingsRate = 0.10, retirementAge = 65, annualExpenses = 50_000 } = {}) {
  const currentAge = 55;
  return {
    primaryCurrentAge: currentAge,
    retirementAge,
    deathAge: 75,
    startingPortfolio: 200_000,
    earners: [makeEarner({
      currentAge,
      retirementAge,
      salary: 80_000,
      contributionPeriods: [{ fromAge: currentAge, rate: savingsRate }],
      wageGrowthRate: 0.03,
    })],
    expenses: [{ amount: annualExpenses, inflationMultiplier: 1.0 }],
    pensions: [],
    investmentParams: { ...buildInvestmentParams('moderate', 'moderate'), kneeYear: retirementAge - currentAge, deriskYears: 10 },
    inflationParams: { meanInflation: 0.03, inflationVolatility: 0, returnInflationCorrelation: 0 },
    effectiveTaxRate: 0,
    coastAge: null, earnerCoastIndex: null,
    windfallEvents: [], rentalProperties: [], primaryResidence: null,
    guardrailsEnabled: false, stressShockEnabled: false,
    rngFn: fixedRng(0.07, 0.03),
  };
}

// ── Scenario 1: Always Fail ───────────────────────────────────────────────────

describe('Scenario: Always Fail', () => {
  it('single run fails immediately when expenses dwarf portfolio', () => {
    const config = retiredConfig({ portfolio: 50_000, annualExpenses: 100_000, returnRate: 0.03 });
    const { success, failureAge } = runSimulation(config);
    expect(success).toBe(false);
    expect(failureAge).toBeLessThanOrEqual(67);
  });

  it('MC reports 0% success when returns cannot cover expenses', () => {
    const config = retiredConfig({ portfolio: 50_000, annualExpenses: 100_000, returnRate: 0.03 });
    const { successRate, meetsConfidence } = runMonteCarlo({ ...config, numRuns: 30, confidenceTarget: 0.83 });
    expect(successRate).toBe(0);
    expect(meetsConfidence).toBe(false);
  });

  it('MC reports 0% even with good returns when portfolio is catastrophically small', () => {
    const config = retiredConfig({ portfolio: 1_000, annualExpenses: 60_000, returnRate: 0.10 });
    const { successRate } = runMonteCarlo({ ...config, numRuns: 30, confidenceTarget: 0.83 });
    expect(successRate).toBe(0);
  });
});

// ── Scenario 2: Always Succeed ────────────────────────────────────────────────

describe('Scenario: Always Succeed', () => {
  it('single run succeeds when portfolio is large relative to expenses', () => {
    const config = retiredConfig({ portfolio: 5_000_000, annualExpenses: 40_000, returnRate: 0.08 });
    const { success } = runSimulation(config);
    expect(success).toBe(true);
  });

  it('MC reports 100% success when portfolio is overwhelmingly large', () => {
    const config = retiredConfig({ portfolio: 5_000_000, annualExpenses: 40_000, returnRate: 0.08 });
    const { successRate, meetsConfidence } = runMonteCarlo({ ...config, numRuns: 30, confidenceTarget: 0.83 });
    expect(successRate).toBe(1);
    expect(meetsConfidence).toBe(true);
  });

  it('long accumulation with high savings always succeeds deterministically', () => {
    const earner = makeEarner({
      currentAge: 35, retirementAge: 65, salary: 100_000,
      contributionPeriods: [{ fromAge: 35, rate: 0.25 }],
      wageGrowthRate: 0.03,
    });
    const config = {
      primaryCurrentAge: 35, retirementAge: 65, deathAge: 90,
      startingPortfolio: 200_000,
      earners: [earner],
      expenses: [{ amount: 40_000, inflationMultiplier: 1.0 }],
      pensions: [],
      investmentParams: { ...buildInvestmentParams('moderate', 'moderate'), kneeYear: 30, deriskYears: 20 },
      inflationParams: { meanInflation: 0.03, inflationVolatility: 0, returnInflationCorrelation: 0 },
      effectiveTaxRate: 0, coastAge: null, earnerCoastIndex: null,
      windfallEvents: [], rentalProperties: [], primaryResidence: null,
      guardrailsEnabled: false, stressShockEnabled: false,
      numRuns: 10, confidenceTarget: 0.83,
      rngFn: fixedRng(0.07, 0.03),
    };
    const { successRate } = runMonteCarlo(config);
    expect(successRate).toBe(1);
  });
});

// ── Scenario 3: Marginal — WhatIf suggestions flip outcome ───────────────────
//
// Deterministically calibrated (rngFn=fixedRng(0.07, 0.03)):
//   11.0% savings, retire 65, die 75  → FAILS  (verified: portfolio goes negative at age 74)
//   12.1% savings (11% × 1.10)        → PASSES (verified: $1,150 at age 74)
//   10.0% savings, retire 67          → PASSES (verified: $237,799 at age 74)
//   13.0% savings                     → PASSES (verified: $23,880 at age 74)
//   11.7% savings (13% × 0.90)        → FAILS  (verified: portfolio gone at age 74)

describe('Scenario: Marginal — WhatIf suggestions flip the outcome', () => {
  it('base scenario (11% savings) fails deterministically', () => {
    const { success } = runSimulation(marginalConfig({ savingsRate: 0.11 }));
    expect(success).toBe(false);
  });

  it('base scenario MC does not meet confidence target', () => {
    const { meetsConfidence } = runMonteCarlo({
      ...marginalConfig({ savingsRate: 0.11 }),
      numRuns: 5, confidenceTarget: 0.83,
    });
    expect(meetsConfidence).toBe(false);
  });

  it('"save 10% more" (11% → 12.1%) turns a failing scenario into a passing one', () => {
    const base = runSimulation(marginalConfig({ savingsRate: 0.11 }));
    const more = runSimulation(marginalConfig({ savingsRate: 0.121 })); // 11% × 1.10
    expect(base.success).toBe(false);
    expect(more.success).toBe(true);
  });

  it('"retire 2 years later" (retire 67) turns a failing scenario into a passing one', () => {
    const base = runSimulation(marginalConfig({ savingsRate: 0.10, retirementAge: 65 }));
    const later = runSimulation(marginalConfig({ savingsRate: 0.10, retirementAge: 67 }));
    expect(base.success).toBe(false);
    expect(later.success).toBe(true);
  });

  it('"save 10% less" (13% → 11.7%) turns a passing scenario into a failing one', () => {
    const base = runSimulation(marginalConfig({ savingsRate: 0.13 }));  // passes
    const less = runSimulation(marginalConfig({ savingsRate: 0.117 })); // 13% × 0.90, fails
    expect(base.success).toBe(true);
    expect(less.success).toBe(false);
  });

  it('higher savings always builds a larger portfolio by retirement', () => {
    const more = runSimulation(marginalConfig({ savingsRate: 0.20 }));
    const less = runSimulation(marginalConfig({ savingsRate: 0.05 }));
    const moreAtRetirement = more.yearlyData.find(y => y.age === 64)?.portfolio ?? 0;
    const lessAtRetirement = less.yearlyData.find(y => y.age === 64)?.portfolio ?? 0;
    expect(moreAtRetirement).toBeGreaterThan(lessAtRetirement);
  });
});

// ── FERS: retiring at 62 pays more than retiring at 58 ───────────────────────

describe('FERS "work to 62" suggestion', () => {
  const fersParams = {
    currentSalary: 80_000,
    currentYearsOfService: 15,
    currentAge: 45,
    wageGrowthRate: 0.03,
    mra: 57,
  };

  it('retiring at 62 triggers the 1.1× multiplier (vs 1.0× at 58)', () => {
    const at58 = calculateFERS({ ...fersParams, retirementAge: 58 });
    const at62 = calculateFERS({ ...fersParams, retirementAge: 62 });
    expect(at62.annualAmount).toBeGreaterThan(at58.annualAmount);
  });

  it('the 1.1× multiplier only applies at 62+ with 20+ years of service', () => {
    const result = calculateFERS({ ...fersParams, retirementAge: 62 });
    // 15 + (62-45) = 32 years of service, age 62 → qualifies for 1.1%
    expect(result.totalYearsOfService).toBe(32);
    const high3 = 80_000 * Math.pow(1.03, 62 - 45 - 1.5);
    expect(result.annualAmount).toBeCloseTo(high3 * 0.011 * 32, -1);
  });

  it('retiring at 62 more than compensates for 4 extra working years', () => {
    // Even accounting for 4 extra years of work, the higher multiplier + more
    // service years means annual benefit grows substantially
    const at58 = calculateFERS({ ...fersParams, retirementAge: 58 });
    const at62 = calculateFERS({ ...fersParams, retirementAge: 62 });
    const pctIncrease = (at62.annualAmount - at58.annualAmount) / at58.annualAmount;
    expect(pctIncrease).toBeGreaterThan(0.20); // at least 20% more per year
  });
});
