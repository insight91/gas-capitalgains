export interface Trade {
  date: Date;
  symbol: string;
  side: 'B' | 'S';
  units: number;
  priceUSD: number;
  valueUSD: number;
  fxRate: number;
  localCurrencyValue: number;
  brokerage: number;
}

export interface BuyLot {
  date: Date;
  units: number;
  price: number;      // priceAUD (for display)
  brokerage: number;  // brokerageAUD, positive (for display)
  costPerUnit: number; // (price + brokerage / originalUnits) — used in FIFO gain calc
}

export interface SellLot {
  date: Date;
  units: number;
  price: number;      // priceAUD (for display)
  brokerage: number;  // brokerageAUD, positive (for display)
}

export interface SymbolResult {
  shortTermGains: number;    // gains from lots held ≤ 12 months
  discountableGains: number; // gains from lots held > 12 months, pre-discount
  capitalGains: number;      // net: shortTermGains + (discountableGains >= 0 ? discountableGains * 0.5 : discountableGains)
  buys: BuyLot[];
  sells: SellLot[];
}

export interface CGResult {
  [fy: number]: {
    [symbol: string]: SymbolResult;
  };
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function calculateCapitalGains(trades: Trade[]): CGResult {
  const CG: CGResult = {};

  // Global FIFO buy queue keyed by symbol. Persists across FYs so that a buy
  // in FY2021 can be matched against a sell in FY2022 (Stake exports all years
  // in one sheet).
  const globalBuysRT: { [symbol: string]: BuyLot[] } = {};

  let initYear = 2020;
  let FYStart = new Date(initYear, 6, 1);
  let FYEnd = new Date(initYear + 1, 5, 30);

  for (const trade of trades) {
    const { date, symbol, side, units, priceUSD, fxRate, brokerage } = trade;

    // Advance FY window before processing so trades on or after July 1 land in the correct year
    if (date > FYEnd) {
      FYStart = new Date(date.getFullYear(), 6, 1);
      FYEnd = new Date(date.getFullYear() + 1, 5, 30);
    }

    let FY = FYStart.getFullYear();

    if (date >= FYStart && date <= FYEnd) {
      if (!CG[FY]) {
        CG[FY] = {};
      }
      if (!CG[FY][symbol]) {
        CG[FY][symbol] = { shortTermGains: 0, discountableGains: 0, capitalGains: 0, buys: [], sells: [] };
      }

      // fxRate is AUD per USD (e.g. 1.29 means 1 USD = 1.29 AUD)
      const priceAUD = priceUSD * fxRate;
      // brokerage is negative USD in the Stake export — convert to positive AUD
      const brokerageAUD = Math.abs(brokerage) * fxRate;

      if (side === 'B') {
        const lot: BuyLot = {
          date,
          units,
          price: priceAUD,
          brokerage: brokerageAUD,
          costPerUnit: priceAUD + brokerageAUD / units,
        };
        CG[FY][symbol].buys.push(lot);
        if (!globalBuysRT[symbol]) globalBuysRT[symbol] = [];
        globalBuysRT[symbol].push(lot);
      } else if (side === 'S') {
        const r = CG[FY][symbol];
        r.sells.push({ date, units, price: priceAUD, brokerage: brokerageAUD });

        // Proceeds per unit after deducting sell brokerage
        const proceedsPerUnit = priceAUD - brokerageAUD / units;
        const buys = globalBuysRT[symbol] ?? [];

        let unitsToSell = units;
        while (unitsToSell > 0 && buys.length > 0) {
          const b = buys[0];
          const lotUnits = unitsToSell >= b.units ? b.units : unitsToSell;
          const gain = lotUnits * (proceedsPerUnit - b.costPerUnit);

          // ATO 50% CGT discount applies when the asset is held for more than 12 months
          const holdDays = (date.getTime() - b.date.getTime()) / MS_PER_DAY;
          if (holdDays > 365) {
            r.discountableGains += gain;
          } else {
            r.shortTermGains += gain;
          }

          if (unitsToSell >= b.units) {
            unitsToSell -= b.units;
            buys.shift();
          } else {
            b.units -= unitsToSell;
            unitsToSell = 0;
          }
        }

        // Net capital gain: long-term losses keep their full value, long-term gains get 50% discount
        r.capitalGains = r.shortTermGains + (r.discountableGains >= 0 ? r.discountableGains * 0.5 : r.discountableGains);
      }
    }
  }

  return CG;
}
