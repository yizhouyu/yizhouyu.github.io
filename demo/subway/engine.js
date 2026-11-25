// The timetable: decode, "how far can I get" (connection scan), train positions. No DOM here, so node can test it.
export const DAY = 86400, WALK = 80 / 60 / 1.3, WALK_CAP = 600;          // metres per second on a straight line; at most 10 minutes of walking
export const WALK_R = WALK * WALK_CAP;
const CT = { float32: Float32Array, uint32: Uint32Array, uint16: Uint16Array, uint8: Uint8Array, int8: Int8Array };

export function unpack(ab) {
  const hl = new DataView(ab).getUint32(0, true), h = JSON.parse(new TextDecoder().decode(new Uint8Array(ab, 4, hl)).trim()), base = 4 + hl, o = { ...h };
  for (const [k, [off, n, t]] of Object.entries(h.sections)) o[k] = new CT[t](ab, base + off, n);
  return o;
}

export function buildNet(D) {
  const nS = D.stops.length, nT = D.tripPat.length, nC = D.complexes.length;
  const cof = new Uint16Array(nS); D.complexes.forEach(([, m], k) => m.forEach(i => cof[i] = k));
  const tx = Array.from({ length: nS }, () => []); D.tx.forEach(([a, b, s]) => tx[a].push([b, s]));
  // every trip's first second and last second on the service-day clock (may pass 24:00)
  const t0 = new Int32Array(nT), t1 = new Int32Array(nT); let n = 0;
  for (let i = 0; i < nT; i++) {
    let t = D.tripStart[i] * 30; t0[i] = t;
    const a = D.profOff[D.tripProf[i]], b = D.profOff[D.tripProf[i] + 1]; n += b - a - 1;
    for (let k = a; k < b; k++) { t += D.profRun[k] * 30; if (k < b - 1) t += D.profDwell[k] * 30; }
    t1[i] = t;
  }
  // connections = one train moving from one stop to the next; sorted by clock time of leaving (so 24:30 sits at 00:30)
  const dep = new Int32Array(n), arr = new Int32Array(n), from = new Uint16Array(n), to = new Uint16Array(n), trip = new Uint16Array(n), hop = new Uint16Array(n), pos = new Uint8Array(n);
  let c = 0;
  for (let i = 0; i < nT; i++) {
    const p = D.tripPat[i], s0 = D.patOff[p], f = D.profOff[D.tripProf[i]], m = D.patOff[p + 1] - s0; let t = D.tripStart[i] * 30;
    for (let k = 0; k < m - 1; k++) {
      t += D.profDwell[f + k] * 30; const d = t; t += D.profRun[f + k + 1] * 30;
      dep[c] = d % DAY; arr[c] = dep[c] + (t - d); from[c] = D.patStops[s0 + k]; to[c] = D.patStops[s0 + k + 1]; trip[c] = i; hop[c] = D.patHops[s0 + k]; pos[c] = k; c++;
    }
  }
  const ord = Array.from({ length: n }, (_, i) => i).sort((a, b) => dep[a] - dep[b] || arr[a] - arr[b]);
  const re = (A, T) => { const o = new T(n); for (let i = 0; i < n; i++) o[i] = A[ord[i]]; return o; };
  const C = { n, dep: re(dep, Int32Array), arr: re(arr, Int32Array), from: re(from, Uint16Array), to: re(to, Uint16Array), trip: re(trip, Uint16Array), hop: re(hop, Uint16Array), pos: re(pos, Uint8Array) };
  const first = new Uint32Array(1442); { let k = 0; for (let m = 0; m <= 1441; m++) { while (k < n && C.dep[k] < m * 60) k++; first[m] = k; } }
  // lengths along every hop
  const nH = D.hopCol.length, hopLen = new Float32Array(D.hopPts.length);
  for (let h = 0; h < nH; h++) { let s = 0; for (let i = D.hopOff[h]; i < D.hopOff[h + 1]; i++) { if (i > D.hopOff[h]) { const a = D.hopPts[i - 1] * 2, b = D.hopPts[i] * 2; s += Math.hypot(D.ptXY[a] - D.ptXY[b], D.ptXY[a + 1] - D.ptXY[b + 1]); } hopLen[i] = s; } }
  return { D, nS, nT, nC, nH, cof, tx, t0, t1, C, first, hopLen, bySt: [...Array(nT).keys()].sort((a, b) => t0[a] - t0[b]) };
}

