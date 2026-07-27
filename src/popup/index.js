/* global chrome */

// Bundled rather than loaded from a CDN: MV3 forbids remote code, and a popup
// that needs the network to look right is no fun. It is imported (not copied out
// of node_modules) so the build does not care how the package manager lays its
// store out.
import '@simonwep/pickr/dist/themes/nano.min.css';
import './popup.css';
import Pickr from '@simonwep/pickr';

const DEFAULTS = {
	compactMode: false,
	disableOverlay: false,
	bgColor: 'rgba(0,0,0,0.5)',
	chatHeight: 50,
	chatScale: 1,
};

const $ = (id) => document.getElementById(id);

// chrome.storage can fail (corrupt profile, storage still starting up). It used
// to take the whole popup down with it -- including the colour picker -- so fall
// back to the defaults and still render something usable.
function readSettings() {
	return new Promise((resolve) => {
		try {
			chrome.storage.local.get((storage) => {
				if (chrome.runtime.lastError || !storage) {
					console.warn(
						'[floating-twitch-chat] could not read settings:',
						chrome.runtime.lastError
					);
					resolve({});
					return;
				}
				resolve(storage);
			});
		} catch (error) {
			console.warn('[floating-twitch-chat] could not read settings:', error);
			resolve({});
		}
	});
}

function save(values) {
	try {
		chrome.storage.local.set(values, () => {
			if (chrome.runtime.lastError) {
				console.warn(
					'[floating-twitch-chat] could not save settings:',
					chrome.runtime.lastError
				);
			}
		});
	} catch (error) {
		console.warn('[floating-twitch-chat] could not save settings:', error);
	}
}

// The filled part of a slider track is painted from --fill, so it has to follow
// the value on every change.
function paintTrack(slider) {
	const min = Number(slider.min);
	const ratio = (Number(slider.value) - min) / (Number(slider.max) - min);
	slider.style.setProperty('--fill', `${ratio * 100}%`);
}

function pick(storage, key) {
	return storage[key] === undefined ? DEFAULTS[key] : storage[key];
}

async function init() {
	const storage = await readSettings();

	$('compactMode').checked = Boolean(pick(storage, 'compactMode'));
	$('disableOverlay').checked = Boolean(pick(storage, 'disableOverlay'));

	const chatHeight = pick(storage, 'chatHeight');
	$('chatHeight').value = chatHeight;
	$('heightValue').textContent = chatHeight;
	paintTrack($('chatHeight'));

	const chatScale = pick(storage, 'chatScale');
	$('chatScale').value = chatScale * 10;
	$('scaleValue').textContent = Math.round(chatScale * 100);
	paintTrack($('chatScale'));

	const pickr = Pickr.create({
		el: '.color-picker',
		theme: 'nano',
		default: pick(storage, 'bgColor'),
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
	pickr.on('save', (color) => {
		save({ bgColor: color.toRGBA().toString() });
		pickr.hide();
	});
}

$('compactMode').addEventListener('change', (event) => {
	save({ compactMode: event.currentTarget.checked });
});

$('disableOverlay').addEventListener('change', (event) => {
	save({ disableOverlay: event.currentTarget.checked });
});

$('chatHeight').addEventListener('input', (event) => {
	$('heightValue').textContent = event.target.value;
	paintTrack(event.target);
	save({ chatHeight: Number(event.target.value) });
});

$('chatScale').addEventListener('input', (event) => {
	$('scaleValue').textContent = Math.round(event.target.value * 10);
	paintTrack(event.target);
	save({ chatScale: Number(event.target.value) / 10 });
});

$('reset').addEventListener('click', () => {
	save({ ...DEFAULTS });
	window.location.reload();
});

init();
