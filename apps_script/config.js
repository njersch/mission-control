/**
 * Class for managing configuration properties that can be overridden
 * by setting script properties.
 */
class Config {

  /**
   * Constructor.
   * @param {string} name - The name of the config.
   * @param {Object} propertiesAndDefaults - The properties and their default values.
   */
  constructor(name, propertiesAndDefaults) {
    this.name = name;
    for (const [key, defaultValue] of Object.entries(propertiesAndDefaults)) {
      this[key] = this.get(`${this.name}.${key}`, defaultValue);
    }
  }


  /**
   * Gets the value of a property.
   * @param {string} fullKey - The full key of the property.
   * @param {any} defaultValue - The default value of the property.
   * @returns {any} The value of the property. The type is determined by the default value.
   */
  get(fullKey, defaultValue) {
    const properties = PropertiesService.getScriptProperties();
    const override = properties.getProperty(fullKey);
    if (override !== null) {
      return this.parseValue(override, defaultValue);
    }
    return defaultValue;
  }


  /**
   * Parses the value of a property.
   * @param {any} value - The value of the property.
   * @param {any} defaultValue - The default value of the property.
   * @returns {any} The parsed value. The type is determined by the default value.
   */
  parseValue(value, defaultValue) {
    if (typeof defaultValue === 'number') return Number(value);
    if (typeof defaultValue === 'boolean') return value === 'true';
    return value;
  }
}


const SchedulerConfig = new Config('SchedulerConfig', {

  // ID of calendar to use for scheduling
  CALENDAR_ID: '',

  // Length of possible slots for scheduled events
  SLOT_LENGTH: 15, // in minutes

  // Earliest time at which scheduled events may begin
  DAY_START: 9, // in hours since midnight

  // Latest time at which scheduled events may end
  DAY_END: 23, // in hours since midnight

  // Color of scheduled events, expressed as integer value of `CalendarApp.EventColor`,
  // see https://developers.google.com/apps-script/reference/calendar/event-color
  COLOR: 8, // GRAY, or "Graphite"

  // Tags used to identify scheduled events
  TAG_KEY: 'mission_control',
  TAG_LENGTH: 10,
  TAG_PREFIX: '#mc-',
  TAG_BASE: 'abcdefghijklmnopqrstuvxyz',

  // Property key used to store sync token for calendar
  CALENDAR_SYNC_TOKEN_PROPERTY_KEY: 'calendar_sync_token',
});


const BacklogConfig = new Config('BacklogConfig', {
    
  // ID of relevant sheet
  SHEET_ID: 0,

  // Number of rows reserved for column headers
  HEADER_ROWS: 1,

  // Column indices (one-based)
  COLUMN_COMPLETED: 1,
  COLUMN_TITLE: 3,
  COLUMN_PROJECT: 5,
  COLUMN_PRIORITY: 6,
  COLUMN_STATUS: 7,
  COLUMN_WAITING: 8,
  COLUMN_SCHEDULED_TIME: 9,
  COLUMN_NOTES: 11,

  // Value constants for status column
  STATUS_WAITING: 'Waiting',
  STATUS_NEXT: 'Next',
  STATUS_LATER: 'Later',

  // Shortcut for entering default project
  DEFAULT_PROJECT: 'Misc',
  DEFAULT_PROJECT_SHORTCUT: '-',

  // Date format for waiting column
  WAITING_DATE_FORMAT: 'ddd, M/d',

  // Hour after midnight at which to set due 'Waiting' items to 'Next'
  SET_WAITING_ITEMS_TO_NEXT_ITEMS_HOUR: 3,

  // Refresh interval for importing items from the inbox
  INBOX_IMPORT_INTERVAL: 5, // in minutes

  // Refresh interval for scheduling items entered from the Omnibox
  SCHEDULE_EVENTS_INTERVAL: 1, // in minutes

  // Hour after midnight at which to schedule recurring items
  SCHEDULE_RECURRING_ITEMS_HOUR: 3,

  // Name of sheet with recurring items
  RECURRING_SHEET_ID: 2031303097,

  // Number of header rows in sheet with recurring items
  RECURRING_HEADER_ROWS: 1,

  // Column indices (one-based)
  RECURRING_COLUMN_CADENCE_FACTOR: 8,
  RECURRING_COLUMN_CADENCE_TYPE: 9,
  RECURRING_COLUMN_RECURRING_DAY: 10,
  RECURRING_COLUMN_NEXT_DATE: 11,
  RECURRING_COLUMN_TITLE: 3,
  RECURRING_COLUMN_PROJECT: 5,
  RECURRING_COLUMN_PRIORITY: 6,
  RECURRING_COLUMN_NOTES: 7,

  // Cell values indicating cadence type
  CADENCE_TYPE_WEEKLY: 'week(s)',
  CADENCE_TYPE_MONTHLY: 'month(s)',

  // Property for queued descriptions of items marked as 'Next'
  NEXT_ITEM_DESCRIPTIONS_PROPERTY_KEY: 'next_item_descriptions',

  // Property for time (in number of milliseconds since the epoch) until when
  // dialogs informing user that items have been set to 'Next' are suspended
  SET_TO_NEXT_DIALOGS_SUSPENDED_TIME_PROPERTY_KEY: 'set_to_next_dialogs_suspended_time',

  // Key for developer metadata to mark an item as automatically schedulable, that is,
  // ready to be automatically added to the calendar
  AUTOMATICALLY_SCHEDULABLE_DEVELOPER_METADATA_KEY: 'automatically_schedulable',

  // Key for developer metadata to associate a scheduled event with a backlog item
  SCHEDULED_EVENT_TAG_METADATA_KEY: 'event_tag',
});


const TimeZonesConfig = new Config('TimeZonesConfig', {

  // Refresh interval for syncing time zone with calendar
  SYNC_WITH_CALENDAR_INTERVAL: 15, // in minutes

  // ID of calendar to sync time zone with. Leave empty to use
  // the time zone of the Apps Script project.
  CALENDAR_ID: SchedulerConfig.CALENDAR_ID,

  // Property key used to store last synced time zone
  LAST_SYNCED_TIMEZONE_PROPERTY_KEY: 'last_synced_timezone',
});


const InboxImporterConfig = new Config('InboxImporterConfig', {

  // Email address (without suffix) that can be used to add items remotely
  // (e.g. max@example.com). Leave empty to disable inbox import.
  EMAIL_ADDRESS: '',

  // Suffix (e.g. "todo") of special email address  (e.g. max+todo@example.com)
  // that can be used to add items remotely. The email address should only be
  // used for this purpose since emails are removed from the inbox automatically.
  EMAIL_SUFFIX: 'todo',

  // String to be included in notes of imported items
  NOTES_TAG: '📨',
});