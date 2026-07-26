/*
 * Hits the real endpoints the overlay depends on. These are the tests that
 * would have caught the outage this migration had to fix: Kraken answering 404
 * and badges.twitch.tv losing its DNS record.
 *
 *   npm run test:live
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
	addEmotes,
	bttvEmoteCache,
	ffzEmoteCache,
	getBTTVEmotes,
	getBadges,
	getFFZEmotes,
	handleEmotes,
	twitchBadgeCache,
} from '../src/js/chat.js';
import { assertIsImage } from './helpers.js';

// A large, long lived channel that has BTTV emotes, FFZ emotes and channel
// badges configured, so the per channel lookups have something to find.
const CHANNEL = 'forsen';
const CHANNEL_ID = '22484632';

test('global twitch badges resolve to real images', async () => {
	const badges = await getBadges();
	twitchBadgeCache.data.global = badges;

	assert.ok(badges.moderator, 'no moderator badge set');
	assert.ok(badges.broadcaster, 'no broadcaster badge set');
	await assertIsImage(badges.moderator.versions['1'].image_url_1x);
});

test('channel badges resolve for a channel id', async () => {
	const badges = await getBadges(CHANNEL_ID);
	const sets = Object.keys(badges);

	assert.ok(sets.length > 0, 'no channel badge sets');
	const [firstSet] = sets;
	const [firstVersion] = Object.keys(badges[firstSet].versions);
	await assertIsImage(badges[firstSet].versions[firstVersion].image_url_1x);
});

test('global BTTV emotes load and render to a real image', async () => {
	bttvEmoteCache.data = { global: [] };
	await getBTTVEmotes();

	assert.ok(bttvEmoteCache.data.global.length > 0, 'no global BTTV emotes');
	const emote = bttvEmoteCache.data.global[0];
	const [rendered] = addEmotes(handleEmotes(CHANNEL, {}, emote.code));
	assert.equal(rendered.alt, emote.code);
	await assertIsImage(rendered.url);
});

test('channel BTTV emotes load and render to a real image', async () => {
	bttvEmoteCache.data = { global: [] };
	await getBTTVEmotes(CHANNEL, CHANNEL_ID);

	const emotes = bttvEmoteCache.data[CHANNEL] || [];
	assert.ok(emotes.length > 0, `no BTTV emotes for ${CHANNEL}`);
	const [rendered] = addEmotes(handleEmotes(CHANNEL, {}, emotes[0].code));
	await assertIsImage(rendered.url);
});

test('global FFZ emotes load and render to a real image', async () => {
	ffzEmoteCache.data = { global: [] };
	await getFFZEmotes();

	assert.ok(ffzEmoteCache.data.global.length > 0, 'no global FFZ emotes');
	const emote = ffzEmoteCache.data.global[0];
	const [rendered] = addEmotes(handleEmotes(CHANNEL, {}, emote.name));
	assert.equal(rendered.alt, emote.name);
	await assertIsImage(rendered.url);
});

test('channel FFZ emotes load and render to a real image', async () => {
	ffzEmoteCache.data = { global: [] };
	await getFFZEmotes(CHANNEL, CHANNEL_ID);

	const emotes = ffzEmoteCache.data[CHANNEL] || [];
	assert.ok(emotes.length > 0, `no FFZ emotes for ${CHANNEL}`);
	const [rendered] = addEmotes(handleEmotes(CHANNEL, {}, emotes[0].name));
	await assertIsImage(rendered.url);
});

test('a twitch emote id renders to a real image on the v2 cdn', async () => {
	// 25 is Kappa and is not going anywhere.
	const [rendered] = addEmotes(
		handleEmotes('somechan', { 25: ['0-4'] }, 'Kappa')
	);
	assert.equal(rendered.alt, 'Kappa');
	await assertIsImage(rendered.url);
});
