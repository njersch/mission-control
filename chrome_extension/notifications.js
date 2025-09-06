/**
 * Shows a notification.
 * 
 * @param {string} title Title of the notification.
 * @param {string} message Message of the notification.
 * @param {number} eventTime Time of the notification.
 * @param {string} notificationId ID of the notification.
 */
export function showNotification({
  message,
  eventTime = Date.now(),
  notificationId = null
}) {
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icon128.png',
    title: 'Mission Control',
    message: message,
    eventTime: eventTime,
    priority: 1
  });
}


/**
 * Clears a notification.
 * 
 * @param {string} notificationId ID of the notification to clear.
 */
export function clearNotification(notificationId) {
  chrome.notifications.clear(notificationId);
}