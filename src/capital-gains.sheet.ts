/** @OnlyCurrentDoc */

// Notes
// If you hold the share for more than 12 months, then you only pay half the CGT - 50% gain becomes 25%
// FX: use buy date FX rate for cost base, sell date FX rate for proceeds

// calculateCapitalGains and its types are globally available in GAS (all script files share scope).
// The declare below gives TypeScript visibility without emitting a runtime import.
declare function calculateCapitalGains(trades: import('./capital-gains.core').Trade[]): import('./capital-gains.core').CGResult;

function calculateCG4() {
  const { range, dateCol, symbolCol, typeCol, unitsCol, priceUSDCol, valueUSDCol, fxRateCol, localCurrencyCol, brokerageCol } = iStakeSheet();

  const trades: import('./capital-gains.core').Trade[] = range.getValues().map((row: any[]) => ({
    date: new Date(row[dateCol]),
    symbol: row[symbolCol],
    side: row[typeCol],
    units: parseFloat(row[unitsCol]),
    priceUSD: parseFloat(row[priceUSDCol]),
    valueUSD: parseFloat(row[valueUSDCol]),
    fxRate: parseFloat(row[fxRateCol]),
    localCurrencyValue: parseFloat(row[localCurrencyCol]),
    brokerage: parseFloat(row[brokerageCol]),
  }));

  const CG = calculateCapitalGains(trades);

  const ss = SpreadsheetApp.getActive();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const res = ss.getSheetByName('Capital Gains Calc (Auto)')!;
  res.clear();

  const rows: any[][] = [];

  rows.push(['FY', 'Symbol', 'Type', 'Date', 'Units', 'Price (USD)', 'Brokerage', 'Total Value', 'Capital Gains']);

  for (const FY in CG) {
    for (const SYM in CG[FY]) {
      const g = CG[FY][SYM];

      rows.push(['FY' + FY, SYM, '', '', '', '', '', '', g.capitalGains]);

      g.buys.forEach((b) => {
        rows.push(['', '', 'B', b.date, b.units, b.price, b.brokerage, b.units * b.price + b.brokerage, '']);
      });

      g.sells.forEach((s) => {
        rows.push(['', '', 'S', s.date, s.units, s.price, s.brokerage, s.units * s.price - s.brokerage, '']);
      });
    }
  }

  if (rows.length > 0) {
    res.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  }
}
