// Everything about the waves that is not drawing. Shared by the page (GPU) and the tests (CPU).
//
// Model: plan view, vertical antenna -> electric field points out of the plan -> scalar wave equation
//   eps * u_tt + loss * u_t = c^2 * lap(u)
// Scheme: increments (u, v = u(n) - u(n-1)), isotropic 9-point Laplacian, Courant number C0.

export const C = 299792458;
export const C0 = 0.8;                       // cells per step in air (stable up to 0.866 for this Laplacian)
export const W0 = 11.2, H0 = 7.68, LARGE = 1.25; // metres covered by the grid (a large home uses slightly bigger cells)
export let W = W0, H = H0, SIZE = 1;
export function setSize(k) { SIZE = k === LARGE ? LARGE : 1; W = W0 * SIZE; H = H0 * SIZE; }
export const BANDS = { "2.4": { f: 2.437e9, bw: 20 }, "5": { f: 5.25e9, bw: 80 } };
export const EIRP = 20;                      // dBm, the usual home-router level
export const ALLOWANCE = 10;                 // dB we take off for furniture, bodies and a small phone antenna

// ITU-R P.2040-4 (09/2025), table 3: eps' = a f^b, sigma = c f^d (f in GHz)
export const ITU = {
  concrete: [5.24, 0, 0.0462, 0.7822],
  brick: [3.91, 0, 0.0238, 0.16],
  plasterboard: [2.73, 0, 0.0085, 0.9395],
  wood: [1.99, 0, 0.0047, 1.0718],
  glass: [6.31, 0, 0.0036, 1.3394],
  air: [1, 0, 0, 0],
};
export function itu(mat, f) {
  const [a, b, c, d] = ITU[mat], g = f / 1e9;
  return { eps: a * g ** b, sigma: c * g ** d };
}

// What a wall is made of (metres, layer by layer) and how thick it is on the plan.
// id is also the code used in saved links and in the material map. 0 = air, 6 = metal.
export const WALLS = {
  drywall: { id: 1, t: 0.10, layers: [["plasterboard", 0.0125], ["air", 0.075], ["plasterboard", 0.0125]] },
  brick: { id: 2, t: 0.12, layers: [["brick", 0.12]] },
  concrete: { id: 3, t: 0.20, layers: [["concrete", 0.20]] },
  glass: { id: 4, t: 0.04, layers: [["glass", 0.006]] },
  door: { id: 5, t: 0.04, layers: [["wood", 0.04]] },
  metal: { id: 6, t: 0.05, layers: null },
};
export const WALL_BY_ID = Object.fromEntries(Object.entries(WALLS).map(([k, v]) => [v.id, k]));

