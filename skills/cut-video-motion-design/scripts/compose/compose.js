// Deterministic compositor: window.renderFrame(t) puts the whole stage into its state at output time t (seconds).
// Nothing animates on its own (no CSS transitions/animations); every value is a pure function of t, so any frame
// can be rendered in any order by any worker. Input: /build/score.json (built by render.mjs).
const S = await (await fetch('/build/score.json', { cache: 'no-store' })).json();
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icon = n => S.icons[n] || '';
const logo = n => S.logos[n] ? `<img src="${S.logos[n]}" alt="">` : '';
const logoD = n => S.logosDark[n] ? `<img src="${S.logosDark[n]}" alt="">` : '';

// ---- timing helpers --------------------------------------------------------------------------------------
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t;
  return x => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, t = x; for (let i = 0; i < 40; i++) { const v = sx(t); if (Math.abs(v - x) < 1e-7) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; } return sy(t); };
}
const CSSV = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const bez = (v, d) => { const m = /cubic-bezier(([^)]+))/.exec(v || ''); const a = m ? m[1].split(',').map(Number) : d; return bezier(...a); };
const EO = bez(CSSV('--ease-out'), [.16, 1, .3, 1]), EIO = bez(CSSV('--ease-in-out'), [.65, 0, .35, 1]), EBACK = bezier(.34, 1.4, .64, 1);
const rgbOf = v => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = '#000'; c.fillStyle = v || '#000'; const h = c.fillStyle;
  if (h[0] === '#') return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); return h.match(/[d.]+/g).slice(0, 3).map(Number); };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const prog = (t, t0, d) => d <= 0 ? (t >= t0 ? 1 : 0) : clamp((t - t0) / d);
