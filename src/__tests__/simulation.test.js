import { describe, it, expect } from 'vitest';
import { runSimulation } from '../engine/simulation.js';
import { makeConfig, makeEarner, fixedRng } from './helpers.js';

describe('runSimulation — basic mechanics', () => {
  it('returns yearlyData with one entry per simulation year', () => {
    const config = makeConfig({ primaryCurrentAge: 40, deathAge: 90 });
    const { yearlyData } = runSimulation(config);
    expect(yearlyData).toHaveLength(90 - 40);
  });

  it('succeeds when portfolio grows faster than withdrawals', () => {
    // $2M portfolio, $50K expenses, 7% fixed return — easily survives
    const config = makeConfig({
      startingPortfolio: 2_000_000,
      expenses: [{ amount: 50000, inflationMultiplier: 1.0 }],
      rngFn: fixedRng(0.07, 0.03),
    });
    const { success } = runSimulation(config);
    expect(success).toBe(true);
  });

  it('fails when expenses exceed portfolio from the start', () => {
    const config = makeConfig({
      startingPortfolio: 50_000,
      primaryCurrentAge: 65,
      retirementAge: 65,
      deathAge: 90,
      earners: [makeEarner({ currentAge: 65, retirementAge: 65, salary: 0, contributionPeriods: [{ fromAge: 65, rate: 0 }] })],
      expenses: [{ amount: 80_000, inflationMultiplier: 1.0 }],
      rngFn: fixedRng(0.04, 0.03),
    });
    const { success, failureAge } = runSimulation(config);
    expect(success).toBe(false);
    expect(failureAge).toBeLessThan(70);
  });

  it('portfolio grows during accumulation and shrinks in retirement', () => {
    const config = makeConfig({
      primaryCurrentAge: 50,
      retirementAge: 60,
      deathAge: 80,
      startingPortfolio: 100_000,
      earners: [makeEarner({ currentAge: 50, retirementAge: 60, salary: 60000, contributionPeriods: [{ fromAge: 50, rate: 0.20 }] })],
      expenses: [{ amount: 40_000, inflationMultiplier: 1.0 }],
      rngFn: fixedRng(0.07, 0.02),
    });
    const { yearlyData } = runSimulation(config);

    const atRetirement = yearlyData.find(y => y.age >= 60);
    const atStart = yearlyData[0];
    expect(atRetirement.portfolio).toBeGreaterThan(atStart.portfolio);
  });
});

