/**
 * Web app instance to handle requests.
 * 
 * 
 * Web app deployment is used as a workaround. The correct way would be to deploy the script
 * as an API executable. However, deploying as an API executable requires changing the
 * GCP project, which is not possible if a spreadsheet is stored in a shared Google Drive.
 * 
 * `WebApp` may not yet be defined when this file is loaded, so we create it lazily on first use.
 */
let webApp = null;
const getWebApp = () => {

  // Return existing web app instance if it exists.
  if (webApp) {
    return webApp;
  }

  webApp = new WebApp();

  // End point to get all unique project names.
  webApp.on(WebApp.RequestType.GET, '/project-names', (_) => {
    return Backlog.getProjectNames();
  });
  
  // End point to create a new backlog item.
  webApp.on(WebApp.RequestType.POST, '/create-backlog-item', (params) => {

    // Parse parameters.
    let { title, project, priority, status, dayShortcut, scheduledTime } = params;
    priority = priority !== undefined ? Number.parseInt(priority) : undefined;
    scheduledTime = scheduledTime !== undefined ? Number.parseInt(scheduledTime) : undefined;
    const waitingDate = dayShortcut ? Backlog.convertDayShortcutToDate(dayShortcut) : null;
    
    // Insert item.
    const item = new BacklogItem({ title, project, priority, status, waitingDate, scheduledTime });
    Backlog.insertBacklogItem(item);
  });
  
  // End point to schedule events via shortcut.
  webApp.on(WebApp.RequestType.POST, '/schedule-events', (_) => {
    // Schedule all events automatically, but without showing errors.
    const success = Backlog.scheduleEvents(false, false);

    // Respond with success if the shortcut was executed,
    // but supply an error message if scheduling failed.
    return success ? undefined : 'Could not schedule events.';
  });

  return webApp;
}


/**
 * Function that is called when a GET request to web app is made.
 */
function doGet(e) {
  return getWebApp().handleRequest(WebApp.RequestType.GET, e);
}


/**
 * Function that is called when a POST request to web app is made.
 */
function doPost(e) {
  return getWebApp().handleRequest(WebApp.RequestType.POST, e);
}


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
 * Creates a custom menu.
 */
function createMenu() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Custom')
    .addItem('Schedule events', 'scheduleAllEventsLoudly')
    .addItem('Install triggers if needed', 'installTriggersIfNeeded')
    .addToUi();
}


/**
 * Function to insert a new backlog item, globally callable for example
 * from a button.
 */
function insertEmptyBacklogItem() {
  Backlog.insertEmptyBacklogItem();
}


/**
 * Function to insert a new recurring backlog item, globally callable for
 * example from a button.
 */
function insertRecurringItem() {
  Backlog.insertRecurringItem();
}


/**
 * Function to create backlog items for recurring items that are due.
 * Globally callable, for example from a trigger.
 */
function scheduleRecurringItems() {
  Backlog.scheduleRecurringItems();
}


/**
 * Function to set 'Waiting' backlog items to 'Next'.
 * Globally callable, for example from a trigger.
 */
function setWaitingItemsToNext() {
  Backlog.setWaitingItemsToNext();
}


/**
 * Function to schedule events for backlog items and show errors, if any.
 * Globally callable, for example from a trigger.
 */
function scheduleAllEventsLoudly() {
  Backlog.scheduleEvents(false, true);
}


/**
 * Function to schedule events for backlog items that are marked as automatically
 * schedulable. Globally callable, for example from a trigger.
 */
function scheduleAutomaticallySchedulableEventsSilently() {
  Backlog.scheduleEvents(true, false);
}


/**
 * Function to import items from inbox. Globally callable, for example from a trigger.
 */
function importFromInbox() {
  Backlog.importFromInbox();
}


/**
 * Function to handle calendar updates. Globally callable, for example from a trigger.
 */
function handleCalendarUpdates() {
  Backlog.handleCalendarUpdates();
}


/**
 * Function to sync time zone with calendar. Globally callable, for example from a trigger.
 */
function syncTimeZoneWithCalendar() {
  TimeZones.syncWithCalendar();
}


/**
 * Function to install all required triggers if not yet installed.
 * Globally callable, for example from a button.
 */
function installTriggersIfNeeded() {

  // Helper method to install a trigger for a given function if not yet installed.
  // The passed builder function will be called with a fresh TriggerBuilder and needs
  // to return a configured builder. It should not call create() on the builder itself.
  function installUniqueTriggerIfNeeded(f, builderFunction) {
  
    const functionName = f.name;
  
    // Do nothing if trigger for given function is already installed.
    const functions = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
    if (functions.indexOf(functionName) >= 0) {
      return;
    }
  
    // Install trigger.
    const builder = ScriptApp.newTrigger(functionName);
    builderFunction(builder).create();
  }

  installUniqueTriggerIfNeeded(importFromInbox, (builder) => {
    return builder.timeBased().everyMinutes(BacklogConfig.INBOX_IMPORT_INTERVAL);
  });
  installUniqueTriggerIfNeeded(scheduleAutomaticallySchedulableEventsSilently, (builder) => {
    return builder.timeBased().everyMinutes(BacklogConfig.SCHEDULE_EVENTS_INTERVAL);
  });
  installUniqueTriggerIfNeeded(scheduleRecurringItems, (builder) => {
    return builder.timeBased().atHour(BacklogConfig.SCHEDULE_RECURRING_ITEMS_HOUR).everyDays(1);
  });
  installUniqueTriggerIfNeeded(setWaitingItemsToNext, (builder) => {
    return builder.timeBased().atHour(BacklogConfig.SET_WAITING_ITEMS_TO_NEXT_ITEMS_HOUR).everyDays(1);
  });
  installUniqueTriggerIfNeeded(handleCalendarUpdates, (builder) => {
    return builder.forUserCalendar(SchedulerConfig.CALENDAR_ID).onEventUpdated();
  });
  installUniqueTriggerIfNeeded(syncTimeZoneWithCalendar, (builder) => {
    return builder.timeBased().everyMinutes(TimeZonesConfig.SYNC_WITH_CALENDAR_INTERVAL);
  });
}
