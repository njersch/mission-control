const InboxImporterConfig = {};

// Email address (without suffix) that can be used to add items remotely
// (e.g. max@example.com). Leave empty to disable inbox import.
InboxImporterConfig.EMAIL_ADDRESS = '';

// Suffix (e.g. "todo") of special email address  (e.g. max+todo@example.com)
// that can be used to add items remotely. The email address should only be
// used for this purpose since emails are removed from the inbox automatically.
InboxImporterConfig.EMAIL_SUFFIX = 'todo';

// String to be included in notes of imported items
InboxImporterConfig.NOTES_TAG = '📨';