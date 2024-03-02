/** @OnlyCurrentDoc */

// e.g. Notes
// AXP 1 $140 B  2020
// AXP 1 $150 B  2021
// AXP 1 $160 S  2022 - CG - $20

function calculateCG4(e: any) {
  let { range, dateCol, symbolCol, typeCol, unitsCol, priceUSDCol, valueUSDCol, fxRateCol, localCurrencyCol, brokerageCol } = iStakeSheet();

  // Initialize variables for tracking capital gains
  let trades = range.getValues();

  // Create an object to store capital gains for each stock under each FY
  var CG = {};

  let initYear = 2020; // let initYear = trades[0][dateCol].getFullYear();
  let FYStart = new Date(initYear, 6, 1);
  let FYEnd = new Date(initYear + 1, 5, 30);

  // Loop through the share trades
  for (let trade of trades) {
    var date = new Date(trade[dateCol]);
    let symbol = trade[symbolCol];
    var type = trade[typeCol];
    var units = parseFloat(trade[unitsCol]);
    var price = parseFloat(trade[priceUSDCol]);
    var brokerage = parseFloat(trade[brokerageCol]);
    var valueUSD = parseFloat(trade[valueUSDCol]); // not incl. brokerage
    // local
    let fxRate = parseFloat(trade[fxRateCol]);

    let FY = FYStart.getFullYear();

    if (date >= FYStart && date <= FYEnd) {
      if (!CG[FY]) {
        CG[FY] = {};
      }
      if (!CG[FY][symbol]) {
        CG[FY][symbol] = { capitalGains: 0, buys: [], buysRT: [] }; // buys and buys running total
      }

      if (type == 'B') {
        CG[FY][symbol].buys.push({ date, units, price, brokerage });
        CG[FY][symbol].buysRT.push({ date, units, price, brokerage });
      } else if (type == 'S') {
        let r = CG[FY][symbol];
        let buys: any[] = r.buysRT;

        for (const b of buys) {
          let buyValue = b.units * b.price;
          let saleValue = units * price;

          // knock off/minus off  first buy
          if (units >= b.units) {
            r.capitalGains += saleValue - buyValue;
            buys.shift();
          } else if (units < b.units) {
            //?

            buys[0].units -= units;
          } else {
            continue;
          }
        }

        // knock off buy units from here
        // sell will be less than or equal to the first buy
        // if it's more than the first buy then we go to second buy
        // if its' less than the second buy then minus off from that running total row

        // Notes
        // If you hold the share for more than 12 months, then you only pay half the CGT - 50$ gain becomes 25$
        // FX Cost base of the rate that you bought it at and use the FX rate on the day that you sell it - convert at both points
      }
    }

    // Start the Next Years Calcs
    if (date > FYEnd) {
      FYStart = new Date(date.getFullYear(), 6, 1); // 6 represents July
      FYEnd = new Date(date.getFullYear() + 1, 5, 30); // July to June
    }
  }

  // Display or log the capital gains for each stock
  // let USDollar = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  // Write to CG Sheet
  const ss = SpreadsheetApp.getActive();
  const res = ss.getSheetByName('Capital Gains Calc (Auto)');
  let rowIndex = 1;

  for (let FY in CG) {
    res.getRange(rowIndex + 1, 1, 1, 1).setValue('FY' + FY);
    rowIndex++;
    // Logger.log('FY' + FY);

    for (let SYM in CG[FY]) {
      const g = CG[FY][SYM];
      res.getRange(rowIndex + 1, 2, 1, 1).setValue(SYM);
      res.getRange(rowIndex + 1, 8, 1, 1).setValue(g.capitalGains);
      rowIndex++;
      // Logger.log(' ' + SYM);

      g.buys.forEach((b) => {
        res.getRange(rowIndex + 1, 3, 1, 1).setValue(b.date);
        res.getRange(rowIndex + 1, 4, 1, 1).setValue(b.units);
        res.getRange(rowIndex + 1, 5, 1, 1).setValue(b.price);
        res.getRange(rowIndex + 1, 6, 1, 1).setValue(b.brokerage);
        res.getRange(rowIndex + 1, 7, 1, 1).setValue(b.units * b.price + b.brokerage);
        rowIndex++;
        // Logger.log('  ' + b.units + ' - ' + b.price);
      });
      // Logger.log('' + SYM + ' Gain: ' + USDollar.format(g.capitalGain) + ' Cost: ' + USDollar.format(g.acquisitionCost));
    }
  }
}

function calculateCG3(e: any) {
  let { range, dateCol, symbolCol, typeCol, unitsCol, priceUSDCol, valueUSDCol, fxRateCol, localCurrencyCol, brokerageCol } = iStakeSheet();

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

    if (date >= FYStart && date <= FYEnd) {
      if (!CG[FY]) {
        CG[FY] = {};
      }
      if (!CG[FY][symbol]) {
        CG[FY][symbol] = { acquisitionCost: 0, capitalGains: 0 };
      }

      // Buy trade: Calculate the cost of acquisition
      // Sell trade: Calculate the capital gain
      if (type == 'B') {
        let acquisitionCost = valueUSD + -brokerage;

        CG[FY][symbol].acquisitionCost += acquisitionCost;
      } else if (type == 'S') {
        let sellValue = valueUSD - brokerage;

        CG[FY][symbol].capitalGain += sellValue + CG[FY][symbol].acquisitionCost;
        // if (CG[FY][symbol].acquisitionCost < 0) {}
      }
    }

    // Start the Next Years Calcs
    if (date > FYEnd) {
      FYStart = new Date(date.getFullYear(), 6, 1); // 6 represents July
      FYEnd = new Date(date.getFullYear() + 1, 5, 30); // July to June
    }
  }

  // Display or log the capital gains for each stock
  let USDollar = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  for (let FY in CG) {
    Logger.log('FY' + FY + ' - (Capital Gain & Acq Cost)');

    for (let SYM in CG[FY]) {
      const g = CG[FY][SYM];
      Logger.log('' + SYM + ' Gain: ' + USDollar.format(g.capitalGain) + ' Cost: ' + USDollar.format(g.acquisitionCost));
    }
  }
}

// Attempt 2
function calculateCG2(e: any) {
  let { range, dateCol, symbolCol, typeCol, unitsCol, priceUSDCol, valueUSDCol, fxRateCol, localCurrencyCol, brokerageCol } = iStakeSheet();

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

// Attempt 1
function calculateCG(e: any) {
  let { range, dateCol, symbolCol, typeCol, unitsCol, priceUSDCol, valueUSDCol, fxRateCol, localCurrencyCol, brokerageCol } = iStakeSheet();

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