describe('runSimulation — contribution periods', () => {
  it('stops adding contributions when a zero-rate period activates', () => {
    const currentAge = 40;
    const switchAge = 50;
    const retirementAge = 65;
    const zeroInflation = { meanInflation: 0, inflationVolatility: 0, returnInflationCorrelation: 0 };

    // Baseline: contribute 20% the whole time
    const continuous = makeConfig({
      primaryCurrentAge: currentAge,
      retirementAge,
      deathAge: 90,
      startingPortfolio: 0,
      earners: [makeEarner({ currentAge, retirementAge, salary: 100_000, contributionPeriods: [{ fromAge: currentAge, rate: 0.20 }], wageGrowthRate: 0 })],
      expenses: [{ amount: 0, inflationMultiplier: 1.0 }],
      inflationParams: zeroInflation,
      rngFn: fixedRng(0.00, 0.00),
    });

    // Coast/barista: 20% until 50, then 0%
    const coast = makeConfig({
      primaryCurrentAge: currentAge,
      retirementAge,
      deathAge: 90,
      startingPortfolio: 0,
      earners: [makeEarner({
        currentAge, retirementAge, salary: 100_000, wageGrowthRate: 0,
        contributionPeriods: [{ fromAge: currentAge, rate: 0.20 }, { fromAge: switchAge, rate: 0.00 }],
      })],
      expenses: [{ amount: 0, inflationMultiplier: 1.0 }],
      inflationParams: zeroInflation,
      rngFn: fixedRng(0.00, 0.00),
    });

    const contPortfolio = runSimulation(continuous).yearlyData.at(-1).portfolio;
    const coastPortfolio = runSimulation(coast).yearlyData.at(-1).portfolio;

    // 25 contribution years vs 10 → coast portfolio must be lower
    expect(coastPortfolio).toBeLessThan(contPortfolio);
  });

  it('uses the correct rate for each age bracket', () => {
    // With 0% return, zero inflation, and zero wage growth, portfolio at retirement
    // = sum of contributions: 10 yrs × $100K × 20% + 15 yrs × $100K × 5% = $275K
    //
    // We must set meanInflation=0 to zero out wageDiff in the simulation
    // (otherwise wageDiff = wageGrowthRate − meanCPI = 0 − 0.03 shrinks effective salary)
    const zeroInflation = { meanInflation: 0, inflationVolatility: 0, returnInflationCorrelation: 0 };
    const config = makeConfig({
      primaryCurrentAge: 40,
      retirementAge: 65,
      deathAge: 90,
      startingPortfolio: 0,
      earners: [makeEarner({
        currentAge: 40,
        retirementAge: 65,
        salary: 100_000,
        contributionPeriods: [
          { fromAge: 40, rate: 0.20 },
          { fromAge: 50, rate: 0.05 },
        ],
        wageGrowthRate: 0,
      })],
      expenses: [{ amount: 0, inflationMultiplier: 1.0 }],
      inflationParams: zeroInflation,
      rngFn: fixedRng(0.00, 0.00),
    });
    const { yearlyData } = runSimulation(config);
    const portfolioAtRetirement = yearlyData.find(y => y.age === 65)?.portfolio;
    // 10 yrs × $20K + 15 yrs × $5K = $200K + $75K = $275K
    expect(portfolioAtRetirement).toBeCloseTo(275_000, -2);
  });

  it('single period is equivalent to the old flat savingsRate behaviour', () => {
    const zeroInflation = { meanInflation: 0, inflationVolatility: 0, returnInflationCorrelation: 0 };
    const config = makeConfig({
      primaryCurrentAge: 40,
      retirementAge: 65,
      deathAge: 90,
      startingPortfolio: 50_000,
      earners: [makeEarner({
        currentAge: 40,
        retirementAge: 65,
        salary: 80_000,
        contributionPeriods: [{ fromAge: 40, rate: 0.15 }],
        wageGrowthRate: 0,
      })],
      expenses: [{ amount: 0, inflationMultiplier: 1.0 }],
      inflationParams: zeroInflation,
      rngFn: fixedRng(0.00, 0.00),
    });
    const { yearlyData } = runSimulation(config);
    const portfolioAtRetirement = yearlyData.find(y => y.age === 65)?.portfolio;
    // $50K initial + 25 yrs × ($80K × 15%) = $50K + $300K = $350K
    expect(portfolioAtRetirement).toBeCloseTo(50_000 + 25 * 12_000, -2);
  });
});

describe('runSimulation — windfall events', () => {
  it('adds windfall amount to portfolio in the correct year', () => {
    const yearsFromNow = 5;
    const config = makeConfig({
      primaryCurrentAge: 40,
      retirementAge: 65,
      deathAge: 90,
      startingPortfolio: 0,
      earners: [makeEarner({ currentAge: 40, retirementAge: 65, salary: 0, contributionPeriods: [{ fromAge: 40, rate: 0 }] })],
      expenses: [{ amount: 0, inflationMultiplier: 1.0 }],
      windfallEvents: [{ amount: 100_000, taxRate: 0, annualGrowthRate: 0, yearsFromNow, stdDev: 0, probability: 1.0 }],
      rngFn: fixedRng(0.00, 0.00),
    });
    const { yearlyData } = runSimulation(config);
    // Portfolio should jump at year 5 (age 45)
    const yearBefore = yearlyData[yearsFromNow - 1].portfolio;
    const yearOf = yearlyData[yearsFromNow].portfolio;
    expect(yearOf).toBeGreaterThan(yearBefore + 90_000);
  });
});
