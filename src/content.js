/* global chrome */
/* src/content.js */
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

const DEFAULTS = {
	bgColor: 'rgba(0,0,0,0.5)',
	compactMode: false,
	disableOverlay: false,
	numberOfMessages: 10,
	chatHeight: 50,
	chatScale: 1,
};

function Main({ settings, currentStreamer }) {
	return (
		<App
			bgColor={settings.bgColor || DEFAULTS.bgColor}
			disableOverlay={settings.disableOverlay || DEFAULTS.disableOverlay}
			numberOfMessages={settings.numberOfMessages || DEFAULTS.numberOfMessages}
			compactMode={settings.compactMode || DEFAULTS.compactMode}
			chatHeight={settings.chatHeight || DEFAULTS.chatHeight}
			chatScale={settings.chatScale || DEFAULTS.chatScale}
			currentStreamer={currentStreamer}
		/>
	);
}

const app = document.createElement('div');
app.id = 'chat-overlay-root';

const PLAYER_OVERLAY_SELECTOR = '.video-player__overlay';

// twitch.tv/<something> is only a channel for a subset of top level paths.
const RESERVED_PATHS = new Set([
	'directory',
	'downloads',
	'drops',
	'friends',
	'jobs',
	'moderator',
	'p',
	'popout',
	'prime',
	'search',
	'settings',
	'store',
	'subscriptions',
	'team',
	'turbo',
	'u',
	'videos',
	'wallet',
]);

function currentStreamer() {
	const segments = window.location.pathname.split('/').filter(Boolean);
	if (segments.length !== 1) {
		return null;
	}
	const [name] = segments;
	if (RESERVED_PATHS.has(name.toLowerCase()) || !/^[\w]+$/.test(name)) {
		return null;
	}
	return name;
}

// chrome.windows is not reachable from a content script, so the service worker
// answers this. It can be asleep or gone (extension reloaded/updated), in which
// case we simply report "not fullscreen" instead of throwing.
function getScreenState() {
	return new Promise((resolve) => {
		try {
			chrome.runtime.sendMessage('getScreenState', (state) => {
				resolve(chrome.runtime.lastError ? null : state);
			});
		} catch (error) {
			resolve(null);
		}
	});
}

function getSettings() {
	return new Promise((resolve) => {
		try {
			chrome.storage.local.get((storage) => {
				resolve(chrome.runtime.lastError ? {} : storage || {});
			});
		} catch (error) {
			resolve({});
		}
	});
}

let mountedFor = null;

function unmount() {
	if (mountedFor !== null) {
		ReactDOM.unmountComponentAtNode(app);
		mountedFor = null;
	}
}

let syncing = false;

async function sync() {
	if (syncing) {
		return;
	}
	syncing = true;
	try {
		const streamer = currentStreamer();
		const state = await getScreenState();
		if (!streamer || state !== 'fullscreen') {
			unmount();
			return;
		}
		if (mountedFor === streamer) {
			return;
		}
		// Channel changed underneath us: tear the old chat client down first.
		unmount();
		const settings = await getSettings();
		ReactDOM.render(<Main settings={settings} currentStreamer={streamer} />, app);
		mountedFor = streamer;
	} finally {
		syncing = false;
	}
}

let lastPath = null;

// Twitch is a single page app: the player overlay is thrown away and rebuilt on
// navigation, so keep checking instead of attaching once and hoping for the
// best. The DOM query is cheap; sync() (which wakes the service worker) only
// runs when the path or the attachment actually changed.
function watch() {
	setInterval(() => {
		const overlay = document.querySelector(PLAYER_OVERLAY_SELECTOR);
		const path = window.location.pathname;
		let changed = path !== lastPath;
		lastPath = path;

		if (overlay && app.parentElement !== overlay) {
			overlay.appendChild(app);
			changed = true;
		} else if (!overlay && mountedFor !== null) {
			unmount();
		}

		if (changed) {
			sync();
		}
	}, 500);

	window.addEventListener('resize', () => sync(), false);
	document.addEventListener('fullscreenchange', () => sync(), false);
}

watch();
