/** @OnlyCurrentDoc */
/**
 * Send GDocs as Emails
 */

const NAME = 'Name';
const EMAIL = 'Email';
const WHOYOUARE = 'Who you are';
const STATUS = 'Status';

function sendEmailFromRows() {
  processRows(['Individual', 'Link Worker', 'Organization']);
}

function processRows(groups: string[]) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // get the email template doc urls into a {key: value} Map
  const templateRows = ss.getSheetByName('Templates').getDataRange().getValues();
  const templateMap = templateRows.reduce((result, row) => result.set(row[0], row[1]), new Map());
  const templates = groups.reduce((res, g) => res.set(g, docToHtml(templateMap.get(g))), new Map<string, string>());

  const dataRange = ss.getActiveSheet().getDataRange();
  const rows = dataRange.getValues();
  const headers = rows.shift();

  const groupIndex = headers.indexOf(WHOYOUARE);
  const statusIndex = headers.indexOf(STATUS);

  // get the values from the status column - we want to write back into here
  const statusRange = dataRange.offset(1, statusIndex, rows.length, 1); // row 1, col 0, rows.length 2, cols 1
  const statusValues = statusRange.getValues();

  rows
    .filter((row) => groups.some((g) => g == row[groupIndex]) && !row[statusIndex])
    .forEach((row, i) => {
      const emailBody = evalTpl_(headers, row, templates[row[groupIndex]]);
      const user = getUser_(headers, row);
      const res = sendEmail_(user.email, `Welcome to Inner Light ${user.fname}`, emailBody, 'Inner Light Team');
      statusValues[i] = [res];
    });

  statusRange.setValues(statusValues);
}

function evalTpl_(headers: string[], row: string[], template: string) {
  return headers.reduce((result, fieldName) => result.replace(`{{${fieldName.toUpperCase()}}}`, row[headers.indexOf(fieldName)]), template);
}

function splitName(name: string) {
  const fname = name.substring(0, name.indexOf(' '));
  const lname = name.substring(name.indexOf(' ') + 1, name.length);

  return { fname, lname };
}

function getUser_(headers: string[], row: string[]) {
  const name = row[headers.indexOf(NAME)];
  const { fname, lname } = splitName(name);

  return {
    name,
    fname,
    lname,
    email: row[headers.indexOf(EMAIL)],
    tag: row[headers.indexOf('Tag')] || '',
    group: row[headers.indexOf(WHOYOUARE)],
    status: row[headers.indexOf(STATUS)],
  };
}

function sendEmail_(to: string, subject: string, htmlBody: string, fromName?: string) {
  try {
    MailApp.sendEmail({ to, subject, htmlBody, name: fromName });
    return `Sent: ${new Date()}`;
  } catch (e) {
    return `Error: ${e}`;
  }
}

// todo explore gmailapp & sendind attachments from drive

function docToHtml(docId: string) {
  //  const docId = DocumentApp.openByUrl(docUrl).getId();
  //  const docId = DocumentApp.openById(docUrl);
  //  DocumentApp.getActiveDocument();
  DriveApp.getRootFolder(); // permissions to read

  return UrlFetchApp.fetch(`https://docs.google.com/feeds/download/documents/export/Export?id=${docId}`, {
    method: 'get',
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    muteHttpExceptions: true,
  }).getContentText();
}

// Set note
// sheet.getRange(rowIndex, headers.indexOf('Status') + 1, 1, 1).setNote('Syncd: ' + new Date().toISOString());

// Set a comment
//   on the edited cell to indicate when it was changed
// e.range.setNote('Last modified: ' + new Date());

// Update status - via row or note
//  values[headers.indexOf('Status')] = 'Synced: ' + new Date();
//  row.setValues([values]);
