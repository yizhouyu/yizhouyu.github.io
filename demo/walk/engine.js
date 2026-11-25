// Manhattan on foot: real street geometry, typical signal timing. All lengths in metres, times in seconds.
export const FT = .3048, C = 90;
export const V0 = 4.27 * FT;                       // NYC DCP 2006: mean walking speed 4.27 ft/s
// x of the avenue centre line, curb-to-curb width (ft), direction of traffic (+1 uptown, -1 downtown, 0 both)
export const AVE = [
  { id: '6', x: -133.3, w: 60, d: 1 }, { id: '5', x: 178.7, w: 54, d: -1 }, { id: 'Mad', x: 333.9, w: 54, d: 1 },
  { id: 'Park', x: 489.5, w: 110, d: 0 }, { id: 'Lex', x: 645.7, w: 50, d: -1 }, { id: '3', x: 799.9, w: 70, d: 1 }, { id: '2', x: 1016.4, w: 70, d: -1 }];
export const ST = [
  [46, 407.1, 34], [47, 486.0, 30], [48, 565.8, 30], [49, 644.8, 30], [50, 725.0, 30], [51, 804.5, 30], [52, 884.1, 32], [53, 963.6, 32],
  [54, 1042.9, 34], [55, 1122.4, 34], [56, 1201.8, 34], [57, 1287.4, 60], [58, 1372.7, 32], [59, 1452.7, 35], [60, 1532.5, 35]].map(([n, y, w]) => ({ n, y, w }));
// leading pedestrian interval on the crossing of the avenue (NYC Open Data xc4v-ntf4): filled by lpi.js
export let LPI = new Set();
export const setLPI = s => { LPI = s; };
export const SIG = { cycle: 90, yellow: 3, allred: 2, stGreen: 32, parkSt: 38, wideSt: 40, lpi: 7, pedV: 3.5, minWalk: 7, waveMph: 25, jit: 4 };

