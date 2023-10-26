/** @OnlyCurrentDoc */

const props = PropertiesService.getDocumentProperties();
const TIMED_TK = 'ontime_calculateCG';
const EDIT_TK = 'onedit_calculateCG';

/**
 * Main function  https://developers.google.com/apps-script/guides/typescript
 * CLASP cli - https://github.com/google/clasp
 * Examples & ready slns - https://github.com/gsuitedevs/solutions/tree/master
 */

function onOpen() {
  // not required
  // createTimeDrivenTrigger();
  // createEditTrigger();

  // Calc on open
  calculateCG_(null);

  // Add Menu Option
  SpreadsheetApp.getUi().createMenu('Calculate').addItem('Calculate CG', 'calculateCG_').addToUi();
}

function createTimeDrivenTrigger() {
  const p = props.getProperty(TIMED_TK);
  if (p) return;

  const tb = ScriptApp.newTrigger('calculateCG_').timeBased().everyMinutes(1).create();
  const id = tb.getUniqueId();
  props.setProperties({ [TIMED_TK]: id });
  Logger.log('[trigger] timedriven add new to mailchimp 1m', id);
}

function createEditTrigger() {
  const p = props.getProperty(EDIT_TK);
  if (p) return;

  // onedit cell add to mailchhimp
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const onEditT = ScriptApp.newTrigger('onCellEdit_').forSpreadsheet(spreadsheet).onEdit().create();
  const id = onEditT.getUniqueId();
  Logger.log('[trigger] oneditcell add to mailchimp', id);
  props.setProperties({ [EDIT_TK]: id });
}

function deleteTrigger(triggerId: string) {
  const allTriggers = ScriptApp.getProjectTriggers();
  for (const t of allTriggers) {
    if (t.getUniqueId() === triggerId) {
      ScriptApp.deleteTrigger(t);
      Logger.log('[trigger] deleted', triggerId);
      break;
    }
  }
}
