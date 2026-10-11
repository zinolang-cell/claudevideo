// Builds build/score.json from cuts + timeline, then renders with Playwright (headless Chromium) + ffmpeg.
//   node render.mjs                         full render -> project.output (parallel workers, H.264 chunks, audio mix)
//   node render.mjs --preview 3.5,40,120    stills at OUTPUT seconds -> build/preview/*.png
//   node render.mjs --preview-src 19,57.5   stills at SOURCE seconds (as in timeline.mjs)
//   node render.mjs --sheet 24              contact sheet of 24 evenly spaced frames -> build/preview/sheet.jpg
//   node render.mjs --range 60,75           render only that output range (fast iteration) -> build/range.mp4
//   node render.mjs --stills [fps]          the whole edit as review stills (default 15 fps) + final audio mix -> build/review/
//                                           (add --range 60,75 to update only part of them); show them with: node review.mjs
//   node render.mjs --score-only            just write build/score.json
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadProject } from './lib/project.mjs';
import { decodePCM } from './lib/audio.mjs';

const args = process.argv.slice(2);
const P = loadProject(args.find(a => a.endsWith('.json')) || 'project.json');
const opt = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : null; };
const R = { fps: 30, workers: 6, crf: 17, preset: 'medium', jpegQuality: 95, ...P.render };
const cuts = JSON.parse(fs.readFileSync(P.build('cuts.json'), 'utf8'));
const meta = JSON.parse(fs.readFileSync(P.build('frames/meta.json'), 'utf8'));
const rel = f => '/' + path.relative(P.dir, path.resolve(P.dir, f)).split(path.sep).join('/');

// ---- source time -> output time ---------------------------------------------------------------------------------
const segs = cuts.segments;
const at = s => { let last = 0; for (const g of segs) { if (s < g.s0) return g.o0; if (s < g.s1) return +(g.o0 + s - g.s0).toFixed(4); last = g.o1; } return last; };
const sites = (name, kind = 'viewport') => rel(`build/sites/${name}/${kind}.png`);
const timeline = (await import(pathToFileURL(path.join(P.dir, 'timeline.mjs')).href + '?v=' + Date.now())).default({ at, sites, P, cuts, asset: p => rel(p) });

// ---- assets: icons inline, logos copied into build/assets --------------------------------------------------------
const used = { icons: new Set(['check-bold', 'x-bold', 'arrow-up-bold', 'lock-simple']), logos: new Set() };
JSON.stringify(timeline, (k, v) => { if (k === 'icon' && typeof v === 'string') used.icons.add(v); if (k === 'logo' && typeof v === 'string') used.logos.add(v); return v; });
// Asset lookup patterns (project.assets.icon / .logo may be a string or a list; the first existing file wins).
// Defaults: Phosphor icons from the npm package @phosphor-icons/core (MIT); logos you downloaded into
// assets/logos/<name>/ (svgl, Simple Icons, the brand's press kit); Simple Icons from the npm package simple-icons (CC0).
const A = {
  icon: ['node_modules/@phosphor-icons/core/assets/{weight}/{name}-{weight}.svg', 'node_modules/@phosphor-icons/core/assets/regular/{name}.svg'],
  logo: ['assets/logos/{name}/{file}', 'node_modules/simple-icons/icons/{name}.svg'],
  sfxDir: 'assets/sfx', ...P.assets,
};
const list = v => (Array.isArray(v) ? v : [v]).map(p => P.res(p));
const fill = (p, vars) => Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), p);
const icons = {};
for (const n of used.icons) {
  const m = n.match(/^(.*)-(bold|fill|thin|duotone|light|regular)$/), name = m ? m[1] : n, weight = m ? m[2] : 'light';
  const f = list(A.icon).map(p => fill(p, { weight, name })).find(f => fs.existsSync(f));
  icons[n] = f ? fs.readFileSync(f, 'utf8') : (console.warn('icon missing', n), '');
}
const logos = {}, logosDark = {};
fs.mkdirSync(P.build('assets/logos'), { recursive: true });
for (const n of used.logos) {
  const pick = (...files) => list(A.logo).flatMap(p => files.map(file => fill(p, { name: n, file }))).find(f => fs.existsSync(f));
  const light = pick('mark-light.svg', 'mark.svg', 'wordmark-light.svg'), dark = pick('mark-dark.svg', 'mark.svg', 'wordmark-dark.svg');
  if (!light) { console.warn('logo missing', n); continue; }
  fs.copyFileSync(light, P.build(`assets/logos/${n}-light.svg`)); logos[n] = rel(`build/assets/logos/${n}-light.svg`);
  fs.copyFileSync(dark, P.build(`assets/logos/${n}-dark.svg`)); logosDark[n] = rel(`build/assets/logos/${n}-dark.svg`);
}

