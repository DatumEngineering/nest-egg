/**
 * Expense model with per-category inflation rates.
 *
 * Amounts are stored as the final user-facing values (already COL-adjusted).
 * When a user picks a location, the UI multiplies national averages by the
 * COL multiplier and writes the result directly into the expense amounts.
 * The simulation uses these amounts as-is.
 */

/**
 * National average expense categories for a single-person retiree household.
 * These serve as the base; they get multiplied by COL and household size
 * in the UI layer before being stored in state.
 */
export const DEFAULT_CATEGORIES = [
  { key: 'housing', label: 'Housing', amount: 18000, inflationRate: 0.03, perPersonScale: 0.1 },
  { key: 'food', label: 'Food', amount: 7500, inflationRate: 0.035, perPersonScale: 0.7 },
  { key: 'transportation', label: 'Transportation', amount: 8000, inflationRate: 0.035, perPersonScale: 0.5 },
  { key: 'healthInsurance', label: 'Health Insurance', amount: 7000, inflationRate: 0.05, perPersonScale: 1.0 },
  { key: 'healthCosts', label: 'Out-of-Pocket Medical', amount: 4000, inflationRate: 0.06, perPersonScale: 1.0 },
  { key: 'entertainment', label: 'Entertainment', amount: 3500, inflationRate: 0.03, perPersonScale: 0.5 },
  { key: 'travel', label: 'Travel', amount: 5000, inflationRate: 0.035, perPersonScale: 0.8 },
  { key: 'utilities', label: 'Utilities', amount: 4500, inflationRate: 0.035, perPersonScale: 0.2 },
  { key: 'clothing', label: 'Clothing & Personal', amount: 2000, inflationRate: 0.025, perPersonScale: 1.0 },
  { key: 'other', label: 'Other / Miscellaneous', amount: 3000, inflationRate: 0.03, perPersonScale: 0.5 },
];

/**
 * Get the effective inflation for a category in a given year.
 */
export function getCategoryInflation(baseCPIDraw, categoryRate, meanCPI) {
  const differential = categoryRate - meanCPI;
  return baseCPIDraw + differential;
}

/**
 * Populate expenses from national averages adjusted for COL and household size.
 * Called when user changes location or earner count.
 *
 * @param {number} colMultiplier - Cost of living multiplier
 * @param {number} numPeople - Number of people in household
 * @returns {Array} Expense categories with adjusted amounts
 */
export function buildExpensesForLocation(colMultiplier, numPeople) {
  const extra = Math.max(0, numPeople - 1);
  return DEFAULT_CATEGORIES.map((cat) => ({
    ...cat,
    amount: Math.round(cat.amount * colMultiplier * (1 + cat.perPersonScale * extra)),
  }));
}
