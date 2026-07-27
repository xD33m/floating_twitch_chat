# Chrome Web Store listing copy

Paste-ready. Artwork is in [promo/](promo/README.md).

## Summary

Max 132 characters. This one is 114.

> Keeps Twitch chat on screen while the video player is fullscreen. Drag it
> anywhere, with FFZ, BTTV and 7TV emotes.

## Description

> Twitch hides chat as soon as you go fullscreen. This puts it back, floating
> over the player.
>
> Press F on Twitch and the overlay is there. Drag it wherever you want it.
>
> - Twitch, FFZ, BTTV and 7TV emotes, plus channel badges
> - Drag to move it anywhere on the player
> - Set the height, scale, background color and opacity
> - Compact mode when you want it out of the way
> - No Twitch login, and the only permission it needs is storage

## Notes on the claims

Keep these true if you edit the copy.

- **7TV and badges.** Both work (`src/js/chat.js`) and the old copy left them out.
  Badges come from `api.ivr.fi`.
- **Press F.** The overlay only renders while the player is fullscreen, which is
  the one thing users get stuck on. The popup says the same thing.
- **No login.** `tmi.Client` is created without an `identity`, so it reads chat
  anonymously.
- **Only permission is storage.** True as of `manifest.json`. It does fetch emote
  and badge lists from Twitch, BTTV, FFZ, 7TV and ivr.fi, so do not upgrade this
  into a claim that nothing leaves the browser.
