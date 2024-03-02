function iStakeSheet() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Trades');
  const headers = sheet.getDataRange().getValues().shift();

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
