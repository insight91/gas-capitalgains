const TRADES_SHEET_CANDIDATES = ['Trades', 'Transactions', 'Wall St Equities'];

function isTradesSheet(name: string): boolean {
  if (TRADES_SHEET_CANDIDATES.includes(name)) return true;
  return name.startsWith('Trades') || name.startsWith('Wall St');
}

function findTradesSheet(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): GoogleAppsScript.Spreadsheet.Sheet {
  // Prefer the active sheet if it looks like a trades sheet (e.g. a combined "Trades-All" sheet the user is on)
  const active = ss.getActiveSheet();
  if (active && isTradesSheet(active.getName())) return active;

  // Otherwise search all sheets
  const match = ss.getSheets().find(s => isTradesSheet(s.getName()));
  if (match) return match;

  throw new Error(`No trades sheet found. Expected a sheet named "Trades", "Transactions", "Wall St Equities", or starting with "Trades".`);
}

function iStakeSheet(ss: GoogleAppsScript.Spreadsheet.Spreadsheet) {
  const sheet = findTradesSheet(ss);

  const rawHeaders = sheet.getDataRange().getValues().shift();
  if (!rawHeaders) throw new Error(`Sheet "${sheet.getName()}" has no header row`);

  // Trim each header cell to guard against leading/trailing whitespace from imports
  const headers = (rawHeaders as any[]).map((h: any) => String(h).trim());

  // get range with values
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const range = sheet.getRange(2, 1, lastRow - 1, lastCol);

  // Detect format by presence of new-style header
  const isNewFormat = headers.indexOf('Trade Date') !== -1;

  // Column indexes — map old and new Stake export formats to the same names
  const dateCol      = isNewFormat ? headers.indexOf('Trade Date')    : headers.indexOf('DATE (US)');
  const symbolCol    = isNewFormat ? headers.indexOf('Symbol')        : headers.indexOf('SYMBOL');
  const typeCol      = isNewFormat ? headers.indexOf('Side')          : headers.indexOf('SIDE');
  const unitsCol     = isNewFormat ? headers.indexOf('Units')         : headers.indexOf('UNITS');
  const priceUSDCol  = isNewFormat ? headers.indexOf('Avg. Price')    : headers.indexOf('EFFECTIVE PRICE (USD)');
  const valueUSDCol  = isNewFormat ? headers.indexOf('Value')         : headers.indexOf('VALUE (USD)');
  const fxRateCol    = isNewFormat ? headers.indexOf('AUD/USD rate')  : headers.indexOf('FX RATE');
  // New format has no LOCAL CURRENCY VALUE column — callers compute it from valueUSD * fxRate
  const localCurrencyCol = isNewFormat ? -1 : headers.indexOf('LOCAL CURRENCY VALUE');
  const brokerageCol = isNewFormat ? headers.indexOf('Fees')          : headers.indexOf('BROKERAGE FEE (USD)');

  // Validate critical columns so a missing/renamed header surfaces as a clear error
  const required: [string, number][] = [
    [isNewFormat ? 'Trade Date' : 'DATE (US)', dateCol],
    [isNewFormat ? 'Symbol' : 'SYMBOL', symbolCol],
    [isNewFormat ? 'Side' : 'SIDE', typeCol],
    [isNewFormat ? 'Units' : 'UNITS', unitsCol],
    [isNewFormat ? 'Avg. Price' : 'EFFECTIVE PRICE (USD)', priceUSDCol],
    [isNewFormat ? 'AUD/USD rate' : 'FX RATE', fxRateCol],
  ];
  const missing = required.filter(([, idx]) => idx === -1).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Sheet "${sheet.getName()}": missing column(s): ${missing.join(', ')}. Headers found: ${headers.join(' | ')}`);
  }

  return { range, dateCol, symbolCol, typeCol, unitsCol, priceUSDCol, valueUSDCol, fxRateCol, localCurrencyCol, brokerageCol, isNewFormat };
}
