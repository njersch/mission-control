import * as config from './config.js';


/** Key for sheet ID in URL's hash parameters. */
const SHEET_HASH_PARAM_KEY = 'gid';


/** Key for filter view ID in URL's hash parameters. */
const FILTER_VIEW_HASH_PARAM_KEY = 'fvid';


/**
 * Switches to filter view if current tab is the backlog spreadsheet.
 * @param {string} filterViewId Filter view ID to switch to.
 * @returns {string} ID of the previous filter view, or null if filter view was not changed.
 */
export async function switchToFilterView(filterViewId) {

  const activeTab = await getActiveTabIfBacklogSheet();

  if (!activeTab) {
    return null;
  }

  const hashParams = getHashParams(activeTab.url);

  // Get previous filter view ID.
  const previousFilterViewId = hashParams[FILTER_VIEW_HASH_PARAM_KEY];

  // Set filter view in hash parameters.
  hashParams[FILTER_VIEW_HASH_PARAM_KEY] = filterViewId;
  const hash = Object.entries(hashParams)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const url = new URL(activeTab.url);
  url.hash = `#${hash}`;
  await chrome.tabs.update(activeTab.id, {url: url.toString()});

  return previousFilterViewId;
}


/**
 * Reloads the filter view.
 */
export async function reloadFilterView() {
  const previousFilterViewId = await switchToFilterView(config.ALL_FILTER_VIEW_ID);
  if (previousFilterViewId !== null) {
    await switchToFilterView(previousFilterViewId);
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
  try {
    let response;
    try {
      response = await fetch(config.WEB_APP_DEPLOYMENT_URL, { method: 'POST' });
    } catch (error) {
      console.error('POST request failed with error:', error);
      throw new Error('Could not schedule items. Please check if the script is deployed correctly.');
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error('Some items could not be scheduled.');
    }
  } catch (error) {
    const message = { action: 'show_error', error: error.message };
    chrome.tabs.sendMessage(activeTab.id, message);
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

  // Check if current sheet is the backlog sheet.
  const hashParams = getHashParams(activeTab.url);
  if (hashParams[SHEET_HASH_PARAM_KEY] !== config.BACKLOG_SHEET_ID.toString()) {
    return null;
  }

  return activeTab;
}