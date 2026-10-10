// The 20 animation styles: list them, render a style board with examples, apply one to the project.
//   node style.mjs list
//   node style.mjs board [--title "Cut videos" --title2 "with Claude Code." --eyebrow "Video tutorial" --lead "..."
//                         --brand "yourbrand.com" --who "Your Name" --role "..." --caption "..." --hl 4 --t 2.6]
//        -> build/styles/NN-<id>.png (one 1920x1080 example per style) + build/styles/board.png (all 20, numbered)
//   node style.mjs use <number|id>     -> build/style.css (+ build/style.js) used by the compositor
//   node style.mjs clear               -> back to the plain look (brand.css only)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.join(DIR, 'build');
const STYLES = JSON.parse(fs.readFileSync(path.join(DIR, 'styles', 'styles.json'), 'utf8'));
const args = process.argv.slice(2), cmd = args[0];
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const pad = n => String(n).padStart(2, '0');
const find = key => STYLES.find(s => String(s.n) === String(+key) || s.id === String(key).toLowerCase());

function ensureFonts(list) {
  const missing = [...new Set(list.flatMap(s => s.fonts))].filter(p => !fs.existsSync(path.join(DIR, 'node_modules', p)));
  if (!missing.length) return;
  console.log('installing fonts:', missing.join(' '));
  const r = spawnSync(`npm install --no-audit --no-fund ${missing.join(' ')}`, { cwd: DIR, stdio: 'inherit', shell: true });
  if (r.status !== 0) console.warn('font install failed; the styles fall back to system fonts');
}

if (!cmd || cmd === 'list') {
  for (const s of STYLES) console.log(`${pad(s.n)}  ${s.name.padEnd(15)} ${s.look}\n    motion: ${s.motion}\n    good for: ${s.goodFor}`);
  process.exit(0);
}

if (cmd === 'clear') {
  for (const f of ['style.css', 'style.js', 'style.json']) fs.rmSync(path.join(BUILD, f), { force: true });
  console.log('animation style removed (plain look + build/brand.css)');
  process.exit(0);
}

if (cmd === 'use') {
  const s = find(args[1]);
  if (!s) { console.error('unknown style; run: node style.mjs list'); process.exit(1); }
  ensureFonts([s]);
  fs.mkdirSync(BUILD, { recursive: true });
  fs.copyFileSync(path.join(DIR, 'styles', `${s.id}.css`), path.join(BUILD, 'style.css'));
  const fx = path.join(DIR, 'styles', 'fx', `${s.id}.js`);
  if (fs.existsSync(fx)) fs.copyFileSync(fx, path.join(BUILD, 'style.js')); else fs.rmSync(path.join(BUILD, 'style.js'), { force: true });
  fs.writeFileSync(path.join(BUILD, 'style.json'), JSON.stringify(s, null, 2));
  console.log(`style ${pad(s.n)} ${s.name} applied -> build/style.css${fs.existsSync(fx) ? ' + build/style.js' : ''}`);
  const brand = path.join(BUILD, 'brand.css');
  if (fs.existsSync(brand) && /--(font|accent|ink)\s*:/.test(fs.readFileSync(brand, 'utf8')))
    console.log('note: build/brand.css also sets fonts/colours and is loaded after the style. Keep it to tint the style with the brand, or empty it for the pure style.');
  process.exit(0);
}

if (cmd !== 'board') { console.error('commands: list | board | use <n> | clear'); process.exit(1); }

// ---- board -------------------------------------------------------------------------------------------------
ensureFonts(STYLES);
const OUT = path.join(BUILD, 'styles');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = path.join(DIR, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const params = new URLSearchParams();
for (const k of ['title', 'title2', 'eyebrow', 'lead', 'brand', 'who', 'role', 'caption', 'hl', 'chapter']) if (opt(k)) params.set(k, opt(k));
params.set('t', opt('t', '2.6'));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => console.error('[tile]', e.message));
for (const s of STYLES) {
  params.set('style', s.id);
  await page.goto(`${ORIGIN}/styles/tile.html?${params}`);
  await page.waitForFunction(() => window.tileReady === true, null, { timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, `${pad(s.n)}-${s.id}.png`) });
  process.stdout.write(`${pad(s.n)} `);
}
console.log();

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const board = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; width: 1920px; background: #0E0F12; color: #F2F2F2; font-family: 'Segoe UI', system-ui, sans-serif; }
  header { padding: 34px 30px 10px; display: flex; align-items: baseline; gap: 18px; }
  header h1 { margin: 0; font-size: 40px; font-weight: 700; letter-spacing: -.02em; } header span { color: #9AA0AA; font-size: 18px; }
  .grid { display: grid; grid-template-columns: repeat(4, 450px); gap: 22px 20px; padding: 18px 30px 36px; }
  figure { margin: 0; } img { width: 450px; height: 253px; display: block; border-radius: 10px; box-shadow: 0 0 0 1px rgba(255,255,255,.08); }
  figcaption { margin-top: 10px; display: flex; gap: 10px; align-items: baseline; }
  figcaption b { font-size: 20px; font-weight: 700; } figcaption i { font-style: normal; font-size: 20px; color: #FFD25A; font-weight: 700; min-width: 30px; }
  figcaption small { display: block; color: #9AA0AA; font-size: 13.5px; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 410px; }
</style></head><body><header><h1>20 animation styles</h1><span>pick a number, or reference your website for colours, fonts and logo</span></header>
<div class="grid">${STYLES.map(s => `<figure><img src="${pad(s.n)}-${s.id}.png"><figcaption><i>${pad(s.n)}</i><div><b>${esc(s.name)}</b><small>${esc(s.look)}</small></div></figcaption></figure>`).join('')}</div></body></html>`;
fs.writeFileSync(path.join(OUT, 'board.html'), board);
const bp = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
await bp.goto(`${ORIGIN}/build/styles/board.html`);
await bp.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
await bp.screenshot({ path: path.join(OUT, 'board.png'), fullPage: true });
await browser.close(); server.close();
console.log(`board: ${path.join(OUT, 'board.png')}\ntiles: ${OUT}`);
