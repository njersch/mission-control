import config from './config.js';
import * as sheetShortcuts from './sheet_shortcuts.js';


export function execute(command) {
  if (command.startsWith('configurable-')) {
    const index = command.split('-')[1];
    executeConfigurableShortcut(index);
  } else if (command === 'open-mission-control') {
    switchToOrOpenTab(
      `https://docs.google.com/*/${config.SPREADSHEET_ID}*`,
      `https://docs.google.com/spreadsheets/d/${config.SPREADSHEET_ID}/edit`
    );
  } else if (command === 'open-all-filter-view') {
    sheetShortcuts.setFilterView(config.ALL_FILTER_VIEW_ID);
  } else if (command === 'open-next-filter-view') {
    sheetShortcuts.setFilterView(config.NEXT_FILTER_VIEW_ID);
  } else if (command === 'open-waiting-filter-view') {
    sheetShortcuts.setFilterView(config.WAITING_FILTER_VIEW_ID);
  } else if (command === 'open-later-filter-view') {
    sheetShortcuts.setFilterView(config.LATER_FILTER_VIEW_ID);
  } else if (command === 'reload-filter-view') {
    sheetShortcuts.setFilterView();
  } else if (command === 'mark-item-done') {
    sheetShortcuts.markSelectedItemAsDone();
  } else if (command === 'enter-waiting-cell') {
    sheetShortcuts.enterWaitingCell();
  } else if (command === 'schedule-items') {
    sheetShortcuts.scheduleItems();
  }
}


export async function executeConfigurableShortcut(index) {
  const actions = config.CONFIGURABLE_SHORTCUTS[index];

  // Do nothing if no actions have been configured for this shortcut.
  if (!actions || actions.length === 0) {
    return;
  }

  for (const action of actions) {

    const matchingTab = await getLastAccessedTab(action.url_filter);

    // Skip action if it is only applicable to the current tab,
    // and the current tab does not match the URL filter.
    if (action.current_tab_only) {
      if (!matchingTab || !matchingTab.active) {
        continue;
      }
      const currentWindow = await chrome.windows.getCurrent();
      if (matchingTab.windowId !== currentWindow.id) {
        continue;
      }
    }
    
    // Perform desired actions.
    if (action.switch_to_tab) {
      await switchToOrOpenTab(action.url_filter, action.switch_to_tab);
    }
    if (action.change_url) {
      await changeUrl(action.url_filter, action.change_url);
    }
    if (action.execute_command) {
      execute(action.execute_command);
    }
  }
}


/**
 * Returns the last accessed tab matching a provided URL filter.
 * @param urlFilter Regular expression to match tabs' URLs against
 * @returns {Promise<object>} Last accessed tab if found, otherwise null
 */
async function getLastAccessedTab(urlFilter) {
  let tabs = await chrome.tabs.query({});
  tabs = tabs.filter((tab) => tab.url.match(urlFilter));
  if (tabs.length === 0) {
    return null;
  }
  tabs.sort((a, b) => b.lastAccessed - a.lastAccessed);
  return tabs[0];
}


/**
 * Changes the URL of the last accessed tab matching a provided URL pattern.
 * @param urlFilter Regular expression to match tabs' URLs against
 * @param url URL to change to
 */
async function changeUrl(urlFilter, url) {
  const tab = await getLastAccessedTab(urlFilter);
  if (tab) {
    await chrome.tabs.update(tab.id, { url: url });
  }
}


/**
 * Opens a new tab.
 * @param url URL to open
 * @returns {Promise<object>} Newly opened tab
 */
async function openTab(url) {

  // Open window if needed.
  const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
  let tabsToClose = null;
  if (windows.length == 0) {
    const window = await chrome.windows.create({ focused: true });
    tabsToClose = window.tabs;
  }

  // Open tab.
  const tab = await chrome.tabs.create({
    url: url,
    index: 0,
    pinned: true,
    active: true
  });

  // Close other tabs of new window if needed.
  if (tabsToClose) {
    await chrome.tabs.remove(tabsToClose.map((tab) => tab.id));
  }

  return tab;
}


/**
 * Switches to a provided tab.
 * @param tab Tab to switch to
 */
async function switchToTab(tab) {

  // Switch to tab.
  await chrome.tabs.highlight({
    windowId: tab.windowId,
    tabs: tab.index
  });

  // Focus window.
  await chrome.windows.update(tab.windowId, { focused: true });
}


/**
 * Switches to or opens a tab matching a provided URL.
 * @param urlFilter Regular expression to match tabs' URLs against
 * @param url URL to open if no corresponding tab is found
 */
async function switchToOrOpenTab(urlFilter, url) {
  let tab = await getLastAccessedTab(urlFilter);
  if (!tab) {
    tab = await openTab(url);
  }
  await switchToTab(tab);
  return tab;
}