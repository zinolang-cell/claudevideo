// 11 Isometric: floating isometric blocks (top/left/right faces), bobbing; small accents in the main layout.
let ctx, W, H;
const BLOCKS = [
  { x: 150, y: 260, s: 70, h: 90, c: ['#7FB2FF', '#3A86FF', '#2563C9'], ph: 0 }, { x: 260, y: 900, s: 54, h: 54, c: ['#7FE3D8', '#2EC4B6', '#1E8F85'], ph: 1.3 },
  { x: 1780, y: 210, s: 48, h: 120, c: ['#FFA8A8', '#FF6B6B', '#D94848'], ph: 2.4 }, { x: 1700, y: 930, s: 64, h: 70, c: ['#7FB2FF', '#3A86FF', '#2563C9'], ph: 3.1 },
  { x: 820, y: 150, s: 36, h: 36, c: ['#FFE08A', '#FFC93C', '#D9A21E'], ph: 4.0 },
];

export function init({ bg, W: w, H: h }) { W = w; H = h; ctx = bg.getContext('2d'); }

function block(cx, cy, s, h, [top, left, right]) {
  const c = s * .866, poly = (pts, fill) => { ctx.fillStyle = fill; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
  poly([[cx - c, cy - h], [cx, cy - h + s / 2], [cx, cy + s / 2], [cx - c, cy]], left);
  poly([[cx + c, cy - h], [cx, cy - h + s / 2], [cx, cy + s / 2], [cx + c, cy]], right);
  poly([[cx, cy - h - s / 2], [cx + c, cy - h], [cx, cy - h + s / 2], [cx - c, cy - h]], top);
}

export function frame(t, { k }) {
  ctx.clearRect(0, 0, W, H);
  for (const b of BLOCKS) {
    const bob = Math.sin(t * 1.2 + b.ph) * 10;
    ctx.globalAlpha = (1 - k * .55) * .95;
    ctx.fillStyle = 'rgba(30,42,58,.10)';
    ctx.beginPath(); ctx.ellipse(b.x, b.y + b.s / 2 + 26, b.s * .95, b.s * .3, 0, 0, Math.PI * 2); ctx.fill();
    block(b.x, b.y + bob, b.s, b.h, b.c);
  }
  ctx.globalAlpha = 1;
}
