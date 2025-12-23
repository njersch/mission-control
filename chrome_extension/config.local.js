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
  //       'url_pattern': 'https://example.com/*', // URL pattern as defined in https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns
  //       'current_tab_only': true, // whether to perform action only if current tab matches URL pattern above
  //       'execute_command': 'my-command', // name of command to execute, as declared under "commands" in manifest
  //       'switch_to_tab': 'https://example.com', // whether to switch to tab matching URL pattern above or open a new tab with the provided URL
  //       'change_url': 'https://example.com/foo#bar', // URL to set in last accessed tab that matches URL pattern above
  //     },
  //     // Second action
  //     { /* ... */ }
  //
  //   // Actions for "Configurable shortcut 2"
  //   '2': { /* ... */ }
  // }
  CONFIGURABLE_SHORTCUTS: {}
}
