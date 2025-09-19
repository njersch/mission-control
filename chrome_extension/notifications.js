/**
 * Shows a notification.
 * 
 * @param {string} title Title of the notification.
 * @param {string} message Message of the notification.
 * @param {number} eventTime Time of the notification.
 * @param {string} notificationId ID of the notification.
 * @returns {string} ID of the created notification.
 */
export async function showNotification({
  message,
  eventTime = Date.now(),
  notificationId = null,
}) {
  return await chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icon128.png',
    title: 'Mission Control',
    message: message,
    eventTime: eventTime,
    priority: 1
  });
}


/**
 * Updates a notification.
 * 
 * @param {string} message Message of the notification.
 * @param {string} notificationId ID of the notification to update.
 * @returns {string} ID of the updated notification.
 */
export async function updateNotification({
  notificationId,
  message
}) {
  return await chrome.notifications.update(notificationId, {
    message: message
  });
}


/**
 * Clears a notification.
 * 
 * @param {string} notificationId ID of the notification to clear.
 */
export async function clearNotification(notificationId) {
  await chrome.notifications.clear(notificationId);
}