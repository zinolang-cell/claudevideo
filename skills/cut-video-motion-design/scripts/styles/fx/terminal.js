// 18 Terminal: the headline types itself behind a "$ " prompt with a block cursor; a build log scrolls in the
// lower left of the scenes; faint CRT scanlines everywhere (overlay canvas).
let bgx, topx, W, H, S, scan;
const LOG = ['$ whisper-cli -m ggml-large-v3.bin --dtw', '[ ok ] 1,204 words transcribed', '$ node cutplan.mjs', '[ ok ] 45 cuts, pauses removed',
  '$ node capture_site.mjs https://example.com', '[ ok ] fonts, colours, radius extracted', '$ node render.mjs --fps 60', '[ .. ] rendering frames',
  '[ ok ] encoded H.264, loudness -16 LUFS', '$ _'];

export function init({ bg, top, W: w, H: h, S: score }) {
  W = w; H = h; S = score || {}; bgx = bg.getContext('2d'); topx = top.getContext('2d');
  const p = document.createElement('canvas'); p.width = 4; p.height = 3;
  const px = p.getContext('2d'); px.fillStyle = 'rgba(0,0,0,1)'; px.fillRect(0, 2, 4, 1);
  scan = topx.createPattern(p, 'repeat');
}

export function frame(t, { k }) {
  bgx.clearRect(0, 0, W, H); topx.clearRect(0, 0, W, H);
  topx.globalAlpha = .16 - .09 * k; topx.fillStyle = scan; topx.fillRect(0, 0, W, H); topx.globalAlpha = 1;
  if (k > .995) return;
  const local = t >= (S.outroStart ?? 1e9) ? t - S.outroStart : t;
  bgx.globalAlpha = 1 - k; bgx.font = '500 20px StyleMono, monospace'; bgx.textBaseline = 'top';
  const n = Math.min(LOG.length, Math.floor(local * 2.4)), first = Math.max(0, n - 4);   // last four lines, lower left
  for (let i = first; i < n; i++) {
    bgx.fillStyle = LOG[i].charAt(0) === '$' ? 'rgba(51,255,102,.55)' : 'rgba(95,175,115,.45)';
    bgx.fillText(LOG[i], 80, 862 + (i - first) * 26);
  }
  bgx.globalAlpha = 1;
}

const cache = new WeakMap();
export function title(sc, t, t0) {
  if (!sc.h1) return;
  let st = cache.get(sc.h1);
  if (!st) {
    const spans = [...sc.h1.querySelectorAll('.line > span')];
    const texts = spans.map((s, i) => (i === 0 ? '$ ' : '') + s.textContent);
    const cursor = document.createElement('span'); cursor.className = 'cursor';
    st = { spans, texts, cursor }; cache.set(sc.h1, st);
  }
  const typed = Math.max(0, Math.floor((t - t0 - .3) * 20));
  let left = typed, cursorAt = null;
  st.spans.forEach((s, i) => {
    const full = st.texts[i], show = full.slice(0, Math.max(0, Math.min(full.length, left)));
    s.textContent = show;
    if (left >= 0 && (left < full.length || i === st.spans.length - 1)) cursorAt = cursorAt ?? s;
    left -= full.length;
  });
  const typing = typed < st.texts.join('').length;
  if (cursorAt && (typing || Math.floor(t * 2.2) % 2 === 0)) cursorAt.append(st.cursor); else st.cursor.remove();
}
