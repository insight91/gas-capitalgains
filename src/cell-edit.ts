function onCellEdit_(e: any) {
  if (!e) return;

  const sheet = e.range.getSheet() as GoogleAppsScript.Spreadsheet.Sheet;
  const headers = sheet.getDataRange().getValues().shift();

  const rowIndex = e.range.getRow();
  const range = sheet.getRange(rowIndex, 1, 1, 10);
  const row = range.getValues()[0]; // 1 row

  const name = row[headers.indexOf('Name')];
  const email = row[headers.indexOf('Email')];
  const group = row[headers.indexOf('Who you are')];
  const tag = row[headers.indexOf('Tag')];
  const source = row[headers.indexOf('Source')];
}
