import config from './config.js';
import * as sheetShortcuts from './sheet_shortcuts.js';


export function execute(command) {
  if (command.startsWith('configurable-')) {
    const index = command.split('-')[1];
    executeConfigurableShortcut(index);
  } else if (command === 'open-mission-control') {
    switchToTab(
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

    // Skip action if it is only applicable to the current tab,
    // and the current tab does not match the pattern.
    if (action.current_tab_only && !(await isCurrentTab(action.url_pattern))) {
      continue;
    }
    
    // Perform desired actions.
    if (action.switch_to_tab) {
      await switchToTab(action.url_pattern, action.switch_to_tab);
    }
    if (action.change_url) {
      await changeUrl(action.url_pattern, action.change_url);
    }
    if (action.execute_command) {
      execute(action.execute_command);
    }
  }
}


/**
 * Checks if the current tab matches a provided URL pattern.
 * @param urlPattern Pattern to match current tab against
 * @returns {Promise<boolean>} True if the current tab matches the pattern, false otherwise.
 */
async function isCurrentTab(urlPattern) {
  const query = { active: true, currentWindow: true, url: urlPattern };
  const tabs = await chrome.tabs.query(query);
  return tabs.length > 0;
}


/**
 * Returns the last accessed tab matching a provided URL pattern.
 * @param urlPattern Pattern to match tabs against
 * @returns {Promise<object>} Last accessed tab if found, otherwise null
 */
async function getLastAccessedTab(urlPattern) {
  const tabs = await chrome.tabs.query({ url: urlPattern });
  tabs.sort((a, b) => b.lastAccessed - a.lastAccessed);
  return tabs.length > 0 ? tabs[0] : null;
}


/**
 * Changes the URL of the last accessed tab matching a provided URL pattern.
 * @param urlPattern Pattern to match tabs against
 * @param url URL to change to
 */
async function changeUrl(urlPattern, url) {
  const tab = await getLastAccessedTab(urlPattern);
  if (tab) {
    await chrome.tabs.update(tab.id, { url: url });
  }
}


/**
 * Switches to or opens a tab matching a provided URL
 * @param urlPattern Pattern to match tabs against
 * @param url URL to open if no corresponding tab is found
 */
async function switchToTab(urlPattern, url) {

  let tab = await getLastAccessedTab(urlPattern);

  // Open tab if needed.
  if (tab == null) {

    // Open window if needed.
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
    let tabsToClose = null;
    if (windows.length == 0) {
      const window = await chrome.windows.create({ focused: true });
      tabsToClose = window.tabs;
    }

    // Open tab.
    tab = await chrome.tabs.create({
      url: url,
      index: 0,
      pinned: true,
      active: true
    });

    // Close other tabs of new window if needed.
    if (tabsToClose) {
      await chrome.tabs.remove(tabsToClose.map((tab) => tab.id));
    }
  } else {

    // Switch to tab.
    await chrome.tabs.highlight({
      windowId: tab.windowId,
      tabs: tab.index
    });
  }

  // Focus window.
  await chrome.windows.update(tab.windowId, { focused: true });
}