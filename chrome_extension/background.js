import * as omnibox from './omnibox.js';
import * as commands from './commands.js';


chrome.omnibox.onInputStarted.addListener(omnibox.onInputStarted);
chrome.omnibox.onInputChanged.addListener(omnibox.onInputChanged);
chrome.omnibox.onInputEntered.addListener(omnibox.onInputEntered);

chrome.commands.onCommand.addListener(commands.execute);