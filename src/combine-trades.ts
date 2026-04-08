function combineTradesSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const fyPattern = /^FY\d{2}$/i;

  const fySheets = ss.getSheets()
    .filter(s => fyPattern.test(s.getName()))
    .sort((a, b) => a.getName().localeCompare(b.getName()));

  if (fySheets.length === 0) {
    SpreadsheetApp.getUi().alert('No sheets matching FY## found.');
    return;
  }

  let target = ss.getSheetByName('Trades-All');
  if (target) {
    target.clearContents();
  } else {
    target = ss.insertSheet('Trades-All');
  }

  // Canonical output columns — Company excluded so all sheets align regardless of source format
  const OUTPUT_COLS = ['Code', 'Date', 'Type', 'Quantity', 'Unit Price ($)', 'Trade Value ($)', 'Brokerage+GST ($)', 'GST ($)', 'Contract Note', 'Total Value ($)'];
  const DATE_COL = 1; // index of 'Date' in OUTPUT_COLS
  const KNOWN_HEADERS = new Set(OUTPUT_COLS.concat(['Company']));

  const allRows: any[][] = [];

  for (const sheet of fySheets) {
    const data = sheet.getDataRange().getValues();

    // Find the header row — first row that contains at least two known column names
    let headerIdx = -1;
    for (let i = 0; i < data.length; i++) {
      const cells = (data[i] as any[]).map((h: any) => String(h).trim());
      if (cells.filter(c => KNOWN_HEADERS.has(c)).length >= 2) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      const preview = data.slice(0, 5).map((r, i) => `  row${i}: ${(r as any[]).join(' | ')}`).join('\n');
      Logger.log(`Skipping sheet "${sheet.getName()}": no recognisable header row found.\nFirst 5 rows:\n${preview}`);
      continue;
    }

    const headers = (data[headerIdx] as any[]).map((h: any) => String(h).trim());
    const companyColInHeader = headers.indexOf('Company');
    // Base colMap — works for rows that have all columns including Company (if present)
    const colMap = OUTPUT_COLS.map(col => headers.indexOf(col));

    const looksLikeDate = (val: any) =>
      val instanceof Date || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(val).trim());

    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i] as any[];
      if (row.every((cell: any) => cell === '' || cell === null || cell === undefined)) continue;

      // If the header has a Company column but this row's expected date cell isn't a date,
      // the row was entered without a Company value — shift all columns after Code back by 1
      let effectiveColMap = colMap;
      if (companyColInHeader >= 0 && !looksLikeDate(row[colMap[DATE_COL]])) {
        effectiveColMap = colMap.map((idx, i) => (i === 0 ? idx : Math.max(0, idx - 1)));
      }

      const mapped = effectiveColMap.map(idx => (idx >= 0 && idx < row.length ? row[idx] : ''));
      allRows.push(mapped);
    }
  }

  if (allRows.length === 0) {
    SpreadsheetApp.getUi().alert('No data found in FY## sheets.');
    return;
  }

  // Sort by date — handles both Date objects and DD/MM/YYYY strings
  const toTimestamp = (val: any): number => {
    if (val instanceof Date) return val.getTime();
    const m = String(val).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return 0;
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
  };
  allRows.sort((a, b) => toTimestamp(a[DATE_COL]) - toTimestamp(b[DATE_COL]));

  const rows = [OUTPUT_COLS, ...allRows];
  target.getRange(1, 1, rows.length, OUTPUT_COLS.length).setValues(rows);

  SpreadsheetApp.getUi().alert(`Done — combined ${fySheets.length} sheet(s) into Trades-All.`);
}
