const TRADES_SHEET_CANDIDATES = ['Trades', 'Transactions', 'Wall St Equities'];

function findTradesSheet(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): GoogleAppsScript.Spreadsheet.Sheet {
  // Try exact candidates first
  for (const name of TRADES_SHEET_CANDIDATES) {
    const s = ss.getSheetByName(name);
    if (s) return s;
  }
  // Fall back to any sheet whose name starts with 'Trades' or 'Wall St'
  const fallback = ss.getSheets().find(s => s.getName().startsWith('Trades') || s.getName().startsWith('Wall St'));
  if (fallback) return fallback;
  throw new Error(`No trades sheet found. Expected a sheet named "Trades", "Transactions", "Wall St Equities", or starting with "Trades".`);
}

function iStakeSheet(ss: GoogleAppsScript.Spreadsheet.Spreadsheet) {
  const sheet = findTradesSheet(ss);

  const headers = sheet.getDataRange().getValues().shift();
  if (!headers) throw new Error(`Sheet "${sheet.getName()}" has no header row`);

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

  return { range, dateCol, symbolCol, typeCol, unitsCol, priceUSDCol, valueUSDCol, fxRateCol, localCurrencyCol, brokerageCol, isNewFormat };
}
