/* global chrome */
/*
 * MV3 service worker. It only answers `getScreenState`, because chrome.windows
 * is not reachable from a content script. The worker is event driven and may be
 * torn down between messages, so it must not hold any state.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message !== 'getScreenState') {
		return false;
	}

	if (!sender.tab) {
		sendResponse(null);
		return false;
	}

	chrome.windows.get(sender.tab.windowId, (chromeWindow) => {
		// "normal", "minimized", "maximized" or "fullscreen"
		sendResponse(chrome.runtime.lastError ? null : chromeWindow.state);
	});

	return true; // keep the message channel open for the async sendResponse
});
