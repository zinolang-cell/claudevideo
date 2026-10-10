// Whisper JSON -> build/words.json  [{ w, s, e, p }]  (seconds, source timeline)
// Reads whisper.cpp full JSON (-ojf, --dtw) or openai-whisper / faster-whisper JSON with word timestamps.
// Tokens are glued into words; a token starting with a space starts a new word. Start = DTW time when present.
// usage: node words.mjs [project.json]
import fs from 'node:fs';
import { loadProject } from './lib/project.mjs';

const P = loadProject(process.argv[2]);
const j = JSON.parse(fs.readFileSync(P.build('whisper.json'), 'utf8'));
const words = [];
if (j.segments) {                                                   // openai-whisper / faster-whisper (word_timestamps=True)
  for (const seg of j.segments) for (const x of seg.words || []) words.push({ w: String(x.word ?? x.text).trim(), s: x.start, segEnd: seg.end, p: [x.probability ?? x.prob ?? 1] });
} else for (const seg of j.transcription) {                          // whisper.cpp -ojf (tokens, t_dtw in 10 ms units)
  for (const tok of seg.tokens) {
    if (/^\[_|^\[(BLANK|MUSIC|SOUND)/i.test(tok.text)) continue;          // special tokens
    const t = (tok.t_dtw >= 0 ? tok.t_dtw * 10 : tok.offsets.from) / 1000;
    const piece = tok.text;
    if (/^\s/.test(piece) || !words.length || /^[\s"“]/.test(piece)) words.push({ w: piece.trim(), s: t, segEnd: seg.offsets.to / 1000, p: [tok.p] });
    else { const last = words[words.length - 1]; last.w += piece; last.p.push(tok.p); }
  }
}
// Glue stray punctuation-only "words" onto the previous word.
for (let i = words.length - 1; i > 0; i--) if (/^[^\p{L}\p{N}@$]+$/u.test(words[i].w)) { words[i - 1].w += words[i].w; words.splice(i, 1); }

// Spelling fixes, matched on word cores (punctuation stripped, case-insensitive). A fix may span several
// words and change the word count ("ultra code" -> "Ultracode"); punctuation of the matched span is kept.
//   project.json  fixes: [["cloud code", "Claude Code"], ["playwrights", "Playwright"], ...]
const core = w => w.replace(/^[^\p{L}\p{N}@$]+|[^\p{L}\p{N}]+$/gu, '').toLowerCase();
const fixes = (P.fixes || []).map(([from, to]) => ({ from: from.split(/\s+/).map(core), to: to.split(/\s+/) }))
  .sort((a, b) => b.from.length - a.from.length);
for (let i = 0; i < words.length; i++) {
  for (const f of fixes) {
    const span = words.slice(i, i + f.from.length);
    if (span.length < f.from.length || !span.every((w, k) => core(w.w) === f.from[k])) continue;
    const lead = span[0].w.match(/^[^\p{L}\p{N}@$]*/u)[0], trail = span.at(-1).w.match(/[^\p{L}\p{N}]*$/u)[0];
    const t0 = span[0].s, t1 = span.at(-1).s, n = f.to.length;
    const repl = f.to.map((txt, k) => ({ w: (k === 0 ? lead : '') + txt + (k === n - 1 ? trail : ''),
      s: n === 1 ? t0 : t0 + (t1 - t0) * k / (n - 1), segEnd: span.at(-1).segEnd, p: span.flatMap(w => w.p) }));
    words.splice(i, f.from.length, ...repl);
    i += n - 1; break;
  }
}
// End time: next word's start, capped by a natural length estimate (DTW gives starts, not ends).
for (let i = 0; i < words.length; i++) {
  const w = words[i], next = words[i + 1];
  w.w = w.w.replace(/([.,!?])-+$/, '$1');                                   // "bye-bye.-" -> "bye-bye."
  const natural = w.s + 0.12 + 0.07 * w.w.replace(/[^\p{L}\p{N}]/gu, '').length;
  w.e = +Math.min(next ? next.s : w.segEnd, natural, w.segEnd + 0.3).toFixed(3);
  w.s = +w.s.toFixed(3);
  w.p = +(w.p.reduce((a, b) => a + b, 0) / w.p.length).toFixed(2);
  delete w.segEnd;
}
fs.writeFileSync(P.build('words.json'), JSON.stringify(words, null, 1));
console.log(`${words.length} words`);
console.log(words.map(w => `${w.s.toFixed(2)} ${w.w}`).join(' | '));
