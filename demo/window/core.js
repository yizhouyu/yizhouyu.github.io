// Geometry that decides. No DOM: used by the worker and by tests/.
// Frame: metres; +Y uptown (28.9° east of grid north), +X across the island to the east, z above the survey's zero.
const R = Math.PI / 180;
export const BEAR = 28.9 + .010988579;           // true bearing of +Y
export const toTrue = a => (a + BEAR + 720) % 360, toLoc = a => (a - BEAR + 720) % 360;   // azimuth: local (from +Y, clockwise) <-> true
// WGS84 lon/lat -> local metres: EPSG:2263 Lambert conformal conic (GRS80), then turned
const a = 6378137, f = 1 / 298.257222101, e = Math.sqrt(2 * f - f * f), FT = 1200 / 3937;
const m_ = p => Math.cos(p) / Math.sqrt(1 - e * e * Math.sin(p) ** 2), t_ = p => Math.tan(Math.PI / 4 - p / 2) / ((1 - e * Math.sin(p)) / (1 + e * Math.sin(p))) ** (e / 2);
const p1 = (40 + 40 / 60) * R, p2 = (41 + 2 / 60) * R, p0 = (40 + 10 / 60) * R, n_ = (Math.log(m_(p1)) - Math.log(m_(p2))) / (Math.log(t_(p1)) - Math.log(t_(p2))), F = m_(p1) / (n_ * t_(p1) ** n_), r0 = a * F * t_(p0) ** n_;
const E0 = 301418.7165774209, N0 = 65176.712000367435, CA = Math.cos(28.9 * R), SA = Math.sin(28.9 * R);
export function llToLocal(lon, lat) { const r = a * F * t_(lat * R) ** n_, th = n_ * (lon + 74) * R, E = r * Math.sin(th) + 984250 * FT - E0, N = r0 - r * Math.cos(th) - N0; return [E * CA - N * SA, E * SA + N * CA]; }
export function localToLl(x, y) { let lon = -73.9832, lat = 40.7536; for (let i = 0; i < 6; i++) { const [u, v] = llToLocal(lon, lat), h = 1e-4, [ux, vx] = llToLocal(lon + h, lat), [uy, vy] = llToLocal(lon, lat + h), A = (ux - u) / h, B = (uy - u) / h, C = (vx - v) / h, D = (vy - v) / h, d = A * D - B * C, p = x - u, q = y - v; lon += (p * D - q * B) / d; lat += (q * A - p * C) / d; } return [lon, lat]; }

