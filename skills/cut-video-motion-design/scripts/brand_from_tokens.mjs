// Writes build/brand.css (CSS variables + @font-face 'Brand') for the compositor.
// Source is either a website captured with capture_site.mjs (tokens.json) or a named style preset.
//   node brand_from_tokens.mjs build/sites/<site>/tokens.json [project.json] [--font "Inter"] [--accent "#2b59c3"]
//   node brand_from_tokens.mjs --preset clean|editorial|bold|calm [project.json]
// Fonts come from Fontsource (open-source fonts as npm packages, mostly OFL): @fontsource-variable/<slug> first,
// then @fontsource/<slug>. If the site uses a font that is not on Fontsource (commercial), pass --font with an
// open-source lookalike and say so in the delivery notes.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadProject } from './lib/project.mjs';

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : null; };
const P = loadProject(args.find(a => a.endsWith('project.json')) || 'project.json');
const tokensFile = args.find(a => a.endsWith('tokens.json'));

const PRESETS = {
  clean: { font: 'Inter', ink: '#111318', accent: '#2b59c3', bgSoft: '#f4f5f7', hero: '#0d1015', radius: 14, displayWeight: 300, tracking: -0.045 },
  editorial: { font: 'Fraunces', uiFont: 'Inter', ink: '#1c1917', accent: '#c2410c', bgSoft: '#f7f4ef', hero: '#1a1410', radius: 6, displayWeight: 400, tracking: -0.03 },
  bold: { font: 'Space Grotesk', ink: '#0a0a0a', accent: '#7c3aed', bgSoft: '#f3f1fb', hero: '#0b0714', radius: 18, displayWeight: 600, tracking: -0.04 },
  calm: { font: 'DM Sans', ink: '#10201d', accent: '#0f766e', bgSoft: '#f1f6f5', hero: '#08130f', radius: 16, displayWeight: 400, tracking: -0.035 },
};

// ---- colour helpers ----------------------------------------------------------------------------------------
const parse = c => {
  if (!c) return null; c = c.trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(c);
  if (m) { let h = m[1]; if (h.length <= 4) h = [...h].map(x => x + x).join(''); return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 }; }
  m = /rgba?\(([^)]+)\)/i.exec(c);
  if (m) { const v = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] ?? 1 }; }
  return null;
};
const hex = ({ r, g, b }) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const sat = ({ r, g, b }) => { const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255; return mx === 0 ? 0 : (mx - mn) / mx; };
const mix = (a, b, p) => ({ r: a.r + (b.r - a.r) * p, g: a.g + (b.g - a.g) * p, b: a.b + (b.b - a.b) * p });
const WHITE = { r: 255, g: 255, b: 255 }, BLACK = { r: 0, g: 0, b: 0 };

