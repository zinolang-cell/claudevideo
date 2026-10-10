// 05 Glassmorphism: slow, soft colour light drifting behind the frosted glass (upscaled tiny canvas = smooth blur).
let ctx, W, H, small, sx;
const LIGHTS = [['#FF6FD8', .34, .20, .25, .07, 0], ['#3813C2', .40, .75, .30, .05, 2.1], ['#FFAF7B', .30, .65, .80, .06, 4.0],
  ['#6EE7F9', .22, .15, .80, .08, 5.2]];

export function init({ bg, W: w, H: h }) {
  W = w; H = h; ctx = bg.getContext('2d');
  small = document.createElement('canvas'); small.width = 160; small.height = 90; sx = small.getContext('2d');
}

export function frame(t) {
  sx.clearRect(0, 0, 160, 90);
  for (const [c, r, x0, y0, sp, ph] of LIGHTS) {
    const x = (x0 + .2 * Math.sin(t * sp * 2 + ph)) * 160, y = (y0 + .15 * Math.cos(t * sp * 2.6 + ph)) * 90, rr = r * 160;
    const g = sx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, c + 'CC'); g.addColorStop(1, c + '00');
    sx.fillStyle = g; sx.fillRect(0, 0, 160, 90);
  }
  ctx.clearRect(0, 0, W, H);
  ctx.globalAlpha = .85;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, W, H);
  ctx.globalAlpha = 1;
}
