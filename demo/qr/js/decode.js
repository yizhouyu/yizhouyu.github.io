// Pixels in, text out. Knows nothing about the original label.
// find corner squares -> size and grid -> read squares -> label info -> unmask -> blocks -> repair -> text
import { layout, roles, dataPath, maskBit, formatCode, formatCells, versionCode, LEVELS, ALNUM, EXP, LOG, mul, inv, MAX_VERSION } from "./core.js";

/* ---------- 1. repair one block (Berlekamp–Massey, Chien, Forney) ---------- */
export function rsRepair(cw, ec) {
  const n = cw.length, S = new Uint8Array(ec); let any = 0;
  for (let i = 0; i < ec; i++) { let s = 0; for (let j = 0; j < n; j++) s = mul(s, EXP[i]) ^ cw[j]; S[i] = s; any |= s; }
  if (!any) return { ok: true, out: cw.slice(), errors: [], S };
  let C = [1], B = [1], L = 0, m = 1, b = 1;
  for (let k = 0; k < ec; k++) {
    let d = S[k]; for (let i = 1; i <= L; i++) d ^= mul(C[i] || 0, S[k - i]);
    if (!d) { m++; continue; }
    const T = C.slice(), q = mul(d, inv(b));
    for (let i = 0; i < B.length; i++) C[i + m] = (C[i + m] || 0) ^ mul(q, B[i]);
    for (let i = 0; i < C.length; i++) C[i] = C[i] || 0;
    if (2 * L <= k) { L = k + 1 - L; B = T; b = d; m = 1; } else m++;
  }
  while (C.length && !C[C.length - 1]) C.pop();
  if (C.length - 1 !== L || L > ec >> 1) return { ok: false, errors: [], S };
  const pos = [];
  for (let j = 0; j < n; j++) { const xi = (255 - (n - 1 - j)) % 255; let v = 0; for (let i = 0; i < C.length; i++) if (C[i]) v ^= EXP[(LOG[C[i]] + i * xi) % 255]; if (!v) pos.push(j); }
  if (pos.length !== L) return { ok: false, errors: [], S };
  const O = new Uint8Array(ec); for (let i = 0; i < ec; i++) for (let j = 0; j <= i && j < C.length; j++) O[i] ^= mul(C[j], S[i - j]);
  const out = cw.slice(), at = (p, xi) => { let v = 0; for (let i = 0; i < p.length; i++) if (p[i]) v ^= EXP[(LOG[p[i]] + i * xi) % 255]; return v; };
  for (const j of pos) { const X = n - 1 - j, xi = (255 - X) % 255, dC = C.map((c, i) => i & 1 ? c : 0).slice(1);
    out[j] ^= mul(EXP[X], mul(at(O, xi), inv(at(dC, xi)))); }
  for (let i = 0; i < ec; i++) { let s = 0; for (let j = 0; j < n; j++) s = mul(s, EXP[i]) ^ out[j]; if (s) return { ok: false, errors: [], S }; }
  return { ok: true, out, errors: pos, S };
}

/* ---------- 2. a grid of squares -> text ---------- */
const pop = x => { let c = 0; while (x) { x &= x - 1; c++; } return c; };
export function readFormat(bits, n) {
  let best = { dist: 99 };
  formatCells(n).forEach((cells, copy) => { let w = 0; cells.forEach(([x, y], i) => w |= bits[y * n + x] << i);
    for (const level of LEVELS) for (let mask = 0; mask < 8; mask++) { const dist = pop(w ^ formatCode(level, mask)); if (dist < best.dist) best = { level, mask, dist, copy }; } });
  return best;
}
export function decodeGrid(bits, n) {
  const v = (n - 17) / 4, fmt = readFormat(bits, n);
  if (fmt.dist > 3) return { stage: "format", n, version: v, fmt, bits };
  const lay = layout(v, fmt.level), path = dataPath(v), raw = new Uint8Array(lay.total);
  for (let i = 0; i < lay.total * 8; i++) { const p = path[i]; raw[i >> 3] |= (bits[p] ^ (maskBit(fmt.mask, p % n, Math.floor(p / n)) ? 1 : 0)) << (7 - (i & 7)); }
  const blocks = lay.blocks.map(b => ({ cw: new Uint8Array(b.len), ...b }));
  lay.order.forEach(([k, i], j) => blocks[k].cw[i] = raw[j]);
  let ok = true; const data = [];
  for (const b of blocks) { b.res = rsRepair(b.cw, b.ec); if (!b.res.ok) ok = false; else for (let i = 0; i < b.data; i++) data.push(b.res.out[i]); }
  const base = { n, version: v, fmt, bits, lay, raw, blocks };
  if (!ok) return { stage: "data", ...base };
  const text = parse(data, v);
  return text === null ? { stage: "data", ...base } : { stage: "ok", text, data, ...base };
}
export function parse(data, v) {
  let p = 0; const total = data.length * 8, get = n => { let x = 0; for (let i = 0; i < n; i++, p++) x = x << 1 | (data[p >> 3] >> (7 - (p & 7)) & 1); return x; };
  let out = ""; const bytes = [], flush = () => { if (bytes.length) { out += new TextDecoder().decode(new Uint8Array(bytes)); bytes.length = 0; } };
  while (total - p >= 4) {
    const m = get(4); if (m === 0) break;
    if (m === 1) { flush(); if (total - p < 12) return null; let c = get(v < 10 ? 10 : 12); while (c > 0) { const k = Math.min(3, c), w = k * 3 + 1; if (total - p < w) return null; const x = get(w); if (x >= 10 ** k) return null; out += String(x).padStart(k, "0"); c -= k; } }
    else if (m === 2) { flush(); if (total - p < 11) return null; let c = get(v < 10 ? 9 : 11); while (c > 0) { const w = c > 1 ? 11 : 6; if (total - p < w) return null; const x = get(w); if (x >= (c > 1 ? 2025 : 45)) return null; out += c > 1 ? ALNUM[Math.floor(x / 45)] + ALNUM[x % 45] : ALNUM[x]; c -= 2; } }
    else if (m === 4) { if (total - p < 16) return null; const c = get(v < 10 ? 8 : 16); if (total - p < c * 8) return null; for (let i = 0; i < c; i++) bytes.push(get(8)); }
    else return null;
  }
  flush(); return out;
}

