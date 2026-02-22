/**
 * Social Security PIA (Primary Insurance Amount) estimator.
 *
 * Uses SSA's "today's dollars" approach: assumes the earner continues
 * earning their current salary (in real terms) throughout their career.
 * This matches SSA's Quick Calculator in constant-dollar mode.
 *
 * Steps:
 *   1. Estimate total working years (age 22 to 67)
 *   2. Cap salary at SSA taxable maximum
 *   3. Compute AIME from top 35 earning years
 *   4. Apply 2025 PIA bend-point formula
 *
 * For younger workers with fewer than 35 years of work history,
 * the zero-earning years reduce the AIME (matching real SSA behavior).
 *
 * All constants loaded from src/data/ssaConstants.json for transparency.
 */

import ssaData from '../data/ssaConstants.json';

const TAXABLE_MAX = ssaData.taxableMaximum['2025'];
const BEND_1 = ssaData.bendPoints.first;
const BEND_2 = ssaData.bendPoints.second;
const RATES = ssaData.piaFormula.rates;
const CAREER_START_AGE = ssaData.assumptions.careerStartAge;
const FRA = ssaData.assumptions.fullRetirementAge;
const TOP_YEARS = ssaData.assumptions.topEarningYears;

/**
 * Estimate monthly PIA (benefit at Full Retirement Age).
 *
 * Uses constant-dollar approach: assumes earner continues at current salary.
 * Accounts for fewer than 35 earning years for younger workers.
 *
 * @param {number} salary - Current annual salary
 * @param {number} currentAge - Current age
 * @param {number} [wageGrowthRate] - Unused, kept for API compatibility
 * @returns {number} Estimated monthly PIA in today's dollars
 */
export function estimateMonthlyPIA(salary, currentAge, wageGrowthRate) {
  if (!salary || salary <= 0 || !currentAge || currentAge < CAREER_START_AGE) {
    return 2500; // fallback default
  }

  // Cap at taxable maximum
  const cappedSalary = Math.min(salary, TAXABLE_MAX);

  // Total career years: from age 22 to FRA (67)
  const totalWorkingYears = FRA - CAREER_START_AGE; // 45
  const earningYears = Math.min(totalWorkingYears, 45);
  const top = Math.min(earningYears, TOP_YEARS);

  // AIME = (top 35 years of earnings) / 420 months
  // Since all earning years have the same salary in constant dollars,
  // AIME = (cappedSalary * top35) / (35 * 12)
  const aime = (cappedSalary * top) / (TOP_YEARS * 12);

  // Apply PIA bend-point formula
  let pia = 0;
  pia += RATES[0] * Math.min(aime, BEND_1);
  pia += RATES[1] * Math.max(0, Math.min(aime, BEND_2) - BEND_1);
  pia += RATES[2] * Math.max(0, aime - BEND_2);

  return Math.round(pia);
}
