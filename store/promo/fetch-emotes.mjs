// Downloads the 7TV emotes the promo tiles use into emotes/, from the same
// public v3 API and CDN the extension itself reads (see src/js/chat.js).
//
//   node store/promo/fetch-emotes.mjs
//
// The files are committed so render.mjs never needs the network -- and so the
// artwork cannot silently change under us when someone re-uploads an emote.
//
// Only emotes from 7TV's global set are used, and only ones that are original
// art or 7TV's own mark. See emotes/CREDITS.md.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Picked off two constraints. Legibility: an emote has to still read at 20px,
// which rules out the busy ones (AlienDance, RareParrot) and the ones that go to
// mush that small (PETPET). Provenance: original art only, so no Pepe
// derivatives (Stare, ppL, EZ) and nobody's face.
const WANTED = ['glorp', 'Clap', 'nymnCorn'];

const outDir = path.join(import.meta.dirname, 'emotes');
await mkdir(outDir, { recursive: true });

const res = await fetch('https://7tv.io/v3/emote-sets/global');
if (!res.ok) {
	console.error(`7TV global set: HTTP ${res.status}`);
	process.exit(1);
}
const { emotes } = await res.json();

const credits = [];

for (const name of WANTED) {
	const emote = emotes.find((e) => e.name === name);
	if (!emote) {
		console.error(`  ! ${name} is no longer in the global set`);
		continue;
	}
	// 1x.webp is what the overlay renders, animated emotes included.
	const url = `https://cdn.7tv.app/emote/${emote.id}/1x.webp`;
	const image = await fetch(url);
	if (!image.ok) {
		console.error(`  ! ${name}: HTTP ${image.status}`);
		continue;
	}
	const bytes = Buffer.from(await image.arrayBuffer());
	await writeFile(path.join(outDir, `${name}.webp`), bytes);

	const owner = emote.data?.owner?.display_name ?? 'unknown';
	credits.push({ name, id: emote.id, owner, bytes: bytes.length });
	console.log(`  ${name}.webp  ${bytes.length} B  by ${owner}`);
}

const table = credits
	.map((c) => `| \`${c.name}\` | [${c.id}](https://7tv.app/emotes/${c.id}) | ${c.owner} |`)
	.join('\n');

await writeFile(
	path.join(outDir, 'CREDITS.md'),
	`# Emote credits

Downloaded by \`../fetch-emotes.mjs\` from 7TV's global emote set. Each is the
work of its uploader, linked below; they are used here to show what the overlay
renders. Re-run the script to refresh.

| Emote | 7TV | Uploader |
| ----- | --- | -------- |
${table}
`,
);
