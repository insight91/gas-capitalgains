/** @OnlyCurrentDoc */

function onOpen() {
  // Calc on open
  calculateCG4(null);

  // Add menu item to recalc on demand
  SpreadsheetApp.getUi().createMenu('Calculate').addItem('Calculate CG', 'calculateCG4').addToUi();
}

// Triggers are not used in this project — calculateCG4 runs on open instead.
// Possibilities for future triggers:
//   createTimeDrivenTrigger() — re-runs calculateCG4 on a time interval (every 5 min)
//   createEditTrigger()       — re-runs on any cell edit via onCellEdit_
