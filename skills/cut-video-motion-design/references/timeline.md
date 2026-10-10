# `project.json` and `timeline.mjs` reference

## Contents
1. project.json: sources, cutting, captions, assets, render
2. timeline.mjs: structure, time anchoring, coordinates
3. layout, intro/outro, chapters
4. camera, spots, holds
5. callouts (all kinds)
6. B-roll (browser, carousel)
7. Measuring rects

## 1. project.json

```jsonc
{
  "source": "C:/path/recording.mp4",            // any ffmpeg-readable video
  "output": "C:/path/recording_edit.mp4",
  "buildDir": "build",
  "size": [1920, 1080],                          // output frame size (compositor is laid out for 1920x1080)
  "language": "en",                              // whisper language or "auto"
  "screen": { "x": 96, "y": 0, "w": 1728, "h": 1020 },   // source region shown in the screen card; omit = full frame
  "cam": { "cx": 1650.7, "cy": 842, "r": 146, "paintR": 158 }, // burned-in webcam bubble (optional)
  "whisper": { "bin": "...", "model": "...", "prompt": "Names, products", "dtw": "large.v3.turbo" },
  "fixes": [["cloud code", "Claude Code"], ["ultra code", "Ultracode"]],
  "cut": {
    "thresholdDb": -42,      // frames louder than this may be speech
    "speechDb": -30,         // ...but a run only counts as speech if it peaks above this (breaths don't)
    "minGap": 0.12, "minBlip": 0.05,
    "pre": 0.08, "post": 0.14,                  // breathing room kept before/after speech
    "leadIn": 0.25, "tail": 0.3,
    "pause": { "sentence": 0.34, "comma": 0.22, "word": 0.12 },   // longest pause kept after . , or mid-phrase
    "start": 0, "end": 185.45,                  // source range to use
    "outroHold": 2.6                            // seconds of end card after the last word
  },
  "captions": { "maxChars": 42, "idealChars": 34, "skip": [[185.15, 999]] },   // skip = caption-only removal (source s)
  "drop": [[12.4, 14.1]],                        // source ranges removed from audio+video (false starts, retakes)
  "assets": {                                    // optional; these are the defaults
    "icon": ["node_modules/@phosphor-icons/core/assets/{weight}/{name}-{weight}.svg"],
    "logo": ["assets/logos/{name}/{file}", "node_modules/simple-icons/icons/{name}.svg"],
    "sfxDir": "assets/sfx"
  },
  "brand": {                                     // optional
    "hero": "build/sites/<site>/hero-clean-viewport.png",   // dark intro/outro backdrop (else a gradient)
    "logoWhite": "assets/brand/logo-white.png", "logo": "assets/brand/logo.png"
  },
  "sfx": {                                       // names referenced by events' "sfx"; "chapter", "intro", "outro" are automatic
    "pop": { "file": "kenney/interface-sounds/pluck-001.ogg", "gain": -21 },
    "whoosh": { "synth": "whoosh", "gain": -20 },
    "chapter": { "file": "kenney/interface-sounds/toggle-002.ogg", "gain": -24 }
  },
  "render": { "fps": 60, "workers": 8, "crf": 17, "preset": "medium", "jpegQuality": 95 }
}
```

## 2. timeline.mjs

```js
export default ({ at, sites, P, cuts }) => ({ layout, introEnd, outroStart, dissolve, intro, outro,
                                             chapters, camera, spots, callouts, broll, holds });
```

- `at(src)` maps a **source** time (seconds in the raw recording) to the output timeline. Write every time as `at(<source seconds>)` and take the seconds from `build/cuts.json` → `words[].src` (or from `build/words.json`). If you re-cut later, nothing drifts.
- Inside a removed pause, `at()` returns the start of the next kept segment.
- `sites(name, kind = 'viewport')` returns the served path of `build/sites/<name>/<kind>.png`.
- `asset(path)` returns the served path of any file in the project (a mascot image, a logo, a still).
- **Screen coordinates** (camera rects, spots) are pixels in the `screen` crop, i.e. source pixel minus `screen.x/y`.
- **Frame coordinates** (callout x/y, B-roll) are output pixels (1920×1080).

