// 16 Blueprint: a technical drawing draws itself around the speaker (circle, crosshair, dimension lines, labels);
// registration marks frame the screen card in the main layout.
let ctx, W, H, S, clamp;

export function init({ bg, W: w, H: h, S: score, helpers }) { W = w; H = h; ctx = bg.getContext('2d'); S = score || {}; clamp = helpers.clamp; }

function dim(x1, y1, x2, y2, label, p) {
  const x = x1 + (x2 - x1) * p, y = y1 + (y2 - y1) * p;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke();
  const tick = (tx, ty) => { ctx.beginPath(); ctx.moveTo(tx, ty - 12); ctx.lineTo(tx, ty + 12); ctx.stroke(); };
  tick(x1, y1); if (p > .98) tick(x2, y2);
  if (p > .6) { ctx.globalAlpha *= clamp((p - .6) / .4); ctx.fillText(label, (x1 + x2) / 2, y1 - 26); }
}

export function frame(t, { k }) {
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = '#FFFFFF'; ctx.fillStyle = '#FFFFFF'; ctx.font = '500 18px StyleMono, monospace'; ctx.textAlign = 'center';
  const local = t >= (S.outroStart ?? 1e9) ? t - S.outroStart : t;
  if (k < .995) {
    const a = 1 - k, p = clamp((local - .2) / 1.4);
    ctx.globalAlpha = a * .9; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(540, 470, 292, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
    ctx.setLineDash([10, 8]); ctx.globalAlpha = a * .55;
    ctx.beginPath(); ctx.moveTo(540 - 360 * p, 470); ctx.lineTo(540 + 360 * p, 470); ctx.moveTo(540, 470 - 360 * p); ctx.lineTo(540, 470 + 360 * p); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = a * .9;
    dim(248, 830, 832, 830, 'Ø 584', clamp((local - .9) / .9));
    ctx.globalAlpha = a * .9;
    dim(900, 720, 1780, 720, 'TITLE  1 : 1', clamp((local - 1.3) / .9));
    ctx.globalAlpha = a * .5; ctx.textAlign = 'left';
    ctx.fillText('SHEET 01 / REV A', 80, 1030);
  }
  if (k > .005) {
    ctx.globalAlpha = k * .7; ctx.lineWidth = 1.5;
    const L = S.layout?.plate || { x: 200, y: 60, w: 1520, h: 897 }, m = 18, len = 34;
    for (const [x, y, dx, dy] of [[L.x - m, L.y - m, 1, 1], [L.x + L.w + m, L.y - m, -1, 1], [L.x - m, L.y + L.h + m, 1, -1], [L.x + L.w + m, L.y + L.h + m, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, y + dy * len); ctx.lineTo(x, y); ctx.lineTo(x + dx * len, y); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
