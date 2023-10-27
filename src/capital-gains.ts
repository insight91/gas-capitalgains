/** @OnlyCurrentDoc */

// e.g. Notes
// AXP 1 $140 B  2020
// AXP 1 $150 B  2021
// AXP 1 $160 S  2022 - CG - $20

function initSheet() {
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

function calculateCG3(e: any) {
  let { range, dateCol, symbolCol, typeCol, unitsCol, priceUSDCol, valueUSDCol, fxRateCol, localCurrencyCol, brokerageCol } = initSheet();

  // Initialize variables for tracking capital gains
  let trades = range.getValues();

  // Create an object to store capital gains for each stock
  var CG = {};

  let initYear = trades[0][dateCol].getFullYear();
  let FYStart = new Date(initYear, 6, 1);
  let FYEnd = new Date(initYear + 1, 5, 30);

  // Loop through the share trades
  for (let trade of trades) {
    var date = new Date(trade[dateCol]);
    let symbol = trade[symbolCol];
    var type = trade[typeCol];
    var units = parseFloat(trade[unitsCol]);
    var price = parseFloat(trade[priceUSDCol]);
    var valueUSD = parseFloat(trade[valueUSDCol]);
    var brokerage = parseFloat(trade[brokerageCol]);

    let FY = FYStart.getFullYear();
    CG[FY] = { symbol };

    if (date >= FYStart && date <= FYEnd) {
      if (!CG[FY][symbol]) {
        CG[FY][symbol] = 0;
      }
      let CGFYSYM: any = { acquisitionCost: 0, capitalGains: 0 }; // temp

      // Buy trade: Calculate the cost of acquisition
      // Sell trade: Calculate the capital gain
      if (type == 'B') {
        let acquisitionCost = valueUSD + -brokerage;

        CGFYSYM.acquisitionCost += acquisitionCost;
      } else if (type == 'S') {
        let sellValue = valueUSD - brokerage;

        if (CGFYSYM.acquisitionCost < 0) {
          CGFYSYM.capitalGain += sellValue + CGFYSYM.acquisitionCost;
        }
      }

      CG[FY][symbol] = CGFYSYM;
    }

    // Start the Near Years Calcs
    if (date > FYEnd) {
      FYStart = new Date(date.getFullYear(), 6, 1); // 6 represents July
      FYEnd = new Date(date.getFullYear() + 1, 5, 30); // July to June
    }
  }

  // Display or log the capital gains for each stock
  for (let FY in CG) {
    Logger.log('FY' + FY + '(Capital Gains)');
    for (const SYM in CG[FY]) {
      const g = CG[FY][SYM];
      Logger.log('SYMBOL: ' + SYM + ': ' + g + '$');
    }
  }
}

// if (!CGFYSYM.acquisitionCost) CGFYSYM.acquisitionCost = 0;

function calculateCG2(e: any) {
  let { range, dateCol, symbolCol, typeCol, unitsCol, priceUSDCol, valueUSDCol, fxRateCol, localCurrencyCol, brokerageCol } = initSheet();

  // Initialize variables for tracking capital gains
  let trades = range.getValues();

  // Create an object to store capital gains for each stock
  var capitalGains = {};

  // Loop through the share trades
  for (let trade of trades) {
    var date = new Date(trade[dateCol]);
    let symbol = trade[symbolCol];
    var type = trade[typeCol];
    var units = parseFloat(trade[unitsCol]);
    var price = parseFloat(trade[priceUSDCol]);
    var valueUSD = parseFloat(trade[valueUSDCol]);
    var brokerage = parseFloat(trade[brokerageCol]);

    // Initialize capital gains for the stock symbol if not already present
    if (!capitalGains[symbol]) {
      capitalGains[symbol] = {};
    }
    if (!capitalGains[symbol].capitalGain) {
      capitalGains[symbol].capitalGain = 0;
    }

    // Check if it's a buy or sell trade
    if (type == 'B') {
      // Buy trade: Calculate the cost of acquisition

      let acquisitionCost = valueUSD + -brokerage;
      if (!capitalGains[symbol].acquisitionCost) {
        capitalGains[symbol].acquisitionCost = 0;
      }

      capitalGains[symbol].acquisitionCost += acquisitionCost;
    } else if (type == 'S') {
      // Sell trade: Calculate the capital gain

      let sellValue = valueUSD - brokerage;

      if (capitalGains[symbol].acquisitionCost < 0) {
        capitalGains[symbol].capitalGain += sellValue + capitalGains[symbol].acquisitionCost;
      }
    }
  }

  // Display or log the capital gains for each stock
  for (let symbol in capitalGains) {
    Logger.log('Capital gains for ' + symbol + ': ' + capitalGains[symbol].capitalGain + '$');
  }
}

function calculateCG(e: any) {
  let { range, dateCol, symbolCol, typeCol, unitsCol, priceUSDCol, valueUSDCol, fxRateCol, localCurrencyCol, brokerageCol } = initSheet();

  // Initialize variables for tracking capital gains
  var groupedBySymbol = {};
  let trades = range.getValues();
  var capitalGains = {};

  // From the earliest Trade Date calc it's financial year
  let earliestTradeDate = null;

  // Group by Symbol
  trades.forEach((trade, i) => {
    var symbol = trade[symbolCol];
    if (i == 0) {
      earliestTradeDate = trade[dateCol];
    }
    if (!groupedBySymbol[symbol]) groupedBySymbol[symbol] = [];

    let symbolTrades = trades.filter((r) => trade[symbolCol] == symbol);
    groupedBySymbol[symbol] = symbolTrades;
  });

  // Define the financial year start and end dates
  // Table is from earliest to latest date

  // Loop through FYs, calc CG for each year,
  // in next year minus from the previous year if theres any left

  // if (date > financialYearEnd) {
  //   financialYearStart = new Date(date.getFullYear(), 6, 1); // 6 represents July
  //   financialYearEnd = new Date(date.getFullYear() + 1, 5, 30); // July to June
  // }

  var financialYearStart = new Date('2022-07-01'); // Change the year as needed
  var financialYearEnd = new Date('2023-06-30'); // Change the year as needed
  var currentYear = financialYearStart.getFullYear();

  // Loop through Symbol Trades and then by year - BUY +, SELL - from buys
  for (var symbol in groupedBySymbol) {
    let symbolTrades = groupedBySymbol[symbol];
    let buys = symbolTrades.filter((r) => r[typeCol] == 'B');
    let sells = symbolTrades.filter((r) => r[typeCol] == 'S');

    Logger.log(symbol + ' SELLS');
    for (let trade of sells) {
      var date = new Date(trade[dateCol]);
      let units = trade[unitsCol];
      let priceUSD = trade[priceUSDCol];
      let valueSD = trade[valueUSDCol]; // Buys are negative and Sells are positive

      Logger.log(date.toLocaleDateString() + ' - ' + symbol + ' ' + units + ' $' + parseFloat(priceUSD).toFixed());
    }
  }

  return true;
}

function fyDates() {
  let years = {};
  let i = 0;

  while (i < 5) {
    years['FY202' + i] = {
      start: new Date(`202${i}-07-01`),
      end: new Date(`202${i + 1}-06-30`),
    };
  }
}

// var date = new Date(trade[dateCol]);
// var type = trade[typeCol];
// var units = trade[unitsCol];
// var priceUSD = trade[priceUSDCol];
// var valueUSD = trade[valueUSDCol];
// var fxRate = trade[fxRateCol];
// var localCurrencyValue = trade[localCurrencyCol];

// Check if the trade date falls within the current financial year
// Calculate capital gains based on your criteria (you need to define this logic)
// You might want to check the trade type (buy/sell) and do the calculation accordingly
// Update the 'capitalGains' object with the calculated gain for this stock
// if (date >= financialYearStart && date <= financialYearEnd) {
//   if (!capitalGains[symbol]) {
//     capitalGains[symbol] = 0;
//   }
//   // Update the capital gains for this symbol based on your logic
// }

// Display or log the total capital gains for each stock for each financial year
// for (var stockSymbol in capitalGains) {
//   Logger.log('Capital gains for ' + stockSymbol + ' in year ' + (currentYear - 1) + '-' + currentYear + ': ' + capitalGains);
// }

// You can also write this data back to the sheet if needed.
// sheet.getRange(i + 2, statusIndex + 1, 1, 1).setValue('Synced');

// let buys = range.getValues().filter((r) => r[typeCol] == 'B' && row[symbolCol] == symbol);
// let sells = range.getValues().filter((r) => r[typeCol] == 'S' && row[symbolCol] == symbol);

// If the trade date is in the next financial year, update the financial year dates
// if (date > financialYearEnd) {
//   financialYearStart = new Date(date.getFullYear(), 6, 1); // 6 represents July
//   financialYearEnd = new Date(date.getFullYear() + 1, 5, 30); // July to June
// }

// Loop through the rows in the sheet
// let symbols = trades.reduce((p, trade) => {
//   return !!p[symbolCol] ? trade[symbolCol] : p;
// }, []);
