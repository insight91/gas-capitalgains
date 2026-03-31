import { calculateCapitalGains, Trade } from '../capital-gains.core';

function makeTrade(overrides: Partial<Trade> & Pick<Trade, 'date' | 'symbol' | 'side' | 'units' | 'priceUSD'>): Trade {
  const fxRate = overrides.fxRate ?? 1;
  return {
    valueUSD: overrides.units * overrides.priceUSD,
    fxRate,
    localCurrencyValue: (overrides.units * overrides.priceUSD) * fxRate,
    brokerage: -1,
    ...overrides,
  };
}

describe('calculateCapitalGains', () => {
  it('returns empty object for no trades', () => {
    expect(calculateCapitalGains([])).toEqual({});
  });

  it('single buy + sell at higher price produces correct capital gain', () => {
    const trades: Trade[] = [
      makeTrade({ date: new Date('2020-08-01'), symbol: 'AXP', side: 'B', units: 1, priceUSD: 100 }),
      makeTrade({ date: new Date('2021-01-01'), symbol: 'AXP', side: 'S', units: 1, priceUSD: 150 }),
    ];
    const result = calculateCapitalGains(trades);
    expect(result[2020]['AXP'].capitalGains).toBe(50); // (150 - 100) * 1
  });

  it('single buy + sell at lower price produces a capital loss', () => {
    const trades: Trade[] = [
      makeTrade({ date: new Date('2020-08-01'), symbol: 'AXP', side: 'B', units: 1, priceUSD: 100 }),
      makeTrade({ date: new Date('2021-01-01'), symbol: 'AXP', side: 'S', units: 1, priceUSD: 80 }),
    ];
    const result = calculateCapitalGains(trades);
    expect(result[2020]['AXP'].capitalGains).toBe(-20); // (80 - 100) * 1
  });

  it('FIFO: sell is matched against the first buy lot, not the second', () => {
    const trades: Trade[] = [
      makeTrade({ date: new Date('2020-08-01'), symbol: 'AXP', side: 'B', units: 1, priceUSD: 100 }),
      makeTrade({ date: new Date('2020-11-01'), symbol: 'AXP', side: 'B', units: 1, priceUSD: 200 }),
      makeTrade({ date: new Date('2021-01-01'), symbol: 'AXP', side: 'S', units: 1, priceUSD: 150 }),
    ];
    const result = calculateCapitalGains(trades);
    // Gain against first buy (100): (150 - 100) * 1 = 50
    expect(result[2020]['AXP'].capitalGains).toBe(50);
  });

  it('FIFO: selling the remaining lot uses the second buy price', () => {
    const trades: Trade[] = [
      makeTrade({ date: new Date('2020-08-01'), symbol: 'AXP', side: 'B', units: 1, priceUSD: 100 }),
      makeTrade({ date: new Date('2020-11-01'), symbol: 'AXP', side: 'B', units: 1, priceUSD: 200 }),
      makeTrade({ date: new Date('2021-01-01'), symbol: 'AXP', side: 'S', units: 1, priceUSD: 150 }),
      makeTrade({ date: new Date('2021-02-01'), symbol: 'AXP', side: 'S', units: 1, priceUSD: 150 }),
    ];
    const result = calculateCapitalGains(trades);
    // First sell: (150-100)*1 = 50, second sell: (150-200)*1 = -50, net = 0
    expect(result[2020]['AXP'].capitalGains).toBe(0);
  });

  it('partial sell: remaining units are consumed correctly by a follow-up sell', () => {
    const trades: Trade[] = [
      makeTrade({ date: new Date('2020-08-01'), symbol: 'AAPL', side: 'B', units: 3, priceUSD: 100 }),
      makeTrade({ date: new Date('2021-01-01'), symbol: 'AAPL', side: 'S', units: 1, priceUSD: 130 }),
      makeTrade({ date: new Date('2021-02-01'), symbol: 'AAPL', side: 'S', units: 2, priceUSD: 130 }),
    ];
    const result = calculateCapitalGains(trades);
    // Total gain: (130-100)*3 = 90
    expect(result[2020]['AAPL'].capitalGains).toBe(90);
  });

  it('trades are bucketed into the correct Australian financial year', () => {
    const trades: Trade[] = [
      // Jun 30 2021 (local time) → FY2020 window (Jul 2020 – Jun 2021)
      makeTrade({ date: new Date(2021, 5, 30), symbol: 'MSFT', side: 'B', units: 1, priceUSD: 100 }),
      // Jul 1 2021 (local time) → FY2021 window (Jul 2021 – Jun 2022)
      makeTrade({ date: new Date(2021, 6, 1), symbol: 'MSFT', side: 'B', units: 1, priceUSD: 200 }),
    ];
    const result = calculateCapitalGains(trades);
    expect(result[2020]['MSFT'].buys).toHaveLength(1);
    expect(result[2021]['MSFT'].buys).toHaveLength(1);
  });

  it('cross-FY (same window): buy Oct 2022 + sell Feb 2023 are both within the FY2022 window', () => {
    const trades: Trade[] = [
      makeTrade({ date: new Date('2022-10-01'), symbol: 'TSLA', side: 'B', units: 2, priceUSD: 200 }),
      makeTrade({ date: new Date('2023-02-01'), symbol: 'TSLA', side: 'S', units: 2, priceUSD: 250 }),
    ];
    const result = calculateCapitalGains(trades);
    // Both fall within FY2022 (Jul 2022 – Jun 2023), gain = (250-200)*2 = 100
    expect(result[2022]['TSLA'].capitalGains).toBe(100);
  });

  it('FX conversion: gain is calculated in AUD using each trade fxRate', () => {
    // buy @ $100 USD, fxRate=1.5 → AUD cost = 150
    // sell @ $150 USD, fxRate=1.5 → AUD proceeds = 225
    // gain = 225 - 150 = 75 AUD
    const trades: Trade[] = [
      makeTrade({ date: new Date('2020-08-01'), symbol: 'AXP', side: 'B', units: 1, priceUSD: 100, fxRate: 1.5 }),
      makeTrade({ date: new Date('2021-01-01'), symbol: 'AXP', side: 'S', units: 1, priceUSD: 150, fxRate: 1.5 }),
    ];
    const result = calculateCapitalGains(trades);
    expect(result[2020]['AXP'].capitalGains).toBeCloseTo(75, 5);
  });

  it('FX conversion: different buy/sell FX rates are applied independently', () => {
    // buy @ $100 USD, fxRate=1.5 → AUD cost = 150
    // sell @ $100 USD, fxRate=2.0 → AUD proceeds = 200
    // gain = 200 - 150 = 50 AUD (same USD price but AUD weakened)
    const trades: Trade[] = [
      makeTrade({ date: new Date('2020-08-01'), symbol: 'AXP', side: 'B', units: 1, priceUSD: 100, fxRate: 1.5 }),
      makeTrade({ date: new Date('2021-01-01'), symbol: 'AXP', side: 'S', units: 1, priceUSD: 100, fxRate: 2.0 }),
    ];
    const result = calculateCapitalGains(trades);
    expect(result[2020]['AXP'].capitalGains).toBeCloseTo(50, 5);
  });

  it('cross-FY: buy in FY2021 (Aug 2021) matched against sell in FY2022 (Aug 2022)', () => {
    const trades: Trade[] = [
      makeTrade({ date: new Date('2021-08-01'), symbol: 'TSLA', side: 'B', units: 2, priceUSD: 200 }),
      makeTrade({ date: new Date('2022-08-01'), symbol: 'TSLA', side: 'S', units: 2, priceUSD: 250 }),
    ];
    const result = calculateCapitalGains(trades);
    // Gain is attributed to FY2022 (sell FY): (250-200)*2 = 100
    expect(result[2022]['TSLA'].capitalGains).toBe(100);
    // FY2021 has the buy recorded but no capital gain
    expect(result[2021]['TSLA'].capitalGains).toBe(0);
  });
});
