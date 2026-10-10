// Checks the toolchain and prints what is missing with the fix.  node check_env.mjs [project.json]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ok = (m) => console.log('  ok   ' + m), bad = (m, fix) => { console.log('  MISS ' + m + (fix ? `\n         -> ${fix}` : '')); missing++; };
let missing = 0;
const run = (cmd, a) => spawnSync([cmd, ...a].map(x => /\s/.test(x) ? `"${x}"` : x).join(' '), { encoding: 'utf8', shell: true });

console.log('toolchain');
const [maj] = process.versions.node.split('.').map(Number);
maj >= 18 ? ok(`node ${process.versions.node}`) : bad(`node ${process.versions.node} (need >= 18)`, 'install Node.js LTS from nodejs.org');

const ff = run('ffmpeg', ['-hide_banner', '-version']);
if (ff.status === 0) {
  const v = /ffmpeg version (\S+)/.exec(ff.stdout)?.[1] || '?';
  ok(`ffmpeg ${v}${/--enable-libx264/.test(ff.stdout) ? '' : '  (no libx264!)'}`);
  if (!/--enable-libx264/.test(ff.stdout)) bad('ffmpeg without libx264', 'use a full build (gyan.dev / BtbN on Windows, brew on macOS, distro package on Linux)');
} else bad('ffmpeg', 'Windows: winget install Gyan.FFmpeg | macOS: brew install ffmpeg | Linux: apt install ffmpeg');

let pw = null;
try { pw = JSON.parse(fs.readFileSync(path.resolve('node_modules/playwright/package.json'), 'utf8')).version; } catch {}
pw ? ok(`playwright ${pw}`) : bad('playwright (in this folder)', 'npm install   (package.json is in scripts/)');
if (pw) {
  const r = run('npx', ['playwright', 'install', '--dry-run', 'chromium']);
  const loc = /Install location:\s+(.+)/.exec(r.stdout || '')?.[1]?.trim();
  loc && fs.existsSync(loc) ? ok('chromium for playwright') : bad('chromium for playwright', 'npx playwright install chromium');
}

const projFile = process.argv[2] || 'project.json';
let W = {};
if (fs.existsSync(projFile)) { try { W = JSON.parse(fs.readFileSync(projFile, 'utf8')).whisper || {}; } catch {} }
const which = n => { const r = run(process.platform === 'win32' ? 'where' : 'which', [n]); return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null; };
const wbin = W.bin || process.env.WHISPER_BIN || which('whisper-cli') || which('whisper-cpp');
wbin && fs.existsSync(wbin) ? ok(`whisper.cpp ${wbin}`) : bad('whisper.cpp binary', 'see references/whisper.md (release zip on Windows, brew install whisper-cpp on macOS, build on Linux)');
const wmodel = W.model || process.env.WHISPER_MODEL;
wmodel && fs.existsSync(wmodel) ? ok(`whisper model ${wmodel}`) : bad('whisper ggml model', 'download ggml-large-v3-turbo.bin from huggingface.co/ggerganov/whisper.cpp (references/whisper.md)');

console.log(missing ? `\n${missing} missing` : '\nall set');
process.exit(missing ? 1 : 0);
