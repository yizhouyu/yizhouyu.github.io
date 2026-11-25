// The microwaves: a 3-D box of 5 mm cells, stepped in time (Yee's scheme). This file holds the oven, the food's effect
// on each edge, and a plain JavaScript stepper (used by the tests and when there is no graphics card). gpu.js runs the same numbers.
import { G } from "./heat.js";
export const D = .005, NC = 54, NW = 10, NX = NC + NW, NY = 54, NZ = 38, X = NX + 1, Y = NY + 1, Z = NZ + 1, SPP = 48; // 270 x 270 x 190 mm oven, 50 mm of feed pipe on the right
export const C0 = 299792458, FREQ = 2.45e9, E0 = 8.8541878128e-12, M0 = 4e-7 * Math.PI, OM = 2 * Math.PI * FREQ, DT = 1 / FREQ / SPP;
export const WY0 = 19, WY1 = 35, WZ0 = 33, WZ1 = 37, SRC = NX - 4; // the feed pipe: 80 x 20 mm, near the top of the right wall
export const TRAY0 = .015, TRAY1 = .025, TRAYR = .1135; // glass tray and plate, then the food
export const CH = DT / (M0 * D); const KC = Math.PI / ((WY1 - WY0) * D), BETA = Math.sqrt(OM * OM / C0 / C0 - KC * KC), VP = OM / BETA; export const MUR = (VP * DT - D) / (VP * DT + D);
export const I = (i, j, k) => (i * Y + j) * Z + k;
// cooked rice, measured (Auksornsri et al. 2018, table 4), at 40 C; frozen food, measured at -20 C (Mao et al. 2003)
export const epsRice = (T) => [-.0001 * T * T + .1003 * T + 47.638, .0007 * T * T - .1708 * T + 18.618];
export const RICE40 = epsRice(40), ICE = [4.38, .92], TRAY = [6, .03];
// On a 5 mm grid a wave inside wet food runs a little too slow. This is the value that gives the true wavelength and the true fading on this grid (40 % along an axis, 60 % along a diagonal).
export function onGrid([er, ei], d = D, axis = .4) { const csqrt = (a, b) => { const m = Math.hypot(a, b); return [Math.sqrt((m + a) / 2), Math.sign(b) * Math.sqrt((m - a) / 2)]; }, csin2 = (a, b) => { const x = Math.sin(a) * Math.cosh(b), y = Math.cos(a) * Math.sinh(b); return [x * x - y * y, 2 * x * y]; };
  const q = csqrt(er, -ei), k = [OM / C0 * q[0], OM / C0 * q[1]], s = (Math.sin(OM * DT / 2) / (C0 * DT / d)) ** 2, a = csin2(k[0] * d / 2, k[1] * d / 2), g = Math.sqrt(3), b = csin2(k[0] * d / 2 / g, k[1] * d / 2 / g);
  return [(axis * a[0] + (1 - axis) * 3 * b[0]) / s, -(axis * a[1] + (1 - axis) * 3 * b[1]) / s]; }
