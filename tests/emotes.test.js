import test from 'node:test';
import assert from 'node:assert/strict';

import {
	addEmotes,
	bttvEmoteCache,
	ffzEmoteCache,
	handleEmotes,
	prepareBadges,
	resolveColor,
	sevenTVEmoteCache,
	twitchBadgeCache,
} from '../src/js/chat.js';

function resetCaches() {
	bttvEmoteCache.data = { global: [] };
	ffzEmoteCache.data = { global: [] };
	sevenTVEmoteCache.data = { global: [] };
	twitchBadgeCache.data = { global: {} };
}

const bttv = (code, id) => ({ code, id, type: ['bttv', 'emote'] });
const ffz = (name, id) => ({ name, id, type: ['ffz', 'emote'] });
const seventv = (name, id) => ({ name, id, type: ['7tv', 'emote'] });

// Render the pipeline output the way ChatMessage does, so a test failure reads
// like the chat line the user would have seen.
const flatten = (parts) =>
	parts.map((p) => (typeof p === 'string' ? p : `[${p.alt}]`)).join('');

test('twitch emotes are replaced using the tag ranges', () => {
	resetCaches();
	const message = 'hey Kappa there';
	const parts = addEmotes(handleEmotes('somechan', { 25: ['4-8'] }, message));

	assert.equal(flatten(parts), 'hey [Kappa] there');
	assert.deepEqual(parts[1], {
		// v1 of this CDN is gone; a v1 URL here means the regression is back.
		url: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0',
		alt: 'Kappa',
	});
});

test('bttv and ffz emotes are matched by code and get the right cdn url', () => {
	resetCaches();
	bttvEmoteCache.data.global.push(bttv('monkaS', 'bttv-id'));
	ffzEmoteCache.data.global.push(ffz('PogChamp', 'ffz-id'));

	const parts = addEmotes(
		handleEmotes('somechan', {}, 'monkaS what PogChamp')
	);

	assert.equal(flatten(parts), '[monkaS] what [PogChamp]');
	assert.equal(parts[0].url, 'https://cdn.betterttv.net/emote/bttv-id/1x');
	assert.equal(parts[2].url, 'https://cdn.frankerfacez.com/emote/ffz-id/1');
});

test('7tv emotes are matched by name and get the right cdn url', () => {
	resetCaches();
	sevenTVEmoteCache.data.global.push(seventv('GAMBA', '01F6MZGCNR000255K6PVAV8SP4'));

	const parts = addEmotes(handleEmotes('somechan', {}, 'time for GAMBA'));

	assert.equal(flatten(parts), 'time for [GAMBA]');
	assert.equal(
		parts[1].url,
		'https://cdn.7tv.app/emote/01F6MZGCNR000255K6PVAV8SP4/1x.webp'
	);
});

test('channel specific third party emotes are used for that channel only', () => {
	resetCaches();
	bttvEmoteCache.data.somechan = [bttv('CHANEMOTE', 'chan-id')];
	ffzEmoteCache.data.somechan = [ffz('FFZCHAN', 'ffz-chan-id')];
	sevenTVEmoteCache.data.somechan = [seventv('STVCHAN', 'stv-chan-id')];

	assert.equal(
		flatten(addEmotes(handleEmotes('somechan', {}, 'CHANEMOTE FFZCHAN STVCHAN'))),
		'[CHANEMOTE] [FFZCHAN] [STVCHAN]'
	);
	assert.equal(
		flatten(addEmotes(handleEmotes('otherchan', {}, 'CHANEMOTE FFZCHAN STVCHAN'))),
		'CHANEMOTE FFZCHAN STVCHAN'
	);
});

test('when providers share a code, 7tv wins and twitch beats all of them', () => {
	resetCaches();
	sevenTVEmoteCache.data.global.push(seventv('Shared', 'stv-id'));
	bttvEmoteCache.data.global.push(bttv('Shared', 'bttv-id'));
	ffzEmoteCache.data.global.push(ffz('Shared', 'ffz-id'));

	const [stv] = addEmotes(handleEmotes('somechan', {}, 'Shared'));
	assert.equal(stv.url, 'https://cdn.7tv.app/emote/stv-id/1x.webp');

	// A twitch emote tag covering the same characters takes precedence.
	const [twitch] = addEmotes(handleEmotes('somechan', { 25: ['0-5'] }, 'Shared'));
	assert.equal(
		twitch.url,
		'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0'
	);
});

test('a channel emote overrides a global one with the same code', () => {
	resetCaches();
	sevenTVEmoteCache.data.global.push(seventv('Alias', 'global-id'));
	sevenTVEmoteCache.data.somechan = [seventv('Alias', 'channel-id')];

	const [rendered] = addEmotes(handleEmotes('somechan', {}, 'Alias'));
	assert.equal(rendered.url, 'https://cdn.7tv.app/emote/channel-id/1x.webp');
});

test('emote codes are only matched as whole words', () => {
	resetCaches();
	bttvEmoteCache.data.global.push(bttv('monkaS', 'bttv-id'));

	assert.equal(
		flatten(addEmotes(handleEmotes('somechan', {}, 'monkaSSS xmonkaS'))),
		'monkaSSS xmonkaS'
	);
	assert.equal(
		flatten(addEmotes(handleEmotes('somechan', {}, 'a monkaS b'))),
		'a [monkaS] b'
	);
});

test('the same emote repeated is replaced every time', () => {
	resetCaches();
	bttvEmoteCache.data.global.push(bttv('monkaS', 'bttv-id'));

	assert.equal(
		flatten(addEmotes(handleEmotes('somechan', {}, 'monkaS monkaS monkaS'))),
		'[monkaS] [monkaS] [monkaS]'
	);
});

test('a message without emotes is returned untouched', () => {
	resetCaches();
	bttvEmoteCache.data.global.push(bttv('monkaS', 'bttv-id'));

	const parts = handleEmotes('somechan', {}, 'just talking');
	assert.deepEqual(parts, ['just talking']);
	assert.deepEqual(addEmotes(parts), ['just talking']);
});

test('badges are resolved from the global and per channel caches', () => {
	resetCaches();
	twitchBadgeCache.data.global = {
		moderator: { versions: { 1: { image_url_1x: 'https://example/mod' } } },
	};
	twitchBadgeCache.data.somechan = {
		subscriber: { versions: { 12: { image_url_1x: 'https://example/sub12' } } },
	};

	const badges = prepareBadges('somechan', {
		badges: { moderator: '1', subscriber: '12', unknown: '1' },
	});

	assert.deepEqual(badges, [
		{ url: 'https://example/mod', type: 'moderator' },
		{ url: 'https://example/sub12', type: 'subscriber' },
	]);
});

test('prepareBadges survives an empty cache and a message without badges', () => {
	resetCaches();
	assert.deepEqual(prepareBadges('somechan', { badges: { moderator: '1' } }), []);
	assert.deepEqual(prepareBadges('somechan', { badges: null }), []);
	assert.deepEqual(prepareBadges('somechan', {}), []);
});

test('users without a colour get a stable fallback colour', () => {
	const first = resolveColor('#chan', 'someone', '');
	assert.match(first, /^#[0-9A-F]{6}$/i);
	assert.equal(resolveColor('#chan', 'someone', ''), first);
	assert.equal(resolveColor('#chan', 'someone', '#123456'), '#123456');
});
