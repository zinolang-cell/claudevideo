// 03 Pixel Art: twinkling pixel stars everywhere and a scrolling pixel skyline in the scenes.
let ctx, W, H;
const P = 8, PAL = ['#FFF1E8', '#FFEC27', '#29ADFF', '#FF77A8'];
const stars = [], blds = [];
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

export function init({ bg, W: w, H: h }) {
  W = w; H = h; ctx = bg.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const r = rng(7);
  for (let i = 0; i < 150; i++) stars.push({ x: Math.floor(r() * W / P) * P, y: Math.floor(r() * H * .72 / P) * P, ph: r() * 6.28, sp: .6 + r() * 1.8, c: PAL[Math.floor(r() * PAL.length)], big: r() < .15 });
  let x = 0;
  while (x < W * 2 + 400) { const bw = (6 + Math.floor(r() * 10)) * P, bh = (8 + Math.floor(r() * 22)) * P; blds.push({ x, w: bw, h: bh, seed: Math.floor(r() * 1e6) }); x += bw + Math.floor(r() * 3) * P; }
}

export function frame(t, { k }) {
  ctx.clearRect(0, 0, W, H);
  const a = 1 - k * .6;
  for (const s of stars) {
    const tw = .5 + .5 * Math.sin(t * s.sp * 2 + s.ph);
    if (tw < .25) continue;
    ctx.globalAlpha = a * tw; ctx.fillStyle = s.c;
    ctx.fillRect(s.x, s.y, P, P);
    if (s.big && tw > .75) { ctx.fillRect(s.x - P, s.y, P, P); ctx.fillRect(s.x + P, s.y, P, P); ctx.fillRect(s.x, s.y - P, P, P); ctx.fillRect(s.x, s.y + P, P, P); }
  }
  if (k < .99) {
    ctx.globalAlpha = 1 - k;
    const total = blds.at(-1).x + blds.at(-1).w, off = Math.floor(t * 24 / P) * P;
    for (const b of blds) {
      const x = ((b.x - off) % total + total) % total - 200;
      if (x > W || x + b.w < 0) continue;
      const y = H - b.h;
      ctx.fillStyle = '#0B0F2A'; ctx.fillRect(x, y, b.w, b.h);
      ctx.fillStyle = '#1D2B53'; ctx.fillRect(x, y, b.w, P);
      const r = rng(b.seed);
      for (let wy = y + P * 2; wy < H - P * 2; wy += P * 3) for (let wx = x + P; wx < x + b.w - P; wx += P * 2) {
        if (r() < .42) { ctx.fillStyle = r() < .8 ? '#FFEC27' : '#FFA300'; ctx.fillRect(wx, wy, P, P); }
      }
    }
  }
  ctx.globalAlpha = 1;
}
