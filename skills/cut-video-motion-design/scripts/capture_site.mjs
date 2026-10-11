// Capture a website with Playwright: viewport + full-page + per-section screenshots and the
// design tokens (CSS variables, fonts, dominant colors, logo candidates) for use as a style reference.
// usage: node capture_site.mjs <url> <outDir> [--dsf 2] [--width 1920] [--height 1080] [--sections 8] [--no-tokens]
//        [--locale en-US] [--dark] [--wait 1500] [--hide "css, selectors"] [--prefix name]
//        [--remove "css, selectors"] [--no-overlays]   remove banners (display:none) / fixed pop-ups and dialogs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const url = args[0];
const outDir = args[1] || 'build/sites/' + new URL(url).hostname.replace(/^www\./, '');
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const DSF = +opt('dsf', 2), W = +opt('width', 1920), H = +opt('height', 1080), MAX_SECTIONS = +opt('sections', 8);
const wantTokens = !args.includes('--no-tokens');
const LOCALE = opt('locale', 'en-US'), WAIT = +opt('wait', 800), HIDE = opt('hide', ''), PREFIX = opt('prefix', ''), REMOVE = opt('remove', '');
if (!url) { console.error('usage: node capture_site.mjs <url> <outDir>'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

// Cookie / consent banners in English and German; first visible match wins.
const CONSENT = [
  /^(alle )?akzeptieren$/i, /^alle cookies akzeptieren$/i, /^zustimmen$/i, /^einverstanden$/i, /^verstanden$/i,
  /^accept( all)?( cookies)?$/i, /^allow all( cookies)?$/i, /^i agree$/i, /^agree$/i, /^got it$/i, /^ok(ay)?$/i,
  /^nur notwendige$/i, /^ablehnen$/i, /^reject all$/i, /^decline$/i, /^consent$/i, /^keep (analytics|cookies) off$/i,
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: W, height: H }, deviceScaleFactor: DSF, locale: LOCALE, colorScheme: args.includes('--dark') ? 'dark' : 'light',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36',
});
const page = await ctx.newPage();
const fontFiles = new Set();
page.on('response', r => { const t = r.headers()['content-type'] || ''; if (/font|woff2?|ttf|otf/i.test(t + r.url())) fontFiles.add(r.url()); });

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

async function dismissConsent() {
  for (const frame of page.frames()) {
    for (const re of CONSENT) {
      const btn = frame.getByRole('button', { name: re }).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(600); return re.source; }
    }
  }
  return null;
}
const consent = await dismissConsent();

// Trigger lazy loading and scroll-reveal animations, then go back to the top.
await page.evaluate(async () => {
  const step = innerHeight * 0.6;
  for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise(r => setTimeout(r, 160)); }
  scrollTo(0, 0); await new Promise(r => setTimeout(r, 500));
});
await page.evaluate(() => document.fonts.ready);
if (HIDE) await page.addStyleTag({ content: `${HIDE} { visibility: hidden !important; }` });
if (REMOVE) await page.addStyleTag({ content: `${REMOVE} { display: none !important; }` });
// Newsletter pop-ups, chat widgets and leftover consent dialogs: fixed/sticky layers that cover a real part of the
// viewport (a slim top navigation bar stays), plus modal dialogs. Scroll locks of modals are released.
if (args.includes('--no-overlays')) await page.evaluate(() => {
  const area = innerWidth * innerHeight;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    const modal = el.getAttribute('role') === 'dialog' || el.getAttribute('aria-modal') === 'true';
    if (!modal && cs.position !== 'fixed' && cs.position !== 'sticky') continue;
    const r = el.getBoundingClientRect(), slimBar = r.top <= 1 && r.height < 110;
    if (modal || (!slimBar && r.width * r.height > area * 0.08)) el.style.setProperty('display', 'none', 'important');
  }
  for (const el of [document.documentElement, document.body]) { el.style.setProperty('overflow', 'auto', 'important'); el.style.setProperty('position', 'static', 'important'); }
});
await page.waitForTimeout(WAIT);

const shots = [];
const save = async (name, o) => { name = PREFIX + name; const f = path.join(outDir, name); await page.screenshot({ path: f, ...o }); shots.push(name); };
await save('viewport.png', {});
await save('fullpage.png', { fullPage: true });

