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
			chrome.storage.local.set({
				bgColor: color.toRGBA().toString(),
			});
			pickr.hide();
		});
	});
};

document.getElementById('compactMode').addEventListener('click', (event) => {
	chrome.storage.local.set({
		compactMode: event.currentTarget.checked,
	});
});

document.getElementById('disableOverlay').addEventListener('click', (event) => {
	chrome.storage.local.set({
		disableOverlay: event.currentTarget.checked,
	});
});

document.getElementById('messageNumber').addEventListener('input', (event) => {
	chrome.storage.local.set({
		messageNumber: event.target.value,
	});
});
