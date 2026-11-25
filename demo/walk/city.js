// The picture of Midtown from straight above: asphalt, blocks, roofs and the shadows of the real buildings.
import { AVE, ST, FT } from "./engine.js";
// streets outside the walking area, only for the picture
const XA = [{ x: -681.4, w: 70 }, { x: -406.9, w: 60 }, ...AVE, { x: 1245.6, w: 70 }];
const XS = [...[40, 41, 42, 43, 44, 45].map((n, i) => ({ n, y: 407.1 - (45 - n + 1) * 79.6 - (n <= 42 ? 8 : 0), w: n === 42 ? 60 : 32 })), ...ST, ...[61, 62, 63, 64].map(n => ({ n, y: 1532.5 + (n - 60) * 79.4, w: 34 }))];
export const PARK = { x0: -900, y0: 1452.7 + 35 * FT / 2, x1: 178.7 - 54 * FT / 2, y1: 2400 };   // Central Park's south-east corner
let B = null, Bz = 0;
export async function loadCity(url) {
  const r = await fetch(url), ds = new Response(r.body.pipeThrough(new DecompressionStream("gzip")));
  const d = new DataView(await ds.arrayBuffer()); let o = 4; const n = d.getUint32(0, true); B = [];
  for (let i = 0; i < n; i++) {
    const h = d.getUint16(o, true) / 2, k = d.getUint16(o + 2, true); o += 4; const p = new Float32Array(k * 2); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, A = 0;
    for (let j = 0; j < k; j++) { const x = p[j * 2] = d.getInt16(o, true) / 2, y = p[j * 2 + 1] = d.getInt16(o + 2, true) / 2; o += 4; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let j = 0, m = k - 1; j < k; m = j++) A += p[m * 2] * p[j * 2 + 1] - p[j * 2] * p[m * 2 + 1];
    if (A < 0) { for (let i2 = 0, j2 = k - 1; i2 < j2; i2++, j2--) { const a = p[i2 * 2], b = p[i2 * 2 + 1]; p[i2 * 2] = p[j2 * 2]; p[i2 * 2 + 1] = p[j2 * 2 + 1]; p[j2 * 2] = a; p[j2 * 2 + 1] = b; } }
    B.push({ h, p, x0, x1, y0, y1 }); Bz = Math.max(Bz, h);
  }
  return B.length;
}
export const hasCity = () => !!B;
// grey levels of the printed map; every theme is a ramp over them
const G = { asphaltSh: 0, asphalt: 46, walkSh: 104, sh: 150, walk: 182, roof: [226, 214, 240, 204] };
const g = v => `rgb(${v},${v},${v})`;
const RAMP = {
  light: [[0, 31, 35, 40], [46, 60, 61, 60], [104, 120, 130, 139], [150, 152, 165, 176], [182, 202, 199, 189], [204, 230, 228, 220], [226, 240, 238, 230], [240, 250, 248, 241], [255, 254, 253, 248]],
  dark: [[0, 12, 14, 17], [46, 26, 29, 32], [104, 40, 46, 51], [150, 50, 58, 65], [182, 60, 67, 72], [204, 88, 97, 103], [226, 102, 111, 117], [240, 118, 127, 132], [255, 134, 142, 146]]
};
export function lut(theme) {
  const R = RAMP[theme], o = new Uint8ClampedArray(256 * 3); let j = 0;
  for (let i = 0; i < 256; i++) { while (j < R.length - 2 && R[j + 1][0] < i) j++; const A = R[j], Z = R[j + 1], f = Math.max(0, Math.min(1, (i - A[0]) / (Z[0] - A[0]))); for (let c = 0; c < 3; c++) o[i * 3 + c] = A[c + 1] + (Z[c + 1] - A[c + 1]) * f; }
  return o;
}
export function tint(ctx, W, H, theme) {
  const L = lut(theme), u = new Uint32Array(256); for (let i = 0; i < 256; i++) u[i] = 0xff000000 | L[i * 3 + 2] << 16 | L[i * 3 + 1] << 8 | L[i * 3];
  for (let y = 0; y < H; y += 256) { const im = ctx.getImageData(0, y, W, Math.min(256, H - y)), d = new Uint32Array(im.data.buffer); for (let i = 0; i < d.length; i++) d[i] = u[d[i] & 255]; ctx.putImageData(im, 0, y); }
}
export const THEMES = {}; for (const t of ["light", "dark", "grey"]) { const L = t === "grey" ? null : lut(t), c = v => L ? `rgb(${L[v * 3]},${L[v * 3 + 1]},${L[v * 3 + 2]})` : g(v); THEMES[t] = { asphalt: c(G.asphalt), asphaltSh: c(G.asphaltSh), walk: c(G.walk), walkSh: c(G.walkSh), sh: c(G.sh), roof: G.roof.map(c), edge: t === "dark" ? "rgba(0,0,0,.35)" : "rgba(20,30,36,.16)" }; }
// draw the city into ctx whose transform is already world metres (y up handled by caller through X,Y functions)
export function drawCity(ctx, view, theme, sun = { x: .95, y: .62 }) {
  const T = THEMES[theme], { X, Y, k, W, H, x0, x1, y0, y1 } = view;
  const R = (a, b, c, d) => ctx.rect(X(a), Y(d), (c - a) * k, (d - b) * k);
  ctx.fillStyle = T.asphalt; ctx.fillRect(0, 0, W, H);
  // the pavement of every block
  const blocks = [];
  for (let i = -1; i < XA.length; i++) for (let j = -1; j < XS.length; j++) {
    const a = i < 0 ? -1200 : XA[i].x + XA[i].w * FT / 2, c = i + 1 >= XA.length ? 1800 : XA[i + 1].x - XA[i + 1].w * FT / 2;
    const b = j < 0 ? -400 : XS[j].y + XS[j].w * FT / 2, d = j + 1 >= XS.length ? 2400 : XS[j + 1].y - XS[j + 1].w * FT / 2;
    if (a < PARK.x1 && b >= PARK.y0) continue; if (c < x0 || a > x1 || d < y0 || b > y1) continue; blocks.push([a, b, c, d]);
  }
  blocks.push([PARK.x0, PARK.y0, PARK.x1, PARK.y1]);
  ctx.beginPath(); const cr = Math.min(4 * k, 12); for (const [a, b, c, d] of blocks) ctx.roundRect(X(a), Y(d), (c - a) * k, (d - b) * k, cr); ctx.fillStyle = T.walk; ctx.fill();
  if (!B) return;
  const vis = []; const rx = Bz * sun.x, ry = Bz * sun.y;
  for (const b of B) if (b.x1 + Math.max(0, b.h * sun.x) > x0 && b.x0 + Math.min(0, b.h * sun.x) < x1 && b.y1 + Math.max(0, b.h * sun.y) > y0 && b.y0 + Math.min(0, b.h * sun.y) < y1) vis.push(b);
  const path = (c, b) => { const p = b.p; c.moveTo(X(p[0]), Y(p[1])); for (let j = 2; j < p.length; j += 2) c.lineTo(X(p[j]), Y(p[j + 1])); c.closePath(); };
  const shadow = (c, b, z) => {      // body moved by the shadow vector, plus the strip swept by every edge
    const dx = (b.h - z) * sun.x * k, dy = -(b.h - z) * sun.y * k, p = b.p, n = p.length; 
    c.moveTo(X(p[0]) + dx, Y(p[1]) + dy); for (let j = 2; j < n; j += 2) c.lineTo(X(p[j]) + dx, Y(p[j + 1]) + dy); c.closePath();
    for (let j = 0; j < n; j += 2) {
      const ax = X(p[j]), ay = Y(p[j + 1]), q = (j + 2) % n, bx = X(p[q]), by = Y(p[q + 1]);
      const cr2 = (bx - ax) * dy - (by - ay) * dx; // keep every quad turning the same way as the body (body is clockwise on screen)
      if (cr2 < 0) { c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(bx + dx, by + dy); c.lineTo(ax + dx, ay + dy); } else { c.moveTo(ax, ay); c.lineTo(ax + dx, ay + dy); c.lineTo(bx + dx, by + dy); c.lineTo(bx, by); } c.closePath();
    }
  };
  // shadows on the ground: asphalt and pavement have their own shade
  const sh = new Path2D(); for (const b of vis) shadow(sh, b, 0);
  ctx.save(); ctx.fillStyle = T.asphaltSh; ctx.fill(sh); ctx.beginPath(); for (const [a, b, c, d] of blocks) ctx.roundRect(X(a), Y(d), (c - a) * k, (d - b) * k, cr); ctx.clip(); ctx.fillStyle = T.walkSh; ctx.fill(sh); ctx.restore();
  // roofs, low to high; each height band receives the shadows of everything taller
  const bands = [12, 20, 32, 50, 75, 110, 160, 230, 1e9]; let i0 = 0; const hi = [...vis];
  for (let q = 0; q < bands.length; q++) {
    const lo = q ? bands[q - 1] : 0, L = vis.filter(b => b.h > lo && b.h <= bands[q]); if (!L.length) continue;
    L.forEach((b, i) => { ctx.beginPath(); path(ctx, b); ctx.fillStyle = T.roof[(Math.round(b.p[0] * 7 + b.p[1] * 3) & 1023) % 4]; ctx.fill(); });
    const z = (lo + Math.min(bands[q], lo * 1.6 + 8)) / 2, S = new Path2D(); let any = 0; for (const b of vis) if (b.h > Math.min(bands[q], z + 10) ) { shadow(S, b, z); any = 1; }
    const clip = new Path2D(); for (const b of L) path(clip, b);
    if (any) { ctx.save(); ctx.clip(clip); ctx.fillStyle = T.sh; ctx.fill(S); ctx.restore(); }
    if (k > .9) { ctx.strokeStyle = T.edge; ctx.lineWidth = Math.min(1.2, k * .35); ctx.stroke(clip); }
  }
}
