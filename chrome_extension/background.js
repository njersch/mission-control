import * as config from './config.js';


/** Storage key for cached project names */
const PROJECT_NAMES_KEY = 'project_names';


/** Day names, in order such that index corresponds to JS's Date.getDay() */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


/** Base URL for Google Sheets API */
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'


/** Tags and corresponding suggestions */
const TAGS = [
  {
    tag: config.TAG_PRIORITY,
    description: 'Set priority',
    getPossibleValues: () => Promise.resolve(['0', '1', '2', '3'])
  },
  {
    tag: config.TAG_PROJECT,
    description: 'Set project',
    getPossibleValues: () => getCachedProjectNames()
  },
  {
    tag: config.TAG_DATE,
    description: 'Set date',
    getPossibleValues: () => Promise.resolve(DAY_NAMES)
  },
  {
    tag: config.TAG_SCHEDULE,
    description: 'Schedule in calendar',
    getPossibleValues: () => Promise.resolve(['30', '45', '60', '90', '120'])
  }
];


/**
 * Gets cached project names
 * @returns {PromiseLike<ArrayLike<string>>} Project names
 */
function getCachedProjectNames() {
  return chrome.storage.local.get(PROJECT_NAMES_KEY).then((result) => result[PROJECT_NAMES_KEY] || []);
}


/**
 * Sets cached project names
 * @param {ArrayLike<string>} names Project names
 */
function setCachedProjectNames(names) {
  chrome.storage.local.set({[PROJECT_NAMES_KEY]: names});
}


/**
 * Updates cached project names asynchronously
 */
function updatedCachedProjectNames() {
  const range = `R${1 + config.HEADER_ROWS}C${config.PROJECT_COLUMN}:C${config.PROJECT_COLUMN}`; // in R1C1 notation
  const url = `${SHEETS_API}/${config.SPREADSHEET_ID}/values/${range}?majorDimension=COLUMNS`;
  sendRequest('GET', url)
      .then((response) => response.json())
      .then(({values}) => {
        let projectNames = values[0];

        // Trim whitespace and filter out empty values
        projectNames = projectNames
            .map((name) => name.trim())
            .filter((name) => name.length > 0);

        // Remove duplicates
        projectNames = [...new Set(projectNames)]

        // Cache names
        setCachedProjectNames(projectNames);
      })
      .catch((error) => {
        console.error(error);
      });
}


/**
 * Extracts title and tags (e.g. "project") with corresponding values (e.g. "My Project") from user-entered input into
 * the Omnibox
 * @param input User-entered input into Omnibox
 * @returns {{title: string, tags: {raw: *, tag: *, value: *}[]}} Title, tags and values
 */
