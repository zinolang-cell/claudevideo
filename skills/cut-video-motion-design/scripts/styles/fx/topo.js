// 14 Topo Lines: contour lines of a slowly evolving height field (value noise + marching squares). Pure function of t.
let ctx, W, H;
const CELL = 24;
const P = new Uint8Array(512);
{ let s = 1337; for (let i = 0; i < 256; i++) P[i] = i; for (let i = 255; i > 0; i--) { s = (s * 1103515245 + 12345) & 0x7fffffff; const j = s % (i + 1); [P[i], P[j]] = [P[j], P[i]]; } for (let i = 0; i < 256; i++) P[i + 256] = P[i]; }
const fade = x => x * x * (3 - 2 * x);
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
  const v = (a, b) => P[P[a] + b] / 255;
  const u = fade(xf), w = fade(yf);
  const a = v(X, Y) + (v(X + 1, Y) - v(X, Y)) * u, b = v(X, Y + 1) + (v(X + 1, Y + 1) - v(X, Y + 1)) * u;
  return a + (b - a) * w;
}
const fbm = (x, y) => vnoise(x, y) * .6 + vnoise(x * 2.1 + 5.2, y * 2.1 + 1.3) * .28 + vnoise(x * 4.3 + 9.7, y * 4.3 + 3.1) * .12;

export function init({ bg, W: w, H: h }) { W = w; H = h; ctx = bg.getContext('2d'); }

export function frame(t, { k }) {
  ctx.clearRect(0, 0, W, H);
  const nx = Math.ceil(W / CELL) + 1, ny = Math.ceil(H / CELL) + 1, f = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) f[j * nx + i] = fbm(i * .085 + t * .025, j * .085 - t * .018);
  const levels = []; for (let L = .2; L < .82; L += .035) levels.push(L);
  levels.forEach((L, li) => {
    ctx.beginPath();
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = f[j * nx + i], b = f[j * nx + i + 1], c = f[(j + 1) * nx + i + 1], d = f[(j + 1) * nx + i];
      const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const x = i * CELL, y = j * CELL, lerp = (p, q) => (L - p) / (q - p);
      const top = [x + CELL * lerp(a, b), y], right = [x + CELL, y + CELL * lerp(b, c)], bottom = [x + CELL * lerp(d, c), y + CELL], left = [x, y + CELL * lerp(a, d)];
      const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
      switch (idx) {
        case 1: case 14: seg(left, bottom); break;
        case 2: case 13: seg(bottom, right); break;
        case 3: case 12: seg(left, right); break;
        case 4: case 11: seg(top, right); break;
        case 6: case 9: seg(top, bottom); break;
        case 7: case 8: seg(left, top); break;
        case 5: seg(left, top); seg(bottom, right); break;
        case 10: seg(top, right); seg(left, bottom); break;
      }
    }
    const major = li % 4 === 0;
    if (k < .999) { ctx.lineWidth = major ? 1.6 : 1; ctx.strokeStyle = major ? `rgba(184,245,106,${.75 * (1 - k)})` : `rgba(59,163,122,${.42 * (1 - k)})`; ctx.stroke(); }
    if (k > .001) { ctx.lineWidth = major ? 1.4 : 1; ctx.strokeStyle = `rgba(120,108,80,${(major ? .42 : .24) * k})`; ctx.stroke(); }
  });
}
