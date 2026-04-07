# Stake Capital Gains Calculator

Calculates Australian capital gains tax (CGT) from [Stake](https://hellostake.com) broker trade exports. Runs as a Google Apps Script, reading a **Trades** sheet and writing results to a **Capital Gains (Generated)** sheet.

## Usage

### Option A — Install as an Add-on (recommended)

Install the add-on once and use it on any of your Stake spreadsheets.

1. Install via the direct Marketplace link (see [Publishing as an Add-on](#publishing-as-an-add-on) for the link)
2. Open any spreadsheet with a **Trades** sheet
3. Go to **Extensions > Stake Capital Gains Calculator > Calculate CG**

Results are written to a **Capital Gains (Generated)** sheet in the same spreadsheet.

### Option B — Run directly from the script editor (no install)

Useful for one-off runs without installing the add-on.

1. Open the script project at [script.google.com](https://script.google.com)
2. Call `calculateCG4` with the target spreadsheet's ID:
   ```js
   calculateCG4('your-spreadsheet-id-here');
   ```
   Find the spreadsheet ID in its URL:
   `https://docs.google.com/spreadsheets/d/YOUR_ID_HERE/edit`
3. Click **Run** (you will be prompted to authorise on first run)

## Trades sheet format

The **Trades** sheet must have these exact column headers:

| Header                  | Description              |
| ----------------------- | ------------------------ |
| `DATE (US)`             | Trade date (MM/DD/YYYY)  |
| `SYMBOL`                | Stock ticker             |
| `SIDE`                  | `Buy` or `Sell`          |
| `UNITS`                 | Number of shares         |
| `EFFECTIVE PRICE (USD)` | Price per share in USD   |
| `VALUE (USD)`           | Total value in USD       |
| `FX RATE`               | USD to AUD exchange rate |
| `LOCAL CURRENCY VALUE`  | Total value in AUD       |
| `BROKERAGE FEE (USD)`   | Brokerage fee in USD     |

## Development

```bash
npm run build          # Compile TypeScript to dist/
npm run serve          # Watch-mode compilation
npm run publish        # Push compiled files to Google Apps Script
npm run publish:watch  # Push with file watching
```

Requires clasp authenticated (`~/.clasprc.json`). The script ID is in `.clasp.json`.

## Publishing as an Add-on

These steps publish the script as an **unlisted** Google Workspace Editor Add-on.
Unlisted add-ons don't require Google's review — you share a direct install link.

### 1. Push the latest code

```bash
npm run publish
```

### 2. Link a GCP project

1. Open the script at [script.google.com](https://script.google.com) > Project Settings
2. Under **Google Cloud Platform project**, click **Change project**
3. Enter the GCP project number for `capital-gains-403223` - which is `705923314524`

### 3. Configure the OAuth consent screen

1. Go to [GCP Console](https://console.cloud.google.com) > **APIs & Services > OAuth consent screen**
2. Set app name, support email
3. Add a **Privacy Policy URL**: `https://insight91.github.io/gas-capitalgains/privacy.html`
   > Enable GitHub Pages first: repo Settings > Pages > Source: `main` branch, `/docs` folder
4. Save

### 4. Enable the Marketplace SDK

1. GCP Console > **APIs & Services > Enable APIs**
2. Search for **Google Workspace Marketplace SDK** and enable it

### 5. Create the Marketplace listing

1. GCP Console > **Google Workspace Marketplace SDK > App Configuration**
2. Set **App Visibility** to `Unlisted`
3. Fill in name, description, category (Productivity)
4. Link the Apps Script project

### 6. Deploy as Add-on

1. Back in the Apps Script editor > **Deploy > New deployment**
2. Type: **Add-on**
3. Click **Deploy** and copy the deployment ID

### 7. Install and share

- Install on your own sheets via **Extensions > Add-ons > Get add-ons** (search by name) or the direct Marketplace URL
- Share the direct install link with others

## Docs

- [Apps Script TypeScript](https://developers.google.com/apps-script/guides/typescript)
- [clasp CLI](https://github.com/google/clasp)
- [clasp run](https://github.com/google/clasp/blob/master/docs/run.md)
