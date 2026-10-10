# Motion design: what makes the edit look good

The aim is for the video to look like it **belongs to the brand** and to **help the viewer follow**, not to show off effects. Every element should answer "what is happening right now?" faster than the voice alone.

## 1. Take the style from the reference, not from a template

From the captured site (or the chosen style), carry over:

| Site pattern | Video equivalent |
| --- | --- |
| Font family, heading weight and tracking (e.g. light 300, −0.05em) | Intro/outro headline, stat numbers, step headings (`--display-weight`, `--display-tracking`) |
| Second headline line in the accent colour or at lower opacity | `lines: [line1, line2]`: line 2 is the soft or accent line; `titleHtml` with `<b>` for accent words |
| Small tracked eyebrows above sections ("— ABOUT US") | Chapter header `— 03 · OPEN YOUR FOLDER` and card eyebrows |
| Carousel or slider dots | Chapter progress dots (active one is a wide dark pill) |
| Card radius, borders, shadows | `--r`, `--shadow-*`, hairline borders on cards |
| Button styles (solid light, ghost or glass) | Outro buttons |
| Easing curves in the CSS | `--ease-out` / `--ease-in-out` drive all motion |
| Hero image or video | Darkened intro/outro backdrop with a slow push-in |
| No dark hero (bright app-style sites) | Gradient backdrop in the darkest brand colour with an accent glow |
| "3D" buttons, options and cards with a darker bottom edge | `brand.css` overrides: `border: 2px solid var(--line); border-bottom: 5px solid <lip colour>` on `.card`, `.chip`, `.btn`, `.kbd` |
| Mascot or character in the logo | Outro `art` that pops in next to the call to action; the logo on a light tile on dark scenes so it doesn't disappear |

Without a website reference, pick one restrained palette: ink, one accent, a soft background and one hairline colour. Use one type family in two weights. Everything else follows from those choices.

## 2. Captions

- **One line, centred, below the screen card**, about 34 characters ideal and 42 maximum. Break after commas and before conjunctions; never break after "the", "a" or "your", and never between parts of a name (`cutplan.mjs` does this).
- **Words light up as they are spoken.** Upcoming words sit at about 38% opacity. A soft accent pill glides from word to word: it's motion people read, not decoration.
- The outgoing line fades out (0.14 s) **before** the next one rises in (0.4 s). Two lines in the same spot at once look like a glitch.
- Use clean verbatim: fix brand names and obvious slips, but keep the speaker's words and order.

## 3. Zooms and spotlights

- Zoom when the speaker talks about something small on screen (a button, a list item, a menu) and stay there while it is relevant. Return to full view before the next big screen change so viewers don't lose orientation.
- Zoom 1.5–1.9× over 0.8–0.9 s with ease-in-out, starting about 0.3 s before the word.
- Add a spotlight (ring plus 50% dim) when the speaker points: "this one", "be careful", "click here". Labels repeat the UI text or the instruction in 2–4 words.

## 4. Cards and B-roll

- **One idea per card**, entering from 16–18 px below with ease-out over 0.6 s and leaving faster (0.3 s). Top-right is the default spot on screen recordings because UI action tends to be left or centre. Use centred `focus` cards for summaries: licences, workflow, links.
- **Show B-roll when the speaker talks about something off-screen** (websites, sources, tools). A coverflow carousel suits lists ("logos, emojis, icons…": one card per word), a browser frame suits a single site, and a scrolling browser shot suits "your website".
- **Show the real thing:** actual screenshots, the actual waveform, the actual extracted colours. Real data is more convincing than generic illustrations, and it's what Playwright and ffmpeg give you for free.

## 5. Transitions

- **Jump cuts:** a 0.12 s cross-dissolve on screen and webcam hides the head jump without feeling soft.
- **Intro → main:** the title leaves first, then the screen card rises (70 px, scale 0.94 → 1) while the big webcam bubble flies into its corner. Overlapping text and screen content looks messy.
- **B-roll:** cards swing in with a slight Y-rotation and slide (perspective 1800 px); the screen card recedes and dims behind them.
- **End:** the webcam bubble bows out after the last word, the end card holds 2–3 s, then a 0.7 s fade to black.

## 6. Timing

- Visual events land **with** the word, never after it: anchor to the word's start and lead by 0.1–0.3 s.
- Leave at least 0.4 s between card exits and entries in the same spot.
- A good density for a tutorial is something new every 3–8 s: a zoom, a card or a caption highlight. More becomes noise; less feels like a raw recording.

## 7. Review checklist (contact sheets)

- [ ] No card title wraps unexpectedly; no card is cut off by the frame or covered by the webcam bubble.
- [ ] Nothing covers what the speaker is clicking.
- [ ] Captions are readable on every background; no two caption lines overlap.
- [ ] Zooms keep the relevant element fully in view, with some margin.
- [ ] Labels on dim backgrounds have enough contrast.
- [ ] B-roll screenshots have no cookie banners, blank reveal areas or personal data.
- [ ] Intro text is gone before the screen card appears; the outro is clean.
- [ ] Brand logos are shown unmodified and only next to the product they name.
