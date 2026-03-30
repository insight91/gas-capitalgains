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

export interface SymbolResult {
  capitalGains: number;
  buys: BuyLot[];
  buysRT: BuyLot[];
}

export interface CGResult {
  [fy: number]: {
    [symbol: string]: SymbolResult;
  };
}

export function calculateCapitalGains(trades: Trade[]): CGResult {
  const CG: CGResult = {};

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
        CG[FY][symbol] = { capitalGains: 0, buys: [], buysRT: [] };
      }

      if (side === 'B') {
        CG[FY][symbol].buys.push({ date, units, price: priceUSD, brokerage });
        CG[FY][symbol].buysRT.push({ date, units, price: priceUSD, brokerage });
      } else if (side === 'S') {
        const r = CG[FY][symbol];
        const buys: BuyLot[] = r.buysRT;

        let unitsToSell = units;
        for (const b of buys) {
          const buyValue = b.units * b.price;
          const saleValue = unitsToSell * priceUSD;

          if (unitsToSell >= b.units) {
            r.capitalGains += saleValue - buyValue;
            buys.shift();
          } else if (unitsToSell < b.units) {
            buys[0].units -= unitsToSell;
          }
        }
      }
    }
  }

  return CG;
}
