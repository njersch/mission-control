/**
 * Representation of a backlog item.
 */
class BacklogItem {

  constructor(title, project, priority, notes) {
    this.title = title;
    this.project = project;
    this.priority = priority;
    this.notes = notes;
  }
}


/**
 * Class providing a name space for backlog functions.
 */
class Backlog {

  /**
   * Function that is to be called from trigger function onOpen().
   */
  static handleOnOpen() {
    try {
      this.setWaitingItemsToNext();
      this.showSetToNextDialogIfNeeded();
    } catch (error) {
      this.showErrorAlert(error);
    }
  }


  /**
   * Function that is to be called from trigger function onEdit(e).
   */
  static handleOnEdit(e) {
    try {

      // Ignore edits from other sheets
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      if (sheet.getSheetId() !== BacklogConfig.SHEET_ID) {
        return;
      }
      
      // Ignore edits in ranges with multiple cells
      const range = e.range;
      if (range.getNumColumns() > 1 || range.getNumRows() > 1) {
        return;
      }

      // Ignore edits in header rows
      const row = range.getRow();
      if (row <= BacklogConfig.HEADER_ROWS) {
        return;
      }
      
      // Determine action for column
      const column = range.getColumn();
      if (column === BacklogConfig.COLUMN_PROJECT) {
        this.setDefaultProjectIfNeeded(sheet, row);
      } else if (column === BacklogConfig.COLUMN_WAITING) {
        this.setWaiting(sheet, row);
        this.convertShortcutToDateIfNeeded(sheet, row);
      } else if (column === BacklogConfig.COLUMN_STATUS) {
        this.clearWaitingDateIfNeeded(sheet, row, e.oldValue, e.value);
        this.deleteRowIfNeeded(sheet, row, e.value);
      }

    } catch (error) {

      // Show error prompt
      this.showErrorAlert(error);
    }
  }


  /**
   * Function that is to be called from trigger function onSelectionChange(e).
   */
  static handleOnSelectionChange(e) {
    try {
      this.showSetToNextDialogIfNeeded();
    } catch (error) {
      this.showErrorAlert(error);
    }
  }


  /**
   * Installs all required triggers if not yet installed.
   */
  static installTriggersIfNeeded() {
    this.installUniqueTriggerIfNeeded(importFromInbox, (builder) => {
      return builder.timeBased().everyMinutes(BacklogConfig.INBOX_IMPORT_INTERVAL);
    });
    this.installUniqueTriggerIfNeeded(scheduleRecurringBacklogItems, (builder) => {
      return builder.timeBased().atHour(BacklogConfig.SCHEDULE_RECURRING_ITEMS_HOUR).everyDays(1);
    });
    this.installUniqueTriggerIfNeeded(setWaitingItemsToNext, (builder) => {
      return builder.timeBased().atHour(BacklogConfig.SET_WAITING_ITEMS_TO_NEXT_ITEMS_HOUR).everyDays(1);
    });
  }


  /**
   * Installs a trigger for a given function if not yet installed. The passed builder function
   * will be called with a fresh TriggerBuilder and needs to return a configured builder.
   * It should not call create() on the builder itself.
   */
  static installUniqueTriggerIfNeeded(f, builderFunction) {
    
    const functionName = f.name;

    // Do nothing if trigger for given function is already installed
    const functions = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
    if (functions.indexOf(functionName) >= 0) {
      return;
    }

    // Install trigger
    const builder = ScriptApp.newTrigger(functionName);
    builderFunction(builder).create();
  }

  /**
   * Returns a sheet for a given sheet ID.
   */
  static getSheetById(id) {
    const allSheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
    const matchingSheets = allSheets.filter((s) => s.getSheetId() === id);
    if (matchingSheets.length === 0) {
      return null;
    }
    return matchingSheets[0];
  }

  /**
   * Returns the sheet with the backlog.
   */
  static getBacklogSheet() {
    return this.getSheetById(BacklogConfig.SHEET_ID);
  }


  /**
   * Inserts new empty item at the top.
   */
  static insertEmptyBacklogItem() {
    this.insertBacklogItem(null);
  }


