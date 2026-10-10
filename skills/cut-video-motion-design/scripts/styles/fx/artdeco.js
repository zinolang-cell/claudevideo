// 17 Art Deco: a gold sunburst fans out from below, stepped corner frames, and a shine sweeps the headline (--fx-shine).
let ctx, W, H, root;
const GOLD = '212,175,55';

export function init({ bg, W: w, H: h }) { W = w; H = h; ctx = bg.getContext('2d'); root = document.documentElement; }

function corners(a, inset, step) {
  ctx.strokeStyle = `rgba(${GOLD},${a})`; ctx.lineWidth = 1.5;
  for (const [x, y, dx, dy] of [[inset, inset, 1, 1], [W - inset, inset, -1, 1], [inset, H - inset, 1, -1], [W - inset, H - inset, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + dy * 120);
    for (let i = 0; i < 3; i++) { ctx.lineTo(x + dx * step * i, y + dy * (120 - step * (i + 1) * 1.6)); ctx.lineTo(x + dx * step * (i + 1), y + dy * (120 - step * (i + 1) * 1.6)); }
    ctx.lineTo(x + dx * 120, y); ctx.stroke();
  }
}

export function frame(t, { k }) {
  root.style.setProperty('--fx-shine', (10 + (t * 22) % 160).toFixed(1) + '%');
  ctx.clearRect(0, 0, W, H);
  const a = 1 - k;
  if (a > .005) {
    const cx = 960, cy = 1240, sway = Math.sin(t * .25) * .04;
    for (let i = 0; i < 40; i++) {
      const ang = Math.PI + (i + .5) / 40 * Math.PI + sway;
      ctx.fillStyle = `rgba(${GOLD},${(i % 2 ? .05 : .11) * a})`;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 1700, ang - Math.PI / 80, ang + Math.PI / 80); ctx.closePath(); ctx.fill();
    }
    ctx.lineWidth = 1.5;
    for (let r = 360; r < 1300; r += 150) { ctx.strokeStyle = `rgba(${GOLD},${.16 * a})`; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI); ctx.stroke(); }
    corners(.7 * a, 40, 18);
  }
  if (k > .005) corners(.35 * k, 24, 14);
}
