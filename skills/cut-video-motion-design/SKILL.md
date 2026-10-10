---
name: cut-video-motion-design
description: Turn a raw screen recording, tutorial or talking-head video into a finished, branded edit without Hyperframes or Remotion. Whisper transcribes it with word timing, pauses are cut out automatically, captions animate word by word, and zooms, spotlights, motion-design cards and transitions are added. The look comes from one of 20 animation styles (ASCII Art, Comic, Pixel Art, Liquid Morph, Glassmorphism, Kinetic Type, Wireframe 3D, Split-Flap, Clay 3D, Halftone, Isometric, Paper Cut, Retro VHS, Topo Lines, Bauhaus, Blueprint, Art Deco, Terminal, Neo-Brutalism, Particles) shown to the user as a rendered board, and/or from a reference website captured with Playwright. Website screenshots also appear as B-roll, and everything renders frame-exact with Playwright + ffmpeg, with sound effects. Use this whenever someone wants to cut, trim, edit, caption or subtitle a recording (mp4/mov/webm), remove pauses or filler, add motion graphics, animation styles or nice transitions, make a YouTube/LinkedIn/tutorial video look professional, match their brand or website style, or show screenshots of websites in a video, even if they only say "cut my video" or "@recording.mp4 make this nice".
---

# Cut a video with captions, motion design and a website-based style

This skill turns a raw recording into an edited video:

- pauses and false starts are cut out
- word-by-word animated captions are added
- zooms and spotlights point at what is being clicked
- motion-design cards explain each step
- website screenshots appear as B-roll
- the intro and outro use one of 20 animation styles (ASCII Art to Particles), the look of a reference website, or both

Everything runs locally with **Node + Playwright + ffmpeg + Whisper**. Don't swap in Hyperframes, Remotion or another video framework. The point of this pipeline is that it needs no framework, account, licence or credits, and every frame is a pure function of time, so any frame can be previewed or re-rendered on its own.

How the pipeline works:

```
recording.mp4
  ├─ Whisper (whisper.cpp, DTW word timing) ──> words ──> pause cut plan + caption lines
  ├─ ffmpeg ──> kept frames (screen layer, webcam layer) + voice track, frame-exact
  ├─ Playwright ──> reference-site screenshots + design tokens ──> brand.css
  │             └─> screenshots of sites mentioned in the video ──> B-roll
  └─ timeline.mjs (your edit decisions, anchored to spoken words)
         └─> compose/ (HTML/CSS page, renderFrame(t)) ──> Playwright screenshots per frame ──> ffmpeg H.264 + SFX mix
```

## Before you start: three steps, in this order

**1. Search the web for open-source assets.** Do this before touching the video. Licences and sources change, and every video needs different logos and visuals. Search the web (in Claude Code with WebSearch and WebFetch; in Codex with its web search) for each category in [references/asset-sources.md](references/asset-sources.md): logos, icons, emoji, motion graphics (Lottie), sound effects, music, stock video/photos and fonts. Start from the sources listed there, confirm the licence page still says what the reference says, and look for anything newer or better suited to the topic. Download what you will use into `assets/` inside the project. Record every file in `assets/ledger.json` with source URL, licence and date; it becomes the credits list at delivery. Once the transcript exists (step 2 of the pipeline), do a second, targeted pass for the products, tools and brands that are actually named in the recording.

Prefer licences that need no attribution and allow commercial use: CC0, MIT, Apache-2.0, ISC, OFL, or the Pexels, Pixabay and Lottie Simple licences. Skip NC, ND and SA licences, and anything "editorial only". Logos are trademarks whatever the file licence says. Show them unmodified, only to name the product, and never in a way that suggests a partnership.

