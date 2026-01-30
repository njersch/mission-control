import localConfig from './config.local.js';

const defaults = {

  BACKLOG_SHEET_ID: '0',

  ALL_FILTER_VIEW_ID: '1418263521',
  NEXT_FILTER_VIEW_ID: '952962288',
  WAITING_FILTER_VIEW_ID: '1531329478',
  LATER_FILTER_VIEW_ID: '624615919',

  HEADER_ROWS: 1,

  // Column indices
  COLUMN_COMPLETED: 1, // one-based
  COLUMN_WAITING: 8,
  
  // Values for status column
  STATUS_WAITING: 'Waiting',
  STATUS_NEXT: 'Next',

  // Tags to supply meta data (e.g. "#project:(My Project)")
  TAG_PROJECT: 'project',
  TAG_PRIORITY: 'prio',
  TAG_DATE: 'when',
  TAG_SCHEDULE: 'calendar',
  TAG_SCHEDULE_ONLY: 'calendar-only',
};

// Merge local config with defaults and export.
export default { ...defaults, ...localConfig };
