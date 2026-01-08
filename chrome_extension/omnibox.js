import config from './config.js';
import * as notifications from './notifications.js';
import * as webApp from './web_app.js';


/** Storage key for cached project names */
const PROJECT_NAMES_KEY = 'project_names';


/** Day names, in order such that index corresponds to JS's Date.getDay() */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


/** Tags and corresponding suggestions */
const TAGS = [
  {
    tag: config.TAG_PROJECT,
    description: 'Set project',
    getPossibleValues: () => getCachedProjectNames()
  },
  {
    tag: config.TAG_PRIORITY,
    description: 'Set priority',
    getPossibleValues: () => Promise.resolve(['0', '1', '2', '3'])
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
 * Listener for when user starts typing in Omnibox.
 */
export function onInputStarted() {
  updateCachedProjectNames();
}


/**
 * Listener for when user changes input in Omnibox.
 */
export function onInputChanged(input, suggest) {
  getSuggestions(input).then(suggest);
}


/**
 * Listener for when user presses Enter in Omnibox.
 */
export function onInputEntered(input, _) {
  if (input.length > 0) {
    insertItem(input);
  }
}


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
  chrome.storage.local.set({ [PROJECT_NAMES_KEY]: names });
}


/**
 * Updates cached project names asynchronously
 */
async function updateCachedProjectNames() {
  const projectNames = await webApp.sendRequest('GET', 'project-names');
  setCachedProjectNames(projectNames);
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
 * Gets suggestions for Omnibox based on user input.
 * @param input User-entered input into Omnibox
 * @returns {ArrayLike<{deletable: boolean, description: string, content: string}>} Suggestions for Omnibox
 */
async function getSuggestions(input) {

  // Extract tags from input (e.g. "#prio").
  const { tags } = parseInput(input);

  // Determine complete tags (e.g. "project"), i.e. valid tags that are already present in input.
  const completeTags = tags.filter((tag) => TAGS.some((otherTag) => tag.tag === otherTag.tag));

  // Determine missing tags, i.e. tags that are not yet present in input.
  const missingTags = TAGS.filter((tag) => !completeTags.some((otherTag) => tag.tag === otherTag.tag));

  // If input ends with a space, suggest all missing tags.
  if (input.endsWith(' ')) {
    return getTagSuggestions(input, null, missingTags);
  }

  // If there are no tags at all, don't suggest anything.
  if (tags.length === 0) {
    return [];
  }

  const lastTag = tags[tags.length - 1];

  // If input ends on value entry (e.g. "#project:S" or "#project:"), suggest matching values.
  if (input.endsWith(lastTag.raw) && lastTag.value) {
    return getTagValueSuggestions(input, lastTag.tag, lastTag.value);
  }

  // If input ends on tag entry (e.g. "#proj"), suggest matching tags from missing tags.
  if (input.endsWith(lastTag.raw)) {
    return getTagSuggestions(input, lastTag.raw, missingTags);
  }

  return [];
}


/**
 * Gets Omnibox suggestions for tags that match a given prefix.
 * @param {string} input User-entered input into Omnibox
 * @param {string} rawTagPrefix Raw tag prefix (e.g. "#project")
 * @param {ArrayLike<{tag: string, description: string}>} tags Tags to suggest
 * @returns {ArrayLike} Suggestions for Omnibox
 */
function getTagSuggestions(input, rawTagPrefix, tags) {

  // Determine tags that match provided prefix.
  let matchingTags = tags;
  if (rawTagPrefix) {
    matchingTags = matchingTags.filter((tag) => `#${tag.tag}`.startsWith(rawTagPrefix));
  }

  const suggestions = matchingTags.map((tag) => {
    const prefixLength = rawTagPrefix ? rawTagPrefix.length : 0;
    return {
      content: input.substring(0, input.length - prefixLength) + '#' + tag.tag + ':',
      description: `<match><url>#${tag.tag}</url></match><dim>  -  ${tag.description}</dim> `,
      deletable: false
    }
  });

  return suggestions;
}


/**
 * Gets Omnibox suggestions for values of a given tag that match a given prefix.
 * @param {string} input User-entered input into Omnibox
 * @param {string} tag Tag (e.g. "project")
 * @param {string} valuePrefix Value prefix (e.g. "S")
 * @returns {ArrayLike} Suggestions for Omnibox
 */
async function getTagValueSuggestions(input, tag, valuePrefix) {

  // Get function to determine possible values.
  const matchingTag = TAGS.find((otherTag) => otherTag.tag === tag);

  if (!matchingTag) {
    return [];
  }

  // Determine possible values.
  let values = await matchingTag.getPossibleValues();
  values = values.filter((value) => value.toUpperCase().startsWith(valuePrefix.toUpperCase()));

  // Format suggestions.
  return values.map((value) => {

    // Wrap suggested value in parentheses if it contains whitespace.
    const wrappedValue = /\s/g.test(value) ? `(${value})` : value;

    return {
      content: `${input.substring(0, input.length - valuePrefix.length) + wrappedValue} `, // trailing space
      description: `<dim>#${matchingTag.tag}:</dim> <match><url>${value}</url></match>`,
      deletable: false
    }
  });
}


/**
 * Inserts new item into backlog.
 * @param input Raw user-entered input into Omnibox
 */
async function insertItem(input) {

  // Parse input.
  const { title, tags } = parseInput(input);
  const consolidatedTags = {};
  for (const tag of tags) {
    if (tag.value) {
      consolidatedTags[tag.tag] = tag.value;
    }
  }
  const project = consolidatedTags[config.TAG_PROJECT];
  const priority = consolidatedTags[config.TAG_PRIORITY];
  let dayShortcut = consolidatedTags[config.TAG_DATE];
  const scheduledTime = consolidatedTags[config.TAG_SCHEDULE];

  // Determine status.
  let status;
  if (dayShortcut) {
    if (dayShortcut === '0') {
      dayShortcut = undefined;
      status = config.STATUS_NEXT;
    } else {
      status = config.STATUS_WAITING;
    }
  } else if (scheduledTime) {
    status = config.STATUS_NEXT;
  }

  // Assemble parameters, excluding undefined values.
  let params = {
    title,
    project,
    priority,
    status,
    dayShortcut,
    scheduledTime,
  };
  params = Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined));

  // Make request and show notifications.
  // Immediately show a notification for a more responsive UX.
  // Update notification on success.
  // Show a fresh error notification on failure.
  const displayedTitle = title ? getDisplayedTitle(title) : title;
  const notificationId = await notifications.showNotification({
    message: `Adding item: ${displayedTitle}`,
  });
  try {
    await webApp.sendRequest('POST', 'create-backlog-item', params);
  } catch (error) {
    await notifications.showNotification({
      message: `Error adding item: ${displayedTitle}`,
      eventTime: Date.now() + 1 * 1000, // 1 second delay
    });
    notifications.clearNotification(notificationId);
    throw error;
  }
  notifications.updateNotification({
    notificationId,
    message: `Item added: ${displayedTitle}`,
  });
}


/**
 * Gets displayed title of item by removing markdown links.
 */
function getDisplayedTitle(title) {
  const matches = [...title.matchAll(/(?<markdown>\[(?<text>[^\[]+)\]\((?<url>[^\)]*)\))/g)];
  let removedCharacters = 0;
  for (const match of matches) {
    const { markdown, text } = match.groups;
    const index = match.index - removedCharacters;
    title = title.substring(0, index) + text + title.substring(index + markdown.length);
    removedCharacters += markdown.length - text.length;
  }
  return title;
}