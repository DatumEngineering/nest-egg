import { describe, it, expect } from 'vitest';
import { calculateFERS, calculateDeferredFERS, calculateSocialSecurity } from '../engine/pensions.js';
import { estimateMonthlyPIA } from '../engine/socialSecurity.js';

describe('calculateFERS — active', () => {
  const base = {
    currentSalary: 80_000,
    currentYearsOfService: 10,
    currentAge: 45,
    retirementAge: 65,
    wageGrowthRate: 0.03,
    mra: 57,
  };

  it('uses 1.0% multiplier when retiring before 62 with < 20 years', () => {
    const { annualAmount, totalYearsOfService } = calculateFERS({ ...base, retirementAge: 60 });
    const high3 = 80_000 * Math.pow(1.03, 60 - 45 - 1.5);
    expect(annualAmount).toBeCloseTo(high3 * 0.01 * (10 + 15), -1);
  });

  it('uses 1.1% multiplier when retiring at 62+ with 20+ years of service', () => {
    const { annualAmount, totalYearsOfService } = calculateFERS({ ...base, retirementAge: 62 });
    // total service = 10 + (62-45) = 27 years, age >= 62 → 1.1% multiplier
    expect(totalYearsOfService).toBe(27);
    const high3 = 80_000 * Math.pow(1.03, 62 - 45 - 1.5);
    expect(annualAmount).toBeCloseTo(high3 * 0.011 * 27, -1);
  });

  it('retiring at 62 yields more annual income than retiring at 58', () => {
    const at58 = calculateFERS({ ...base, retirementAge: 58 });
    const at62 = calculateFERS({ ...base, retirementAge: 62 });
    expect(at62.annualAmount).toBeGreaterThan(at58.annualAmount);
  });

  it('applies early retirement penalty for MRA+10 before 62', () => {
    // 10 years service, MRA 57, retiring at 58 → 4 years under 62 → 20% reduction
    const result = calculateFERS({ ...base, retirementAge: 58, currentYearsOfService: 10 });
    expect(result.isReduced).toBe(true);
    expect(result.reductionPct).toBeCloseTo(0.20, 5);
  });

  it('reports immediate eligibility when meeting 30-year-at-MRA rule', () => {
    const result = calculateFERS({ ...base, currentYearsOfService: 15, retirementAge: 62 });
    expect(result.immediateEligible).toBe(true);
  });
});

describe('calculateDeferredFERS', () => {
  it('calculates annual amount from high-three and years of service', () => {
    const result = calculateDeferredFERS({
      highThree: 70_000,
      yearsOfService: 10,
      currentAge: 45,
      collectionAge: 62,
    });
    // 10 years × 1.0% × $70K = $7K
    expect(result.annualAmount).toBeCloseTo(7_000, 0);
  });
});

describe('calculateSocialSecurity', () => {
  // calculateSocialSecurity takes a pre-computed monthlyBenefitAtFRA.
  // Use estimateMonthlyPIA to get a realistic value from salary, then pass it through.
  const monthlyPIA = estimateMonthlyPIA(75_000, 40, 0.03);

  it('returns a positive benefit for a realistic PIA', () => {
    const result = calculateSocialSecurity({ monthlyBenefitAtFRA: monthlyPIA, claimingAge: 67 });
    expect(result.annualAmount).toBeGreaterThan(0);
  });

  it('delayed claiming past FRA increases the annual benefit', () => {
    const at67 = calculateSocialSecurity({ monthlyBenefitAtFRA: monthlyPIA, claimingAge: 67 });
    const at70 = calculateSocialSecurity({ monthlyBenefitAtFRA: monthlyPIA, claimingAge: 70 });
    expect(at70.annualAmount).toBeGreaterThan(at67.annualAmount);
  });

  it('early claiming before FRA reduces the annual benefit', () => {
    const at62 = calculateSocialSecurity({ monthlyBenefitAtFRA: monthlyPIA, claimingAge: 62 });
    const at67 = calculateSocialSecurity({ monthlyBenefitAtFRA: monthlyPIA, claimingAge: 67 });
    expect(at62.annualAmount).toBeLessThan(at67.annualAmount);
  });
});