## 3. Layout, intro/outro, chapters

```js
const plate = { x: 200, y: 60, w: 1520, h: 1520 * SCREEN_H / SCREEN_W };   // screen card; keep the screen aspect
const s0 = plate.w / SCREEN_W;
layout: {
  plate,
  camMain:  { cx: plate.x + CAM_CX_IN_SCREEN * s0, cy: plate.y + CAM_CY_IN_SCREEN * s0, r: CAM_R * s0 }, // over the painted-out bubble
  camIntro: { cx: 540, cy: 470, r: 250 },        // big bubble next to the intro title
  camOutro: { cx: 540, cy: 470, r: 230 },
},
introEnd: at(9.05),          // main layout takes over here (the speaker starts the actual topic)
outroStart: at(183.3),       // end card starts here
dissolve: 0.12,              // cross-dissolve after every jump cut (screen + webcam)
```

With `plate.w = 1520` the card leaves about 120 px below it for captions at 1080p, and 60 px above it for the chapter header. With `intro: null` or `outro: null` the main layout runs from the first or to the last frame; `camIntro`/`camOutro` can then be left out.

```js
intro: { x: 900, y: 255, w: 940, eyebrow: 'Video tutorial', lines: ['Cut videos', 'with Claude Code.'],
         lead: 'One short line.', tag: { x: 330, y: 770, who: 'Name', role: 'Role · Company' },
         brand: { x: 80, y: 56, text: 'example.com' } },
outro: { x: 900, y: 290, w: 940, eyebrow: 'Thanks for watching', lines: ['Line one.', 'Soft line two.'],
         buttons: [{ text: 'example.com', style: 'light', arrow: true }, { text: 'Links in the description', style: 'glass' }],
         brand: { x: 80, y: 56, text: 'example.com' } },
chapters: [{ t: at(9.05), title: 'Download VS Code' }, ...],   // header eyebrow "— 01 · TITLE" + progress dots
```

Scene options:

- **`brand: { x, y, text, sub }`**: `sub` turns the brand mark into a two-line wordmark ("Learn" / "LANGUAGE MODEL").
- **`art: { src: asset('assets/brand/mascot.png'), x, y, w }`**: puts a character or mascot into the scene. It pops in after the headline and then bobs gently. The outro is a good place for it: a mascot waving goodbye next to the call to action.
- **`--wave-cut`** in `brand.css` sets the colour of the cut pauses in the `wave` card. Pick a muted colour that differs from the accent.

## 4. Camera, spots, holds

```js
camera: [                                         // zoom/pan inside the screen card
  { t: at(18.2), dur: 0.9, rect: { cx: 830, cy: 640, w: 1100 } },   // h follows the screen aspect; clamped to the frame
  { t: at(20.9), dur: 0.8, rect: { cx: SCREEN_W / 2, cy: SCREEN_H / 2, w: SCREEN_W } },   // back to full
],
spots: [                                          // highlight ring + dim around a UI element (screen px)
  { t0: at(36.8), t1: at(41.0), rect: { x: 64, y: 248, w: 348, h: 90 }, label: 'Claude Code for VS Code', pad: 10, dim: 0.5 },
],
holds: [{ from: 47.4, to: 47.8, use: 47.2 }],     // source s: show the frame at `use` instead (white flashes, glitches)
```

- **Zoom factor:** 1.5–1.9× (`w` 900–1150 of a 1728-wide screen) keeps UI text readable. Use 0.8–0.9 s with ease-in-out, and start a zoom about 0.3 s before the word that needs it.
- **Clamping:** a rect near an edge is clamped; the view never shows outside the screen.
- **Spot rects** follow the zoom automatically; the ring is drawn in screen-card space so its stroke stays 2 px.

## 5. Callouts

Common fields:

