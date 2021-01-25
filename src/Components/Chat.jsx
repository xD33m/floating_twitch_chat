import React, { Component } from 'react';
import '../App.css';
import {
	getBTTVEmotes,
	twitchBadgeCache,
	bttvEmoteCache,
	getBadges,
	twitchNameToUser,
	getChannel,
	prepareBadges,
	handleEmotes,
	addEmotes,
	getFFZEmotes,
	resolveColor,
	ffzEmoteCache,
} from '../js/chat';
import tmi from 'tmi.js';
import ChatMessage from './ChatMessage';

class Chat extends Component {
	constructor(props) {
		super(props);
		this.state = {
			messages: [],
		};
		this.client = new tmi.Client({
			connection: { reconnect: true, secure: true },
			channels: ['Lirik'],
		});
	}

	componentDidMount = () => {
		this.client.connect();
		this.addListeners();
	};

	addListeners = () => {
		this.client.on('connected', () => {
			getBTTVEmotes(); // load globals
			// getFFZEmotes();
			getBadges().then((badges) => (twitchBadgeCache.data.global = badges));
		});

		this.client.on('disconnected', () => {
			twitchBadgeCache.data = { global: {} };
			bttvEmoteCache.data = { global: [] };
			ffzEmoteCache.data = { global: [] };
		});

		this.client.on('message', this.handleMessage);
		this.client.on('cheer', this.handleMessage);

		this.client.on('join', (channel, username, self) => {
			if (!self) {
				return;
			}
			let chan = getChannel(channel);

			twitchNameToUser(chan)
				.then((user) => {
					getBTTVEmotes(chan, user._id);
					getFFZEmotes(user._id);
					return getBadges(user._id);
				})
				.then((badges) => (twitchBadgeCache.data[chan] = badges));
		});

		this.client.on('part', (channel, username, self) => {
			if (!self) {
				return;
			}
			let chan = getChannel(channel);
			delete bttvEmoteCache.data[chan];
		});

		// this.client.on('clearchat', (channel) => {
		// 	removeChatLine({ channel });
		// });

		// this.client.on('timeout', (channel, username) => {
		// 	removeChatLine({ channel, username });
		// });
	};

	handleMessage = (channel, data, message, fromSelf) => {
		let chan = getChannel(channel);
		let username = data['display-name'] || data.username;
		if (/[^\w]/g.test(username)) {
			username += ` (${data.username})`;
		}
		data.name = username;
		let badges = prepareBadges(chan, data);
		let finalMessage = handleEmotes(chan, data.emotes || {}, message);
		// console.log(addEmotes(finalMessage));
		let chatMessage = (
			<ChatMessage
				username={username}
				message={addEmotes(finalMessage)}
				badges={badges}
				color={resolveColor(channel, data.username, data.color)}
			/>
		);

		this.setState({ messages: [...this.state.messages, chatMessage] });
		if (this.state.messages.length > 10) {
			const arr = this.state.messages.slice(1);
			this.setState({ messages: arr });
		}
	};

	componentWillUnmount = () => {
		this.client.disconnect();
	};

	render() {
		return <div id="chat">{this.state.messages.map((msg) => msg)}</div>;
	}
}

export default Chat;
