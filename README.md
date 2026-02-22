# NestEgg

A client-side Monte Carlo retirement simulator. All calculations run in your browser -- no accounts, no cookies, no tracking.

**Live:** [https://datumengineering.github.io/nest-egg/](https://datumengineering.github.io/nest-egg/)

## Features

- **Monte Carlo simulation** (1,000+ runs) with configurable confidence targets
- **Multi-earner households** with individual ages, salaries, savings rates, and retirement dates
- **Fat-tailed returns** via Student's t-distribution calibrated to Vanguard Target Date Fund data
- **Lifecycle derisking** (S-curve glide path) that shifts equity/bond allocation over time
- **Per-category inflation** using BLS Consumer Expenditure Survey data for 65+ households
- **Location-adjusted expenses** via BEA Regional Price Parities and C2ER Cost of Living Index
- **Pension support**: FERS, Social Security, and generic defined-benefit pensions with COLA
- **Windfall events**: one-time cash inflows with probability, timing uncertainty, growth rates, and tax
- **Rental properties**: ongoing income with P&I, tax & insurance, vacancy, maintenance, appreciation, and optional sale
- **Primary residence downsize**: model equity release from selling and buying smaller at retirement
- **Coast FIRE analysis**: find the age you can stop contributing and still retire on target
- **Portfolio chart** with percentile bands (p5 through p95) and Y-axis zoom controls
- **Spending projection** and yield curve visualization

## Tech Stack

- React + Vite
- Recharts for data visualization
- Pure JavaScript simulation engine (no server dependencies)
- GitHub Pages deployment via GitHub Actions

## Development

```bash
npm install
npm run dev        # local dev server
npm run build      # production build
npm run preview    # preview production build
```

## Privacy

Your data never leaves your browser. The entire application runs client-side with zero external API calls, no analytics, and no data persistence beyond your browser session.
