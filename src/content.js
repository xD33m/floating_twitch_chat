/*global chrome*/
/* src/content.js */
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
class Main extends React.Component {
	render() {
		return <App document={document} window={window} isExt={true} />;
	}
}

const app = document.createElement('div');
app.id = 'my-extension-root';
// app.style.display = 'none';

// ReactDOM.render(<Main />, app);

function isFullScreen(callback) {
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
			// hideOverlay();
		}
	});
}

// function fullscreenChanged(event) {
// 	console.log('Fullscreen: ' + event.detail);
// 	alert('Fullscreen: ' + event.detail);
// }

// function sendEvent(fullscreen) {
// 	var event = new CustomEvent('fullscreenchange', {
// 		detail: fullscreen,
// 		bubbles: true,
// 		cancelable: true,
// 	});

// 	if (document.fullscreenElement) document.fullscreenElement.dispatchEvent(event);
// 	else document.dispatchEvent(event);
// }

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

		var ok = true;
		window.addEventListener(
			'resize',
			() => {
				setTimeout(() => {
					if (ok) {
						ok = false;
						setTimeout(() => {
							ok = true;
						}, 170);
						isFullScreen();
					}
				}, 30);
			},
			false
		);
	}, 30);
	// window.addEventListener('load', () => {
	// 	// document
	// 	// 	.querySelector('button[data-a-target="player-fullscreen-button"]')
	// 	// 	.addEventListener('click', isFullScreen);
	// 	// document.addEventListener('fullscreenchange', fullscreenChanged, false);
	// });
})();

// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
// 	if (request.message === 'clicked_browser_action') {
// 		toggle();
// 	}
// });

// const displayOverlay = () => {
// 	app.style.display = 'block';
// };

// const hideOverlay = () => {
// 	app.style.display = 'none';
// };

// const toggle = () => {
// 	if (app.style.display === 'none') {
// 	} else {
// 		app.style.display = 'none';
// 	}
// };
