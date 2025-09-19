import config from './config.js';


/**
 * Sends a request to the deployed web app.
 * @param {string} method HTTP method, "GET" or "POST"
 * @param {string} path Path, relative to the deployed web app URL
 * @param {Object} params Parameters
 * @returns {PromiseLike<Object>} Parsed response data
 */
export async function sendRequest(method, path, params = {}) {

  // Make request.
  const url = `${config.WEB_APP_DEPLOYMENT_URL}/${path}?${new URLSearchParams(params).toString()}`;
  const response = await fetch(url, { method });

  // Throw error if request failed.
  if (!response.ok) {
    throw new Error(await response.text());
  }

  // Parse response.
  const data = await response.json();
  if (!data.success) {
    throw new Error('Failed to make request to web app: ' + data.error);
  }
  return data.data;
}