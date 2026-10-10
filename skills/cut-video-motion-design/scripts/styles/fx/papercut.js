// 12 Paper Cut: layered paper hills with soft shadows sway in the scenes. Drawn at half resolution (shadows are costly).
let ctx, W, H, half, hx;
const LAYERS = [ // colour, base (0..1 of height), amplitude, frequency, speed, phase
  ['#A8393D', .60, 46, .0042, .22, 0], ['#C4553C', .67, 40, .0055, -.18, 1.3], ['#E07A47', .74, 36, .0047, .15, 2.6],
  ['#F2A35C', .81, 30, .0062, -.12, 3.7], ['#FBD9A0', .89, 24, .0071, .09, 4.9]];

export function init({ bg, W: w, H: h }) {
  W = w; H = h; ctx = bg.getContext('2d');
  half = document.createElement('canvas'); half.width = W / 2; half.height = H / 2; hx = half.getContext('2d');
}

export function frame(t, { k }) {
  ctx.clearRect(0, 0, W, H);
  if (k > .995) return;
  const w = W / 2, h = H / 2;
  hx.clearRect(0, 0, w, h);
  for (const [c, base, amp, f, sp, ph] of LAYERS) {
    hx.save();
    hx.shadowColor = 'rgba(60,15,10,.38)'; hx.shadowBlur = 14; hx.shadowOffsetY = -4;
    hx.fillStyle = c; hx.beginPath(); hx.moveTo(0, h);
    for (let x = 0; x <= w + 10; x += 10) {
      const X = x * 2;
      const y = (base * H + amp * Math.sin(X * f + ph + t * sp) + amp * .45 * Math.sin(X * f * 2.3 + ph * 1.7 - t * sp * 1.4)) / 2;
      hx.lineTo(x, y);
    }
    hx.lineTo(w, h); hx.closePath(); hx.fill(); hx.restore();
  }
  ctx.globalAlpha = 1 - k;
  ctx.imageSmoothingEnabled = true; ctx.drawImage(half, 0, 0, W, H);
  ctx.globalAlpha = 1;
}
