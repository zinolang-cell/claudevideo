// Review page for the stills from `node render.mjs --stills`: plays them with the final audio mix, shows chapters,
// motion-design moments, zooms and cuts, and saves the viewer's notes to build/review/notes.json for the next round.
//   node review.mjs [project.json] [--port 5000]   start (port 5000, else the next free one) and print the address
//   node review.mjs --stop                          stop the review server of this project
// Listens on the loopback interface only, answers only to Host localhost / 127.0.0.1 / [::1] (no DNS rebinding)
// and serves nothing but the page and build/review/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadProject } from './lib/project.mjs';

const args = process.argv.slice(2);
const P = loadProject(args.find(a => a.endsWith('.json')) || 'project.json');
const opt = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : null; };
const PAGE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'review', 'index.html');
const DIR = P.build('review'), STATE = path.join(DIR, 'server.json'), NOTES = path.join(DIR, 'notes.json');
fs.mkdirSync(DIR, { recursive: true });

// ---- one server per project: report the running one, or stop it --------------------------------------------------------------
// (plain http without keep-alive: exiting while fetch() still holds sockets trips a libuv assertion on Windows)
const call = (p, path_, method = 'GET', headers = {}) => new Promise(ok => {
  const req = http.request({ host: '127.0.0.1', port: p, path: path_, method, headers, agent: false, timeout: 1500 }, res => {
    let body = ''; res.setEncoding('utf8'); res.on('data', d => { body += d; }); res.on('end', () => ok({ status: res.statusCode, body }));
  });
  req.on('timeout', () => req.destroy()); req.on('error', () => ok(null)); req.end();
});
const prev = (() => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return null; } })();
const alive = prev ? await call(prev.port, '/__review').then(r => { try { return JSON.parse(r.body).dir === P.dir; } catch { return false; } }) : false;
if (args.includes('--stop')) {
  if (alive) await call(prev.port, '/__stop', 'POST', { 'x-review-token': prev.token });
  console.log(alive ? `stopped the review server on port ${prev.port}` : 'no review server is running for this project');
  process.exit(0);
}
if (alive) { console.log(`review page already running: http://localhost:${prev.port}/`); process.exit(0); }
if (!fs.existsSync(path.join(DIR, 'manifest.json'))) console.warn('no stills yet: run node render.mjs --stills (the page shows them once they exist)');

// ---- notes: [{ id, t (output s), src (source s, as in timeline.mjs), time, srcTime, text, done, created }] -------------------------
const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
const readNotes = () => { try { const n = JSON.parse(fs.readFileSync(NOTES, 'utf8')); return Array.isArray(n) ? n : []; } catch { return []; } };
const writeNotes = n => { fs.writeFileSync(NOTES + '.tmp', JSON.stringify(n, null, 2)); fs.renameSync(NOTES + '.tmp', NOTES); return n; };
function notesOp(o) {
  const notes = readNotes(), i = notes.findIndex(n => n.id === o.id), text = String(o.text ?? '').trim().slice(0, 4000);
  if (o.op === 'add' && text && Number.isFinite(+o.t)) {
    const t = +(+o.t).toFixed(3), src = Number.isFinite(+o.src) ? +(+o.src).toFixed(3) : null;
    notes.push({ id: crypto.randomBytes(4).toString('hex'), t, src, time: fmt(t), srcTime: src == null ? null : fmt(src), text, done: false, created: new Date().toISOString() });
    notes.sort((a, b) => a.t - b.t);
  } else if (o.op === 'edit' && i >= 0 && text) notes[i].text = text;
  else if (o.op === 'done' && i >= 0) notes[i].done = !!o.done;
  else if (o.op === 'delete' && i >= 0) notes.splice(i, 1);
  else return null;
  return writeNotes(notes.slice(-500));
}

