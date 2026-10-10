// 10 Halftone: cyan and magenta halftone dot waves pulse across the scenes (the main layout keeps the static CSS dots).
let ctx, W, H;

export function init({ bg, W: w, H: h }) { W = w; H = h; ctx = bg.getContext('2d'); }

function layer(t, cx, cy, color, phase, G) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let y = G / 2; y < H; y += G) for (let x = G / 2; x < W; x += G) {
    const d = Math.hypot(x - cx, y - cy);
    const s = (Math.sin(d * .02 - t * 2.2 + phase) * .5 + .5) * Math.max(0, 1 - d / 1300);
    const r = s * G * .5;
    if (r < .7) continue;
    ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
}

export function frame(t, { k }) {
  ctx.clearRect(0, 0, W, H);
  if (k > .995) return;
  ctx.globalAlpha = 1 - k;
  layer(t, 1560, 260, 'rgba(0,174,239,.55)', 0, 18);
  layer(t, 260, 960, 'rgba(236,0,140,.45)', 1.6, 18);
  ctx.globalAlpha = 1;
}