export const INF = 1e9;
export function newReach(net) {
  return { arr: new Float32Array(net.nS), ready: new Float32Array(net.nS), board: new Int32Array(net.nT), stamp: new Int32Array(net.nT), gen: 0, inC: new Int32Array(net.nS), via: new Int32Array(net.nS), hops: new Float32Array(net.nH * 4), count: 0 };
}
// Stand on any platform of complex `cx` at clock second t. Earliest arrival (seconds after t) at every stop, within `lim` seconds.
export function reach(net, R, cx, t, lim, opt) {
  const { C, D } = net, { arr, ready, board, stamp, inC, via, hops } = R, g = ++R.gen, full = !opt || !opt.countOnly;
  arr.fill(INF); ready.fill(INF); inC.fill(-1); via.fill(-1); if (full) hops.fill(INF);
  for (const s of D.complexes[cx][1]) { arr[s] = 0; ready[s] = 0; }
  t = ((t % DAY) + DAY) % DAY;
  let k = net.first[Math.floor(t / 60)], add = 0;
  while (k < C.n && C.dep[k] < t) k++;
  for (let guard = 0; guard < C.n; guard++, k++) {
    if (k === C.n) { k = 0; add += DAY; }
    const d = C.dep[k] + add - t; if (d > lim) break;
    const tr = C.trip[k], f = C.from[k];
    let on = stamp[tr] === g;
    if (!on) { if (ready[f] > d) continue; stamp[tr] = g; board[tr] = k; }
    const a = C.arr[k] + add - t, s = C.to[k];
    if (full) { const h = C.hop[k], o = (h >> 1) * 4 + (h & 1) * 2; if (a < hops[o + 1]) { hops[o] = d; hops[o + 1] = a; } }
    if (a < arr[s]) {
      arr[s] = a; inC[s] = k;
      const r = a + D.self[s]; if (r < ready[s]) { ready[s] = r; via[s] = -1; }
      const x = net.tx[s]; for (let i = 0; i < x.length; i++) { const r2 = a + x[i][1]; if (r2 < ready[x[i][0]]) { ready[x[i][0]] = r2; via[x[i][0]] = s; } }
    }
  }
  let n = 0; const cxs = D.complexes;
  for (let i = 0; i < cxs.length; i++) { const m = cxs[i][1]; for (let j = 0; j < m.length; j++) if (arr[m[j]] <= lim) { n++; break; } }
  R.count = n; R.lim = lim; R.cx = cx; R.t = t;
  return R;
}
export function reachCx(net, R, k) { let best = INF, s = -1; for (const m of net.D.complexes[k][1]) if (R.arr[m] < best) { best = R.arr[m]; s = m; } return [best, s]; }
// trains to take to reach stop s: [{trip, from, to, dep, arr}]
export function path(net, R, s) {
  const { C } = net, legs = [];
  for (let guard = 0; guard < 12 && R.arr[s] > 0 && R.inC[s] >= 0; guard++) {
    const k = R.inC[s], tr = C.trip[k], b = R.board[tr], d = C.dep[b] - R.t;
    legs.unshift({ trip: tr, from: C.from[b], to: s, arr: R.arr[s], dep: d < 0 ? d + DAY : d, route: net.D.patRoute[net.D.tripPat[tr]] });
    const f = C.from[b]; if (R.arr[f] === 0) break;
    s = f;                                                  // same platform area, or walked here from another member of the complex
    if (R.via[f] >= 0) s = R.via[f];
  }
  return legs;
}

