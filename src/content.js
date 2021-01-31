/*global chrome*/
/* src/content.js */
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

const currentStreamer = window.location.pathname.slice(1);

class Main extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			bgColor: 'hsla(211, 100%, -22%, 0.5)',
			compactMode: false,
			numberOfMessages: 10,
			disableOverlay: false,
		};
	}

	componentDidMount = () => {
		chrome.storage.local.get((storage) => {
			this.setState({
				...storage,
			});
		});
	};

	render() {
		console.log('the state', this.state);
		return (
			<App
				bgColor={this.state.bgColor}
				disableOverlay={this.state.disableOverlay}
				numberOfMessages={this.state.numberOfMessages}
				compactMode={this.state.compactMode}
				currentStreamer={currentStreamer}
			/>
		);
	}
}

const app = document.createElement('div');
app.id = 'my-extension-root';

function isFullScreen() {
	setTimeout(checkForFullScreen, 100);
}

function checkForFullScreen() {
	chrome.runtime.sendMessage('getScreenState', (result) => {
		if (result === 'fullscreen') {
			console.log('ITS FULLSCREEN POG');
			ReactDOM.render(<Main />, app);
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.message === 'compactMode') {
		chrome.storage.local.set({
			compactMode: request.value,
		});
	} else if (request.message === 'disableOverlay') {
		chrome.storage.local.set({
			disableOverlay: request.value,
		});
	} else if (request.message === 'colorPicker') {
		chrome.storage.local.set({
			bgColor: request.value,
		});
	} else if (request.message === 'messageNumber') {
		chrome.storage.local.set({
			messageNumber: request.value,
		});
	}
});