// One screenshot per top-level section (scrolled into view so sticky headers and reveal effects look natural).
const sections = await page.evaluate((max) => {
  const cands = [...document.querySelectorAll('main > section, main > div > section, body > section, section, [class*="section"]')]
    .filter(el => { const r = el.getBoundingClientRect(); return r.height > 240 && r.width > innerWidth * 0.6; });
  const seen = []; const out = [];
  for (const el of cands) {
    const top = Math.round(el.getBoundingClientRect().top + scrollY);
    if (seen.some(t => Math.abs(t - top) < 200)) continue;
    seen.push(top); out.push({ top, h: Math.round(el.getBoundingClientRect().height), label: (el.querySelector('h1,h2,h3')?.textContent || '').trim().slice(0, 60) });
  }
  return out.sort((a, b) => a.top - b.top).slice(0, max);
}, MAX_SECTIONS);
for (const [i, s] of sections.entries()) {
  await page.evaluate(y => scrollTo(0, Math.max(0, y - 40)), s.top);
  await page.waitForTimeout(700);
  await save(`section-${String(i + 1).padStart(2, '0')}.png`, {});
}
await page.evaluate(() => scrollTo(0, 0));

let tokens = null;
if (wantTokens) {
  tokens = await page.evaluate(() => {
    const style = el => { if (!el) return null; const s = getComputedStyle(el); return {
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80), fontFamily: s.fontFamily, fontWeight: s.fontWeight,
      fontSize: s.fontSize, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, textTransform: s.textTransform,
      color: s.color, background: s.backgroundColor, backgroundImage: s.backgroundImage.slice(0, 300), borderRadius: s.borderRadius,
      border: s.border, boxShadow: s.boxShadow, padding: s.padding }; };
    const vars = {};
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      const walk = list => { for (const r of list) {
        if (r.cssRules) walk(r.cssRules);
        if (r.style && /(^|,)\s*(:root|html|body)\b/.test(r.selectorText || '')) for (const p of r.style) if (p.startsWith('--')) vars[p] = r.style.getPropertyValue(p).trim();
      } };
      walk(rules);
    }
    // Weighted color census: text colors count per element, background colors by visible area.
    const census = {};
    const add = (c, w) => { if (!c || /rgba\(0, 0, 0, 0\)|transparent/.test(c)) return; census[c] = (census[c] || 0) + w; };
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect(); if (r.width * r.height < 16) continue;
      const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none') continue;
      add(s.backgroundColor, Math.min(r.width * r.height, 2e6) / 4000);
      if (el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) add(s.color, 3);
      if (parseFloat(s.borderTopWidth) > 0) add(s.borderTopColor, 1);
    }
    const colors = Object.entries(census).sort((a, b) => b[1] - a[1]).slice(0, 16).map(([c, w]) => ({ c, w: Math.round(w) }));
    const logos = [...document.querySelectorAll('header img, header svg, nav img, nav svg, a[href="/"] img, a[href="/"] svg, img[alt*="logo" i], img[src*="logo" i], [class*="logo" i] img, [class*="logo" i] svg')]
      .slice(0, 8).map(el => ({ tag: el.tagName, src: el.currentSrc || el.getAttribute('src') || null, alt: el.getAttribute('alt'),
        w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height),
        svg: el.tagName.toLowerCase() === 'svg' ? el.outerHTML.slice(0, 20000) : null }));
    const meta = n => document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)?.content || null;
    return {
      url: location.href, title: document.title, description: meta('description'), themeColor: meta('theme-color'), ogImage: meta('og:image'),
      icons: [...document.querySelectorAll('link[rel*="icon"]')].map(l => l.href),
      fonts: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family.replace(/"/g, '')} ${f.weight} ${f.style}`))],
      cssVars: vars, colors, logos,
      el: { body: style(document.body), h1: style(document.querySelector('h1')), h2: style(document.querySelector('h2')),
        p: style(document.querySelector('main p, p')), link: style(document.querySelector('nav a, header a')),
        button: style(document.querySelector('a[class*="btn" i], a[class*="button" i], button:not([aria-hidden="true"])')),
        header: style(document.querySelector('header')) },
      headings: [...document.querySelectorAll('h1,h2')].slice(0, 12).map(h => h.textContent.trim().replace(/\s+/g, ' ').slice(0, 90)),
    };
  });
  tokens.fontFiles = [...fontFiles];
  tokens.sections = sections;
  tokens.consentClicked = consent;
  fs.writeFileSync(path.join(outDir, 'tokens.json'), JSON.stringify(tokens, null, 2));
}
await browser.close();
console.log(JSON.stringify({ outDir, shots, consent, sections: sections.length, title: tokens?.title }, null, 1));
