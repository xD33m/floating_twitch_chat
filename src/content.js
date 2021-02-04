/*global chrome*/
/* src/content.js */
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

class Main extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			bgColor: 'hsla(211, 100%, -22%, 0.5)',
			compactMode: false,
			disableOverlay: false,
			numberOfMessages: 10,
			chatHeight: 500,
		};
	}

	render() {
		const { settings } = this.props;
		console.log('seetings', settings);
		return (
			<App
				bgColor={settings.bgColor || this.state.bgColor}
				disableOverlay={settings.disableOverlay || this.state.disableOverlay}
				numberOfMessages={
					settings.numberOfMessages || this.state.numberOfMessages
				}
				compactMode={settings.compactMode || this.state.compactMode}
				chatHeight={settings.chatHeight || this.state.chatHeight}
				currentStreamer={this.props.currentStreamer}
			/>
		);
	}
}

const app = document.createElement('div');
app.id = 'chat-overlay-root';

function isFullScreen() {
	setTimeout(checkForFullScreen, 100);
}

function checkForFullScreen() {
	chrome.runtime.sendMessage('getScreenState', (result) => {
		if (result === 'fullscreen') {
			console.log('ITS FULLSCREEN POG');
			chrome.storage.local.get((storage) => {
				ReactDOM.render(
					<Main
						settings={storage}
						currentStreamer={window.location.pathname.slice(1)}
					/>,
					app
				);
			});
		} else {
			console.log('no fullscreen :(');
			ReactDOM.unmountComponentAtNode(app);
		}
	});
}

(() => {
	var docLoaded = setInterval(function () {
		if (document.readyState !== 'complete') return;
		clearInterval(docLoaded);
		let hookElement = setInterval(() => {
			let el = document.querySelector(
				'[data-test-selector="video-player__video-container"]'
			);
			if (el) {
				el.appendChild(app);
				clearInterval(hookElement);
				isFullScreen();
			} else {
				return;
			}
		}, 30);

		window.addEventListener(
			'resize',
			() => {
				isFullScreen();
			},
			false
		);
	}, 30);
})();
