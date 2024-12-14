const SchedulerConfig = {};

SchedulerConfig.CALENDAR_ID = '';

// Timezone of spreadsheet, in terms of offset from UTC/GMT in ms
SchedulerConfig.UTC_TIMEZONE_OFFSET = BacklogConfig.UTC_TIMEZONE_OFFSET; // in ms

// Length of possible slots for scheduled events
SchedulerConfig.SLOT_LENGTH = 15; // in minutes

// Earliest time at which scheduled events may begin
SchedulerConfig.DAY_START = 9; // in hours since midnight

// Latest time at which scheduled events may end
SchedulerConfig.DAY_END = 23; // in hours since midnight

// Color of scheduled events
SchedulerConfig.COLOR = CalendarApp.EventColor.GRAY;

// Tags used to identify scheduled events
SchedulerConfig.TAG_KEY = 'mission_control';
SchedulerConfig.TAG_LENGTH = 10;
SchedulerConfig.TAG_PREFIX = '#mc-';
SchedulerConfig.TAG_BASE = 'abcdefghijklmnopqrstuvxyz';
SchedulerConfig.TAG_REGEX = new RegExp(`^${SchedulerConfig.TAG_PREFIX}[${SchedulerConfig.TAG_BASE}]{${SchedulerConfig.TAG_LENGTH}}$`);

// Property key used to store sync token for calendar
SchedulerConfig.CALENDAR_SYNC_TOKEN_PROPERTY_KEY = 'calendar_sync_token';