import { calculateCapitalGains, Trade } from '../calculateCapitalGains';

function makeTrade(overrides: Partial<Trade> & Pick<Trade, 'date' | 'symbol' | 'side' | 'units' | 'priceUSD'>): Trade {
  return {
    valueUSD: overrides.units * overrides.priceUSD,
    fxRate: 0.68,
    localCurrencyValue: (overrides.units * overrides.priceUSD) / 0.68,
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
    // Second lot remains in buysRT
    expect(result[2020]['AXP'].buysRT).toHaveLength(1);
    expect(result[2020]['AXP'].buysRT[0].price).toBe(200);
  });

  it('partial sell decrements buysRT lot units rather than removing the lot', () => {
    const trades: Trade[] = [
      makeTrade({ date: new Date('2020-08-01'), symbol: 'AAPL', side: 'B', units: 3, priceUSD: 100 }),
      makeTrade({ date: new Date('2021-01-01'), symbol: 'AAPL', side: 'S', units: 1, priceUSD: 130 }),
    ];
    const result = calculateCapitalGains(trades);
    expect(result[2020]['AAPL'].buysRT).toHaveLength(1);
    expect(result[2020]['AAPL'].buysRT[0].units).toBe(2); // 3 - 1 = 2 remaining
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

  it('cross-FY carry-over: buy in FY2022, sell in FY2023 calculates gain correctly', () => {
    const trades: Trade[] = [
      makeTrade({ date: new Date('2022-10-01'), symbol: 'TSLA', side: 'B', units: 2, priceUSD: 200 }),
      makeTrade({ date: new Date('2023-02-01'), symbol: 'TSLA', side: 'S', units: 2, priceUSD: 250 }),
    ];
    const result = calculateCapitalGains(trades);
    // Sell is in FY2022 window (Jul 2022 – Jun 2023), buy was also FY2022 — gain = (250-200)*2 = 100
    expect(result[2022]['TSLA'].capitalGains).toBe(100);
  });
});
