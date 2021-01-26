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
import { motion } from 'framer-motion';

const container = {
	hidden: { opacity: 1, scale: 0 },
	visible: {
		opacity: 1,
		scale: 1,
		transition: {
			staggerChildren: 0.5,
		},
	},
};

const item = {
	hidden: { x: 100, opacity: 0 },
	visible: {
		x: 0,
		opacity: 1,
	},
};

class Chat extends Component {
	constructor(props) {
		super(props);
		this.state = {
			messages: [],
		};
		this.client = new tmi.Client({
			connection: { reconnect: true, secure: true },
			channels: ['lirik'],
		});
		this.chatRef = React.createRef();
	}

	componentDidMount = () => {
		this.client.connect();
		this.addListeners();

		this.scrollToBottom();
	};

	componentDidUpdate() {
		this.scrollToBottom();
	}

	componentWillUnmount = () => {
		this.client.disconnect();
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
		let chatMessage = (
			<ChatMessage
				username={username}
				message={addEmotes(finalMessage)}
				badges={badges}
				color={resolveColor(channel, data.username, data.color)}
			/>
		);

		const messages =
			this.state.messages.length > 50
				? this.state.messages.slice(10)
				: this.state.messages;

		this.setState({ messages: [...messages, chatMessage] });
	};

	scrollToBottom = () => {
		this.messagesEnd.scrollIntoView({ behavior: 'smooth' });
	};

	isOnRightSide = () => {
		if (this.props.constraintsRef.current && this.chatRef.current) {
			let parentPos = this.props.constraintsRef.current.getBoundingClientRect(),
				childPos = this.chatRef.current.getBoundingClientRect(),
				relativePos = {};

			relativePos.right = Math.abs(childPos.right - parentPos.right);
			relativePos.left = Math.abs(childPos.left - parentPos.left);

			return relativePos.left > relativePos.right ? true : false;
		}
	};

	render() {
		const { constraintsRef } = this.props;
		return (
			<motion.div
				drag
				dragConstraints={constraintsRef}
				style={{ height: '700px', width: '400px', overflow: 'hidden' }}
				className="chat"
				ref={this.chatRef}
			>
				<motion.div
					className="chat"
					style={
						this.isOnRightSide()
							? { alignItems: 'flex-end' }
							: { alignItems: 'flex-start' }
					}
					variants={container}
					initial="hidden"
					animate={this.state.messages.length ? 'visible' : 'hidden'}
				>
					{this.state.messages.map((msg, i) => (
						<motion.div key={i} variants={item}>
							{msg}
						</motion.div>
					))}
				</motion.div>
				<div
					ref={(el) => {
						this.messagesEnd = el;
					}}
				></div>
			</motion.div>
		);
	}
}

export default Chat;
