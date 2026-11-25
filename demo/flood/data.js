// loading: every file is a gzip stream unpacked by the browser
export const U0 = -1900, V0 = -1000, W = 5120, H = 6400, NX = 640, NY = 800, DX = 8, MHHW = 0.695;
export async function gz(url, onp) {
  const r = await fetch(url); if (!r.ok) throw new Error('load ' + url);
  if (typeof DecompressionStream === 'undefined') throw new Error('nogzip');
  let s = r.body;
  if (onp) { const total = 1; s = s.pipeThrough(new TransformStream({ transform(c, k) { onp(c.byteLength); k.enqueue(c); } })); }
  return new Response(s.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
export function undelta(b, n, off = 0) { const u = new Uint8Array(b, off, n * 2), o = new Int32Array(n); let a = 0; for (let i = 0; i < n; i++) { a += ((u[i] | u[n + i] << 8) << 16) >> 16; o[i] = a; } return o; }
export function parseGrid(b) {
  const n = NX * NY, z = undelta(b, n), phi = new Uint8Array(b, n * 2, n), px = new Uint8Array(b, n * 3, n), py = new Uint8Array(b, n * 4, n), sea = new Uint8Array(b, n * 5, n), bed = new Float32Array(n * 4);
  for (let k = 0; k < n; k++) { bed[k * 4] = z[k] / 200; bed[k * 4 + 1] = sea[k] ? 2 : phi[k] / 255; bed[k * 4 + 2] = px[k] / 255; bed[k * 4 + 3] = py[k] / 255; }
  return { bed, sea };
}
export function parseGround(b) { // 1024 x 1280, 4 cm
  const w = 1024, h = 1280, n = w * h, u = new Uint8Array(b), o = new Float32Array(n); let first = 0;
  for (let j = 0; j < h; j++) { let a = 0; for (let i = 0; i < w; i++) { const k = j * w + i, d = ((u[k] | u[n + k] << 8) << 16) >> 16; if (i === 0) { if (j === 0) first = d; else first += d; a = first; } else a += d; o[k] = a / 25; } }
  return { w, h, g: o };
}
export function parseBld(b) {
  const dv = new DataView(b), nb = dv.getInt32(0, true), ne = dv.getInt32(4, true); let o = 8; const cnt = new Uint8Array(b, o, nb); o += nb; const base = new Uint8Array(b, o, nb); o += nb;
  const rd = (n, s) => { const a = s ? new Int16Array(n) : new Uint16Array(n); for (let i = 0; i < n; i++) a[i] = s ? dv.getInt16(o + i * 2, true) : dv.getUint16(o + i * 2, true); o += n * 2; return a; };
  const ht = rd(nb), x0 = rd(nb), y0 = rd(nb), dx = rd(ne, 1), dy = rd(ne, 1), X = new Float32Array(ne), Y = new Float32Array(ne), st = new Int32Array(nb + 1); let k = 0;
  for (let i = 0; i < nb; i++) { st[i] = k; let x = x0[i], y = y0[i]; for (let j = 0; j < cnt[i]; j++) { X[k] = x / 8 + U0; Y[k] = y / 8 + V0; x += dx[k]; y += dy[k]; k++; } } st[nb] = k;
  return { nb, ne, st, X, Y, base: Float32Array.from(base, v => v / 8 - 2), ht: Float32Array.from(ht, v => v / 4) };
}