const RG = onGrid(RICE40), IG = onGrid(ICE);
export const wet = (t) => [IG[0] + (RG[0] - IG[0]) * t, IG[1] + (RG[1] - IG[1]) * t], lossAt = (t) => wet(t)[1];
// coefficients for every edge: ca, cb (xyz interleaved as rgba). food: arrays on the heat grid, f = share, thaw = 0..1 or null. turn: food turned by this angle
export function build(f, thaw) {
  const N = X * Y * Z, ca = new Float32Array(N * 4), cb = new Float32Array(N * 4), sg = new Float32Array(N * 3), fl = new Float32Array(N * 3); const { NX: HX, NY: HY, NZ: HZ } = G, hx = G.HX, hz = G.HZ, g = (i, j, k) => (i * HY + j) * HZ + k;
  const samp = (arr, x, y, z) => { const a = x / hx + HX / 2 - .5, b = y / hx + HY / 2 - .5, c = z / hz - .5, i = Math.floor(a), j = Math.floor(b), k = Math.floor(c); if (i < 0 || j < 0 || i >= HX - 1 || j >= HY - 1 || k >= HZ - 1) return 0; const u = a - i, v = b - j, w = c - k; let s = 0; for (let p = 0; p < 2; p++) for (let q = 0; q < 2; q++) { const m = (p ? u : 1 - u) * (q ? v : 1 - v), n = g(i + p, j + q, 0); s += m * ((k >= 0 ? arr[n + k] * (1 - w) : arr[n]* (1 - w)) + arr[n + k + 1] * w); } return s; };
  for (let i = 0; i < X; i++) for (let j = 0; j < Y; j++) for (let k = 0; k < Z; k++) { const n = I(i, j, k); for (let q = 0; q < 3; q++) { const x = i + (q === 0 ? .5 : 0), y = j + (q === 1 ? .5 : 0), z = k + (q === 2 ? .5 : 0); let pec = false;
    if (x < NC) pec = (q !== 0 && x === 0) || (q !== 1 && (y === 0 || y === NY)) || (q !== 2 && (z === 0 || z === NZ)) || x > NX || y > NY || z > NZ;
    else pec = x > NX || y < WY0 || y > WY1 || z < WZ0 || z > WZ1 || (q !== 1 && (y === WY0 || y === WY1)) || (q !== 2 && (z === WZ0 || z === WZ1));
    if (pec) continue; let er = 1, si = 0, ft = 0; const px = x * D - .135, py = y * D - .135, pz = z * D;
    if (x < NC) { if (pz > TRAY0 - D && pz < TRAY1 + D && Math.hypot(px, py) < TRAYR) { const lo = Math.max(pz - D / 2, TRAY0), hi = Math.min(pz + D / 2, TRAY1), s = Math.max(0, hi - lo) / D; er += s * (TRAY[0] - 1); si += OM * E0 * s * TRAY[1]; }
      if (pz > TRAY1 - D / 2 && pz < TRAY1 + HZ * hz && Math.abs(px) < .12 && Math.abs(py) < .12) { const c = Math.max(0, pz - TRAY1), part = Math.min(1, (pz + D / 2 - TRAY1) / D); ft = samp(f, px, py, Math.max(c, hz / 2)) * part; if (ft > .002) { const t = thaw ? samp(thaw, px, py, Math.max(c, hz / 2)) / Math.max(.02, samp(f, px, py, Math.max(c, hz / 2))) : 1, e = wet(Math.min(1, Math.max(0, t))); er += ft * (e[0] - 1); si += OM * E0 * ft * e[1]; } } }
    const A = si * DT / (2 * E0 * er); ca[n * 4 + q] = (1 - A) / (1 + A); cb[n * 4 + q] = DT / (E0 * er * D) / (1 + A); sg[n * 3 + q] = si; fl[n * 3 + q] = ft; } }
  return { ca, cb, sg, fl, N };
}
export const ramp = (n) => 1 - Math.exp(-Math.pow((n + 1) / SPP / 6, 2)), drive = (n) => .2 * ramp(n) * Math.sin(OM * (n + 1) * DT);
// plain stepper; returns squared amplitudes of Ex, Ey, Ez on their edges (3 per node)
export function solveCPU(B, periods = 80, opt = {}) {
  const { ca, cb, N } = B, e = new Float32Array(N * 3), h = new Float32Array(N * 3), L = Y * Z * 3, M = Z * 3, a2 = new Float32Array(N * 3), ns = periods * SPP, ch = opt.ch ?? CH;
  const old0 = new Float32Array(Y * Z), old1 = new Float32Array(Y * Z);
  for (let n = 0; n < ns; n++) {
    for (let i = 0; i < NX; i++) { const w = i > NC, j0 = w ? WY0 - 1 : 0, j1 = w ? WY1 + 1 : NY, k0 = w ? WZ0 - 1 : 0, k1 = w ? WZ1 + 1 : NZ; for (let j = j0; j < j1; j++) { let p = I(i, j, k0) * 3; for (let k = k0; k < k1; k++, p += 3) { h[p] += ch * ((e[p + 4] - e[p + 1]) - (e[p + M + 2] - e[p + 2])); h[p + 1] += ch * ((e[p + L + 2] - e[p + 2]) - (e[p + 3] - e[p])); h[p + 2] += ch * ((e[p + M] - e[p]) - (e[p + L + 1] - e[p + 1])); } } }
    for (let j = WY0; j <= WY1; j++) for (let k = WZ0; k < WZ1; k++) { const q = j * Z + k; old0[q] = e[I(NX - 1, j, k) * 3 + 2]; old1[q] = e[I(NX, j, k) * 3 + 2]; }
    for (let i = 0; i < NX; i++) { const w = i > NC, j0 = w ? WY0 : 0, j1 = w ? WY1 : NY, k0 = w ? WZ0 : 0, k1 = w ? WZ1 : NZ; for (let j = j0; j <= j1; j++) { let m = I(i, j, k0), p = m * 3, c = m * 4; for (let k = k0; k <= k1; k++, p += 3, c += 4) {
      if (cb[c]) e[p] = ca[c] * e[p] + cb[c] * ((h[p + 2] - h[p - M + 2]) - (h[p + 1] - h[p - 2]));
      if (cb[c + 1]) e[p + 1] = ca[c + 1] * e[p + 1] + cb[c + 1] * ((h[p] - h[p - 3]) - (h[p + 2] - h[p - L + 2]));
      if (cb[c + 2]) e[p + 2] = ca[c + 2] * e[p + 2] + cb[c + 2] * ((h[p + 1] - h[p - L + 1]) - (h[p] - h[p - M])); } } }
    const s = opt.still ? 0 : drive(n); for (let j = WY0; j <= WY1; j++) for (let k = WZ0; k < WZ1; k++) e[I(SRC, j, k) * 3 + 2] += s * Math.sin(Math.PI * (j - WY0) / (WY1 - WY0));
    for (let j = WY0 + 1; j < WY1; j++) for (let k = WZ0; k < WZ1; k++) { const q = j * Z + k; e[I(NX, j, k) * 3 + 2] = old0[q] + MUR * (e[I(NX - 1, j, k) * 3 + 2] - old1[q]); }
    if (n === ns - 1 - SPP / 4 || n === ns - 1) for (let p = 0; p < N * 3; p++) a2[p] += e[p] * e[p];
    if (opt.tick) opt.tick(n, e, h);
  }
  return a2;
}
// squared field -> watts per cubic metre of food on the heat grid. spin: the turntable turns (average over a full turn)
export function toPower(a2, B, f, thaw, watts, spin, stride = 3) {
  const { NX: HX, NY: HY, NZ: HZ } = G, hx = G.HX, hz = G.HZ, q = new Float32Array(HX * HY * HZ), { fl } = B;
  const off = [[.5, 0, 0], [0, .5, 0], [0, 0, .5]];
  const at = (px, py, pz) => { let tot = 0; for (let c = 0; c < 3; c++) { const a = px / D - off[c][0], b = py / D - off[c][1], d = pz / D - off[c][2], i = Math.floor(a), j = Math.floor(b), k = Math.floor(d), u = a - i, v = b - j, w = d - k; let s = 0, ww = 0; for (let m = 0; m < 8; m++) { const n = I(i + (m >> 2), j + (m >> 1 & 1), k + (m & 1)), t = ((m >> 2) ? u : 1 - u) * ((m >> 1 & 1) ? v : 1 - v) * ((m & 1) ? w : 1 - w) * (fl[n * 3 + c] + 1e-5); s += t * a2[n * stride + c]; ww += t; } tot += s / ww; } return tot; };
  if (spin) { const NR = 64, dr = .002, tab = new Float32Array(NR * HZ); for (let r = 0; r < NR; r++) for (let k = 0; k < HZ; k++) { let s = 0; const n = 48; for (let t = 0; t < n; t++) { const th = 2 * Math.PI * (t + .5) / n; s += at(.135 + (r + .5) * dr * Math.cos(th), .135 + (r + .5) * dr * Math.sin(th), TRAY1 + (k + .5) * hz); } tab[r * HZ + k] = s / n; }
    return fromTable(tab, f, thaw, watts); }
  for (let i = 0; i < HX; i++) for (let j = 0; j < HY; j++) for (let k = 0; k < HZ; k++) { const p = (i * HY + j) * HZ + k; if (f[p] > .02) q[p] = at(.135 + (i - HX / 2 + .5) * hx, .135 + (j - HY / 2 + .5) * hx, TRAY1 + (k + .5) * hz); }
  return scaled(q, f, thaw, watts);
}
function scaled(q, f, thaw, watts) { let tot = 0; for (let p = 0; p < q.length; p++) if (f[p] > .02) { if (thaw) q[p] *= lossAt(thaw[p]); tot += q[p] * f[p]; } const s = watts / (tot * G.HX * G.HX * G.HZ); for (let p = 0; p < q.length; p++) q[p] *= s; q.tot = tot; return q; }
// a turning plate: field averaged over one turn, 64 rings of 2 mm by the layers of the heat grid
export function fromTable(tab, f, thaw, watts) { const { NX: HX, NY: HY, NZ: HZ } = G, NR = 64, q = new Float32Array(HX * HY * HZ); for (let i = 0; i < HX; i++) for (let j = 0; j < HY; j++) { const r = Math.hypot(i - HX / 2 + .5, j - HY / 2 + .5) * G.HX / .002 - .5, r0 = Math.max(0, Math.floor(r)), u = Math.max(0, r - r0); if (r0 >= NR - 1) continue; for (let k = 0; k < HZ; k++) { const p = (i * HY + j) * HZ + k; if (f[p] > .02) q[p] = tab[r0 * HZ + k] * (1 - u) + tab[(r0 + 1) * HZ + k] * u; } } const out = scaled(q, f, thaw, watts); out.tab = tab; return out; }
