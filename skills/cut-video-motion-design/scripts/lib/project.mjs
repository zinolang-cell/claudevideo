// Loads project.json (one per video) and resolves paths relative to it.
import fs from 'node:fs';
import path from 'node:path';

export function loadProject(file = 'project.json') {
  const abs = path.resolve(file);
  const dir = path.dirname(abs);
  const P = JSON.parse(fs.readFileSync(abs, 'utf8'));
  P.dir = dir;
  if (P.source) {
    P.source = path.resolve(dir, P.source);
    P.output = path.resolve(dir, P.output || P.source.replace(/(\.\w+)$/, '_edit.mp4'));
  }
  P.buildDir = path.resolve(dir, P.buildDir || 'build');
  fs.mkdirSync(P.buildDir, { recursive: true });
  P.build = (...p) => path.join(P.buildDir, ...p);
  P.res = (p) => path.resolve(dir, p);
  P.fps = P.fps || 30;
  [P.W, P.H] = P.size || [1920, 1080];
  return P;
}