// ---- waveform data for 'wave' callouts: real audio peaks of a source range, bins flagged when they were cut -------
let pcm16 = null;
for (const c of timeline.callouts.filter(c => c.kind === 'wave')) {
  pcm16 ??= decodePCM(P.source, { rate: 16000 });
  const bins = 220, a = c.waveFrom, b = c.waveTo, peaks = [];
  for (let i = 0; i < bins; i++) {
    const t0 = a + (b - a) * i / bins, t1 = a + (b - a) * (i + 1) / bins;
    let m = 0; for (let k = Math.floor(t0 * 16000); k < t1 * 16000; k++) m = Math.max(m, Math.abs(pcm16[k] || 0));
    const mid = (t0 + t1) / 2, kept = segs.some(g => mid >= g.s0 && mid < g.s1);
    peaks.push({ v: m, cut: !kept });
  }
  const mx = Math.max(...peaks.map(p => p.v)) || 1;
  peaks.forEach(p => { p.v = +Math.pow(p.v / mx, 0.7).toFixed(3); });
  c.peaks = peaks; c.removed = +((b - a) * peaks.filter(p => p.cut).length / bins).toFixed(1);
}

// ---- score ----------------------------------------------------------------------------------------------------------------
const score = {
  W: P.W, H: P.H, fps: R.fps, duration: cuts.duration, speechEnd: cuts.speechEnd,
  styleFx: fs.existsSync(P.build('style.js')) ? rel('build/style.js') + '?v=' + fs.statSync(P.build('style.js')).mtimeMs : null,
  screen: { w: meta.screen.w, h: meta.screen.h, n: meta.frames, fps: meta.fps, base: rel('build/frames/screen') + '/' },
  cam: meta.cam ? { ...meta.cam, base: rel('build/frames/cam') + '/' } : null, paint: meta.paint,
  cuts: segs.slice(1).map(g => g.o0),
  captions: cuts.phrases.map(p => ({ s: p.s, e: p.e, words: p.words.map(w => ({ w: w.w, s: w.s, e: w.e })) })),
  hero: P.brand?.hero ? rel(P.brand.hero) : null, brandLogoWhite: P.brand?.logoWhite ? rel(P.brand.logoWhite) : null, brandLogo: P.brand?.logo ? rel(P.brand.logo) : null,
  icons, logos, logosDark,
  ...timeline,
  chapters: timeline.chapters.map((c, i) => ({ ...c, n: i + 1 })), chapterCount: timeline.chapters.length,
  camera: timeline.camera, spots: timeline.spots, callouts: timeline.callouts, broll: timeline.broll,
  holds: (timeline.holds || []).map(h => ({ o0: at(h.from), o1: at(h.to), frame: Math.round(at(h.use) * meta.fps) })),
};
fs.writeFileSync(P.build('score.json'), JSON.stringify(score));
if (!fs.existsSync(P.build('brand.css'))) fs.writeFileSync(P.build('brand.css'), '/* no brand yet: run brand_from_tokens.mjs */');
if (!fs.existsSync(P.build('style.css'))) fs.writeFileSync(P.build('style.css'), '/* no animation style: node style.mjs use <n> */');
console.log(`score: ${score.duration.toFixed(2)}s, ${score.captions.length} caption lines, ${score.callouts.length} callouts, ${score.broll.length} b-roll, ${score.camera.length} camera moves`);
if (args.includes('--score-only')) process.exit(0);

