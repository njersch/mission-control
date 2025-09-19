#!/bin/bash

# Script to push all changes to Google Apps Script and redeploy web app.

# Push changes to Google Apps Script.
clasp push

# Find deployment ID for web app.
ID=$(clasp deployments | grep 'Web App$' | awk '{print $2}')

# Abort if multiple deployments are found.
if [ $(echo "$ID" | wc -l) -ne 1 ]; then
  echo "Multiple deployments found."
  exit 1
fi

# Redeploy web app.
clasp deploy -i "$ID" -d 'Web App'
