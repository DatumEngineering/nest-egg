import { useState, useCallback, useMemo } from 'react';
import {
  runMonteCarlo, calculateCoastNumber, calculateCoastYear,
  calculateDeterministicCoast, calculateSpendingProjection,
  buildAllPensions, buildExpensesForLocation, RISK_PRESETS,
  getYieldCurve,
} from '../engine/index.js';
import { DEFAULT_CATEGORIES } from '../engine/expenses.js';

export const DEFAULT_EARNER = {
  name: 'You',
  currentAge: 30,
  retirementAge: 65,
  deathAge: 95,
  portfolio: 50000,
  salary: 75000,
  savingsRate: 0.20,
  wageGrowthRate: 0.02,
  fers: null,
  socialSecurity: null,
  genericPensions: [],
  dbPensions: [],
};

const EARNER_NAMES = ['You', 'Spouse', 'Partner 3', 'Partner 4', 'Partner 5'];

export const DEFAULT_INPUTS = {
  retirementAge: 65,

  earners: [{ ...DEFAULT_EARNER }],

  riskPreset: 'moderate',
  investmentParams: {
    ...RISK_PRESETS.moderate,
    kneeYear: null,
  },

  inflationParams: {
    meanInflation: 0.03,
    inflationVolatility: 0.015,
    returnInflationCorrelation: 0.3,
  },

  numRuns: 1000,
  confidenceTarget: 0.90,

  colMultiplier: 1.0,
  selectedMetro: 'Average (National Average)',

  expenses: DEFAULT_CATEGORIES.map(c => ({ ...c })),

  effectiveTaxRate: 0,

  windfallEvents: [],

  rentalProperties: [],

  primaryResidence: null,
};

