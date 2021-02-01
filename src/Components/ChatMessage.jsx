import React, { Component } from 'react';

class ChatMessage extends Component {
	shouldComponentUpdate = () => {
		return false;
	};

	render() {
		const { username, badges, message, color } = this.props;
		const {
			bgColor,
			disableOverlay,
			numberOfMessages,
			compactMode,
			currentStreamer,
		} = this.props.settings;
		return (
			<div className="chat-line visible">
				<div
					className={
						compactMode ? 'chat-line-inner-compact' : 'chat-line-inner'
					}
					style={{
						backgroundColor: bgColor ? bgColor : 'hsla(211, 100%, -22%, 0.5)',
					}}
				>
					<span className="badges">
						{badges.map((badge) => {
							return (
								<img
									className="badge"
									src={badge.url}
									badgetype={badge.type}
									alt={badge.type}
								/>
							);
						})}
					</span>
					<span className="username" style={{ color: color }}>
						{username}
					</span>
					<span className="message-colon">: </span>
					<span className="message">
						{message.map((msg) => {
							if (typeof msg === 'string') {
								return msg;
							} else {
								return <img src={msg.url} alt={msg.alt} />;
							}
						})}
					</span>
				</div>
			</div>
		);
	}
}

export default ChatMessage;
