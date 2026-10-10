# Third-party notices

This repository contains only original code and documentation, licensed under MIT (see [LICENSE](LICENSE)). It does **not** redistribute any third-party code, fonts, icons, logos, sounds, music or footage.

When you use the skill, its scripts install or call the following third-party software on your machine. Each comes under its own licence:

| Component | Used for | How it gets there | Licence |
| --- | --- | --- | --- |
| [Playwright](https://playwright.dev) | Website screenshots, frame-by-frame rendering | `npm install` (`playwright`) | Apache-2.0 |
| Chromium | Browser engine behind Playwright | `npx playwright install chromium` | BSD-3-Clause plus bundled third-party licences |
| [Phosphor Icons](https://phosphoricons.com) | Icons in cards and chips | `npm install` (`@phosphor-icons/core`) | MIT |
| [Simple Icons](https://simpleicons.org) | Fallback brand logos | `npm install` (`simple-icons`) | CC0-1.0 (the logos remain trademarks of their owners) |
| [Fontsource](https://fontsource.org) font packages | Brand fonts | installed on demand by `brand_from_tokens.mjs` | per font, mostly SIL Open Font License 1.1 |
| [FFmpeg](https://ffmpeg.org) | Decoding, cutting, encoding, audio mix | installed by you | LGPL-2.1+, or GPL-2.0+ for builds with GPL parts such as libx264 |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | Speech-to-text with word timing | installed by you | MIT |
| [Whisper](https://github.com/openai/whisper) model weights | Speech-to-text | downloaded by you | MIT |
| [Node.js](https://nodejs.org) | Runtime for all scripts | installed by you | MIT |

Assets you download while using the skill keep their own licences: logos, emoji, Lottie animations, sound effects, music, stock video and photos. The skill records each one in `assets/ledger.json` inside your project. [`references/asset-sources.md`](skills/cut-video-motion-design/references/asset-sources.md) explains the common licences and where to check them.

## Trademarks

All product names, logos and brands are the property of their respective owners and are used only to identify those products. Their use does not imply endorsement. This project is not affiliated with Anthropic, OpenAI, Microsoft or any other company mentioned here or in the skill.
