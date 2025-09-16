class TimeZones {

  /**
   * Returns a date that has the same date components in the `toTimeZone`
   * as the provided date in the `fromTimeZone`.
   */
  static convert(date, fromTimeZone, toTimeZone) {
    const format = 'yyyy-MM-dd HH:mm:ss.SSS';
    const formattedDate = Utilities.formatDate(date, fromTimeZone, format);
    const convertedDate = new Date(Utilities.parseDate(formattedDate, toTimeZone, format));
    return convertedDate;
  }


  /**
   * Returns the UTC time zone.
   */
  static UTC() {
    return 'GMT';
  }


  /**
   * Returns the active spreadsheet's time zone.
   */
  static getSpreadsheetTimeZone() {
    return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  }


  /**
   * Return the Apps Script project's time zone.
   */
  static getScriptTimeZone() {
    return Session.getScriptTimeZone();
  }


  /**
   * Returns the last synced calendar time zone.
   * Falls back to the Apps Script project's time zone if no calendar time zone has been synced.
   */
    static getCalendarTimeZone() {
      const properties = PropertiesService.getDocumentProperties();
      const property = properties.getProperty(TimeZonesConfig.LAST_SYNCED_TIMEZONE_PROPERTY_KEY);
      return property ? property : this.getScriptTimeZone();
    }


  /**
   * Syncs the time zone with the configured calendar.
   */
  static syncWithCalendar() {
    const calendar = CalendarApp.getCalendarById(TimeZonesConfig.CALENDAR_ID);
    const timeZone = calendar.getTimeZone();
    const properties = PropertiesService.getDocumentProperties();
    properties.setProperty(TimeZonesConfig.LAST_SYNCED_TIMEZONE_PROPERTY_KEY, timeZone);
  }
}