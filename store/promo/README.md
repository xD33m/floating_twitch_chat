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

## Still needed for a listing

At least one screenshot, 1280×800 or 640×400. Take a real one of the overlay
running on a fullscreen stream — a mock-up would misrepresent the extension.