**2. Set up the project** (the [Setup](#setup) section below). The style board in step 3 needs Playwright and the fonts.

**3. Show the 20 animation styles and ask.** The answer decides the whole look, so ask before designing anything:

1. **Render the board** with the video's own headline: `node style.mjs board --title "<line 1>" --title2 "<line 2>" --eyebrow "<kicker>" --who "<speaker>" --role "<role>"`. It takes about 10 seconds. It writes `build/styles/board.png` (all 20, numbered) and one full-size example per style.
2. **Show it.** Give the user the path to `board.png` and open it if you can. The styles are: 01 ASCII Art, 02 Comic, 03 Pixel Art, 04 Liquid Morph, 05 Glassmorphism, 06 Kinetic Type, 07 Wireframe 3D, 08 Split-Flap, 09 Clay 3D, 10 Halftone, 11 Isometric, 12 Paper Cut, 13 Retro VHS, 14 Topo Lines, 15 Bauhaus, 16 Blueprint, 17 Art Deco, 18 Terminal, 19 Neo-Brutalism, 20 Particles.
3. **Ask two multiple-choice questions** (AskUserQuestion in Claude Code):
   - **Which style?** Offer your 2–3 best matches for this content (see [references/styles.md](references/styles.md)) plus "No preset, clean look". Any number from 1 to 20 is fine as a free-text answer.
   - **Should a website be referenced?** Offer: "Yes, my website (paste the URL)", "No, pure style", or "Style plus my brand colours only". A referenced website supplies fonts, colours, logo and radius, captured with Playwright.
4. **Apply it** with `node style.mjs use <n>` (and `brand.css` per section 5 of the pipeline). Show the user preview stills of the intro, one main-layout moment and the outro before going on.

The same question round can collect anything else you can't infer: caption language, aspect ratio, and whether they want an intro/outro card. The compositor is laid out for 16:9 at 1920×1080. For 9:16, set `size: [1080, 1920]` and adapt these by hand:

- `layout.plate` in the timeline
- `#captions { top }` and `#header` in `compose/style.css`
- the intro/outro positions

## Setup

1. Create a project folder next to the video, for example `<video-name>-edit/`. Copy everything from this skill's `scripts/` into it (the scripts resolve paths relative to `project.json`).
2. Run `npm install` there, then `npx playwright install chromium`.
3. Run `node check_env.mjs` to see what is missing and how to fix it. You need Node ≥ 18, ffmpeg with libx264, and whisper.cpp plus a ggml model ([references/whisper.md](references/whisper.md)).
4. Copy `templates/project.example.json` to `project.json` and `templates/timeline.example.mjs` to `timeline.mjs`. Fill them in as you go; both files are documented in [references/timeline.md](references/timeline.md).

## The pipeline

### 1. Look at the recording

Run `ffprobe` (resolution, fps, duration, VFR?) and make contact sheets with a coordinate grid. A sheet of one frame every few seconds shows the structure. 2×2 sheets of key moments with `drawgrid` every 100 px let you read exact pixel positions:

```
ffmpeg -ss 30 -i in.mp4 -frames:v 1 -vf "crop=W:H:X:Y,drawgrid=w=100:h=100:t=1:c=yellow@0.35" probe.png
```

Decide the **screen region** (`project.screen`: the part that becomes the screen card; leave out the desktop margins and the taskbar) and whether a **webcam bubble** is burned into the recording (`project.cam`: centre and radius). A burned-in bubble is cut into its own layer and painted over in the screen layer, so you can zoom the screen without zooming the face. For a talking-head-only video, leave `cam` out and let the camera frame be the screen card.

### 2. Transcribe with Whisper

Run `node transcribe.mjs`. It extracts 16 kHz audio, runs whisper.cpp with `--dtw` word timing, and writes `build/whisper.json` plus `build/whisper.srt`. Put names and jargon into `project.whisper.prompt`; Whisper spells what it has seen.

Read the `.srt` in full. You need the content to plan the edit, and it shows the mis-hearings to fix: brand names ("cloud code" → "Claude Code"), merged words ("ultra code" → "Ultracode"), and hallucinated "Thank you." or "Bye." at the end over silence.

### 3. Words, pause cut, caption lines

1. Run `node words.mjs`. It applies `project.fixes` (multi-word phrases may change the word count) and writes `build/words.json`.
2. Run `node cutplan.mjs --verbose`. It reads the loudness envelope and keeps speech that peaks above `speechDb`, so breaths don't count as speech and don't split pauses. It then shortens every pause to a maximum that depends on the word before it (sentence end > comma > mid-phrase). Cuts snap to the frame grid so audio and video stay in sync. Word starts are re-aligned to the audio onset after silences, because DTW often lags there by 0.2–0.35 s. Captions are broken into balanced one-line chunks.
3. Check the printout: seconds removed, ignored noise regions, every caption line. Tune `project.cut` until the rhythm feels natural: 0.30–0.35 s at sentence ends is a good default. Use `drop` for false starts and retakes, `cut.end` to stop before the person reaches for the stop button, and `captions.skip` for hallucinated words.

### 4. Cut the media

Run `node cut_media.mjs`. ffmpeg selects the kept frames by index and writes the screen layer and the webcam layer as JPEG sequences in output order (`build/frames/`), plus `build/voice.wav` with 8 ms fades at every cut. It also converts limited-range BT.709 to full-range BT.601, because browsers decode JPEG that way.

### 5. Style reference and B-roll (Playwright)

- **Website reference:**
  1. Run `node capture_site.mjs <url> build/sites/<name>`. It dismisses cookie banners, scrolls to trigger lazy and reveal content, and saves viewport, full-page and per-section screenshots plus `tokens.json`: CSS variables, fonts, a weighted colour census, h1/h2/button styles and logo candidates.
  2. Look at the screenshots. Note the eyebrow labels, heading weight and tracking, card shapes, carousel or dot patterns, and how the accent colour is used. Mirror those details in the motion design; they make the video feel like the brand instead of a template.
  3. Run `node brand_from_tokens.mjs build/sites/<name>/tokens.json` to write `build/brand.css`. It installs the site's font from Fontsource when it is open-source; otherwise pass `--font "<open lookalike>"`.

     If `tokens.json` has no `cssVars` (common for React Native/Expo and CSS-in-JS sites), read the palette from the colour census and the screenshots instead. If the user owns the site's source, read its theme file (e.g. `theme.ts`), which is the most accurate source.

     `brand.css` is plain CSS loaded last, so append overrides for patterns the variables can't express: chunky 3D buttons with a darker bottom border, a warm paper background, a logo tile on dark scenes.
  4. For a clean intro/outro background, capture the hero again with its text hidden: `--hide "h1, header, nav, .hero p" --prefix hero-clean- --dsf 1`.
- **Animation style:** `node style.mjs use <n>` writes `build/style.css`, plus `build/style.js` for the style's animated background and headline effect. `build/brand.css` loads after it, so keep only the brand variables there that should tint the style ([references/styles.md](references/styles.md) section 4). For a described style that isn't one of the 20, use `brand_from_tokens.mjs --preset clean|editorial|bold|calm` or write a new preset (styles.md section 5).
- **B-roll:** capture every site the speaker mentions (stock sites, tools, docs) with `node capture_site.mjs <url> build/sites/<name> --no-tokens --sections 0 --width 1600 --height 1000 --dsf 1.5`. Check each capture: reveal-on-scroll pages can come out blank in full-page shots, and section shots are often more reliable. Stack several sections with ffmpeg `vstack` for a scrolling shot.

More options and pitfalls are in [references/playwright-capture.md](references/playwright-capture.md).

### 6. Plan the edit in `timeline.mjs`

This is the creative part, so read [references/timeline.md](references/timeline.md) (all event types and fields) and [references/design.md](references/design.md) (what makes it look good) first. Then:

- **Anchor every event to a spoken word.** Take source times from `build/cuts.json` (`words[].src`) and wrap them in `at()`. Events then stay in sync even if you re-cut later.
- **Split the video into chapters** of about 10–40 s, each with a short title. They drive the header eyebrow and progress dots.
- **Zoom** (camera moves) to whatever is being clicked or talked about, with rects measured on the gridded probes. Return to full view before big screen changes.
- **Spotlight** the exact UI element when the speaker says "this button" or "be careful". Dim the rest.
- **Add one callout per idea**: card, chip, keys, stat, list, prompt, steps, tokens or wave. Place it where it covers nothing important. Keep the text short; the voice carries the detail.
- **Show B-roll when the speaker talks about something that isn't on screen.** Mentioned websites go into a browser frame or coverflow carousel. The screen card dims and recedes behind it.
- **Plan an intro card** while the speaker introduces themselves or the topic, and **an outro card** with the call to action and the links.
- **Plan SFX** sparingly with `sfx: 'pop' | 'whoosh' | …` on events. Every name you use must exist in `project.sfx`, as a file from `assets/sfx/` (e.g. Kenney's CC0 interface sounds) or `{ "synth": "whoosh" }`; undefined names stay silent. `chapter`, `intro` and `outro` play automatically when defined.

### 7. Check the frames first

Preview stills before rendering anything:

```
node render.mjs --preview-src 19.6,39.2,63.5     # at SOURCE seconds (same as timeline.mjs)
node render.mjs --preview 3.2,7.7                 # at OUTPUT seconds
node render.mjs --sheet 24                        # 24 evenly spaced frames -> build/preview/sheet.jpg
```

Open every sheet yourself as an image and fix what is off. Typical fixes: wrapped card titles, overlaps, a zoom cutting off the clicked element, empty-looking cards, low-contrast labels, text over a busy area. Then show the user a contact sheet and ask for changes before the full render. Stills take seconds; a full render takes minutes. A short `--range 60,75` render checks motion: whether transitions feel right, whether a zoom is too fast, whether a dissolve hides a jump.

### 8. Render

Run `node render.mjs`. It starts `render.workers` workers, each with its own Chromium; every worker renders a contiguous range and pipes JPEG frames into its own x264 chunk. The chunks are then joined losslessly. Separately, the voice is processed (high-pass, compressor, loudnorm to about −16 LUFS) and mixed with the SFX cues.

As a reference, a 20-thread CPU renders 1080p at about 40–60 frames per second with 6–8 workers, so 3 minutes at 60 fps takes about 4 minutes. Use 30 fps when speed matters more than motion smoothness.

### 9. QA and delivery

- Run `ffprobe` on the output (duration, 1920×1080, fps, yuv420p, BT.709) and `ffmpeg -i out.mp4 -af ebur128=peak=true -f null -` (aim for about −16 to −14 LUFS, true peak ≤ −1 dBFS).
- Pull a contact sheet from the final MP4, not from previews, to catch encoding or timing problems.
- Tell the user where the file is and what was done: seconds of pauses removed, chapters, the style source. Give them the credits list from `assets/ledger.json`, including licences that require or appreciate attribution.

## Files in this skill

| Path | What it is |
| --- | --- |
| `scripts/check_env.mjs` | Toolchain check with install hints |
| `scripts/transcribe.mjs` | whisper.cpp with DTW word timestamps → `build/whisper.json` |
| `scripts/words.mjs` | Whisper JSON (whisper.cpp or openai/faster-whisper) → corrected words |
| `scripts/cutplan.mjs` | Pause cutting, onset alignment, caption line breaking → `build/cuts.json` |
| `scripts/cut_media.mjs` | Frame-exact screen/webcam JPEG layers + voice track |
| `scripts/capture_site.mjs` | Playwright: screenshots, sections, design tokens, logo candidates |
| `scripts/brand_from_tokens.mjs` | tokens.json or a preset → `build/brand.css` (font via Fontsource) |
| `scripts/style.mjs` | The 20 animation styles: `list`, `board` (numbered examples), `use <n>`, `clear` |
| `scripts/styles/` | Style presets: `<id>.css`, `fx/<id>.js` animation modules, `styles.json`, `tile.html` |
| `scripts/render.mjs` | Score builder, preview/sheet/range/full render, audio mix |
| `scripts/compose/` | The compositor page: `index.html`, `style.css`, `compose.js` (`renderFrame(t)`) |
| `scripts/templates/` | `project.example.json`, `timeline.example.mjs` |
| `references/asset-sources.md` | Where and how to find open-source assets, by category and licence |
| `references/whisper.md` | Installing whisper.cpp, models, alternatives, pitfalls |
| `references/playwright-capture.md` | Capturing sites well: banners, reveals, hidden text, tokens |
| `references/timeline.md` | `project.json` and `timeline.mjs` reference |
| `references/design.md` | Motion design rules: captions, cards, zooms, transitions, timing |
| `references/troubleshooting.md` | Known problems and fixes (ffmpeg versions, colour, speed, fonts) |
| `references/styles.md` | The 20 styles, how to ask and recommend, combining with a brand, writing new styles |
