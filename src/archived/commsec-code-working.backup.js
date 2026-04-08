function calculateFifoSummaryAndHoldingsSingleSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Transactions');
  if (!sheet) {
    console.log('Sheet "Transactions" not found');
    return;
  }

  const targetCode = 'IOZ';

  const data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) return;
  const headers = data[0];

  function findHeaderIndex(name) {
    name = name.trim().toLowerCase();
    for (let i = 0; i < headers.length; i++) {
      if (
        String(headers[i] || '')
          .trim()
          .toLowerCase() === name
      )
        return i;
    }
    return -1;
  }

  function parseAustralianDate(v) {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v)) return v;
    const s = String(v).trim();
    const parts = s.split(/[\/\-\.]/).map((x) => x.trim());
    if (parts.length === 3) {
      const dd = parseInt(parts[0], 10);
      const mm = parseInt(parts[1], 10) - 1;
      const yyyy = parseInt(parts[2], 10);
      if (!isNaN(dd) && !isNaN(mm) && !isNaN(yyyy)) return new Date(yyyy, mm, dd);
    }
    return null;
  }

  function getFinancialYear(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    const year = date.getFullYear();
    const month = date.getMonth();
    return month >= 6 ? 'FY' + (year + 1) : 'FY' + year;
  }

  // Identify column indexes
  const codeIdx = findHeaderIndex('Security');
  const dateIdx = findHeaderIndex('Trade Date');
  const typeIdx = findHeaderIndex('Buy/ Sell');
  const qtyIdx = findHeaderIndex('Units');
  const priceIdx = findHeaderIndex('Average Price ($)');

  if (codeIdx === -1 || dateIdx === -1 || typeIdx === -1 || qtyIdx === -1 || priceIdx === -1) {
    console.log('Required columns not found');
    return;
  }

  // Collect trades
  const trades = [];
  data.slice(1).forEach((row) => {
    const code = String(row[codeIdx] || '')
      .trim()
      .toUpperCase();
    if (code !== targetCode.toUpperCase()) return;

    const parsedDate = parseAustralianDate(row[dateIdx]);
    if (!parsedDate) return;

    const qty = Number(row[qtyIdx] || 0);
    const price = Number(row[priceIdx] || 0);
    const typeRaw = String(row[typeIdx] || '')
      .trim()
      .toUpperCase();
    const type = typeRaw.startsWith('S') ? 'SELL' : 'BUY';

    trades.push({ date: parsedDate, type, qty, price });
  });

  trades.sort((a, b) => a.date - b.date);

  // FIFO matching
  const buys = [];
  const yearlySummary = {};

  trades.forEach((t) => {
    if (t.type === 'BUY') {
      buys.push({ date: t.date, qty: t.qty, price: t.price });
    } else if (t.type === 'SELL') {
      let remaining = t.qty;
      for (let i = 0; i < buys.length && remaining > 0; i++) {
        const buy = buys[i];
        if (buy.qty <= 0) continue;
        const matched = Math.min(buy.qty, remaining);
        const gain = (t.price - buy.price) * matched;

        const holdingDays = (t.date - buy.date) / (1000 * 60 * 60 * 24);
        const term = holdingDays >= 365 ? 'Long-term' : 'Short-term';
        const fy = getFinancialYear(t.date);
        const fyNum = parseInt(fy.slice(2));

        // Only include FY22–FY25
        if (fy && fyNum >= 2022 && fyNum <= 2025) {
          if (!yearlySummary[fy]) yearlySummary[fy] = { short: 0, long: 0 };
          if (term === 'Long-term') yearlySummary[fy].long += gain;
          else yearlySummary[fy].short += gain;
        }

        buy.qty -= matched;
        remaining -= matched;
      }
    }
  });

  // --- Output ---
  const summarySheet = ss.getSheetByName('Capital Gains') || ss.insertSheet('Capital Gains');
  summarySheet.clear();

  summarySheet.appendRow(['Summary by Financial Year for ' + targetCode]);
  summarySheet.appendRow(['FY', 'Short-term Gain ($)', 'Long-term Gain ($)', 'Total Gain ($)']);

  const fyKeys = Object.keys(yearlySummary).sort();
  if (fyKeys.length > 0) {
    const fyRows = fyKeys.map((fy) => {
      const vals = yearlySummary[fy];
      return [fy, vals.short || 0, vals.long || 0, (vals.short || 0) + (vals.long || 0)];
    });
    summarySheet.getRange(summarySheet.getLastRow() + 1, 1, fyRows.length, 4).setValues(fyRows);

    // log summary
    console.log(`Capital Gains Summary for ${targetCode}`);
    fyKeys.forEach((fy) => {
      const vals = yearlySummary[fy];
      console.log(
        `${fy} → Short-term: $${vals.short.toFixed(2)}, Long-term: $${vals.long.toFixed(2)}, Total: $${(
          (vals.short || 0) + (vals.long || 0)
        ).toFixed(2)}`
      );
    });
  } else {
    summarySheet.appendRow(['(no realised gains found for ' + targetCode + ')']);
    console.log(`No realised gains found for ${targetCode}`);
  }

  // Remaining holdings
  summarySheet.appendRow(['']);
  summarySheet.appendRow(['Remaining Holdings for ' + targetCode]);
  summarySheet.appendRow(['Buy Date', 'Units Remaining', 'Unit Price ($)', 'Total Value ($)']);

  const remainingRows = buys
    .filter((b) => b.qty > 0)
    .map((b) => [Utilities.formatDate(b.date, Session.getScriptTimeZone(), 'dd/MM/yyyy'), b.qty, b.price, b.qty * b.price]);

  if (remainingRows.length > 0) {
    summarySheet.getRange(summarySheet.getLastRow() + 1, 1, remainingRows.length, 4).setValues(remainingRows);
  } else {
    summarySheet.appendRow(['(no holdings remaining)']);
  }

  summarySheet.autoResizeColumns(1, 5);
}
