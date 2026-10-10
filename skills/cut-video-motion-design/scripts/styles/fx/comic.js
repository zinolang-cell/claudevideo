// 02 Comic: rotating sunburst (drives --fx-rot in comic.css) and a jagged "NEW!" burst in the scenes.
let ctx, W, H, root;

export function init({ bg, W: w, H: h }) { W = w; H = h; ctx = bg.getContext('2d'); root = document.documentElement; }

export function frame(t, { k }) {
  root.style.setProperty('--fx-rot', ((t * 5) % 360).toFixed(2) + 'deg');
  ctx.clearRect(0, 0, W, H);
  if (k > .98) return;
  const cx = 1660, cy = 175, R = 128 + Math.sin(t * 3) * 6, r = 84;
  ctx.save();
  ctx.globalAlpha = 1 - k;
  ctx.translate(cx, cy);
  ctx.rotate(-.12 + Math.sin(t * .8) * .06);
  ctx.beginPath();
  for (let i = 0; i < 28; i++) {
    const ang = i / 28 * Math.PI * 2, rad = i % 2 ? r : R * (.86 + .14 * Math.sin(i * 7.3));
    ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = '#111'; ctx.translate(8, 8); ctx.fill(); ctx.translate(-8, -8);
  ctx.fillStyle = '#FFE45C'; ctx.lineWidth = 6; ctx.strokeStyle = '#111'; ctx.fill(); ctx.stroke();
  ctx.font = '400 66px StyleDisplay, Impact, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.strokeText('NEW!', 0, 6);
  ctx.fillStyle = '#E63946'; ctx.fillText('NEW!', 0, 6);
  ctx.restore();
}