  /**
   * Inserts new item at the top.
   */
  static insertBacklogItem(item) {

    // Insert row and format
    const sheet = this.getBacklogSheet();
    const row = BacklogConfig.HEADER_ROWS + 1;
    sheet.insertRowBefore(row);
    sheet.getRange(row, BacklogConfig.COLUMN_WAITING).setNumberFormat(BacklogConfig.WAITING_DATE_FORMAT);
    sheet.getRange(row, BacklogConfig.COLUMN_TITLE).activate();

    // Populate info, if provided
    if (item != null) {
      sheet.getRange(row, BacklogConfig.COLUMN_TITLE).setValue(item.title);
      sheet.getRange(row, BacklogConfig.COLUMN_PROJECT).setValue(item.project);
      sheet.getRange(row, BacklogConfig.COLUMN_PRIORITY).setValue(item.priority);
      sheet.getRange(row, BacklogConfig.COLUMN_NOTES).setValue(item.notes);
      sheet.getRange(row, BacklogConfig.COLUMN_STATUS).setValue(BacklogConfig.STATUS_NEXT);
    }
  }


  /**
   * Sets project ot the default one if the shortcut was entered.
   */
  static setDefaultProjectIfNeeded(sheet, row) {
    const range = sheet.getRange(row, BacklogConfig.COLUMN_PROJECT);
    const project = range.getValue();
    if (project === BacklogConfig.DEFAULT_PROJECT_SHORTCUT) {
      range.setValue(BacklogConfig.DEFAULT_PROJECT);
    } 
  }


  /**
   * Sets status of waiting items that have become due to 'Next'.
   */
  static setWaitingItemsToNext() {
    
    const sheet = this.getBacklogSheet();
    
    // Find end of day
    const endOfDay = new Date(Date.now() + BacklogConfig.UTC_TIMEZONE_OFFSET);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const updatedItemDescriptions = [];

    // Iterate through all waiting dates
    this.iterateBacklogRows((i) => {
      const waitingDateRange = sheet.getRange(i, BacklogConfig.COLUMN_WAITING);
      const waitingDate = waitingDateRange.getValue();
      
      // Mark as 'Next' if waiting date is in the past
      if (waitingDate instanceof Date && waitingDate.getTime() + BacklogConfig.UTC_TIMEZONE_OFFSET <= endOfDay.getTime()) {
        const statusRange = sheet.getRange(i, BacklogConfig.COLUMN_STATUS);
        const status = statusRange.getValue();
        if (status === BacklogConfig.STATUS_WAITING) {
          statusRange.setValue(BacklogConfig.STATUS_NEXT);
          waitingDateRange.clearContent();
          const title = sheet.getRange(i, BacklogConfig.COLUMN_TITLE).getValue();
          const project = sheet.getRange(i, BacklogConfig.COLUMN_PROJECT).getValue();
          updatedItemDescriptions.push(`${title} (${project})`);
        }
      }
    });

    // Queue descriptions for later display
    if (updatedItemDescriptions.length > 0) {
      this.queueNextItemDescriptions(updatedItemDescriptions);
    }
  }


  /**
   * Sets status to waiting in given row.
   */
  static setWaiting(sheet, row) {
      const range = sheet.getRange(row, BacklogConfig.COLUMN_STATUS);
      range.setValue(BacklogConfig.STATUS_WAITING);
    }


  /**
   * Clears waiting date in given row if status changed from waiting to something else.
   */
  static clearWaitingDateIfNeeded(sheet, row, oldStatus, newStatus) {
    if (oldStatus === BacklogConfig.STATUS_WAITING && newStatus !== BacklogConfig.STATUS_WAITING) {
      const range = sheet.getRange(row, BacklogConfig.COLUMN_WAITING);
      range.clearContent();
    }
  }


  /**
   * Converts a shortcut date (e.g. "Mon" or "10") to the next corresponding date.
   */
  static convertShortcutToDateIfNeeded(sheet, row) {
    
    // Obtain new value
    // (don't use event object's 'value' since it may be passed as an integer, not a date)
    const newValue = this.getBacklogSheet().getRange(row, BacklogConfig.COLUMN_WAITING).getValue();

    // Determine earliest possible date (tomorrow) in UTC
    let date = new Date(Date.now() + BacklogConfig.UTC_TIMEZONE_OFFSET);
    date.setUTCDate(date.getUTCDate() + 1);
    
    // Attempt to parse shortcut (e.g. "Mon")
    if (!this.tryIncrementDateToUTCDay(date, newValue)) {
      
      // Attempt to parse integer-based shortcut (e.g. "10") 
      if (/^[1-9][0-9]*$/.test(newValue)) {
      
        // Add days
        const addDays = parseInt(newValue);
        date.setUTCDate(date.getUTCDate() + addDays - 1);

      } else {

        // No pattern recognized
        return;
      }
    }

    // Convert back to spreadsheet timezone
    date = new Date(date.getTime() - BacklogConfig.UTC_TIMEZONE_OFFSET);

    // Replace string with date
    const range = sheet.getRange(row, BacklogConfig.COLUMN_WAITING);
    range.setValue(date);
    range.setNumberFormat(BacklogConfig.WAITING_DATE_FORMAT);
  }


