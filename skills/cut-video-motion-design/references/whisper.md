# Whisper: transcription with word timing

The pipeline needs **word-level** timestamps for pause cutting, caption timing and anchoring events. Segment-level timestamps aren't enough.

## Recommended: whisper.cpp with DTW

whisper.cpp is a single native binary that runs on CPU (with optional GPU) and needs no Python. `--dtw <preset>` turns on dynamic-time-warping token timestamps (`t_dtw` in the full JSON), which are much closer to the voice than the default timestamp tokens.

**Install**

- **Windows:** github.com/ggml-org/whisper.cpp → Releases → `whisper-bin-x64.zip` (or the BLAS or cuBLAS variant). Unzip it; the binary is `whisper-cli.exe` (older builds call it `main.exe`).
- **macOS:** `brew install whisper-cpp` (binary `whisper-cli`), Metal-accelerated.
- **Linux:** `git clone https://github.com/ggml-org/whisper.cpp && cd whisper.cpp && cmake -B build && cmake --build build -j --config Release` → `build/bin/whisper-cli`.

**Models** are ggml files from `https://huggingface.co/ggerganov/whisper.cpp/tree/main`, or use `models/download-ggml-model.sh <name>` in the repo.

| Model | Size | When |
| --- | --- | --- |
| `ggml-large-v3-turbo.bin` | 1.6 GB | Default: near large-v3 accuracy, much faster |
| `ggml-large-v3.bin` | 3.1 GB | Hardest audio, many names; slowest |
| `ggml-medium.bin` | 1.5 GB | Older or slower machines |
| `ggml-small.bin` | 0.5 GB | Quick drafts |

`.en` models are English-only and slightly better for English. Quantised models (`-q5_0`, `-q8_0`) are smaller and faster with small losses.

Point the scripts at the binary and model in `project.json`:

```json
"whisper": { "bin": "C:/tools/whisper/whisper-cli.exe", "model": "C:/tools/whisper/ggml-large-v3-turbo.bin",
             "prompt": "Product names, people, jargon spelled the way you want them." }
```

You can also set the environment variables `WHISPER_BIN` and `WHISPER_MODEL`. `transcribe.mjs` derives the DTW preset from the model name (`large-v3-turbo` → `large.v3.turbo`); override it with `"dtw": "..."`, or set `"dtw": ""` if the build rejects it.

**Speed reference:** large-v3 on a 20-thread CPU transcribes 3 minutes of audio in about 4 minutes; turbo is about 3–4× faster. Run it in the background and capture websites meanwhile.

## Alternatives

- **faster-whisper** (Python, CTranslate2): use `model.transcribe(path, word_timestamps=True)` and dump `{"segments": [{"start", "end", "words": [{"word", "start", "end", "probability"}]}]}` to `build/whisper.json`. `words.mjs` reads this format. With `uv`: `uv run --with faster-whisper python transcribe.py`.
- **openai-whisper** (Python + PyTorch): `whisper audio.wav --model large-v3 --word_timestamps True --output_format json`. Same JSON shape, same handling.
- **ffmpeg's `whisper` filter** (ffmpeg ≥ 8 built with `--enable-whisper`) gives segment timestamps only. That is fine for a rough SRT, not for this pipeline.

## Pitfalls and fixes

- **Brand names get misheard** ("Claude" → "cloud"). Put them in `whisper.prompt` and also add `project.fixes` entries. Fixes can span several words and change the word count (`["ultra code", "Ultracode"]`).
- **Hallucinations at the end** ("Thank you.", "Bye.", "Subtitles by …") over silence or mouse clicks. Check the last segments against the audio envelope (`cutplan.mjs` prints the noise regions it ignored). Exclude them with `captions.skip` and end the cut with `cut.end`.
- **DTW lags after pauses** by 0.2–0.35 s. `cutplan.mjs` moves a word's start to the audio onset when silence precedes it; check sentence starts in the caption printout.
- **Wrong language detection** on short intros: set `"language": "en"` (or `de`, …) instead of `auto`.
- **Duplicated words across segment boundaries** ("bye-bye.- Bye."): drop the duplicate with `captions.skip` (captions only) or `drop` (audio too).
