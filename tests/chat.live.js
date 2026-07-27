/*
 * End to end check against real Twitch chat: connect anonymously with the same
 * tmi.js client the overlay uses, take the channel id from the IRC tags (this is
 * what replaced the dead Kraken lookup), load that channel's emotes and badges,
 * then push real chat messages through the pipeline and confirm the images the
 * overlay would render actually exist.
 *
 *   npm run test:live
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import tmi from 'tmi.js';

import {
	addEmotes,
	bttvEmoteCache,
	ffzEmoteCache,
	getBTTVEmotes,
	getBadges,
	getChannel,
	getFFZEmotes,
	getSevenTVEmotes,
	handleEmotes,
	prepareBadges,
	resolveColor,
	sevenTVEmoteCache,
	twitchBadgeCache,
} from '../src/js/chat.js';
import { checkImage } from './helpers.js';

// Channels with third party emotes configured, tried in order, so the test does
// not depend on one streamer being live and one stretch of chat happening to
// contain an emote. Chat stays reachable when a channel is offline, but only a
// busy one produces messages within the time budget.
const CHANNELS = ['forsen', 'xqc', 'sodapoppin', 'pokelawls', 'summit1g'];
const COLLECT_MS = 25000;
const WANTED_MESSAGES = 40;

function newClient(channel) {
	return new tmi.Client({
		connection: { reconnect: false, secure: true },
		channels: [channel],
	});
}

// The overlay learns the channel id from ROOMSTATE (sent right after the join)
// or from the `room-id` tag on any message.
function findRoomId(client) {
	return new Promise((resolve) => {
		const timer = setTimeout(() => resolve(null), 20000);
		const done = (id) => {
			if (!id) return;
			clearTimeout(timer);
			resolve(id);
		};
		client.on('roomstate', (_chan, state) => done(state['room-id']));
		client.on('message', (_chan, data) => done(data['room-id']));
		client.connect().catch(() => {
			clearTimeout(timer);
			resolve(null);
		});
	});
}

// Collect until we have enough messages *and* at least one that produces an
// emote, so the emote assertion below is about the code and not about whatever
// chat happened to be saying.
function collectMessages(client, chan) {
	return new Promise((resolve) => {
		const messages = [];
		let withEmotes = 0;
		let timer;

		const finish = () => {
			clearTimeout(timer);
			client.disconnect().catch(() => {});
			resolve({ messages, withEmotes });
		};

		client.on('message', (_chan, data, message) => {
			messages.push({ data, message });
			const parts = handleEmotes(chan, data.emotes || {}, message);
			if (parts.some((part) => typeof part !== 'string')) {
				withEmotes++;
			}
			if (messages.length >= WANTED_MESSAGES && withEmotes > 0) {
				finish();
			}
		});

		timer = setTimeout(finish, COLLECT_MS);
		client.connect().catch(() => finish());
	});
}

test('real twitch chat renders with badges and emotes', async (t) => {
	let channel = null;
	let roomId = null;
	let messages = [];

	for (const candidate of CHANNELS) {
		twitchBadgeCache.data = { global: {} };
		bttvEmoteCache.data = { global: [] };
		ffzEmoteCache.data = { global: [] };
		sevenTVEmoteCache.data = { global: [] };

		const chan = getChannel(candidate);
		const idClient = newClient(candidate);
		const id = await findRoomId(idClient);
		await idClient.disconnect().catch(() => {});

		if (!id) {
			t.diagnostic(`${candidate}: no room-id`);
			continue;
		}

		// Everything the overlay loads once it knows the channel.
		twitchBadgeCache.data.global = await getBadges();
		twitchBadgeCache.data[chan] = await getBadges(id);
		await getBTTVEmotes();
		await getFFZEmotes();
		await getSevenTVEmotes();
		await getBTTVEmotes(chan, id);
		await getFFZEmotes(chan, id);
		await getSevenTVEmotes(chan, id);
		const counts = (cache) =>
			`${cache.data.global.length}+${(cache.data[chan] || []).length}`;
		t.diagnostic(
			`${candidate} (room-id ${id}) global+channel emotes: bttv ${counts(
				bttvEmoteCache
			)}, ffz ${counts(ffzEmoteCache)}, 7tv ${counts(sevenTVEmoteCache)}`
		);

		const collected = await collectMessages(newClient(candidate), chan);
		t.diagnostic(
			`${candidate}: ${collected.messages.length} messages, ${collected.withEmotes} with emotes`
		);
		if (collected.messages.length && collected.withEmotes > 0) {
			channel = candidate;
			roomId = id;
			messages = collected.messages;
			break;
		}
	}

	assert.ok(
		channel,
		`none of ${CHANNELS.join(', ')} produced chat messages containing emotes`
	);
	// This is the lookup that used to go through Kraken.
	assert.match(roomId, /^\d+$/, 'room-id tag is not a numeric channel id');

	const chan = getChannel(channel);

	// Same work Chat.handleMessage does for every incoming line.
	const rendered = messages.map(({ data, message }) => ({
		username: data['display-name'] || data.username,
		color: resolveColor(chan, data.username, data.color),
		badges: prepareBadges(chan, data),
		parts: addEmotes(handleEmotes(chan, data.emotes || {}, message)),
	}));

	for (const line of rendered) {
		assert.ok(line.username, 'a message came through without a username');
		assert.match(line.color, /^(#|rgb|hsl)/i);
		assert.ok(line.parts.length > 0, 'a message rendered to nothing');
		for (const part of line.parts) {
			if (typeof part !== 'string') {
				assert.match(part.url, /^https:\/\//);
				assert.ok(part.alt, 'an emote came out without its code');
			}
		}
	}

	const emotes = rendered.flatMap((line) =>
		line.parts.filter((part) => typeof part !== 'string')
	);
	const badges = rendered.flatMap((line) => line.badges);

	t.diagnostic(
		`using ${channel}: ${rendered.length} lines, ${emotes.length} emotes, ${badges.length} badges`
	);
	for (const line of rendered.filter((l) =>
		l.parts.some((p) => typeof p !== 'string')
	)) {
		t.diagnostic(
			`  ${line.badges.map((b) => `(${b.type})`).join('')} ${line.username}: ` +
				line.parts.map((p) => (typeof p === 'string' ? p : `[${p.alt}]`)).join('')
		);
	}

	assert.ok(emotes.length > 0, 'emote matching produced nothing');
	assert.ok(
		badges.length > 0,
		`no badges in ${rendered.length} messages from ${channel} -- badge lookup is broken`
	);

	// The images the overlay would actually put in the DOM.
	const urls = [
		...new Set([...emotes.map((e) => e.url), ...badges.map((b) => b.url)]),
	].slice(0, 25);
	const results = await Promise.all(urls.map(checkImage));
	const broken = results.filter((r) => !r.ok);
	assert.deepEqual(broken, [], `broken image urls: ${JSON.stringify(broken)}`);
	t.diagnostic(`${results.length} emote/badge images verified as real images`);
});
