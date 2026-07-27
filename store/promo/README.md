# Chrome Web Store listing artwork

Listing images, not part of the extension. This lives outside `public/`, so none
of it is copied into `build/` or ends up in the upload zip.

| File                     | Size     | Where the store uses it                                     |
| ------------------------ | -------- | ----------------------------------------------------------- |
| `small-tile-440x280.png` | 440×280  | The card in search results and category listings. Required.  |
| `marquee-1400x560.png`   | 1400×560 | Front page and featured carousels.                          |
| `screenshot-1280x800.png`| 1280×800 | Listing screenshots. At least one is required.              |
| `screenshot-640x400.png` | 640×400  | The same screenshot at the smaller allowed size.            |

Every screenshot in a listing has to be the same size, so pick 1280×800 **or**
640×400 and upload that one. Both come off `screenshot-1280x800.html`: 640×400 is
exactly half, so `render.mjs` renders it a second time at `?scale=0.5`, which
lays the text out at the smaller size instead of resampling a bigger PNG.

## Rendering

```bash
node store/promo/render.mjs
```

Drives the installed Chrome headless at a pinned device scale factor, because the
store rejects an image whose dimensions are off by a pixel. Needs no network. Set
`CHROME` if the executable is somewhere unusual.

Edit the HTML, re-render, commit the PNG alongside it. `_shared.css` holds the
palette, which is the popup's palette (`src/popup/popup.css`); the chat bubbles
use `rgba(0,0,0,0.5)`, the overlay's real default `bgColor`, at the overlay's real
400px width.

## What is real and what is not

The screenshot is a composed product shot, not a capture of one moment. It cannot
be: the popup opens from the toolbar, which does not exist while the player is
fullscreen. So the player behind it is deliberately abstract rather than a
mocked-up stream pretending to be a capture.

The parts that make claims are real. The settings panel is the actual popup,
rendered from `build/` by `capture-popup.mjs`:

```bash
pnpm build && node store/promo/capture-popup.mjs
```

That injects a stand-in for the two `chrome.*` APIs the popup uses, renders it
with its real stylesheet and bundle, measures the laid-out height and screenshots
it to `generated/popup.png` at exactly that size. Re-run it whenever the popup
changes, or the screenshot will show an old one.

## Emotes

The bubbles show real 7TV emotes, pulled from the same public v3 API and CDN the
extension reads (`src/js/chat.js`):

```bash
node store/promo/fetch-emotes.mjs
```

They land in `emotes/` and are committed, so rendering needs no network and the
artwork cannot change under us when someone re-uploads an emote. Uploaders are
credited in [emotes/CREDITS.md](emotes/CREDITS.md).

The set is deliberately small. An emote has to still read at 20px, and it has to
be original art -- no Pepe derivatives and no real person's face, which is most
of what is popular on Twitch. If you swap in others, keep both bars in mind: this
is commercial listing artwork, not chat.
