// 01 ASCII Art: a plasma field rendered as ASCII glyphs. Pure function of t (frames render out of order in parallel).
// API (all optional): init({ bg, top, W, H, S, helpers }), frame(t, { k, bk, ko, intro, chapter }), title(scene, t, t0)
// k = 0 in intro/outro scenes, 1 in the main layout (screen card on screen).
let ctx, W, H;
const CW = 14, CH = 24, RAMP = ' .,:;-=+*#%@';

export function init({ bg, W: w, H: h }) { W = w; H = h; ctx = bg.getContext('2d'); }

export function frame(t, { k }) {
  ctx.clearRect(0, 0, W, H);
  const strength = 1 - k * 0.72;                       // full in scenes, faint behind the screen card
  ctx.font = '500 20px StyleMono, ui-monospace, monospace';
  ctx.textBaseline = 'top';
  const cols = Math.ceil(W / CW), rows = Math.ceil(H / CH);
  const buckets = Array.from({ length: RAMP.length }, () => []);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const u = x / cols, v = y / rows;
    const p = Math.sin(u * 6.5 + t * .8) + Math.sin(v * 4.2 - t * .6) + Math.sin((u * .8 + v) * 5.5 + t * .45)
      + Math.sin(Math.hypot(u - .72, v - .38) * 13 - t * 1.4);
    const n = Math.max(0, Math.min(.999, (p + 4) / 8));
    const i = Math.floor(n * n * RAMP.length);
    if (i > 0) buckets[i].push(x * CW, y * CH);
  }
  buckets.forEach((pts, i) => {
    if (!pts.length) return;
    const g = Math.round(70 + 185 * i / (RAMP.length - 1));
    ctx.fillStyle = `rgba(${g},${g},${g},${(.25 + .75 * i / RAMP.length) * strength})`;
    for (let j = 0; j < pts.length; j += 2) ctx.fillText(RAMP[i], pts[j], pts[j + 1]);
  });
}
