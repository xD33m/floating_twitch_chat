/* global chrome */
/* global Pickr */

window.onload = function () {
	chrome.storage.local.get((storage) => {
		console.log(storage);
		document.getElementById('compactMode').checked = storage.compactMode;
		document.getElementById('disableOverlay').checked = storage.disableOverlay;
		document.getElementById('messageNumber').value = storage.messageNumber || 10;
		let pickr = Pickr.create({
			el: '.color-picker',
			theme: 'nano',
			default: storage.bgColor || 'rgba(0,0,0,0.5)',
			components: {
				preview: true,
				opacity: true,
				hue: true,
				interaction: {
					hex: false,
					rgba: false,
					hsla: false,
					hsva: false,
					cmyk: false,
					input: false,
					clear: false,
					save: true,
				},
			},
		});
		pickr.on('save', (color, instance) => {
			sendMessageToContentScript({
				message: 'colorPicker',
				value: color.toRGBA().toString(),
			});
			pickr.hide();
		});
	});
};

const sendMessageToContentScript = (msg) => {
	chrome.tabs.query(
		{
			url: '*://*.twitch.tv/*',
		},
		(tabs) => {
			console.log(tabs);

			for (const tab of tabs) {
				chrome.tabs.sendMessage(tab.id, msg);
			}
		}
	);
};

document.getElementById('compactMode').addEventListener('click', (event) => {
	sendMessageToContentScript({
		message: 'compactMode',
		value: event.currentTarget.checked,
	});
});

document.getElementById('disableOverlay').addEventListener('click', (event) => {
	sendMessageToContentScript({
		message: 'disableOverlay',
		value: event.currentTarget.checked,
	});
});

document.getElementById('messageNumber').addEventListener('input', (event) => {
	sendMessageToContentScript({ message: 'messageNumber', value: event.target.value });
});
