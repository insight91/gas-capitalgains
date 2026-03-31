import * as fs from 'fs';
import * as path from 'path';
import { Trade } from '../../capital-gains.core';

export const TRADES_CSV_PATH = path.resolve(__dirname, '../../../test-data/Trades-Table 1.csv');

export function parseTradesCsv(filePath: string): Trade[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const [headerLine, ...dataLines] = content.split('\n').filter(l => l.trim());
  const headers = headerLine.split(',');

  const col = (name: string) => headers.indexOf(name);
  const dateCol   = col('DATE (US)');
  const symbolCol = col('SYMBOL');
  const sideCol   = col('SIDE');
  const unitsCol  = col('UNITS');
  const priceCol  = col('EFFECTIVE PRICE (USD)');
  const valueCol  = col('VALUE (USD)');
  const fxCol     = col('FX RATE');
  const localCol  = col('LOCAL CURRENCY VALUE');
  const brokerCol = col('BROKERAGE FEE (USD)');

  return dataLines
    .map(line => line.split(','))
    .filter(row => {
      const side = row[sideCol]?.trim();
      return row[symbolCol]?.trim() && (side === 'B' || side === 'S');
    })
    .map(row => ({
      date: new Date(row[dateCol].trim()),
      symbol: row[symbolCol].trim(),
      side: row[sideCol].trim() as 'B' | 'S',
      units: parseFloat(row[unitsCol]),
      priceUSD: parseFloat(row[priceCol]),
      valueUSD: parseFloat(row[valueCol]),
      fxRate: parseFloat(row[fxCol]),
      localCurrencyValue: parseFloat(row[localCol]),
      brokerage: parseFloat(row[brokerCol]),
    }));
}
