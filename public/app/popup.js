/* global chrome */
/* global Pickr */

window.onload = function () {
	chrome.storage.local.get((storage) => {
		document.getElementById('compactMode').checked = storage.compactMode;
		document.getElementById('disableOverlay').checked = storage.disableOverlay;
		document.getElementById('chatHeight').value = storage.chatHeight || 50;
		document.getElementById('heightValue').innerHTML = storage.chatHeight || 50;
		document.getElementById('chatScale').value = storage.chatScale * 10 || 10;
		document.getElementById('scaleValue').innerHTML =
			storage.chatScale * 100 || 100;
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

document.getElementById('chatHeight').addEventListener('input', (event) => {
	document.getElementById('heightValue').innerHTML = event.target.value;
	chrome.storage.local.set({
		chatHeight: event.target.value,
	});
});

document.getElementById('chatScale').addEventListener('input', (event) => {
	document.getElementById('scaleValue').innerHTML = Math.floor(
		event.target.value * 10
	);
	chrome.storage.local.set({
		chatScale: event.target.value / 10,
	});
});

document.getElementById('reset').addEventListener('click', (event) => {
	chrome.storage.local.set({
		compactMode: false,
		disableOverlay: false,
		bgColor: 'rgba(0,0,0,0.5)',
		chatHeight: 50,
		chatScale: 1,
	});
	window.location.reload();
});
