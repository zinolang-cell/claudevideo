// Pause cutting: audio envelope finds speech, words decide how long each pause may stay.
// Writes build/cuts.json: { fps, duration, segments: [{ s0, s1, o0, o1 }], words: [...output-timed], phrases: [...] }
// usage: node cutplan.mjs [project.json]
import fs from 'node:fs';
import { loadProject } from './lib/project.mjs';
import { decodePCM, envelope } from './lib/audio.mjs';

const P = loadProject(process.argv[2]);
const C = { thresholdDb: -42, speechDb: -30, minGap: 0.12, minBlip: 0.05, pre: 0.08, post: 0.14, leadIn: 0.25, tail: 0.4,
  pause: { sentence: 0.32, comma: 0.22, word: 0.12 }, minSegment: 0.1, start: 0, end: Infinity, outroHold: 0, ...P.cut };
const skipCaption = (P.captions?.skip || []).map(d => Array.isArray(d) ? d : [d.from, d.to]);
const words = JSON.parse(fs.readFileSync(P.build('words.json'), 'utf8')).filter(w => w.s >= C.start && w.s < C.end);
const HOP = 0.01, FR = 1 / 30;                                     // analysis hop, source frame grid (cuts snap to it)

const env = envelope(decodePCM(P.source, { rate: 16000, filter: 'highpass=f=90' }), 16000, HOP);
const N = env.length, dur = N * HOP;

// 0) DTW starts lag the voice after pauses (up to ~0.35 s). When a word is preceded by silence, move its start
//    to the audio onset: the first loud frame after the last silent frame in the 0.45 s before the DTW time.
for (let i = 0; i < words.length; i++) {
  const w = words[i], lo = Math.max(i ? words[i - 1].s + 0.12 : 0, w.s - 0.45);
  let silent = -1;
  for (let k = Math.round(w.s / HOP); k >= Math.round(lo / HOP); k--) if (env[k] < C.thresholdDb) { silent = k; break; }
  if (silent < 0) continue;
  let k = silent; while (k < env.length && env[k] < C.thresholdDb) k++;
  const onset = k * HOP;
  if (onset < w.s - 0.02 && onset > lo) { w.s = +onset.toFixed(3); if (i && words[i - 1].e > w.s) words[i - 1].e = w.s; }
}

// 1) speech mask: frames above thresholdDb, small gaps filled; a run only counts as speech when it peaks above
//    speechDb (breaths and room tails sit between the two and would otherwise split long pauses into short ones)
const on = Array.from(env, (v, i) => v > C.thresholdDb && i * HOP >= C.start && i * HOP < C.end);
const runs = mask => { const r = []; let s = -1; mask.forEach((v, i) => { if (v && s < 0) s = i; if (!v && s >= 0) { r.push([s, i]); s = -1; } }); if (s >= 0) r.push([s, mask.length]); return r; };
const peak = ([a, b]) => { let m = -200; for (let i = Math.round(a / HOP); i < Math.round(b / HOP); i++) m = Math.max(m, env[i]); return m; };
let speech = runs(on).map(([a, b]) => [a * HOP, b * HOP]);
speech = speech.reduce((acc, r) => { const l = acc.at(-1); if (l && r[0] - l[1] < C.minGap) l[1] = r[1]; else acc.push([...r]); return acc; }, []);
speech = speech.filter(r => r[1] - r[0] >= C.minBlip && peak(r) >= C.speechDb);

// 2) regions without any word nearby are noise (clicks, chair, keyboard) unless they are long
const hasWord = ([a, b]) => words.some(w => w.s < b + 0.35 && w.e > a - 0.35);
const noise = speech.filter(r => !hasWord(r));
speech = speech.filter(hasWord);

