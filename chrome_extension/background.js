import * as config from './config.js';
import * as omnibox from './omnibox.js';
import * as tabShortcuts from './tab_shortcuts.js';
import * as sheetShortcuts from './sheet_shortcuts.js';


chrome.omnibox.onInputStarted.addListener(() => {
  omnibox.updatedCachedProjectNames();
});

chrome.omnibox.onInputChanged.addListener((input, suggest) => {
  omnibox.getSuggestions(input).then(suggest);
});

chrome.omnibox.onInputEntered.addListener((input, _) => {
  switch (input) {
    case '':
      tabShortcuts.switchToSpreadsheet();
      break;

    case 'i':
      tabShortcuts.switchToInbox();
      break;

    case 'c':
      tabShortcuts.switchToCalendar();
      break;

    default:
      omnibox.insertItem(input);
  }
});

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
    sheetShortcuts.reloadFilterView();
  } else if (command === 'mark-item-done') {
    sheetShortcuts.markSelectedItemAsDone();
  }
});