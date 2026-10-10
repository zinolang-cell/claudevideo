// 19 Neo-Brutalism: chunky stickers (star, flower, circle, zig-zag) with thick outlines and hard shadows spin and bounce.
let ctx, W, H;
const SCENE = [{ s: 'star', x: 150, y: 175, r: 92, c: '#FFE600', ph: 0 }, { s: 'flower', x: 1770, y: 165, r: 74, c: '#FFFFFF', ph: 1.1 },
  { s: 'circle', x: 1690, y: 880, r: 78, c: '#2BD67B', ph: 2.3 }, { s: 'zig', x: 120, y: 905, r: 90, c: '#4D7CFE', ph: 3.2 }];
const MAIN = [{ s: 'star', x: 100, y: 540, r: 54, c: '#FFE600', ph: .5 }, { s: 'circle', x: 1822, y: 300, r: 42, c: '#FF6BCB', ph: 1.9 }];

export function init({ bg, W: w, H: h }) { W = w; H = h; ctx = bg.getContext('2d'); }

function path(s, r) {
  ctx.beginPath();
  if (s === 'star') for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * .45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  else if (s === 'flower') for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2, rr = r * (.72 + .28 * Math.cos(a * 6)); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  else if (s === 'zig') { ctx.moveTo(-r, -r * .2); for (let i = 0; i <= 6; i++) ctx.lineTo(-r + i * r / 3, i % 2 ? r * .2 : -r * .2); ctx.lineTo(r, r * .25); for (let i = 6; i >= 0; i--) ctx.lineTo(-r + i * r / 3, (i % 2 ? r * .2 : -r * .2) + r * .45); }
  else ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.closePath();
}

function sticker(st, t, a) {
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(st.x, st.y - Math.abs(Math.sin(t * 2 + st.ph)) * 14); ctx.rotate(t * .5 + st.ph);
  ctx.save(); ctx.translate(8, 8); path(st.s, st.r); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  path(st.s, st.r); ctx.fillStyle = st.c; ctx.fill(); ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = '#000'; ctx.stroke();
  if (st.s === 'circle') { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-st.r * .3, -st.r * .15, st.r * .1, 0, 7); ctx.arc(st.r * .3, -st.r * .15, st.r * .1, 0, 7); ctx.fill(); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, st.r * .05, st.r * .42, .25, Math.PI - .25); ctx.stroke(); }
  ctx.restore();
}

export function frame(t, { k }) {
  ctx.clearRect(0, 0, W, H);
  if (k < .995) SCENE.forEach(s => sticker(s, t, 1 - k));
  if (k > .005) MAIN.forEach(s => sticker(s, t, k));
}
