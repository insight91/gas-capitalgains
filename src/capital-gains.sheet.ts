// Notes
// If you hold the share for more than 12 months, then you only pay half the CGT - 50% gain becomes 25%
// FX: use buy date FX rate for cost base, sell date FX rate for proceeds

import type { Trade, CGResult } from './capital-gains.core';
declare function calculateCapitalGains(trades: Trade[]): CGResult;

function calculateCG4(spreadsheetId?: string) {
  const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActive();
  try {
    const { range, dateCol, symbolCol, typeCol, unitsCol, priceUSDCol, valueUSDCol, fxRateCol, localCurrencyCol, brokerageCol } = iStakeSheet(ss);

    const trades: Trade[] = range.getValues().map((row: any[]) => {
      // Normalise Side: new format uses "Buy"/"Sell", old format uses "B"/"S"
      const rawSide = String(row[typeCol]).trim();
      const side = rawSide === 'Buy' ? 'B' : rawSide === 'Sell' ? 'S' : rawSide as 'B' | 'S';

      // Normalise FX rate: new format may have a "$" prefix, e.g. "$1.290"
      const fxRate = parseFloat(String(row[fxRateCol]).replace('$', ''));

      const valueUSD = parseFloat(row[valueUSDCol]);
      // New format has no LOCAL CURRENCY VALUE column — derive it
      const localCurrencyValue = localCurrencyCol >= 0 ? parseFloat(row[localCurrencyCol]) : valueUSD * fxRate;

      return {
        date: new Date(row[dateCol]),
        symbol: String(row[symbolCol]).trim(),
        side,
        units: parseFloat(row[unitsCol]),
        priceUSD: parseFloat(row[priceUSDCol]),
        valueUSD,
        fxRate,
        localCurrencyValue,
        brokerage: parseFloat(row[brokerageCol]),
      };
    });

    const CG = calculateCapitalGains(trades);

    const res = ss.getSheetByName('Capital Gains (Generated)') ?? ss.insertSheet('Capital Gains (Generated)');
    res.clear();

    const rows: any[][] = [];

    rows.push(['FY', 'Symbol', 'Type', 'Date', 'Units', 'Price (AUD)', 'Brokerage', 'Total Value (AUD)', 'Short-term Gains', 'Long-term Gains (pre-disc)', 'CGT Discount', 'Net Capital Gain']);

    const fyKeys = Object.keys(CG);

    // Track which row each data row is on (1-indexed, after header)
    const rowMeta: { rowIndex: number; netGain: number }[] = [];

    for (const FY of fyKeys) {
      let fyShortTerm = 0;
      let fyDiscountable = 0;
      let fyNet = 0;

      for (const SYM in CG[Number(FY)]) {
        const g = CG[Number(FY)][SYM];
        const cgtDiscount = g.discountableGains > 0 ? -g.discountableGains * 0.5 : 0;

        rowMeta.push({ rowIndex: rows.length + 1, netGain: g.capitalGains });
        rows.push(['FY' + FY, SYM, '', '', '', '', '', '', g.shortTermGains, g.discountableGains, cgtDiscount, g.capitalGains]);

        g.buys.forEach((b) => {
          rows.push(['', '', 'B', b.date, b.units, b.price, b.brokerage, b.units * b.price + b.brokerage, '', '', '', '']);
        });

        g.sells.forEach((s) => {
          rows.push(['', '', 'S', s.date, s.units, s.price, s.brokerage, s.units * s.price - s.brokerage, '', '', '', '']);
        });

        fyShortTerm += g.shortTermGains;
        fyDiscountable += g.discountableGains;
        fyNet += g.capitalGains;
      }

      const fyCgtDiscount = fyDiscountable > 0 ? -fyDiscountable * 0.5 : 0;
      rowMeta.push({ rowIndex: rows.length + 1, netGain: fyNet });
      rows.push(['FY' + FY, 'TOTAL', '', '', '', '', '', '', fyShortTerm, fyDiscountable, fyCgtDiscount, fyNet]);
    }

    if (rows.length > 0) {
      res.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    }

    // Format header row: bold + freeze
    const headerRange = res.getRange(1, 1, 1, rows[0].length);
    headerRange.setFontWeight('bold');
    res.setFrozenRows(1);

    // Format date column (col 4) for data rows
    if (rows.length > 1) {
      res.getRange(2, 4, rows.length - 1, 1).setNumberFormat('yyyy-mm-dd');
    }

    // Format currency columns: Price (6), Brokerage (7), Total Value (8), Short-term (9), Long-term (10), Discount (11), Net (12)
    const currencyCols = [6, 7, 8, 9, 10, 11, 12];
    if (rows.length > 1) {
      for (const col of currencyCols) {
        res.getRange(2, col, rows.length - 1, 1).setNumberFormat('$#,##0.00;-$#,##0.00');
      }
    }

    // Conditional row colouring: green for gains, red for losses (symbol summary rows + FY total rows)
    const GREEN_BG = '#d9ead3';
    const RED_BG = '#fce8e6';
    const NEUTRAL_BG = '#ffffff';
    for (const { rowIndex, netGain } of rowMeta) {
      const bg = netGain > 0 ? GREEN_BG : netGain < 0 ? RED_BG : NEUTRAL_BG;
      res.getRange(rowIndex, 1, 1, rows[0].length).setBackground(bg);
    }

    // Navigate to the output sheet
    ss.setActiveSheet(res);

    const fyCount = fyKeys.length;
    const fyLabel = fyCount === 1 ? '1 financial year' : `${fyCount} financial years`;
    ss.toast(`${fyLabel} processed.`, 'Capital Gains Complete', 5);
  } catch (e: any) {
    SpreadsheetApp.getActiveSpreadsheet()?.toast(e?.message ?? 'An unexpected error occurred.', 'Capital Gains Error', 10);
  }
}
