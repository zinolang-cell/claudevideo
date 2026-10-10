// Transcribe the source with whisper.cpp and word-level DTW timestamps -> build/whisper.json (+ .srt for reading).
//   node transcribe.mjs [project.json]
// Binary: project.whisper.bin | $WHISPER_BIN | whisper-cli / whisper-cpp / main on PATH.
// Model:  project.whisper.model | $WHISPER_MODEL (a ggml-*.bin file, see references/whisper.md for downloads).
// Alternative engines (openai-whisper, faster-whisper) are fine too: save their JSON with word timestamps as
// build/whisper.json and words.mjs reads it.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadProject } from './lib/project.mjs';

const P = loadProject(process.argv[2]);
const W = P.whisper || {};
const which = names => {
  for (const n of names) {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [n], { encoding: 'utf8' });
    if (r.status === 0) return r.stdout.split(/\r?\n/)[0].trim();
  }
  return null;
};
const bin = W.bin || process.env.WHISPER_BIN || which(['whisper-cli', 'whisper-cpp', 'whisper.cpp', 'main']);
const model = W.model || process.env.WHISPER_MODEL;
if (!bin || !fs.existsSync(bin)) { console.error('whisper.cpp binary not found. Set project.whisper.bin or WHISPER_BIN (references/whisper.md).'); process.exit(1); }
if (!model || !fs.existsSync(model)) { console.error('ggml model not found. Set project.whisper.model or WHISPER_MODEL (references/whisper.md).'); process.exit(1); }

// DTW alignment heads preset from the model file name: ggml-large-v3-turbo.bin -> large.v3.turbo, ggml-medium.en.bin -> medium.en
const base = path.basename(model).replace(/^ggml-/, '').replace(/(-q\d.*)?\.bin$/, '');
const dtw = W.dtw ?? base.replace(/-v(\d)/, '.v$1').replace(/-turbo/, '.turbo').replace(/-/g, '.');

const wav = P.build('audio16k.wav');
let r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', P.source, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav], { stdio: 'inherit' });
if (r.status !== 0) process.exit(1);

const threads = String(W.threads || Math.max(4, Math.min(16, (await import('node:os')).cpus().length - 2)));
const cli = ['-m', model, '-f', wav, '-l', P.language || 'auto', '-t', threads, '-ojf', '-osrt', '-of', P.build('whisper'), '-pp'];
if (dtw) cli.push('--dtw', dtw);
if (W.prompt) cli.push('--prompt', W.prompt);                  // vocabulary hint: names, products, jargon
console.log(`${bin} ${cli.join(' ')}`);
const t0 = Date.now();
r = spawnSync(bin, cli, { stdio: ['ignore', 'ignore', 'inherit'] });
if (r.status !== 0) {
  if (dtw) console.error(`whisper failed; if the error mentions DTW, set project.whisper.dtw to "" or to the right preset (got "${dtw}").`);
  process.exit(r.status || 1);
}
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${P.build('whisper.json')}`);