// ---- static server (project dir) ---------------------------------------------------------------------------------------------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(P.dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(P.dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'max-age=3600' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: P.W, height: P.H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('[page]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(`${ORIGIN}/compose/index.html`);
  await page.waitForFunction(() => window.composeReady === true, null, { timeout: 60000 });
  const cdp = await page.context().newCDPSession(page);
  const grab = async (format = 'jpeg', quality = R.jpegQuality) => Buffer.from((await cdp.send('Page.captureScreenshot', { format, quality: format === 'jpeg' ? quality : undefined, optimizeForSpeed: true })).data, 'base64');
  return { page, grab, render: t => page.evaluate(t => window.renderFrame(t), t) };
}

const launch = () => chromium.launch({ args: ['--disable-gpu-vsync', '--disable-frame-rate-limit', '--force-color-profile=srgb', '--font-render-hinting=none'] });
const run = (cmd, a) => new Promise((ok, fail) => {
  const p = spawn(cmd, a, { stdio: ['ignore', 'ignore', 'pipe'] }); let err = '';
  p.stderr.on('data', d => { err += d; }); p.on('close', c => (c === 0 ? ok() : fail(new Error(err))));
});

// ---- audio: voice chain + SFX cues for an output range -------------------------------------------------------------------------------
// The MP4 and the review page use this same mix, so what the user hears in the review is what gets rendered.
function mixAudio([a, b], out, codec = ['-c:a', 'pcm_s16le']) {
  const cues = [], SFX = P.sfx || {};
  const addCue = (name, t) => { if (SFX[name] && t >= a && t < b) cues.push({ name, t: t - a }); };
  addCue('intro', 0.25);
  score.chapters.slice(1).forEach(c => addCue('chapter', c.t));
  [...score.callouts, ...score.broll].forEach(c => c.sfx && addCue(c.sfx, c.t0 + 0.02));
  addCue('outro', score.outroStart + 0.2);
  (score.cues || []).forEach(c => addCue(c.sfx, c.t));                // free cues from the timeline: [{ t, sfx }]
  const sfxFiles = {};
  for (const [name, s] of Object.entries(SFX)) {
    if (s.synth === 'whoosh') {
      const f = P.build('assets/whoosh.wav');
      spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anoisesrc=d=0.75:c=pink:r=48000:a=0.7', '-af',
        'bandpass=f=1400:width_type=o:w=2.4,afade=t=in:st=0:d=0.3:curve=qsin,afade=t=out:st=0.3:d=0.45:curve=qsin,aformat=channel_layouts=stereo', f]);
      sfxFiles[name] = f;
    } else sfxFiles[name] = P.res(path.join(A.sfxDir || 'assets/sfx', s.file));
  }
  const audioIn = ['-ss', String(a), '-t', String(b - a), '-i', P.build('voice.wav')];
  cues.forEach(c => audioIn.push('-i', sfxFiles[c.name]));
  const voice = `[0:a]highpass=f=80,acompressor=threshold=-22dB:ratio=3:attack=8:release=140:makeup=2,loudnorm=I=${P.audio?.lufs ?? -16}:TP=${P.audio?.truePeak ?? -2}:LRA=9[v]`;   // project.audio.lufs: TikTok/Reels about -14; measure, with SFX and the limiter it lands about 1 LU lower
  const sfxChains = cues.map((c, i) => `[${i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${SFX[c.name].gain}dB,adelay=${Math.round(c.t * 1000)}:all=1[s${i}]`);
  const mix = `[v]${cues.map((_, i) => `[s${i}]`).join('')}amix=inputs=${cues.length + 1}:normalize=0:duration=first,alimiter=limit=${P.audio?.limit ?? 0.95}:level=0[a]`;   // level=0: no auto gain back to 0 dBFS
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...audioIn, '-filter_complex', [voice, ...sfxChains, mix].join(';'), '-map', '[a]', '-ar', '48000', ...codec, out], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('audio mix failed'); process.exit(1); }
  return out;
}

