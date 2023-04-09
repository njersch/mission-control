/**
 * Trigger function that is called when spreadsheet is opened.
 */
function onOpen() {
  createMenu();
  Backlog.handleOnOpen();
}

/**
 * Trigger function that is called when spreadsheet is edited.
 */
function onEdit(e) {
  Backlog.handleOnEdit(e);
}

function onSelectionChange(e) {
  Backlog.handleOnSelectionChange(e);
}

/**
 * Creates a custom menu.
 */
function createMenu() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Custom')
    .addItem('Schedule events', 'scheduleEventsLoudly')
    .addItem('Install triggers if needed', 'installTriggersIfNeeded')
    .addToUi();
}

