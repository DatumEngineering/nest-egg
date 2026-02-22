/**
 * Single simulation run.
 *
 * Simulates one possible future from current year to death age,
 * drawing stochastic market returns and inflation each year.
 *
 * Supports:
 *   - Multiple earners with individual retirement ages
 *   - Transitional phase: when some earners retire while others work,
 *     working income offsets retirement expenses
 *   - Per-category stochastic inflation
 *   - Effective tax rate on retirement withdrawals
 *   - Coast logic (stop contributions at a given age)
 *   - Student's t-distributed returns (fat tails via df parameter)
 *   - Rental property income with optional sale
 *
 * IMPORTANT: Expenses are specified in TODAY's dollars. They are
 * compounded by stochastic inflation from year 0 (today) through
 * the current simulation year, so by retirement they reflect the
 * full inflation-adjusted cost.
 *
 * Cash flow model:
 *   - Pre-retirement (no one retired): working earners contribute savings
 *   - Transitional (some retired, some working): expenses begin,
 *     working income offsets expenses, excess goes to portfolio
 *   - Full retirement (all retired): withdraw expenses - pensions
 *
 * Windfall events:
 *   One-time cash inflows with stochastic timing. Each event has an
 *   expected arrival year, timing uncertainty (stdDev), probability of
 *   occurring, amount, and tax rate. Each simulation run draws whether
 *   and when the event fires.
 *
 * Rental properties:
 *   Ongoing income streams from investment properties. Rent grows with
 *   inflation, mortgage is fixed. Properties can optionally be sold at
 *   a specified year, depositing appreciated value into portfolio.
 */

import { getBlendedParams } from './investment.js';
import { INFLATION_DEFAULTS } from './inflation.js';
import { getCategoryInflation } from './expenses.js';
import { getPensionIncome } from './pensions.js';
import { bivariateNormal, normalRandom } from './random.js';

/**
 * Run a single simulation path.
 */