// --- packed buildings (src/pack.py) -> typed arrays, 0.1 m units
export function decode(u8) {
  let i = 0; const u = () => { let v = 0, m = 1, b; do { b = u8[i++]; v += (b & 127) * m; m *= 128; } while (b > 127); return v; }, s = () => { const v = u(); return v & 1 ? -(v + 1) / 2 : v / 2; };
  const n = u(), bin = new Int32Array(n), src = new Uint8Array(n), base = new Int16Array(n), bp = new Int32Array(n + 1), pv = [0], X = [], Y = [], Z = []; let pb = 0, pz = 0, px = 0, py = 0;
  for (let k = 0; k < n; k++) {
    bin[k] = pb += s(); src[k] = u(); base[k] = pz += s(); const ox = px += s(), oy = py += s(), np = u(); let lz = pz, lx = ox, ly = oy;
    for (let p = 0; p < np; p++) { const h = u(), c = h >> 1; let z = lz += s(); const q = X.length;
      for (let j = 0; j < c; j++) { lx += s(); ly += s(); X.push(lx); Y.push(ly); Z.push(z); }
      if (h & 1) for (let j = 1; j < c; j++) Z[q + j] = z + s(); pv.push(X.length); }
    bp[k + 1] = pv.length - 1;
  }
  const b = { n, bin, src, base, bp, pv: Int32Array.from(pv), x: Int32Array.from(X), y: Int32Array.from(Y), z: Int16Array.from(Z) };
  b.bb = new Float32Array(n * 5); // x0 y0 x1 y1 top, metres
  for (let k = 0; k < n; k++) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, t = -1e9; for (let v = b.pv[bp[k]]; v < b.pv[bp[k + 1]]; v++) { x0 = Math.min(x0, X[v]); x1 = Math.max(x1, X[v]); y0 = Math.min(y0, Y[v]); y1 = Math.max(y1, Y[v]); t = Math.max(t, Z[v]); } b.bb.set([x0 / 10, y0 / 10, x1 / 10, y1 / 10, t / 10], k * 5); }
  return b;
}
// A city = list of bands; building id = band.id0 + index
export class City {
  constructor() { this.bands = []; this.n = 0; this.gone = new Set(); }
  add(b, name) { b.id0 = this.n; b.name = name; this.n += b.n; this.bands.push(b); return b; }
  band(id) { return this.bands.find(b => id >= b.id0 && id < b.id0 + b.n); }
  *near(x, y, r) { for (const b of this.bands) { const g = b.bb; for (let k = 0, o = 0; k < b.n; k++, o += 5) if (g[o] - r < x && g[o + 2] + r > x && g[o + 1] - r < y && g[o + 3] + r > y) yield [b, k]; } }
  // height of the model at a point (highest roof over it) -> {z, id} or null
  at(x, y, only) { let best = null; for (const [b, k] of this.near(x, y, .01)) { const id = b.id0 + k; if (this.gone.has(id) || (only && !only(id))) continue; for (let p = b.bp[k]; p < b.bp[k + 1]; p++) if (inPoly(b, p, x * 10, y * 10)) { const z = planeZ(b, p, x * 10, y * 10) / 10; if (!best || z > best.z) best = { z, id }; } } return best; }
  nearest(x, y, r = 2) { let best = null; for (const [b, k] of this.near(x, y, r)) { if (this.gone.has(b.id0 + k)) continue; for (let p = b.bp[k]; p < b.bp[k + 1]; p++) for (let v = b.pv[p], e = b.pv[p + 1], w = e - 1; v < e; w = v++) { const d = segD(b.x[w] / 10, b.y[w] / 10, b.x[v] / 10, b.y[v] / 10, x, y); if (d < r && (!best || d < best.d)) best = { d, id: b.id0 + k }; } } return best; }
  // first wall/roof hit by a ray o + t d
  ray(o, d, tmax = 1e5) {
    let best = null; const [ox, oy, oz] = o, [dx, dy, dz] = d, hl = Math.hypot(dx, dy) || 1e-9;
    for (const b of this.bands) { const g = b.bb; for (let k = 0, q = 0; k < b.n; k++, q += 5) {
      if (this.gone.has(b.id0 + k)) continue;
      let t0 = 0, t1 = best ? best.t : tmax; const base = b.base[k] / 10 - 4; // slab test
      if (Math.abs(dx) > 1e-9) { const a = (g[q] - ox) / dx, c = (g[q + 2] - ox) / dx; t0 = Math.max(t0, Math.min(a, c)); t1 = Math.min(t1, Math.max(a, c)); } else if (ox < g[q] || ox > g[q + 2]) continue;
      if (Math.abs(dy) > 1e-9) { const a = (g[q + 1] - oy) / dy, c = (g[q + 3] - oy) / dy; t0 = Math.max(t0, Math.min(a, c)); t1 = Math.min(t1, Math.max(a, c)); } else if (oy < g[q + 1] || oy > g[q + 3]) continue;
      if (Math.abs(dz) > 1e-9) { const a = (base - oz) / dz, c = (g[q + 4] - oz) / dz; t0 = Math.max(t0, Math.min(a, c)); t1 = Math.min(t1, Math.max(a, c)); }
      if (t0 > t1 + .2) continue;
      for (let p = b.bp[k]; p < b.bp[k + 1]; p++) { for (let v = b.pv[p], e = b.pv[p + 1], w = e - 1; v < e; w = v++) {
        const x0 = b.x[w] / 10, y0 = b.y[w] / 10, ex = b.x[v] / 10 - x0, ey = b.y[v] / 10 - y0, den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) continue;
        const t = ((x0 - ox) * ey - (y0 - oy) * ex) / den; if (t <= .01 || (best && t >= best.t)) continue; const u = ((x0 - ox) * dy - (y0 - oy) * dx) / den; if (u < 0 || u > 1) continue;
        const z = oz + dz * t, zt = (b.z[w] + (b.z[v] - b.z[w]) * u) / 10; if (z > zt || z < base) continue;
        const l = Math.hypot(ex, ey); best = { t, id: b.id0 + k, wall: true, x: ox + dx * t, y: oy + dy * t, z, nx: ey / l, ny: -ex / l, len: l, u: u * l, top: zt }; }
        if (dz < -1e-6) { const c = roofHit(b, p, ox, oy, oz, dx, dy, dz); if (c > .01 && (!best || c < best.t)) best = { t: c, id: b.id0 + k, wall: false, x: ox + dx * c, y: oy + dy * c, z: oz + dz * c }; } }
    } }
    return best;
  }
  /* What a point at a wall can see. o = [x,y,z], az = local azimuth of the wall's outward direction. N bins over -90..+90.
     Every roof polygon is a solid to the ground; over a plane the angle of a ray is monotone, so its edges give the exact skyline.
     top[i] = tan of the highest thing in direction i, id[i] whose, sec[i] = the same if that building were gone. parts = visible pieces, near to far. */
  horizon(o, az, { N = 1800, parts = false, gone = this.gone } = {}) {
    const [ox, oy, oz] = o, sa = Math.sin(az * R), ca = Math.cos(az * R), top = new Float32Array(N), id = new Int32Array(N).fill(-1), sec = new Float32Array(N), id2 = new Int32Array(N).fill(-1);
    const cur = new Float32Array(N), dn = new Float32Array(N), nrm = new Float32Array(N), tanB = new Float32Array(N), cosB = new Float32Array(N);
    for (let i = 0; i < N; i++) { const t = (-90 + (i + .5) * 180 / N) * R; tanB[i] = Math.sin(t); cosB[i] = Math.cos(t); }
    const pk = new Int32Array(parts ? N : 0).fill(-1), ps = new Int32Array(parts ? N : 0).fill(-1), pc = new Float32Array(parts ? N : 0); let pb = null; const L = parts ? Array.from({ length: N }, () => []) : null, inv = N / Math.PI;
    // candidates, nearest first: a later building that cannot rise above the second skyline anywhere in its span is skipped
    const cand = []; for (const b of this.bands) { if (!b.tiles) tiles(b); for (const t of b.tiles) { const tz = t.top - oz; if (tz <= 0) continue; const tx = Math.max(t.x0, Math.min(ox, t.x1)) - ox, ty = Math.max(t.y0, Math.min(oy, t.y1)) - oy; if (tz * tz < (tx * tx + ty * ty) * 4e-5) continue; if (Math.max((t.x0 - ox) * sa, (t.x1 - ox) * sa) + Math.max((t.y0 - oy) * ca, (t.y1 - oy) * ca) <= .02) continue;
      const g = b.bb; for (const k of t.list) { const q = k * 5, hz = g[q + 4] - oz; if (hz <= 0 || gone.has(b.id0 + k)) continue; const cx = Math.max(g[q], Math.min(ox, g[q + 2])) - ox, cy = Math.max(g[q + 1], Math.min(oy, g[q + 3])) - oy, d2 = cx * cx + cy * cy; if (hz * hz < d2 * 4e-5) continue; if (Math.max((g[q] - ox) * sa, (g[q + 2] - ox) * sa) + Math.max((g[q + 1] - oy) * ca, (g[q + 3] - oy) * ca) <= .02) continue; cand.push([d2, b, k]); } } }
    cand.sort((p, q) => p[0] - q[0]);
    for (const [d2, b, k] of cand) { { const g = b.bb, q = k * 5, hz = g[q + 4] - oz, bid = b.id0 + k;
      if (d2 > 1) { const mt = hz / Math.sqrt(d2); let l = 1e9, h = -1e9, ok = true; for (let c = 0; c < 4; c++) { const px = g[q + (c & 1 ? 2 : 0)] - ox, py = g[q + (c & 2 ? 3 : 1)] - oy, u = px * ca - py * sa, f = px * sa + py * ca; if (f < .5) { ok = false; break; } const t = Math.atan2(u, f) * inv + N / 2; if (t < l) l = t; if (t > h) h = t; } if (ok) { let hide = true; for (let i = Math.max(0, Math.floor(l) - 1), e = Math.min(N - 1, Math.ceil(h) + 1); i <= e; i++) if (sec[i] < mt) { hide = false; break; } if (hide) continue; } }
      let lo = N, hi = -1;
      for (let p = b.bp[k]; p < b.bp[k + 1]; p++) { let pl = N, ph = -1; for (let v = b.pv[p], e = b.pv[p + 1], w = e - 1; v < e; w = v++) {
        let ax = b.x[w] / 10 - ox, ay = b.y[w] / 10 - oy, bx = b.x[v] / 10 - ox, by = b.y[v] / 10 - oy, ah = b.z[w] / 10 - oz, bh = b.z[v] / 10 - oz;
        let au = ax * ca - ay * sa, af = ax * sa + ay * ca, bu = bx * ca - by * sa, bf = bx * sa + by * ca; // u right, f out
        if (af < .02 && bf < .02) continue;
        if (af < .02) { const t = (.02 - af) / (bf - af); au += (bu - au) * t; ah += (bh - ah) * t; af = .02; } else if (bf < .02) { const t = (.02 - bf) / (af - bf); bu += (au - bu) * t; bh += (ah - bh) * t; bf = .02; }
        let i0 = Math.atan2(au, af) * inv + N / 2 - .5, i1 = Math.atan2(bu, bf) * inv + N / 2 - .5; const fw = i0 < i1; if (!fw) { const t = i0; i0 = i1; i1 = t; }
        let s0 = Math.ceil(i0), s1 = Math.floor(i1); if (s0 > s1) continue; if (s0 < 0) s0 = 0; if (s1 > N - 1) s1 = N - 1;
        const du = bu - au, df = bf - af, dh = bh - ah, cr = au * df - af * du;
        for (let i = s0; i <= s1; i++) { const den = tanB[i] * df - cosB[i] * du; if (Math.abs(den) < 1e-9) continue; const t = cr / den, l = Math.abs(du) > Math.abs(df) ? (tanB[i] * t - au) / du : (cosB[i] * t - af) / df, tn = (ah + dh * l) / t;
          if (i < lo) { for (let j = hi < 0 ? i : i; j < (hi < 0 ? i + 1 : lo); j++) cur[j] = -9; lo = i; if (hi < 0) hi = i; } if (i > hi) { for (let j = hi + 1; j <= i; j++) cur[j] = -9; hi = i; }
          if (tn > cur[i]) cur[i] = tn; if (L) { if (pk[i] !== p || pb !== b || ps[i] !== k) { pk[i] = p; ps[i] = k; pc[i] = -9; dn[i] = 1e9; } if (tn > pc[i]) pc[i] = tn; if (t < dn[i]) { dn[i] = t; nrm[i] = fw ? Math.atan2(df, -du) : Math.atan2(-df, du); } if (i < pl) pl = i; if (i > ph) ph = i; } } }
        if (L) { pb = b; for (let i = pl; i <= ph; i++) if (pk[i] === p && ps[i] === k && pc[i] > 0) L[i].push([dn[i], pc[i], bid, nrm[i]]); } }
      for (let i = lo; i <= hi; i++) { const t = cur[i]; if (t <= 0) continue; if (t > top[i]) { sec[i] = top[i]; id2[i] = id[i]; top[i] = t; id[i] = bid; } else if (t > sec[i]) { sec[i] = t; id2[i] = bid; } }
    } }
    const out = { N, az, o, top, id, sec, id2 };
    if (L) { const P = [], st = new Int32Array(N + 1); for (let i = 0; i < N; i++) { L[i].sort((p, q) => p[0] - q[0]); let h = 0; for (const r of L[i]) if (r[1] > h + 1e-4) { P.push(r[0], r[1], r[2], r[3]); h = r[1]; } st[i + 1] = P.length / 4; } out.parts = Float32Array.from(P); out.st = st; }
    return out;
  }
}
function tiles(b) { const m = new Map(), g = b.bb, S = 160; for (let k = 0; k < b.n; k++) { const q = k * 5, key = Math.floor((g[q] + g[q + 2]) / 2 / S) + ',' + Math.floor((g[q + 1] + g[q + 3]) / 2 / S); let t = m.get(key); if (!t) m.set(key, t = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, top: -1e9, list: [] }); t.list.push(k); t.x0 = Math.min(t.x0, g[q]); t.y0 = Math.min(t.y0, g[q + 1]); t.x1 = Math.max(t.x1, g[q + 2]); t.y1 = Math.max(t.y1, g[q + 3]); t.top = Math.max(t.top, g[q + 4]); } b.tiles = [...m.values()]; }
function inPoly(b, p, x, y) { let c = false; for (let v = b.pv[p], e = b.pv[p + 1], w = e - 1; v < e; w = v++) { const yi = b.y[v], yj = b.y[w]; if ((yi > y) !== (yj > y) && x < (b.x[w] - b.x[v]) * (y - yi) / (yj - yi) + b.x[v]) c = !c; } return c; }
function plane(b, p) { let nx = 0, ny = 0, nz = 0, cx = 0, cy = 0, cz = 0; const s = b.pv[p], e = b.pv[p + 1]; for (let v = s, w = e - 1; v < e; w = v++) { nx += (b.y[w] - b.y[v]) * (b.z[w] + b.z[v]); ny += (b.z[w] - b.z[v]) * (b.x[w] + b.x[v]); nz += (b.x[w] - b.x[v]) * (b.y[w] + b.y[v]); cx += b.x[v]; cy += b.y[v]; cz += b.z[v]; } const n = e - s; return [nx, ny, nz, cx / n, cy / n, cz / n]; }
function planeZ(b, p, x, y) { const [nx, ny, nz, cx, cy, cz] = plane(b, p); return Math.abs(nz) < 1e-6 ? cz : cz - (nx * (x - cx) + ny * (y - cy)) / nz; }
function roofHit(b, p, ox, oy, oz, dx, dy, dz) { const [nx, ny, nz, cx, cy, cz] = plane(b, p), den = nx * dx + ny * dy + nz * dz; if (Math.abs(den) < 1e-9) return -1; const t = (nx * (cx / 10 - ox) + ny * (cy / 10 - oy) + nz * (cz / 10 - oz)) / den; return t > 0 && inPoly(b, p, (ox + dx * t) * 10, (oy + dy * t) * 10) ? t : -1; }
function segD(ax, ay, bx, by, x, y) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l)) : 0; return Math.hypot(ax + dx * t - x, ay + dy * t - y); }

