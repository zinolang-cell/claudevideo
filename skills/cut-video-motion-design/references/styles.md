# The 20 animation styles

Every style is a preset in `scripts/styles/`:

- **`<id>.css`** sets fonts, palette, and the treatment of cards, chips, captions, spotlight, screen card and webcam ring.
- **`fx/<id>.js`** is an optional animation module that draws a time-based background or overlay, or animates the headline.

`node style.mjs board` renders one example per style and a numbered board (`build/styles/board.png`). `node style.mjs use <n>` applies one.

## Contents
1. The styles
2. How to ask the user
3. Recommending a style
4. Combining a style with a website brand
5. Writing a new style
6. Checks after applying a style

## 1. The styles

| # | Style | Look | Motion | Good for |
| --- | --- | --- | --- | --- |
| 01 | ASCII Art | Monochrome glyph fields on black, mono type, inverted highlights | A living ASCII field ripples behind everything | Developer tools, hacker culture, AI |
| 02 | Comic | Bold outlines, halftone dots, speech-bubble captions | Rotating sunburst, "NEW!" burst | Playful explainers, education, social clips |
| 03 | Pixel Art | 8-bit palette, pixel fonts, notched borders | Twinkling stars, scrolling pixel skyline | Gaming, retro tech, fun tutorials |
| 04 | Liquid Morph | Vivid gradient blobs, rounded cards, gradient headlines | Blobs flow and merge | Creative brands, launches, music |
| 05 | Glassmorphism | Frosted glass cards over a vivid gradient | Soft colour light drifting behind the glass | Apps, SaaS, modern UI tutorials |
| 06 | Kinetic Type | Huge condensed type, black/white plus one signal colour | Words slam in; giant outline type scrolls behind | Punchy statements, ads, talks |
| 07 | Wireframe 3D | Neon cyan line work on near-black | Rotating wireframe solid over a perspective grid | Tech, engineering, futuristic topics |
| 08 | Split-Flap | Airport departure board | Headline letters flip and land | Announcements, travel, countdowns, lists |
| 09 | Clay 3D | Soft pastel clay, chunky rounded type | Clay spheres and pills bob | Friendly education, onboarding |
| 10 | Halftone | Newsprint, CMYK dots, misregistered print type | Halftone dot waves pulse | Editorial, news, pop art |
| 11 | Isometric | Isometric grid, extruded cards | Isometric blocks float | Architecture, systems, data |
| 12 | Paper Cut | Layered paper, warm serif headlines | Paper hills sway | Storytelling, education, nature |
| 13 | Retro VHS | Chromatic aberration, scanlines, VCR display | Tape noise, tracking band, blinking PLAY | Nostalgia, music, creators |
| 14 | Topo Lines | Topographic contours, earthy greens | Contours flow like a living map | Outdoor, data, calm explainers |
| 15 | Bauhaus | Primary colours, circles and squares, geometric type | Shapes rotate and slide | Design, art, bold brands |
| 16 | Blueprint | Blueprint grid, white line work, mono labels | Technical drawing draws itself | Engineering, how-it-works, hardware |
| 17 | Art Deco | Black and gold, sunbursts, framed type | Rays turn, gold shine sweeps the headline | Premium, luxury, events |
| 18 | Terminal | Green CRT text, terminal windows | Headline types itself, log scrolls, cursor blinks | Coding, CLI tools, AI agents |
| 19 | Neo-Brutalism | Flat loud colours, thick borders, hard shadows | Stickers spin and bounce | Startups, creators, bold tutorials |
| 20 | Particles | Deep space, airy light type, glowing dots | Galaxy swirl around the speaker | AI, science, keynotes, premium intros |

All fonts are open source (SIL OFL 1.1), installed from Fontsource by `style.mjs`.

## 2. How to ask the user

1. Run `node style.mjs board`. Pass the video's real headline (`--title`, `--title2`, `--eyebrow`) and the speaker's name and role (`--who`, `--role`), so the examples show the user's own video. It takes about 10 seconds.
2. Show the board. Give the user the path to `build/styles/board.png` and open it if the environment can. Look at it yourself too.
3. Ask one multiple-choice question per decision (AskUserQuestion in Claude Code):
   - **Style:** offer your 2–3 best matches (section 3) plus "No preset (clean look)"; the free-text answer takes any number from 1 to 20.
   - **Reference:** "Use my website for colours, fonts and logo (paste the URL)", "Pure style, no website", or "Style plus my brand colours only".
