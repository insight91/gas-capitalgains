/** @OnlyCurrentDoc */

// for Timebased Trigger - Stake
function calculateCG_(e: any) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Trades');
  const headers = sheet.getDataRange().getValues().shift();

  // get range with values
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const range = sheet.getRange(2, 1, lastRow - 1, lastCol);

  const dateCol = headers.indexOf('DATE (US)');
  const symbolCol = headers.indexOf('SYMBOL');
  const typeCol = headers.indexOf('SIDE');
  const unitsCol = headers.indexOf('UNITS');
  const effectivePriceCol = headers.indexOf('EFFECTIVE PRICE (USD)');
  const localCurrencyCol = headers.indexOf('LOCAL CURRENCY VALUE');
  const valueInUSDCol = headers.indexOf('VALUE (USD)');
  const fxRateCol = headers.indexOf('FX RATE');

  // Define the financial year start and end dates
  var financialYearStart = new Date('2022-07-01'); // Change the year as needed
  var financialYearEnd = new Date('2023-06-30'); // Change the year as needed

  // Initialize variables for tracking capital gains
  var capitalGains = 0;
  var currentYear = financialYearStart.getFullYear();

  // Loop through the rows in the sheet
  var data = sheet.getDataRange().getValues();
  // for (var i = 1; i < data.length; i++) {
  range.getValues().forEach((row, i) => {
    // Start from row 2 (assuming headers in row 1)
    // const date = row[dateCol];

    var tradeDate = new Date(data[i][dateCol]);
    var type = data[i][typeCol];
    var units = data[i][unitsCol];
    var localCurrencyValue = data[i][localCurrencyCol];
    var effectivePriceUSD = data[i][effectivePriceCol];
    var valueInUSD = data[i][valueInUSDCol];
    var fxRate = data[i][fxRateCol];

    // Check if the trade date falls within the current financial year
    if (tradeDate >= financialYearStart && tradeDate <= financialYearEnd) {
      // Calculate capital gains based on your criteria (you need to define this logic)
      // You might want to check the trade type (buy/sell) and do the calculation accordingly
      // Update the 'capitalGains' variable with the calculated gain for this trade
    }

    // If the trade date is in the next financial year, update the current year and financial year dates
    if (tradeDate > financialYearEnd) {
      currentYear++;
      financialYearStart = new Date(currentYear, 6, 1); // 6 represents July
      financialYearEnd = new Date(currentYear + 1, 5, 30); // July to June
    }
  });

  // Display or log the total capital gains for each financial year
  Logger.log('Capital gains for ' + (currentYear - 1) + '-' + currentYear + ': ' + capitalGains);

  // You can also write this data back to the sheet if needed.
  // update sheet
  // sheet.getRange(i + 2, statusIndex + 1, 1, 1).setValue('Synced');

  return true;
}

function onCellEdit_(e: any) {
  if (!e) return;

  const sheet = e.range.getSheet() as GoogleAppsScript.Spreadsheet.Sheet;
  const headers = sheet.getDataRange().getValues().shift();

  const rowIndex = e.range.getRow();
  const range = sheet.getRange(rowIndex, 1, 1, 10);
  const row = range.getValues()[0]; // 1 row

  const name = row[headers.indexOf('Name')];
  const email = row[headers.indexOf('Email')];
  const group = row[headers.indexOf('Who you are')];
  const tag = row[headers.indexOf('Tag')];
  const source = row[headers.indexOf('Source')];
}
