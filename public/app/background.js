/*global chrome*/
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (message === 'getScreenState') {
		chrome.windows.get(sender.tab.windowId, function (chromeWindow) {
			// "normal", "minimized", "maximized" or "fullscreen"
			sendResponse(chromeWindow.state);
		});
		return true; // Signifies that we want to use sendResponse asynchronously
	}
});
