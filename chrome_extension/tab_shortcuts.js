import config from './config.js';


export function switchToSpreadsheet() {
  switchToTab(
    `https://docs.google.com/*/${config.SPREADSHEET_ID}*`,
    `https://docs.google.com/spreadsheets/d/${config.SPREADSHEET_ID}/edit`
  );
}

export function switchToInbox() {
  switchToTab(
    'https://mail.google.com/*',
    'https://mail.google.com/mail/u/0'
  );
}

export function switchToCalendar() {
  switchToTab(
    'https://calendar.google.com/*',
    'https://calendar.google.com/calendar/u/0'
  );
}


/**
 * Switches to or opens a tab matching a provided URL
 * @param urlPattern Pattern to match open tabs against
 * @param url URL to open if no corresponding tab is found
 */
async function switchToTab(urlPattern, url) {

  const tabs = await chrome.tabs.query({ url: urlPattern });
  let tab = tabs.length > 0 ? tabs[0] : null;

  // Open tab if needed
  if (tab == null) {

    // Open window if needed
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
    let tabsToClose = null;
    if (windows.length == 0) {
      const window = await chrome.windows.create({ focused: true });
      tabsToClose = window.tabs;
    }

    // Open tab
    tab = await chrome.tabs.create({
      url: url,
      index: 0,
      pinned: true,
      active: true
    });

    // Close other tabs of new window if needed
    if (tabsToClose) {
      await chrome.tabs.remove(tabsToClose.map((tab) => tab.id));
    }
  } else {

    // Switch to tab
    await chrome.tabs.highlight({
      windowId: tab.windowId,
      tabs: tab.index
    });
  }

  // Focus window
  await chrome.windows.update(tab.windowId, { focused: true });
}