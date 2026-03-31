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
  price: number;
  brokerage: number;
}

export interface SellLot {
  date: Date;
  units: number;
  price: number;
  brokerage: number;
}

export interface SymbolResult {
  capitalGains: number;
  buys: BuyLot[];
  sells: SellLot[];
}

export interface CGResult {
  [fy: number]: {
    [symbol: string]: SymbolResult;
  };
}

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
    const { date, symbol, side, units, priceUSD, brokerage } = trade;

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
        CG[FY][symbol] = { capitalGains: 0, buys: [], sells: [] };
      }

      if (side === 'B') {
        const lot: BuyLot = { date, units, price: priceUSD, brokerage };
        CG[FY][symbol].buys.push(lot);
        if (!globalBuysRT[symbol]) globalBuysRT[symbol] = [];
        globalBuysRT[symbol].push(lot);
      } else if (side === 'S') {
        const r = CG[FY][symbol];
        r.sells.push({ date, units, price: priceUSD, brokerage });
        const buys = globalBuysRT[symbol] ?? [];

        let unitsToSell = units;
        while (unitsToSell > 0 && buys.length > 0) {
          const b = buys[0];
          if (unitsToSell >= b.units) {
            r.capitalGains += b.units * (priceUSD - b.price);
            unitsToSell -= b.units;
            buys.shift();
          } else {
            r.capitalGains += unitsToSell * (priceUSD - b.price);
            b.units -= unitsToSell;
            unitsToSell = 0;
          }
        }
      }
    }
  }

  return CG;
}
