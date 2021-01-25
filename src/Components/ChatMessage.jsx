import React, { Component } from 'react';

class ChatMessage extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount = () => {};

	render() {
		const { username, badges, message } = this.props;
		return (
			<div className="chat-line visible">
				<div className="chat-line-inner">
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
					<span className="user-name">{username}</span>
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
