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
function scheduleRecurringBacklogItems() {
  Backlog.scheduleRecurringBacklogItems();
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
  Backlog.installTriggersIfNeeded();
}