/* ---------- 3. pixels -> grid ---------- */
export function threshold(g) { // halfway between the darkest 5% and the lightest 5%
  const h = new Uint32Array(256); for (let i = 0; i < g.length; i++) h[g[i]]++;
  const q = g.length * .05; let lo = 0, hi = 255, c = 0;
  while ((c += h[lo]) < q) lo++; c = 0; while ((c += h[hi]) < q) hi--;
  return (lo + hi) / 2;
}
const R = [1, 1, 3, 1, 1];
function ratio(c, tol = .5) { const s = c[0] + c[1] + c[2] + c[3] + c[4]; if (s < 7) return 0; const u = s / 7; for (let i = 0; i < 5; i++) if (Math.abs(c[i] - R[i] * u) > R[i] * u * tol) return 0; return u; }
export function findFinders(g, W, H, T) {
  const dark = (x, y) => g[y * W + x] < T, found = [];
  const cross = (x, y, dx, dy, max) => { // run lengths through a dark pixel along a line
    const c = [0, 0, 0, 0, 0]; let i = 0; const ok = k => { const X = x + dx * k, Y = y + dy * k; return X >= 0 && Y >= 0 && X < W && Y < H; }, d = k => dark(x + dx * k, y + dy * k);
    while (ok(-i) && d(-i)) { c[2]++; i++; } while (ok(-i) && !d(-i) && c[1] <= max) { c[1]++; i++; } while (ok(-i) && d(-i) && c[0] <= max) { c[0]++; i++; }
    let e = 1; while (ok(e) && d(e)) { c[2]++; e++; } while (ok(e) && !d(e) && c[3] <= max) { c[3]++; e++; } while (ok(e) && d(e) && c[4] <= max) { c[4]++; e++; }
    return { u: ratio(c), mid: (e - c[4] - c[3]) - c[2] / 2 - .5 };
  };
  for (let y = 0; y < H; y++) {
    const runs = []; let st = 0;
    for (let x = 1; x <= W; x++) if (x === W || dark(x, y) !== dark(st, y)) { runs.push([st, x - st, dark(st, y)]); st = x; }
    for (let i = 0; i + 4 < runs.length; i++) {
      if (!runs[i][2]) continue;
      const c = [0, 1, 2, 3, 4].map(k => runs[i + k][1]), u = ratio(c); if (!u) continue;
      let cx = runs[i + 2][0] + c[2] / 2 - .5;
      const vert = cross(Math.round(cx), y, 0, 1, u * 2.5); if (!vert.u || Math.abs(vert.u - u) > u * .5) continue;
      const cy = y + vert.mid, hor = cross(Math.round(cx), Math.round(cy), 1, 0, u * 2.5); if (!hor.u) continue;
      cx = Math.round(cx) + hor.mid;
      const us = (u + vert.u + hor.u) / 3, f = found.find(f => Math.hypot(f.x - cx, f.y - cy) < f.u * 2 && Math.abs(f.u - us) < f.u * .5);
      if (f) { f.x = (f.x * f.k + cx) / (f.k + 1); f.y = (f.y * f.k + cy) / (f.k + 1); f.u = (f.u * f.k + us) / (f.k + 1); f.k++; } else found.push({ x: cx, y: cy, u: us, k: 1 });
    }
  }
  return found.sort((a, b) => b.k - a.k).slice(0, 10);
}
export function pickThree(f) { // the best right-angled triple, ordered [top-left, top-right, bottom-left]
  const sets = [];
  for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) for (let k = j + 1; k < f.length; k++) {
    const t = [f[i], f[j], f[k]], us = t.map(a => a.u), u = (us[0] + us[1] + us[2]) / 3;
    if (Math.max(...us) > 1.4 * Math.min(...us)) continue;
    for (let o = 0; o < 3; o++) {
      const a = t[o]; let b = t[(o + 1) % 3], c = t[(o + 2) % 3];
      let ux = b.x - a.x, uy = b.y - a.y, vx = c.x - a.x, vy = c.y - a.y; const la = Math.hypot(ux, uy), lb = Math.hypot(vx, vy);
      if (la < 9.5 * u || lb < 9.5 * u) continue; // u looks up to 1.4 times larger on a turned code
      const cos = Math.abs((ux * vx + uy * vy) / la / lb), skew = Math.abs(la - lb) / Math.max(la, lb);
      if (cos > .34 || skew > .34) continue;
      if (ux * vy - uy * vx < 0) [b, c] = [c, b];
      sets.push({ t: [a, b, c], u, cost: cos + skew + (Math.max(...us) - Math.min(...us)) / u - Math.min(...t.map(a => a.k), 6) * .02 });
    }
  }
  return sets.sort((a, b) => a.cost - b.cost).slice(0, 4);
}
// grid = 9 numbers: square coordinates (u,v) -> picture coordinates
export const project = (h, u, v) => { const w = h[6] * u + h[7] * v + h[8]; return [(h[0] * u + h[1] * v + h[2]) / w, (h[3] * u + h[4] * v + h[5]) / w]; };
export function homography(src, dst) { // 4 point pairs, 8 unknowns, Gaussian elimination
  const A = [];
  src.forEach(([x, y], i) => { const [X, Y] = dst[i]; A.push([x, y, 1, 0, 0, 0, -X * x, -X * y, X], [0, 0, 0, x, y, 1, -Y * x, -Y * y, Y]); });
  for (let c = 0; c < 8; c++) { let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; if (Math.abs(A[c][c]) < 1e-12) return null;
    for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k]; } }
  return [...A.map((r, i) => r[8] / r[i]), 1];
}
export function sample(g, W, H, T, h, n) { // average of 9 points in the middle of every square
  const bits = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let s = 0;
    for (let q = -1; q <= 1; q++) for (let p = -1; p <= 1; p++) { const [X, Y] = project(h, i + .5 + p * .25, j + .5 + q * .25), x = Math.floor(X), y = Math.floor(Y); s += x >= 0 && y >= 0 && x < W && y < H ? g[y * W + x] : 255; }
    bits[j * n + i] = s / 9 < T ? 1 : 0;
  }
  return bits;
}
export function gridFrom([a, b, c], n) { // three corners only: straight axes, no perspective
  const d = n - 7, ax = (b.x - a.x) / d, ay = (b.y - a.y) / d, bx = (c.x - a.x) / d, by = (c.y - a.y) / d;
  return [ax, bx, a.x + .5 - 3.5 * (ax + bx), ay, by, a.y + .5 - 3.5 * (ay + by), 0, 0, 1];
}
export function findAlign(g, W, H, T, h, n) { // look for the small 5x5 mark near where the three corners say it should be
  if (n < 25) return null;
  const c = n - 6.5, [px, py] = project(h, c, c), ax = h[0], ay = h[3], bx = h[1], by = h[4], R = 5, st = .25; let best = 0, list = [];
  for (let v = -R; v <= R; v += st) for (let u = -R; u <= R; u += st) {
    const x0 = px + u * ax + v * bx, y0 = py + u * ay + v * by; let hit = 0;
    for (let q = -2; q <= 2; q++) for (let p = -2; p <= 2; p++) { const x = Math.floor(x0 + p * ax + q * bx), y = Math.floor(y0 + p * ay + q * by), d = x >= 0 && y >= 0 && x < W && y < H && g[y * W + x] < T, want = Math.max(Math.abs(p), Math.abs(q)) !== 1; if (d === want) hit++; }
    if (hit > best) { best = hit; list = []; } if (hit === best) list.push([x0, y0, u * u + v * v]);
  }
  if (best < 23) return null;
  const near = list.reduce((m, p) => p[2] < m[2] ? p : m), lim = Math.hypot(ax, ay) * 1.2, grp = list.filter(p => Math.hypot(p[0] - near[0], p[1] - near[1]) < lim);
  const x = grp.reduce((s, p) => s + p[0], 0) / grp.length, y = grp.reduce((s, p) => s + p[1], 0) / grp.length;
  return { x, y, hit: best, off: Math.hypot(x - px, y - py) / Math.hypot(ax, ay) }; // off = how far from the guess, in squares
}
export function gridFrom4([a, b, c], d, n) { const p = q => [q.x + .5, q.y + .5]; return homography([[3.5, 3.5], [n - 3.5, 3.5], [3.5, n - 3.5], [n - 6.5, n - 6.5]], [p(a), p(b), p(c), [d.x, d.y]]); }
function readVersion(bits, n) { let best = { d: 99 };
  for (const k of [0, 1]) { let w = 0; for (let i = 0; i < 18; i++) { const a = n - 11 + i % 3, b = Math.floor(i / 3); w |= (k ? bits[a * n + b] : bits[b * n + a]) << i; } for (let v = 7; v <= MAX_VERSION; v++) { const d = pop(w ^ versionCode(v)); if (d < best.d) best = { d, v }; } }
  return best.d <= 3 ? best.v : 0; }
