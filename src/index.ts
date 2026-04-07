declare function calculateCG4(spreadsheetId?: string): void;

function onOpen(_e: GoogleAppsScript.Events.SheetsOnOpen) {
  // In restricted auth mode (e.g. add-on install), only create the menu
  SpreadsheetApp.getUi().createAddonMenu().addItem('Calculate CG', 'calculateCG4').addToUi();
}