export function useSimulation() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [results, setResults] = useState(null);
  const [coastResult, setCoastResult] = useState(null);
  const [coastYearResult, setCoastYearResult] = useState(null);
  const [perEarnerCoast, setPerEarnerCoast] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  // ── Derived values ────────────────────────────────────────────
  const primaryAge = inputs.earners[0]?.currentAge ?? 30;
  const totalPortfolio = inputs.earners.reduce((sum, e) => sum + (e.portfolio || 0), 0);
  const deathAge = Math.max(...inputs.earners.map(e => e.deathAge || 95));
  const totalYears = deathAge - primaryAge;

  const effectiveKneeYear = useMemo(
    () => inputs.investmentParams.kneeYear ?? Math.max(1, inputs.retirementAge - primaryAge - 10),
    [inputs.investmentParams.kneeYear, inputs.retirementAge, primaryAge]
  );

  const effectiveParams = useMemo(
    () => ({ ...inputs.investmentParams, kneeYear: effectiveKneeYear }),
    [inputs.investmentParams, effectiveKneeYear]
  );

  // ── Reactive: yield curve ─────────────────────────────────────
  const yieldCurveData = useMemo(
    () => getYieldCurve(totalYears, effectiveParams).map(d => ({
      ...d,
      age: primaryAge + d.year,
      meanPct: d.mean * 100,
      volPct: d.volatility * 100,
      upperBound: (d.mean + d.volatility) * 100,
      lowerBound: (d.mean - d.volatility) * 100,
      bandBase: (d.mean - d.volatility) * 100,
      bandWidth: d.volatility * 2 * 100,
    })),
    [totalYears, effectiveParams, primaryAge]
  );

  // ── Reactive: deterministic coast ─────────────────────────────
  const deterministicCoastData = useMemo(() => {
    const pensions = buildAllPensions(inputs.earners, []);
    return calculateDeterministicCoast({
      primaryCurrentAge: primaryAge,
      retirementAge: inputs.retirementAge,
      deathAge: deathAge,
      startingPortfolio: totalPortfolio,
      earners: inputs.earners,
      expenses: inputs.expenses,
      pensions,
      investmentParams: effectiveParams,
      inflationParams: inputs.inflationParams,
      effectiveTaxRate: inputs.effectiveTaxRate,
    });
  }, [inputs.earners, inputs.expenses, inputs.retirementAge, deathAge,
      effectiveParams, inputs.inflationParams, inputs.effectiveTaxRate,
      primaryAge, totalPortfolio]);

  // ── Reactive: spending projection ─────────────────────────────
  const spendingProjectionData = useMemo(
    () => calculateSpendingProjection({
      primaryCurrentAge: primaryAge,
      retirementAge: inputs.retirementAge,
      deathAge: deathAge,
      expenses: inputs.expenses,
      inflationParams: inputs.inflationParams,
      effectiveTaxRate: inputs.effectiveTaxRate,
    }),
    [primaryAge, inputs.retirementAge, deathAge,
     inputs.expenses, inputs.inflationParams, inputs.effectiveTaxRate]
  );

  // ── Updaters ──────────────────────────────────────────────────

  const updateInput = useCallback((key, value) => {
    setInputs(prev => {
      const updates = { [key]: value };
      // Sync primary earner retirement age with household
      if (key === 'retirementAge') {
        const earners = [...prev.earners];
        earners[0] = { ...earners[0], retirementAge: value };
        updates.earners = earners;
      }
      return { ...prev, ...updates };
    });
  }, []);

  const updateNestedInput = useCallback((section, key, value) => {
    setInputs(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }, []);

  const updateEarner = useCallback((index, key, value) => {
    setInputs(prev => {
      const earners = [...prev.earners];
      earners[index] = { ...earners[index], [key]: value };
      const updates = { earners };
      // Sync household retirement age with primary earner
      if (index === 0 && key === 'retirementAge') {
        updates.retirementAge = value;
      }
      return { ...prev, ...updates };
    });
  }, []);

  const addEarner = useCallback(() => {
    setInputs(prev => {
      const n = prev.earners.length;
      const primary = prev.earners[0];
      const yearsToRetire = prev.retirementAge - (primary?.currentAge ?? 30);
      const newEarners = [
        ...prev.earners,
        {
          ...DEFAULT_EARNER,
          name: EARNER_NAMES[n] || `Partner ${n + 1}`,
          currentAge: 30,
          retirementAge: 30 + yearsToRetire,
          deathAge: 95,
        },
      ];
      const newExpenses = buildExpensesForLocation(prev.colMultiplier, newEarners.length);
      return { ...prev, earners: newEarners, expenses: newExpenses };
    });
  }, []);

  const removeEarner = useCallback((index) => {
    setInputs(prev => {
      const newEarners = prev.earners.filter((_, i) => i !== index);
      const newExpenses = buildExpensesForLocation(prev.colMultiplier, newEarners.length);
      return { ...prev, earners: newEarners, expenses: newExpenses };
    });
  }, []);

  const setLocation = useCallback((metroKey, multiplier) => {
    setInputs(prev => ({
      ...prev,
      selectedMetro: metroKey,
      colMultiplier: multiplier,
      expenses: buildExpensesForLocation(multiplier, prev.earners.length),
    }));
  }, []);

  const addWindfall = useCallback(() => {
    setInputs(prev => ({
      ...prev,
      windfallEvents: [
        ...prev.windfallEvents,
        { name: '', amount: 50000, taxRate: 0, annualGrowthRate: 0, yearsFromNow: 10, stdDev: 3, probability: 1.0 },
      ],
    }));
  }, []);

  const updateWindfall = useCallback((index, key, value) => {
    setInputs(prev => {
      const events = [...prev.windfallEvents];
      events[index] = { ...events[index], [key]: value };
      return { ...prev, windfallEvents: events };
    });
  }, []);

  const removeWindfall = useCallback((index) => {
    setInputs(prev => ({
      ...prev,
      windfallEvents: prev.windfallEvents.filter((_, i) => i !== index),
    }));
  }, []);

  const addProperty = useCallback(() => {
    setInputs(prev => ({
      ...prev,
      rentalProperties: [
        ...prev.rentalProperties,
        {
          name: '',
          grossMonthlyRent: 2000,
          mortgagePayment: 1200,
          maintenancePct: 0.10,
          vacancyRate: 0.05,
          appreciationRate: 0.03,
          currentValue: 300000,
          mortgageEndYears: null,
          sellInYears: null,
          sellCostPct: 0.06,
        },
      ],
    }));
  }, []);

  const updateProperty = useCallback((index, key, value) => {
    setInputs(prev => {
      const properties = [...prev.rentalProperties];
      properties[index] = { ...properties[index], [key]: value };
      return { ...prev, rentalProperties: properties };
    });
  }, []);

  const removeProperty = useCallback((index) => {
    setInputs(prev => ({
      ...prev,
      rentalProperties: prev.rentalProperties.filter((_, i) => i !== index),
    }));
  }, []);

  const addPrimaryResidence = useCallback(() => {
    setInputs(prev => ({
      ...prev,
      primaryResidence: {
        currentValue: 500000,
        appreciationRate: 0.03,
        remainingMortgage: 200000,
        mortgageYearsLeft: null,
        downsizeTargetValue: 300000,
        downsizeYear: null,
        saleCostPct: 0.06,
        purchaseCostPct: 0.02,
      },
    }));
  }, []);

  const updatePrimaryResidence = useCallback((key, value) => {
    setInputs(prev => ({
      ...prev,
      primaryResidence: { ...prev.primaryResidence, [key]: value },
    }));
  }, []);

  const clearPrimaryResidence = useCallback(() => {
    setInputs(prev => ({ ...prev, primaryResidence: null }));
  }, []);

  const setRiskPreset = useCallback((preset) => {
    setInputs(prev => ({
      ...prev,
      riskPreset: preset,
      investmentParams: {
        ...RISK_PRESETS[preset],
        kneeYear: prev.investmentParams.kneeYear,
        strategy: prev.investmentParams.strategy,
      },
    }));
  }, []);

  // ── Simulation (on demand) ──────────────────────────────────

  const runSim = useCallback(() => {
    setIsRunning(true);
    setError(null);
    setTimeout(() => {
      try {
        const pensions = buildAllPensions(inputs.earners, []);
        const config = {
          primaryCurrentAge: primaryAge,
          retirementAge: inputs.retirementAge,
          deathAge: deathAge,
          startingPortfolio: totalPortfolio,
          earners: inputs.earners,
          expenses: inputs.expenses,
          pensions,
          investmentParams: effectiveParams,
          inflationParams: inputs.inflationParams,
          effectiveTaxRate: inputs.effectiveTaxRate,
          windfallEvents: inputs.windfallEvents,
          rentalProperties: inputs.rentalProperties,
          primaryResidence: inputs.primaryResidence,
          numRuns: inputs.numRuns,
          confidenceTarget: inputs.confidenceTarget,
        };

        const mcResults = runMonteCarlo(config);
        setResults(mcResults);

        const coast = calculateCoastNumber(config);
        setCoastResult(coast);

        const coastYear = calculateCoastYear(config);
        setCoastYearResult(coastYear);

        if (inputs.earners.length > 1) {
          const earnerCoasts = inputs.earners.map((earner, i) => {
            const result = calculateCoastYear({ ...config, earnerCoastIndex: i });
            return { ...result, earnerName: earner.name, earnerIndex: i };
          });
          setPerEarnerCoast(earnerCoasts);
        } else {
          setPerEarnerCoast(null);
        }
      } catch (err) {
        console.error('Simulation error:', err);
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setIsRunning(false);
      }
    }, 50);
  }, [inputs, primaryAge, totalPortfolio, effectiveParams]);

  return {
    inputs,
    setInputs,
    updateInput,
    updateNestedInput,
    updateEarner,
    addEarner,
    removeEarner,
    addWindfall,
    updateWindfall,
    removeWindfall,
    addProperty,
    updateProperty,
    removeProperty,
    addPrimaryResidence,
    updatePrimaryResidence,
    clearPrimaryResidence,
    setLocation,
    setRiskPreset,
    results,
    coastResult,
    coastYearResult,
    perEarnerCoast,
    yieldCurveData,
    deterministicCoastData,
    spendingProjectionData,
    totalPortfolio,
    primaryAge,
    deathAge,
    effectiveKneeYear,
    effectiveParams,
    isRunning,
    error,
    runSimulation: runSim,
  };
}
