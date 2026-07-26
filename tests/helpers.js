import assert from 'node:assert/strict';

// Twitch serves some badge PNGs as binary/octet-stream, so sniff the bytes
// instead of trusting the content type -- that is what the browser does anyway.
const SIGNATURES = [
	{ name: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
	{ name: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] },
	{ name: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
	{ name: 'webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

export async function checkImage(url) {
	const res = await fetch(url);
	if (!res.ok) {
		return { url, ok: false, why: `HTTP ${res.status}` };
	}
	const bytes = new Uint8Array(await res.arrayBuffer());
	if (bytes.byteLength < 100) {
		return { url, ok: false, why: `only ${bytes.byteLength} bytes` };
	}
	const match = SIGNATURES.find((sig) =>
		sig.bytes.every((b, i) => bytes[i] === b)
	);
	if (!match) {
		const head = [...bytes.slice(0, 8)]
			.map((b) => b.toString(16).padStart(2, '0'))
			.join(' ');
		// SVG has no magic number.
		const text = new TextDecoder().decode(bytes.slice(0, 200));
		if (!/<svg|<\?xml/i.test(text)) {
			return { url, ok: false, why: `not an image, starts with ${head}` };
		}
	}
	return { url, ok: true };
}

export async function assertIsImage(url) {
	const result = await checkImage(url);
	assert.ok(result.ok, `${url}: ${result.why}`);
}