function parseInput(input) {

  // Regex to extract tags from raw input. The capture group 'tag' captures the tag name (e.g. "project"), 'value'
  // captures the corresponding value (e.g. "My Project"), and 'raw' the full expression (e.g. "#project:(My Project)")
  const matches = [...input.matchAll(/(^|\s)(?<raw>#(?<tag>\w*)(:(?<value>\(([^()]*)\)|(\S*))?)?)/g)];

  // Extract title of item by removing tags and values
  let title = input;
  for (const match of matches) {
    title = title.replaceAll(match[0], '');
  }
  title = title.trim();

  // Extract tags and value
  const tags = matches.map((match) => {
    // Trim parentheses around value if needed
    let value = match.groups.value;
    value = value && value.startsWith('(') && value.endsWith(')') ? value.substring(1, value.length - 1) : value

    return {
      tag: match.groups.tag,
      value: value,
      raw: match.groups.raw
    }
  });
  
  return {
    title,
    tags
  };
}


/**
 * Parses user-entered value for date tag and finds corresponding date
 * @param {string} value User-entered value for date tag
 * @returns {int} Number of days after current date. If no valid value is provided, -1 is returned.
 */
function parseDateValue(value) {

  if(value == null) {
    return -1;
  }

  // Split suffix with weeks to add (e.g. "3") from provided value (e.g. "Mon+3")
  const regex = /^([A-Za-z]+)\+(\d+)$/;
  const match = value.match(regex);
  value = match ? match[1] : value;
  const weeksToAdd = match ? Number.parseInt(match[2]) : 0;

  // Parse non-negative integer value
  if (/^[0-9]+$/.test(value)) {
    return parseInt(value);
  }

  // Parse shortcuts like “Monday” or “mon” and determine day of week
  const dayOfWeek = DAY_NAMES.findIndex((day) => {
    const lowerDay = day.toLowerCase();
    const lowerValue = value.toLowerCase();
    return lowerValue.length === 3 && lowerDay.startsWith(lowerValue) || lowerDay === lowerValue;
  });

  // Not a valid shortcut
  if (dayOfWeek < 0) {
    return -1;
  }

  // Calculate days from now until the given day of week
  let daysFromNow = dayOfWeek - new Date().getDay();
  if (daysFromNow <= 0) {
    daysFromNow += 7;
  }
  return daysFromNow + weeksToAdd * 7;
}


/**
 * Parses links contained in given markdown text.
 * @param {string} text Markdown text
 * @returns {text: string, links: [{ startIndex: int, endIndex: int, url: string}]} Text without markdown, and parsed links
 */
function parseMarkdown(text) {
  const matches = [...text.matchAll(/(?<markdown>\[(?<text>[^\[]+)\]\((?<url>[^\]\(]*)\))/g)];
  const links = [];
  let removedCharacters = 0;
  for (const match of matches) {
    const { markdown, text: linkText, url } = match.groups;
    const index = match.index - removedCharacters;
    text = text.substring(0, index) + linkText + text.substring(index + markdown.length);
    removedCharacters += markdown.length - linkText.length;
    links.push({ startIndex: index, endIndex: index + linkText.length, url: url});
  }
  return {
    text,
    links
  }
}


/**
 * Gets suggestions for Omnibox based on user input
 * @param input User-entered input into Omnibox
 * @returns {Promise<*[]>|Promise<{deletable: boolean, description: string, content: string}[]>} Suggestions for Omnibox
 */
function getSuggestions(input) {

  // Extract tags from input (e.g. "#prio"
  const {tags} = parseInput(input);

  // Check if any tags are found
  if (tags.length === 0) {
    return Promise.resolve([]);
  }

  // Get last tag expression
  const lastTag = tags[tags.length - 1];

  // If input does not end with a tag expression, don't suggest anything
  if (!input.endsWith(lastTag.raw)) {
    return Promise.resolve([]);
  }

  // If tag expression includes any value (e.g. "#project:S"), suggest matching values
  if (lastTag.value) {
    const tag = TAGS.find((tag) => tag.tag === lastTag.tag);

    if (!tag || !tag.getPossibleValues) {
      return Promise.resolve([]);
    }

    // Determine suggestions
    return tag.getPossibleValues()
        .then((values) => {

          return values
              // Find matching inputs, ignoring case
              .filter((value) => value.toUpperCase().startsWith(lastTag.value.toUpperCase()))

              // Format suggestions
              .map((suggestion) => {

                // Wrap in parentheses if suggestion contains whitespace
                const wrappedSuggestion = /\s/g.test(suggestion) ? `(${suggestion})` : suggestion;

                return {
                  content: `${input.substring(0, input.length - lastTag.value.length) + wrappedSuggestion} `, // trailing space
                  description: `<dim>#${tag.tag}:</dim> <match><url>${suggestion}</url></match>`,
                  deletable: false
                }
              });
        })
  }

  // Determine other full tags (e.g. "project") that are present in input
  const otherTags = tags
      .map((tag) => tag.tag)
      .filter((otherTag) => {
        const isKnownTag = TAGS.some((tag) => tag.tag === otherTag);
        return isKnownTag && otherTag !== lastTag.tag;
      });

  // Determine tags to suggest
  const suggestions = TAGS
      .filter((tag) => tag.tag.startsWith(lastTag.tag) && !otherTags.includes(tag.tag))
      .map((tag) => {
        return {
          content: input.substring(0, input.length - lastTag.raw.length) + '#' +  tag.tag + ':',
          description: `<match><url>#${tag.tag}</url></match><dim>  -  ${tag.description}</dim> `,
          deletable: false
        }
      });
  return Promise.resolve(suggestions);
}


/**
 * Sends a request to the Google Sheets API
 * @param method HTTP method
 * @param url URL
 * @param body Body (optional)
 * @returns {PromiseLike<unknown>} Response
 */
function sendRequest(method, url, body = undefined) {
  return chrome.identity.getAuthToken({interactive: true})
      .then(({token}) => {
        const headers = {
          'Content-type': 'application/json',
          'Authorization': 'Bearer ' + token,
        };
        return fetch(url, {
          method,
          headers,
          body,
        });
      })
      .then((response) => {
        if (response.ok) {
            return response;
          } else {
            return response.text().then((text) => { throw new Error(text) });
          }
      });
}


/**
 * Inserts new item into spreadsheet
 * @param input Raw user-entered input into Omnibox
 */
function insertItem(input) {

  // Parse input
  const {title, tags} = parseInput(input);
  const consolidatedTags = {};
  for (const tag of tags) {
    if (tag.value) {
      consolidatedTags[tag.tag] = tag.value;
    }
  }
  const project = consolidatedTags[config.TAG_PROJECT];
  const priority = consolidatedTags[config.TAG_PRIORITY];
  const dateValue = consolidatedTags[config.TAG_DATE];
  const durationValue = consolidatedTags[config.TAG_SCHEDULE];
  const duration = /^[0-9]+$/.test(durationValue) ? parseInt(durationValue) : undefined;

  // Determine date and status
  let date = undefined;
  let status = undefined;
  const daysFromNow = parseDateValue(dateValue);
  if (daysFromNow === 0) {
    status = config.STATUS_NEXT;
  } else if (daysFromNow > 0) {
    status = config.STATUS_WAITING;

    // Format date as serial number, see https://developers.google.com/sheets/api/reference/rest/v4/DateTimeRenderOption
    // and use the beginning of the day at 00:00:00
    const today = new Date();
    date = 25569.0 + daysFromNow + Math.floor((today.getTime() - today.getTimezoneOffset() * 60 * 1000) / (1000 * 60 * 60 * 24));
  } else {

    // Set status to 'Next' if item should be added to calendar but no date was provided
    if (duration !== undefined) {
      status = config.STATUS_NEXT;
    }
  }

  // Insert item into spreadsheet and show notification if successful
  const url = `${SHEETS_API}/${config.SPREADSHEET_ID}:batchUpdate`;
  const body = JSON.stringify({requests: batchUpdateRequests(title, project, priority, status, date, duration)});
  sendRequest('POST', url, body)
      .then(() => {
        const { text: renderedTitle } = parseMarkdown(title);
        console.log(`Item added: "${renderedTitle}"`);
        chrome.notifications.create(null, {
          type: 'basic',
          iconUrl: 'icon128.png',
          title: 'Item added',
          message: renderedTitle,
          eventTime: Date.now() + 2000,
          priority: 1
        });
      })
      .catch((error) => {
        console.error(error);
      });
}


/**
 * Returns batch update requests for Google Sheets API
 * @param {string} title Title of new item (may contain links in markdown format)
 * @param {string} project Project (optional)
 * @param {int} priority Priority (optional)
 * @param {string} status Status (optional)
 * @param {number} date Date in serial number format, see https://developers.google.com/sheets/api/reference/rest/v4/DateTimeRenderOption (optional)
 * @param {number} duration
 * @returns {object} Update requests
 */
function batchUpdateRequests(title,
                             project = undefined,
                             priority = undefined,
                             status = undefined,
                             date = undefined,
                             duration = undefined) {
  const requests = [];

  // Insert new row at the top
  requests.push({
    insertDimension: {
          range: {sheetId: config.SHEET_ID, dimension: "ROWS", startIndex: 1, endIndex: 2},
          inheritFromBefore: false
        }
  });

  // Set title
  const { text: renderedTitle, links } = parseMarkdown(title);
  requests.push(writeValueUpdateRequest(config.TITLE_COLUMN, renderedTitle, false, links));

  // Set project
  if (project) {
    requests.push(writeValueUpdateRequest(config.PROJECT_COLUMN, project));
  }

  // Set priority
  if (priority !== undefined) {
    requests.push(writeValueUpdateRequest(config.PRIORITY_COLUMN, priority, true));
  }

  // Set status
  if (status) {
    requests.push(writeValueUpdateRequest(config.STATUS_COLUMN, status));
  }

  // Set duration
  if (duration !== undefined) {
    requests.push(writeValueUpdateRequest(config.SCHEDULED_TIME_COLUMN, duration, true));

    // Mark item as silently schedulable
    const metaDataRequest = {
      createDeveloperMetadata: {
        developerMetadata: {
          location: {
            dimensionRange: {
              sheetId: config.SHEET_ID,
              dimension: "ROWS",
                  startIndex: config.HEADER_ROWS,
                  endIndex: config.HEADER_ROWS + 1
                }
              },
              visibility: "DOCUMENT",
              metadataKey: config.SILENTLY_SCHEDULABLE_DEVELOPER_META_DATA_KEY,
              metadataValue: "" // no value needed, key suffices
            }
          }
    };
    requests.push(metaDataRequest);
  }

  // Set date
  if (date !== undefined) {
    requests.push(writeValueUpdateRequest(config.DATE_COLUMN, date, true));
  }

  return requests;
}


/**
 * Returns update requests for Google Sheets API to write a single value into the given column of
 * the first non-header row.
 * @param {int} columnIndex One-based index of column
 * @param {object} value Value to insert
 * @param {boolean} numeric Whether value is numeric or a string
 * @param {[{ startIndex, endIndex, url}]} links Links to be inserted, in order of appearance
 * @returns {object} Update request
 */
function writeValueUpdateRequest(columnIndex, value, numeric = false, links = null) {
  
  // Compile cell data.
  let fields;
  const cellData = {};
  if (numeric) {
    fields = "userEnteredValue";
    cellData.userEnteredValue = { numberValue: value};
  } else {
    fields = "userEnteredValue,textFormatRuns";
    cellData.userEnteredValue = { stringValue: value};
    
    // Format links inside cell.
    if (links?.length) {
      cellData.textFormatRuns = [];
      for (const { startIndex, endIndex, url} of links) {
        cellData.textFormatRuns.push({ format: { link: { uri: url } }, startIndex: startIndex });
        if (endIndex < value.length) {
          cellData.textFormatRuns.push({ startIndex: endIndex });
        }
      }
    }
  }

  // Compile request.
  return {
    updateCells: {
      start: {
        sheetId: config.SHEET_ID,
        rowIndex: config.HEADER_ROWS,
        columnIndex: columnIndex - 1
      },
      fields: fields,
      rows: { values: [cellData] }
    }
  }
}


/**
 * Switches to or opens a tab matching a provided URL
 * @param urlPattern Pattern to match open tabs against
 * @param url URL to open if no corresponding tab is found
 */
async function switchToTab(urlPattern, url) {

  const tabs = await chrome.tabs.query({url: urlPattern});
  let tab = tabs.length > 0 ? tabs[0] : null;

  // Open tab if needed
  if (tab == null) {
    
    // Open window if needed
    const windows = await chrome.windows.getAll({windowTypes: ['normal']});
    let tabsToClose = null;
    if (windows.length == 0) {
      const window = await chrome.windows.create({focused: true});
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
  await chrome.windows.update(tab.windowId, {focused: true});
}

function switchToSpreadsheet() {
  switchToTab(
    `https://docs.google.com/*/${config.SPREADSHEET_ID}*`,
    `https://docs.google.com/spreadsheets/d/${config.SPREADSHEET_ID}/edit`
  );
}

function switchToInbox() {
  switchToTab(
    'https://mail.google.com/*',
    'https://mail.google.com/mail/u/0'
  );
}

function switchToCalendar() {
  switchToTab(
    'https://calendar.google.com/*',
    'https://calendar.google.com/calendar/u/0'
  );
}

chrome.omnibox.onInputStarted.addListener(() => {
  // Fetch and cache project names from sheet
  updatedCachedProjectNames();
});

chrome.omnibox.onInputChanged.addListener((input, suggest) => {
  // Display suggestions
  getSuggestions(input).then((suggestions) => suggest(suggestions));
});

chrome.omnibox.onInputEntered.addListener((input, _) => {

  switch (input) {
    case '':
      switchToSpreadsheet();
      break;

    case 'i':
      switchToInbox();
      break;

    case 'c':
      switchToCalendar();
      break;

    default:
      insertItem(input);
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-mission-control') {
    switchToSpreadsheet();
  } else if (command === 'open-inbox') {
    switchToInbox();
  } else if (command === 'open-calendar') {
    switchToCalendar();
  }
});