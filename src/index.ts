/** @OnlyCurrentDoc */

const props = PropertiesService.getDocumentProperties();
const TIMED_TK = 'ontime_calculateCG';
const EDIT_TK = 'onedit_calculateCG';

function onOpen() {
  // Calc on open
  calculateCG4(null);

  // Add Menu Option
  SpreadsheetApp.getUi().createMenu('Calculate').addItem('Calculate CG', 'calculateCG4').addToUi();
}

// not required for this project
// createTimeDrivenTrigger();
// createEditTrigger();

function createTimeDrivenTrigger() {
  const p = props.getProperty(TIMED_TK);
  if (p) return;

  const tb = ScriptApp.newTrigger('calculateCG4').timeBased().everyMinutes(1).create();
  const id = tb.getUniqueId();
  props.setProperties({ [TIMED_TK]: id });
  Logger.log('[trigger] timedriven calculate CG', id);
}

function createEditTrigger() {
  const p = props.getProperty(EDIT_TK);
  if (p) return;

  // onedit cell add to mailchhimp
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const onEditT = ScriptApp.newTrigger('onCellEdit_').forSpreadsheet(spreadsheet).onEdit().create();
  const id = onEditT.getUniqueId();
  Logger.log('[trigger] oneditcell', id);
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

/**
 * ARCHIVED CODE
 */
// var data = sheet.getDataRange().getValues();
// for (var i = 1; i < data.length; i++) {
