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
			channels: ['xQcOW'],
		});
	}

	componentDidMount = () => {
		this.client.connect();
		this.addListeners();
	};

	addListeners = () => {
		// this.client.on('connecting', () => {
		// 	showAdminMessage({
		// 		message: 'Connecting...',
		// 		attribs: { subtype: 'connecting' },
		// 	});
		// 	removeAdminChatLine({ subtype: 'disconnected' });
		// });

		this.client.on('connected', () => {
			getBTTVEmotes();
			getFFZEmotes();
			getBadges().then((badges) => (twitchBadgeCache.data.global = badges));
			// showAdminMessage({
			// 	message: 'Connected...',
			// 	attribs: { subtype: 'connected' },
			// 	timeout: 5000,
			// });
			// removeAdminChatLine({ subtype: 'connecting' });
			// removeAdminChatLine({ subtype: 'disconnected' });
		});

		this.client.on('disconnected', () => {
			twitchBadgeCache.data = { global: {} };
			bttvEmoteCache.data = { global: [] };
			// showAdminMessage({
			// 	message: 'Disconnected...',
			// 	attribs: { subtype: 'disconnected' },
			// });
			// removeAdminChatLine({ subtype: 'connecting' });
			// removeAdminChatLine({ subtype: 'connected' });
		});

		this.client.on('message', this.handleMessage);
		this.client.on('cheer', this.handleMessage);

		this.client.on('join', (channel, username, self) => {
			if (!self) {
				return;
			}
			let chan = getChannel(channel);
			getBTTVEmotes(chan);
			twitchNameToUser(chan)
				.then((user) => getBadges(user._id))
				.then((badges) => (twitchBadgeCache.data[chan] = badges));
			// showAdminMessage({
			// 	message: `Joined ${chan}`,
			// 	timeout: 1000,
			// });
		});

		this.client.on('part', (channel, username, self) => {
			if (!self) {
				return;
			}
			let chan = getChannel(channel);
			delete bttvEmoteCache.data[chan];
			// showAdminMessage({
			// 	message: `Parted ${chan}`,
			// 	timeout: 1000,
			// });
		});

		// this.client.on('clearchat', (channel) => {
		// 	removeChatLine({ channel });
		// });

		// this.client.on('timeout', (channel, username) => {
		// 	removeChatLine({ channel, username });
		// });
	};

	handleMessage = (channel, data, message, fromSelf) => {
		// console.log(message);

		let chan = getChannel(channel);
		let username = data['display-name'] || data.username;
		if (/[^\w]/g.test(username)) {
			username += ` (${data.username})`;
		}
		data.name = username;
		let badges = prepareBadges(chan, data);
		let finalMessage = handleEmotes(chan, data.emotes || {}, message);
		console.log(addEmotes(finalMessage));
		let chatMessage = (
			<ChatMessage
				username={username}
				message={addEmotes(finalMessage)}
				badges={badges}
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
		return <div>{this.state.messages.map((msg) => msg)}</div>;
	}
}

export default Chat;
