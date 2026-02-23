# NestEgg - Retirement Monte Carlo Simulator

## Quick Start
```bash
npm run dev    # Dev server at localhost:5173/nest-egg/
npm run build  # Production build to dist/
```
Deploys to GitHub Pages via Actions on push to main: `datumengineering.github.io/nest-egg/`

## Architecture

### Engine (`src/engine/`) - Pure JS, no React
All simulation math lives here. No external dependencies.

| File | Purpose | Key Exports |
|------|---------|-------------|
| `random.js` | Box-Muller + Cholesky for correlated draws, Student's t | `bivariateNormal`, `seededRandom`, `normalRandom` |
| `investment.js` | Portfolio allocation with derisking strategies | `getBlendedParams`, `getYieldCurve`, `BEFORE_PRESETS`, `AFTER_PRESETS`, `buildInvestmentParams` |
| `inflation.js` | Stochastic inflation defaults | `INFLATION_DEFAULTS` |
| `pensions.js` | FERS, SS, Generic, DB pension models | `calculateFERS`, `calculateDeferredFERS`, `calculateSocialSecurity`, `buildAllPensions` |
| `expenses.js` | Per-category inflation, COL scaling | `DEFAULT_CATEGORIES`, `getCategoryInflation`, `buildExpensesForLocation` |
| `simulation.js` | Single stochastic simulation path | `runSimulation` |
| `monteCarlo.js` | MC runner + deterministic calculations | `runMonteCarlo`, `calculateCoastNumber`, `calculateCoastYear`, `calculateDeterministicCoast`, `calculateSpendingProjection` |
| `index.js` | Barrel re-exports | Everything above |

### UI Components (`src/components/`)

#### InputForm (4-step flow)
| File | Step | Contents |
|------|------|----------|
| `HouseholdStep.jsx` | Step 1: Who's Planning? | Per-earner cards: name, age, portfolio, income, savings rate. Advanced: wage growth, FERS, SS, Generic Pension, DB Pension |
| `RetirementVisionStep.jsx` | Step 2: Retirement Vision | Location selector, expense table. Advanced: tax rate, inflation params |
| `AssetsEventsStep.jsx` | Step 3: Assets & Events | Windfall events, rental properties, home downsizing |
| `InvestmentStrategyStep.jsx` | Step 4: Investment Strategy | Before/After retirement dropdowns, Advanced: custom return/vol, derisking dropdown, simulation settings |
| `index.jsx` | Form wrapper | Combines 4 steps + Run button |
| `NumericInput.jsx` | Utility | Input with leading-zero cleanup |
| `WindfallEvents.jsx` | Sub-component | Windfall event rows |
| `RentalProperties.jsx` | Sub-component | Rental property rows |
| `PrimaryResidence.jsx` | Sub-component | Home downsizing inputs |

#### Results
| File | Visibility | Purpose |
|------|-----------|---------|
| `YieldCurveChart.jsx` | Always (reactive) | Investment glide path: mean return, volatility, 1-sigma band |
| `CoastCurveChart.jsx` | Always (deterministic) + collapsible (MC) | Coast FIRE number by age |
| `SpendingChart.jsx` | Behind toggle | Inflation-adjusted spending projection |
| `SuccessRate.jsx` | After MC run | Success %, coast FIRE number, coast year, per-earner coast |
| `PortfolioChart.jsx` | After MC run | Percentile fan chart (5th-95th) |
| `ScenarioSuggestions.jsx` | After MC run | Auto-generated optimization suggestions |

### Hook (`src/hooks/useSimulation.js`)
Central state management. Key features:
- **Per-earner portfolio** (summed for simulation as `totalPortfolio`)
- **Before/After presets** drive `investmentParams` (highYield* / conservative*), strategy preserved independently
- **Reactive computations** via `useMemo`: `yieldCurveData`, `deterministicCoastData`, `spendingProjectionData`
- **MC only on Run** button click (not reactive)
- **Location change** calls `buildExpensesForLocation(multiplier, numPeople)` to bake COL directly into expense amounts
- **Earner add/remove** also re-bakes expenses for household size
- **Retirement age sync**: primary earner's retirementAge <-> household retirementAge
- **Save/Load**: Export inputs as `.nestegg` JSON file with version and date; import restores state

