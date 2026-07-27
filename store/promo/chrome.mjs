// Locating the installed Chrome, shared by capture-popup.mjs and render.mjs.
// Set CHROME to override.

import { access } from 'node:fs/promises';

const CANDIDATES = [
	process.env.CHROME,
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
	`${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium',
].filter(Boolean);

export async function findChrome() {
	for (const candidate of CANDIDATES) {
		try {
			await access(candidate);
			return candidate;
		} catch {
			// keep looking
		}
	}
	console.error('No Chrome found. Set CHROME to the executable path.');
	process.exit(1);
}
