/**
 * Handles requests to the deployed web app.
 */
class WebApp {

  constructor() {
    // Handlers for each request type, mapping request type to a map of path to handler.
    this.handlersForRequestType = {};
  }


  /**
   * Registers a handler for a given request type and path.
   * 
   * @param {string} requestType - The request type.
   * @param {string} path - The path.
   * @param {function} handler - The handler. Receives parameters from the request.
   */
  on(requestType, path, handler) {
    const handlers = this.getHandlers(requestType);
    handlers[path] = handler;
  }


  /**
   * Handles a request by calling the appropriate handler.
   * 
   * @param {string} requestType - The request type.
   * @param {Object} event - The event object as passed to `doGet` or `doPost`.
   * @returns {Object} The response as it would be returned by `doGet` or `doPost`.
   */
  handleRequest(requestType, event) {
    
    // Call handler with parameters and callback.
    // Make sure all errors inside handler are caught and reported to callback.
    const path = '/' + event.pathInfo;
    const handler = this.getHandler(requestType, path);
    try {
      if (!handler) {
        throw new Error(`No handler found for path: "${path}"`);
      }

      // Call handler with parameters.
      const params = event.parameter;
      const data = handler(params);

      return this.toJson({ success: true, data: data });
    } catch (error) {
      return this.toJson({ success: false, error: error.message });
    }
  }


  /**
   * Returns the handlers for a given request type.
   */
  getHandlers(requestType) {
    if (!this.handlersForRequestType[requestType]) {
      this.handlersForRequestType[requestType] = {};
    }
    return this.handlersForRequestType[requestType];
  }


  /**
   * Returns the handler for a given request type and path.
   */
  getHandler(requestType, path) {
    return this.getHandlers(requestType)[path];
  }

  
  /**
   * Returns TextOutput with the given data as JSON.
   */
  toJson(data) {
    const json = JSON.stringify(data);
    return ContentService.createTextOutput(json);
  }
}


/**
 * Supported request types.
 */
WebApp.RequestType = {
  GET: 'GET',
  POST: 'POST',
};