// ---- tiny complex helpers
const cx = (re, im = 0) => ({ re, im });
const add = (a, b) => cx(a.re + b.re, a.im + b.im), sub = (a, b) => cx(a.re - b.re, a.im - b.im);
const mul = (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const div = (a, b) => { const d = b.re * b.re + b.im * b.im; return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
const sq = (a) => { const r = Math.hypot(a.re, a.im), s = Math.sqrt((r + a.re) / 2); return cx(s, (a.im < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (r - a.re) / 2))); };
const abs2 = (a) => a.re * a.re + a.im * a.im;
const cexp = (a) => { const e = Math.exp(a.re); return cx(e * Math.cos(a.im), e * Math.sin(a.im)); };

// Real wall, normal incidence: power transmitted and reflected by a stack of layers (exact, textbook Fresnel/transfer matrix).
export function slabTR(layers, f, scale = 1) {
  const k0 = 2 * Math.PI * f / C, eps0 = 8.8541878128e-12;
  // characteristic matrices, e^{-i w t} convention
  let M = [cx(1), cx(0), cx(0), cx(1)];
  for (const [mat, d0] of layers) {
    const { eps, sigma } = itu(mat, f), n = sq(cx(eps, sigma / (2 * Math.PI * f * eps0)));
    const ph = mul(n, cx(k0 * d0 * scale)), i = cx(0, 1);
    const ep = cexp(mul(i, ph)), em = cexp(mul(cx(0, -1), ph));
    const cosp = mul(add(ep, em), cx(0.5)), sinp = mul(sub(ep, em), cx(0, -0.5));
    const m = [cosp, div(mul(cx(0, -1), sinp), n), mul(mul(cx(0, -1), n), sinp), cosp];
    M = [add(mul(M[0], m[0]), mul(M[1], m[2])), add(mul(M[0], m[1]), mul(M[1], m[3])),
         add(mul(M[2], m[0]), mul(M[3], m[2])), add(mul(M[2], m[1]), mul(M[3], m[3]))];
  }
  const B = add(M[0], M[1]), D = add(M[2], M[3]), den = add(B, D);
  return { T: abs2(div(cx(2), den)), R: abs2(div(sub(B, D), den)) };
}
// averaged over a few % of thickness and frequency, so one lucky resonance does not decide
export function wallTR(name, f) {
  let T = 0, R = 0, n = 0;
  for (let s = 0.94; s < 1.061; s += 0.02) for (let g = 0.98; g < 1.021; g += 0.01) {
    const r = slabTR(WALLS[name].layers, f * g, s); T += Math.log(r.T); R += r.R; n++;
  }
  return { T: Math.exp(T / n), R: R / n };
}

// ---- the grid's own dispersion: pick the time step frequency so a wave on the grid has the right wavelength
export function bandParams(band, dx) {
  const f = BANDS[band].f, k = 2 * Math.PI * f / C * dx;        // radians per cell in air
  const w = 2 * Math.asin(C0 * Math.sin(k / 2));                // radians per step
  return { f, k, w, lam: C / f, dx };
}

// The same slab on the grid: K = C0^2/eps and s = loss per step over N cells. Exact for the discrete scheme.
export function gridSlabTR(K, s, N, p) {
  const D = cx(2 * Math.cos(p.w) - 2, -2 * s * Math.sin(p.w));            // e^{-iwt}
  const step = (U1, U2, k) => sub(mul(add(cx(2), cx(D.re / k, D.im / k)), U1), U2);
  const D0 = cx(2 * Math.cos(p.w) - 2, 0);
  // transmitted wave on the far side: U_j = e^{ikj}; march towards the source
  let b = cexp(cx(0, p.k)), a = cx(1);                                    // U_1, U_0 (both air)
  const K0 = C0 * C0;
  { const n = sub(mul(add(cx(2), cx(D0.re / K0)), a), b); b = a; a = n; } // now a is the first wall cell's value
  for (let i = 0; i < N; i++) { const n = step(a, b, K); b = a; a = n; }
  // a, b are two neighbouring air cells in front of the wall: a at x=-1 further from the wall than b
  const e = cexp(cx(0, p.k)), ei = cexp(cx(0, -p.k));
  // b = P + Q, a = P e^{-ik} + Q e^{ik}   (P forward, Q backward)
  const P = div(sub(a, mul(b, e)), sub(ei, e)), Q = sub(b, P);
  return { T: 1 / abs2(P), R: abs2(Q) / abs2(P) };
}
// Find K and s so the wall of N cells loses and reflects what the real one does.
export function fitWall(name, band, dx) {
  const p = bandParams(band, dx), tgt = wallTR(name, p.f), N = Math.max(1, Math.round(WALLS[name].t / dx));
  const maxEps = Math.min(4, p.k > 1.2 && N <= 4 ? 4 : Math.max(2.3, (1.75 / p.k) ** 2)); // ~3.6 cells per wavelength inside the wall; thin ones are fitted exactly anyway
  const cost = (eps, s) => {
    let T = 0, R = 0; const K = C0 * C0 / eps;
    const ks = N > 6 ? [-1, 0, 1] : [0];
    for (const d of ks) { const r = gridSlabTR(K, s, N, { ...p, k: p.k * (1 + d * 0.02), w: 2 * Math.asin(C0 * Math.sin(p.k * (1 + d * 0.02) / 2)) }); T += Math.log(r.T); R += r.R; }
    T /= ks.length; R /= ks.length;
    const dT = (T - Math.log(tgt.T)) * 4.342945, dR = Math.sqrt(R) - Math.sqrt(tgt.R);
    return dT * dT + 30 * dR * dR;
  };
  let best = [1e9, 1, 0];
  for (let i = 0; i <= 60; i++) { const eps = 1 + (maxEps - 1) * i / 60;
    for (let j = 0; j <= 80; j++) { const s = j === 0 ? 0 : 1e-4 * 5000 ** (j / 80), c = cost(eps, s); if (c < best[0]) best = [c, eps, s]; } }
  let he = (maxEps - 1) / 60, hs = 1.12;
  for (let it = 0; it < 40; it++) { let moved = false;
    for (const [e, s] of [[best[1] + he, best[2]], [best[1] - he, best[2]], [best[1], best[2] * hs], [best[1], best[2] / hs]]) {
      if (e < 1 || e > maxEps) continue; const c = cost(e, s); if (c < best[0] - 1e-12) { best = [c, e, s]; moved = true; } }
    if (!moved) { he /= 2; hs = Math.sqrt(hs); } }
  const K = C0 * C0 / best[1];
  return { name, N, K, s: best[2], eps: best[1], target: tgt, got: gridSlabTR(K, best[2], N, p) };
}

// ---- material map: RG float per cell (K, s). K = 0 means metal.
export const SPONGE = 0.46; // metres of absorbing border outside the home
export function coefficients(ids, nx, ny, band, dx, fits) {
  const out = new Float32Array(nx * ny * 2), K0 = C0 * C0, n = Math.round(SPONGE / dx);
  const tab = {}; for (const f of Object.values(fits)) tab[WALLS[f.name].id] = f;
  for (let j = 0, q = 0; j < ny; j++) for (let i = 0; i < nx; i++, q++) {
    const id = ids ? ids[q] : 0; let K = K0, s = 0;
    if (id === 6) K = 0; else if (id && tab[id]) { K = tab[id].K; s = tab[id].s; }
    const e = Math.min(i, j, nx - 1 - i, ny - 1 - j);
    if (e < n) { const t = 1 - e / n; s += 0.22 * t * t * t; }
    out[2 * q] = K; out[2 * q + 1] = s;
  }
  return out;
}
export const allFits = (band, dx) => Object.fromEntries(["drywall", "brick", "concrete", "glass", "door"].map((n) => [n, fitWall(n, band, dx)]));

// ---- source strength so that |u| = 1 at 1 m in open air
export const SRC_SIGMA = 1.3; // cells
export function besselJ0(x) { x = Math.abs(x);
  if (x < 8) { const y = x * x; return (57568490574 + y * (-13362590354 + y * (651619640.7 + y * (-11214424.18 + y * (77392.33017 - y * 184.9052456))))) / (57568490411 + y * (1029532985 + y * (9494680.718 + y * (59272.64853 + y * (267.8532712 + y))))); }
  const z = 8 / x, y = z * z, xx = x - 0.785398164;
  return Math.sqrt(0.636619772 / x) * (Math.cos(xx) * (1 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 + y * (-0.2073370639e-5 + y * 0.2093887211e-6)))) - z * Math.sin(xx) * (-0.1562499995e-1 + y * (0.1430488765e-3 + y * (-0.6911147651e-5 + y * (0.7621095161e-6 - y * 0.934935152e-7)))));
}
export function besselY0(x) {
  if (x < 8) { const y = x * x; return (-2957821389 + y * (7062834065 + y * (-512359803.6 + y * (10879881.29 + y * (-86327.92757 + y * 228.4622733))))) / (40076544269 + y * (745249964.8 + y * (7189466.438 + y * (47447.2647 + y * (226.1030244 + y))))) + 0.636619772 * besselJ0(x) * Math.log(x); }
  const z = 8 / x, y = z * z, xx = x - 0.785398164;
  return Math.sqrt(0.636619772 / x) * (Math.sin(xx) * (1 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 + y * (-0.2073370639e-5 + y * 0.2093887211e-6)))) + z * Math.cos(xx) * (-0.1562499995e-1 + y * (0.1430488765e-3 + y * (-0.6911147651e-5 + y * (0.7621095161e-6 - y * 0.934935152e-7)))));
}
export const hankelAbs = (x) => Math.hypot(besselJ0(x), besselY0(x));
export function sourceAmp(p) { // force per step^2, spread over a Gaussian of SRC_SIGMA cells whose weights sum to 1
  const r1 = 1 / p.dx;         // cells in one metre
  return 4 * C0 * C0 * Math.sin(p.k) / p.k / (hankelAbs(p.k * r1) * Math.exp(-p.k * p.k * SRC_SIGMA * SRC_SIGMA / 2)); // sin(k)/k: the grid's waves travel a little slower, so a source builds them higher
}
// phasor from the stored pair (exact for a steady wave on the grid): u = A cos(th), returns A cos, A sin
export const phasor = (u, v, w) => [u, (-v / (2 * Math.sin(w / 2)) + u * Math.sin(w / 2)) / Math.cos(w / 2)];

