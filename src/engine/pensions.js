/**
 * Pension models: FERS (active + deferred), Social Security,
 * Generic Pension/Annuity, and Defined Benefit Formula.
 */

// ── FERS Active ──────────────────────────────────────────────

export function calculateFERS({
  currentSalary,
  currentYearsOfService,
  currentAge,
  retirementAge,
  wageGrowthRate = 0.02,
  mra = 57,
  collectionAge,
}) {
  const yearsToRetirement = retirementAge - currentAge;
  const totalYearsOfService = currentYearsOfService + yearsToRetirement;

  const high3 =
    currentSalary * Math.pow(1 + wageGrowthRate, Math.max(0, yearsToRetirement - 1.5));

  const multiplier =
    retirementAge >= 62 && totalYearsOfService >= 20 ? 0.011 : 0.01;

  const baseAmount = high3 * multiplier * totalYearsOfService;

  let startAge = retirementAge;
  let isReduced = false;
  let reductionPct = 0;
  let immediateEligible = false;

  if (totalYearsOfService >= 30 && retirementAge >= mra) {
    immediateEligible = true;
  } else if (totalYearsOfService >= 20 && retirementAge >= 60) {
    immediateEligible = true;
  } else if (totalYearsOfService >= 10 && retirementAge >= mra) {
    immediateEligible = true;
    const yearsUnder62 = Math.max(0, 62 - retirementAge);
    reductionPct = yearsUnder62 * 0.05;
    isReduced = reductionPct > 0;
  } else {
    // Not eligible for immediate — user picks collection age (default 62)
    startAge = collectionAge ?? 62;
    if (startAge < 62 && totalYearsOfService >= 10 && startAge >= mra) {
      const yearsUnder62 = Math.max(0, 62 - startAge);
      reductionPct = yearsUnder62 * 0.05;
      isReduced = reductionPct > 0;
    }
  }

  const annualAmount = baseAmount * (1 - reductionPct);
  return { annualAmount, startAge, isReduced, reductionPct, immediateEligible, totalYearsOfService, high3 };
}

// ── FERS Deferred ────────────────────────────────────────────

export function calculateDeferredFERS({
  highThree,
  yearsOfService,
  currentAge,
  collectionAge = 62,
  mra = 57,
}) {
  const multiplier = 0.01;
  const baseAmount = highThree * multiplier * yearsOfService;

  let startAge = collectionAge;
  let isReduced = false;
  let reductionPct = 0;

  if (yearsOfService >= 5 && collectionAge >= 62) {
    startAge = collectionAge;
  } else if (yearsOfService >= 10 && collectionAge >= mra) {
    startAge = collectionAge;
    const yearsUnder62 = Math.max(0, 62 - collectionAge);
    reductionPct = yearsUnder62 * 0.05;
    isReduced = reductionPct > 0;
  } else {
    startAge = 62;
  }

  const annualAmount = baseAmount * (1 - reductionPct);
  return { annualAmount, startAge, isReduced, reductionPct };
}

// ── Social Security ──────────────────────────────────────────

export function calculateSocialSecurity({
  monthlyBenefitAtFRA,
  claimingAge,
  fullRetirementAge = 67,
}) {
  const clampedAge = Math.max(62, Math.min(70, claimingAge));
  let adjustmentFactor = 1;

  if (clampedAge < fullRetirementAge) {
    const monthsEarly = (fullRetirementAge - clampedAge) * 12;
    const first36 = Math.min(monthsEarly, 36);
    const remaining = Math.max(0, monthsEarly - 36);
    adjustmentFactor = 1 - (first36 * 5 / 9 / 100) - (remaining * 5 / 12 / 100);
  } else if (clampedAge > fullRetirementAge) {
    const monthsLate = (clampedAge - fullRetirementAge) * 12;
    adjustmentFactor = 1 + (monthsLate * 2 / 3 / 100);
  }

  const annualAmount = monthlyBenefitAtFRA * adjustmentFactor * 12;
  return { annualAmount, startAge: clampedAge, adjustmentFactor };
}

// ── Generic Pension / Annuity ────────────────────────────────

/**
 * A fixed annual benefit starting at a given age.
 * Optionally inflation-adjusted via CPI or a fixed COLA rate.
 */
export function calculateGenericPension({
  annualAmount,
  startAge,
  inflationAdjusted = false,
  colaRate = 0,
}) {
  return {
    annualAmount,
    startAge,
    inflationAdjusted,
    colaRate,
    isReduced: false,
  };
}

// ── Defined Benefit Formula ──────────────────────────────────

/**
 * DB pension: years × multiplier × final average salary.
 * Covers state/local government, military, union pensions.
 */
export function calculateDBPension({
  yearsOfService,
  multiplier,
  finalAvgSalary,
  startAge,
  inflationAdjusted = false,
  colaRate = 0,
}) {
  const annualAmount = yearsOfService * multiplier * finalAvgSalary;
  return {
    annualAmount,
    startAge,
    inflationAdjusted,
    colaRate,
    isReduced: false,
    yearsOfService,
    multiplier,
    finalAvgSalary,
  };
}

