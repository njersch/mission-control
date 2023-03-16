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
 * Function to create backlog items for recurring items that are due,
 * globally callable for example from a trigger.
 */
function scheduleRecurringBacklogItems() {
  Backlog.scheduleRecurringBacklogItems();
}


/**
 * Function to set 'Waiting' backlog items to 'Next, globally callable
 * for example from a trigger.
 */
function setWaitingItemsToNext() {
  Backlog.setWaitingItemsToNext();
}


/**
 * Function to schedule events for backlog items loudly, globally callable
 * for example from a trigger.
 */
function scheduleEventsLoudly() {
  Backlog.scheduleEvents(true);
}


/**
 * Function to schedule events for backlog items silently, globally callable
 * for example from a trigger.
 */
function scheduleEventsSilently() {
  Backlog.scheduleEvents(false);
}


/**
 * Function to import items from inbox, globally callable for example from
 * a trigger.
 */
function importFromInbox() {
	Backlog.importFromInbox();
}


/**
 * Function to install all required triggers if not yet installed, globally
 * callable for example from a button.
 */
function installTriggersIfNeeded() {
  Backlog.installTriggersIfNeeded();
}