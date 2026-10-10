// Applies build/cuts.json to the source:
//   build/frames/screen/%05d.jpg  - screen region (project.screen) for every kept source frame, in output order
//   build/frames/cam/%05d.jpg     - square around the webcam bubble (project.cam, optional), same numbering
//   build/voice.wav               - kept audio, 8 ms fades at every cut, outroHold of silence at the end
// usage: node cut_media.mjs [project.json] [--audio-only]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { loadProject } from './lib/project.mjs';
import { decodePCM, writeWav } from './lib/audio.mjs';

const P = loadProject(process.argv[2]);
const cuts = JSON.parse(fs.readFileSync(P.build('cuts.json'), 'utf8'));
const SRC_FPS = 30, RATE = 48000, FADE = 0.008;

// ---- audio -------------------------------------------------------------------------------------------
const pcm = decodePCM(P.source, { rate: RATE, channels: 2 });
const total = Math.round(cuts.duration * RATE);
const out = new Float32Array(total * 2);
let w = 0;
for (const g of cuts.segments) {
  const a = Math.round(g.s0 * RATE), b = Math.round(g.s1 * RATE), n = b - a, f = Math.round(FADE * RATE);
  for (let i = 0; i < n; i++) {
    const gain = Math.min(1, i / f, (n - 1 - i) / f);
    out[(w + i) * 2] = (pcm[(a + i) * 2] || 0) * gain;
    out[(w + i) * 2 + 1] = (pcm[(a + i) * 2 + 1] || 0) * gain;
  }
  w += n;
}
writeWav(P.build('voice.wav'), out, RATE, 2);
console.log(`voice.wav ${(total / RATE).toFixed(2)}s`);
if (process.argv.includes('--audio-only')) process.exit(0);

// ---- video frames ------------------------------------------------------------------------------------
const ranges = cuts.segments.map(g => [Math.round(g.s0 * SRC_FPS), Math.round(g.s1 * SRC_FPS) - 1]);
const expected = ranges.reduce((s, [a, b]) => s + b - a + 1, 0);
const select = ranges.map(([a, b]) => `between(n\\,${a}\\,${b})`).join('+');
// screen: the region to show in the card (defaults to the whole frame). cam: optional webcam bubble burned into
// the recording; it is cut out into its own layer and painted over in the screen layer.
const [vw, vh] = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', P.source], { encoding: 'utf8' }).stdout.trim().split(',').map(Number);
const S = P.screen || { x: 0, y: 0, w: vw, h: vh }, R = P.cam || null;
const side = R ? Math.ceil(R.r * 2 + 8) : 0;
const camX = R ? Math.round(R.cx - side / 2) : 0, camY = R ? Math.round(R.cy - side / 2) : 0;
for (const d of ['screen', 'cam']) { fs.rmSync(P.build('frames', d), { recursive: true, force: true }); fs.mkdirSync(P.build('frames', d), { recursive: true }); }
// JPEG decoders (browsers) assume full-range BT.601, the recording is limited-range BT.709: convert explicitly.
const toJpeg = 'scale=in_color_matrix=bt709:in_range=limited:out_color_matrix=bt601:out_range=full,format=yuvj420p';
const graph = R
  ? `[0:v]fps=${SRC_FPS},select='${select}',setpts=N/${SRC_FPS}/TB,split=2[a][b];[a]crop=${S.w}:${S.h}:${S.x}:${S.y},${toJpeg}[s];[b]crop=${side}:${side}:${camX}:${camY},${toJpeg}[c]`
  : `[0:v]fps=${SRC_FPS},select='${select}',setpts=N/${SRC_FPS}/TB,crop=${S.w}:${S.h}:${S.x}:${S.y},${toJpeg}[s]`;
// ffmpeg >= 7 reads option values from files with "-/option"; older builds use -filter_complex_script
const ffMajor = +(/ffmpeg version n?(\d+)/.exec(spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).stdout)?.[1] || 7);
const graphArg = ffMajor >= 7 ? '-/filter_complex' : '-filter_complex_script';
fs.writeFileSync(P.build('select.txt'), graph);
const outs = ['-map', '[s]', '-fps_mode', 'passthrough', '-q:v', '2', P.build('frames/screen/%05d.jpg')];
if (R) outs.push('-map', '[c]', '-fps_mode', 'passthrough', '-q:v', '2', P.build('frames/cam/%05d.jpg'));
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', P.source, '-an', graphArg, P.build('select.txt'), ...outs], { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status);
const got = fs.readdirSync(P.build('frames/screen')).length;
// cam crop geometry for the compositor: bubble centre inside the crop
fs.writeFileSync(P.build('frames/meta.json'), JSON.stringify({ frames: got, fps: SRC_FPS, screen: { w: S.w, h: S.h },
  cam: R ? { side, cx: R.cx - camX, cy: R.cy - camY, r: R.r } : null,
  paint: R && R.paint !== false ? { cx: R.cx - S.x, cy: R.cy - S.y, r: R.paintR || R.r + 10 } : null }, null, 1));
console.log(`frames: ${got} (expected ${expected})`);
