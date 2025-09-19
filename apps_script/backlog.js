/**
 * Representation of a backlog item.
 */
class BacklogItem {

  /**
   * Creates a new backlog item.
   * 
   * @param {Object} data - The data for the backlog item.
   * @param {string} data.title - The title of the backlog item. May contain markdown links.
   * @param {string} data.project - The project of the backlog item.
   * @param {integer} data.priority - The priority of the backlog item.
   * @param {string} data.status - The status of the backlog item.
   * @param {string} data.notes - The notes of the backlog item. May contain markdown links.
   * @param {Date} data.waitingDate - The waiting date of the backlog item.
   * @param {integer} data.scheduledTime - The scheduled time of the backlog item in minutes.
   */
  constructor({
    title,
    project,
    priority,
    status,
    notes,
    waitingDate,
    scheduledTime,
  }) {
    this.title = title;
    this.project = project;
    this.priority = priority;
    this.status = status;
    this.notes = notes;
    this.waitingDate = waitingDate;
    this.scheduledTime = scheduledTime;
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
      if (column === BacklogConfig.COLUMN_COMPLETED) {
        this.deleteCompletedItems();
      } else if (column === BacklogConfig.COLUMN_PROJECT) {
        this.setDefaultProjectIfNeeded(sheet, row);
      } else if (column === BacklogConfig.COLUMN_WAITING) {
        this.setWaiting(sheet, row);
        this.convertWaitingDateIfNeeded(sheet, row);
      } else if (column === BacklogConfig.COLUMN_STATUS) {
        this.clearWaitingDateIfNeeded(sheet, row, e.oldValue, e.value);
      }

    } catch (error) {

      // Show error prompt
      this.showErrorAlert(error);
    }
  }


  /**
   * Function that is to be called from trigger function onSelectionChange(e).
   */
  static handleOnSelectionChange(_) {
    try {
      this.showSetToNextDialogIfNeeded();
    } catch (error) {
      this.showErrorAlert(error);
    }
  }


  /**
   * Syncs backlog items with updated events in calendar.
   */
  static handleCalendarUpdates() {

    // Retrieve updated tags.
    const tags = Scheduler.getUpdatedEventTags();
    if (tags.length === 0) {
        return;
    }

    this.doWithDocumentLock(() => {

      const sheet = this.getBacklogSheet();

      for (const tag of tags) {

        // Retrieve row for tag.
        const row = this.findRowByEventTag(tag);

        // Skip if no backlog item is associated with event.
        if (row === null) {
          console.error(`No backlog item found for event with tag ${tag}.`);
          continue;
        }

        // Retrieve all metadata for row, including metadata corresponding to other tags.
        // There may be multiple tags if a backlog item has been scheduled multiple times.
        const allMetadata = this.getRowDeveloperMetadata(sheet, BacklogConfig.SCHEDULED_EVENT_TAG_METADATA_KEY);
        const metadataForRow = allMetadata.filter((metadata) => metadata.getLocation().getRow().getRowIndex() === row);

        // Retrieve the earliest event for row, including events from now until 30 days in the future.
        const now = new Date();
        const end = new Date(now.getTime());
        end.setDate(end.getDate() + 30);
        const allEvents = metadataForRow
            .map((metadata) => Scheduler.getEarliestEventWithTag(metadata.getValue(), now, end))
            .filter((event) => event !== null)
            .sort((a, b) => a.getStartTime() - b.getStartTime());
        const earliestEvent = allEvents.length > 0 ? allEvents[0] : null;

        if (!earliestEvent) {
          console.error(`No event found for tag ${tag}.`);
          continue;
        }
        
        // Determine if earliest start date is today.
        const earliestStartDate = earliestEvent.getStartTime();
        const calendarTimeZone = TimeZones.getCalendarTimeZone();
        const earliestStartDateUTC = TimeZones.convert(earliestStartDate, calendarTimeZone, TimeZones.UTC());
        const nowUTC = TimeZones.convert(now, calendarTimeZone, TimeZones.UTC());
        const isToday = this.isSameUTCDate(earliestStartDateUTC, nowUTC);
        
        // Set status and waiting date of corresponding backlog item according to event.
        let waitingDate, status;
        if (isToday) {
          status = BacklogConfig.STATUS_NEXT;
          waitingDate = null;
        } else {
          status = BacklogConfig.STATUS_WAITING;

          // Convert waiting date to spreadsheet time zone.
          const spreadsheetTimeZone = TimeZones.getSpreadsheetTimeZone();
          waitingDate = TimeZones.convert(earliestStartDate, calendarTimeZone, spreadsheetTimeZone);
        }
        sheet.getRange(row, BacklogConfig.COLUMN_STATUS).setValue(status);
        sheet.getRange(row, BacklogConfig.COLUMN_WAITING).setValue(waitingDate);
      }
    });
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
   * Returns a list of unique project names.
   */
  static getProjectNames() {
    const sheet = this.getBacklogSheet();
    const range = sheet.getRange(
      BacklogConfig.HEADER_ROWS + 1,
      BacklogConfig.COLUMN_PROJECT,
      sheet.getLastRow() - BacklogConfig.HEADER_ROWS
    );

    const values = range.getValues();
    let projectNames = values.flat();

    // Trim whitespace and filter out empty values.
    projectNames = projectNames
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    // Remove duplicates.
    projectNames = [...new Set(projectNames)]

    return projectNames;
  }


  /**
   * Inserts new empty item at the top.
   */
  static insertEmptyBacklogItem() {
    this.insertBacklogItem(null, true);
  }


  /**
   * Inserts new item at the top.
   */
  static insertBacklogItem(item, activate = false) {
    this.doWithDocumentLock(() => {

      // Insert row and format.
      const sheet = this.getBacklogSheet();
      const row = BacklogConfig.HEADER_ROWS + 1;
      sheet.insertRowBefore(row);
      sheet.getRange(row, BacklogConfig.COLUMN_WAITING).setNumberFormat(BacklogConfig.WAITING_DATE_FORMAT);

      // Populate info, if provided.
      if (item != null) {

        // Set cell values and metadata.
        if (item.title) { 
          const richTitle = this.makeRichTextWithLinks(item.title);
          sheet.getRange(row, BacklogConfig.COLUMN_TITLE).setRichTextValue(richTitle);
        }
        if (item.notes) {
          const richNotes = this.makeRichTextWithLinks(item.notes);
          sheet.getRange(row, BacklogConfig.COLUMN_NOTES).setRichTextValue(richNotes);
        }
        if (item.project) {
          sheet.getRange(row, BacklogConfig.COLUMN_PROJECT).setValue(item.project);
        }
        if (item.priority !== null && item.priority !== undefined) {
          sheet.getRange(row, BacklogConfig.COLUMN_PRIORITY).setValue(item.priority);
        }
        if (item.waitingDate) {
          sheet.getRange(row, BacklogConfig.COLUMN_WAITING).setValue(item.waitingDate);
        }
        if (item.status) {
          sheet.getRange(row, BacklogConfig.COLUMN_STATUS).setValue(item.status);
        }
        if (item.scheduledTime !== null && item.scheduledTime !== undefined) {
          sheet.getRange(row, BacklogConfig.COLUMN_SCHEDULED_TIME).setValue(item.scheduledTime);

          // Mark item as automatically schedulable if scheduled time is set.
          const key = BacklogConfig.AUTOMATICALLY_SCHEDULABLE_DEVELOPER_METADATA_KEY;
          this.setDeveloperMetadata(sheet, row, key, '');
        }
      }

      // Activate title cell if desired.
      if (activate) {
        sheet.getRange(row, BacklogConfig.COLUMN_TITLE).activate();
      }
    });
  }


  /**
   * Sets project ot the default one if the shortcut was entered.
   */
  static setDefaultProjectIfNeeded(sheet, row) {
    this.doWithDocumentLock(() => {
      const range = sheet.getRange(row, BacklogConfig.COLUMN_PROJECT);
      const project = range.getValue();
      if (project === BacklogConfig.DEFAULT_PROJECT_SHORTCUT) {
        range.setValue(BacklogConfig.DEFAULT_PROJECT);
      } 
    });
  }


  /**
   * Deletes completed items.
   */
  static deleteCompletedItems() {
    this.doWithDocumentLock(() => {
      this
        .getNonEmptyBacklogRowsInColumn(BacklogConfig.COLUMN_COMPLETED)
        .reverse()
        .forEach(([row, value]) => {
          if (value === true) {
            this.getBacklogSheet().deleteRow(row);
          }
        });
    });
  }


  /**
   * Sets status of waiting items that have become due to 'Next'.
   */
  static setWaitingItemsToNext() {
    this.doWithDocumentLock(() => {

      const sheet = this.getBacklogSheet();
      
      // Find end of day.
      let endOfDay = TimeZones.convert(new Date(), TimeZones.getCalendarTimeZone(), TimeZones.UTC());
      endOfDay.setUTCHours(23, 59, 59, 999);
      endOfDay = TimeZones.convert(endOfDay, TimeZones.UTC(), TimeZones.getCalendarTimeZone());

      const updatedItemDescriptions = [];

      // Iterate through all waiting dates.
      for (const [row, waitingDate] of this.getNonEmptyBacklogRowsInColumn(BacklogConfig.COLUMN_WAITING)) {

        const isDate = waitingDate instanceof Date;
        const isPastDate = isDate && waitingDate.getTime() <= endOfDay.getTime();

        // Clear waiting date if it is in the past.
        if (isPastDate) {
          sheet.getRange(row, BacklogConfig.COLUMN_WAITING).clearContent();
        }

        // Set status to 'Next' if waiting date is in the past or not a date.
        // Including non-date values allows user to spot and correct mistakes in waiting date.
        if (isPastDate || !isDate) {
          
          const statusRange = sheet.getRange(row, BacklogConfig.COLUMN_STATUS);
          const status = statusRange.getValue();
          if (status !== BacklogConfig.STATUS_NEXT) {

            // Set status to 'Next'.
            const statusRange = sheet.getRange(row, BacklogConfig.COLUMN_STATUS);
            statusRange.setValue(BacklogConfig.STATUS_NEXT);
            
            // Mark item for later display to user.
            const title = sheet.getRange(row, BacklogConfig.COLUMN_TITLE).getValue();
            const project = sheet.getRange(row, BacklogConfig.COLUMN_PROJECT).getValue();
            updatedItemDescriptions.push(`${title} (${project})`);
          }
        }
      }

      // Queue descriptions for later display to user.
      if (updatedItemDescriptions.length > 0) {
        this.queueNextItemDescriptions(updatedItemDescriptions);
      }
    });
  }


  /**
   * Sets status to waiting in given row.
   */
  static setWaiting(sheet, row) {
    this.doWithDocumentLock(() => {
      const range = sheet.getRange(row, BacklogConfig.COLUMN_STATUS);
      range.setValue(BacklogConfig.STATUS_WAITING);
    });
  }


  /**
   * Clears waiting date in given row if status changed from waiting to something else.
   */
  static clearWaitingDateIfNeeded(sheet, row, oldStatus, newStatus) {
    this.doWithDocumentLock(() => {
      if (oldStatus === BacklogConfig.STATUS_WAITING && newStatus !== BacklogConfig.STATUS_WAITING) {
        const range = sheet.getRange(row, BacklogConfig.COLUMN_WAITING);
        range.clearContent();
      }
    });
  }


  /**
   * Converts a value entered in the waiting column (e.g. "Mon" or "10") if needed.
   */
  static convertWaitingDateIfNeeded(sheet, row) {
    this.doWithDocumentLock(() => {
        
      // Obtain original value. Don't use event object's 'value' since it may be passed as
      // an integer, not a date.
      const originalValue = this.getBacklogSheet().getRange(row, BacklogConfig.COLUMN_WAITING).getValue();

      // Increment year if value is a date in the past.
      let convertedDate = null;
      if (originalValue instanceof Date && originalValue < Date.now()) {
        const spreadsheetTimeZone = TimeZones.getSpreadsheetTimeZone();
        convertedDate = TimeZones.convert(originalValue, spreadsheetTimeZone, TimeZones.UTC());
        convertedDate.setUTCFullYear(convertedDate.getUTCFullYear() + 1);
        convertedDate = TimeZones.convert(convertedDate, TimeZones.UTC(), spreadsheetTimeZone);
      } else {
        convertedDate = this.convertDayShortcutToDate(originalValue);
      }
      
      // Set value if conversion was successful.
      if (convertedDate) {
        const range = sheet.getRange(row, BacklogConfig.COLUMN_WAITING);
        range.setValue(convertedDate);
        range.setNumberFormat(BacklogConfig.WAITING_DATE_FORMAT);
      }
    });
  }


  /**
   * Converts a day shortcut (e.g. "Mon" or "10") to a date.
   * Returns null if conversion fails.
   */
  static convertDayShortcutToDate(dayShortcut) {
    
    // Determine the earliest possible date (tomorrow) in UTC.
    const earliestPossibleDateUTC = TimeZones.convert(new Date(), TimeZones.getSpreadsheetTimeZone(), TimeZones.UTC());
    earliestPossibleDateUTC.setUTCDate(earliestPossibleDateUTC.getUTCDate() + 1);

    const spreadsheetTimeZone = TimeZones.getSpreadsheetTimeZone();

    // Attempt to parse integer-based shortcut (e.g. "10").
    if (/^[1-9][0-9]*$/.test(dayShortcut)) {
        
      // Add days.
      const addDays = Number.parseInt(dayShortcut);
      const convertedDate = new Date(earliestPossibleDateUTC);
      convertedDate.setUTCDate(convertedDate.getUTCDate() + addDays - 1);
      return TimeZones.convert(convertedDate, TimeZones.UTC(), spreadsheetTimeZone);
    }
    
    // Attempt to parse shortcut (e.g. "Mon").
    if (typeof dayShortcut === 'string') {
      const incrementedDate = new Date(earliestPossibleDateUTC);
      if (this.tryIncrementDateToUTCDay(incrementedDate, dayShortcut)) {
        return TimeZones.convert(incrementedDate, TimeZones.UTC(), spreadsheetTimeZone);
      }
      return null;
    }

    return null;
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
    
    // Check if dialogs have been suspended
    const properties = PropertiesService.getDocumentProperties();
    const suspendedTime = properties.getProperty(BacklogConfig.SET_TO_NEXT_DIALOGS_SUSPENDED_TIME_PROPERTY_KEY);
    if (suspendedTime != null && Date.now() < JSON.parse(suspendedTime)) {
      return;
    }

    // Suspend dialogs for some time to avoid showing multiple instances
    properties.setProperty(
        BacklogConfig.SET_TO_NEXT_DIALOGS_SUSPENDED_TIME_PROPERTY_KEY,
        JSON.stringify(Date.now() + 30 * 1000)
    );

    // Show UI
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
        `${descriptions.length} waiting ${descriptions.length === 1 ? 'item' : 'items'} moved to '${BacklogConfig.STATUS_NEXT}'`,
        descriptions.join('\n'),
        ui.ButtonSet.OK);

    // Dequeue descriptions
    if (response === ui.Button.OK) {
      this.dequeueNextItemDescriptions();
    }
  }


  /**
   * Returns all non-empty rows in the given column, with their row numbers and values.
   */
  static getNonEmptyBacklogRowsInColumn(column) {
    const sheet = this.getBacklogSheet();
    const lastRow = sheet.getLastRow();
    const range = sheet.getRange(BacklogConfig.HEADER_ROWS + 1, column, Math.min(lastRow, 1000) - BacklogConfig.HEADER_ROWS);
    const values = range.getValues();
    return values
        .map((values, i) => {
          return [BacklogConfig.HEADER_ROWS + i + 1, values[0]];
        })
        .filter(([_, value]) => {
          return value !== '';
        });
  }


  /**
   * Increments a given date to the next date corresponing to the supplied day shortcut
   * (e.g. "Mon" or "Mon+3"). Returns whether the supplied shortcut is valid.
   */
  static tryIncrementDateToUTCDay(date, dayShortcut) {

    // Parse shortcut if it has the format "XXX+n" where "XXX" is a three-letter day
    // and "n" the number of weeks to add.
    const regex = /^([A-Za-z]{3})\+(\d+)$/;
    const match = dayShortcut.match(regex);
    const dayName = match ? match[1] : dayShortcut;
    const weeksToAdd = match ? Number.parseInt(match[2]) : 0;
    
    // Get day of week.
    const dayOfWeek = this.getDayFromName(dayName);
    if (dayOfWeek == null) {
        return false;
    }

    // Find days until next occurrence of day.
    let increment = dayOfWeek - date.getUTCDay();
    if (increment < 0) {
      increment += 7;
    }

    // Add weeks.
    increment += weeksToAdd * 7;

    // Increment date.
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
    return new BacklogItem({
      title: sheet.getRange(row, BacklogConfig.RECURRING_COLUMN_TITLE).getValue(),
      project: sheet.getRange(row, BacklogConfig.RECURRING_COLUMN_PROJECT).getValue(),
      priority: sheet.getRange(row, BacklogConfig.RECURRING_COLUMN_PRIORITY).getValue(),
      status: BacklogConfig.STATUS_NEXT,
      notes: sheet.getRange(row, BacklogConfig.RECURRING_COLUMN_NOTES).getValue(),
    });
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
      let dateUTC;
      let increment;
      if (lastDate == null) {
        // Go to next month
        dateUTC = TimeZones.convert(new Date(), TimeZones.getCalendarTimeZone(), TimeZones.UTC());
        increment = 1;
      } else {
        // Go given number months ahead of last date
        dateUTC = TimeZones.convert(lastDate, TimeZones.getCalendarTimeZone(), TimeZones.UTC());
        increment = cadenceFactor ? cadenceFactor : 0;
      }

      // Set to first day of month
      dateUTC.setUTCDate(1);
      dateUTC.setUTCHours(0, 0, 0);

      // Set month
      dateUTC.setUTCMonth(dateUTC.getUTCMonth() + increment);

      // Set day
      if (typeof day === 'string') {
        if (!this.tryIncrementDateToUTCDay(dateUTC, day)) {
          throw Error('Invalid day supplied.: ' + day);
        }
      } else {
        const maxDateUTC = new Date(dateUTC.getTime());
        maxDateUTC.setUTCMonth(maxDateUTC.getUTCMonth() + 1);
        maxDateUTC.setUTCDate(0);
        dateUTC.setUTCDate(Math.min(day, maxDateUTC.getUTCDate()));
      }
      
      // Return date, converted back to current time zone.
      return TimeZones.convert(dateUTC, TimeZones.UTC(), TimeZones.getCalendarTimeZone());

    } else if (cadenceType === BacklogConfig.CADENCE_TYPE_WEEKLY) {
      
      let dateUTC;
      if (lastDate == null) {
        dateUTC = TimeZones.convert(new Date(), TimeZones.getCalendarTimeZone(), TimeZones.UTC());
      } else {
        dateUTC = TimeZones.convert(lastDate, TimeZones.getCalendarTimeZone(), TimeZones.UTC());
        dateUTC.setUTCDate(dateUTC.getUTCDate() + cadenceFactor*7);
      }

      // Set to beginning of day
      dateUTC.setUTCHours(0, 0, 0);

      // Only accept day shortcuts (e.g. "Mon") and increment
      // to correct day of week
      if (typeof day == 'string') {
        if (!this.tryIncrementDateToUTCDay(dateUTC, day)) {
          throw Error('Invalid day supplied.: ' + day);
        }
      } else {
        throw Error('Invalid day supplied: ' + day);
      }
      
      // Return date, converted back to calendar time zone.
      return TimeZones.convert(dateUTC, TimeZones.UTC(), TimeZones.getCalendarTimeZone());

    } else {
      throw Error('Invalid cadence type supplied: ' + day);
    }
  }


  /**
   * Creates backlog items for recurring items that are due.
   */
  static scheduleRecurringItems() {
    const sheet = this.getRecurringBacklogSheet();
    const lastRow = sheet.getLastRow();
    for (let row = BacklogConfig.RECURRING_HEADER_ROWS + 1; row <= Math.min(lastRow, 1000); row++) {

      // Read info.
      const cadenceFactor = this.getCadenceFactor(sheet, row);
      const cadenceType = this.getCadenceType(sheet, row);
      const day = this.getRecurringDay(sheet, row);

      // Find next date on which to schedule item.
      let nextDate = this.getNextDate(sheet, row);
      if (nextDate == null) {
        nextDate = this.findNextDate(cadenceType, cadenceFactor, day, null);
        this.setNextDate(sheet, row, nextDate);
      }

      // Skip if next date has not yet come.
      const now = new Date();
      if (now <= nextDate) {
        continue;
      }

      // Insert item if not paused.
      if (!BacklogConfig.SCHEDULE_RECURRING_ITEMS_PAUSED) {
        
        // Read item info from row.
        let item = this.getRecurringBacklogItem(sheet, row);

        // If specified, run script to populate item.
        if (item.title != null && /^[a-zA-Z_]+[a-zA-Z_0-9]*\(\);$/.test(item.title)) {
          item = eval(item.title);
          if (item == null) {
            continue;
          }
        }
        
        // Insert item.
        this.insertBacklogItem(item);
      }

      // Find and set date for next instance.
      nextDate = this.findNextDate(cadenceType, cadenceFactor, day, nextDate);
      this.setNextDate(sheet, row, nextDate);
    }
  }


  /**
   * Parses input in scheduling column and creates an event for each input value.
   * Returns true if no errors occurred.
   */
  static scheduleEvents(automaticallySchedulableOnly, showErrors) {

    let hasErrors = false;

    // Array with all events to schedule.
    const eventsToSchedule = [];
    const titleKey = 'title';
    const lengthKey = 'length';
    const dateKey = 'date';
    const tagKey = 'tag';
    const automaticallySchedulableMetadataKey = 'automaticallySchedulableMetadata';

    this.doWithDocumentLock(() => {

      const sheet = this.getBacklogSheet();

      // Collect events to schedule but don't schedule them yet. Instead, we first process
      // all rows and tag them. This is done, so we can retrieve and update the correct row later,
      // even if the row has been moved in the meantime.
      for (const [row, value] of this.getNonEmptyBacklogRowsInColumn(BacklogConfig.COLUMN_SCHEDULED_TIME)) {

        const event = {};

        // Determine and validate length.
        const length = Number.parseInt(value.toString());
        if (Number.isNaN(length)) {
          if (showErrors) {
            const ui = SpreadsheetApp.getUi();
            ui.alert('Invalid input', 'Enter time in minutes (for example "30")', ui.ButtonSet.OK);
          }
          hasErrors = true;
          continue;
        }
        event[lengthKey] = length;

        // Retrieve metadata for automatic scheduling.
        const automaticallySchedulableMetadata = this.getDeveloperMetadata(
          sheet,
          row,
          BacklogConfig.AUTOMATICALLY_SCHEDULABLE_DEVELOPER_METADATA_KEY
        );
        event[automaticallySchedulableMetadataKey] = automaticallySchedulableMetadata;
        
        // If desired, schedule only items that have been marked as automatically schedulable.
        if (automaticallySchedulableOnly && !automaticallySchedulableMetadata) {
            continue;
        }

        // Determine day on which to schedule event.
        let date = sheet.getRange(row, BacklogConfig.COLUMN_WAITING).getValue();
        if (date) {
          // Convert date from spreadsheet time zone to calendar time zone.
          // When parsing the date string from the cell, Google Sheets uses the spreadsheet
          // time zone, but we want the calendar time zone to be used instead.
          const spreadsheetTimeZone = TimeZones.getSpreadsheetTimeZone();
          date = TimeZones.convert(date, spreadsheetTimeZone, TimeZones.getCalendarTimeZone());
        } else {
          // If no date is provided, use today.
          date = new Date();
        }
        event[dateKey] = date;

        // Determine title.
        let title = sheet.getRange(row, BacklogConfig.COLUMN_TITLE).getValue();
        const project = sheet.getRange(row, BacklogConfig.COLUMN_PROJECT).getValue();
        if (project) {
          title = `${title} (${project})`;
        }
        event[titleKey] = title;

        // Create tag and immediately set it on row.
        const tag = Scheduler.newEventTag();
        this.setDeveloperMetadata(sheet, row, BacklogConfig.SCHEDULED_EVENT_TAG_METADATA_KEY, tag);
        event[tagKey] = tag;

        // Add event to list.
        eventsToSchedule.push(event);
      }
    });

    // Schedule events.
    for (const event of eventsToSchedule) {

      const {
        [titleKey]: title,
        [lengthKey]: length,
        [dateKey]: date,
        [tagKey]: tag,
        [automaticallySchedulableMetadataKey]: automaticallySchedulableMetadata
      } = event;

      const success = Scheduler.tryScheduleEvent(tag, title, length, date);

      if (!success) {
        if (showErrors) {
          const ui = SpreadsheetApp.getUi();
          ui.alert('Not enough time', `There is not enough free time in your calendar to schedule "${title}".`, ui.ButtonSet.OK);
        }
        hasErrors = true;
        continue;
      }

      this.doWithDocumentLock(() => {
        
        // Mark event as scheduled. The row is retrieved by tag to avoid interference from any row
        // changes that may have occurred in the meantime.
        const row = this.findRowByEventTag(tag);
        if (row) {
          const sheet = this.getBacklogSheet();
          sheet.getRange(row, BacklogConfig.COLUMN_SCHEDULED_TIME).setValue(null);
        }
        automaticallySchedulableMetadata?.remove();
      });
    }

    return !hasErrors;
  }


  /**
   * Imports items from inbox sent to special email address (e.g. max+todo@example.com).
   * Does nothing if inbox import is disabled.
   */
  static importFromInbox() {
    if (!InboxImporterConfig.EMAIL_ADDRESS) {
      return;
    }
    InboxImporter.importFromInbox((title) => {
      const item = new BacklogItem({ title, notes: InboxImporterConfig.NOTES_TAG });
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
   * Returns developer metadata for a row.
   */
  static getDeveloperMetadata(sheet, row, key) {
    return sheet
        .getRange(`${row}:${row}`) // needs to be entire row
        .getDeveloperMetadata()
        .find((d) => d.getKey() === key);
  }


  /**
   * Returns all developer metadata associated with the given key and any row.
   */
  static getRowDeveloperMetadata(sheet, key) {
    return sheet
        .createDeveloperMetadataFinder()
        .withKey(key)
        .withLocationType(SpreadsheetApp.DeveloperMetadataLocationType.ROW)
        .find();
  }


  /**
   * Finds the row for a given event tag.
   */
  static findRowByEventTag(tag) {
    const sheet = this.getBacklogSheet();
    const metadata = this.getRowDeveloperMetadata(sheet, BacklogConfig.SCHEDULED_EVENT_TAG_METADATA_KEY);
    const metadataForTag = metadata.find((metadata) => metadata.getValue() === tag);
    return metadataForTag ? metadataForTag.getLocation().getRow().getRowIndex() : null;
  }


  /**
   * Sets developer metadata on a row.
   */
  static setDeveloperMetadata(sheet, row, key, value) {
    sheet
        .getRange(`${row}:${row}`) // needs to be entire row
        .addDeveloperMetadata(key, value, SpreadsheetApp.DeveloperMetadataVisibility.DOCUMENT);
  }


  /**
   * Returns true if two dates correspond to the same day in UTC.
   */
  static isSameUTCDate(date1, date2) {
    return date1.getUTCFullYear() === date2.getUTCFullYear()
        && date1.getUTCMonth() === date2.getUTCMonth()
        && date1.getUTCDate() === date2.getUTCDate();
  }


  /**
   * Performs the given function with a document lock.
   * This should be used for all operations that alter the order or content of rows or cells.
   */
  static doWithDocumentLock(f, timeout = 30*1000 /* 30 seconds */) {
    const lock = LockService.getDocumentLock();
    lock.waitLock(timeout);
    try {
      f();
    } catch (error) {
      throw error;
    } finally {
      lock.releaseLock();
    }
  }

/**
 * Parses links contained in given markdown text and returns `RichTextValue` with links.
 * @param {string} markdownText Text with markdown links
 */
  static makeRichTextWithLinks(markdownText) {

    // Parse links.
    const matches = [...markdownText.matchAll(/(?<markdown>\[(?<text>[^\[]+)\]\((?<url>[^\]\(]*)\))/g)];
    const links = [];
    let text = markdownText;
    let removedCharacters = 0;
    for (const match of matches) {
      const { markdown, text: linkText, url } = match.groups;
      const index = match.index - removedCharacters;
      text = text.substring(0, index) + linkText + text.substring(index + markdown.length);
      removedCharacters += markdown.length - linkText.length;
      links.push({ startOffset: index, endOffsetInclusive: index + linkText.length, url: url });
    }

    // Make rich text.
    const richText = SpreadsheetApp.newRichTextValue();
    richText.setText(text);
    for (const link of links) {
      richText.setLinkUrl(link.startOffset, link.endOffsetInclusive, link.url);
    }
    return richText.build();
  }
}