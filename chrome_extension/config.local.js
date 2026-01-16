export default {
  // ID of the backlog spreadsheet.
  SPREADSHEET_ID: '',
  
  // Deployment URL of script to which a POST request can be made to schedule items.
  WEB_APP_DEPLOYMENT_URL: '',
  
  // Actions for configurable keyboards shortcuts.
  //
  // Example usage:
  // CONFIGURABLE_SHORTCUTS: {
  //   // Actions for "Configurable shortcut 1"
  //   '1': [
  //     
  //     // First action
  //     {
  //       'url_filter': 'https://example.com/*', // regex to filter tabs based on URLs
  //       'current_tab_only': true, // whether to perform action only if current tab matches URL filter above
  //       'execute_command': 'my-command', // name of command to execute, as declared under "commands" in manifest
  //       'execute_code: (tabId) => {…}, // function to execute, taking as argument the ID of the tab matching the URL filter above
  //       'switch_to_tab': 'https://example.com', // whether to switch to tab matching URL filter above or open a new tab with the provided URL
  //       'change_url': 'https://example.com/foo#bar', // URL to set in last accessed tab that matches URL filter above
  //     },
  //     // Second action
  //     { /* ... */ }
  //
  //   // Actions for "Configurable shortcut 2"
  //   '2': { /* ... */ }
  // }
  CONFIGURABLE_SHORTCUTS: {}
}
