// 15 Bauhaus: a geometric composition (circle, half circle, square, bars, dot grid) that rotates and slides.
let ctx, W, H;
const RED = '#E53935', BLUE = '#1E3A8A', YELLOW = '#FDD835', BLACK = '#111111';

export function init({ bg, W: w, H: h }) { W = w; H = h; ctx = bg.getContext('2d'); }

function circle(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function halfCircle(x, y, r, rot, c) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.restore(); }
function square(x, y, s, rot, c) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = c; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore(); }

export function frame(t, { k }) {
  ctx.clearRect(0, 0, W, H);
  const s = 1 - k;
  if (s > .005) {                                              // scenes: full composition around the speaker
    ctx.globalAlpha = s;
    circle(200, 860 + Math.sin(t * .6) * 14, 230, RED);
    halfCircle(1730, 130, 175, t * .35, BLUE);
    square(760 + Math.sin(t * .5) * 20, 150, 140, Math.PI / 4 + Math.sin(t * .4) * .25, YELLOW);
    ctx.fillStyle = BLACK; ctx.fillRect(-40 + (Math.sin(t * .7) * .5 + .5) * 60, 640, 470, 22);
    ctx.fillRect(1500, 930 - (Math.sin(t * .8) * .5 + .5) * 30, 360, 16);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) circle(1560 + i * 46, 700 + j * 46, 9 + 3 * Math.sin(t * 2 + i + j), BLACK);
    ctx.strokeStyle = BLACK; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(540, 470, 292, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, t / 1.6)); ctx.stroke();
  }
  if (k > .005) {                                              // main layout: shapes peek in from the edges
    ctx.globalAlpha = k;
    circle(0, 1080, 170, RED);
    square(1920, 0, 190, Math.PI / 4 + t * .15, YELLOW);
    halfCircle(1920, 1080, 120, Math.PI + t * .2, BLUE);
  }
  ctx.globalAlpha = 1;
}