export function rng(seed) { let s = (seed * 2654435761 + 12345) >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// one "moment of the day": the clocks of all lights
export function world(seed, o = {}) {
  const S = { ...SIG, ...o }, R = rng(seed), C = S.cycle;
  const base = AVE.map(() => R() * C), off = [];
  for (let a = 0; a < AVE.length; a++) { off.push([]); for (let s = 0; s < ST.length; s++) { const mps = S.waveMph * 5280 / 3600 * FT; off[a].push(base[a] + AVE[a].d * (ST[s].y - ST[0].y) / mps + (R() - .5) * 2 * S.jit); } }
  return { seed, S, C, off, base, v: (o.v || 1) * V0 };
}
// WALK windows at an intersection, measured from the start of the avenue's green. N = crossing the street, E = crossing the avenue
export function windows(w, a, s) {
  const S = w.S, k = S.cycle / 90, lp = LPI.has(AVE[a].id + '|' + ST[s].n) && S.lpi ? S.lpi : 0;
  const gs = k * (AVE[a].id === 'Park' ? S.parkSt : ST[s].w >= 50 ? S.wideSt : S.stGreen);
  const ga = S.cycle - 2 * (S.yellow + S.allred) - gs - lp;
  const clrN = ST[s].w / S.pedV, clrE = AVE[a].w / S.pedV;
  const e0 = ga + S.yellow + S.allred;             // the avenue crossing gets its WALK here (with the head start if there is one)
  return { ga, gs, lp, N: [0, Math.max(S.minWalk, ga - clrN), ga], E: [e0, e0 + Math.max(S.minWalk, gs + lp - clrE), e0 + lp + gs] };
}
export const phase = (w, a, s, t) => { const p = (t - w.off[a][s]) % w.C; return p < 0 ? p + w.C : p; };
export function light(w, a, s, dir, t) {            // what the pedestrian sees
  const p = phase(w, a, s, t), [x, y, z] = windows(w, a, s)[dir];
  if (p >= x && p < y) return { st: 'walk', left: y - p, wait: 0 };
  const wait = (x - p + w.C) % w.C;
  if (p >= y && p < z) return { st: 'flash', left: z - p, wait };
  return { st: 'stop', wait };
}
export const waitFor = (w, a, s, dir, t) => light(w, a, s, dir, t).wait;

// the corner graph. node = {a,s,e,n}: e=1 on the east side of the avenue, n=1 on the north side of the street
const CURB = 2.2;                                   // where you stand, back from the curb
export const pos = p => ({ x: AVE[p.a].x + (p.e ? 1 : -1) * (AVE[p.a].w * FT / 2 + CURB), y: ST[p.s].y + (p.n ? 1 : -1) * (ST[p.s].w * FT / 2 + CURB) });
export const same = (p, q) => p.a === q.a && p.s === q.s && p.e === q.e && p.n === q.n;
export const key = p => p.a * 10000 + p.s * 100 + p.e * 10 + p.n;
export function move(w, p, dir) {                   // 'N' = along the avenue towards the goal, 'E' = along the street towards the goal (w.sx, w.sy = which way that is)
  let to; const sx = w.sx || 1, sy = w.sy || 1;
  if (dir === 'N') to = (sy > 0) === !!p.n ? { ...p, s: p.s + sy, n: sy > 0 ? 0 : 1 } : { ...p, n: sy > 0 ? 1 : 0 };
  else to = (sx > 0) === !!p.e ? { ...p, a: p.a + sx, e: sx > 0 ? 0 : 1 } : { ...p, e: sx > 0 ? 1 : 0 };
  if (to.a < 0 || to.s < 0 || to.a >= AVE.length || to.s >= ST.length) return null;
  const A = pos(p), B = pos(to);
  return { to, cross: to.a === p.a && to.s === p.s, len: Math.abs(A.x - B.x) + Math.abs(A.y - B.y) };
}
const nx = p => p.a * 2 + p.e, ny = p => p.s * 2 + p.n;
export const aim = (w, p, g) => { w.sx = Math.sign(nx(g) - nx(p)) || 1; w.sy = Math.sign(ny(g) - ny(p)) || 1; return w; };
export const left = (p, g) => ({ E: Math.abs(nx(g) - nx(p)), N: Math.abs(ny(g) - ny(p)) });      // half-steps left
export const crossings = (p, g) => { let E = 0, N = 0; for (let i = Math.min(nx(p), nx(g)); i < Math.max(nx(p), nx(g)); i++) if (!(i & 1)) E++; for (let i = Math.min(ny(p), ny(g)); i < Math.max(ny(p), ny(g)); i++) if (!(i & 1)) N++; return { E, N }; };
export function step(w, p, dir, t) {                // wait if needed, then go
  const m = move(w, p, dir), q = m.cross ? waitFor(w, p.a, p.s, dir, t) : 0;
  return { ...m, wait: q, t: t + q + m.len / w.v };
}
export function run(w, p, g, pol, t = 0, mem = {}) {
  const t0 = t, log = []; let wait = 0, n = 0; aim(w, p, g);
  while (!same(p, g)) {
    const L = left(p, g), d = L.E <= 0 ? 'N' : L.N <= 0 ? 'E' : pol(w, p, t, g, mem);
    const r = step(w, p, d, t); log.push({ p, d, t, wait: r.wait, to: r.to, t1: r.t, cross: r.cross }); wait += r.wait; n += r.cross ? 1 : 0; p = r.to; t = r.t;
  }
  return { t: t - t0, wait, log, n, stops: log.filter(l => l.wait > .5).length };
}
// habits
export const straightN = () => 'N', straightE = () => 'E';
export function waits(w, p, t) { const f = d => { const m = move(w, p, d); return m ? (m.cross ? waitFor(w, p.a, p.s, d, t) : 0) : 1e9; }; return { N: f('N'), E: f('E') }; }
// "save your turns for red lights": keep going; when it is red and the other way is open, turn (unless the red ends within `cut` seconds)
export function saver(cut = 0, main = 'N') { const o = main === 'N' ? 'E' : 'N'; return (w, p, t) => { const q = waits(w, p, t); if (q[main] === 0) return main; if (q[o] === 0) return q[main] <= cut ? main : o; return q[main] <= q[o] ? main : o; }; }
// the fastest possible walk, knowing every light in advance
export function best(w, p0, g, t0 = 0) {
  const memo = new Map();
  const f = (p, t) => {
    if (same(p, g)) return { v: t, d: null };
    const k = key(p) + ':' + Math.round(t * 1000); let b = memo.get(k); if (b) return b; b = { v: Infinity, d: null };
    const L = left(p, g);
    for (const d of ['N', 'E']) { if (L[d] <= 0) continue; const r = step(w, p, d, t); const q = f(r.to, r.t); if (q.v < b.v - 1e-9) b = { v: q.v, d }; }
    memo.set(k, b); return b;
  };
  aim(w, p0, g); f(p0, t0); return run(w, p0, g, (w, p, t) => f(p, t).d, t0);
}
