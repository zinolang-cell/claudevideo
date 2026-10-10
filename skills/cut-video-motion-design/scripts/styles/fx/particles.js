// 20 Particles: ~2200 glowing particles orbit in a galaxy swirl (pure function of t): around the speaker in the
// scenes, around the screen card in the main layout.
let ctx, W, H, S;
const N = 2200, PTS = [];
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const COLORS = ['rgba(238,242,255,', 'rgba(245,230,200,', 'rgba(138,180,255,'];

export function init({ bg, W: w, H: h, S: score }) {
  W = w; H = h; S = score || {}; ctx = bg.getContext('2d');
  const r = rng(42);
  for (let i = 0; i < N; i++) {
    const rad = 120 + 1000 * Math.pow(r(), 1.7);
    const arm = Math.floor(r() * 3), spread = (r() - .5) * (r() < .8 ? .55 : 2.4);       // most dots hug an arm
    PTS.push({ rad, th: arm * 2.094 + spread, w: 1.1 / Math.sqrt(rad / 120), size: 1.1 + r() * 2.6 * (1 - rad / 1500), c: r() < .7 ? 0 : r() < .5 ? 1 : 2, ph: r() * 6.28, al: .35 + r() * .65, arm });
  }
}

export function frame(t, { k }) {
  ctx.clearRect(0, 0, W, H);
  const cam = S.layout?.camIntro || { cx: 540, cy: 470 };
  const cx = cam.cx + (960 - cam.cx) * k, cy = cam.cy + (540 - cam.cy) * k, a = 1 - k * .5;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 520);
  glow.addColorStop(0, `rgba(138,180,255,${.16 * a})`); glow.addColorStop(1, 'rgba(138,180,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  for (let c = 0; c < 3; c++) {
    for (const p of PTS) {
      if (p.c !== c) continue;
      const phi = p.th + p.w * t * .3 + p.rad * .0042;                                   // logarithmic-looking twist
      const x = cx + Math.cos(phi) * p.rad, y = cy + Math.sin(phi) * p.rad * .55 + Math.sin(t * .7 + p.ph) * 6;
      if (x < -5 || y < -5 || x > W + 5 || y > H + 5) continue;
      const tw = .65 + .35 * Math.sin(t * 2 + p.ph);
      ctx.fillStyle = COLORS[c] + Math.min(1, p.al * tw * a * 1.25).toFixed(3) + ')';
      ctx.fillRect(x, y, p.size, p.size);
    }
  }
}
