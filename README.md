# Floating Twitch Chat

Chrome extension that overlays Twitch chat on top of the fullscreen video
player, so you can read chat without leaving fullscreen.

## Build

```bash
npm install
npm run build
```

The loadable extension is written to `build/`. Load it via
`chrome://extensions` → _Developer mode_ → _Load unpacked_ → pick `build/`.

`npm run watch` rebuilds on change (reload the extension in
`chrome://extensions` afterwards).

## Tests

```bash
npm test            # offline: emote/badge parsing and rendering
npm run test:live   # hits the real Twitch/BTTV/FFZ/7TV endpoints and Twitch IRC
```

`npm run test:live` needs network access. It is the check that catches an
upstream API disappearing, which is what broke emotes and badges before.

## Layout

| Path                    | What it is                                                 |
| ----------------------- | ---------------------------------------------------------- |
| `src/content.js`        | Content script: mounts/unmounts the overlay on the player  |
| `src/Components/`       | The React overlay itself                                   |
| `src/js/chat.js`        | Emote (Twitch, BTTV, FFZ, 7TV) and badge fetching, matching and URL building |
| `public/manifest.json`  | Manifest V3                                                |
| `public/app/background.js` | Service worker; only reports the window's fullscreen state |
| `public/popup.html` + `public/app/popup.js` | The settings popup                     |

Everything under `public/` is copied into `build/` verbatim; only `src/` is
bundled.

## Notes on the third party APIs

The overlay reads chat over IRC (via tmi.js) and needs emote, badge and channel
metadata that IRC does not carry:

- **Channel id** comes from the `room-id` IRC tag. The old Kraken (v5)
  `users` lookup it used to do is gone, and Helix needs a client id and a token,
  which an extension cannot keep secret.
- **Badges** come from `api.ivr.fi/v2/twitch/badges` (a public Helix mirror).
  `badges.twitch.tv`, which this used before, no longer even resolves.
- **Twitch emotes** use the v2 emoticon CDN; v1 is deprecated.
- **BTTV**, **FFZ** and **7TV** use their public `api.betterttv.net/3`,
  `api.frankerfacez.com/v1` and `7tv.io/v3` endpoints. When the same code exists
  in more than one of them, 7TV wins, then BTTV, then FFZ — the order the
  established chat clients use. A Twitch emote always beats all three, since
  Twitch tells us its exact position in the message.

Third party emote codes are matched as whole words, so `monkaS` does not match
inside `monkaSSS`. A channel that has nothing configured with a provider answers
404, which is treated as "no emotes", not as an error; any provider failing at
all just means its emotes render as plain text.

All of them answer with a permissive `Access-Control-Allow-Origin`, so the
content script fetches them directly and the extension needs no host
permissions beyond the `content_scripts` match. Requests are kept simple (no
custom headers) so they are not preflighted.