  /**
   * Deletes row if item is marked as completed.
   */
  static deleteRowIfNeeded(sheet, row, newValue) {
    if (newValue === BacklogConfig.STATUS_DONE) {
      sheet.deleteRow(row);
    }
  }


  /**
   * Queues an array of descriptions of items marked as 'Next' for later display.
   */
  static queueNextItemDescriptions(descriptions) {
    if (descriptions == null || descriptions.length === 0) {
      return;
    }

    // Concatenate old and new descriptions, ignoring duplicates
    const oldDescriptions = this.getQueuedNextItemDescriptions() || [];
    descriptions = descriptions.filter((d) => oldDescriptions.indexOf(d) < 0);
    const allDescriptions = oldDescriptions.concat(descriptions);

    // Set document property
    const properties = PropertiesService.getDocumentProperties();
    properties.setProperty(
      BacklogConfig.NEXT_ITEM_DESCRIPTIONS_PROPERTY_KEY,
      JSON.stringify(allDescriptions)
    );
  }


  /**
   * Gets queued descriptions of items marked as 'Next' for later display.
   */
  static getQueuedNextItemDescriptions() {
    const properties = PropertiesService.getDocumentProperties();
    const property = properties.getProperty(BacklogConfig.NEXT_ITEM_DESCRIPTIONS_PROPERTY_KEY);
    return property == null ? null : JSON.parse(property);
  }


  /**
   * Dequeues descriptions of items marked as 'Next'.
   */
  static dequeueNextItemDescriptions() {
    const properties = PropertiesService.getDocumentProperties();
    properties.deleteProperty(BacklogConfig.NEXT_ITEM_DESCRIPTIONS_PROPERTY_KEY);
  }


  /**
   * Shows dialog with items marked as 'Next' if any updated are queued.
   */
  static showSetToNextDialogIfNeeded() {

    // Get queued descriptions
    const descriptions = this.getQueuedNextItemDescriptions();
    if (descriptions == null || descriptions.length === 0) {
      return;
    }
    
    // Show dialog, guarded by lock to avoid queueing up multiple instances
    this.doWithDocumentLock(20000, () => {
      const ui = SpreadsheetApp.getUi();
      const response = ui.alert(
        `${descriptions.length} waiting ${descriptions.length === 1 ? 'item' : 'items'} moved to '${BacklogConfig.STATUS_NEXT}'`,
        descriptions.join('\n'),
        ui.ButtonSet.OK);

      // Dequeue descriptions
      if (response === ui.Button.OK) {
        this.dequeueNextItemDescriptions();
      }  
    });
  }


  /**
   * Invokes the given function for each backlog item with the
   * corresponding row number.
   */
  static iterateBacklogRows(fn) {
    const sheet = this.getBacklogSheet();
    const lastRow = sheet.getLastRow();
    for (let i = BacklogConfig.HEADER_ROWS + 1; i <= Math.max(lastRow, 1000); i++) {
      fn(i);
    }
  }


  /**
   * Increments a given date to the next date corresponing to the
   * supplied day shortcut (e.g. "Mon"). Returns whether supplied
   * shortcut is valid.
   */
  static tryIncrementDateToUTCDay(date, dayName) {
    const dayOfWeek = this.getDayFromName(dayName);
    if (dayOfWeek == null) {
        return false;
    }
    let increment = dayOfWeek - date.getUTCDay();
    if (increment < 0) {
      increment += 7;
    } 
    date.setUTCDate(date.getUTCDate() + increment);
    return true;
  }


