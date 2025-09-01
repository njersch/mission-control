/**
 * Marks the currently selected or focused item as done.
 * The caller must have already checked that the current tab shows the backlog sheet.
 */
function markItemAsDone(completedColumn) {

  let cellIndex = getCurrentCellIndex();
  if (!cellIndex) {
    return;
  }

  // Split cell index into column and row.
  cellIndex = splitCellIndex(cellIndex);
  if (!cellIndex) {
    return;
  }

  // Ignore header row.
  if (cellIndex.row < 2) {
    return;
  }

  // Mark to-do as done.
  setCellValue(`${completedColumn}${cellIndex.row}`, true, false);
}


/**
 * Splits a cell index into column and row.
 * @param {string} cellIndex The cell index to split (e.g., "A1").
 * @returns {object} The column and row (e.g., { column: "A", row: 1 }) or null if the cell index
 * is invalid.
 */
function splitCellIndex(cellIndex) {
  const match = cellIndex.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    return null;
  }
  return { column: match[1], row: parseInt(match[2]) };
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'mark_item_done') {
    markItemAsDone(message.completedColumn);
    sendResponse({ success: true });
  } else if (message.action === 'show_error') {
    alert(message.error);
    sendResponse({ success: true });
  }
});