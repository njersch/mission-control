const TimeZonesConfig = {};

// Refresh interval for syncing time zone with calendar
TimeZonesConfig.SYNC_WITH_CALENDAR_INTERVAL = 15; // in minutes

// ID of calendar to sync time zone with. Leave empty to use
// the time zone of the Apps Script project.
TimeZonesConfig.CALENDAR_ID = SchedulerConfig.CALENDAR_ID;

// Property key used to store last synced time zone
TimeZonesConfig.LAST_SYNCED_TIMEZONE_PROPERTY_KEY = 'last_synced_timezone';