- `t0`, `t1`
- `anchor`: `tl`, `tr`, `bl`, `br` or `c` (relative to the screen card), `margin` (default 32), or explicit `x`, `y` in frame px
- `w`: fixed width, overrides the 760 px default cap
- `from`: `up` (default), `down`, `left` or `right`
- `din` / `dout`: enter/exit durations
- `sfx`: a cue name
- `focus: true`: dims and recedes the screen card (use it for centred cards)

| kind | fields | use for |
| --- | --- | --- |
| `card` | `icon`\|`logo`, `eyebrow`, `title` or `titleHtml` (`<b>` = accent colour), `sub` | introducing a product, a rule, a warning |
| `chip` | `icon`\|`logo`, `text`, `dark` | one-line side notes ("No terminal needed") |
| `keys` | `eyebrow`, `keys: ['File', 'Open Folder…']`, `hint` | menu paths and shortcuts |
| `stat` | `eyebrow`, `valueHtml: '≈ 8<small>min</small>'`, `label` | numbers the speaker says |
| `list` | `eyebrow`, `titleHtml`, `rows: [{ label, meta, icon\|logo, ok: true\|false, at }]` | licences, links, checklists; rows appear at `at` |
| `prompt` | `eyebrow`, `text` (a leading `@file` is highlighted), `typeFrom`, `typeTo`, `model` | showing what to type into a chat or AI tool |
| `steps` | `eyebrow`, `heading: [line1, accentLine2]`, `steps: [{ n, title, sub, at }]` | a process (3 steps fits best) |
| `tokens` | `eyebrow`, `titleHtml`, `colors: [{ name, hex }]`, `font`, `fontMeta`, `typeAt` | showing the extracted brand style |
| `wave` | `eyebrow`, `titleHtml`, `w`, `h`, `waveFrom`, `waveTo` (source s), `collapseAt`, `collapseDur` | showing pause cutting on the real waveform |

Icons are Phosphor names (`'sparkle'` = light weight, `'check-bold'` = bold weight). Logos are folder names under `assets/logos/` or Simple Icons slugs.

## 6. B-roll

```js
{ kind: 'browser', t0: at(94.3), t1: at(98.55), x: 290, y: 90, w: 1340, h: 800, img: sites('playwright'), url: 'playwright.dev',
  tag: { logo: 'playwright', text: 'Playwright', lic: 'Apache-2.0' },
  scroll: { t0: at(98.9), t1: at(101.6), from: 0, to: 2260 },     // optional: scroll a tall screenshot (display px)
  fromX: 260, fromRot: -16, toX: 220, toRot: 14, sfx: 'whoosh' },

{ kind: 'carousel', t0: at(68.35), t1: at(77.05), cx: 960, cy: 470, cw: 1180, ch: 738, gap: 640, labelY: 826, sfx: 'whoosh',
  items: [{ img: sites('svgl'), url: 'svgl.app', name: 'svgl', lic: 'MIT', logo: 'svgl' }, ...],
  steps: [{ t: at(68.35), index: 0 }, { t: at(70.4), index: 1 }, ...] },     // which card is in front, when
```

- **Scroll distance:** in display px, `max = img.height × (w / img.width) − (h − 44)`.
- **Carousel:** keep it to 2–5 items and switch on the word that names the next item. Tags show `name` + `lic`; licences shown on screen double as credits.
- While B-roll or a `focus` card is on screen, the screen card recedes (scale 0.955) and dims. The webcam bubble stays on top so the speaker remains visible.

## 7. Measuring rects

1. Probe frames with a grid in **screen coordinates**:
   `ffmpeg -ss <s> -i in.mp4 -frames:v 1 -vf "crop=<screen.w>:<screen.h>:<screen.x>:<screen.y>,drawgrid=w=100:h=100:t=1:c=yellow@0.35" probe.png`.
2. Build 2×2 sheets of the moments you'll zoom on, with `hstack`/`vstack` and a `drawtext` time label.
3. Read positions off the grid. In a sheet cell scaled to 960 px, screen px = cell px ÷ (960 / screen.w).
4. Verify with `render.mjs --preview-src <s>`. The spot ring should sit on the element with even padding.
