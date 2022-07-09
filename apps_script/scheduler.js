class Scheduler {

  /**
   * Attempts to schedule an event with given title and length in minutes
   * in free calendar slots today.
   */
  static tryScheduleEvent(title, length, day, visibility=CalendarApp.Visibility.PRIVATE) {
    const startTime = this.findStartTimeForEvent(day, length);
    if (startTime) {
      const endTime = new Date(startTime.getTime() + length*60*1000);
      const event = this.getCalendar().createEvent(title, startTime, endTime);
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
    const minutesSinceStart = (date.getTime() - startOfDay.getTime()) / (1000*60);
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
    const isToday = this.getStartOfDay(new Date()).getTime() == this.getStartOfDay(day).getTime();
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
      const status = event.getMyStatus();;
      if (status != CalendarApp.GuestStatus.YES && status != CalendarApp.GuestStatus.MAYBE && status != CalendarApp.GuestStatus.OWNER) {
        continue;
      }

      // Mark corresponding slots as unavailable
      const startSlotIndex = this.getSlotIndex(event.getStartTime());
      const endSlotIndex = this.getSlotIndex(event.getEndTime());
      availableSlots.fill(false, startSlotIndex, endSlotIndex);
    }

    return availableSlots;
  }

}