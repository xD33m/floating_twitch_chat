/* Emote / badge data layer.
 *
 * History: this used to talk to the Twitch Kraken (v5) API and to
 * badges.twitch.tv. Both are gone -- Kraken answers 404 and badges.twitch.tv no
 * longer resolves at all -- which is why emotes and badges stopped working.
 *
 * What we use now:
 *   - channel id: the `room-id` IRC tag, so no Twitch API call is needed
 *   - badges:     api.ivr.fi (public Helix mirror, no client id required)
 *   - twitch emotes: the v2 emoticon CDN (v1 is deprecated)
 *   - BTTV / FFZ / 7TV: their public v3 / v1 / v3 endpoints
 *
 * Every endpoint below answers with a permissive Access-Control-Allow-Origin,
 * so the content script can fetch them directly. Do not add custom request
 * headers here: that would turn these into preflighted requests for no gain.
 */

export const twitchBadgeCache = {
	data: { global: {} },
};
export const bttvEmoteCache = {
	lastUpdated: 0,
	data: { global: [] },
	urlTemplate: 'https://cdn.betterttv.net/emote/{{id}}/{{image}}',
};
export const ffzEmoteCache = {
	lastUpdated: 0,
	data: { global: [] },
	urlTemplate: 'https://cdn.frankerfacez.com/emote/{{id}}/{{image}}',
};
export const sevenTVEmoteCache = {
	lastUpdated: 0,
	data: { global: [] },
	urlTemplate: 'https://cdn.7tv.app/emote/{{id}}/{{image}}',
};

const badgeApiBase = 'https://api.ivr.fi/v2/twitch/badges/';
const twitchEmoteBase = 'https://static-cdn.jtvnw.net/emoticons/v2/';

const chatFilters = [
	// '\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF', // Partial Latin-1 Supplement
	// '\u0100-\u017F', // Latin Extended-A
	// '\u0180-\u024F', // Latin Extended-B
	'\u0250-\u02AF', // IPA Extensions
	'\u02B0-\u02FF', // Spacing Modifier Letters
	'\u0300-\u036F', // Combining Diacritical Marks
	'\u0370-\u03FF', // Greek and Coptic
	'\u0400-\u04FF', // Cyrillic
	'\u0500-\u052F', // Cyrillic Supplement
	'\u0530-\u1FFF', // Bunch of non-English
	'\u2100-\u214F', // Letter Like
	'\u2500-\u257F', // Box Drawing
	'\u2580-\u259F', // Block Elements
	'\u25A0-\u25FF', // Geometric Shapes
	'\u2600-\u26FF', // Miscellaneous Symbols
	// '\u2700-\u27BF', // Dingbats
	'\u2800-\u28FF', // Braille
	// '\u2C60-\u2C7F', // Latin Extended-C
];
export const chatFilter = new RegExp(`[${chatFilters.join('')}]`);

