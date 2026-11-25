// decoded band -> GPU arrays, in 400 m chunks (runs in the worker)
import earcut from './vendor/earcut.js';
export const CH = 400;
export function kind(h, year, src, r) { // painted material: 0 brick 1 brown brick 2 limestone 3 white 4 glass 5 concrete
  if ((year >= 1955 && h > 70 && r < .72) || (year >= 1985 && h > 45 && r < .7) || (src && h > 60)) return 4;
  if (year >= 1950) return r < .3 ? 5 : r < .55 ? 3 : r < .8 ? 0 : 1;
  return h > 60 ? (r < .6 ? 2 : r < .8 ? 1 : 3) : r < .36 ? 0 : r < .6 ? 1 : r < .84 ? 2 : 3; }
export function build(b, txt) {
  const chunks = new Map();
  for (let k = 0; k < b.n; k++) {
    const o = k * 5, key = Math.floor((b.bb[o] + b.bb[o + 2]) / 2 / CH) + ',' + Math.floor((b.bb[o + 1] + b.bb[o + 3]) / 2 / CH); let c = chunks.get(key); if (!c) chunks.set(key, c = []); c.push(k); }
  const out = [];
  for (const [key, list] of chunks) {
    const [cx, cy] = key.split(',').map(v => (+v + .5) * CH), ox = cx * 10, oy = cy * 10, W = [], R = []; let bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const k of list) {
      const id = b.id0 + k, q = k * 5, base = b.base[k] - 30, h = b.bb[q + 4] - b.base[k] / 10, rnd = ((b.bin[k] * 2654435761) >>> 0) / 4294967296, yr = txt ? +(txt[k] || '').split('|')[2] || 0 : 0, mat = kind(h, yr, b.src[k], rnd) | (Math.floor(rnd * 997 % 1 * 255) << 8);
      bb = [Math.min(bb[0], b.bb[q]), Math.min(bb[1], b.bb[q + 1]), Math.min(bb[2], base / 10), Math.max(bb[3], b.bb[q + 2]), Math.max(bb[4], b.bb[q + 3]), Math.max(bb[5], b.bb[q + 4])];
      const edges = new Map();
      for (let p = b.bp[k]; p < b.bp[k + 1]; p++) for (let v = b.pv[p], e = b.pv[p + 1], w = e - 1; v < e; w = v++) edges.set(b.x[w] + ',' + b.y[w] + ',' + b.x[v] + ',' + b.y[v], [b.z[w], b.z[v]]);
      for (let p = b.bp[k]; p < b.bp[k + 1]; p++) {
        const s = b.pv[p], e = b.pv[p + 1], pts = [];
        for (let v = s, w = e - 1; v < e; w = v++) { pts.push(b.x[v], b.y[v]);
          if (b.x[v] === b.x[w] && b.y[v] === b.y[w]) continue;
          const m = edges.get(b.x[v] + ',' + b.y[v] + ',' + b.x[w] + ',' + b.y[w]); let bot = base; if (m) { if (m[1] >= b.z[w] && m[0] >= b.z[v]) continue; bot = Math.min(m[0], m[1]); }
          W.push(b.x[w] - ox, b.y[w] - oy, b.x[v] - ox, b.y[v] - oy, b.z[w], b.z[v], bot, b.base[k], id, mat); }
        const tri = earcut(pts); let nx = 0, ny = 0, nz = 0; for (let v = s, w = e - 1; v < e; w = v++) { nx += (b.y[w] - b.y[v]) * (b.z[w] + b.z[v]); ny += (b.z[w] - b.z[v]) * (b.x[w] + b.x[v]); nz += (b.x[w] - b.x[v]) * (b.y[w] + b.y[v]); }
        const l = Math.hypot(nx, ny, nz) || 1; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; } const N = [nx / l * 127 | 0, ny / l * 127 | 0, nz / l * 127 | 0];
        for (const t of tri) R.push(b.x[s + t] - ox, b.y[s + t] - oy, b.z[s + t], id, N[0], N[1], N[2], mat);
      }
    }
    const nw = W.length / 10, nr = R.length / 8, wb = new ArrayBuffer(nw * 24), rb = new ArrayBuffer(nr * 20), wi = new Int16Array(wb), wu = new Uint32Array(wb), rs = new Int16Array(rb), rn = new Int8Array(rb), ru = new Uint32Array(rb);
    for (let i = 0; i < nw; i++) { for (let j = 0; j < 8; j++) wi[i * 12 + j] = W[i * 10 + j]; wu[i * 6 + 4] = W[i * 10 + 8]; wu[i * 6 + 5] = W[i * 10 + 9]; }
    for (let i = 0; i < nr; i++) { const q = i * 8; rs[i * 10] = R[q]; rs[i * 10 + 1] = R[q + 1]; rs[i * 10 + 2] = R[q + 2]; rn[i * 20 + 8] = R[q + 4]; rn[i * 20 + 9] = R[q + 5]; rn[i * 20 + 10] = R[q + 6]; ru[i * 5 + 3] = R[q + 3]; ru[i * 5 + 4] = R[q + 7]; }
    out.push({ x: cx, y: cy, bb, wb, rb, nw, nr });
  }
  return out;
}
