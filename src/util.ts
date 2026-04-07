const TRADES_SHEET_CANDIDATES = ['Trades', 'Transactions'];

function findTradesSheet(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): GoogleAppsScript.Spreadsheet.Sheet {
  // Try exact candidates first
  for (const name of TRADES_SHEET_CANDIDATES) {
    const s = ss.getSheetByName(name);
    if (s) return s;
  }
  // Fall back to any sheet whose name starts with 'Trades' (e.g. Trades-FY25, Trades-All)
  const fallback = ss.getSheets().find(s => s.getName().startsWith('Trades'));
  if (fallback) return fallback;
  throw new Error(`No trades sheet found. Expected a sheet named "Trades", "Transactions", or starting with "Trades".`);
}

function iStakeSheet(ss: GoogleAppsScript.Spreadsheet.Spreadsheet) {
  const sheet = findTradesSheet(ss);

  const headers = sheet.getDataRange().getValues().shift();
  if (!headers) throw new Error(`Sheet "${sheet.getName()}" has no header row`);

  // get range with values
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const range = sheet.getRange(2, 1, lastRow - 1, lastCol);

  // Column indexes
  const dateCol = headers.indexOf('DATE (US)');
  const symbolCol = headers.indexOf('SYMBOL');
  const typeCol = headers.indexOf('SIDE');
  const unitsCol = headers.indexOf('UNITS');
  const priceUSDCol = headers.indexOf('EFFECTIVE PRICE (USD)');
  const valueUSDCol = headers.indexOf('VALUE (USD)');
  const fxRateCol = headers.indexOf('FX RATE');
  const localCurrencyCol = headers.indexOf('LOCAL CURRENCY VALUE');
  const brokerageCol = headers.indexOf('BROKERAGE FEE (USD)');

  return { range, dateCol, symbolCol, typeCol, unitsCol, priceUSDCol, valueUSDCol, fxRateCol, localCurrencyCol, brokerageCol };
}
