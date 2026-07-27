// Captures the extension's real popup into generated/popup.png, so the store
// screenshot shows the actual settings UI instead of a drawing of it that drifts
// out of date.
//
//   pnpm build && node store/promo/capture-popup.mjs
//
// It renders build/popup.html -- the built popup, its real stylesheet, its real
// bundle -- with a stand-in for the two chrome.* APIs the popup touches.
//
// Chrome screenshots the window, not the content, so this runs twice: once to
// read the laid-out height back out of the DOM, then once at exactly that size.
// A tight PNG lets the screenshot HTML round the panel's corners and place it
// without carrying a hardcoded crop height around.

import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { findChrome } from './chrome.mjs';

const run = promisify(execFile);
const here = import.meta.dirname;
const root = path.resolve(here, '../..');

let html;
try {
	html = await readFile(path.join(root, 'build', 'popup.html'), 'utf8');
} catch {
	console.error('No build/popup.html -- run pnpm build first.');
	process.exit(1);
}

// The popup reads settings through chrome.storage.local and checks
// chrome.runtime.lastError. Handing it an empty store makes it render its own
// defaults, which is what a new user sees.
//
// The height goes out through the title, because that is the one thing
// --dump-dom will show us. It is #frame's height rather than the document's:
// scrollHeight never comes back smaller than the viewport. And it is read on a
// timer, not at load, because Pickr swaps the colour picker out for its own
// button, which settles the last row.
const SHIM = `<script>
			window.chrome = {
				runtime: { lastError: null },
				storage: {
					local: {
						get: (cb) => cb({}),
						set: (values, cb) => cb && cb(),
					},
				},
			};
			setTimeout(() => {
				document.title = String(document.getElementById('frame').offsetHeight);
			}, 300);
		</script>
		`;

const marker = '<script src="static/js/popup.js"></script>';
if (!html.includes(marker)) {
	console.error(`Could not find ${marker} in build/popup.html.`);
	process.exit(1);
}

// Has to live next to popup.html for static/css and static/js to resolve. build/
// is gitignored and webpack wipes it, so a temp file here is harmless.
const shimmed = path.join(root, 'build', '_promo-popup.html');
await writeFile(shimmed, html.replace(marker, SHIM + marker));

const chrome = await findChrome();
const url = `file:///${shimmed.replaceAll('\\', '/')}`;

// The popup's own width, from body { width: 300px } in src/popup/popup.css.
const WIDTH = 300;

const args = (height, ...extra) => [
	'--headless=new',
	'--disable-gpu',
	'--hide-scrollbars',
	'--force-device-scale-factor=1',
	`--window-size=${WIDTH},${height}`,
	...extra,
	url,
];

try {
	// Tall enough that nothing is squeezed while it is measured.
	const { stdout } = await run(
		chrome,
		args(1000, '--dump-dom', '--virtual-time-budget=2000'),
	);

	const height = Number(stdout.match(/<title>(\d+)<\/title>/)?.[1]);
	if (!height) {
		console.error('Could not read the popup height back out of the DOM.');
		process.exit(1);
	}

	const outDir = path.join(here, 'generated');
	await mkdir(outDir, { recursive: true });
	await run(chrome, args(height, `--screenshot=${path.join(outDir, 'popup.png')}`));

	console.log(`generated/popup.png  ${WIDTH}x${height}`);
} finally {
	await rm(shimmed, { force: true });
}
