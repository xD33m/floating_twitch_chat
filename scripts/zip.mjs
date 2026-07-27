// Packs build/ into a zip the Chrome Web Store accepts. The store wants
// manifest.json at the root of the archive, so the contents of build/ go in --
// not the build/ directory itself.
//
// The zip lands in dist/ rather than build/ because webpack's `clean: true`
// wipes build/ on every run, and a stray zip inside build/ would also be picked
// up by "Load unpacked".

import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { ZipArchive } from 'archiver';

const root = path.resolve(import.meta.dirname, '..');
const buildDir = path.join(root, 'build');
const distDir = path.join(root, 'dist');

const manifestPath = path.join(buildDir, 'manifest.json');
let manifest;
try {
	manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch {
	console.error(`No ${path.relative(root, manifestPath)} -- run the build first.`);
	process.exit(1);
}

const zipPath = path.join(distDir, `floating-twitch-chat-${manifest.version}.zip`);

await mkdir(distDir, { recursive: true });
await rm(zipPath, { force: true });

const output = createWriteStream(zipPath);
const archive = new ZipArchive({ zlib: { level: 9 } });

const done = new Promise((resolve, reject) => {
	output.on('close', resolve);
	output.on('error', reject);
	archive.on('warning', reject);
	archive.on('error', reject);
});

archive.pipe(output);
archive.directory(buildDir, false);
await archive.finalize();
await done;

const { size } = await stat(zipPath);
const kb = (size / 1024).toFixed(1);
console.log(`${path.relative(root, zipPath)}  ${kb} kB  (v${manifest.version})`);
