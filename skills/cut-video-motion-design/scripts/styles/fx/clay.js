// 09 Clay 3D: soft clay spheres and pills float and bob; shaded with a top-left light.
let ctx, W, H;
const SHAPES = [
  { kind: 'ball', x: 150, y: 190, r: 72, c: '#FFB5A7', ph: 0 }, { kind: 'ball', x: 1770, y: 150, r: 48, c: '#B8F2E6', ph: 1.2 },
  { kind: 'pill', x: 1600, y: 905, r: 46, len: 150, c: '#CDB4DB', ph: 2.1 }, { kind: 'ball', x: 860, y: 140, r: 34, c: '#FFD86B', ph: 3 },
  { kind: 'ball', x: 95, y: 900, r: 58, c: '#A0E7E5', ph: 4.2 }, { kind: 'pill', x: 1240, y: 120, r: 26, len: 90, c: '#FF9F7F', ph: 5 },
];
const mix = (hex, to, p) => { const n = parseInt(hex.slice(1), 16), a = [n >> 16, n >> 8 & 255, n & 255], b = to === 'w' ? [255, 255, 255] : [60, 35, 30]; return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * p)).join(',')})`; };

export function init({ bg, W: w, H: h }) { W = w; H = h; ctx = bg.getContext('2d'); }

function shade(x, y, r, c) {
  const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r * 1.05);
  g.addColorStop(0, mix(c, 'w', .55)); g.addColorStop(.55, c); g.addColorStop(1, mix(c, 'k', .28));
  return g;
}

export function frame(t, { k }) {
  ctx.clearRect(0, 0, W, H);
  const a = 1 - k * .5;
  for (const s of SHAPES) {
    const y = s.y + Math.sin(t * 1.1 + s.ph) * 12, x = s.x + Math.cos(t * .7 + s.ph) * 6;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(120,80,60,.16)';                    // contact shadow
    ctx.beginPath(); ctx.ellipse(x + 10, y + s.r + 18, s.r * .9, s.r * .22, 0, 0, Math.PI * 2); ctx.fill();
    if (s.kind === 'ball') {
      ctx.fillStyle = shade(x, y, s.r, s.c); ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.save(); ctx.translate(x, y); ctx.rotate(-.5 + Math.sin(t * .6 + s.ph) * .15);
      const g = ctx.createLinearGradient(0, -s.r, 0, s.r);
      g.addColorStop(0, mix(s.c, 'w', .5)); g.addColorStop(.5, s.c); g.addColorStop(1, mix(s.c, 'k', .3));
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-s.len / 2, -s.r, s.len, s.r * 2, s.r); ctx.fill();
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}