// ── FERS COLA cap ─────────────────────────────────────────────
//
// FERS retirees under 62 receive no COLA. At 62+:
//   CPI ≤ 2%  → full CPI
//   CPI 2–3%  → 2%
//   CPI > 3%  → CPI − 1%

function fersCOLA(cpi) {
  if (cpi <= 0.02) return cpi;
  if (cpi <= 0.03) return 0.02;
  return cpi - 0.01;
}

// ── Pension income at simulation time ────────────────────────

export function getPensionIncome(pension, earnerAge, inflationDraws, startYearIndex, yearIndex) {
  if (earnerAge < pension.startAge) return 0;

  // FERS COLA: capped adjustment, only after age 62
  if (pension.colaType === 'fers') {
    let cumCOLA = 1;
    const pensionStartYear = pension.startAge - pension.earnerCurrentAge;
    for (let y = pensionStartYear; y < yearIndex; y++) {
      if (y < 0 || y >= inflationDraws.length) continue;
      const pensionAge = pension.earnerCurrentAge + y + 1;
      // FERS COLA only applies at age 62+
      if (pensionAge >= 62) {
        cumCOLA *= 1 + fersCOLA(inflationDraws[y]);
      }
    }
    return pension.annualAmount * cumCOLA;
  }

  // Full CPI-linked (e.g. Social Security)
  if (pension.inflationAdjusted) {
    let cumInflation = 1;
    const pensionStartYear = pension.startAge - pension.earnerCurrentAge;
    for (let y = pensionStartYear; y < yearIndex; y++) {
      if (y >= 0 && y < inflationDraws.length) {
        cumInflation *= 1 + inflationDraws[y];
      }
    }
    return pension.annualAmount * cumInflation;
  }

  // Fixed COLA (e.g. 2% per year after start)
  if (pension.colaRate > 0) {
    const yearsReceiving = earnerAge - pension.startAge;
    return pension.annualAmount * Math.pow(1 + pension.colaRate, yearsReceiving);
  }

  return pension.annualAmount;
}

// ── Build pensions from earner inputs ────────────────────────

export function buildEarnerPensions(earner) {
  const pensions = [];

  if (earner.fers) {
    let fers;
    if (earner.fers.mode === 'deferred') {
      fers = calculateDeferredFERS({
        ...earner.fers,
        currentAge: earner.currentAge,
      });
    } else {
      fers = calculateFERS({
        ...earner.fers,
        currentAge: earner.currentAge,
        retirementAge: earner.retirementAge,
      });
    }
    pensions.push({
      type: 'fers',
      earnerName: earner.name,
      annualAmount: fers.annualAmount,
      startAge: fers.startAge,
      earnerCurrentAge: earner.currentAge,
      colaType: 'fers',
      inflationAdjusted: false,
      colaRate: 0,
      isReduced: fers.isReduced,
      reductionPct: fers.reductionPct,
    });
  }

  if (earner.socialSecurity) {
    const ss = calculateSocialSecurity(earner.socialSecurity);
    pensions.push({
      type: 'socialSecurity',
      earnerName: earner.name,
      annualAmount: ss.annualAmount,
      startAge: ss.startAge,
      earnerCurrentAge: earner.currentAge,
      inflationAdjusted: true,
      colaRate: 0,
      adjustmentFactor: ss.adjustmentFactor,
    });
  }

  // Generic pensions attached to this earner
  if (earner.genericPensions) {
    for (const gp of earner.genericPensions) {
      const calc = calculateGenericPension(gp);
      pensions.push({
        type: 'generic',
        earnerName: earner.name,
        annualAmount: calc.annualAmount,
        startAge: calc.startAge,
        earnerCurrentAge: earner.currentAge,
        inflationAdjusted: calc.inflationAdjusted,
        colaRate: calc.colaRate,
      });
    }
  }

  // DB formula pensions attached to this earner
  if (earner.dbPensions) {
    for (const db of earner.dbPensions) {
      const calc = calculateDBPension(db);
      pensions.push({
        type: 'db',
        earnerName: earner.name,
        annualAmount: calc.annualAmount,
        startAge: calc.startAge,
        earnerCurrentAge: earner.currentAge,
        inflationAdjusted: calc.inflationAdjusted,
        colaRate: calc.colaRate,
      });
    }
  }

  return pensions;
}

export function buildAllPensions(earners, otherPensions = []) {
  const pensions = [];

  for (const earner of earners) {
    pensions.push(...buildEarnerPensions(earner));
  }

  for (const p of otherPensions) {
    pensions.push({
      type: p.type || 'basic',
      annualAmount: p.annualAmount,
      startAge: p.startAge,
      earnerCurrentAge: p.currentAge ?? earners[0]?.currentAge ?? 30,
      inflationAdjusted: p.inflationAdjusted ?? false,
      colaRate: p.colaRate ?? 0,
    });
  }

  return pensions;
}