// ---------- trains
// state of trip i at service-day second x: {k: stop index just left or standing at, u: 0..1 along the hop, hop}
export function tripState(net, i, x, o) {
  const D = net.D, p = D.tripPat[i], s0 = D.patOff[p], f = D.profOff[D.tripProf[i]], m = D.patOff[p + 1] - s0;
  let t = D.tripStart[i] * 30;
  if (x < t) return null;
  for (let k = 0; k < m; k++) {
    const dw = k < m - 1 ? D.profDwell[f + k] * 30 : 0;
    if (x <= t + dw) { o.k = k; o.u = 0; o.next = 0; o.hop = k < m - 1 ? D.patHops[s0 + k] : D.patHops[s0 + k - 1]; if (k === m - 1) o.u = 1; o.at = true; o.arr = t; return o; }
    t += dw; const run = D.profRun[f + k + 1] * 30;
    if (x < t + run) { const u = (x - t) / run; o.k = k; o.u = u; o.hop = D.patHops[s0 + k]; o.at = false; o.next = t + run; o.dep = t; return o; }
    t += run;
  }
  return null;
}
const ease = u => .45 * u + .55 * u * u * (3 - 2 * u);            // pull away, cruise, brake (the timetable only says when it leaves and arrives)
// point on a hop: out = [x, y, ox, oy] ; hop has direction in bit 0
export function hopPoint(net, hop, u, out) {
  const D = net.D, h = hop >> 1, a = D.hopOff[h], b = D.hopOff[h + 1] - 1; if (hop & 1) u = 1 - u;
  const L = net.hopLen[b], s = u * L; let lo = a, hi = b; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (net.hopLen[m] <= s) lo = m; else hi = m; }
  const w = net.hopLen[hi] - net.hopLen[lo], q = w > 0 ? (s - net.hopLen[lo]) / w : 0, p = D.hopPts[lo] * 2, r = D.hopPts[hi] * 2;
  out[0] = D.ptXY[p] + (D.ptXY[r] - D.ptXY[p]) * q; out[1] = D.ptXY[p + 1] + (D.ptXY[r + 1] - D.ptXY[p + 1]) * q;
  out[2] = (D.hopOx[lo * 2] + (D.hopOx[hi * 2] - D.hopOx[lo * 2]) * q) / 40; out[3] = (D.hopOx[lo * 2 + 1] + (D.hopOx[hi * 2 + 1] - D.hopOx[lo * 2 + 1]) * q) / 40;
  return out;
}
const _o = {};
export function trainAt(net, i, x, out) { const s = tripState(net, i, x, _o); if (!s) return null; return hopPoint(net, s.hop, s.at ? s.u : ease(s.u), out); }
// all trips running at clock second t: calls f(trip, service-day second). After midnight both last night's and today's trips run.
export function eachTrain(net, t, f) {
  for (let i = 0; i < net.nT; i++) { if (net.t0[i] <= t && t <= net.t1[i]) f(i, t); else { const y = t + DAY; if (net.t0[i] <= y && y <= net.t1[i]) f(i, y); } }
}
export function tripStops(net, i) {
  const D = net.D, p = D.tripPat[i], s0 = D.patOff[p], f = D.profOff[D.tripProf[i]], m = D.patOff[p + 1] - s0, o = []; let t = D.tripStart[i] * 30;
  for (let k = 0; k < m; k++) { t += D.profRun[f + k] * 30; const a = t; t += k < m - 1 ? D.profDwell[f + k] * 30 : 0; o.push({ stop: D.patStops[s0 + k], arr: a, dep: t }); }
  return o;
}
// ---------- one station's day
export function pulse(net, cx) {
  const { C, D } = net, hours = new Uint16Array(24), times = [], lines = new Map(), dirs = new Map(), add = (m, k, t) => { if (!m.has(k)) m.set(k, []); m.get(k).push(t); };
  for (let k = 0; k < C.n; k++) if (net.cof[C.from[k]] === cx) {
    hours[Math.floor(C.dep[k] / 3600)]++; times.push(C.dep[k]); const p = D.tripPat[C.trip[k]], r = D.patRoute[p], n = D.routes[r][1].replace(/(?<=[67F])X$/, "") + D.routes[r][2];
    add(lines, r, C.dep[k]); add(dirs, n + "|" + D.patDir[p] + "|" + C.from[k] + "|" + r, C.dep[k]);
  }
  const gap = a => { let g = 0, at = 0; for (let i = 0; i < a.length; i++) { const n = i + 1 < a.length ? a[i + 1] : a[0] + DAY; if (n - a[i] > g) { g = n - a[i]; at = a[i]; } } return [g, at]; };
  // the longest wait for one line in one direction, among those that never stop running
  let worst = null; for (const [k, a] of dirs) { const [g, at] = gap(a); if (g < 3 * 3600 && (!worst || g > worst.gap)) worst = { gap: g, at, r: +k.split("|")[3] }; }
  return { total: times.length, hours, worst, lines: [...lines].map(([r, a]) => { const [lg, la] = gap(a); return { r, n: a.length, allNight: lg < 3 * 3600, first: (la + lg) % DAY, last: la, gap: lg }; }) };
}
export function nextDepartures(net, cx, t, n) {
  const { C, D } = net, out = []; let k = net.first[Math.floor(t / 60)], add = 0; while (k < C.n && C.dep[k] < t) k++;
  for (let guard = 0; guard < C.n && out.length < n; guard++, k++) { if (k >= C.n) { k = 0; add += DAY; } if (net.cof[C.from[k]] === cx) out.push({ trip: C.trip[k], stop: C.from[k], pos: C.pos[k], in: C.dep[k] + add - t, route: D.patRoute[D.tripPat[C.trip[k]]], head: D.heads[D.patHead[D.tripPat[C.trip[k]]]] }); }
  return out;
}
// ---------- homes: which city blocks are within the limit (a walk of at most 10 minutes from a reached platform)
export function buildHomes(net, city) {
  const n = city.cellX.length, K = 2 * city.ext / 65535, x = new Float32Array(n), y = new Float32Array(n), G = 700, grid = new Map(), XY = net.D.stopXY;
  for (let s = 0; s < net.nS; s++) { const k = Math.floor(XY[2 * s] / G) * 4096 + Math.floor(XY[2 * s + 1] / G); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(s); }
  const off = new Uint32Array(n + 1), st = [], w = [];
  for (let i = 0; i < n; i++) {
    x[i] = city.cellX[i] * K - city.ext; y[i] = city.cellY[i] * K - city.ext; off[i] = st.length;
    const gx = Math.floor(x[i] / G), gy = Math.floor(y[i] / G);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const l = grid.get((gx + a) * 4096 + gy + b); if (l) for (const s of l) { const d = Math.hypot(XY[2 * s] - x[i], XY[2 * s + 1] - y[i]); if (d <= WALK_R) { st.push(s); w.push(d / WALK); } } }
  }
  off[n] = st.length; let total = 0; for (let i = 0; i < n; i++) total += city.cellH[i];
  return { n, x, y, off, st: Uint16Array.from(st), w: Float32Array.from(w), total, H: city.cellH, lit: new Uint8Array(n), at: new Float32Array(net.nS) };
}
export function litHomes(net, HM, R, lim) {
  const { n, off, st, w, lit, at, H } = HM; at.set(R.arr);
  for (let s = 0; s < net.nS; s++) if (R.arr[s] < INF) for (const [b, sec] of net.tx[s]) if (R.arr[s] + sec < at[b]) at[b] = R.arr[s] + sec;
  let homes = 0;
  for (let i = 0; i < n; i++) { let best = INF; for (let k = off[i]; k < off[i + 1]; k++) { const a = at[st[k]] + w[k]; if (a < best) best = a; } if (best <= lim) homes += H[i]; lit[i] = best <= 3600 ? 1 + Math.round(best / 3600 * 250) : 0; }
  return homes;
}
// ---------- the same question with a limit on changes (and the trips to take): round r = r+1 trains
export function newRounds(net, K) {
  const mk = (T, n) => Array.from({ length: K }, () => new T(n));
  return { K, arr: mk(Float32Array, net.nS), ready: mk(Float32Array, net.nS), inC: mk(Int32Array, net.nS), inR: mk(Int8Array, net.nS), via: mk(Int32Array, net.nS), board: mk(Int32Array, net.nT), min: new Int8Array(net.nT), hops: new Float32Array(net.nH * 4), stamp: new Int32Array(net.nT), gen: 0 };
}
export function reachRounds(net, R, cx, t, lim, full) {
  const { C, D } = net, K = R.K, g = ++R.gen; if (full) R.hops.fill(INF); for (let r = 0; r < K; r++) { R.arr[r].fill(INF); R.ready[r].fill(INF); R.inC[r].fill(-1); R.via[r].fill(-1); }
  for (const s of D.complexes[cx][1]) for (let r = 0; r < K; r++) { R.arr[r][s] = 0; R.ready[r][s] = 0; }
  t = ((t % DAY) + DAY) % DAY; let k = net.first[Math.floor(t / 60)], add = 0; while (k < C.n && C.dep[k] < t) k++;
  for (let guard = 0; guard < C.n; guard++, k++) {
    if (k === C.n) { k = 0; add += DAY; }
    const d = C.dep[k] + add - t; if (d > lim) break;
    const tr = C.trip[k], f = C.from[k]; let m = R.stamp[tr] === g ? R.min[tr] : K;
    for (let r = 0; r < m; r++) if (R.ready[r][f] <= d) { R.stamp[tr] = g; R.min[tr] = r; R.board[r][tr] = k; m = r; break; }
    if (m >= K) continue;
    const a = C.arr[k] + add - t, s = C.to[k], x = net.tx[s];
    if (full) { const h = C.hop[k], o = (h >> 1) * 4 + (h & 1) * 2; if (a < R.hops[o + 1]) { R.hops[o] = d; R.hops[o + 1] = a; } }
    for (let r = m; r < K; r++) {
      if (a >= R.arr[r][s]) break;
      R.arr[r][s] = a; R.inC[r][s] = k; R.inR[r][s] = m;
      if (r === m || r + 1 < K) { const q = r + 1; if (q < K) { if (a + D.self[s] < R.ready[q][s]) { R.ready[q][s] = a + D.self[s]; R.via[q][s] = s; } for (let i = 0; i < x.length; i++) { const b = x[i][0], z = a + x[i][1]; if (z < R.ready[q][b]) { R.ready[q][b] = z; R.via[q][b] = s; } } } }
    }
  }
  R.t = t; R.lim = lim; R.cx = cx; return R;
}
// trains to the complex k in round <= r, fewest changes among the earliest arrivals: [{trip,from,to,dep,arr,route}] or null
export function pathTo(net, R, k, rmax = R.K - 1) {
  let best = INF, s = -1; for (const m of net.D.complexes[k][1]) if (R.arr[rmax][m] < best) { best = R.arr[rmax][m]; s = m; }
  if (best >= INF) return null; if (best === 0) return [];
  let r = rmax; while (r > 0 && Math.min(R.arr[r - 1][s]) === best) r--;
  const legs = [], C = net.C;
  for (let guard = 0; guard < 12; guard++) {
    const c = R.inC[r][s], m = R.inR[r][s]; if (c < 0) break;
    const tr = C.trip[c], b = R.board[m][tr]; let d = C.dep[b] - R.t; if (d < 0) d += DAY;
    const f = C.from[b]; legs.unshift({ trip: tr, from: f, to: s, dep: d, arr: R.arr[r][s], route: net.D.patRoute[net.D.tripPat[tr]] });
    if (m === 0 || R.arr[0][f] === 0 && R.ready[0][f] === 0) break;
    s = R.via[m][f]; r = m - 1;
  }
  return legs;
}
export function roundsCount(net, R, r, lim) { let n = 0; for (const [, m] of net.D.complexes) for (const s of m) if (R.arr[r][s] <= lim) { n++; break; } return n; }
