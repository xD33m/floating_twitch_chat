/* Helpful information:

Clips
	Endpoint: https://api.twitch.tv/kraken/clips/ReliableSplendidInternPogChamp?on_site=1&api_version=5
	Exmpample Clip: https://clips.twitch.tv/ReliableSplendidInternPogChamp
	Missing thumbnail: https://clips-media-assets.twitch.tv/404-preview-86x45.jpg
	Broken thumbnail: https://clips-media-assets.twitch.tv/vod-153090723-offset-1928.5-60-preview-1920x1080.jpg

*/
// import twemoji from 'twemoji';

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

const krakenBase = 'https://api.twitch.tv/kraken/';
const krakenClientID = '4g5an0yjebpf93392k4c5zll7d7xcec';

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

// function removeChatLine(params = {}) {
// 	if ('channel' in params) {
// 		params.channel = getChannel(params.channel);
// 	}
// 	let search = Object.keys(params)
// 		.map((key) => `[${key}="${params[key]}"]`)
// 		.join('');
// 	chatEle.querySelectorAll(search).forEach((n) => chatEle.removeChild(n));
// }

// function removeAdminChatLine(params = {}) {
// 	params.type = 'admin';
// 	removeChatLine(params);
// }

// function showAdminMessage(opts) {
// 	opts.type = 'admin';
// 	if ('attribs' in opts === false) {
// 		opts.attribs = {};
// 	}
// 	opts.attribs.type = 'admin';
// 	return showMessage(opts);
// }

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

export function handleEmotes(channel, emotes, message) {
	// let messageParts = message.split(' ');
	let bttvEmotes = bttvEmoteCache.data.global.slice(0);
	let ffzEmotes = ffzEmoteCache.data.global.slice(0);
	if (channel in bttvEmoteCache.data) {
		bttvEmotes = bttvEmotes.concat(bttvEmoteCache.data[channel]);
	}
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
	if (bttvEmotes) {
		bttvEmotes.forEach(({ code, id, type, imageType }) => {
			let hasEmote = message.indexOf(code);
			if (hasEmote === -1) {
				return;
			}
			for (
				let start = message.indexOf(code);
				start > -1;
				start = message.indexOf(code, start + 1)
			) {
				let end = start + code.length;
				allEmotes.push({ start, end, id, code, type });
			}
		});
	}

	if (ffzEmotes) {
		ffzEmotes.forEach(({ name, id, type, imageType }) => {
			let hasEmote = message.indexOf(name);
			if (hasEmote === -1) {
				return;
			}
			for (
				let start = message.indexOf(name);
				start > -1;
				start = message.indexOf(name, start + 1)
			) {
				let end = start + name.length;
				allEmotes.push({ start, end, id, name, type });
			}
		});
	}

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
		} else {
			let {
				type: [type, subtype],
				code,
			} = n;
			if (type === 'twitch') {
				if (subtype === 'emote') {
					message.push({
						url: `https://static-cdn.jtvnw.net/emoticons/v1/${n.id}/1.0`,
						alt: code,
					});
				}
			} else if (type === 'bttv') {
				// out = document.createElement('img');
				let url = bttvEmoteCache.urlTemplate;
				url = url.replace('{{id}}', n.id).replace('{{image}}', '1x');
				message.push({ url: url, alt: code });
				// out.setAttribute('src', 'https:' + url);
			} else if (type === 'ffz') {
				let url = ffzEmoteCache.urlTemplate;
				url = url.replace('{{id}}', n.id).replace('{{image}}', '1');
				message.push({ url: url, alt: code });
			}
		}
	});
	return message;
	// twemoji.parse(ele);
}

function formQuerystring(qs = {}) {
	return Object.keys(qs)
		.map((key) => `${key}=${qs[key]}`)
		.join('&');
}

async function request({ base = '', endpoint = '', qs, headers = {}, method = 'get' }) {
	if (!headers) {
		headers = { 'Access-Control-Allow-Origin': '*' };
	}
	let opts = {
		method,
		headers: new Headers(headers),
	};
	const res = await fetch(base + endpoint + '?' + formQuerystring(qs), opts);
	return await res.json();
}

function kraken(opts) {
	let defaults = {
		base: krakenBase,
		headers: {
			'Client-ID': krakenClientID,
			Accept: 'application/vnd.twitchtv.v5+json',
		},
	};
	return request(Object.assign(defaults, opts));
}

export async function twitchNameToUser(username) {
	const { users } = await kraken({
		endpoint: 'users',
		qs: { login: username },
	});
	return users[0] || null;
}

export async function getBadges(channel) {
	const data = await kraken({
		base: 'https://badges.twitch.tv/v1/badges/',
		endpoint: (channel ? `channels/${channel}` : 'global') + '/display',
		qs: { language: 'en' },
	});
	return data.badge_sets;
}

export async function getBTTVEmotes(channel, channelID) {
	let url = '';
	// let endpoint = 'emotes';
	let global = true;
	if (channelID && channel) {
		// endpoint = 'channels/' + channel;
		global = false;
		url = `https://api.betterttv.net/3/cached/users/twitch/${channelID}`;
	} else {
		url = 'https://api.betterttv.net/3/cached/emotes/global';
	}

	const response = await request({
		base: url,
	});

	if (response.status === 404) return;
	// bttvEmoteCache.urlTemplate = urlTemplate;
	if (global) {
		response.forEach((n) => {
			n.global = global;
			n.type = ['bttv', 'emote'];
			bttvEmoteCache.data.global.push(n);
		});
	} else {
		if (response.channelEmotes) {
			response.channelEmotes.forEach((n_1) => {
				n_1.global = global;
				n_1.type = ['bttv', 'emote'];
				if (channel in bttvEmoteCache.data === false) {
					bttvEmoteCache.data[channel] = [];
				}
				bttvEmoteCache.data[channel].push(n_1);
			});
		}
		if (response.sharedEmotes) {
			response.sharedEmotes.forEach((n_1) => {
				n_1.global = global;
				n_1.type = ['bttv', 'emote'];
				if (channel in bttvEmoteCache.data === false) {
					bttvEmoteCache.data[channel] = [];
				}
				bttvEmoteCache.data[channel].push(n_1);
			});
		}
	}
}

export async function getFFZEmotes(channelID) {
	let url = `https://api.frankerfacez.com/v1/room/id/${channelID}`;

	const response = await request({
		base: url,
	});
	if (response.status === 404) return;
	let emotes = Object.values(response.sets)[0].emoticons;
	// console.log(emotes);
	// bttvEmoteCache.urlTemplate = urlTemplate;
	emotes.forEach((n) => {
		n.global = global;
		n.type = ['ffz', 'emote'];
		ffzEmoteCache.data.global.push(n);
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
	if (color !== null) {
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
