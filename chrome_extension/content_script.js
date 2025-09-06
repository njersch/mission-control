/**
 * Marks the currently selected or focused item as done.
 * The caller must have already checked that the current tab shows the backlog sheet.
 */
async function markItemsAsDone(completedColumn) {

  let cellIndex = getCurrentCellIndex();
  if (!cellIndex) {
    return;
  }

  // Parse cell index.
  const { start, end } = parseCellIndex(cellIndex);
  if (!start || !end) {
    return;
  }

  // For each row in the range, mark item as done.
  for (let row = start.row; row <= end.row; row++) {

    // Ignore header row.
    if (row < 2) {
      continue;
    }

    // Mark item as done.
    await setCellValue(`${completedColumn}${row}`, true, false);
  }
}


/**
 * Parses a cell index or range into column and row objects.
 * Handles single cell (e.g., "A1") or range (e.g., "A1:B2").
 * 
 * @param {string} cellIndex The cell index or range to parse.
 * @returns {object} `{ start: { column, row }, end: { column, row } }`, or null if invalid.
 */
function parseCellIndex(cellIndex) {
  
  // Handle range references like "A1:B2".
  const rangeMatch = cellIndex.match(/^(?<startCol>[A-Z]+)(?<startRow>\d+):(?<endCol>[A-Z]+)(?<endRow>\d+)$/);
  if (rangeMatch && rangeMatch.groups) {
    return {
      start: { column: rangeMatch.groups.startCol, row: parseInt(rangeMatch.groups.startRow) },
      end: { column: rangeMatch.groups.endCol, row: parseInt(rangeMatch.groups.endRow) }
    };
  }

  // Handle single cell like "A1".
  const cellMatch = cellIndex.match(/^(?<col>[A-Z]+)(?<row>\d+)$/);
  if (cellMatch && cellMatch.groups) {
    const cell = { column: cellMatch.groups.col, row: parseInt(cellMatch.groups.row) };
    return {
      start: cell,
      end: cell
    };
  }
  return null;
}


/**
 * Gets the value of the currently selected cell in Google Sheets.
 * @returns {string} The value of the current cell.
 */
function getCurrentCellValue() {
  const cellValue = document.querySelector('.cell-input').innerText;
  return cellValue.trim();
}


/**
 * Gets the index of the currently selected cell in Google Sheets.
 * @returns {string} The index of the current cell (e.g., "A1", "B2").
 */
function getCurrentCellIndex() {
  const cellIndex = document.querySelector(".waffle-name-box").value;
  return cellIndex;
}


/**
 * Sets the index of the selected cell in Google Sheets.
 * @param {string|object} cellIndex - The index of the cell to set (e.g., "A1", "B2") or a JSON object { column, row }.
 */
async function setCurrentCellIndex(cellIndex) {
  const inputBox = document.querySelector(".waffle-name-box");

  if (typeof cellIndex === "string") {
    inputBox.value = cellIndex;
  } else if (typeof cellIndex === "object") {
    const column = cellIndex.column || "";
    const row = cellIndex.row || "";
    inputBox.value = column + row;
  }

  // Trigger click event
  const clickEvent = new MouseEvent("click", {
    view: window,
    bubbles: true,
    cancelable: true,
  });
  inputBox.dispatchEvent(clickEvent);

  // Trigger enter key event
  const enterEvent = new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    view: window,
    bubbles: true,
    cancelable: true,
  });
  inputBox.dispatchEvent(enterEvent);
}


/**
 * Sets the value of the specified cell in Google Sheets by simulating a user action.
 * @param {string} cellIndex The index of the cell to set the value of (e.g., "A1", "B2").
 * @param {string} value The value to set in the cell.
 */
async function setCellValue(cellIndex, value, preserveCellIndex = true) {
  const previousCellIndex = getCurrentCellIndex();
  await setCurrentCellIndex(cellIndex);
  await simulateValueSet(value);
  await simulateValueSet(value);
  await setCurrentCellIndex(previousCellIndex);
}


/**
 * Sets the value of the currently selected cell in Google Sheets by simulating a user action.
 * @param {string} value The value to set in the cell.
 */
async function simulateValueSet(value) {
  const inputBox = document.querySelector('.cell-input');

  if (!inputBox) {
    return;
  }

  // Trigger keydown event
  const keydownEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    view: window,
    bubbles: true,
    cancelable: true,
  });
  inputBox.dispatchEvent(keydownEvent);

  // Set the cell value
  inputBox.innerText = value;

  // Trigger input event
  const inputEvent = new Event('input', {
    bubbles: true,
    cancelable: true,
  });
  inputBox.dispatchEvent(inputEvent);

  // Trigger keydown event
  const keydownPress = new KeyboardEvent('keypress', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    view: window,
    bubbles: true,
    cancelable: true,
  });
  inputBox.dispatchEvent(keydownPress);
}


// Listen for messages from the background script.
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'mark_item_done') {
    await markItemsAsDone(message.completedColumn);
    sendResponse({ success: true });
  } else if (message.action === 'show_error') {
    alert(message.error);
    sendResponse({ success: true });
  }
});