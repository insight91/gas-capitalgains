import { Trade } from '../../capital-gains.core';

// Sample trades matching columns from the Stake "Trades" tab export:
// DATE (US), SYMBOL, SIDE, UNITS, EFFECTIVE PRICE (USD), VALUE (USD),
// FX RATE, LOCAL CURRENCY VALUE, BROKERAGE FEE (USD)
//
// FX rate is USD per AUD (e.g. 0.71 means 1 AUD = 0.71 USD).
// priceAUD = priceUSD / fxRate. localCurrencyValue = valueUSD / fxRate.

export const trades: Trade[] = [
  // --- FY2021 (Jul 2020 – Jun 2021) ---
  // Two AXP buys, one sell — tests FIFO: gain should be against first lot only
  { date: new Date('2020-08-15'), symbol: 'AXP', side: 'B', units: 1, priceUSD: 140, valueUSD: 140,  fxRate: 0.71, localCurrencyValue: 197.18, brokerage: -1 },
  { date: new Date('2020-11-10'), symbol: 'AXP', side: 'B', units: 1, priceUSD: 150, valueUSD: 150,  fxRate: 0.73, localCurrencyValue: 205.48, brokerage: -1 },
  { date: new Date('2021-03-20'), symbol: 'AXP', side: 'S', units: 1, priceUSD: 160, valueUSD: 160,  fxRate: 0.77, localCurrencyValue: 207.79, brokerage: -1 },

  // --- FY2022 (Jul 2021 – Jun 2022) ---
  // Two AAPL buys as a single 2-unit lot, then two sells that exhaust it
  { date: new Date('2021-09-01'), symbol: 'AAPL', side: 'B', units: 2, priceUSD: 130, valueUSD: 260, fxRate: 0.73, localCurrencyValue: 356.16, brokerage: -1 },
  { date: new Date('2022-01-15'), symbol: 'AAPL', side: 'S', units: 1, priceUSD: 150, valueUSD: 150, fxRate: 0.72, localCurrencyValue: 208.33, brokerage: -1 },
  { date: new Date('2022-04-20'), symbol: 'AAPL', side: 'S', units: 1, priceUSD: 170, valueUSD: 170, fxRate: 0.74, localCurrencyValue: 229.73, brokerage: -1 },

  // --- Cross-FY carry-over ---
  // Buy in FY2022 (Oct 2022), sell in FY2022 (Feb 2023) — same FY window
  { date: new Date('2022-10-01'), symbol: 'TSLA', side: 'B', units: 3, priceUSD: 200, valueUSD: 600, fxRate: 0.64, localCurrencyValue: 937.50, brokerage: -2 },
  { date: new Date('2023-02-01'), symbol: 'TSLA', side: 'S', units: 2, priceUSD: 250, valueUSD: 500, fxRate: 0.69, localCurrencyValue: 724.64, brokerage: -2 },
];