// 3) manual drops (source ranges) remove speech outright
const drops = (P.drop || []).map(d => Array.isArray(d) ? d : [d.from, d.to]);
const inDrop = t => drops.some(([a, b]) => t >= a && t < b);
speech = speech.flatMap(([a, b]) => {
  let parts = [[a, b]];
  for (const [d0, d1] of drops) parts = parts.flatMap(([x, y]) => (d1 <= x || d0 >= y) ? [[x, y]] : [[x, Math.min(y, d0)], [Math.max(x, d1), y]].filter(([p, q]) => q - p > 0.02));
  return parts;
});

// 4) pause class from the last word spoken before the gap
const lastWordBefore = t => { let w = null; for (const x of words) { if (x.s < t) w = x; else break; } return w; };
const classOf = t => { const w = lastWordBefore(t); if (!w) return 'sentence'; if (/[.?!]["”]?$/.test(w.w)) return 'sentence'; if (/[,;:]$/.test(w.w)) return 'comma'; return 'word'; };

const keep = [];
for (let i = 0; i < speech.length; i++) {
  const [a, b] = speech[i];
  const prev = keep.at(-1);
  if (!prev) { keep.push([Math.max(0, a - C.leadIn), b]); continue; }
  const gapStart = speech[i - 1][1], gap = a - gapStart;
  const max = C.pause[classOf(gapStart + 0.05)];
  const dropped = drops.some(([d0, d1]) => d0 < a && d1 > gapStart);  // never bridge across a manual drop
  if (gap <= max && !dropped) { prev[1] = b; continue; }
  const keepPause = Math.min(gap, max);
  prev[1] = Math.min(gapStart + Math.max(C.post, keepPause * 0.6), a);
  keep.push([Math.max(a - Math.max(C.pre, keepPause * 0.4), prev[1]), b]);
}
keep.at(-1)[1] = Math.min(dur, C.end, keep.at(-1)[1] + C.tail);

// 5) snap to the source frame grid (expand outward), merge overlaps, drop slivers
const snapped = keep.map(([a, b]) => [Math.floor(a / FR + 1e-6) * FR, Math.ceil(b / FR - 1e-6) * FR])
  .reduce((acc, r) => { const l = acc.at(-1); if (l && r[0] <= l[1] + 1e-6) l[1] = Math.max(l[1], r[1]); else acc.push([...r]); return acc; }, [])
  .filter(([a, b]) => b - a >= C.minSegment);

let o = 0;
const segments = snapped.map(([s0, s1]) => { const seg = { s0: +s0.toFixed(4), s1: +s1.toFixed(4), o0: +o.toFixed(4), o1: +(o + s1 - s0).toFixed(4) }; o += s1 - s0; return seg; });
const speechEnd = o, total = o + C.outroHold;                     // outroHold: end card keeps running after the last word

// source time -> output time (null when the moment was cut)
const map = t => { for (const g of segments) if (t >= g.s0 - 1e-6 && t < g.s1) return g.o0 + (t - g.s0); return null; };
const mapNearest = t => { let best = null; for (const g of segments) { if (t < g.s0) return best ?? g.o0; best = g.o1; if (t < g.s1) return g.o0 + (t - g.s0); } return total; };

// 6) words on the output timeline. DTW starts can lag the audio onset, so a word whose start falls in a cut gap
// is snapped to the start of the next kept segment.
const owords = [];
for (const w of words) {
  if (inDrop(w.s + 0.02) || skipCaption.some(([a, b]) => w.s >= a && w.s < b)) continue;
  let os = map(w.s);
  if (os == null) { const g = segments.find(g => g.s0 > w.s); if (!g || g.s0 - w.s > 0.6) continue; os = g.o0; }
  let oe = map(Math.max(w.s + 0.05, w.e - 0.001)); if (oe == null || oe < os) oe = os + Math.min(0.5, w.e - w.s);
  owords.push({ w: w.w, s: +os.toFixed(3), e: +oe.toFixed(3), src: w.s });
}

// 7) caption lines: every sentence is broken into one-line chunks by dynamic programming. Cost = deviation from
//    the ideal line length + break quality (after a comma or a long pause: good; before a conjunction: good;
//    after an article/preposition: bad) + a fixed price per line so short sentences stay on one line.
const MAXC = P.captions?.maxChars || 42, IDEAL = P.captions?.idealChars || 34;
const BEFORE_OK = /^(and|but|or|because|so|then|that|which|when|if|how|while|after|before|until|especially|to|for|with)$/i;
const AFTER_BAD = /^(the|a|an|to|of|in|on|at|your|my|our|their|its|for|with|into|from|by|and|or|i|you|it|is|are|was|will|can|would|need|want|have|has|be|am|this|that's)$/i;
const len = ws => ws.map(x => x.w).join(' ').length;
const bare = w => w.w.replace(/[^\p{L}\p{N}$@]/gu, '');
function breakCost(sent, i) {                        // cost of ending a line after sent[i]
  const w = sent[i], next = sent[i + 1];
  let c = 0;
  if (/[,;:]$/.test(w.w)) c -= 8;
  if (next && next.s - w.e > 0.5) c -= 6;
  if (next && BEFORE_OK.test(bare(next))) c -= 3;
  if (AFTER_BAD.test(bare(w)) && !/[,;:]$/.test(w.w)) c += 12;
  if (next && /^\p{Lu}/u.test(bare(w)) && /^\p{Lu}/u.test(bare(next)) && !/[,;:.]$/.test(w.w)) c += 20;   // keep names together
  return c;
}
function splitSentence(sent) {
  const n = sent.length, best = Array(n + 1).fill(Infinity), from = Array(n + 1).fill(-1);
  best[0] = 0;
  for (let j = 1; j <= n; j++) for (let i = 0; i < j; i++) {
    const l = len(sent.slice(i, j));
    if (l > MAXC && j - i > 1) continue;
    const c = best[i] + (l - IDEAL) ** 2 / IDEAL + (l < 10 ? 12 : 0) + 6 + (j < n ? breakCost(sent, j - 1) : 0);
    if (c < best[j]) { best[j] = c; from[j] = i; }
  }
  const out = []; for (let j = n; j > 0; j = from[j]) out.unshift(sent.slice(from[j], j));
  return out;
}
const sentences = [];
{ let cur = []; for (const w of owords) { cur.push(w); if (/[.?!]["”]?$/.test(w.w)) { sentences.push(cur); cur = []; } } if (cur.length) sentences.push(cur); }
const lines = sentences.flatMap(splitSentence).map(ws => ({ s: ws[0].s, e: ws.at(-1).e, text: ws.map(x => x.w).join(' '), words: ws }));

fs.writeFileSync(P.build('cuts.json'), JSON.stringify({ fps: 30, sourceDuration: +dur.toFixed(3), speechEnd: +speechEnd.toFixed(4), duration: +total.toFixed(4), segments, words: owords, phrases: lines }, null, 1));
const used = Math.min(dur, C.end) - C.start, removed = used - speechEnd;
console.log(`segments: ${segments.length}  output: ${total.toFixed(2)}s incl. ${C.outroHold}s outro hold  (source ${dur.toFixed(2)}s; pauses removed ${removed.toFixed(2)}s, trimmed outside start/end ${(dur - used).toFixed(2)}s)`);
console.log(`noise regions ignored: ${noise.map(([a, b]) => `${a.toFixed(2)}-${b.toFixed(2)}`).join(' ') || 'none'}`);
console.log(`caption lines: ${lines.length}`);
if (process.argv.includes('--verbose')) {
  for (const g of segments) console.log(`  ${g.s0.toFixed(2)}-${g.s1.toFixed(2)} -> ${g.o0.toFixed(2)}-${g.o1.toFixed(2)}`);
  for (const p of lines) console.log(`  [${p.s.toFixed(2)}-${p.e.toFixed(2)}] ${p.text}`);
}
