const SchedulerConfig = {};

SchedulerConfig.CALENDAR_ID = '';

// Timezone of spreadsheet, in terms of offset from UTC/GMT in ms
SchedulerConfig.UTC_TIMEZONE_OFFSET = BacklogConfig.UTC_TIMEZONE_OFFSET; // in ms

// Length of possible slots for scheduled events
SchedulerConfig.SLOT_LENGTH = 5; // in minutes

// Earliest time at which scheduled events may begin
SchedulerConfig.DAY_START = 9; // in hours since midnight

// Latest time at which scheduled events may end
SchedulerConfig.DAY_END = 23; // in hours since midnight

// Color of scheduled events
SchedulerConfig.COLOR = CalendarApp.EventColor.GRAY;