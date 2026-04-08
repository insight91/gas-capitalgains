declare function calculateCGStake(spreadsheetId?: string): void;
declare function calculateCGCommsec(spreadsheetId?: string): void;
declare function combineTradesSheets(): void;

function onOpen(_e: GoogleAppsScript.Events.SheetsOnOpen) {
  // In restricted auth mode (e.g. add-on install), only create the menu
  SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem('Calculate (Stake)', 'calculateCGStake')
    .addItem('Calculate (CommSec)', 'calculateCGCommsec')
    .addSeparator()
    .addItem('Combine FY## sheets → Trades-All', 'combineTradesSheets')
    .addToUi();
}