// ---- pick tokens --------------------------------------------------------------------------------------------
let B;
if (opt('preset')) {
  const p = PRESETS[opt('preset')]; if (!p) { console.error('presets:', Object.keys(PRESETS).join(', ')); process.exit(1); }
  B = { ...p, ink: parse(p.ink), accent: parse(p.accent), bgSoft: parse(p.bgSoft), hero: parse(p.hero), source: `preset:${opt('preset')}` };
} else {
  if (!tokensFile) { console.error('give build/sites/<site>/tokens.json or --preset <name>'); process.exit(1); }
  const T = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
  const vars = Object.entries(T.cssVars || {}).map(([k, v]) => ({ k, v, c: parse(v) })).filter(x => x.c && x.c.a > .9);
  const census = (T.colors || []).map(x => ({ ...x, col: parse(x.c) })).filter(x => x.col && x.col.a > .9);
  const byName = (re, test = () => true) => vars.find(x => re.test(x.k) && test(x.c))?.c;
  const chromatic = c => sat(c) > .28 && lum(c) > .02 && lum(c) < .6;
  const ink = byName(/^--(ink|text|fg|foreground|color-text|body-color|dark)$/i, c => lum(c) < .1)
    || census.filter(x => lum(x.col) < .06).sort((a, b) => b.w - a.w)[0]?.col || parse(T.el?.body?.color) || parse('#111318');
  const accent = parse(opt('accent')) || byName(/(primary|accent|brand|blue|link|highlight|main|cta)/i, chromatic)
    || census.filter(x => chromatic(x.col)).sort((a, b) => b.w - a.w)[0]?.col || parse('#2b59c3');
  const bgSoft = byName(/(bg-soft|bg-alt|surface|soft|subtle|muted-bg|gray-50|grey-50|background-alt)/i, c => lum(c) > .8 && lum(c) < .99)
    || census.filter(x => lum(x.col) > .8 && lum(x.col) < .985).sort((a, b) => b.w - a.w)[0]?.col || mix(ink, WHITE, .95);
  const hero = census.filter(x => lum(x.col) < .02 && x.w > 200).sort((a, b) => b.w - a.w)[0]?.col || mix(ink, BLACK, .3);
  const radii = vars.length ? Object.entries(T.cssVars).filter(([k]) => /radius/i.test(k)).map(([, v]) => parseFloat(v)).filter(v => v > 2 && v < 40) : [];
  const h1 = T.el?.h1 || {};
  const fam = (opt('font') || (T.cssVars?.['--font'] || h1.fontFamily || T.el?.body?.fontFamily || 'Inter').split(',')[0]).replace(/['"]/g, '').trim();
  const ease = Object.entries(T.cssVars || {}).filter(([k, v]) => /ease|easing/i.test(k) && /cubic-bezier/.test(v));
  B = {
    font: fam, ink, accent, bgSoft, hero,
    accentDeep: byName(/(deep|darker|dark|900|800)/i, c => chromatic(c) || (sat(c) > .2 && lum(c) < .05)),
    accentSoft: byName(/(soft|tint|light|50|100)$/i, c => sat(c) > .03 && lum(c) > .8),
    line: byName(/^--(line|border|divider|hairline)$/i, c => lum(c) > .6), lineStrong: byName(/(line-strong|border-strong)/i, c => lum(c) > .45),
    muted: byName(/^--(muted|secondary|text-muted|subtle)$/i, c => lum(c) > .05 && lum(c) < .4),
    radius: radii.length ? radii.sort((a, b) => a - b)[Math.floor(radii.length / 2)] : 14,
    displayWeight: +h1.fontWeight || 300,
    tracking: h1.letterSpacing && h1.fontSize && h1.letterSpacing !== 'normal' ? +(parseFloat(h1.letterSpacing) / parseFloat(h1.fontSize)).toFixed(3) : -0.03,
    easeOut: ease.find(([k]) => /out/i.test(k) && !/in-out|inout/i.test(k))?.[1], easeInOut: ease.find(([k]) => /in-?out/i.test(k))?.[1],
    source: path.relative(P.dir, tokensFile),
  };
}

// ---- font via Fontsource --------------------------------------------------------------------------------------
function fontFace(family, cssName) {
  const slug = family.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const tryPkg = pkg => {
    const dir = path.join(P.dir, 'node_modules', pkg, 'files');
    if (!fs.existsSync(dir)) spawnSync(`npm install --no-audit --no-fund ${pkg}`, { cwd: P.dir, stdio: 'ignore', shell: true });
    return fs.existsSync(dir) ? fs.readdirSync(dir) : null;
  };
  let files = tryPkg(`@fontsource-variable/${slug}`);
  if (files) {
    const pick = sub => files.find(f => f.includes(`-${sub}-wght-normal.woff2`)) || files.find(f => f.includes(`-${sub}-`) && f.endsWith('-normal.woff2'));
    const latin = pick('latin'), ext = pick('latin-ext');
    return [latin && `@font-face { font-family: '${cssName}'; src: url('/node_modules/@fontsource-variable/${slug}/files/${latin}') format('woff2'); font-weight: 100 900; font-display: block; }`,
      ext && `@font-face { font-family: '${cssName}'; src: url('/node_modules/@fontsource-variable/${slug}/files/${ext}') format('woff2'); font-weight: 100 900; font-display: block; unicode-range: U+0100-024F, U+1E00-1EFF, U+20A0-20CF; }`].filter(Boolean).join('\n');
  }
  files = tryPkg(`@fontsource/${slug}`);
  if (files) {
    return [300, 400, 500, 600, 700].map(w => files.find(f => f === `${slug}-latin-${w}-normal.woff2`) && `@font-face { font-family: '${cssName}'; src: url('/node_modules/@fontsource/${slug}/files/${slug}-latin-${w}-normal.woff2') format('woff2'); font-weight: ${w}; font-display: block; }`).filter(Boolean).join('\n');
  }
  console.warn(`font "${family}" is not on Fontsource: pass --font "<open-source lookalike>" (see references/asset-sources.md > Fonts)`);
  return '';
}

const face = fontFace(B.font, 'Brand') + (B.uiFont ? '\n' + fontFace(B.uiFont, 'BrandUI') : '');
const accentDeep = B.accentDeep || mix(B.accent, BLACK, .55), accentSoft = B.accentSoft || mix(B.accent, WHITE, .87);
const line = B.line || mix(B.ink, WHITE, .88), lineStrong = B.lineStrong || mix(B.ink, WHITE, .78), muted = B.muted || mix(B.ink, WHITE, .42);
const css = `/* generated by brand_from_tokens.mjs from ${B.source} */
${face}
:root {
  --font: 'Brand', system-ui, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;${B.uiFont ? "\n  --font-ui: 'BrandUI', system-ui, sans-serif;" : ''}
  --ink: ${hex(B.ink)}; --ink-2: ${hex(mix(B.ink, WHITE, .16))}; --muted: ${hex(muted)};
  --bg: #ffffff; --bg-soft: ${hex(B.bgSoft)}; --bg-tint: ${hex(mix(B.bgSoft, B.accent, .05))}; --line: ${hex(line)}; --line-strong: ${hex(lineStrong)}; --dot: ${hex(mix(lineStrong, B.ink, .12))};
  --accent: ${hex(B.accent)}; --accent-deep: ${hex(accentDeep)}; --accent-soft: ${hex(accentSoft)}; --accent-light: ${hex(mix(B.accent, WHITE, .55))}; --hero: ${hex(B.hero)};
  --r-s: ${Math.max(4, Math.round(B.radius * .55))}px; --r: ${B.radius}px; --r-l: ${Math.round(B.radius * 1.55)}px;
  --display-weight: ${B.displayWeight}; --display-tracking: ${B.tracking}em;${B.easeOut ? `\n  --ease-out: ${B.easeOut};` : ''}${B.easeInOut ? `\n  --ease-in-out: ${B.easeInOut};` : ''}
}
${B.uiFont ? '.cap, .chip, .card .sub, .list .li, .prompt, .nametag, .btn { font-family: var(--font-ui); }\n' : ''}`;
fs.writeFileSync(P.build('brand.css'), css);
console.log(css);
