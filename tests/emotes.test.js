import test from 'node:test';
import assert from 'node:assert/strict';

import {
	addEmotes,
	bttvEmoteCache,
	ffzEmoteCache,
	handleEmotes,
	prepareBadges,
	resolveColor,
	twitchBadgeCache,
} from '../src/js/chat.js';

function resetCaches() {
	bttvEmoteCache.data = { global: [] };
	ffzEmoteCache.data = { global: [] };
	twitchBadgeCache.data = { global: {} };
}

const bttv = (code, id) => ({ code, id, type: ['bttv', 'emote'] });
const ffz = (name, id) => ({ name, id, type: ['ffz', 'emote'] });

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

test('channel specific third party emotes are used for that channel only', () => {
	resetCaches();
	bttvEmoteCache.data.somechan = [bttv('CHANEMOTE', 'chan-id')];
	ffzEmoteCache.data.somechan = [ffz('FFZCHAN', 'ffz-chan-id')];

	assert.equal(
		flatten(addEmotes(handleEmotes('somechan', {}, 'CHANEMOTE FFZCHAN'))),
		'[CHANEMOTE] [FFZCHAN]'
	);
	assert.equal(
		flatten(addEmotes(handleEmotes('otherchan', {}, 'CHANEMOTE FFZCHAN'))),
		'CHANEMOTE FFZCHAN'
	);
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
