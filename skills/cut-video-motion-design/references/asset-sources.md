# Finding open-source assets

This file lists **where to look and how to check** assets; it ships no asset files. Sources move and licences change, so treat everything below as a starting point. Re-check the licence page on every project, and record each file you download in `assets/ledger.json`:

```json
[{ "file": "assets/logos/vscode/mark.svg", "source": "https://svgl.app/...", "license": "MIT (file) + trademark of Microsoft",
   "attribution": "not required", "retrieved": "2026-10-10" }]
```

## Contents
1. How to search (the routine)
2. Logos
3. Icons
4. Emoji
5. Motion graphics (Lottie)
6. Sound effects
7. Music
8. Stock video and photos
9. Fonts
10. Licence quick reference

## 1. How to search

1. **General pass, before the edit.** For each category below, run a web search like `<category> open source license <year>`. Open the source's licence page with WebFetch and confirm it still matches this file.
2. **Targeted pass, after transcription.** List every product, tool, website and brand the speaker names. For each one, search for its logo on svgl and Simple Icons, then on the brand's own press or brand page (search `<brand> brand guidelines` or `<brand> press kit`). Brand pages often say how the logo may be shown.
3. **Download to `assets/<category>/<name>/`.** Keep the original file name and licence. For SVGs, open the file and check there is no `<script>`, no `on*=` attributes and no external `href`. Re-encode PNGs you got from unknown places (`ffmpeg -i in.png out.png`).
4. **Write the ledger entry right away.** At the end it becomes the credits list.

## 2. Logos

| Source | How to get it | Licence of the file | Notes |
| --- | --- | --- | --- |
| **svgl** (svgl.app) | Search on the site and download the SVG. There are light and dark variants for many brands, and the API returns JSON: `https://api.svgl.app?search=<name>` | Repository MIT | Coloured logos and wordmarks; the best default for brand-coloured marks |
| **Simple Icons** (simpleicons.org) | `npm i simple-icons` → `node_modules/simple-icons/icons/<slug>.svg`, or download on the site | CC0 | Single-colour marks; each entry has the official brand hex and often a guidelines link |
| **devicon** (devicon.dev) | GitHub `devicons/devicon`, folder `icons/<name>/` | MIT | Developer tools and languages, coloured variants |
| **The brand's press kit** | Search `<brand> press kit` / `brand assets` | Brand terms | Most authoritative; follow its rules |

Logos are **trademarks** regardless of the file licence. Show them only to name the product the speaker talks about. Don't recolour, distort or animate them in ways that change the mark, don't build them into your own branding, and don't imply partnership or endorsement.

The render scripts look for logos in `assets/logos/<name>/` (`mark-light.svg` for light surfaces, `mark-dark.svg` for dark ones, `mark.svg` as fallback), then in `node_modules/simple-icons/icons/<name>.svg`.

## 3. Icons

| Source | How to get it | Licence |
| --- | --- | --- |
| **Phosphor** (phosphoricons.com) | `npm i @phosphor-icons/core` → `assets/<weight>/<name>-<weight>.svg` (weights: thin, light, regular, bold, fill, duotone) | MIT |
| **Lucide** (lucide.dev) | `npm i lucide-static` → `icons/<name>.svg` | ISC |
| **Tabler Icons** (tabler.io/icons) | `npm i @tabler/icons` → `icons/outline/<name>.svg` | MIT |
| **Material Symbols** (fonts.google.com/icons) | Download SVG on the site | Apache-2.0 |

The compositor inlines SVGs with `fill="currentColor"`, so icons take the brand colour. Phosphor is the default (`icon: 'sparkle'` means light weight; `'check-bold'` means bold weight). Point `project.assets.icon` at another set if the reference site uses a different icon style; outline icons look best next to light typography.

## 4. Emoji

| Source | Licence | Attribution |
| --- | --- | --- |
| **Microsoft Fluent Emoji** (GitHub `microsoft/fluentui-emoji`): 3D PNG, colour, flat and high-contrast SVG | MIT | Not required |
| **Noto Emoji** (static, GitHub `googlefonts/noto-emoji`) | Apache-2.0 (images), OFL (font) | Not required |
| **Noto Animated Emoji** (googlefonts.github.io/noto-emoji-animation) | CC BY 4.0 | **Required** |
| **Twemoji** (GitHub `jdecked/twemoji`) | Graphics CC BY 4.0 | **Required** |
| **OpenMoji** (openmoji.org) | CC BY-SA 4.0 | **Required + share-alike** (avoid for commercial edits) |

## 5. Motion graphics (Lottie)

- **LottieFiles free animations** (lottiefiles.com/free-animations) are under the **Lottie Simple License**: commercial use allowed, attribution not required but appreciated. You may not resell or redistribute the files as standalone assets. Some creators add their own terms, so check the licence on **each animation page**; premium animations have different terms.
- Download the **Lottie JSON**, not the dotLottie, unless you unpack it.
- Render it inside the compositor with **lottie-web's light build** (`lottie_light.min.js`). The light build doesn't evaluate expressions, so an animation file can't run code. Drive it frame-exactly with `anim.goToAndStop(frame, true)` from `renderFrame(t)`, never with autoplay.
- Alternatives: **useAnimations** (MIT, icon animations) and the Lottie examples in each icon library.

