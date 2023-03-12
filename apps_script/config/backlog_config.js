const BacklogConfig = {};
  
// Name of relevant sheet
BacklogConfig.SHEET_ID = 0;

// Number of rows reserved for column headers
BacklogConfig.HEADER_ROWS = 1;

// Column indices (one-based)
BacklogConfig.COLUMN_TITLE = 3;
BacklogConfig.COLUMN_PROJECT = 5;
BacklogConfig.COLUMN_PRIORITY = 6;
BacklogConfig.COLUMN_STATUS = 7;
BacklogConfig.COLUMN_WAITING = 8;
BacklogConfig.COLUMN_NOTES = 10;
BacklogConfig.COLUMN_SCHEDULED_TIME = 1;

// Value constants for status column
BacklogConfig.STATUS_WAITING = 'Waiting';
BacklogConfig.STATUS_NEXT = 'Next';
BacklogConfig.STATUS_DONE = 'Done';
BacklogConfig.STATUS_LATER = 'Later';

// Shortcut for entering default project
BacklogConfig.DEFAULT_PROJECT = 'Misc';
BacklogConfig.DEFAULT_PROJECT_SHORTCUT = '-';

// Date format for waiting column
BacklogConfig.WAITING_DATE_FORMAT = 'ddd, M/d';

// Hour after midnight at which to set due 'Waiting' items to 'Next'
BacklogConfig.SET_WAITING_ITEMS_TO_NEXT_ITEMS_HOUR = 3;

// Timezone of spreadsheet, in terms of offset from UTC/GMT in ms
BacklogConfig.UTC_TIMEZONE_OFFSET = -new Date().getTimezoneOffset()*60*1000; // in ms

// Refresh interval for importing items from the inbox
BacklogConfig.INBOX_IMPORT_INTERVAL = 5; // in minutes 

// Hour after midnight at which to schedule recurring items
BacklogConfig.SCHEDULE_RECURRING_ITEMS_HOUR = 3;

// Name of sheet with recurring items
BacklogConfig.RECURRING_SHEET_ID = 2031303097;

// Number of header rows in sheet with recurring items
BacklogConfig.RECURRING_HEADER_ROWS = 1;

// Column indices (one-based)
BacklogConfig.RECURRING_COLUMN_CADENCE_FACTOR = 8;
BacklogConfig.RECURRING_COLUMN_CADENCE_TYPE = 9;
BacklogConfig.RECURRING_COLUMN_RECURRING_DAY = 10;
BacklogConfig.RECURRING_COLUMN_NEXT_DATE = 11;
BacklogConfig.RECURRING_COLUMN_TITLE = 3;
BacklogConfig.RECURRING_COLUMN_PROJECT = 5;
BacklogConfig.RECURRING_COLUMN_PRIORITY = 6;
BacklogConfig.RECURRING_COLUMN_NOTES = 7;

// Cell values indicating cadence type
BacklogConfig.CADENCE_TYPE_WEEKLY = 'week(s)';
BacklogConfig.CADENCE_TYPE_MONTHLY = 'month(s)';

// Property for queued descriptions of items marked as 'Next'
BacklogConfig.NEXT_ITEM_DESCRIPTIONS_PROPERTY_KEY = 'next_item_descriptions';

// Property for time (in number of milliseconds since the epoch) until when
// dialogs informing user that items have been set to 'Next' are suspended
BacklogConfig.SET_TO_NEXT_DIALOGS_SUSPENDED_TIME = 'set_to_next_dialogs_suspended_time';
