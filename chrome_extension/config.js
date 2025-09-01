export const SPREADSHEET_ID = '';
export const BACKLOG_SHEET_ID = '0';

export const ALL_FILTER_VIEW_ID = '1418263521';
export const NEXT_FILTER_VIEW_ID = '952962288';
export const WAITING_FILTER_VIEW_ID = '1531329478';
export const LATER_FILTER_VIEW_ID = '624615919';

export const HEADER_ROWS = 1;

// Column indices
export const COMPLETED_COLUMN = 1; // one-based
export const TITLE_COLUMN = 3; // one-based
export const PROJECT_COLUMN = 5; // one-based
export const PRIORITY_COLUMN = 6; // one-based
export const STATUS_COLUMN = 7; // one-based
export const DATE_COLUMN = 8; // one-based
export const SCHEDULED_TIME_COLUMN = 9; // one-based

// Values for status column
export const STATUS_WAITING = 'Waiting';
export const STATUS_NEXT = 'Next';

// Tags to supply meta data (e.g. "#project:(My Project)")
export const TAG_PROJECT = 'project';
export const TAG_PRIORITY = 'prio';
export const TAG_DATE = 'when';
export const TAG_SCHEDULE = 'calendar';

// Deployment URL of script to which a POST request can be made to schedule items.
export const WEB_APP_DEPLOYMENT_URL = '';

// Key for developer metadata to mark an item as automatically schedulable
export const AUTOMATICALLY_SCHEDULABLE_DEVELOPER_METADATA_KEY = 'automatically_schedulable';