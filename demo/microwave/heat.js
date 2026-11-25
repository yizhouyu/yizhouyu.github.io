// Heat in the food: warming, spreading, freezing, boiling, steam and a lid. Plain arrays, no DOM; runs in the page and in node.
// Grid: NX x NY x NZ boxes, HX wide (m) and HZ high (m), centred on the plate, z = 0 at the plate.
export const G = { NX: 60, NY: 60, NZ: 24, HX: .004, HZ: .003 };
export const RICE = { rho: 950, cp: 3100, cpIce: 1850, k: .45, kIce: 1.1, water: .58, L: 2.3e6, Lf: 334e3, T0: -2.5, T1: -.5 };
const { NX, NY, NZ, HX, HZ } = G, N = NX * NY * NZ, SX = NY * NZ, SY = NZ;
export const size = N, idx = (i, j, k) => (i * NY + j) * NZ + k;
// saturated water vapour density in kg per cubic metre (Magnus formula and the gas law)
const satRaw = (T) => 611.2 * Math.exp(17.62 * T / (243.12 + T)) / (461.5 * (T + 273.15));
const SAT = new Float32Array(1301); for (let i = 0; i < 1301; i++) SAT[i] = satRaw(i / 10 - 30);
export const sat = (T) => { const x = (Math.min(99.99, Math.max(-30, T)) + 30) * 10, i = x | 0; return SAT[i] + (SAT[i + 1] - SAT[i]) * (x - i); };
// temperature <-> stored heat (J per kg, zero = liquid-side at 0 C)
export function tempOf(h, m = RICE) {
  const c = m.cp, hm = m.T1 * c, span = m.T1 - m.T0, lat = m.water * m.Lf + span * (c + m.cpIce) / 2;
  if (h >= hm) return h / c; if (h >= hm - lat) return m.T1 + (h - hm) / lat * span; return m.T0 + (h - hm + lat) / m.cpIce;
}
export function heatOf(T, m = RICE) {
  const c = m.cp, hm = m.T1 * c, span = m.T1 - m.T0, lat = m.water * m.Lf + span * (c + m.cpIce) / 2;
  if (T >= m.T1) return T * c; if (T >= m.T0) return hm + (T - m.T1) / span * lat; return hm - lat + (T - m.T0) * m.cpIce;
}
export const thawed = (h, m = RICE) => { const c = m.cp, hm = m.T1 * c, lat = m.water * m.Lf + (m.T1 - m.T0) * (c + m.cpIce) / 2; return Math.min(1, Math.max(0, (h - hm + lat) / lat)); };
// Food = { f: share of each box that is food (0..1), h: J/kg, w: kg water per kg food, T }
export function makeFood(f, T0, m = RICE) {
  const F = { m, f, h: new Float32Array(N), w: new Float32Array(N), T: new Float32Array(N), A: new Float32Array(N), list: null, plate: 20, lid: 20, air: 20, t: 0, lost: 0, inJ: 0, outJ: 0 };
  const h0 = heatOf(T0, m); F.h.fill(h0); F.w.fill(m.water); F.T.fill(T0); shape(F); return F;
}
export function shape(F) { // list of food boxes and the free surface of each
  const f = F.f, L = []; for (let p = 0; p < N; p++) if (f[p] > .02) L.push(p); F.list = Int32Array.from(L);
  F.A.fill(0);
  for (const p of L) { const k = p % NZ, j = ((p / NZ) | 0) % NY, i = (p / SX) | 0; const at = (a, b, c) => a < 0 || b < 0 || a >= NX || b >= NY || c >= NZ ? 0 : f[idx(a, b, Math.max(0, c))];
    const gx = (at(i + 1, j, k) - at(i - 1, j, k)) / (2 * HX), gy = (at(i, j + 1, k) - at(i, j - 1, k)) / (2 * HX), gz = (at(i, j, k + 1) - at(i, j, k - 1)) / (2 * HZ);
    F.A[p] = Math.hypot(gx, gy, gz) * HX * HX * HZ; }
  F.old = new Float32Array(N);
}
const H_AIR = 10, HM = .005, H_PLATE = 120, C_PLATE = 320, A_LID = .07, C_LID = 180;
// q: watts per cubic metre of food in each box (null = oven off). dt seconds.
export function step(F, q, dt, covered) {
  const { m, f, h, w, T, A, list, old } = F, V = HX * HX * HZ, mass = m.rho * V; old.set(T);
  const gx = HX * HZ / HX, gz = HX * HX / HZ; let amb = 20;
  // the air under the lid
  let a = 0, b = 0, air = amb, rv = .0086;
  if (covered) { for (const p of list) { a += A[p] * HM * sat(old[p]); b += A[p] * HM; } const bl = A_LID * .006; a += F.boil / dt || 0; a += bl * sat(F.lid) + .00004 * .0086; b += bl + .00004; rv = Math.min(a / b, .598);
    let s = 0, n = 0; for (const p of list) { s += A[p] * H_AIR * old[p]; n += A[p] * H_AIR; } s += A_LID * 8 * F.lid; n += A_LID * 8; air = s / n;
    const qlid = bl * (rv - sat(F.lid)) * m.L + A_LID * 8 * (air - F.lid) - A_LID * 9 * (F.lid - amb); F.lid = Math.min(99, F.lid + qlid * dt / C_LID); }
  let boil = 0, lost = 0, inJ = 0, pl = 0, out = 0;
  for (let n = 0; n < list.length; n++) { const p = list[n], k = p % NZ, t = old[p], kk = t < m.T0 ? m.kIce : m.k; let e = 0, u;
    // neighbours (a box that is only partly food conducts and stores in proportion)
    const fp = f[p];
    if (p >= SX && (u = f[p - SX]) > .02) e += gx * Math.min(fp, u) * (old[p - SX] - t) * (kk + (old[p - SX] < m.T0 ? m.kIce : m.k)) / 2;
    if (p + SX < N && (u = f[p + SX]) > .02) e += gx * Math.min(fp, u) * (old[p + SX] - t) * (kk + (old[p + SX] < m.T0 ? m.kIce : m.k)) / 2;
    if ((u = f[p - SY]) > .02) e += gx * Math.min(fp, u) * (old[p - SY] - t) * (kk + (old[p - SY] < m.T0 ? m.kIce : m.k)) / 2;
    if ((u = f[p + SY]) > .02) e += gx * Math.min(fp, u) * (old[p + SY] - t) * (kk + (old[p + SY] < m.T0 ? m.kIce : m.k)) / 2;
    if (k > 0 && (u = f[p - 1]) > .02) e += gz * Math.min(fp, u) * (old[p - 1] - t) * (kk + (old[p - 1] < m.T0 ? m.kIce : m.k)) / 2;
    if (k < NZ - 1 && (u = f[p + 1]) > .02) e += gz * Math.min(fp, u) * (old[p + 1] - t) * (kk + (old[p + 1] < m.T0 ? m.kIce : m.k)) / 2;
    if (k === 0) { const g = H_PLATE * HX * HX * fp * (F.plate - t); e += g; pl -= g; }
    if (q) { const g = q[p] * V * fp; e += g; inJ += g * dt; }
    const ar = A[p]; if (ar > 0) { const wet = Math.min(1, Math.max(0, (w[p] - .1) / .25)), ev = HM * ar * (sat(t) * (t < 0 ? .5 : 1) - rv) * (covered ? 1 : wet), g = H_AIR * ar * (t - air) + ev * m.L; e -= g; out += g * dt; const dw = ev * dt / (mass * fp); w[p] = Math.max(0, w[p] - dw); lost += ev * dt; }
    let hn = h[p] + e * dt / (mass * fp); const over = hn - 100 * m.cp;
    if (over > 0 && w[p] > .12) { const dw = Math.min(over / m.L, w[p] - .12); w[p] -= dw; hn -= dw * m.L; boil += dw * mass * fp; }
    h[p] = hn; }
  for (let n = 0; n < list.length; n++) { const p = list[n]; T[p] = tempOf(h[p], m); }
  F.boil = boil; F.lost += lost + boil; F.inJ += inJ; F.outJ += out + boil * m.L; F.plate += (pl - .5 * (F.plate - amb)) * dt / C_PLATE; F.plateJ = (F.plateJ || 0) + pl * dt; F.t += dt;
}
// what a thermometer would say: coldest and hottest bite (a bite = 1 cm cube average), share under 74 C, share dried out
export function verdict(F) {
  const { f, T, w, list } = F; let lo = 1e9, hi = -1e9, at = 0, top = 0, vol = 0, cold = 0, dry = 0, sum = 0;
  for (const p of list) { const k = p % NZ; let s = 0, v = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { if (k + c < 0 || k + c >= NZ) continue; const q = p + a * SX + b * SY + c, u = f[q]; if (u > .02) { s += u * T[q]; v += u; } } const t = s / v;
    if (t < lo) { lo = t; at = p; } if (t > hi) { hi = t; top = p; } vol += f[p]; sum += f[p] * T[p]; if (t < 73.9) cold += f[p]; if (w[p] < .58 - .16) dry += f[p]; }
  return { lo, hi, at, top, mean: sum / vol, cold: cold / vol, dry: dry / vol, grams: vol * HX * HX * HZ * F.m.rho * 1e3 };
}
