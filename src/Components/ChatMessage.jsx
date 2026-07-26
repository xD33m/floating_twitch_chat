import React, { Component } from 'react';

class ChatMessage extends Component {
	shouldComponentUpdate = () => {
		return false;
	};

	render() {
		const { username, badges, message, color } = this.props;
		const { bgColor, compactMode } = this.props.settings;
		return (
			<div className="chat-line visible">
				<div
					className={
						compactMode ? 'chat-line-inner-compact' : 'chat-line-inner'
					}
					style={{
						backgroundColor: bgColor ? bgColor : 'rgba(0,0,0,0.5)',
					}}
				>
					<span className="badges">
						{badges.map((badge, i) => (
							<img
								key={`${badge.type}-${i}`}
								className="badge"
								src={badge.url}
								alt={badge.type}
							/>
						))}
					</span>
					<span className="username" style={{ color: color }}>
						{username}
					</span>
					<span className="message-colon">: </span>
					<span className="message">
						{message.map((msg, i) =>
							typeof msg === 'string' ? (
								<React.Fragment key={i}>{msg}</React.Fragment>
							) : (
								<img key={i} src={msg.url} alt={msg.alt} title={msg.alt} />
							)
						)}
					</span>
				</div>
			</div>
		);
	}
}

export default ChatMessage;
