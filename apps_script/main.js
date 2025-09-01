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

/**
 * Trigger function that is called when selection is changed.
 */
function onSelectionChange(e) {
  Backlog.handleOnSelectionChange(e);
}

/**
 * Function that is called when script is deployed as a web app and a POST request is made.
 * 
 * Web app deployment is used as a workaround. The correct way would be to deploy the script
 * as an API executable. However, deploying as an API executable requires changing the
 * GCP project, which is not possible if a spreadsheet is stored in a shared Google Drive.
 */
function doPost(e) {
  // Schedule all events automatically, but without showing errors.
  // Errors must be handled by the caller.
  const success = Backlog.scheduleEvents(false, false);
  const response = { success: success };
  return ContentService.createTextOutput(JSON.stringify(response));
}

/**
 * Creates a custom menu.
 */
function createMenu() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Custom')
    .addItem('Schedule events', 'scheduleAllEventsLoudly')
    .addItem('Install triggers if needed', 'installTriggersIfNeeded')
    .addToUi();
}

