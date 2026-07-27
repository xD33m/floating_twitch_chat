// Renders the promo tiles next to this file to PNGs at their exact required
// pixel size, using the Chrome that is already installed. The store rejects a
// tile that is even one pixel off, so the window size is not negotiable and the
// device scale factor is pinned to 1.
//
//   node store/promo/render.mjs
//
// Set CHROME to override the executable path.

import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const here = import.meta.dirname;

const TILES = [
	{ file: 'marquee-1400x560.html', out: 'marquee-1400x560.png', w: 1400, h: 560 },
	{ file: 'small-tile-440x280.html', out: 'small-tile-440x280.png', w: 440, h: 280 },
];

const CANDIDATES = [
	process.env.CHROME,
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
	`${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium',
].filter(Boolean);

let chrome;
for (const candidate of CANDIDATES) {
	try {
		await access(candidate);
		chrome = candidate;
		break;
	} catch {
		// keep looking
	}
}

if (!chrome) {
	console.error('No Chrome found. Set CHROME to the executable path.');
	process.exit(1);
}

for (const tile of TILES) {
	const out = path.join(here, tile.out);
	await run(chrome, [
		'--headless=new',
		'--disable-gpu',
		'--hide-scrollbars',
		'--force-device-scale-factor=1',
		`--window-size=${tile.w},${tile.h}`,
		`--screenshot=${out}`,
		`file:///${path.join(here, tile.file).replaceAll('\\', '/')}`,
	]);
	console.log(`${tile.out}  ${tile.w}x${tile.h}`);
}
