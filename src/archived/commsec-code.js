function calculateFifoSummaryAndHoldings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ['FY22', 'FY23', 'FY24', 'FY25'];
  const targetCode = 'IOZ';

  function findHeaderIndex(headers, name) {
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

  // Strict Australian-style date parsing: dd/mm/yyyy
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
    return null; // invalid date
  }

  function getFinancialYear(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    const year = date.getFullYear();
    const month = date.getMonth(); // 0=Jan ... 11=Dec
    return month >= 6 ? 'FY' + (year + 1) : 'FY' + year; // 1 July -> next FY
  }

  // Collect trades
  const trades = [];
  sheets.forEach((name) => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) return;
    const headers = data[0];

    const codeIdx = findHeaderIndex(headers, 'Code');
    const dateIdx = findHeaderIndex(headers, 'Date');
    const qtyIdx = findHeaderIndex(headers, 'Quantity');
    const priceIdx = findHeaderIndex(headers, 'Unit Price ($)');
    const typeIdx = findHeaderIndex(headers, 'Type');

    if (codeIdx === -1 || dateIdx === -1 || qtyIdx === -1 || priceIdx === -1) return;

    data.slice(1).forEach((row) => {
      const code = String(row[codeIdx] || '')
        .trim()
        .toUpperCase();
      if (code !== targetCode.toUpperCase()) return;

      const rawDate = row[dateIdx];
      const parsedDate = parseAustralianDate(rawDate);
      if (!parsedDate) return; // skip invalid dates

      const qtyRaw = Number(row[qtyIdx] || 0);
      const typeRaw = String(row[typeIdx] || '')
        .trim()
        .toUpperCase();
      const type = qtyRaw < 0 ? 'SELL' : typeRaw || 'BUY';

      trades.push({
        date: parsedDate,
        type: type,
        qty: Math.abs(qtyRaw),
        price: Number(row[priceIdx] || 0),
      });
    });
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
      while (remaining > 0 && buys.length > 0) {
        const first = buys[0];
        const matched = Math.min(remaining, first.qty);
        const costBase = matched * first.price;
        const proceeds = matched * t.price;
        const gain = proceeds - costBase;

        const holdingDays = (t.date - first.date) / (1000 * 60 * 60 * 24);
        const term = holdingDays >= 365 ? 'Long-term' : 'Short-term';
        const fy = getFinancialYear(t.date);

        // Only include FY22–FY25
        const fyNum = parseInt(fy.slice(2));
        if (fy && fyNum >= 2022 && fyNum <= 2025) {
          if (!yearlySummary[fy]) yearlySummary[fy] = { short: 0, long: 0 };
          if (term === 'Long-term') yearlySummary[fy].long += gain;
          else yearlySummary[fy].short += gain;
        }

        first.qty -= matched;
        if (first.qty <= 0) buys.shift();
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
      const shortVal = vals.short || 0;
      const longVal = vals.long || 0;
      const total = shortVal + longVal;
      return [fy, shortVal, longVal, total];
    });
    summarySheet.getRange(summarySheet.getLastRow() + 1, 1, fyRows.length, 4).setValues(fyRows);

    // Console log
    console.log(`Capital Gains Summary for ${targetCode}`);
    fyKeys.forEach((fy) => {
      const vals = yearlySummary[fy];
      console.log(
        `${fy} → Short-term: $${vals.short.toFixed(2)}, Long-term: $${vals.long.toFixed(2)}, Total: $${(vals.short + vals.long).toFixed(2)}`
      );
    });
  } else {
    summarySheet.appendRow(['(no realised gains found for ' + targetCode + ')']);
    console.log(`No realised gains found for ${targetCode}`);
  }

  summarySheet.appendRow(['']);
  summarySheet.appendRow(['Remaining Holdings for ' + targetCode]);
  summarySheet.appendRow(['Buy Date', 'Units Remaining', 'Unit Price ($)', 'Total Value ($)']);

  if (buys.length > 0) {
    const remRows = buys.map((b) => [
      Utilities.formatDate(b.date, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
      b.qty,
      b.price,
      b.qty * b.price,
    ]);
    summarySheet.getRange(summarySheet.getLastRow() + 1, 1, remRows.length, 4).setValues(remRows);
  } else {
    summarySheet.appendRow(['(no holdings remaining)']);
  }

  summarySheet.autoResizeColumns(1, 5);
}