// ---- from field to signal and speed
export const dbm1m = (band) => EIRP - ALLOWANCE - 20 * Math.log10(4 * Math.PI * BANDS[band].f / C); // Friis at 1 m
export const dbm = (a2, r, band) => dbm1m(band) + 10 * Math.log10(Math.max(a2, 1e-14)) - 10 * Math.log10(Math.max(r, 0.2));

// Minimum signal (dBm, 20 MHz) at which each Wi-Fi 6 rate must work, and its rate for 2 streams (Mbps, 20 / 80 MHz)
export const RATES = [
  [-82, 17.2, 72.1], [-79, 34.4, 144.1], [-77, 51.6, 216.2], [-74, 68.8, 288.2], [-70, 103.2, 432.4], [-66, 137.6, 576.5],
  [-65, 154.9, 648.5], [-64, 172.1, 720.6], [-59, 206.5, 864.7], [-57, 229.4, 960.8], [-54, 258.1, 1080.9], [-52, 286.8, 1201],
];
export const EFFICIENCY = 0.6; // share of the radio rate a download really gets (our rule of thumb)
export function mbps(d, band) {
  const wide = BANDS[band].bw === 80, off = wide ? 6 : 0, col = wide ? 2 : 1, x = d - off, R = RATES;
  if (x >= R[R.length - 1][0]) return R[R.length - 1][col] * EFFICIENCY;
  for (let i = R.length - 1; i > 0; i--) if (x >= R[i - 1][0]) {
    const t = (x - R[i - 1][0]) / (R[i][0] - R[i - 1][0]); return (R[i - 1][col] + t * (R[i][col] - R[i - 1][col])) * EFFICIENCY; }
  const t = Math.max(0, (x + 92) / 10);                // below the slowest guaranteed rate the link fades out over 10 dB
  return R[0][col] * EFFICIENCY * t * t;
}
// the bars a phone would show (room average or a place, dBm)
export const BAR_AT = [-88, -76, -66, -55];
export const bars = (d) => { let n = 0; for (const b of BAR_AT) if (d > b) n++; return n; };
// what a person would say. Thresholds: Netflix help page (15 Mbps 4K, 5 Mbps full HD), 1 Mbps = messages and pages
export const grade = (m) => m >= 15 ? 3 : m >= 5 ? 2 : m >= 1 ? 1 : 0;