// --- sun + skyline = answer
export const NIGHT = 0, SELF = 1, BLOCK = 2, SUN = 3;
export function state(h, azTrue, alt, removed) { if (alt <= 0) return NIGHT; let r = azTrue - toTrue(h.az); r = (r + 540) % 360 - 180; if (Math.abs(r) >= 90) return SELF; let i = Math.floor((r + 90) * h.N / 180); if (i >= h.N) i = h.N - 1; return Math.tan(alt * R) > (removed !== undefined && h.id[i] === removed ? h.sec[i] : h.top[i]) ? SUN : BLOCK; }
export function blocker(h, azTrue, alt) { if (state(h, azTrue, alt) !== BLOCK) return -1; const r = (azTrue - toTrue(h.az) + 540) % 360 - 180; return h.id[Math.min(h.N - 1, Math.floor((r + 90) * h.N / 180))]; }
// state for every (day, step) of a year table
export function yearMap(h, T, removed) { const o = new Uint8Array(T.D * T.K); for (let i = 0; i < o.length; i++) o[i] = T.al[i] > 0 ? state(h, T.az[i], T.al[i], removed) : 0; return o; }
export function yearStats(m, T) { const day = new Float32Array(T.D); let tot = 0; for (let n = 0; n < T.D; n++) { let c = 0; for (let k = 0; k < T.K; k++) if (m[n * T.K + k] === SUN) c++; day[n] = c * T.step / 60; tot += day[n]; } return { day, avg: tot / T.D }; }
// minute-by-minute spans of one day: [{s, a, b, id}]
export function daySpans(h, sunAt, min0 = 0, min1 = 1440) { const out = []; let cur = null; for (let m = min0; m < min1; m++) { const p = sunAt(m + .5), s = p.app <= 0 ? NIGHT : state(h, p.az, p.app), id = s === BLOCK ? blocker(h, p.az, p.app) : -1; if (cur && cur.s === s && cur.id === id) cur.b = m + 1; else { if (cur) out.push(cur); cur = { s, a: m, b: m + 1, id }; } } out.push(cur); return out; }