// ---- http ------------------------------------------------------------------------------------------------------------------------
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.wav': 'audio/wav' };
const HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const token = crypto.randomBytes(16).toString('hex');
let port = 0;
const send = (res, code, body, type = 'text/plain; charset=utf-8') => {
  res.writeHead(code, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' }); res.end(body);
};
function serveFile(req, res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'not found');
    const headers = { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': cache, 'Accept-Ranges': 'bytes' };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {                                   // ranges let the audio element seek
      const start = m[1] ? +m[1] : Math.max(0, st.size - +m[2]), end = m[1] && m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      return req.method === 'HEAD' ? res.end() : fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, 'Content-Length': st.size });
    return req.method === 'HEAD' ? res.end() : fs.createReadStream(file).pipe(res);
  });
}
function handler(req, res) {
  if (!HOSTS.has((req.headers.host || '').toLowerCase().replace(/:\d+$/, ''))) return send(res, 403, 'forbidden');
  const url = new URL(req.url, 'http://x');
  let p; try { p = decodeURIComponent(url.pathname); } catch { return send(res, 400, 'bad request'); }
  if (/[\\\0]/.test(p)) return send(res, 400, 'bad request');
  if (req.method === 'POST') {
    const origin = req.headers.origin;
    if (origin && ![`http://localhost:${port}`, `http://127.0.0.1:${port}`, `http://[::1]:${port}`].includes(origin)) return send(res, 403, 'forbidden');
    if (p === '/__stop' && req.headers['x-review-token'] === token) { send(res, 200, 'stopping'); return setTimeout(() => process.exit(0), 50); }
    if (p !== '/notes') return send(res, 404, 'not found');
    if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return send(res, 415, 'expected application/json');
    let body = '';
    req.on('data', c => { body += c; if (body.length > 64 * 1024) req.destroy(); });
    req.on('end', () => {
      let o; try { o = JSON.parse(body); } catch { return send(res, 400, 'bad json'); }
      const notes = o && typeof o === 'object' ? notesOp(o) : null;
      return notes ? send(res, 200, JSON.stringify(notes), TYPES['.json']) : send(res, 400, 'unknown or incomplete operation');
    });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method not allowed');
  if (p === '/' || p === '/index.html') return serveFile(req, res, PAGE, 'no-cache');
  if (p === '/notes') return send(res, 200, JSON.stringify(readNotes()), TYPES['.json']);
  if (p === '/__review') return send(res, 200, JSON.stringify({ dir: P.dir }), TYPES['.json']);
  if (p.startsWith('/data/')) {
    const rel = path.posix.normalize(p.slice(6));
    if (rel.startsWith('..') || path.posix.isAbsolute(rel) || /(^|\/)server\.json$|\.tmp$/.test(rel)) return send(res, 404, 'not found');
    const file = path.join(DIR, ...rel.split('/'));
    if (!file.startsWith(DIR + path.sep)) return send(res, 404, 'not found');
    // stills and audio are requested with ?v=<render version>, so a new render gets new URLs and old ones can be cached
    return serveFile(req, res, file, url.searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'no-cache');
  }
  return send(res, 404, 'not found');
}

// ---- listen on 127.0.0.1 and ::1 (browsers may resolve "localhost" to either), port 5000 or the next free one -------------------
const listen = (srv, p, host) => new Promise((ok, fail) => {
  srv.once('error', fail); srv.listen(p, host, () => { srv.off('error', fail); ok(srv); });
});
async function bind(p) {
  const v4 = await listen(http.createServer(handler), p, '127.0.0.1');
  try { await listen(http.createServer(handler), v4.address().port, '::1'); } catch (e) {
    if (e.code === 'EADDRINUSE') { v4.close(); throw e; }       // something else answers on localhost:p over IPv6
  }                                                             // (no IPv6 loopback on this machine: fine)
  return v4.address().port;
}
const want = +(opt('port') || P.review?.port || 5000);
for (const p of [...Array.from({ length: 30 }, (_, i) => want + i), 0]) {
  try { port = await bind(p); break; } catch (e) { if (!['EADDRINUSE', 'EACCES'].includes(e.code)) throw e; }
}
if (!port) { console.error('could not find a free port'); process.exit(1); }
fs.writeFileSync(STATE, JSON.stringify({ port, token, pid: process.pid, dir: P.dir, started: new Date().toISOString() }, null, 2));
console.log(`review page: http://localhost:${port}/${port !== want ? `   (port ${want} was busy)` : ''}`);
console.log(`notes are saved to ${NOTES}`);
console.log('stop it with: node review.mjs --stop');