// ---- preview stills ---------------------------------------------------------------------------------------------------------------
const pv = opt('preview') ?? (opt('preview-src') ? opt('preview-src').split(',').map(s => at(+s)).join(',') : null);
if (pv || opt('sheet')) {
  fs.mkdirSync(P.build('preview'), { recursive: true });
  const times = pv ? pv.split(',').map(Number) : Array.from({ length: +opt('sheet') }, (_, i) => +(cuts.duration * (i + .5) / +opt('sheet')).toFixed(2));
  const browser = await launch(), w = await openPage(browser), files = [];
  for (const t of times) {
    await w.render(t);
    const f = P.build(`preview/t${t.toFixed(2).padStart(7, '0')}.png`);
    fs.writeFileSync(f, await w.grab('png')); files.push(f);
  }
  await browser.close();
  if (opt('sheet') || times.length > 1) {
    const cols = times.length <= 4 ? 2 : times.length <= 9 ? 3 : 4, rows = Math.ceil(times.length / cols);
    const inputs = files.flatMap(f => ['-i', f]);
    const font = ['C:/Windows/Fonts/arialbd.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf'].find(f => fs.existsSync(f));
    const label = i => font ? `,drawtext=fontfile='${font.replace(/:/g, '\\:')}':text='${times[i].toFixed(2)}s':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6` : '';
    const lab = files.map((f, i) => `[${i}]scale=640:360${label(i)}[v${i}]`).join(';');
    const pads = Array.from({ length: cols * rows - files.length }, (_, i) => `color=c=black:s=640x360:d=1[p${i}]`).join(';');
    const all = [...files.map((_, i) => `[v${i}]`), ...Array.from({ length: cols * rows - files.length }, (_, i) => `[p${i}]`)];
    const layout = all.map((_, i) => `${(i % cols) * 640}_${Math.floor(i / cols) * 360}`).join('|');
    spawnSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `${lab}${pads ? ';' + pads : ''};${all.join('')}xstack=inputs=${all.length}:layout=${layout}`, '-frames:v', '1', P.build('preview/sheet.jpg')], { stdio: 'inherit' });
    console.log('sheet:', P.build('preview/sheet.jpg'));
  }
  console.log(files.join('\n'));
  server.close(); process.exit(0);
}

