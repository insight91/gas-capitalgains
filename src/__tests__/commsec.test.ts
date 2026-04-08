import { mapCommsecRows, CommsecColMap } from '../capital-gains.sheet';

// Column order matches a real CommSec export:
// Code | Company | Date | Type | Quantity | Unit Price ($) | Trade Value ($) | Brokerage+GST ($) | GST ($) | Contract Note | Total Value ($)
const COLS: CommsecColMap = {
  symbolCol:    0,
  dateCol:      2,
  typeCol:      3,
  unitsCol:     4,
  priceAUDCol:  5,
  valueAUDCol:  6,
  brokerageCol: 7,
};

function makeRow(overrides: {
  symbol?: string;
  date?: string | Date;
  type?: string;
  units?: number;
  price?: number;
  value?: number;
  brokerage?: number;
}): any[] {
  const row = new Array(11).fill('');
  row[COLS.symbolCol]    = overrides.symbol    ?? 'CBA';
  row[COLS.dateCol]      = overrides.date      ?? '20/06/2025';
  row[COLS.typeCol]      = overrides.type      ?? 'Buy';
  row[COLS.unitsCol]     = overrides.units     ?? 10;
  row[COLS.priceAUDCol]  = overrides.price     ?? 100;
  row[COLS.valueAUDCol]  = overrides.value     ?? 1000;
  row[COLS.brokerageCol] = overrides.brokerage ?? 19.95;
  return row;
}

describe('mapCommsecRows', () => {
  it('returns empty array for empty input', () => {
    expect(mapCommsecRows([], COLS)).toEqual([]);
  });

  it('filters out rows with empty symbol', () => {
    const rows = [makeRow({ symbol: '' }), makeRow({ symbol: 'CBA' })];
    expect(mapCommsecRows(rows, COLS)).toHaveLength(1);
  });

  it('parses DD/MM/YYYY date string correctly', () => {
    const [trade] = mapCommsecRows([makeRow({ date: '20/06/2025' })], COLS);
    expect(trade.date).toEqual(new Date(2025, 5, 20)); // month is 0-indexed
  });

  it('passes through a native Date object unchanged', () => {
    const d = new Date(2025, 5, 20);
    const [trade] = mapCommsecRows([makeRow({ date: d })], COLS);
    expect(trade.date).toEqual(d);
  });

  it('maps "Buy" (any casing) to side "B"', () => {
    for (const type of ['Buy', 'buy', 'BUY']) {
      const [trade] = mapCommsecRows([makeRow({ type })], COLS);
      expect(trade.side).toBe('B');
    }
  });

  it('maps anything other than "buy" to side "S"', () => {
    for (const type of ['Sell', 'sell', 'SELL']) {
      const [trade] = mapCommsecRows([makeRow({ type })], COLS);
      expect(trade.side).toBe('S');
    }
  });

  it('sets fxRate to 1 (AUD-native)', () => {
    const [trade] = mapCommsecRows([makeRow({})], COLS);
    expect(trade.fxRate).toBe(1);
  });

  it('uses priceAUD as priceUSD (fxRate=1 means core passes it through unchanged)', () => {
    const [trade] = mapCommsecRows([makeRow({ price: 123.45 })], COLS);
    expect(trade.priceUSD).toBe(123.45);
  });

  it('sets localCurrencyValue equal to valueAUD', () => {
    const [trade] = mapCommsecRows([makeRow({ value: 999 })], COLS);
    expect(trade.localCurrencyValue).toBe(999);
    expect(trade.valueUSD).toBe(999);
  });

  it('maps brokerage correctly', () => {
    const [trade] = mapCommsecRows([makeRow({ brokerage: 19.95 })], COLS);
    expect(trade.brokerage).toBeCloseTo(19.95);
  });

  it('trims whitespace from symbol', () => {
    const [trade] = mapCommsecRows([makeRow({ symbol: '  CBA  ' })], COLS);
    expect(trade.symbol).toBe('CBA');
  });

  it('parses multiple rows in order', () => {
    const rows = [
      makeRow({ symbol: 'CBA', type: 'Buy',  units: 10, price: 100 }),
      makeRow({ symbol: 'CBA', type: 'Sell', units: 5,  price: 120 }),
    ];
    const trades = mapCommsecRows(rows, COLS);
    expect(trades).toHaveLength(2);
    expect(trades[0].side).toBe('B');
    expect(trades[1].side).toBe('S');
  });
});

describe('mapCommsecRows → calculateCapitalGains integration', () => {
  // Import here so the integration slice stays co-located
  const { calculateCapitalGains } = require('../capital-gains.core');

  it('buy then sell at higher price produces correct AUD capital gain', () => {
    const rows = [
      makeRow({ symbol: 'CBA', type: 'Buy',  date: '01/08/2022', units: 1, price: 100, value: 100, brokerage: 0 }),
      makeRow({ symbol: 'CBA', type: 'Sell', date: '01/02/2023', units: 1, price: 150, value: 150, brokerage: 0 }),
    ];
    const trades = mapCommsecRows(rows, COLS);
    const result = calculateCapitalGains(trades);
    // Both trades fall in FY2022 (Jul 2022 – Jun 2023)
    expect(result[2022]['CBA'].capitalGains).toBe(50);
  });

  it('brokerage reduces gain correctly', () => {
    const rows = [
      makeRow({ symbol: 'CBA', type: 'Buy',  date: '01/08/2022', units: 1, price: 100, value: 100, brokerage: 10 }),
      makeRow({ symbol: 'CBA', type: 'Sell', date: '01/02/2023', units: 1, price: 150, value: 150, brokerage: 5  }),
    ];
    const trades = mapCommsecRows(rows, COLS);
    const result = calculateCapitalGains(trades);
    // costPerUnit = 110, proceedsPerUnit = 145, gain = 35
    expect(result[2022]['CBA'].capitalGains).toBeCloseTo(35);
  });

  it('lot held over 12 months gets 50% CGT discount', () => {
    const rows = [
      makeRow({ symbol: 'CBA', type: 'Buy',  date: '01/08/2022', units: 1, price: 100, value: 100, brokerage: 0 }),
      makeRow({ symbol: 'CBA', type: 'Sell', date: '02/08/2023', units: 1, price: 200, value: 200, brokerage: 0 }),
    ];
    const trades = mapCommsecRows(rows, COLS);
    const result = calculateCapitalGains(trades);
    // Sell in FY2023; held 366 days → discountable, net gain = 100 * 0.5 = 50
    expect(result[2023]['CBA'].discountableGains).toBe(100);
    expect(result[2023]['CBA'].capitalGains).toBe(50);
  });
});