const lerp = (a, b, p) => a + (b - a) * p;
const io = (t, t0, t1, din = .6, dout = .35) => ({ on: t >= t0 && t < t1, i: EO(prog(t, t0, din)), o: EIO(prog(t, t1 - dout, dout)) });
const show = (e, v) => { e.style.visibility = v ? 'visible' : 'hidden'; };
const mixRGB = (a, b, p) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], p))).join(',')})`;

// intro/outro are optional: without them the main layout runs from the first to the last frame
if (!S.intro) S.introEnd = -10;
if (!S.outro) S.outroStart = 1e9;
if (!S.layout.camIntro) S.layout.camIntro = S.layout.camMain;
if (!S.layout.camOutro) S.layout.camOutro = S.layout.camMain;
const W = S.W, H = S.H, L = S.layout, PL = L.plate;

// ---- static DOM ------------------------------------------------------------------------------------------------
const stage = $('#stage');
const bgDark = $('#bg-dark'), heroImg = $('#bg-dark img'), bgLight = $('#bg-light');
const brandImg = S.brandLogoWhite ? `<img src="${S.brandLogoWhite}" alt="">` : '';
if (S.hero) heroImg.src = S.hero; else heroImg.remove();
const plate = $('#plate'), camSpace = $('#cam-space'), plateDim = $('#plate-dim'), plateFx = $('#plate-fx');
Object.assign(plate.style, { left: PL.x + 'px', top: PL.y + 'px', width: PL.w + 'px', height: PL.h + 'px' });
Object.assign(plateFx.style, { left: PL.x + 'px', top: PL.y + 'px', width: PL.w + 'px', height: PL.h + 'px' });
const scr = $('#scr'); scr.width = S.screen.w; scr.height = S.screen.h;
const sctx = scr.getContext('2d', { willReadFrequently: true });
const camBox = $('#cam'), camCv = $('#camcv');
if (S.cam) { camCv.width = S.cam.side; camCv.height = S.cam.side; } else camBox.style.display = 'none';
const cctx = camCv.getContext('2d');

// ---- frame sources (pre-extracted JPEG sequences, 30 fps, in output order) ------------------------------------
const imgCache = new Map();
function loadImg(url) {
  let p = imgCache.get(url);
  if (!p) { const im = new Image(); im.src = url; p = im.decode().then(() => im, () => im); imgCache.set(url, p); if (imgCache.size > 48) imgCache.delete(imgCache.keys().next().value); }
  return p;
}
const fr = (base, i, n) => `${base}${String(clamp(i, 0, n - 1) + 1).padStart(5, '0')}.jpg`;
const srcIndex = t => { const h = S.holds.find(h => t >= h.o0 && t < h.o1); return h ? h.frame : Math.floor(t * S.screen.fps + 1e-6); };
function cutAt(t, d) { for (const c of S.cuts) if (t >= c && t < c + d) return c; return null; }

async function drawSources(t) {
  const n = S.screen.n, i = srcIndex(t);
  const [a, c] = await Promise.all([loadImg(fr(S.screen.base, i, n)), S.cam ? loadImg(fr(S.cam.base, i, n)) : null]);
  sctx.globalAlpha = 1; sctx.drawImage(a, 0, 0);
  if (c) { cctx.globalAlpha = 1; cctx.drawImage(c, 0, 0); }
  const cut = cutAt(t, S.dissolve);                          // micro-dissolve over jump cuts
  if (cut != null && !S.holds.some(h => t >= h.o0 && t < h.o1)) {
    const k = Math.round(cut * S.screen.fps) - 1, alpha = 1 - EIO(prog(t, cut, S.dissolve));
    const [pa, pc] = await Promise.all([loadImg(fr(S.screen.base, k, n)), S.cam ? loadImg(fr(S.cam.base, k, n)) : null]);
    sctx.globalAlpha = alpha; sctx.drawImage(pa, 0, 0); if (pc) { cctx.globalAlpha = alpha; cctx.drawImage(pc, 0, 0); } sctx.globalAlpha = cctx.globalAlpha = 1;
  }
  // paint out the webcam bubble burned into the recording: median of samples around it
  if (!S.paint) { for (let k = 1; k <= 4; k++) loadImg(fr(S.screen.base, i + k, n)); return; }
  const P = S.paint, pts = [[P.cx - P.r - 10, P.cy - 70], [P.cx - P.r - 10, P.cy], [P.cx - P.r - 10, P.cy + 60], [P.cx - 70, P.cy - P.r - 8], [P.cx, P.cy - P.r - 8], [P.cx + 70, P.cy - P.r - 8]];
  const cols = pts.map(([x, y]) => sctx.getImageData(Math.round(x), Math.round(y), 1, 1).data).map(d => [d[0], d[1], d[2]]).sort((p, q) => (p[0] + p[1] + p[2]) - (q[0] + q[1] + q[2]));
  const m = cols[Math.floor(cols.length / 2)];
  sctx.fillStyle = `rgb(${m[0]},${m[1]},${m[2]})`; sctx.beginPath(); sctx.arc(P.cx, P.cy, P.r, 0, Math.PI * 2); sctx.fill();
  for (let k = 1; k <= 4; k++) { loadImg(fr(S.screen.base, i + k, n)); if (S.cam) loadImg(fr(S.cam.base, i + k, n)); }
}

// ---- layout phase: 0 = dark scene (intro/outro), 1 = main layout ------------------------------------------------
const mainK = t => EIO(prog(t, S.introEnd - .25, 1.1)) * (1 - EIO(prog(t, S.outroStart, 1.0)));
const outroK = t => EIO(prog(t, S.outroStart, 1.0));
const brollK = t => Math.max(0, ...[...S.broll, ...S.callouts.filter(c => c.focus)].map(b => { const e = io(t, b.t0, b.t1, .8, .6); return e.on ? e.i * (1 - e.o) : 0; }));

// ---- camera (zoom/pan inside the screen card) -------------------------------------------------------------------
const FULL = { cx: S.screen.w / 2, cy: S.screen.h / 2, w: S.screen.w };
const ASPECT = S.screen.h / S.screen.w;
function cameraAt(t) {
  let prev = FULL, cur = FULL, p = 1;
  for (const k of S.camera) { if (k.t > t) break; prev = cur; cur = k.rect; p = EIO(prog(t, k.t, k.dur)); }
  const w = Math.exp(lerp(Math.log(prev.w), Math.log(cur.w), p));
  let cx = lerp(prev.cx, cur.cx, p), cy = lerp(prev.cy, cur.cy, p);
  const h = w * ASPECT;
  cx = clamp(cx, w / 2, S.screen.w - w / 2); cy = clamp(cy, h / 2, S.screen.h - h / 2);
  return { cx, cy, w, s: PL.w / w };
}
const camToPlate = (c, r) => ({ x: (r.x - (c.cx - c.w / 2)) * c.s, y: (r.y - (c.cy - c.w * ASPECT / 2)) * c.s, w: r.w * c.s, h: r.h * c.s });

// ---- spotlight / highlight rings (drawn in plate space so stroke width stays constant while zooming) ---------------
const spots = S.spots.map(sp => {
  const root = el('div', 'spot'); const ring = el('div', 'ring'); root.append(ring);
  if (sp.label) root.append(el('div', 'label', esc(sp.label)));
  plateFx.append(root); return { sp, root, ring };
});
function renderSpots(t, cam) {
  let dim = 0;
  for (const { sp, root, ring } of spots) {
    const e = io(t, sp.t0, sp.t1, .5, .35);
    if (!e.on) { show(root, false); continue; }
    const k = e.i * (1 - e.o), pad = sp.pad ?? 10, r = camToPlate(cam, { x: sp.rect.x - pad, y: sp.rect.y - pad, w: sp.rect.w + pad * 2, h: sp.rect.h + pad * 2 });
    show(root, true);
    Object.assign(root.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', opacity: k,
      boxShadow: `0 0 0 9999px rgba(11,16,24,${(sp.dim ?? .5) * k})` });
    ring.style.transform = `scale(${lerp(1.06, 1, e.i)})`;
    dim = Math.max(dim, k);
  }
  return dim;
}

// ---- webcam bubble ------------------------------------------------------------------------------------------------------
function camGeom(t) {
  const a = L.camIntro, b = L.camMain, c = L.camOutro, k = mainK(t), ko = outroK(t);
  const base = { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), r: lerp(a.r, b.r, k) };
  return t >= S.outroStart ? { cx: lerp(b.cx, c.cx, ko), cy: lerp(b.cy, c.cy, ko), r: lerp(b.r, c.r, ko) } : base;
}
function renderCam(t) {
  if (!S.cam) return;
  const g = camGeom(t), sc = g.r / S.cam.r;
  Object.assign(camBox.style, { left: g.cx - g.r + 'px', top: g.cy - g.r + 'px', width: g.r * 2 + 'px', height: g.r * 2 + 'px' });
  Object.assign(camCv.style, { width: S.cam.side * sc + 'px', height: S.cam.side * sc + 'px', left: g.r - S.cam.cx * sc + 'px', top: g.r - S.cam.cy * sc + 'px' });
  const intro = 1 - EO(prog(t, 0, .9));                       // first frames: bubble scales in
  const gone = EIO(prog(t, S.speechEnd + .45, .8));            // after the last word the frozen bubble bows out
  camBox.style.transform = `scale(${lerp(1, .82, intro) * lerp(1, .86, gone)})`; camBox.style.opacity = (1 - intro) * (1 - gone);
}

// ---- header: chapter eyebrow + progress dots --------------------------------------------------------------------------------
const chapterBox = $('#chapter'), dotsBox = $('#dots'), header = $('#header');
const chapterSlots = S.chapters.map(c => { const s = el('div', 'slot eyebrow', `<span class="dash"></span><span>${String(c.n).padStart(2, '0')}</span><span style="opacity:.45">·</span><span>${esc(c.title)}</span>`); chapterBox.append(s); return s; });
const dots = Array.from({ length: S.chapterCount }, () => { const d = el('i'); dotsBox.append(d); return d; });
function renderHeader(t) {
  const k = mainK(t); header.style.opacity = k; show(header, k > .001);
  let ci = -1; S.chapters.forEach((c, i) => { if (t >= c.t) ci = i; });
  chapterSlots.forEach((s, i) => {
    const c = S.chapters[i], next = S.chapters[i + 1];
    const inP = EO(prog(t, c.t, .7)), outP = next ? EIO(prog(t, next.t - .05, .3)) : 0;
    const vis = t >= c.t && (!next || t < next.t + .3);
    show(s, vis); if (!vis) return;
    s.style.opacity = inP * (1 - outP); s.style.transform = `translateY(${lerp(12, 0, inP) - outP * 10}px)`;
    s.querySelector('.dash').style.width = lerp(0, 22, inP) + 'px';
  });
  // dots: active one stretches into a dark pill, interpolated between chapters
  dots.forEach((d, i) => {
    let a = 0;
    S.chapters.forEach((c, j) => { if (c.n - 1 !== i) return; const next = S.chapters[j + 1]; const p = EIO(prog(t, c.t, .6)) * (next ? 1 - EIO(prog(t, next.t, .6)) : 1); a = Math.max(a, p); });
    d.style.width = lerp(7, 24, a) + 'px'; d.style.background = mixRGB(DOT, INK, a);
  });
}

// ---- captions: one line at a time, words light up as spoken, a highlight pill glides from word to word ---------------------
const capBox = $('#captions');
const fadeOut = $('#fade');
const capLines = S.captions.map(line => {
  const root = el('div', 'cap'); const hl = el('div', 'hl'); root.append(hl);
  const words = line.words.map(w => { const s = el('span', 'w', esc(w.w)); root.append(s, document.createTextNode(' ')); return s; });
  capBox.append(root); show(root, false);
  return { line, root, hl, words, geo: null };
});
const INK = rgbOf(CSSV('--ink')), WHITE = [255, 255, 255], BLUE = rgbOf(CSSV('--accent')), BLUE_SOFT = rgbOf(CSSV('--accent-soft')), DOT = rgbOf(CSSV('--dot'));
function renderCaptions(t) {
  const k = mainK(t), light = k;                               // 1 = light canvas (ink text), 0 = dark scene
  const textOn = mixRGB(WHITE, INK, light), activeTxt = mixRGB(WHITE, BLUE, light), pillBg = mixRGB(BLUE, BLUE_SOFT, light);
  for (let i = 0; i < capLines.length; i++) {
    const C = capLines[i], line = C.line, next = S.captions[i + 1];
    const t0 = line.s - .14, t1 = next ? Math.min(next.s - .14, line.e + 1.4) : line.e + 1.6;
    if (t < t0 - .01 || t >= t1) { show(C.root, false); continue; }
    if (!C.geo) C.geo = { width: C.root.offsetWidth, words: C.words.map(w => ({ x: w.offsetLeft, w: w.offsetWidth })) };
    show(C.root, true);
    const inP = EO(prog(t, t0, .4)), outP = EIO(prog(t, t1 - .14, .14));
    C.root.style.opacity = inP * (1 - outP);
    C.root.style.transform = `translate(${-C.geo.width / 2}px, ${lerp(16, 0, inP) - outP * 12}px)`;
    C.root.style.color = textOn;
    let ai = -1;
    line.words.forEach((w, j) => {
      const nx = line.words[j + 1], active = t >= w.s && (nx ? t < nx.s : t < w.e + .35);
      if (active) ai = j;
      const said = t >= w.s, pop = EO(prog(t, w.s, .22));
      const sp = C.words[j];
      sp.style.opacity = said ? lerp(.38, 1, pop) : .38;
      sp.style.transform = `translateY(${said ? lerp(5, 0, pop) : 5}px)`;
      sp.style.color = active ? activeTxt : '';
    });
    // pill: glide from previous active word to current one
    if (ai >= 0) {
      const w = line.words[ai], g = C.geo.words[ai], pg = ai > 0 ? C.geo.words[ai - 1] : g, p = EO(prog(t, w.s, .16));
      const x = lerp(pg.x, g.x, ai > 0 ? p : 1), ww = lerp(pg.w, g.w, ai > 0 ? p : 1);
      Object.assign(C.hl.style, { left: x - 9 + 'px', width: ww + 18 + 'px', background: pillBg, opacity: ai === 0 ? EO(prog(t, w.s, .18)) : 1 });
    } else C.hl.style.opacity = 0;
  }
}

// ---- generic card/chip builders ---------------------------------------------------------------------------------------------
const layer = $('#callouts');
function iconBox(spec) {
  if (spec.logo) return `<div class="icon logo">${logo(spec.logo)}</div>`;
  if (spec.icon) return `<div class="icon">${icon(spec.icon)}</div>`;
  return '';
}
const builders = {
  card(s) {
    const r = el('div', 'card pad');
    r.innerHTML = `<div class="row">${iconBox(s)}<div>${s.eyebrow ? `<div class="eyebrow"><span class="dash"></span>${esc(s.eyebrow)}</div>` : ''}<div class="title">${s.titleHtml || esc(s.title)}</div>${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ''}</div></div>`;
    return { root: r };
  },
  chip(s) {
    const r = el('div', 'chip' + (s.dark ? ' dark' : ''), `${s.logo ? (s.dark ? logoD(s.logo) : logo(s.logo)) : icon(s.icon || 'check-circle')}<span>${esc(s.text)}</span>`);
    return { root: r };
  },
  keys(s) {
    const r = el('div', 'card pad');
    r.innerHTML = `${s.eyebrow ? `<div class="eyebrow"><span class="dash"></span>${esc(s.eyebrow)}</div>` : ''}<div class="row" style="gap:10px">${s.keys.map((k, i) => (i ? `<span class="sep">›</span>` : '') + `<span class="kbd">${esc(k)}</span>`).join('')}</div>${s.hint ? `<div class="sub" style="margin-top:12px">${esc(s.hint)}</div>` : ''}`;
    return { root: r };
  },
  stat(s) {
    const r = el('div', 'card pad stat');
    r.innerHTML = `${s.eyebrow ? `<div class="eyebrow"><span class="dash"></span>${esc(s.eyebrow)}</div>` : ''}<div class="num">${s.valueHtml}</div><div class="sub" style="margin-top:10px">${esc(s.label)}</div>`;
    return { root: r };
  },
  list(s) {
    const r = el('div', 'card pad list');
    r.innerHTML = `${s.eyebrow ? `<div class="eyebrow"><span class="dash"></span>${esc(s.eyebrow)}</div>` : ''}${s.title || s.titleHtml ? `<div class="title" style="margin-bottom:14px">${s.titleHtml || esc(s.title)}</div>` : ''}` +
      s.rows.map(row => `<div class="li"><span class="lead">${row.icon ? `<span class="icon" style="width:36px;height:36px">${icon(row.icon)}</span>` : row.logo ? `<span class="icon logo" style="width:36px;height:36px">${logo(row.logo)}</span>` : ''}${row.ok != null ? `<span class="${row.ok ? 'check' : 'cross'}">${icon(row.ok ? 'check-bold' : 'x-bold')}</span>` : ''}<span>${esc(row.label)}</span></span><span class="meta">${esc(row.meta || '')}</span></div>`).join('');
    const rows = [...r.querySelectorAll('.li')];
    // rows grow in as they are mentioned (the card is placed using its full height, so it ends up centred)
    rows.forEach(li => { li.style.overflow = 'hidden'; });
    return { root: r, update(t) { rows.forEach((li, i) => {
      const at = s.rows[i].at ?? s.t0, p = EO(prog(t, at, .55)), h = EIO(prog(t, at - .05, .45));
      li.style.opacity = p; li.style.transform = `translateX(${lerp(-14, 0, p)}px)`;
      li.style.maxHeight = lerp(0, 90, h) + 'px'; li.style.paddingTop = li.style.paddingBottom = lerp(0, 16, h) + 'px';
      li.style.borderTopWidth = h > .02 ? '1px' : '0px'; if (i === rows.length - 1) li.style.borderBottomWidth = h > .02 ? '1px' : '0px';
    }); } };
  },
  prompt(s) {
    const r = el('div', 'card pad prompt');
    r.innerHTML = `${s.eyebrow ? `<div class="eyebrow"><span class="dash"></span>${esc(s.eyebrow)}</div>` : ''}<div class="txt"></div><div class="bar"><span>${esc(s.model || '')}</span><span class="send">${icon('arrow-up-bold')}</span></div>`;
    const txt = r.querySelector('.txt');
    return { root: r, update(t) {
      const full = s.text, n = Math.round(lerp(0, full.length, prog(t, s.typeFrom, s.typeTo - s.typeFrom)));
      const shown = full.slice(0, n), m = shown.match(/^(@\S+)(.*)$/s);
      const caretOn = Math.floor(t * 2.2) % 2 === 0 || n < full.length;
      txt.innerHTML = (m ? `<span class="at">${esc(m[1])}</span>${esc(m[2])}` : esc(shown)) + (caretOn ? '<span class="caret"></span>' : '');
    } };
  },
  steps(s) {
    const r = el('div', 'card pad steps');
    r.innerHTML = `${s.eyebrow ? `<div class="eyebrow"><span class="dash"></span>${esc(s.eyebrow)}</div>` : ''}<h2>${esc(s.heading[0])}<br><span>${esc(s.heading[1])}</span></h2><div class="grid">${s.steps.map(st => `<div class="st"><div class="n">${esc(st.n)}</div><div class="t">${esc(st.title)}</div><div class="s">${esc(st.sub)}</div></div>`).join('')}</div>`;
    const cards = [...r.querySelectorAll('.st')];
    return { root: r, update(t) { cards.forEach((c, i) => { const p = EO(prog(t, s.steps[i].at, .6)); c.style.opacity = p; c.style.transform = `translateY(${lerp(18, 0, p)}px)`; }); } };
  },
  tokens(s) {
    const r = el('div', 'card pad tokens');
    r.innerHTML = `<div class="eyebrow"><span class="dash"></span>${esc(s.eyebrow)}</div><div class="title">${s.titleHtml}</div>
      <div class="sw">${s.colors.map(c => `<div><div class="c" style="background:${c.hex}"></div><div class="n">${esc(c.name)}<br>${c.hex}</div></div>`).join('')}</div>
      <div class="type"><div class="aa">Aa</div><div class="meta"><b style="color:var(--ink);font-weight:500">${esc(s.font)}</b><br>${esc(s.fontMeta)}</div></div>`;
    const sw = [...r.querySelectorAll('.sw > div')], type = r.querySelector('.type');
    return { root: r, update(t) {
      sw.forEach((d, i) => { const p = EBACK(prog(t, s.t0 + .35 + i * .09, .5)); d.style.opacity = clamp(p * 1.4); d.style.transform = `translateY(${lerp(14, 0, p)}px) scale(${lerp(.9, 1, p)})`; });
      const p = EO(prog(t, s.typeAt, .6)); type.style.opacity = p; type.style.transform = `translateY(${lerp(14, 0, p)}px)`;
    } };
  },
  wave(s) {
    const r = el('div', 'card pad wave');
    const cv = el('canvas'); cv.width = s.w - 52; cv.height = s.h; r.innerHTML = `<div class="eyebrow"><span class="dash"></span>${esc(s.eyebrow)}</div><div class="title" style="margin-bottom:16px">${s.titleHtml}</div>`;
    r.append(cv); r.append(el('div', 'legend', `<span><i style="background:var(--blue)"></i>Speech</span><span><i style="background:#e9b7b2"></i>Pause — cut</span><span class="saved" style="margin-left:auto;color:var(--ink);font-weight:500"></span>`));
    const ctx = cv.getContext('2d'), saved = r.querySelector('.saved');
    return { root: r, update(t) {
      const c = EIO(prog(t, s.collapseAt, s.collapseDur)), N = s.peaks.length;
      // x layout: removed bins shrink to zero width as c -> 1
      const wts = s.peaks.map(p => p.cut ? 1 - c : 1), total = wts.reduce((a, b) => a + b, 0), sx = cv.width / total;
      ctx.clearRect(0, 0, cv.width, cv.height);
      let x = 0; const mid = cv.height / 2, reveal = prog(t, s.t0 + .2, 1.0);
      for (let i = 0; i < N; i++) {
        const p = s.peaks[i], bw = wts[i] * sx; if (i / N > reveal) break;
        const hgt = Math.max(2, p.v * (cv.height - 8));
        if (p.cut && bw > .3) { ctx.fillStyle = `rgba(214,120,110,${.22 * (1 - c)})`; ctx.fillRect(x, 0, bw + .5, cv.height); }
        ctx.fillStyle = p.cut ? `rgba(214,120,110,${.55 * (1 - c) + .1})` : `rgb(${BLUE.join(',')})`;
        if (bw > .3) { ctx.beginPath(); ctx.roundRect(x + bw * .18, mid - hgt / 2, Math.max(.6, bw * .64), hgt, Math.min(2, bw * .3)); ctx.fill(); }
        x += bw;
      }
      saved.textContent = c > .02 ? `− ${(s.removed * c).toFixed(1)} s of pauses` : '';
    } };
  },
};

// B-roll builders: browser window and coverflow carousel
const brollLayer = $('#broll');
function browserEl(item, w, h) {
  const r = el('div', 'browser'); Object.assign(r.style, { width: w + 'px', height: h + 'px' });
  r.innerHTML = `<div class="bar"><i></i><i></i><i></i><div class="url">${icon('lock-simple')}<span>${esc(item.url)}</span></div></div><div class="view"><img src="${item.img}" alt=""></div>`;
  return r;
}
const brollBuilders = {
  browser(s) {
    const r = browserEl(s, s.w, s.h); const img = r.querySelector('.view img');
    const tag = s.tag ? el('div', 'tag', `${s.tag.logo ? logoD(s.tag.logo) : ''}<span>${esc(s.tag.text)}</span>${s.tag.lic ? `<span class="lic">${esc(s.tag.lic)}</span>` : ''}`) : null;
    const wrap = el('div'); wrap.style.position = 'absolute'; wrap.style.left = '0'; wrap.style.top = '0'; wrap.append(r); if (tag) wrap.append(tag);
    return { root: wrap, update(t, e) {
      const x = s.x, y = s.y;
      const enter = e.i, exit = e.o;
      r.style.transform = `translate(${x + lerp(s.fromX ?? 260, 0, enter) - exit * (s.toX ?? 220)}px, ${y + lerp(30, 0, enter)}px) rotateY(${lerp(s.fromRot ?? -16, 0, enter) + exit * (s.toRot ?? 14)}deg) scale(${lerp(.92, 1, enter)})`;
      r.style.opacity = clamp(enter * 1.6) * (1 - exit);
      if (s.scroll) { const p = EIO(prog(t, s.scroll.t0, s.scroll.t1 - s.scroll.t0)); img.style.transform = `translateY(${-lerp(s.scroll.from, s.scroll.to, p)}px)`; }
      if (tag) { const p = EO(prog(t, s.t0 + .45, .6)); tag.style.opacity = p * (1 - exit); tag.style.transform = `translate(${x + 28}px, ${y + s.h - 24 + lerp(14, 0, p)}px)`; }
    } };
  },
  carousel(s) {
    const wrap = el('div'); wrap.style.position = 'absolute'; wrap.style.inset = '0'; wrap.style.transformStyle = 'preserve-3d';
    const cards = s.items.map(it => { const b = browserEl(it, s.cw, s.ch); b.style.transformOrigin = '50% 50%'; wrap.append(b); return b; });
    const label = el('div', 'cf-label'); label.style.top = s.labelY + 'px'; wrap.append(label);
    const dotsEl = el('div', 'cf-dots'); dotsEl.style.top = s.labelY + 42 + 'px'; const dd = s.items.map(() => { const i = el('i'); dotsEl.append(i); return i; }); wrap.append(dotsEl);
    const tags = s.items.map(it => { const g = el('div', 'tag', `${it.logo ? logoD(it.logo) : ''}<span>${esc(it.name)}</span>${it.lic ? `<span class="lic">${esc(it.lic)}</span>` : ''}`); wrap.append(g); return g; });
    return { root: wrap, update(t, e) {
      // continuous active position: steps [{t, index}] eased
      let pos = s.steps[0].index;
      for (let i = 1; i < s.steps.length; i++) { const st = s.steps[i]; pos = lerp(pos, st.index, EIO(prog(t, st.t, .85))); }
      const cx = s.cx, cy = s.cy, enter = e.i, exit = e.o;
      cards.forEach((c, i) => {
        const d = i - pos, ad = Math.abs(d);
        const tx = Math.sign(d) * (ad < 1 ? ad * s.gap : s.gap + (ad - 1) * s.gap * .55);
        const rot = -clamp(d, -1.4, 1.4) * 38, sc = 1 - Math.min(ad, 1.5) * .16, z = -ad * 160;
        const ey = lerp(120, 0, enter), er = lerp(-24, 0, enter);
        c.style.transform = `translate(${cx - s.cw / 2 + tx + exit * -180}px, ${cy - s.ch / 2 + ey}px) translateZ(${z}px) rotateY(${rot + er}deg) scale(${sc})`;
        c.style.opacity = clamp(enter * 1.5 - ad * .15) * (1 - exit) * (ad > 2.2 ? 0 : 1);
        c.style.zIndex = String(100 - Math.round(ad * 10));
        c.style.filter = `brightness(${1 - Math.min(ad, 1) * .12})`;
      });
      const ai = Math.round(clamp(pos, 0, s.items.length - 1)), it = s.items[ai];
      label.style.display = 'none';
      dd.forEach((d, i) => { const a = clamp(1 - Math.abs(i - pos)); d.style.width = lerp(7, 24, a) + 'px'; d.style.background = `rgba(255,255,255,${lerp(.35, .95, a)})`; });
      dotsEl.style.opacity = enter * (1 - exit);
      tags.forEach((g, i) => { const a = clamp(1 - Math.abs(i - pos) * 2); g.style.opacity = a * enter * (1 - exit); g.style.transform = `translate(${cx - s.cw / 2 + 28}px, ${cy + s.ch / 2 - 22 + lerp(10, 0, a)}px)`; g.style.zIndex = '200'; });
    } };
  },
};

function place(root, s) {
  // anchors relative to the screen card; explicit x/y wins
  root.style.left = '0'; root.style.top = '0';
  return () => {
    const w = root.offsetWidth, h = root.offsetHeight, m = s.margin ?? 32;
    const a = s.anchor || 'tl';
    let x = s.x, y = s.y;
    if (x == null) x = a.includes('l') ? PL.x + m : a.includes('r') ? PL.x + PL.w - m - w : PL.x + (PL.w - w) / 2;
    if (y == null) y = a.includes('t') ? PL.y + m : a.includes('b') ? PL.y + PL.h - m - h : PL.y + (PL.h - h) / 2;
    return { x, y, w, h };
  };
}
const callouts = S.callouts.map(s => {
  const b = builders[s.kind](s); if (s.w) { b.root.style.width = s.w + 'px'; b.root.style.maxWidth = 'none'; }
  layer.append(b.root); show(b.root, false);
  return { s, ...b, geo: place(b.root, s), g: null };
});
const brolls = S.broll.map(s => { const b = brollBuilders[s.kind](s); brollLayer.append(b.root); show(b.root, false); return { s, ...b }; });

function renderCallouts(t) {
  for (const c of callouts) {
    const e = io(t, c.s.t0, c.s.t1, c.s.din ?? .6, c.s.dout ?? .32);
    if (!e.on) { show(c.root, false); continue; }
    show(c.root, true);
    if (!c.g) c.g = c.geo();
    const from = c.s.from || 'up';
    const dx = from === 'left' ? -28 : from === 'right' ? 28 : 0, dy = from === 'up' ? 18 : from === 'down' ? -18 : 0;
    c.root.style.opacity = clamp(e.i * 1.4) * (1 - e.o);
    c.root.style.transform = `translate(${c.g.x + lerp(dx, 0, e.i)}px, ${c.g.y + lerp(dy, 0, e.i) - e.o * 10}px) scale(${lerp(.97, 1, e.i)})`;
    c.update?.(t, e);
  }
}
function renderBroll(t) {
  for (const b of brolls) {
    const e = io(t, b.s.t0, b.s.t1, b.s.din ?? .9, b.s.dout ?? .6);
    if (!e.on) { show(b.root, false); continue; }
    show(b.root, true); b.update(t, e);
  }
}

// ---- intro / outro scenes -----------------------------------------------------------------------------------------------------
function sceneEl(spec) {
  if (!spec) { const r = el('div', 'scene'); $('#scenes').append(r); return { r, lines: [] }; }
  const r = el('div', 'scene');
  r.innerHTML = `
    ${spec.brand ? `<div class="brandmark" style="left:${spec.brand.x}px;top:${spec.brand.y}px">${brandImg}<span>${esc(spec.brand.text)}</span></div>` : ''}
    <div class="block" style="position:absolute;left:${spec.x}px;top:${spec.y}px;width:${spec.w}px">
      <div class="eyebrow" style="margin-bottom:26px"><span class="dash"></span>${esc(spec.eyebrow)}</div>
      <h1>${spec.lines.map((l, i) => `<span class="line"><span class="${i ? 'soft' : ''}">${esc(l)}</span></span>`).join('')}</h1>
      ${spec.lead ? `<p class="lead" style="margin-top:30px">${esc(spec.lead)}</p>` : ''}
      ${spec.buttons ? `<div class="row" style="margin-top:34px;gap:14px">${spec.buttons.map(b => `<span class="btn ${b.style}">${esc(b.text)}${b.arrow ? ' <span>→</span>' : ''}</span>`).join('')}</div>` : ''}
    </div>
    ${spec.tag ? `<div class="nametag" style="left:${spec.tag.x}px;top:${spec.tag.y}px">${brandImg}<div><div class="who">${esc(spec.tag.who)}</div><div class="role">${esc(spec.tag.role)}</div></div></div>` : ''}`;
  $('#scenes').append(r);
  return { r, eyebrow: r.querySelector('.block .eyebrow'), lines: [...r.querySelectorAll('h1 .line > span')], lead: r.querySelector('.lead'), btns: r.querySelector('.block .row'), tag: r.querySelector('.nametag'), brand: r.querySelector('.brandmark') };
}
const intro = sceneEl(S.intro), outro = sceneEl(S.outro);
function animScene(sc, t, t0, vis) {
  show(sc.r, vis > .001); if (vis <= .001) return;
  sc.r.style.opacity = vis;
  const rise = (node, at, d = .9, dist = 24) => { if (!node) return; const p = EO(prog(t, at, d)); node.style.opacity = p; node.style.transform = `translateY(${lerp(dist, 0, p)}px)`; };
  rise(sc.brand, t0 + .1, .8, 10);
  rise(sc.eyebrow, t0 + .25, .8, 14);
  sc.lines.forEach((ln, i) => { const p = EO(prog(t, t0 + .4 + i * .14, 1.0)); ln.style.transform = `translateY(${lerp(110, 0, p)}%)`; });
  rise(sc.lead, t0 + .85, .9, 18); rise(sc.btns, t0 + 1.05, .9, 18); rise(sc.tag, t0 + .7, .9, 16);
}

// ---- master render ---------------------------------------------------------------------------------------------------------------
async function renderFrame(t) {
  const k = mainK(t), bk = brollK(t);
  // backgrounds
  bgLight.style.opacity = k; bgDark.style.opacity = 1 - k; show(bgDark, k < .999);
  const kb = t < S.outroStart ? prog(t, 0, S.introEnd + 1) : prog(t, S.outroStart, S.duration - S.outroStart);
  if (S.hero) heroImg.style.transform = `scale(${lerp(1.10, 1.02, EIO(kb))})`;
  // screen card: rises in after the intro, recedes behind B-roll
  show(plate, k > .001); show(plateFx, k > .001);
  if (k > .001) {
    await drawSources(t);
    const cam = cameraAt(t);
    camSpace.style.transform = `translate(${PL.w / 2 - cam.cx * cam.s}px, ${PL.h / 2 - cam.cy * cam.s}px) scale(${cam.s})`;
    const sc = lerp(.94, 1, k) * lerp(1, .955, bk), ty = lerp(70, 0, k);
    plate.style.transform = `translateY(${ty}px) scale(${sc})`; plateFx.style.transform = plate.style.transform;
    plate.style.opacity = clamp(k * 1.3);
    plateDim.style.opacity = bk * .55;
    renderSpots(t, cam);
  } else if (S.cam) {
    const i = srcIndex(t), c = await loadImg(fr(S.cam.base, i, S.screen.n)); cctx.drawImage(c, 0, 0);
    for (let q = 1; q <= 4; q++) loadImg(fr(S.cam.base, i + q, S.screen.n));
  }
  renderCam(t);
  renderHeader(t);
  renderCallouts(t);
  renderBroll(t);
  animScene(intro, t, 0, t < S.outroStart ? 1 - EIO(prog(t, S.introEnd - .55, .45)) : 0);
  animScene(outro, t, S.outroStart + .3, outroK(t));
  renderCaptions(t);
  fadeOut.style.opacity = EIO(prog(t, S.duration - .7, .7));
}

await document.fonts.ready;
await Promise.all([...document.images].map(im => im.decode().catch(() => {})));
window.renderFrame = renderFrame;
window.composeReady = true;
