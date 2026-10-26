# Texas Lottery Probability Lab

Independent personal research prototype for Texas Lottery games.

## Features
- Number generation for Powerball, Mega Millions, Lotto Texas, Texas Two Step, Cash Five, All or Nothing, Pick 3, Daily 4.
- Save number sets on your current browser.
- Manually enter published scratch-off ticket odds and top-prize counts for comparison.
- Manual spending limit tracker.

**Not affiliated with Texas Lottery.** Historical patterns cannot improve the chance that a specific valid combination wins a fair independent draw. Scratch-off 'unclaimed prizes' do not disclose unsold ticket inventory; they cannot establish current win probabilities.

## Local development
`npm install` then `npm run dev`.

## GitHub Pages
GitHub repository Settings → Pages → Build and deployment → Source: **GitHub Actions**. The workflow publishes on pushes to main after build checks pass.

## Data policy
No live historical draw, jackpots or scratch database is connected in v0.1. Scratch entries are manual and not automatically verified. All local picks, ticket comparisons and budget data are stored in browser localStorage; clearing storage removes them.
