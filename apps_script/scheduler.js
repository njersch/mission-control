class Scheduler {

  /**
   * Attempts to schedule an event with given title and length in minutes
   * in free calendar slots today.
   */
  static tryScheduleEvent(tag, title, length, day, visibility=CalendarApp.Visibility.PRIVATE) {
    const startTime = this.findStartTimeForEvent(day, length);
    if (startTime) {
      const endTime = new Date(startTime.getTime() + length*60*1000);
      const event = this.getCalendar().createEvent(title, startTime, endTime);
      this.setEventTag(event, tag);
      event.setVisibility(visibility);
      event.setColor(SchedulerConfig.COLOR);
      return true;
    } else {
      return false;
    }
  }


  /**
   * Returns the calendar to use for scheduling.
   */
  static getCalendar() {
    return CalendarApp.getCalendarById(SchedulerConfig.CALENDAR_ID);
  }


  /**
   * Returns a date object corresponding the start of day as specified by SchedulerConfig.DAY_START.
   */
  static getStartOfDay(day) {
    const startOfDayHours = Math.floor(SchedulerConfig.DAY_START);
    const startOfDayMinutes = Math.round((SchedulerConfig.DAY_START - startOfDayHours) * 60);
    let startOfDay = new Date(day.getTime() + SchedulerConfig.UTC_TIMEZONE_OFFSET);
    startOfDay.setUTCHours(startOfDayHours, startOfDayMinutes, 0, 0);
    return new Date(startOfDay.getTime() - SchedulerConfig.UTC_TIMEZONE_OFFSET);
  }

  /**
   * Returns a slot index corresponding to given date object.
   */
  static getSlotIndex(date, rounder=Math.round) {
    
    const startOfDay = this.getStartOfDay(date);

    // Calculate minutes since start time
    const minutesSinceStart = Math.round((date.getTime() - startOfDay.getTime()) / (1000*60));
    const slotIndex = rounder(minutesSinceStart / SchedulerConfig.SLOT_LENGTH);
    return slotIndex;
  }

  /**
   * Returns a date object corresponding to the start of the given slot.
   */
  static getTimeForSlotIndex(day, slotIndex) {
    const startOfDay = this.getStartOfDay(day);
    return new Date(startOfDay.getTime() + slotIndex * SchedulerConfig.SLOT_LENGTH*60*1000);
  }


  /**
   * Returns next available start time on given day for event of given length in minutes.
   * Returns null if there is no availability on given day.
   */
  static findStartTimeForEvent(day, length) {

    // Determine free slots on given day
    const availableSlots = this.getAvailableSlotsForDay(day);

    // Determine first slot on given day that hasn't yet begun
    const isToday = this.getStartOfDay(new Date()).getTime() === this.getStartOfDay(day).getTime();
    const firstNotStartedSlot = isToday ? this.getSlotIndex(day, Math.ceil) : 0;

    // Find first possible start time
    const neededSlots = Math.ceil(length / SchedulerConfig.SLOT_LENGTH);
    let freeConsecutiveSlots = 0;
    for (let i = firstNotStartedSlot; i < availableSlots.length; i++) {
      
      // Not enough free consecutive slots and this one is not free either,
      // so start looking for free slots anew
      if (!availableSlots[i]) {
        freeConsecutiveSlots = 0;
        continue;
      }
      
      // Check if enough free consecutive slots have been found
      if (++freeConsecutiveSlots >= neededSlots) {
        return this.getTimeForSlotIndex(day, i - neededSlots + 1);
      }
    }
    
    // No free slot found
    return null;
  }


  /**
   * Returns an array with booleans indicating which slots between SchedulerConfig.DAY_START
   * SchedulerConfig.DAY_END are free.
   */
  static getAvailableSlotsForDay(day) {
    
    const slotCount = (SchedulerConfig.DAY_END - SchedulerConfig.DAY_START)*60 / SchedulerConfig.SLOT_LENGTH;
    const availableSlots = Array(slotCount).fill(true);

    const events = this.getCalendar().getEventsForDay(day);
    for (const event of events) {

      // Ignore all-day events
      if (event.isAllDayEvent()) {
        continue;
      }

      // Ignore unconfirmed meetings
      const status = event.getMyStatus();
      if (status !== CalendarApp.GuestStatus.YES && status !== CalendarApp.GuestStatus.MAYBE && status !== CalendarApp.GuestStatus.OWNER) {
        continue;
      }

      // Mark corresponding slots as unavailable
      const endSlotIndex = this.getSlotIndex(event.getEndTime(), Math.ceil);
      if (endSlotIndex <= 0) {
        continue;
      }
      let startSlotIndex = this.getSlotIndex(event.getStartTime(), Math.floor);
      availableSlots.fill(false, Math.max(0, startSlotIndex), endSlotIndex);
    }

    return availableSlots;
  }


  /**
   * Retrieves tags for updated events from calendar.
   */
  static getUpdatedEventTags() {
    const properties = PropertiesService.getDocumentProperties();

    const options = {
      maxResults: 100,
      singleEvents: true,
    };

    // Sync events from last sync token, or from now to 7 days from now
    // for the initial sync
    const syncToken = properties.getProperty(SchedulerConfig.CALENDAR_SYNC_TOKEN_PROPERTY_KEY);
    if (syncToken) {
      options.syncToken = syncToken;
    } else {
      const minDate = new Date();
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 7);
      options.timeMin = minDate.toISOString();
      options.timeMax = maxDate.toISOString();
    }

    // Retrieve events, one page at a time
    const allTags = new Set();
    let eventsBatch;
    let pageToken = undefined;
    do {
      try {
        options.pageToken = pageToken;
        eventsBatch = Calendar.Events.list(SchedulerConfig.CALENDAR_ID, options);
      } catch (e) {

        // Check to see if the sync token was invalidated by the server;
        // if so, perform a full sync instead
        if (e.message.endsWith('Sync token is no longer valid, a full sync is required.')) {
          properties.deleteProperty(SchedulerConfig.CALENDAR_SYNC_TOKEN_PROPERTY_KEY);
          return this.getUpdatedEventTags();
        } else {
          throw new Error(e.message);
        }
      }

      // Collect tags from events
      if (eventsBatch.items) {
        eventsBatch.items
            .map(event => this.getEventTag(event))
            .filter(tag => tag)
            .forEach(tag => allTags.add(tag));
      }

      pageToken = eventsBatch.nextPageToken;
    } while (pageToken);

    // Store the sync token for the next sync
    properties.setProperty(SchedulerConfig.CALENDAR_SYNC_TOKEN_PROPERTY_KEY, eventsBatch.nextSyncToken);

    return Array.from(allTags);
  }


  /**
   * Returns the earliest event with the given tag and start time in the given time range, or null if no such event
   * exists.
   */
  static getEarliestEventWithTag(tag, start, end) {

    // Get all events with the given tag in the given time range
    let events = this.getCalendar().getEvents(start, end, {search: tag});

    // Filter out events that don't have the given tag
    events = events.filter(event => this.getEventTag(event) === tag);

    // Sort events by start time
    events = events.sort((a, b) => a.getStartTime() - b.getStartTime());

    // Return the earliest event
    return events.length > 0 ? events[0] : null;
  }


  /**
   * Returns the tag for an event, or null if the event has no tag.
   */
  static getEventTag(event) {
    // Get the description of the event, starting with the advanced API and falling back to the basic API
    const description = event.description || event.getDescription();

    // Extract the tag from the description
    const match = description && description.match(SchedulerConfig.TAG_REGEX);
    return match ? match[0] : null;
  }


  /**
   * Sets the tag for an event.
   */
  static setEventTag(event, tag) {
    event.setDescription(tag);
  }


  /**
   * Returns a new tag for an event.
   */
  static newEventTag() {
    let identifier = '';
    const base = SchedulerConfig.TAG_BASE;
    for (let i = 0; i < SchedulerConfig.TAG_LENGTH; i++) {
      identifier += base.charAt(Math.floor(Math.random() * (base.length - 1)));
    }
    return `${SchedulerConfig.TAG_PREFIX}${identifier}`;
  }
}