  /**
   * Returns index corresponding to day shortcut (e.g. "Mon"). Index is
   * consistent with JS's Date.getDay().
   */
  static getDayFromName(dayName) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeek = dayNames.map((s) => s.toLowerCase()).indexOf(dayName.toString().toLowerCase());
    if (dayOfWeek < 0) {
      return null;
    }
    return dayOfWeek;
  }


  /**
   * Creates a backlog item with info from the given row.
   */
  static getRecurringBacklogItem(sheet, row) {
    return new BacklogItem(
      sheet.getRange(row, BacklogConfig.RECURRING_COLUMN_TITLE).getValue(),
      sheet.getRange(row, BacklogConfig.RECURRING_COLUMN_PROJECT).getValue(),
      sheet.getRange(row, BacklogConfig.RECURRING_COLUMN_PRIORITY).getValue(),
      sheet.getRange(row, BacklogConfig.RECURRING_COLUMN_NOTES).getValue()
    );
  }


  /**
   * Inserts an empty recurring backlog item.
   */
  static insertRecurringItem() {
    const row = BacklogConfig.RECURRING_HEADER_ROWS + 1;
    const sheet = this.getRecurringBacklogSheet(row);
    sheet.insertRowBefore(row);
    sheet.setActiveRange(sheet.getRange(row, BacklogConfig.RECURRING_COLUMN_TITLE));
  }


  /**
   * Gets the cadence type of a recurring backlog item.
   */
  static getCadenceType(sheet, row) {
    return sheet.getRange(row, BacklogConfig.RECURRING_COLUMN_CADENCE_TYPE).getValue();
  }


  /**
   * Gets the cadence factor of a recurring backlog item.
   */
  static getCadenceFactor(sheet, row) {
    return sheet.getRange(row, BacklogConfig.RECURRING_COLUMN_CADENCE_FACTOR).getValue();
  }


  /**
   * Gets the recurring day of a recurring backlog item.
   */
  static getRecurringDay(sheet, row) {
    return sheet.getRange(row, BacklogConfig.RECURRING_COLUMN_RECURRING_DAY).getValue();
  }


  /**
   * Gets the next day on which a recurring backlog item is scheduled.
   */
  static getNextDate(sheet, row) {
    const date = sheet.getRange(row, BacklogConfig.RECURRING_COLUMN_NEXT_DATE).getValue();
    if (date instanceof Date) {
      return date;
    }
    return null;
  }


  /**
   * Sets the next day on which a recurring backlog item is scheduled.
   */
  static setNextDate(sheet, row, date) {
    return sheet.getRange(row, BacklogConfig.RECURRING_COLUMN_NEXT_DATE).setValue(date);
  }


  /**
   * Gets sheet with the recurring backlog items.
   */
  static getRecurringBacklogSheet() {
    return this.getSheetById(BacklogConfig.RECURRING_SHEET_ID);
  }


  /**
   * Finds the next day on which to schedule a recurring backlog item.
   * If lastDate is null, the earliest possible date in the future is
   * returned. If lastDate is provided, the earliest possible date after
   * lastDate is returned.
   */
  static findNextDate(cadenceType, cadenceFactor, day, lastDate) {
    
    if (cadenceType === BacklogConfig.CADENCE_TYPE_MONTHLY) {

      // Find month
      let date;
      let increment;
      if (lastDate == null) {
        // Go to next month
        date = new Date(Date.now() + BacklogConfig.UTC_TIMEZONE_OFFSET);
        increment = 1;
      } else {
        // Go given number months ahead of last date
        date = new Date(lastDate.getTime() + BacklogConfig.UTC_TIMEZONE_OFFSET);
        increment = cadenceFactor ? cadenceFactor : 0;
      }

      // Set to first day of month
      date.setUTCDate(1);
      date.setUTCHours(0, 0, 0);

      // Set month
      date.setUTCMonth(date.getUTCMonth() + increment);

      // Set day
      if (typeof day == 'string') {
        if (!this.tryIncrementDateToUTCDay(date, day)) {
          throw Error('Invalid day supplied.: ' + day);
        }
      } else {
        const maxDate = new Date(date.getTime());
        maxDate.setUTCMonth(maxDate.getUTCMonth() + 1);
        maxDate.setUTCDate(0);
        date.setUTCDate(Math.min(day, maxDate.getUTCDate()));
      }
      
      // Return date, converted back to specified timezone
      return new Date(date.getTime() - BacklogConfig.UTC_TIMEZONE_OFFSET);

    } else if (cadenceType === BacklogConfig.CADENCE_TYPE_WEEKLY) {
      
      let date;
      if (lastDate == null) {
        date = new Date(Date.now() + BacklogConfig.UTC_TIMEZONE_OFFSET);
      } else {
        date = new Date(lastDate.getTime() + BacklogConfig.UTC_TIMEZONE_OFFSET);
        date.setUTCDate(date.getUTCDate() + cadenceFactor*7);
      }

      // Set to beginning of day
      date.setUTCHours(0, 0, 0);

      // Only accepts day shortcuts (e.g. "Mon") and increment
      // to correct day of week
      if (typeof day == 'string') {
        if (!this.tryIncrementDateToUTCDay(date, day)) {
          throw Error('Invalid day supplied.: ' + day);
        }
      } else {
        throw Error('Invalid day supplied: ' + day);
      }
      
      // Return date, converted back to specified timezone
      return new Date(date.getTime() - BacklogConfig.UTC_TIMEZONE_OFFSET);

    } else {
      throw Error('Invalid cadence type supplied: ' + day);
    }
  }


  /**
   * Creates backlog items for recurring items that are due.
   */
  static scheduleRecurringBacklogItems() {
    const sheet = this.getRecurringBacklogSheet();
    const lastRow = sheet.getLastRow();
    for (let row = BacklogConfig.RECURRING_HEADER_ROWS + 1; row <= Math.min(lastRow, 1000); row++) {

      // Read info
      const cadenceFactor = this.getCadenceFactor(sheet, row);
      const cadenceType = this.getCadenceType(sheet, row);
      const day = this.getRecurringDay(sheet, row);

      // Find next date on which to schedule item
      let nextDate = this.getNextDate(sheet, row);
      if (nextDate == null) {
        nextDate = this.findNextDate(cadenceType, cadenceFactor, day, null);
        this.setNextDate(sheet, row, nextDate);
      }

      // Skip if next date has not yet come
      const now = new Date();
      if (now <= nextDate) {
        continue;
      }

      // Read item info from row
      let item = this.getRecurringBacklogItem(sheet, row);

      // If specified, run script to populate item
      if (item.title != null && /^[a-zA-Z_]+[a-zA-Z_0-9]*\(\);$/.test(item.title)) {
        item = eval(item.title);
        if (item == null) {
          continue;
        }
      }
      
      // Insert item
      this.insertBacklogItem(item);

      // Update next date
      nextDate = this.findNextDate(cadenceType, cadenceFactor, day, nextDate);
      this.setNextDate(sheet, row, nextDate);
    }
  }


  /**
   * Parses input in scheduling column and creates an event.
   */
  static scheduleEvents() {

    this.iterateBacklogRows((row) => {
      
      const sheet = this.getBacklogSheet();
      const value = sheet.getRange(row, BacklogConfig.COLUMN_SCHEDULED_TIME).getValue();
      
      // Skip if empty
      if (value == null) {
        return;
      }

      // Parse and validate input
      const regex = /^(?<length>[0-9]+)(?::\s+(?<title>\S.*))?$/;
      const match = value.toString().match(regex);
      if (match == null) {
        const ui = SpreadsheetApp.getUi();
        ui.alert('Invalid input', 'Enter time in minutes (for example "30") or time plus a title (for example "30: Do something")', ui.ButtonSet.OK);
        return;
      }
      const length = Number.parseInt(match.groups.length);
      let title = match.groups.title;

      // Determine day on which to schedule event
      const day = sheet.getRange(row, BacklogConfig.COLUMN_WAITING).getValue() || new Date();

      // If no title is provided, extract title from selected row
      if (title == null) {
        title = sheet.getRange(row, BacklogConfig.COLUMN_TITLE).getValue();  
      }

      // Add project to title
      const project = sheet.getRange(row, BacklogConfig.COLUMN_PROJECT).getValue();
      if (project != null) {
        title = `${title} (${project})`;
      }

      // Create event
      if (Scheduler.tryScheduleEvent(title, length, day)) {
        sheet.getRange(row, BacklogConfig.COLUMN_SCHEDULED_TIME).setValue(null);
      } else {
        const ui = SpreadsheetApp.getUi();
        ui.alert('Not enough time', `Could not schedule event "${title}"`, ui.ButtonSet.OK);
      }
    });
  }


  /**
   * Imports items from inbox sent to special email address (e.g. max+todo@example.com).
   */
  static importFromInbox() {
    InboxImporter.importFromInbox((title) => {
      const item = new BacklogItem(title, null, null, InboxImporterConfig.NOTES_TAG);
      this.insertBacklogItem(item);
    });
  }


  /**
   * Shows error as an alert.
   */
  static showErrorAlert(error) {
    const ui = SpreadsheetApp.getUi();
    ui.alert('Error', `${error}\n\n${error.stack}`, ui.ButtonSet.OK);
  }
  

  /**
   * Runs the given function, guarded by a document-level lock. If the lock
   * can't be acquired before the provided time-out, the function is
   * not run. Returns whether function was run.
   */
  static doWithDocumentLock(timeoutInMillis, f) {
    
    // Try to acquire document lock
    const lock = LockService.getDocumentLock();
    if (!lock.tryLock(timeoutInMillis)) {
      return false;
    }

    // Execute and release
    try {
      f();
      return true;
    } finally {
      lock.releaseLock();
    }
  }
}