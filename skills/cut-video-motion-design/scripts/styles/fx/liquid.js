// 04 Liquid Morph: vivid gradient blobs that flow and merge. Drawn on a tiny canvas and upscaled (a cheap, smooth blur).
let ctx, W, H, small, sx;
//            colour     radius x0   y0   speed phase
const BLOBS = [['#7B2FF7', .30, .28, .30, .21, 0], ['#F107A3', .30, .70, .38, .17, 1.7], ['#FF7A00', .24, .60, .74, .13, 3.1],
  ['#00D4FF', .22, .18, .76, .19, 4.4], ['#B517FF', .26, .88, .18, .15, 5.6]];

export function init({ bg, W: w, H: h }) {
  W = w; H = h; ctx = bg.getContext('2d');
  small = document.createElement('canvas'); small.width = 192; small.height = 108; sx = small.getContext('2d');
}

export function frame(t, { k }) {
  sx.clearRect(0, 0, 192, 108);
  sx.globalCompositeOperation = k < .5 ? 'lighter' : 'source-over';
  for (const [c, r, x0, y0, sp, ph] of BLOBS) {
    const x = (x0 + .18 * Math.sin(t * sp + ph) + .07 * Math.sin(t * sp * 2.3 + ph * 2)) * 192;
    const y = (y0 + .16 * Math.cos(t * sp * 1.3 + ph)) * 108;
    const rr = r * 192 * (1 + .12 * Math.sin(t * .9 + ph));
    const g = sx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, c); g.addColorStop(.55, c + '99'); g.addColorStop(1, c + '00');
    sx.fillStyle = g; sx.beginPath(); sx.arc(x, y, rr, 0, Math.PI * 2); sx.fill();
  }
  ctx.clearRect(0, 0, W, H);
  ctx.globalAlpha = 1 - k * .62;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, W, H);
  ctx.globalAlpha = 1;
}