// ---- review stills: the whole edit at a lower frame rate, full + half size, the final audio mix and a manifest ----------------------------
// The review page (node review.mjs) plays them with sound, so the user can approve the edit before the MP4 render.
if (args.includes('--stills')) {
  const rv = (...p) => P.build('review', ...p), D = cuts.duration, r3 = x => +(+x).toFixed(3);
  const segList = segs.map(g => [r3(g.o0), r3(g.o1), r3(g.s0)]);         // output start, output end, source start: output -> source time
  const old = fs.existsSync(rv('manifest.json')) ? JSON.parse(fs.readFileSync(rv('manifest.json'), 'utf8')) : null;
  const part = opt('range') ? opt('range').split(',').map(Number) : null;
  const v = opt('stills'), SF = v && /^\d+(\.\d+)?$/.test(v) ? +v : (part && old?.fps) || P.review?.fps || 15;
  const N = Math.ceil(D * SF - 1e-6);
  // --range only replaces stills of the same cut at the same rate; anything else would leave stills at the wrong times
  if (part && (!old || old.fps !== SF || old.frames !== N || JSON.stringify(old.segments) !== JSON.stringify(segList))) {
    console.error('--stills --range updates part of an existing set of the same cut and still rate. The cut changed, or there is no full set yet: run node render.mjs --stills without --range.');
    process.exit(1);
  }
  const S0 = part ? Math.max(0, Math.floor(part[0] * SF)) : 0, S1 = part ? Math.min(N, Math.ceil(part[1] * SF)) : N;
  if (!part) for (const d of ['full', 'half']) fs.rmSync(rv(d), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });   // notes.json stays
  for (const d of ['full', 'half']) fs.mkdirSync(rv(d), { recursive: true });
  const HW = Math.round(P.W / 4) * 2, HH = Math.round(P.H / 4) * 2, name = f => `f${String(f).padStart(5, '0')}.jpg`;
  const count = S1 - S0, NWs = Math.max(1, Math.min(R.workers, Math.ceil(count / 40))), per = Math.ceil(count / NWs);
  const t0 = Date.now(); let done = 0;
  await Promise.all(Array.from({ length: NWs }, async (_, k) => {
    const a = S0 + k * per, b = Math.min(S1, a + per); if (a >= b) return;
    const browser = await launch(), w = await openPage(browser);
    for (let f = a; f < b; f++) {
      await w.render(f / SF);
      fs.writeFileSync(rv('full', name(f)), await w.grab('jpeg', P.review?.quality ?? 88));
      if (++done % 300 === 0) console.log(`${done}/${count} stills  ${(done / ((Date.now() - t0) / 1000)).toFixed(1)} per s`);
    }
    await browser.close();
    // half size: what the page plays (decoded full-size frames would use too much memory); full size is shown when paused
    await run('ffmpeg', ['-v', 'error', '-y', '-start_number', String(a), '-i', rv('full', 'f%05d.jpg'), '-frames:v', String(b - a),
      '-vf', `scale=${HW}:${HH}:flags=lanczos`, '-q:v', '4', '-start_number', String(a), rv('half', 'f%05d.jpg')]);
  }));
  server.close();
  mixAudio([0, D], rv('audio.m4a'), ['-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart']);

  // what the page needs to label the timeline: sections (intro, chapters, outro), motion-design moments, zooms and cuts
  const strip = s => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const fr = t => Math.max(0, Math.min(N - 1, Math.round(t * SF)));
  const bounds = [{ t: 0, label: score.intro ? 'Intro' : 'Start', kind: score.intro ? 'intro' : 'main' }];
  if (score.intro && !score.chapters.some(c => Math.abs(c.t - score.introEnd) < 0.5)) bounds.push({ t: score.introEnd, label: 'Main part', kind: 'main' });
  bounds.push(...score.chapters.map(c => ({ t: c.t, label: `${String(c.n).padStart(2, '0')} · ${strip(c.title)}`, kind: 'chapter' })));
  if (score.outro) bounds.push({ t: score.outroStart, label: 'Outro', kind: 'outro' });
  bounds.sort((x, y) => x.t - y.t);
  const sections = bounds.map((s, i) => ({ ...s, t1: Math.min(D, bounds[i + 1]?.t ?? D) })).filter(s => s.t1 - s.t >= 0.3)
    .map(s => ({ label: s.label, kind: s.kind, t0: r3(s.t), t1: r3(s.t1), poster: fr(s.t + Math.min(s.kind === 'chapter' ? 1.5 : 2.4, (s.t1 - s.t) * 0.6)) }));
  const what = c => strip(c.title ?? c.titleHtml ?? c.text ?? c.keys?.join(' › ') ?? (c.valueHtml && `${c.valueHtml} ${c.label ?? ''}`) ?? c.heading?.join(' ') ?? c.eyebrow ?? c.label);
  const moments = [
    ...score.callouts.map(c => ({ kind: c.kind, t0: c.t0, t1: c.t1, label: what(c) })),
    ...score.broll.map(b => ({ kind: b.kind, t0: b.t0, t1: b.t1, label: strip(b.url ?? b.tag?.text ?? b.items?.map(i => i.name || i.url).join(' · ')) })),
    ...(score.spots || []).map(s => ({ kind: 'spot', t0: s.t0, t1: s.t1, label: strip(s.label) || 'Spotlight' })),
  ].filter(m => m.t0 < D).sort((x, y) => x.t0 - y.t0)
    .map(m => ({ ...m, t0: r3(m.t0), t1: r3(Math.min(m.t1, D)), poster: fr(Math.min(m.t0 + 0.8, (m.t0 + m.t1) / 2)) }));
  const style = fs.existsSync(P.build('style.json')) ? JSON.parse(fs.readFileSync(P.build('style.json'), 'utf8')).name : null;
  const manifest = {
    version: Date.now(), rendered: new Date().toISOString(), title: P.title || path.basename(P.output || P.dir).replace(/\.\w+$/, ''),
    width: P.W, height: P.H, half: [HW, HH], fps: SF, videoFps: R.fps, frames: N, duration: D, audio: 'audio.m4a', style,
    source: { name: P.source ? path.basename(P.source) : null, duration: cuts.sourceDuration ?? null, cuts: segs.length - 1 },
    sections, moments,
    zooms: score.camera.map(c => r3(c.t)).filter(t => t < D),
    cuts: segs.slice(1).map((g, i) => ({ t: r3(g.o0), removed: +(g.s0 - segs[i].s1).toFixed(2) })),
    segments: segList,
    partial: part ? [r3(S0 / SF), r3(S1 / SF)] : null,
  };
  fs.writeFileSync(rv('manifest.json'), JSON.stringify(manifest));
  console.log(`stills: ${count} of ${N} at ${SF} fps (full ${P.W}x${P.H} + half ${HW}x${HH}) in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${rv()}`);
  console.log('show them: node review.mjs   (keep it running; it prints the address)');
  process.exit(0);
}