4. Apply the answer with `node style.mjs use <n>`. Render preview stills of the intro, one main-layout moment and the outro, and show them before going on.

## 3. Recommending a style

Match **content** and **audience** first, then the brand:

- **Code, CLI, AI agents:** Terminal, ASCII Art, Wireframe 3D, Blueprint
- **App or SaaS walkthroughs:** Glassmorphism, Clay 3D, Isometric, clean preset with the website brand
- **Education and kids:** Clay 3D, Paper Cut, Comic, Pixel Art
- **Statements, ads, keynotes:** Kinetic Type, Particles, Art Deco, Liquid Morph
- **Design and editorial:** Bauhaus, Halftone, Neo-Brutalism, Topo Lines
- **Nostalgia and music:** Retro VHS, Pixel Art, Split-Flap

Screen recordings stay readable in every style, because the screen card itself is never restyled, only framed. Light styles (Bauhaus, Clay, Isometric, Neo-Brutalism, Comic, Halftone) suit dark-UI recordings well, because the contrast frames the screen. Dark styles suit light-UI recordings.

## 4. Combining a style with a website brand

Load order is `compose/style.css` → `build/style.css` (the preset) → `build/brand.css` (the brand), so the brand wins.

- **Pure style:** keep `build/brand.css` empty (or delete it). The logo still comes from `project.brand`.
- **Style plus brand colours:** in `build/brand.css`, keep only `--accent`, `--accent-deep`, `--accent-soft`, `--hl`, `--scene-hl`. Leave fonts and backgrounds to the style.
- **Website only (no preset):** `node style.mjs clear` and a full `brand.css` from `brand_from_tokens.mjs`.

## 5. Writing a new style

Copy the closest preset to `styles/<id>.css` (and `styles/fx/<id>.js`), and add an entry to `styles/styles.json` (`n`, `id`, `name`, `look`, `motion`, `goodFor`, `fonts`).

**CSS variables the compositor reads:**

- **Text and fonts:** `--ink`, `--muted`, `--font`, `--font-display`, `--font-title`, `--font-caption`, `--font-label`
- **Surfaces and lines:** `--bg-soft`, `--line`, `--line-strong`, `--dot`
- **Accent:** `--accent`, `--accent-deep`, `--accent-soft`, `--accent-light`
- **Captions, main layout:** `--hl` and `--hl-ink` for the highlight pill and the active word
- **Scenes (intro/outro):** `--scene-ink`, `--scene-soft`, `--scene-lead`, `--scene-hl`, `--scene-hl-ink`, `--scene-line`, `--scene-tag-bg`, `--cap-scene-ink`
- **Shape and motion:** `--r-s`, `--r`, `--r-l`, `--shadow-1..3`, `--display-weight`, `--display-tracking`, `--ease-out`, `--ease-in-out`, `--wave-cut`

Restyle the backgrounds with `#bg-light` (main layout) and `#bg-dark` (scenes), plus their `::after`.

**The animation module** is an ES module with any of three exports:

```js
export async function init({ bg, top, W, H, S, helpers }) {}   // bg: canvas behind the screen card, top: overlay canvas
export function frame(t, { k, bk, ko, intro, chapter }) {}     // k: 0 = intro/outro scene, 1 = main layout; bk: B-roll on screen
export function title(scene, t, t0) {}                          // animate scene.h1 (split words, flip letters, type text)
```

**Rules:**

- **Make every frame a pure function of `t`.** Frames are rendered in parallel and out of order, so use seeded random numbers (mulberry32) and never accumulate state between frames.
- **Keep `frame()` under about 15 ms** at 1920×1080. To get blur cheaply, draw on a small canvas and upscale it. Batch fills by colour.
- **Draw behind the speaker, not over it.** Leave the caption band (y > 960) and the scene headline block readable.
- **Fade with `k`:** strong in the scenes, subtle or off behind the screen card.

## 6. Checks after applying a style

- [ ] Intro headline fits (the compositor shrinks over-long lines automatically) and the title effect lands before the speaker's first sentence ends.
- [ ] Captions are readable on the scene background and on the main background (`--cap-scene-ink`, `--hl`).
- [ ] Cards, chips and spotlights keep enough contrast over the screen recording.
- [ ] The style's background doesn't flicker between consecutive frames (pure function of `t`).
- [ ] With a brand: the logo is on a tile that suits the style's background.
