import { describe, it, expect } from 'vitest';
import { buildInvestmentParams, getAllocationFraction, getBlendedParams, BEFORE_PRESETS, AFTER_PRESETS } from '../engine/investment.js';

describe('buildInvestmentParams', () => {
  it('returns before-preset values for highYield fields', () => {
    const params = buildInvestmentParams('aggressive', 'conservative');
    expect(params.highYieldRate).toBe(BEFORE_PRESETS.aggressive.rate);
    expect(params.highYieldVolatility).toBe(BEFORE_PRESETS.aggressive.volatility);
  });

  it('returns after-preset values for conservative fields', () => {
    const params = buildInvestmentParams('moderate', 'conservative');
    expect(params.conservativeRate).toBe(AFTER_PRESETS.conservative.rate);
    expect(params.conservativeVolatility).toBe(AFTER_PRESETS.conservative.volatility);
  });

  it('falls back to moderate when given an unknown preset key', () => {
    const params = buildInvestmentParams('unknown', 'unknown');
    expect(params.highYieldRate).toBe(BEFORE_PRESETS.moderate.rate);
    expect(params.conservativeRate).toBe(AFTER_PRESETS.moderate.rate);
  });

  it('applies overrides on top of presets', () => {
    const params = buildInvestmentParams('moderate', 'moderate', { df: 10 });
    expect(params.df).toBe(10);
  });
});

describe('getAllocationFraction', () => {
  it('returns 0 (full aggressive) before taper window starts', () => {
    // kneeYear=25, deriskYears=20 → taper window is years 5-25
    expect(getAllocationFraction(0, 25, 20, 0.5, 'lifecycle')).toBe(0);
    expect(getAllocationFraction(4, 25, 20, 0.5, 'lifecycle')).toBe(0);
  });

  it('returns 1 (full conservative) at or after knee year', () => {
    expect(getAllocationFraction(25, 25, 20, 0.5, 'lifecycle')).toBe(1);
    expect(getAllocationFraction(30, 25, 20, 0.5, 'lifecycle')).toBe(1);
  });

  it('linearly interpolates in the taper window', () => {
    // kneeYear=20, deriskYears=20 → taper window 0-20
    const mid = getAllocationFraction(10, 20, 20, 0.5, 'lifecycle');
    expect(mid).toBeCloseTo(0.5, 5);
  });

  it('stays at 0 throughout when deriskYears=0 and strategy=none', () => {
    expect(getAllocationFraction(50, 20, 0, 0.5, 'none')).toBe(0);
  });
});

describe('getBlendedParams', () => {
  it('returns high-yield params before derisking begins', () => {
    const params = buildInvestmentParams('moderate', 'moderate');
    const result = getBlendedParams(0, { ...params, kneeYear: 25, deriskYears: 20 });
    expect(result.mean).toBeCloseTo(BEFORE_PRESETS.moderate.rate, 5);
    expect(result.volatility).toBeCloseTo(BEFORE_PRESETS.moderate.volatility, 5);
  });

  it('returns conservative params at or after knee year', () => {
    const params = buildInvestmentParams('moderate', 'moderate');
    const result = getBlendedParams(25, { ...params, kneeYear: 25, deriskYears: 20 });
    expect(result.mean).toBeCloseTo(AFTER_PRESETS.moderate.rate, 5);
    expect(result.volatility).toBeCloseTo(AFTER_PRESETS.moderate.volatility, 5);
  });

  it('blended mean is between the two extremes during taper', () => {
    const params = buildInvestmentParams('moderate', 'conservative');
    const result = getBlendedParams(10, { ...params, kneeYear: 20, deriskYears: 20 });
    expect(result.mean).toBeGreaterThan(AFTER_PRESETS.conservative.rate);
    expect(result.mean).toBeLessThan(BEFORE_PRESETS.moderate.rate);
  });
});
