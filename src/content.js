/*global chrome*/
/* src/content.js */
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

class Main extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	render() {
		return <App currentStreamer={this.props.currentStreamer} />;
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
			const currentStreamer = window.location.pathname.slice(1);
			ReactDOM.render(<Main currentStreamer={currentStreamer} />, app);
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

// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
// 	if (request.message === 'clicked_browser_action') {
// 		toggle();
// 	}
// });