export function runSimulation(config) {
  const {
    primaryCurrentAge,
    retirementAge,
    deathAge,
    startingPortfolio,
    earners,
    expenses,
    pensions,
    investmentParams = {},
    inflationParams = {},
    effectiveTaxRate = 0,
    coastAge,
    earnerCoastIndex,
    windfallEvents = [],
    rentalProperties = [],
    primaryResidence = null,
  } = config;

  const infParams = { ...INFLATION_DEFAULTS, ...inflationParams };
  const rng = config.rngFn || bivariateNormal;
  const df = investmentParams.df ?? null;
  const meanCPI = infParams.meanInflation;
  const taxMultiplier = effectiveTaxRate > 0 ? 1 / (1 - effectiveTaxRate) : 1;

  // Earliest retirement age triggers expenses
  const earliestRetirementAge = Math.min(
    retirementAge,
    ...earners.map(e => e.retirementAge ?? retirementAge)
  );

  const totalYears = deathAge - primaryCurrentAge;
  let portfolio = startingPortfolio;

  // Pre-compute windfall arrival years for this run
  const isDeterministic = config.rngFn != null;
  const windfallArrivalYears = windfallEvents.map(event => {
    if (isDeterministic) {
      // Deterministic mode: always fire at expected year
      const year = Math.round(event.yearsFromNow);
      return (year >= 0 && year < totalYears) ? year : -1;
    }
    // Does it happen at all?
    if (event.probability < 1 && Math.random() > event.probability) return -1;
    // Draw arrival year from normal distribution around expected
    const arrivalYear = Math.round(
      normalRandom(event.yearsFromNow, event.stdDev ?? 0)
    );
    // Clamp to valid range
    if (arrivalYear < 0 || arrivalYear >= totalYears) return -1;
    return arrivalYear;
  });

  // Track which rental properties have been sold
  const propertySold = rentalProperties.map(() => false);

  // Primary residence downsize: determine target year
  let downsizeProcessed = false;
  const downsizeYear = primaryResidence
    ? (primaryResidence.downsizeYear ?? (retirementAge - primaryCurrentAge))
    : -1;

  const yearlyData = [];
  const inflationDraws = [];
  const catCumFactors = expenses.map(() => 1);
  let cumulativeRentInflation = 1;

  for (let yearIndex = 0; yearIndex < totalYears; yearIndex++) {
    const primaryAge = primaryCurrentAge + yearIndex;

    // Determine retirement state
    const anyRetired = primaryAge >= earliestRetirementAge;
    const allRetired = earners.every(e => (e.currentAge + yearIndex) >= e.retirementAge);

    const { mean: returnMean, volatility: returnVol } = getBlendedParams(
      yearIndex,
      investmentParams
    );

    // Pass df for Student's t distribution (ignored by deterministic rngFn)
    const [marketReturn, baseInflation] = rng(
      returnMean,
      returnVol,
      infParams.meanInflation,
      infParams.inflationVolatility,
      infParams.returnInflationCorrelation,
      df
    );

    inflationDraws.push(baseInflation);
    cumulativeRentInflation *= 1 + baseInflation;

    for (let c = 0; c < expenses.length; c++) {
      const catInflation = getCategoryInflation(
        baseInflation,
        expenses[c].inflationRate,
        meanCPI
      );
      catCumFactors[c] *= 1 + catInflation;
    }

    portfolio += portfolio * marketReturn;

    // Deposit any windfall events arriving this year
    let windfallIncome = 0;
    for (let wi = 0; wi < windfallArrivalYears.length; wi++) {
      if (windfallArrivalYears[wi] === yearIndex) {
        const event = windfallEvents[wi];
        // Grow the amount from today's value to arrival year
        const grownAmount = event.amount *
          Math.pow(1 + (event.annualGrowthRate ?? 0), yearIndex);
        const netAmount = grownAmount * (1 - (event.taxRate ?? 0));
        // In deterministic mode, scale by probability for expected value
        const scaled = isDeterministic ? netAmount * (event.probability ?? 1) : netAmount;
        windfallIncome += scaled;
        portfolio += scaled;
      }
    }

    // Compute rental property income
    let rentalIncome = 0;
    for (let pi = 0; pi < rentalProperties.length; pi++) {
      if (propertySold[pi]) continue;
      const prop = rentalProperties[pi];

      // Check if property is sold this year
      if (prop.sellInYears != null && yearIndex >= prop.sellInYears) {
        const appreciatedValue = prop.currentValue *
          Math.pow(1 + (prop.appreciationRate ?? 0.03), yearIndex);
        const saleProceeds = appreciatedValue * (1 - (prop.sellCostPct ?? 0.06));
        portfolio += saleProceeds;
        propertySold[pi] = true;
        continue;
      }

      // Net annual rental income (rent grows with inflation, mortgage is fixed until paid off)
      const inflatedRent = prop.grossMonthlyRent * 12 * cumulativeRentInflation;
      const effectiveRent = inflatedRent * (1 - (prop.vacancyRate ?? 0.05));
      const maintenance = inflatedRent * (prop.maintenancePct ?? 0.10);
      const mortgagePaidOff = prop.mortgageEndYears != null && yearIndex >= prop.mortgageEndYears;
      const mortgage = mortgagePaidOff ? 0 : (prop.mortgagePayment ?? 0) * 12;
      const netRental = effectiveRent - maintenance - mortgage;
      rentalIncome += netRental;
    }

    // Primary residence downsize: sell current home, buy smaller one
    if (primaryResidence && !downsizeProcessed && yearIndex >= downsizeYear) {
      const pr = primaryResidence;
      const appreciatedCurrent = pr.currentValue *
        Math.pow(1 + (pr.appreciationRate ?? 0.03), yearIndex);
      const saleProceeds = appreciatedCurrent * (1 - (pr.saleCostPct ?? 0.06));
      const appreciatedTarget = (pr.downsizeTargetValue ?? 0) *
        Math.pow(1 + (pr.appreciationRate ?? 0.03), yearIndex);
      const newHomeCost = appreciatedTarget * (1 + (pr.purchaseCostPct ?? 0.02));
      // Linear mortgage paydown: if mortgageYearsLeft is set and elapsed >= that, balance is 0
      const remaining = pr.remainingMortgage ?? 0;
      const yearsLeft = pr.mortgageYearsLeft;
      let mortgageOwed = remaining;
      if (remaining > 0 && yearsLeft != null) {
        mortgageOwed = yearIndex >= yearsLeft ? 0 : remaining * (1 - yearIndex / yearsLeft);
      }
      const netEquity = saleProceeds - mortgageOwed - newHomeCost;
      portfolio += netEquity;
      downsizeProcessed = true;
    }

    let totalExpenses = 0;
    let totalPensionIncome = 0;
    let totalContribution = 0;
    let workingIncome = 0;

    // Compute working income and contributions from earners still working
    for (let ei = 0; ei < earners.length; ei++) {
      const earner = earners[ei];
      const earnerAge = earner.currentAge + yearIndex;

      if (earnerAge >= earner.retirementAge) continue;

      // Coast logic: skip contributions if coasting
      if (coastAge != null) {
        if (earnerCoastIndex != null) {
          if (ei === earnerCoastIndex && primaryAge >= coastAge) continue;
        } else {
          if (primaryAge >= coastAge) continue;
        }
      }

      const projectedSalary =
        earner.salary * Math.pow(1 + (earner.wageGrowthRate ?? 0.02), yearIndex);

      if (anyRetired) {
        // Transitional: full working income available to offset expenses
        workingIncome += projectedSalary;
      } else {
        // Pure accumulation: contribute savings portion
        totalContribution += projectedSalary * (earner.savingsRate ?? 0.20);
      }
    }

    if (anyRetired) {
      // Compute inflation-adjusted expenses
      totalExpenses = expenses.reduce(
        (sum, cat, i) => sum + cat.amount * catCumFactors[i],
        0
      );

      // Compute pension income
      totalPensionIncome = pensions.reduce((sum, pension) => {
        const earnerAge = pension.earnerCurrentAge + yearIndex;
        if (earnerAge < pension.startAge) return sum;

        let cumInflation = 1;
        if (pension.inflationAdjusted) {
          const startYearIndex = pension.startAge - pension.earnerCurrentAge;
          for (let y = startYearIndex; y < yearIndex; y++) {
            cumInflation *= 1 + inflationDraws[y];
          }
        }

        return sum + getPensionIncome(pension, earnerAge, cumInflation);
      }, 0);

      // Net cash flow: expenses minus income sources
      const preTaxNeeded = totalExpenses * taxMultiplier;
      const netNeeded = preTaxNeeded - totalPensionIncome - workingIncome - rentalIncome;

      if (netNeeded > 0) {
        // Need to withdraw from portfolio
        portfolio -= netNeeded;
      } else {
        // Excess income goes to portfolio as savings
        portfolio += (-netNeeded);
      }
    } else {
      // Pure accumulation phase — all earners working
      // Rental income during accumulation goes to portfolio
      portfolio += totalContribution + rentalIncome;
    }

    yearlyData.push({
      age: primaryAge,
      yearIndex,
      portfolio: Math.max(portfolio, 0),
      marketReturn,
      baseInflation,
      totalExpenses,
      totalPensionIncome,
      workingIncome,
      contribution: totalContribution,
      windfallIncome,
      rentalIncome,
      isRetired: anyRetired,
    });

    if (portfolio <= 0 && anyRetired) {
      return { success: false, failureAge: primaryAge, yearlyData };
    }
  }

  return { success: true, failureAge: null, yearlyData };
}
