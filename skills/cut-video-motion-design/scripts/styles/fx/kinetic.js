// 06 Kinetic Type: giant outline type scrolls behind everything; headline words slam in one by one.
let ctx, W, H, EBACK, clamp, prog;

export function init({ bg, W: w, H: h, helpers }) { W = w; H = h; ctx = bg.getContext('2d'); ({ EBACK, clamp, prog } = helpers); }

export function frame(t, { k, chapter }) {
  ctx.clearRect(0, 0, W, H);
  const word = ((chapter && chapter.title) || 'Motion').toUpperCase() + '  /  ';
  ctx.font = '400 360px StyleDisplay, Impact, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 3;
  ctx.strokeStyle = k < .5 ? `rgba(255,255,255,${.13 * (1 - k)})` : `rgba(10,10,10,${.08 * k})`;
  const wd = ctx.measureText(word).width, off = (t * 90) % wd;
  for (let row = 0; row < 3; row++) {
    const y = 380 + row * 345, x0 = row % 2 ? -off : off - wd;
    for (let x = x0 - wd; x < W + wd; x += wd) ctx.strokeText(word, x, y);
  }
}

const cache = new WeakMap();
export function title(sc, t, t0) {
  if (!sc.h1) return;
  let words = cache.get(sc.h1);
  if (!words) {
    words = [];
    sc.h1.querySelectorAll('.line > span').forEach(span => {
      const txt = span.textContent; span.textContent = '';
      txt.split(' ').filter(Boolean).forEach(w => { const e = document.createElement('span'); e.className = 'w'; e.textContent = w; span.append(e); words.push(e); });
    });
    cache.set(sc.h1, words);
  }
  words.forEach((w, i) => {
    const p = EBACK(prog(t, t0 + .3 + i * .12, .45));
    w.style.transform = `scale(${2.6 - 1.6 * p})`;
    w.style.opacity = clamp(p * 2.5);
  });
}
