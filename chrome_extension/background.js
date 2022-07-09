import * as config from './config.js';

chrome.omnibox.onInputEntered.addListener((text, _) => {

  switch (text) {
    case '':
      switchToTab(
        `https://docs.google.com/*/${config.SPREADSHEET_ID}*`,
        `https://docs.google.com/spreadsheets/d/${config.SPREADSHEET_ID}/edit`
      );
      break;

    case 'i':
      switchToTab(
        'https://mail.google.com/*',
        'https://mail.google.com/mail/u/0'
      );
      break;

    case 'c':
      switchToTab(
        'https://calendar.google.com/*',
        'https://calendar.google.com/calendar/u/0'
      );
      break;

    case 'm':
      switchToTab(
        'https://meet.google.com/*',
        'https://meet.google.com/?authuser=0'
      );
      break;

    default:
      chrome.identity.getAuthToken({interactive: true}, function(token) {
        insertItem(text, token);
      });
  }
});

function insertItem(input, token) {

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.SPREADSHEET_ID}:batchUpdate`;
  const headers = {
    'Content-type': 'application/json',
    'Authorization': 'Bearer ' + token,
  };
  const body = JSON.stringify(batchUpdates(input));

  fetch(url, {
    method: 'POST',
    headers: headers,
    body: body,
  }).then((response) => {
    if (response.ok) {
        console.log(`Item added: "${input}"`);
        chrome.notifications.create(null, {
              type: 'basic',
              iconUrl: 'icon128.png',
              title: 'Item added',
              message: input,
              eventTime: Date.now() + 2000,
              priority: 1
            });
      } else {
        return response.text().then((text) => {throw new Error(text)});
      }
  }).catch((error) => {
    console.error(error);
  });
}


function batchUpdates(input) {
  return {
    "requests": [

      // Insert new row
      {
        "insertDimension": {
          "range": {"sheetId": config.SHEET_ID, "dimension": "ROWS", "startIndex": 1, "endIndex": 2},
          "inheritFromBefore": false
        }
      },

      // Write input to title cell
      {
        "updateCells": {
          "start": {"sheetId": config.SHEET_ID, "rowIndex": config.HEADER_ROWS, "columnIndex": config.TITLE_COLUMN - 1},
          "fields": "userEnteredValue",
          "rows": {"values": [{"userEnteredValue": {"stringValue": input}}]}
        }
      }
    ]
  }
}


function switchToTab(urlPattern, url) {
  
  chrome.tabs.query(
    {'url': urlPattern},
    (tabs) => {
        
      // Tab already open
      if (tabs.length > 0) {
        
        const tab = tabs[0];

        // Switch to window
        chrome.windows.update(tab.windowId, {
          'focused': true
        });

        // Switch to tab
        chrome.tabs.highlight({
          windowId: tab.windowId,
          tabs: tab.index
        });

      } else {

        // Open tab
        chrome.tabs.create({
          url: url,
          index: 0,
          pinned: true,
          active: true
        });
      }
    }
  );
}