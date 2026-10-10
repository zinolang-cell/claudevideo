// 07 Wireframe 3D: scrolling perspective grid floor and a rotating wireframe icosahedron.
let ctx, W, H;
const phi = (1 + Math.sqrt(5)) / 2;
const V = [[-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0], [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi], [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]];
const E = [];
for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
  const d = Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2]);
  if (Math.abs(d - 2) < 1e-6) E.push([i, j]);
}

export function init({ bg, W: w, H: h }) { W = w; H = h; ctx = bg.getContext('2d'); }

export function frame(t, { k }) {
  ctx.clearRect(0, 0, W, H);
  const a = 1 - k * .55, hy = H * .64, vx = W * .5;
  // floor: horizontal lines rush towards the viewer, verticals converge on the vanishing point
  ctx.lineWidth = 1;
  for (let i = 0; i < 24; i++) {
    const z = (i + (t * .7) % 1) / 24, y = hy + (H - hy) * Math.pow(z, 2.3);
    ctx.strokeStyle = `rgba(0,229,255,${(.06 + .5 * z) * a})`;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.strokeStyle = `rgba(0,229,255,${.22 * a})`;
  ctx.beginPath();
  for (let i = -26; i <= 26; i++) { ctx.moveTo(vx + i * 5, hy); ctx.lineTo(vx + i * 150, H); }
  ctx.stroke();
  const g = ctx.createLinearGradient(0, hy - 60, 0, hy + 4);
  g.addColorStop(0, 'rgba(255,43,214,0)'); g.addColorStop(1, `rgba(255,43,214,${.35 * a})`);
  ctx.fillStyle = g; ctx.fillRect(0, hy - 60, W, 64);
  // rotating solid (scenes only)
  if (k < .995) {
    const cx = 1590, cy = 805, R = 82, ay = t * .45, ax = t * .3 + .4;
    const pts = V.map(([x, y, z]) => {
      const X = x * Math.cos(ay) + z * Math.sin(ay); let Z = -x * Math.sin(ay) + z * Math.cos(ay);
      const Y = y * Math.cos(ax) - Z * Math.sin(ax); Z = y * Math.sin(ax) + Z * Math.cos(ax);
      const s = 4 / (4 + Z * .4);
      return [cx + X * R * s, cy + Y * R * s];
    });
    for (const [lw, al] of [[7, .12], [1.6, .95]]) {
      ctx.lineWidth = lw; ctx.strokeStyle = `rgba(0,229,255,${al * (1 - k)})`;
      ctx.beginPath(); for (const [i, j] of E) { ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); } ctx.stroke();
    }
    ctx.fillStyle = `rgba(255,43,214,${.95 * (1 - k)})`;
    for (const p of pts) ctx.fillRect(p[0] - 2.5, p[1] - 2.5, 5, 5);
  }
}
