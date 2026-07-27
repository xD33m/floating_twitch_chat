# Chrome Web Store promo tiles

Listing artwork, not part of the extension. It lives outside `public/`, so it is
not copied into `build/` and does not end up in the upload zip.

| File                     | Size     | Where the store uses it                                    |
| ------------------------ | -------- | ---------------------------------------------------------- |
| `small-tile-440x280.png` | 440×280  | The card in search results and category listings. Required. |
| `marquee-1400x560.png`   | 1400×560 | Front page and featured carousels.                          |

The PNGs are rendered from the HTML next to them:

```bash
node store/promo/render.mjs
```

That drives the installed Chrome in headless mode at a pinned device scale
factor, because the store rejects a tile whose dimensions are off by a pixel.
Set `CHROME` if the executable is somewhere unusual.

Edit the HTML, re-render, commit both. `_shared.css` holds the palette, which is
the popup's palette (`src/popup/popup.css`); the chat bubbles use
`rgba(0,0,0,0.5)`, the overlay's real default `bgColor`.

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
of what is popular on Twitch. If you swap in others, keep both bars in mind: the
tiles are commercial listing artwork, not chat.

## Still needed for a listing

At least one screenshot, 1280×800 or 640×400. Take a real one of the overlay
running on a fullscreen stream — a mock-up would misrepresent the extension.
