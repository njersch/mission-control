import config from './config.js';
import * as omnibox from './omnibox.js';
import * as tabShortcuts from './tab_shortcuts.js';
import * as sheetShortcuts from './sheet_shortcuts.js';


chrome.omnibox.onInputStarted.addListener(omnibox.onInputStarted);
chrome.omnibox.onInputChanged.addListener(omnibox.onInputChanged);
chrome.omnibox.onInputEntered.addListener(omnibox.onInputEntered);


chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-mission-control') {
    tabShortcuts.switchToSpreadsheet();
  } else if (command === 'open-inbox') {
    tabShortcuts.switchToInbox();
  } else if (command === 'open-calendar') {
    tabShortcuts.switchToCalendar();
  } else if (command === 'open-all-filter-view') {
    sheetShortcuts.switchToFilterView(config.ALL_FILTER_VIEW_ID);
  } else if (command === 'open-next-filter-view') {
    sheetShortcuts.switchToFilterView(config.NEXT_FILTER_VIEW_ID);
  } else if (command === 'open-waiting-filter-view') {
    sheetShortcuts.switchToFilterView(config.WAITING_FILTER_VIEW_ID);
  } else if (command === 'open-later-filter-view') {
    sheetShortcuts.switchToFilterView(config.LATER_FILTER_VIEW_ID);
  } else if (command === 'reload-filter-view') {
    sheetShortcuts.switchToFilterView(null);
  } else if (command === 'mark-item-done') {
    sheetShortcuts.markSelectedItemAsDone();
  } else if (command === 'schedule-items') {
    sheetShortcuts.scheduleItems();
  }
});