// ---- full / range render ------------------------------------------------------------------------------------------------------------
const range = opt('range') ? opt('range').split(',').map(Number) : [0, cuts.duration];
const F0 = Math.round(range[0] * R.fps), F1 = Math.round(range[1] * R.fps);
const total = F1 - F0, NW = Math.min(R.workers, Math.ceil(total / 30));
const chunkDir = P.build('chunks'); fs.rmSync(chunkDir, { recursive: true, force: true }); fs.mkdirSync(chunkDir, { recursive: true });
const per = Math.ceil(total / NW);
const t0 = Date.now(); let done = 0;
const enc = out => spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(R.fps), '-i', '-',
  '-vf', 'scale=in_color_matrix=bt601:in_range=full:out_color_matrix=bt709:out_range=limited,format=yuv420p',
  '-c:v', 'libx264', '-preset', R.preset, '-crf', String(R.crf), '-threads', '4', '-g', String(R.fps * 2),
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', out], { stdio: ['pipe', 'inherit', 'inherit'] });
await Promise.all(Array.from({ length: NW }, async (_, k) => {
  const a = F0 + k * per, b = Math.min(F1, a + per); if (a >= b) return;
  const browser = await launch(), w = await openPage(browser);
  const ff = enc(path.join(chunkDir, `c${String(k).padStart(2, '0')}.mp4`));
  for (let f = a; f < b; f++) {
    await w.render(f / R.fps);
    const jpg = await w.grab('jpeg');
    if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % 150 === 0) { const s = (Date.now() - t0) / 1000; console.log(`${done}/${total} frames  ${(done / s).toFixed(1)} fps  eta ${((total - done) / (done / s)).toFixed(0)}s`); }
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  await browser.close();
}));
server.close();
console.log(`frames done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

const mixed = mixAudio(range, P.build('mix.wav'));

// ---- concat chunks + mux ------------------------------------------------------------------------------------------------------------------------
const chunkList = fs.readdirSync(chunkDir).filter(f => f.endsWith('.mp4')).sort().map(f => `file '${path.join(chunkDir, f).split(path.sep).join('/')}'`).join('\n');
fs.writeFileSync(path.join(chunkDir, 'list.txt'), chunkList);
const out = opt('range') ? P.build('range.mp4') : P.output;
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(chunkDir, 'list.txt'), '-i', mixed,
  '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
console.log(r.status === 0 ? `wrote ${out}` : 'mux failed');
