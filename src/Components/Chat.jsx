import React, { Component } from 'react';
import {
	getBTTVEmotes,
	twitchBadgeCache,
	bttvEmoteCache,
	getBadges,
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
import { motion, MotionConfig } from 'framer-motion';

const container = {
	hidden: { opacity: 1, scale: 0 },
	visible: {
		opacity: 1,
		scale: 1,
		transition: {
			staggerChildren: 0.5,
		},
	},
	compact: { opacity: 1, scale: 1 },
};

const item = {
	hidden: { x: 100, opacity: 0 },
	visible: {
		x: 0,
		opacity: 1,
	},
	compact: { opacity: 1, scale: 1 },
};

// The overlay only ever shows the last handful of lines, but nothing used to
// drop the older ones, so a long stream kept growing the DOM forever.
const MAX_MESSAGES = 100;

const transformPoint = (top, left, scale) => ({ x, y }) => ({
	x: (x - left) / scale,
	y: (y - top) / scale,
});

const warn = (what) => (error) =>
	console.warn(`[floating-twitch-chat] could not load ${what}:`, error);

class Chat extends Component {
	constructor(props) {
		super(props);
		this.state = {
			messages: [],
			isOnRightSide: true,
			disableOverlay: props.settings.disableOverlay,
			style: '',
		};

		this.chatRef = React.createRef();
		this.innerChatRef = React.createRef();
		this.nextMessageId = 0;
		// Channels whose BTTV/FFZ/badge data we already requested.
		this.loadedChannels = new Set();
	}

	componentDidMount = () => {
		if (!this.state.disableOverlay) {
			this.client = new tmi.Client({
				connection: { reconnect: true, secure: true },
				channels: [this.props.currentStreamer],
			});
			this.client.connect().catch(warn('the Twitch chat connection'));
			this.addListeners();

			this.isOnRightSide();
			this.setState({ style: getComputedStyle(this.chatRef.current) });
		}
	};

	componentWillUnmount = () => {
		this.disconnect();
	};

	// tmi.js rejects when the socket is already closed, e.g. when the close button
	// disconnected us and the overlay is unmounted afterwards.
	disconnect = () => {
		if (this.client) {
			this.client.disconnect().catch(() => {});
		}
	};

	addListeners = () => {
		this.client.on('connected', () => {
			getBTTVEmotes().catch(warn('global BTTV emotes'));
			getFFZEmotes().catch(warn('global FFZ emotes'));
			getBadges()
				.then((badges) => (twitchBadgeCache.data.global = badges))
				.catch(warn('global badges'));
		});

		this.client.on('disconnected', () => {
			twitchBadgeCache.data = { global: {} };
			bttvEmoteCache.data = { global: [] };
			ffzEmoteCache.data = { global: [] };
			this.loadedChannels.clear();
		});

		this.client.on('message', this.handleMessage);
		this.client.on('cheer', this.handleMessage);

		// The channel id used to come from the Kraken users endpoint, which no
		// longer exists. IRC already tells us: ROOMSTATE is sent right after the
		// join, and every message carries the same `room-id` tag as a fallback.
		this.client.on('roomstate', (channel, state) => {
			this.loadChannelData(channel, state['room-id']);
		});

		this.client.on('part', (channel, username, self) => {
			if (!self) {
				return;
			}
			let chan = getChannel(channel);
			delete bttvEmoteCache.data[chan];
			delete ffzEmoteCache.data[chan];
			delete twitchBadgeCache.data[chan];
			this.loadedChannels.delete(chan);
		});
	};

	loadChannelData = (channel, roomId) => {
		const chan = getChannel(channel);
		if (!roomId || this.loadedChannels.has(chan)) {
			return;
		}
		this.loadedChannels.add(chan);

		getBTTVEmotes(chan, roomId).catch(warn(`BTTV emotes for ${chan}`));
		getFFZEmotes(chan, roomId).catch(warn(`FFZ emotes for ${chan}`));
		getBadges(roomId)
			.then((badges) => (twitchBadgeCache.data[chan] = badges))
			.catch(warn(`badges for ${chan}`));
	};

	handleMessage = (channel, data, message, fromSelf) => {
		let chan = getChannel(channel);
		this.loadChannelData(channel, data['room-id']);
		let username = data['display-name'] || data.username;
		if (/[^\w]/g.test(username)) {
			username += ` (${data.username})`;
		}
		data.name = username;

		const chatMessage = {
			id: this.nextMessageId++,
			username,
			message: addEmotes(handleEmotes(chan, data.emotes || {}, message)),
			badges: prepareBadges(chan, data),
			color: resolveColor(channel, data.username, data.color),
		};

		this.setState(
			({ messages }) => ({
				messages: [...messages, chatMessage].slice(-MAX_MESSAGES),
			}),
			() => this.scrollToBottom()
		);
	};

	scrollToBottom = () => {
		if (!this.chatRef.current) {
			return;
		}
		const scroll =
			this.chatRef.current.scrollHeight - this.chatRef.current.clientHeight;
		this.chatRef.current.scrollTo(0, scroll);
	};

	isOnRightSide = () => {
		if (this.props.constraintsRef.current && this.chatRef.current) {
			let parentPos = this.props.constraintsRef.current.getBoundingClientRect(),
				childPos = this.chatRef.current.getBoundingClientRect(),
				relativePos = {};

			relativePos.right = Math.abs(
				childPos.right - parentPos.right / this.props.settings.chatScale
			);
			relativePos.left = Math.abs(childPos.left - parentPos.left);

			const isOnRightSide = relativePos.left > relativePos.right ? true : false;
			this.setState({ isOnRightSide: isOnRightSide });
		}
	};

	render() {
		const { constraintsRef, settings } = this.props;
		return (
			!this.state.disableOverlay && (
				<MotionConfig
					transformPagePoint={
						settings.chatScale
							? transformPoint(0, 0, settings.chatScale)
							: transformPoint(0, 0, 1)
					}
				>
					<motion.div
						drag
						dragConstraints={constraintsRef}
						dragMomentum={false}
						onDrag={() => this.isOnRightSide()}
						className="chat"
						style={{
							height: settings.chatHeight ? `${settings.chatHeight}vh` : '50vh',
							zoom: settings.chatScale ? settings.chatScale : '1',
							MozTransform: settings.chatScale
								? `scale(${settings.chatScale})`
								: 'scale(1)',
						}}
						ref={this.chatRef}
					>
						<motion.div
							className={settings.compactMode ? undefined : 'chat-inner'}
							style={
								this.state.isOnRightSide
									? { alignItems: 'flex-end' }
									: { alignItems: 'flex-start' }
							}
							variants={container}
							initial={settings.compactMode ? 'compact' : 'hidden'}
							animate={
								settings.compactMode
									? 'compact'
									: this.state.messages.length
									? 'visible'
									: 'hidden'
							}
							ref={this.innerChatRef}
						>
							{this.state.messages.map((msg) => (
								<motion.div key={msg.id} variants={item}>
									<ChatMessage
										username={msg.username}
										message={msg.message}
										badges={msg.badges}
										color={msg.color}
										settings={settings}
									/>
								</motion.div>
							))}
						</motion.div>
					</motion.div>
					<div
						className={
							this.state.isOnRightSide ? 'btn-right close' : 'btn-left close'
						}
						style={{
							transform: this.state.style.transform,
						}}
						onClick={() => {
							this.disconnect();
							this.setState({ disableOverlay: true });
						}}
					></div>
				</MotionConfig>
			)
		);
	}
}

export default Chat;
