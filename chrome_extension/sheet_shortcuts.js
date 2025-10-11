import config from './config.js';
import * as notifications from './notifications.js';
import * as webApp from './web_app.js';


/** Key for sheet ID in URL's hash parameters. */
const SHEET_HASH_PARAM_KEY = 'gid';


/** Key for filter view ID in URL's hash parameters. */
const FILTER_VIEW_HASH_PARAM_KEY = 'fvid';


/**
 * Switches to filter view if current tab is the backlog spreadsheet.
 * @param {string} filterViewId Filter view ID to switch to, or `undefined` to reload current view.
 */
export async function setFilterView(filterViewId) {

  const activeTab = await getActiveTabIfBacklogSheet();

  if (!activeTab) {
    return null;
  }

  const hashParams = getHashParams(activeTab.url);

  // Get previous filter view ID.
  const previousFilterViewId = hashParams[FILTER_VIEW_HASH_PARAM_KEY];

  const filterViewSequence = [];

  // Determine if we should reload the filter view.
  const shouldReload =
    // Only reload if there is a previous filter view to reload.
    previousFilterViewId !== undefined &&
    (
      // Reload if desired by caller.
      (filterViewId === undefined) ||
      // Reload if desired filter view is the same as the current filter view.
      filterViewId === previousFilterViewId
    );

  if (shouldReload) {
    // Switch to intermediate filter view ID that is different from the current filter view,
    // then switch back to the previous filter view. Otherwise Google Sheets would not reload
    // the filter view because the URL never changes.
    const intermediateFilterViewId = previousFilterViewId !== config.ALL_FILTER_VIEW_ID ? config.ALL_FILTER_VIEW_ID : config.NEXT_FILTER_VIEW_ID;
    filterViewSequence.push(intermediateFilterViewId);
    filterViewSequence.push(previousFilterViewId);
  } else if (filterViewId !== undefined) {
    // Switch to desired filter view, if provided.
    filterViewSequence.push(filterViewId);
  }

  // Update hash parameters for each filter view in sequence.
  for (const filterViewId of filterViewSequence) {
    hashParams[FILTER_VIEW_HASH_PARAM_KEY] = filterViewId;
    const hash = Object.entries(hashParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    const url = new URL(activeTab.url);
    url.hash = `#${hash}`;
    await chrome.tabs.update(activeTab.id, {url: url.toString()});
  }
}


/**
 * Marks the selected backlog item as done.
 */
export async function markSelectedItemAsDone() {
  const activeTab = await getActiveTabIfBacklogSheet();
  if (!activeTab) {
    return;
  }
  const completedColumn = String.fromCharCode(64 + config.COMPLETED_COLUMN);
  const message = { action: 'mark_item_done', completedColumn: completedColumn };
  chrome.tabs.sendMessage(activeTab.id, message);
}


/**
 * Schedules items.
 */
export async function scheduleItems() {
  const activeTab = await getActiveTabIfBacklogSheet();
  if (!activeTab) {
    return;
  }

  // Show notification to indicate that items are being scheduled.
  // Use static notification ID to avoid duplicate notifications.
  const notificationId = 'schedule-items';
  notifications.showNotification({
    message: 'Scheduling items…',
    notificationId: notificationId
  });

  try {
    await webApp.sendRequest('POST', 'schedule-events');
  } catch (error) {

    // Show error to user.
    const message = { action: 'show_error', error: 'Some items could not be scheduled.' };
    chrome.tabs.sendMessage(activeTab.id, message);

  } finally {
    notifications.clearNotification(notificationId);
  }
}


/**
 * Returns hash parameters from a URL. Hash parameters are key-value pairs separated by ampersands,
 * e.g. #gid=0&fvid=123.
 * @param {string} url URL
 * @returns {object} Hash parameters, e.g. { gid: '0', fvid: '123' }
 */
function getHashParams(url) {
  const hash = new URL(url).hash;
  const hashParams = {};
  if (hash.startsWith('#')) {
    const params = hash.substring(1).split('&');
    for (const param of params) {
      const [key, value] = param.split('=');
      hashParams[key] = value;
    }
  }
  return hashParams;
}


/**
 * Returns the active tab if it is a Google Sheets page and the current sheet is the backlog sheet.
 * @returns {object} Active tab if it is a Google Sheets page and the current sheet is the backlog sheet, otherwise null.
 */
async function getActiveTabIfBacklogSheet() {
  
  const [activeTab] = await chrome.tabs.query({active: true, currentWindow: true});

  // Check if current tab is a Google Sheets page.
  if (!activeTab || !activeTab.url.includes('docs.google.com/spreadsheets')) {
    return null;
  }

  // Check if current spreadsheet is the backlog spreadsheet.
  const segments = activeTab.url.split('/');
  if (segments.indexOf(config.SPREADSHEET_ID) < 0) {
    return null;
  }

  // Check if current sheet is the backlog sheet.
  const hashParams = getHashParams(activeTab.url);
  if (hashParams[SHEET_HASH_PARAM_KEY] !== config.BACKLOG_SHEET_ID.toString()) {
    return null;
  }

  return activeTab;
}