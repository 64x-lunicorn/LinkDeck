# Chrome Web Store assets

Artwork for the store listing. Nothing here is bundled into the extension —
`npm run build` does not touch this directory.

| File | Purpose | Required format |
| :--- | :--- | :--- |
| `promo-tile-440x280.png` | Small promo tile, shown in store listings and search results | 440×280 PNG or JPEG, **no alpha channel** |
| `render-promo-tile.py` | Regenerates the tile from `public/icons/icon128.png` | — |

Regenerate after an icon or wording change:

```bash
python3 store/render-promo-tile.py public/icons/icon128.png store/promo-tile-440x280.png
```

## Still needed before publishing

The store also asks for at least one **screenshot** at 1280×800 or 640×400.
The images in `images/` are close but not those exact sizes, so they need to be
recaptured or padded to fit.

A **marquee tile** (1400×560) is optional and only used if the listing is
featured.
