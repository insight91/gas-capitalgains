declare function calculateCGStake(spreadsheetId?: string): void;
declare function calculateCGCommsec(spreadsheetId?: string): void;

function onOpen(_e: GoogleAppsScript.Events.SheetsOnOpen) {
  // In restricted auth mode (e.g. add-on install), only create the menu
  SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem('Calculate (Stake)', 'calculateCGStake')
    .addItem('Calculate (CommSec)', 'calculateCGCommsec')
    .addToUi();
}