### Data (`src/data/`)
- `blsExpenses.json` - 37 metro areas with COL multipliers + 7 cost tiers
- `ssaConstants.json` - SSA bend points and constants
- `vanguardDefaults.json` - Vanguard fund default parameters

## Key Design Decisions

### Expense Model
- Amounts are in today's dollars, stored as final values (COL + household size already applied)
- Changing location **replaces** all expense amounts via `buildExpensesForLocation()`
- Per-category inflation rates (housing 3%, health 5-6%, etc.)
- `perPersonScale` per category for household size (Housing 10%, Food 70%, Health 100%, etc.)
- Stochastic inflation: `getCategoryInflation(baseCPIDraw, categoryRate, meanCPI)` = `baseCPIDraw + (categoryRate - meanCPI)`

### Tax Model
- `preTaxNeeded = expenses / (1 - effectiveTaxRate)`
- `withdrawal = preTaxNeeded - pensionIncome - workingIncome - rentalIncome`
- Default 0%, exposed only in advanced settings

### Investment Model
- Before/After retirement presets map to existing `highYield*` / `conservative*` params — no separate engine concept
- `BEFORE_PRESETS`: conservative (8.5%/12%), moderate (10.5%/16%), aggressive (11.5%/19%)
- `AFTER_PRESETS`: conservative (3.5%/4%), moderate (4%/5%), balanced (7%/10%)
- Custom detection: compare current params against presets, show "(Custom)" on mismatch
- Four derisking strategies: `lifecycle` (default), `sigmoid`, `target-date`, `none`
- Knee year auto-computed: `retirementAge - currentAge - 10`
- Student's t-distributed returns via `df` parameter (default 5)

### Wage Growth
- Stochastic and CPI-linked: same treatment as expense category inflation
- Each year: `wageInflation = getCategoryInflation(baseCPIDraw, earner.wageGrowthRate, meanCPI)`
- Cumulative per-earner wage growth array in simulation loop
- Default 3% (= CPI + 0% real growth)

### Pension Model
- FERS: active (projected high-3, uses earner's current salary/wageGrowth reactively) or deferred, 1.1% multiplier for 62+/20yr, COLA cap at 2%
- Social Security: auto-estimate from salary, early/delayed claiming adjustments
- Generic Pension: fixed amount, optional CPI or fixed COLA
- DB Pension: `years × multiplier × finalAvgSalary`, optional COLA

### Coast FIRE
- **Deterministic** (reactive): binary search with mean returns, instant computation
- **Monte Carlo** (on demand): binary search with N=1000 stochastic runs
- **Per-earner coast**: when multiple earners, shows when each could stop contributing

### Simulation Flow
1. Each year: draw correlated (marketReturn, inflation) via bivariate normal with Student's t tails
2. Compound per-category inflation factors and per-earner wage growth from year 0
3. Pre-retirement: apply market return, add earner contributions + rental income
4. Transitional (some retired, some working): expenses begin, working income offsets
5. Full retirement: apply market return, compute tax-adjusted withdrawal minus pensions/rental
6. Windfall events: stochastic arrival timing, grown to arrival year, net of tax
7. Rental properties: inflation-adjusted rent minus fixed P&I, optional sale
8. Primary residence: downsize at specified year, net equity to portfolio
9. Portfolio hits 0 → simulation fails at that age

### UI Patterns
- Info icons use CSS `::after` pseudo-element tooltips with `data-tip` attribute (not native `title`)
- All `InfoIcon` components take a `tip` prop
- Header has Save/Load buttons for `.nestegg` file export/import

## Defaults
- Earner: age 30, portfolio $50K, income $75K, savings 20%, wage growth 3%
- Retirement: age 65, death age 95
- Before retirement: moderate (10.5% return, 16% vol)
- After retirement: moderate (4% return, 5% vol)
- Strategy: lifecycle derisking, df=5
- Tax: 0%
- Location: National Average (1.0x COL)
- MC: 1000 runs, 83% confidence target
