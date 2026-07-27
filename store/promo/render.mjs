// Renders the listing artwork next to this file to PNGs at their exact required
// pixel size, using the Chrome that is already installed. The store rejects an
// image that is even one pixel off, so the window size is not negotiable and the
// device scale factor is pinned to 1.
//
//   node store/promo/render.mjs
//
// Needs no network: the 7TV emotes and the popup capture are committed. Set
// CHROME to override the executable path.

import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { findChrome } from './chrome.mjs';

const run = promisify(execFile);
const here = import.meta.dirname;

const IMAGES = [
	{ file: 'marquee-1400x560.html', out: 'marquee-1400x560.png', w: 1400, h: 560 },
	{ file: 'small-tile-440x280.html', out: 'small-tile-440x280.png', w: 440, h: 280 },
	{
		file: 'screenshot-1280x800.html',
		out: 'screenshot-1280x800.png',
		w: 1280,
		h: 800,
	},
	// Same layout as above, zoomed to half. The store wants every screenshot in a
	// listing at one size, so both sizes of the same image are the point.
	{
		file: 'screenshot-1280x800.html',
		query: '?scale=0.5',
		out: 'screenshot-640x400.png',
		w: 640,
		h: 400,
	},
];

const chrome = await findChrome();

for (const image of IMAGES) {
	const out = path.join(here, image.out);
	const url = `file:///${path.join(here, image.file).replaceAll('\\', '/')}${image.query ?? ''}`;
	await run(chrome, [
		'--headless=new',
		'--disable-gpu',
		'--hide-scrollbars',
		'--force-device-scale-factor=1',
		`--window-size=${image.w},${image.h}`,
		`--screenshot=${out}`,
		url,
	]);
	console.log(`${image.out}  ${image.w}x${image.h}`);
}
