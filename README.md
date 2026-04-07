# Stake Capital Gains Calculator

Calculates Australian capital gains tax (CGT) from [Stake](https://hellostake.com) broker trade exports. Runs as a Google Apps Script, reading a **Trades** sheet and writing results to a **Capital Gains Calc (Auto)** sheet.

## Usage

### Option A — Bound script (single spreadsheet)

The script is deployed bound to a specific spreadsheet. When you open that sheet, a **Calculate** menu appears in the toolbar. Click **Calculate > Calculate CG** to run.

### Option B — Standalone script (any spreadsheet)

The script can be run against any spreadsheet without being installed into it.

1. Open the script project at [script.google.com](https://script.google.com)
2. In the editor, open the **calculateCG4** function
3. Call it with the target spreadsheet's ID:
   ```js
   calculateCG4('your-spreadsheet-id-here')
   ```
   The spreadsheet ID is the long string in the sheet's URL:
   `https://docs.google.com/spreadsheets/d/YOUR_ID_HERE/edit`
4. Click **Run** (you will be prompted to authorise on first run)

The script will read the **Trades** sheet from that spreadsheet and write results to **Capital Gains Calc (Auto)**.

## Trades sheet format

The **Trades** sheet must have these exact column headers:

| Header | Description |
|---|---|
| `DATE (US)` | Trade date (MM/DD/YYYY) |
| `SYMBOL` | Stock ticker |
| `SIDE` | `Buy` or `Sell` |
| `UNITS` | Number of shares |
| `EFFECTIVE PRICE (USD)` | Price per share in USD |
| `VALUE (USD)` | Total value in USD |
| `FX RATE` | USD to AUD exchange rate |
| `LOCAL CURRENCY VALUE` | Total value in AUD |
| `BROKERAGE FEE (USD)` | Brokerage fee in USD |

## Development

```bash
npm run build          # Compile TypeScript to dist/
npm run serve          # Watch-mode compilation
npm run publish        # Push compiled files to Google Apps Script
npm run publish:watch  # Push with file watching
```

Requires clasp authenticated (`~/.clasprc.json`). The script ID is in `.clasp.json`.

## Docs

- [Apps Script TypeScript](https://developers.google.com/apps-script/guides/typescript)
- [clasp CLI](https://github.com/google/clasp)
- [clasp run](https://github.com/google/clasp/blob/master/docs/run.md)