export function getChannel(channel = '') {
	return channel.replace(/^#/, '');
}

export function prepareBadges(chan, data) {
	let badges = [];
	let badgeGroup = Object.assign(
		{},
		twitchBadgeCache.data.global,
		twitchBadgeCache.data[chan] || {}
	);
	if ('badges' in data && data.badges !== null) {
		Object.keys(data.badges).forEach((type) => {
			let version = data.badges[type];
			let group = badgeGroup[type];
			if (group && version in group.versions) {
				let url = group.versions[version].image_url_1x;
				let badge = {
					url: url,
					type: type,
				};
				badges.push(badge);
			}
		}, []);
	}

	return badges;
}

// Third party emotes are matched as whole words: without this "Kappa" would
// also match inside "Kappapride" and the two matches would fight over the same
// characters.
function isWordBoundary(message, start, end) {
	const before = start === 0 ? ' ' : message[start - 1];
	const after = end >= message.length ? ' ' : message[end];
	return !/\S/.test(before) && !/\S/.test(after);
}

function findCodeOccurrences(message, code) {
	const found = [];
	for (
		let start = message.indexOf(code);
		start > -1;
		start = message.indexOf(code, start + 1)
	) {
		const end = start + code.length;
		if (isWordBoundary(message, start, end)) {
			found.push({ start, end });
		}
	}
	return found;
}

// Channel emotes first: a channel can alias a code that also exists globally,
// and the channel's version is the one chat means.
function thirdPartyEmotesFor(cache, channel) {
	const channelEmotes = channel in cache.data ? cache.data[channel] : [];
	return channelEmotes.concat(cache.data.global);
}

export function handleEmotes(channel, emotes, message) {
	let twitchEmoteKeys = Object.keys(emotes);
	let allEmotes = twitchEmoteKeys.reduce((p, id) => {
		let emoteData = emotes[id].map((n) => {
			let [a, b] = n.split('-');
			let start = +a;
			let end = +b + 1;
			return {
				start,
				end,
				id,
				code: message.slice(start, end),
				type: ['twitch', 'emote'],
			};
		});
		return p.concat(emoteData);
	}, []);

	// BTTV calls it `code`, FFZ and 7TV call it `name`; normalise to `code` here
	// so addEmotes only has to deal with one shape. Order matters: when the same
	// code exists in more than one provider the first one wins, and 7TV before
	// BTTV before FFZ is what the established chat clients do.
	const thirdParty = thirdPartyEmotesFor(sevenTVEmoteCache, channel)
		.concat(thirdPartyEmotesFor(bttvEmoteCache, channel))
		.concat(thirdPartyEmotesFor(ffzEmoteCache, channel));

	thirdParty.forEach(({ code, name, id, type }) => {
		const emoteCode = code || name;
		if (!emoteCode) {
			return;
		}
		findCodeOccurrences(message, emoteCode).forEach(({ start, end }) => {
			allEmotes.push({ start, end, id, code: emoteCode, type });
		});
	});

	let seen = [];
	allEmotes = allEmotes
		.sort((a, b) => a.start - b.start)
		.filter(({ start, end }) => {
			if (seen.length && !seen.every((n) => start > n.end)) {
				return false;
			}
			seen.push({ start, end });
			return true;
		});
	if (allEmotes.length) {
		let finalMessage = [message.slice(0, allEmotes[0].start)];
		allEmotes.forEach((n, i) => {
			let p = Object.assign({}, n, { i });
			let { end } = p;
			finalMessage.push(p);
			if (i === allEmotes.length - 1) {
				finalMessage.push(message.slice(end));
			} else {
				finalMessage.push(message.slice(end, allEmotes[i + 1].start));
			}
			finalMessage = finalMessage.filter((n) => n);
		});
		return finalMessage;
	}
	return [message];
}

export function addEmotes(data) {
	let message = [];
	data.forEach((n) => {
		if (typeof n === 'string') {
			message.push(n);
			return;
		}
		let {
			type: [type],
			code,
		} = n;
		if (type === 'twitch') {
			// v1 of this CDN is deprecated; v2 needs a theme and a scale.
			message.push({
				url: `${twitchEmoteBase}${n.id}/default/dark/1.0`,
				alt: code,
			});
		} else if (type === 'bttv') {
			let url = bttvEmoteCache.urlTemplate
				.replace('{{id}}', n.id)
				.replace('{{image}}', '1x');
			message.push({ url, alt: code });
		} else if (type === 'ffz') {
			let url = ffzEmoteCache.urlTemplate
				.replace('{{id}}', n.id)
				.replace('{{image}}', '1');
			message.push({ url, alt: code });
		} else if (type === '7tv') {
			// 7TV serves every emote as webp, animated ones included.
			let url = sevenTVEmoteCache.urlTemplate
				.replace('{{id}}', n.id)
				.replace('{{image}}', '1x.webp');
			message.push({ url, alt: code });
		}
	});
	return message;
}

async function getJSON(url) {
	const res = await fetch(url);
	// A 404 from any of these means "this channel has nothing configured", which
	// is the normal case for most channels -- not a failure.
	if (res.status === 404) {
		return null;
	}
	if (!res.ok) {
		throw new Error(`${res.status} ${res.statusText} for ${url}`);
	}
	return res.json();
}

/*
 * Badges. api.ivr.fi answers in the Helix shape
 * `[{ set_id, versions: [{ id, image_url_1x, ... }] }]`; the rest of the
 * extension expects the old Kraken shape `{ [setId]: { versions: { [id]: … } } }`,
 * so normalise here and keep prepareBadges untouched.
 */
function normalizeBadgeSets(sets) {
	if (!Array.isArray(sets)) {
		return {};
	}
	return sets.reduce((acc, set) => {
		if (!set || !set.set_id || !Array.isArray(set.versions)) {
			return acc;
		}
		acc[set.set_id] = {
			versions: set.versions.reduce((versions, version) => {
				versions[version.id] = version;
				return versions;
			}, {}),
		};
		return acc;
	}, {});
}

export async function getBadges(channelID) {
	const endpoint = channelID
		? `channel?id=${encodeURIComponent(channelID)}`
		: 'global';
	return normalizeBadgeSets(await getJSON(badgeApiBase + endpoint));
}

export async function getBTTVEmotes(channel, channelID) {
	const global = !(channelID && channel);
	const url = global
		? 'https://api.betterttv.net/3/cached/emotes/global'
		: `https://api.betterttv.net/3/cached/users/twitch/${encodeURIComponent(
				channelID
		  )}`;

	const response = await getJSON(url);
	if (!response) return;

	if (global) {
		if (!Array.isArray(response)) return;
		response.forEach((n) => {
			n.global = true;
			n.type = ['bttv', 'emote'];
			bttvEmoteCache.data.global.push(n);
		});
		return;
	}

	const channelEmotes = (response.channelEmotes || []).concat(
		response.sharedEmotes || []
	);
	if (!channelEmotes.length) return;
	if (channel in bttvEmoteCache.data === false) {
		bttvEmoteCache.data[channel] = [];
	}
	channelEmotes.forEach((n) => {
		n.global = false;
		n.type = ['bttv', 'emote'];
		bttvEmoteCache.data[channel].push(n);
	});
}

// Both the global set and a room answer with a `sets` map; a room can have more
// than one set (the old code only ever read the first one).
function collectFFZEmotes(response) {
	return Object.values((response && response.sets) || {}).reduce(
		(emotes, set) => emotes.concat((set && set.emoticons) || []),
		[]
	);
}

export async function getFFZEmotes(channel, channelID) {
	const global = !(channelID && channel);
	const url = global
		? 'https://api.frankerfacez.com/v1/set/global'
		: `https://api.frankerfacez.com/v1/room/id/${encodeURIComponent(channelID)}`;

	const response = await getJSON(url);
	const emotes = collectFFZEmotes(response);
	if (!emotes.length) return;

	if (!global && channel in ffzEmoteCache.data === false) {
		ffzEmoteCache.data[channel] = [];
	}
	const target = global ? ffzEmoteCache.data.global : ffzEmoteCache.data[channel];
	emotes.forEach((n) => {
		n.global = global;
		n.type = ['ffz', 'emote'];
		target.push(n);
	});
}

/*
 * 7TV. Most large channels have moved here, so without it a lot of chat renders
 * as bare text. A channel's response also carries its whole active emote set,
 * which for a big channel is a couple of MB -- it is fetched once per channel.
 */
export async function getSevenTVEmotes(channel, channelID) {
	const global = !(channelID && channel);
	const url = global
		? 'https://7tv.io/v3/emote-sets/global'
		: `https://7tv.io/v3/users/twitch/${encodeURIComponent(channelID)}`;

	// 404 here just means the channel never linked a 7TV account.
	const response = await getJSON(url);
	if (!response) return;

	const set = global ? response : response.emote_set;
	const emotes = (set && set.emotes) || [];
	if (!emotes.length) return;

	if (!global && channel in sevenTVEmoteCache.data === false) {
		sevenTVEmoteCache.data[channel] = [];
	}
	const target = global
		? sevenTVEmoteCache.data.global
		: sevenTVEmoteCache.data[channel];
	emotes.forEach((n) => {
		// `name` is the channel's alias for the emote, `data.name` the original.
		target.push({
			id: n.id,
			name: n.name,
			global,
			type: ['7tv', 'emote'],
		});
	});
}

let defaultColors = [
		'#FF0000',
		'#0000FF',
		'#008000',
		'#B22222',
		'#FF7F50',
		'#9ACD32',
		'#FF4500',
		'#2E8B57',
		'#DAA520',
		'#D2691E',
		'#5F9EA0',
		'#1E90FF',
		'#FF69B4',
		'#8A2BE2',
		'#00FF7F',
	],
	randomColorsChosen = {};

export function resolveColor(channel, name, color) {
	if (color) {
		return color;
	}
	if (!(channel in randomColorsChosen)) {
		randomColorsChosen[channel] = {};
	}
	if (name in randomColorsChosen[channel]) {
		color = randomColorsChosen[channel][name];
	} else {
		color = defaultColors[Math.floor(Math.random() * defaultColors.length)];
		randomColorsChosen[channel][name] = color;
	}
	return color;
}
