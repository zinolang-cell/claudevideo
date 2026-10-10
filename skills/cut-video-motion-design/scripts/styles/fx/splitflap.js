// 08 Split-Flap: every headline letter sits on its own flap tile and flips through the alphabet before it lands.
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const NBSP = ' ';
const cache = new WeakMap();

export function init() {}
export function frame() {}

export function title(sc, t, t0) {
  if (!sc.h1) return;
  let flaps = cache.get(sc.h1);
  if (!flaps) {
    flaps = [];
    sc.h1.querySelectorAll('.line > span').forEach((span, li) => {
      const txt = span.textContent.toUpperCase(); span.textContent = '';
      [...txt].forEach((c, ci) => {
        const e = document.createElement('span');
        e.className = 'flap' + (c === ' ' ? ' sp' : '');
        e.textContent = c === ' ' ? NBSP : c;
        span.append(e); flaps.push({ e, c, li, ci });
      });
    });
    cache.set(sc.h1, flaps);
  }
  const step = Math.floor((t - t0) * 24);                      // 24 flips per second
  for (const f of flaps) {
    if (f.c === ' ') continue;
    const land = t0 + .35 + f.li * .3 + f.ci * .045;
    if (t >= land) { f.e.textContent = f.c; continue; }
    if (t < t0 + .2) { f.e.textContent = NBSP; continue; }
    f.e.textContent = CHARS[(f.li * 131 + f.ci * 17 + step * 7) % CHARS.length];
  }
}
