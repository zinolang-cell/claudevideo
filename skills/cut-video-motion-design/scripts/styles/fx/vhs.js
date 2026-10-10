// 13 Retro VHS (overlay canvas): scanlines, tape noise, a rolling tracking band, and a VCR on-screen display in the scenes.
let ctx, W, H, scan;
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

export function init({ top, W: w, H: h }) {
  W = w; H = h; ctx = top.getContext('2d');
  const p = document.createElement('canvas'); p.width = 4; p.height = 3;
  const px = p.getContext('2d'); px.fillStyle = 'rgba(0,0,0,.9)'; px.fillRect(0, 2, 4, 1);
  scan = ctx.createPattern(p, 'repeat');
}

function osd(text, x, y, align) {
  ctx.textAlign = align;
  ctx.fillStyle = 'rgba(255,45,111,.75)'; ctx.fillText(text, x + 3, y);
  ctx.fillStyle = 'rgba(0,229,255,.75)'; ctx.fillText(text, x - 3, y);
  ctx.fillStyle = '#F4EFFF'; ctx.fillText(text, x, y);
}

export function frame(t, { k }) {
  ctx.clearRect(0, 0, W, H);
  ctx.globalAlpha = .24 - .12 * k; ctx.fillStyle = scan; ctx.fillRect(0, 0, W, H);
  const r = rng(Math.floor(t * 30) * 9973 + 1);
  ctx.globalAlpha = .5 - .32 * k; ctx.fillStyle = '#FFF';
  for (let i = 0; i < 380; i++) ctx.fillRect(r() * W, r() * H, 1 + r() * 3, 1);
  const cyc = t % 6;
  if (cyc < 1.3) {                                           // tracking band rolls down every 6 s
    const y = cyc / 1.3 * (H + 140) - 70;
    ctx.globalAlpha = .16 - .08 * k; ctx.fillRect(0, y, W, 30);
    ctx.globalAlpha = .45 - .2 * k;
    for (let i = 0; i < 60; i++) ctx.fillRect(r() * W, y + r() * 30, 20 + r() * 160, 1);
  }
  if (k < .99) {
    ctx.globalAlpha = 1 - k;
    ctx.font = '400 56px StyleVCR, monospace'; ctx.textBaseline = 'top';
    osd('PLAY' + (Math.floor(t * 1.6) % 2 ? ' ▶' : '  '), 1830, 52, 'right');
    const s = Math.floor(t), tc = `SP  00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    osd(tc, 1830, 970, 'right');
  }
  ctx.globalAlpha = 1;
}
