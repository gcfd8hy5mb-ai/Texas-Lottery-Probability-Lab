# Lottery Probability Lab

Independent, noncommercial lottery analysis and historical research app. **Not affiliated with, sponsored by, or endorsed by the Texas Lottery, Powerball, Mega Millions, their operators, or game licensors.** All game names are used only to identify the corresponding games and are the property of their respective owners. Artwork is original, not an official lottery logo.

The research app is educational; it cannot improve the odds of a valid lottery entry in a fair draw. Saving a set does not purchase a ticket. Verify dates, rules, prices and jackpot estimates with the official lottery operator.

## Features

- Upcoming drawing schedule and base ticket prices, with jackpots only when a recent published snapshot corresponds to the next drawing.
- Historical drawing archives for eight lottery games. Pick 3, Daily 4 and All or Nothing imports currently cover the **Night session only**, rather than all daily sessions.
- Auto Pick, pattern tests and historical holdout analysis. Successes against historical draws are **not** predictions.
- Saved combinations and manually recorded scratch-off comparisons and budgets, stored in the browser's localStorage.

## Source and data-use audit — October 27, 2026

Our build imports published drawing CSV data from these official Texas Lottery site paths:

- `/Games/Lotto_Texas/Winning_Numbers/lottotexas.csv`
- `/Games/Powerball/Winning_Numbers/powerball.csv`
- `/Games/Mega_Millions/Winning_Numbers/megamillions.csv`
- `/Games/Texas_Two_Step/Winning_Numbers/texastwostep.csv`
- `/Games/Cash_Five/Winning_Numbers/cashfive.csv`
- `/Games/All_or_Nothing/Winning_Numbers/allornothingnight.csv`
- `/Games/Pick_3/Winning_Numbers/pick3night.csv`
- `/Games/Daily_4/Winning_Numbers/daily4night.csv`

The build also reads the official Texas Lottery games page for the four advertised rolling jackpots. These are direct public HTTPS requests made by GitHub Actions without login, not the lottery's proprietary logos, graphics, or website HTML copied into the finished app. We store **derived structured facts** (drawing numbers, dates, advertised jackpot amounts) and source URLs.

**Usage-permission status: not confirmed.** The official [Copyright and Trademark Notice](https://www.texaslottery.com/export/sites/lottery/Misc/copyright.html) protects logos, designs, content and registered marks. The official [Linking Statement](https://www.texaslottery.com/export/sites/lottery/Misc/linking_statement.html) allows ordinary links but warns against misrepresenting website content, embedding pages or directly linking graphics. These statements alone do not establish permission for automated extraction or systematic redistribution of the published CSV files.

The action rebuilds on changes and periodically for updated results. Source URLs and build failures are logged. **Before launching a public commercial product or scaling data ingestion**, request clarification or written permission regarding automated retrieval, archiving, refresh intervals and republication. If permission is withheld, replace automated imports with explicitly authorized data or suspend those data sources.

## GitHub Pages and privacy

GitHub Actions runs `npm install`, the import scripts, and `npm run build` before publishing `dist/` to GitHub Pages. Browser picks and budgets remain on the same device; updating branding or code does not clear them.

## Source attribution and trademarks

For rules and live jackpot confirmation, use the [official Texas Lottery website](https://www.texaslottery.com/). Game names are referenced descriptively and are not part of the app's own title, icon or logo. There is no sponsorship, endorsement or ticket-sales functionality.
