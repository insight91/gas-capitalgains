import * as fs from 'fs';
import { calculateCapitalGains, CGResult, SymbolResult } from '../capital-gains.core';
import { parseTradesCsv, TRADES_CSV_PATH } from './fixtures/parseTradesCsv';

const csvExists = fs.existsSync(TRADES_CSV_PATH);
const describeIfCsv = csvExists ? describe : describe.skip;

describeIfCsv('calculateCapitalGains — real Stake data', () => {
  let result: CGResult;

  beforeAll(() => {
    const trades = parseTradesCsv(TRADES_CSV_PATH);
    result = calculateCapitalGains(trades);
  });

  it('produces at least one FY result', () => {
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });

  it('all FY keys are valid year numbers', () => {
    for (const fy of Object.keys(result)) {
      expect(Number(fy)).toBeGreaterThan(2000);
    }
  });

  it('every symbol entry has capitalGains as a finite number', () => {
    for (const fy of Object.values(result)) {
      for (const sym of Object.values(fy) as SymbolResult[]) {
        expect(Number.isFinite(sym.capitalGains)).toBe(true);
      }
    }
  });

  it('ARKK appears in FY2020 (Mar 2021 trades fall in Jul 2020 – Jun 2021 window)', () => {
    expect(result[2020]).toBeDefined();
    expect(result[2020]['ARKK']).toBeDefined();
  });
});
