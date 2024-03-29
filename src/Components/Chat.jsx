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

const transformPoint = (top, left, scale) => ({ x, y }) => ({
	x: (x - left) / scale,
	y: (y - top) / scale,
});

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
	}

	componentDidMount = () => {
		if (!this.state.disableOverlay) {
			this.client = new tmi.Client({
				connection: { reconnect: true, secure: true },
				channels: [this.props.currentStreamer],
			});
			this.client.connect();
			this.addListeners();

			this.isOnRightSide();
			this.setState({ style: getComputedStyle(this.chatRef.current) });
		}
	};

	componentWillUnmount = () => {
		if (!this.state.disableOverlay) {
			this.client.disconnect();
		}
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
				settings={this.props.settings}
			/>
		);

		// const messages =
		// 	this.state.messages.length > 50
		// 		? this.state.messages.slice(10)
		// 		: this.state.messages;
		const messages = this.state.messages;
		this.setState({ messages: [...messages, chatMessage] }, () =>
			this.scrollToBottom()
		);
	};

	scrollToBottom = () => {
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
							'-moz-transform': settings.chatScale
								? `scale(${settings.chatScale})`
								: 'scale(1)',
						}}
						ref={this.chatRef}
					>
						<motion.div
							className={!settings.compactMode && 'chat-inner'}
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
							{this.state.messages.map((msg, i) => (
								<motion.div key={i} variants={item}>
									{msg}
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
							this.client.disconnect();
							this.setState({ disableOverlay: true });
						}}
					></div>
				</MotionConfig>
			)
		);
	}
}

export default Chat;