// ---- plain reference solver (used by the tests; the page runs the same update on the GPU)
export class CPU {
  constructor(nx, ny, coef) { this.nx = nx; this.ny = ny; this.c = coef; this.u = new Float64Array(nx * ny); this.v = new Float64Array(nx * ny); this.lap = new Float64Array(nx * ny); this.n = 0; }
  // src: list of {x, y, amp, phase, sigma} in cells. w: radians per step
  step(w, src, ramp = 40) {
    const { nx, ny, c, u, v, lap } = this;
    for (let j = 1; j < ny - 1; j++) for (let i = 1, q = j * nx + 1; i < nx - 1; i++, q++)
      lap[q] = (4 * (u[q - 1] + u[q + 1] + u[q - nx] + u[q + nx]) + u[q - nx - 1] + u[q - nx + 1] + u[q + nx - 1] + u[q + nx + 1] - 20 * u[q]) / 6;
    const g = Math.min(1, (this.n + 1) / ramp), env = g * g * (3 - 2 * g);
    const F = [];
    for (const s of src || []) { const sg = s.sigma ?? SRC_SIGMA, R = Math.ceil(4 * sg), drive = s.amp * env * Math.cos(w * (this.n + 1) + (s.phase || 0)) / (2 * Math.PI * sg * sg);
      for (let j = Math.round(s.y) - R; j <= Math.round(s.y) + R; j++) for (let i = Math.round(s.x) - R; i <= Math.round(s.x) + R; i++)
        if (i > 0 && j > 0 && i < nx - 1 && j < ny - 1) F.push([j * nx + i, drive * Math.exp(-((i - s.x) ** 2 + (j - s.y) ** 2) / (2 * sg * sg))]); }
    for (const [q, f] of F) lap[q] += f / Math.max(c[2 * q], 1e-9) * (c[2 * q] > 0 ? 1 : 0);
    for (let j = 1; j < ny - 1; j++) for (let i = 1, q = j * nx + 1; i < nx - 1; i++, q++) {
      const K = c[2 * q], s = c[2 * q + 1]; if (K === 0) { u[q] = v[q] = 0; continue; }
      v[q] = ((1 - s) * v[q] + K * lap[q]) / (1 + s); u[q] += v[q];
    }
    this.n++;
  }
  amp2(q, w) { const [a, b] = phasor(this.u[q], this.v[q], w); return a * a + b * b; }
}