export function countRuler(g, W, H, T, [a, b, c]) { // walk along the dotted line between the corners and count its changes: size = changes + 13
  const out = []; for (const [p, q] of [[b, c], [c, b]]) {
    const lx = p.x - a.x, ly = p.y - a.y, L = Math.hypot(lx, ly), mx = q.x - a.x, my = q.y - a.y, M = Math.hypot(mx, my), turn = f => { const k = Math.hypot(f[0], f[1]); return Math.max(Math.abs(f[0]), Math.abs(f[1])) / k; };
    const u = (a.u + p.u) / 2 * turn([lx, ly]), e = [lx / L, ly / L], f = [mx / M, my / M], dark = (s, t) => { const x = Math.floor(a.x + .5 + e[0] * s + f[0] * t), y = Math.floor(a.y + .5 + e[1] * s + f[1] * t); return x >= 0 && y >= 0 && x < W && y < H && g[y * W + x] < T; };
    let best = 0; for (const t of [3 * u, 2.8 * u, 3.2 * u]) { let last = true, n = 0; for (let s = 3 * u; s <= L - 3 * u; s += u / 6) { const d = dark(s, t); if (d !== last) { if (dark(s + u / 4, t) === d) { n++; last = d; } } } const size = n + 13; if (size >= 21 && (size - 17) % 4 === 0) { best = size; break; } } out.push(best);
  }
  return out[0] && out[0] === out[1] ? out[0] : out[0] && !out[1] ? out[0] : out[1] && !out[0] ? out[1] : 0;
}
export function decodeImage(g, W, H, T = threshold(g), { align = true, affine = true } = {}) {
  const finders = findFinders(g, W, H, T), sets = pickThree(finders); let fail = null;
  for (const s of sets) {
    const est = (Math.hypot(s.t[1].x - s.t[0].x, s.t[1].y - s.t[0].y) + Math.hypot(s.t[2].x - s.t[0].x, s.t[2].y - s.t[0].y)) / 2 / s.u + 7;
    const ruler = countRuler(g, W, H, T, s.t), v0 = Math.max(1, Math.min(MAX_VERSION, Math.round(((ruler || est) - 17) / 4))), tried = new Set(), list = [v0, v0 - 1, v0 + 1, v0 - 2, v0 + 2];
    for (let i = 0; i < list.length; i++) {
      const v = list[i]; if (v < 1 || v > MAX_VERSION || tried.has(v)) continue; tried.add(v);
      const n = v * 4 + 17, flat = gridFrom(s.t, n), grids = [];
      const mark = align ? findAlign(g, W, H, T, flat, n) : null;
      if (affine) grids.push([flat, null]);
      if (mark && (mark.off > .3 || !affine)) { const h = gridFrom4(s.t, mark, n); if (h) grids.push([h, mark]); }
      if (!grids.length) grids.push([flat, null]);
      for (const [grid, m4] of grids) {
        const bits = sample(g, W, H, T, grid, n);
        if (v >= 7) { const rv = readVersion(bits, n); if (rv && rv !== v && !tried.has(rv)) list.splice(i + 1, 0, rv); }
        const r = decodeGrid(bits, n); r.grid = grid; r.three = s.t; r.ruler = ruler; r.mark = m4; r.finders = finders; r.T = T;
        if (r.stage === "ok") return r;
        if (!fail || (fail.n === n && fail.stage === "format" && r.stage === "data")) fail = r;
      }
    }
  }
  return fail || { stage: "find", finders, T };
}
