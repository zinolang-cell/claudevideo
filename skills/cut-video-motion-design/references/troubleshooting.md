# Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Unrecognized option 'filter_complex_script'` | ffmpeg ≥ 7 removed it | Use `-/filter_complex <file>`. `cut_media.mjs` detects the version and picks the right one |
| `Error submitting video frame to the encoder` when writing JPEGs | The mjpeg encoder rejects limited-range YUV | Convert explicitly: `scale=in_color_matrix=bt709:in_range=limited:out_color_matrix=bt601:out_range=full,format=yuvj420p` |
| Colours shifted after rendering (oranges or blues off) | JPEG is decoded as BT.601 full range; video is BT.709 limited | Convert on the way in (above) and on the way out (`render.mjs` encodes with `scale=in_color_matrix=bt601:in_range=full:out_color_matrix=bt709:out_range=limited` and tags BT.709) |
| A/V drift after cutting | Variable-frame-rate source, or cuts not on frame boundaries | `cutplan.mjs` snaps cuts to the 1/30 s grid; `cut_media.mjs` selects frames by index after `fps=30` and cuts audio by sample count |
| `non monotonically increasing dts` warnings while extracting | Image muxer and passthrough timestamps | Harmless; compare the printed frame count with the expected count |
| Breaths keep pauses alive (too little removed) | Breath runs above `thresholdDb` split a long pause into short ones | Raise `speechDb` (runs must peak above it) or lower `thresholdDb` |
| Words cut off at a cut | Pause cut too tight, or the speaker trails off quietly | Raise `post` / `pre` or `pause.word`; check `--verbose` around that time |
| Captions late after pauses | DTW lag | The onset alignment in `cutplan.mjs` fixes most of it; for stubborn cases edit `build/words.json` by hand and re-run `cutplan.mjs` |
| Cards wrap into narrow columns | A container without width shrinks absolutely positioned cards | `#callouts` is 1920×1080; set `w` on wide cards (the default cap is 760 px) |
| Blank areas in full-page screenshots | Scroll-reveal content reset after scrolling | Use per-section screenshots stacked with `vstack` |
| Font falls back to system-ui | Font not on Fontsource, or the npm install failed | `brand_from_tokens.mjs ... --font "Inter"` (pick an open lookalike); check `node_modules/@fontsource*` |
| Rendering slow (< 15 fps) | Too few workers, `filter: blur()` on large layers, PNG capture | Raise `render.workers` (about cores ÷ 2.5), avoid big blurs, keep JPEG capture |
| Stale frame or flicker in the output | Image not decoded before capture | Frames are drawn into canvases from awaited `decode()`d images. If you add `<img>` elements, await `img.decode()` in `renderFrame` |
| Whisper: `--dtw` error | Preset name doesn't match the model | Set `whisper.dtw` correctly (`large.v3`, `large.v3.turbo`, `medium`, `small.en` …) or `""` to disable |
| Whisper hallucinates at the end | Silence or clicks after the last sentence | `cut.end` before the click; `captions.skip` for the phantom words |
| Webcam bubble paint-out visible during a zoom | The fill colour is the median of the surroundings | Fine on flat UI. For busy backgrounds keep zooms away from the bubble area, or leave `cam` out of `project.json` so the original bubble stays in the screen layer (it then zooms with the screen) |
| Playwright browser missing | Playwright updated its Chromium revision | `npx playwright install chromium` |
| Review page is not on port 5000 | Port 5000 is taken (macOS AirPlay Receiver, other dev servers) | Nothing to fix: `review.mjs` takes the next free port and prints it. Pin one with `--port` or `review.port` |
| Review page shows "No stills yet" | `render.mjs --stills` hasn't run, or ran in another project folder | Run it in the folder with `project.json`; the page loads the stills by itself once they exist |
| Review page shows old stills | It was opened before the last `--stills` run | Click "Load them" in the "New stills are ready" banner, or reload the page |
| No sound on the review page | Muted, or `build/review/audio.m4a` is missing | Check the "Sound" button; re-run `--stills` (it mixes the audio) |
| `--stills --range` refuses to run | The cut or the still rate changed since the last full run | Run `node render.mjs --stills` without `--range` |
| Notes don't save ("Not saved") | The review server was stopped | Start `node review.mjs` again; notes already saved stay in `build/review/notes.json` |
