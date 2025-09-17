import localConfig from './config.local.js';

const defaults = {

  BACKLOG_SHEET_ID: '0',

  ALL_FILTER_VIEW_ID: '1418263521',
  NEXT_FILTER_VIEW_ID: '952962288',
  WAITING_FILTER_VIEW_ID: '1531329478',
  LATER_FILTER_VIEW_ID: '624615919',

  HEADER_ROWS: 1,

  // Column indices
  COMPLETED_COLUMN: 1, // one-based
  TITLE_COLUMN: 3, // one-based
  PROJECT_COLUMN: 5, // one-based
  PRIORITY_COLUMN: 6, // one-based
  STATUS_COLUMN: 7, // one-based
  DATE_COLUMN: 8, // one-based
  SCHEDULED_TIME_COLUMN: 9, // one-based

  // Values for status column
  STATUS_WAITING: 'Waiting',
  STATUS_NEXT: 'Next',

  // Tags to supply meta data (e.g. "#project:(My Project)")
  TAG_PROJECT: 'project',
  TAG_PRIORITY: 'prio',
  TAG_DATE: 'when',
  TAG_SCHEDULE: 'calendar',

  // Key for developer metadata to mark an item as automatically schedulable
  AUTOMATICALLY_SCHEDULABLE_DEVELOPER_METADATA_KEY: 'automatically_schedulable',
};

// Merge local config with defaults and export.
export default { ...defaults, ...localConfig };
