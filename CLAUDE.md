# NestEgg - Retirement Monte Carlo Simulator

## Quick Start
```bash
npm run dev    # Dev server
npm run build  # Production build
```

## Architecture

### Engine (`src/engine/`) - Pure JS, no React
All simulation math lives here. Each file is independent and well-tested.

| File | Purpose | Key Exports |
|------|---------|-------------|
| `random.js` | Box-Muller + Cholesky for correlated draws | `bivariateNormal`, `seededRandom` |
| `investment.js` | Portfolio allocation with derisking | `getBlendedParams`, `getYieldCurve`, `getAllocationFraction`, `RISK_PRESETS` |
| `inflation.js` | Stochastic inflation defaults | `INFLATION_DEFAULTS` |
| `pensions.js` | FERS, SS, Generic, DB pension models | `calculateFERS`, `calculateSocialSecurity`, `calculateGenericPension`, `calculateDBPension`, `buildAllPensions` |
| `expenses.js` | Per-category inflation, COL baking | `DEFAULT_CATEGORIES`, `getCategoryInflation`, `buildExpensesForLocation` |
| `simulation.js` | Single stochastic simulation path | `runSimulation` |
| `monteCarlo.js` | MC runner + deterministic calculations | `runMonteCarlo`, `calculateCoastNumber`, `calculateCoastYear`, `calculateDeterministicCoast`, `calculateSpendingProjection` |
| `index.js` | Barrel re-exports | Everything above |

### UI Components (`src/components/`)

#### InputForm (3-step flow)
| File | Step | Contents |
|------|------|----------|
| `HouseholdStep.jsx` | Step 1: Who's Planning? | Per-earner cards: name, age, portfolio, income, savings rate. Advanced: wage growth, FERS, SS, Generic Pension, DB Pension |
| `VisionStep.jsx` | Step 2: Retirement Vision | Retirement age, death age, location selector (bakes COL into expenses), expense table. Advanced: tax rate, inflation params |
| `StrategyStep.jsx` | Step 3: Investment Strategy | Risk preset buttons (conservative/moderate/aggressive), Advanced: derisking strategy with SVG preview, custom params, simulation settings |
| `index.jsx` | Form wrapper | Combines 3 steps + Run button |
| `NumericInput.jsx` | Utility | Input with leading-zero cleanup |

**Legacy files (no longer imported):** `PersonalInfo.jsx`, `EarnerInputs.jsx`, `InvestmentInputs.jsx`, `ExpenseInputs.jsx`, `SimulationSettings.jsx`

#### Results
| File | Visibility | Purpose |
|------|-----------|---------|
| `YieldCurveChart.jsx` | Always (reactive) | Investment glide path: mean return, volatility, 1-sigma band |
| `CoastCurveChart.jsx` | Always (deterministic) + collapsible (MC) | Coast FIRE number by age. Accepts `collapsible` prop |
| `SpendingChart.jsx` | Behind toggle | Inflation-adjusted spending projection |
| `SuccessRate.jsx` | After MC run | Success %, coast FIRE number, coast year, per-earner coast |
| `PortfolioChart.jsx` | After MC run | Percentile fan chart (5th-95th) |
| `ScenarioSuggestions.jsx` | After MC run | Auto-generated suggestions (FERS bump, coast timing, etc.) |

### Hook (`src/hooks/useSimulation.js`)
Central state management. Key features:
- **Per-earner portfolio** (summed for simulation as `totalPortfolio`)
- **Risk presets** drive `investmentParams`, strategy preserved independently
- **Reactive computations** via `useMemo`: `yieldCurveData`, `deterministicCoastData`, `spendingProjectionData`
- **MC only on Run** button click (not reactive)
- **Location change** calls `buildExpensesForLocation(multiplier, numPeople)` to bake COL directly into expense amounts
- **Earner add/remove** also re-bakes expenses for household size
- **Retirement age sync**: primary earner's retirementAge <-> household retirementAge

### Data (`src/data/`)
- `blsExpenses.json` - 37 metro areas with COL multipliers + 7 cost tiers

## Key Design Decisions

### Expense Model
- Amounts are in today's dollars, stored as final values (COL + household size already applied)
- Changing location **replaces** all expense amounts via `buildExpensesForLocation()`
- Per-category inflation rates (housing 3%, health 5-6%, etc.)
- Stochastic inflation adds random variation correlated with market returns

### Tax Model
- `preTaxNeeded = expenses / (1 - effectiveTaxRate)`
- `withdrawal = preTaxNeeded - pensionIncome`
- Default 0%, exposed only in advanced settings

### Investment Model
- Four derisking strategies: `sigmoid` (default), `linear`, `target-date`, `none`
- Risk presets set rates/volatilities; strategy is independent
- Knee year auto-computed: `retirementAge - currentAge - 10`
- Blended return = weighted aggressive + conservative based on allocation fraction

### Pension Model
- FERS: active (projected high-3) or deferred, 1.1% multiplier for 62+/20yr
- Social Security: early/delayed claiming adjustments
- Generic Pension: fixed amount, optional CPI or fixed COLA
- DB Pension: `years × multiplier × finalAvgSalary`, optional COLA

### Coast FIRE
- **Deterministic** (reactive): binary search with mean returns, instant computation
- **Monte Carlo** (on demand): binary search with N=1000 stochastic runs

### Simulation Flow
1. Each year: draw correlated (marketReturn, inflation) via bivariate normal
2. Compound per-category inflation factors from year 0
3. Pre-retirement: apply market return, add earner contributions
4. Post-retirement: apply market return, compute tax-adjusted withdrawal minus pensions
5. Portfolio hits 0 → simulation fails at that age

## Defaults
- Earner: age 30, portfolio $50K, income $75K, savings 20%, wage growth 2%
- Retirement: age 65, death age 95
- Risk: moderate (10% return, 15% vol aggressive / 4% return, 2% vol conservative)
- Strategy: sigmoid derisking
- Tax: 0%
- Location: National Average (1.0x COL)
- MC: 1000 runs, 90% confidence target