## 6. Sound effects

| Source | Licence | How |
| --- | --- | --- |
| **Kenney** (kenney.nl/assets, category Audio): Interface, UI, Impact, Sci-fi, Digital packs | CC0 | Download the zip; OGG files work in ffmpeg directly |
| **Freesound** (freesound.org) | Per sound: filter search results to **Creative Commons 0** | Free account needed to download; CC-BY sounds need credit, NC sounds are not allowed in commercial videos |
| **Pixabay sound effects** (pixabay.com/sound-effects) | Pixabay Content License | No attribution |
| **Mixkit sound effects** (mixkit.co/free-sound-effects) | Mixkit Sound Effects Free License | Read the licence page for the asset type |
| **Synthesised** | Yours | `render.mjs` already makes a soft whoosh from filtered pink noise (`sfx: { whoosh: { synth: 'whoosh' } }`) |

Keep SFX quiet (−18 to −26 dB relative to full scale): a pluck when a card appears, a whoosh for B-roll, a soft tick on chapter changes. If you can hear them consciously, they are too loud.

## 7. Music

| Source | Licence | Watch out for |
| --- | --- | --- |
| **Pixabay Music** (pixabay.com/music) | Pixabay Content License, no attribution | Some tracks are registered in YouTube **Content ID**; check the track page and keep the licence certificate |
| **Free Music Archive** (freemusicarchive.org) | Per track (often CC BY / CC BY-NC) | Filter to licences that allow commercial use; credit when CC BY |
| **Mixkit music** (mixkit.co/free-stock-music) | Mixkit Stock Music Free License | Allowed for web and social video; restricted for broadcast and games |
| **YouTube Audio Library** | YouTube terms | Only for videos published on YouTube |
| **Incompetech** (incompetech.com) | CC BY 4.0 | Attribution required |

Duck the music under the voice (−18 to −24 dB, or sidechain-compress it on the voice) and fade it out at the end.

## 8. Stock video and photos

| Source | Licence | Notes |
| --- | --- | --- |
| **Pexels** (pexels.com: photos, `/videos`) | Pexels License: free, commercial use, no attribution | Don't sell unaltered copies, don't imply endorsement by people or brands shown, check pexels.com/license |
| **Pixabay** (pixabay.com: photos, videos, illustrations) | Pixabay Content License | Same caveats on trademarks and people shown |
| **Unsplash** (unsplash.com) | Unsplash License | Photos only; no building a competing stock service |
| **Mixkit video** (mixkit.co/free-stock-video) | Mixkit Free License | Check per asset type |

A Playwright screenshot of the stock site itself (its search page, a category) is a good way to **show** where to find things when the speaker mentions the site. Keep the site's UI recognisable and unedited.

## 9. Fonts

1. **Find the reference site's font.** `capture_site.mjs` writes it into `tokens.json` (`fonts`, `cssVars['--font']`, `el.h1.fontFamily`).
2. **If the font is open source** (Google Fonts and most of Fontsource are OFL), `brand_from_tokens.mjs` installs `@fontsource-variable/<slug>` or `@fontsource/<slug>` from npm and writes the `@font-face`.
3. **If it is commercial**, use an open lookalike and say so in the delivery notes:

| Commercial | Open lookalike (Fontsource / Google Fonts) |
| --- | --- |
| Helvetica / Neue Haas Grotesk / SF Pro | Inter, Inter Tight |
| Circular | DM Sans, Manrope |
| Graphik / Söhne | Inter, Instrument Sans |
| Proxima Nova | Figtree, Montserrat |
| GT Walsheim | Plus Jakarta Sans |
| Avenir | Nunito Sans |
| Futura | Jost |
| Gotham | Montserrat |
| Tiempos / Georgia-like serif | Source Serif 4, Fraunces, Newsreader |

## 10. Licence quick reference

| Licence | Commercial | Attribution | Modify | Use in this pipeline |
| --- | --- | --- | --- | --- |
| CC0 / Public domain | yes | no | yes | yes |
| MIT / ISC / Apache-2.0 | yes | keep the licence text with redistributed files; not needed on screen | yes | yes |
| OFL (fonts) | yes | no | yes (rename if you modify the font itself) | yes |
| Pexels / Pixabay / Unsplash / Lottie Simple / Mixkit | yes | no (appreciated) | yes | yes, with each site's restrictions |
| CC BY | yes | **yes**, in the description | yes | only with credits |
| CC BY-SA | yes | yes | share-alike | avoid |
| CC BY-NC / NC-ND | **no** | yes | NC/ND | no |
| "Editorial use only" / "All rights reserved" | no | — | — | no |
