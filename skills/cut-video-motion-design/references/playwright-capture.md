# Capturing websites with Playwright

`scripts/capture_site.mjs` does two jobs:

- **style reference**: screenshots plus design tokens of the site the video should look like
- **B-roll**: clean screenshots of every site the speaker mentions

## Usage

```
node capture_site.mjs <url> <outDir> [options]
  --width 1920 --height 1080   viewport (B-roll: 1600x1000 makes text larger relative to the frame)
  --dsf 2                      device scale factor; 1.5–2 keeps zooms sharp, 1 for backgrounds
  --sections 8                 max per-section screenshots (0 = none)
  --no-tokens                  skip design-token extraction (B-roll)
  --locale en-US               page language (cookie banners and copy follow it)
  --dark                       prefers-color-scheme: dark
  --wait 1500                  extra settle time in ms (animations, fonts, video posters)
  --hide "h1, nav, .hero p"    CSS selectors to hide before the shots (clean backgrounds; keeps their space)
  --remove "#siteNotice"       CSS selectors to remove entirely (in-page banners, e.g. Wikipedia's notices)
  --no-overlays                remove fixed/sticky pop-ups and modal dialogs (newsletters, chat widgets, leftover
                               consent layers) and release their scroll lock; a slim top navigation bar stays
  --prefix hero-clean-         file name prefix so a second pass doesn't overwrite the first
```

For sources shown in a vertical video, a phone-sized capture fits the frame and reads well: `--width 430 --height 932 --dsf 2.5 --no-tokens --sections 0 --no-overlays`.

Outputs in `<outDir>`:

- `viewport.png`
- `fullpage.png`
- `section-NN.png`
- `tokens.json`

## What `tokens.json` contains and how to use it

| Field | Use |
| --- | --- |
| `cssVars` | Custom properties on `:root`/`html`/`body`. Usually the cleanest source of the palette, radius, easing and font stack (`--ink`, `--primary`, `--radius`, `--ease-out`, …) |
| `colors` | Weighted colour census (text colours per element, background colours by area). Shows which colours dominate when the site has no variables |
| `fonts` | Loaded font faces (family, weight range) |
| `fontFiles` | Font URLs the page fetched, to identify the family when names are obfuscated |
| `el.h1`, `el.h2`, `el.p`, `el.button`, `el.link` | Computed styles: weight, size, letter-spacing (heading tracking → `--display-tracking`), button radius and padding |
| `logos` | Logo candidates in header/nav (`src` or inline `svg`) for the intro/outro brand mark |
| `headings` | The site's own phrasing, useful for matching its voice in card copy |
| `sections` | Positions and labels of the captured sections |

`brand_from_tokens.mjs` maps these to CSS variables. Always look at the screenshots too: the details that make a brand recognisable are patterns, not tokens. Examples: a small tracked eyebrow above headings, a two-tone headline whose second line is in the accent colour, a 3D coverflow carousel with dot indicators, hairline-divided lists. Reuse those patterns in callouts, the chapter header and the intro.

## Pitfalls

- **Cookie banners.** The script clicks the first visible consent button matching common English/German labels in any frame (including "Consent" and "Keep analytics off"). If a banner survives, add its button text to `CONSENT`, or run with `--no-overlays`.
- **Scroll-reveal content.** Many sites fade content in with IntersectionObserver. The script scrolls the page once before shooting, but a full-page screenshot can still show blank white areas where reveals reset. Per-section screenshots (taken scrolled into view) are more reliable. Stack them with `ffmpeg -i a.png -i b.png -filter_complex "[0]scale=1920:-1[a];[1]scale=1920:-1[b];[a][b]vstack" scroll.png` for a scrolling browser shot.
- **Background videos** freeze on one frame. That is usually fine and often looks good as a backdrop. `--wait` lets a poster or first frame load. The site's video file URL is in the DOM (`video.currentSrc`); only use it when it's the user's own site.
- **Clean hero backgrounds** for intro/outro: capture again with the headline, buttons and navigation hidden (`--hide "#hero-title, .hero__aside, nav" --dsf 1 --prefix hero-clean-`). Find selectors by printing the hero's DOM path in a short `page.evaluate`.
- **Logos** come from `tokens.logos` or the `<link rel=icon>` URLs. Download with `curl`. Small raster logos (< 100 px) are fine at nav size and get soft above that. Prefer an SVG from the site's press page.
- **Bot protection** (Cloudflare "checking your browser") sometimes blocks headless Chromium. Retry with `--wait 4000`, try `chromium.launch({ channel: 'chrome' })` or `'msedge'`, or capture a different page of the same site.
- **Notification bars and promos** on third-party sites can clutter a shot. `--no-overlays` removes floating ones; `--remove` takes out in-page banners (Wikipedia: `--remove "#siteNotice, #centralNotice"`). Or crop by giving the browser frame a `scroll.from` offset in the timeline.

## Ethics

- The **style reference** is normally the user's own website. If they point at a third-party site, take the visual language as inspiration only: don't copy its logo or wordmark, and don't make the video look like it comes from that brand.
- **B-roll of third-party sites** is fine to illustrate what the speaker is talking about ("you can find videos on Pexels"). Show the site unedited and recognisable, don't suggest endorsement, and don't capture pages behind a login or pages with personal data.
