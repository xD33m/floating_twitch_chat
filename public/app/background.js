/*global chrome*/
// Called when the user clicks on the browser action
chrome.browserAction.onClicked.addListener(function (tab) {
	// Send a message to the active tab
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		var activeTab = tabs[0];
		chrome.tabs.sendMessage(activeTab.id, { message: 'clicked_browser_action' });
	});
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (message === 'getScreenState') {
		chrome.windows.get(sender.tab.windowId, function (chromeWindow) {
			// "normal", "minimized", "maximized" or "fullscreen"
			sendResponse(chromeWindow.state);
		});
		return true; // Signifies that we want to use sendResponse asynchronously
	}
});
