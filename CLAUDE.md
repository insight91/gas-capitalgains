# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Google Apps Script (GAS) project that calculates Australian capital gains tax (CGT) from Stake broker (hellostake.com) trade exports. Runs as a Google Sheets add-on, processing a "Trades" sheet and writing results to a "Capital Gains Calc (Auto)" sheet.

## Commands

```bash
# Compile TypeScript to dist/
npm run build

# Watch-mode TypeScript compilation
npm run serve

# Push compiled files to Google Apps Script
npm run publish

# Push with file watching
npm run publish:watch
```

To deploy, you need clasp authenticated (`~/.clasprc.json`). The script ID is in `.clasp.json` and targets the `dist/` directory.

## Architecture

**Runtime**: TypeScript compiles to `dist/`, which clasp pushes to Google Apps Script. There is no bundler — each `.ts` file becomes a separate `.js` file in GAS.

**Data flow**:

1. `onOpen()` in [src/index.ts](src/index.ts) fires when the spreadsheet opens and calls `calculateCG4()`
2. `iStakeSheet()` in [src/util.ts](src/util.ts) reads the "Trades" sheet, maps column indices by header name, and returns the data range + column index map
3. `calculateCapitalGains()` in [src/capital-gains.core.ts](src/capital-gains.core.ts) iterates trades, applies FIFO matching of buys to sells, and groups results by Australian financial year (July 1–June 30) and stock symbol
4. `calculateCG4()` in [src/capital-gains.sheet.ts](src/capital-gains.sheet.ts) calls the core function and writes rows to "Capital Gains Calc (Auto)"

**Column mapping** (`iStakeSheet`): Headers are matched by exact name — `DATE (US)`, `SYMBOL`, `SIDE`, `UNITS`, `EFFECTIVE PRICE (USD)`, `VALUE (USD)`, `FX RATE`, `LOCAL CURRENCY VALUE`, `BROKERAGE FEE (USD)`. The sheet must have these exact headers.

**Financial year logic**: FY is determined by the trade date — dates from July 1 onward belong to the next FY number (e.g., a trade on 2022-08-01 is FY2023).

## Key Implementation Details

- **FIFO method**: Buys are stored in a running-total array (`buysRT`). When a sell occurs, units are consumed from the front of the buy queue.
- **CGT discount**: The 50% long-term discount (assets held >12 months) is noted in comments but **not yet implemented**.
- **FX handling**: Trades are in USD. Comments note that cost base should use buy-date FX rate and proceeds should use sell-date FX rate — **not yet implemented**.
- `dist/appsscript.json` is the GAS manifest (timezone: `Australia/Melbourne`, runtime: V8).

## GitHub Project

- Repo: `insight91/gas-capitalgains`
- Project board: None
- Issues: Create issues with labels `bug`, `enhancement`, `help wanted` as needed. Issue name/title should start with the issue number #<issue_number> <issue_name>. Reference issues in PRs with "Closes #<issue_number>".
- Scripts:
  - `gh project item-add` requires gh CLI ≥ v2.31.0 — scripts use GraphQL fallback if needed

## Branch Strategy

- `main` — main/production branch
- Create a feature branch for any work related to a Github issue: `feat/<github-issue-number>-<name>`
- PRs which reference an issue must have Closes #<issue_number> in the description.
