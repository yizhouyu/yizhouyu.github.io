// Which side, when, how often. No DOM: used by the page and by tests/.
export const ELEV = { EWR: 4, JFK: 4, LGA: 5 };
export const R2D = 180 / Math.PI;
export const dirOf = rw => String(parseInt(rw));                 // "22L" -> "22"
export const CITY = [[-2801.3, -809.9], [-477.9, 3157.4], [-67.6, 5145.0]]; // replaced by data: 1 WTC, Empire State, Central Park Tower
export function prepare(j) {
  for (const t of j.tracks) { const n = t.d.length / 3; t.N = n; t.x = new Float32Array(n); t.y = new Float32Array(n); t.z = new Float32Array(n); let a = [0, 0, 0]; for (let i = 0; i < n; i++) { for (let c = 0; c < 3; c++) a[c] += t.d[i * 3 + c]; t.x[i] = a[0]; t.y[i] = a[1]; t.z[i] = a[2]; }
    t.dir = dirOf(t.rw); t.T = (n - 1) * 2; smooth(t); }
  return j;
}
// heading and bank along the track, smoothed over a few seconds
function smooth(t) { const n = t.N, h = new Float32Array(n); for (let i = 0; i < n; i++) { const a = Math.max(0, i - 2), b = Math.min(n - 1, i + 2); h[i] = Math.atan2(t.x[b] - t.x[a], t.y[b] - t.y[a]); if (i) { while (h[i] - h[i - 1] > Math.PI) h[i] -= 2 * Math.PI; while (h[i] - h[i - 1] < -Math.PI) h[i] += 2 * Math.PI; } }
  const sm = (v, r) => v.map((_, i) => { let s = 0, w = 0; for (let k = -r; k <= r; k++) { const q = v[Math.min(n - 1, Math.max(0, i + k))], g = r + 1 - Math.abs(k); s += q * g; w += g; } return s / w; });
  t.h = sm(h, 3); const bank = new Float32Array(n), pit = new Float32Array(n); for (let i = 0; i < n; i++) { const a = Math.max(0, i - 2), b = Math.min(n - 1, i + 2), dt = (b - a) * 2, d = Math.hypot(t.x[b] - t.x[a], t.y[b] - t.y[a]), v = d / dt; bank[i] = Math.max(-28, Math.min(28, Math.atan(v * (t.h[b] - t.h[a]) / dt / 9.81) * R2D)); pit[i] = Math.atan2(t.z[b] - t.z[a], Math.max(d, 1)) * R2D; }
  t.bank = sm(bank, 4); t.pit = sm(pit, 4); }
const lerp = (v, f) => { const i = Math.min(v.length - 2, Math.max(0, Math.floor(f))), u = f - i; return v[i] + (v[i + 1] - v[i]) * u; };
const cat = (v, f) => { const n = v.length, i = Math.min(n - 2, Math.max(0, Math.floor(f))), u = Math.min(1, Math.max(0, f - i)), p = v[Math.max(0, i - 1)], a = v[i], b = v[i + 1], q = v[Math.min(n - 1, i + 2)]; return a + .5 * u * (b - p + u * (2 * p - 5 * a + 4 * b - q + u * (3 * (a - b) + q - p))); };
// sec: seconds from the start of the track. After touchdown the plane rolls straight on; before take-off it starts to roll.
export function pose(t, sec) {
  const E = ELEV[t.ap], last = t.N - 1; let f = sec / 2, x, y, z, over = 0;
  if (f > last && t.k === 'A') { over = sec - t.T; f = last; } if (f < 0) f = 0;
  x = cat(t.x, f); y = cat(t.y, f); z = cat(t.z, f); const h = lerp(t.h, f);
  if (over > 0) { const v = 68, d = over < 24 ? v * over - .5 * 2.2 * over * over : v * 24 - .5 * 2.2 * 576; x += Math.sin(h) * Math.max(0, d); y += Math.cos(h) * Math.max(0, d); z = Math.max(4, z - over * 3.2); }
  const gamma = lerp(t.pit, f); return { x, y, z: Math.max(4, z) + E, h: h * R2D, bank: over ? 0 : lerp(t.bank, f), pitch: t.k === 'A' ? (over ? Math.max(0, 2.5 - over * .6) : 2.5) : Math.min(11, gamma + 4) };
}
export const relBearing = (p, x, y) => { let r = (Math.atan2(x - p.x, y - p.y) * R2D - p.h) % 360; if (r > 180) r -= 360; if (r < -180) r += 360; return r; };
// share of flights per landing/take-off direction. wind: undefined = a whole year (Port Authority), 'calm', or degrees the wind comes FROM
export function shares(j, k, ap, wind) {
  if (wind === undefined || wind === null) { const o = {}; for (const r in j.share[ap][k]) { const d = dirOf(r); o[d] = (o[d] || 0) + j.share[ap][k][r] / 100; } return o; }
  const W = j.wind[k + ap], norm = q => { const o = {}; let s = 0; for (const r in q) if (r !== 'n') s += q[r]; for (const r in q) if (r !== 'n') o[dirOf(r)] = q[r] / s; return o; };
  if (wind === 'calm') return norm(W.calm);
  const bins = Object.keys(W).filter(b => b !== 'calm').map(Number).sort((a, b) => a - b); wind = (wind % 360 + 360) % 360; let lo = bins[bins.length - 1], hi = bins[0]; for (const b of bins) { if (b <= wind) lo = b; } for (const b of [...bins].reverse()) if (b > wind) hi = b; if (!bins.some(b => b > wind)) hi = bins[0]; if (!bins.some(b => b <= wind)) lo = bins[bins.length - 1];
  const span = ((hi - lo + 360) % 360) || 360, u = ((wind - lo + 360) % 360) / span, A = norm(W[lo]), B = norm(W[hi]), o = {}; for (const r of new Set([...Object.keys(A), ...Object.keys(B)])) o[r] = (A[r] || 0) * (1 - u) + (B[r] || 0) * u; return o;
}
// how the real flights of one direction split: left / right / neither (both sides alike counts half and half)
export function sideOf(j, k, ap, dir, g) { let L = 0, R = 0, n = 0; for (const key in j.stats) { const [kk, a, r, gg] = key.split(' '); if (kk !== k || a !== ap || dirOf(r) !== dir || (g && gg !== g)) continue; const s = j.stats[key]; L += s.L + s.B / 2; R += s.R + s.B / 2; n += s.n; } return n ? { L: L / n, R: R / n, n } : g ? sideOf(j, k, ap, dir) : { L: 0, R: 0, n: 0 }; }
export function odds(j, k, ap, wind, g) { const s = shares(j, k, ap, wind), o = { L: 0, R: 0, O: 0, dirs: s, n: 0 }; let t = 0; for (const d in s) { const q = sideOf(j, k, ap, d, g); o.L += s[d] * q.L; o.R += s[d] * q.R; o.n += q.n; t += s[d]; } o.L /= t; o.R /= t; o.O = Math.max(0, 1 - o.L - o.R); return o; }
export const topDir = s => Object.keys(s).sort((a, b) => s[b] - s[a])[0];
export function track(j, k, ap, dir, g) { const c = j.tracks.filter(t => t.k === k && t.ap === ap && t.dir === dir); const q = g && c.filter(t => t.g === g); return (q && q.length ? q : c).sort((a, b) => b.n - a.n)[0]; }
// three whole numbers that add up to 100
export function pct(o) { const v = [o.L, o.R, o.O].map(x => x * 100), f = v.map(Math.floor); let r = 100 - f[0] - f[1] - f[2]; v.map((x, i) => [x - f[i], i]).sort((a, b) => b[0] - a[0]).slice(0, r).forEach(([, i]) => f[i]++); return { L: f[0], R: f[1], O: f[2] }; }
// landmarks in the order a passenger on that side meets them: [{id, side, t (s), a, b, km}], one entry each (the closest pass)
export function passes(j, t, side) { const best = {}; for (const [li, s, a, b, q, km] of t.ev) { if (side && s !== side) continue; const id = j.lm[li], key = id + s; if (!best[key] || best[key].km > km) best[key] = { id, side: s, a: a * 2, b: b * 2, t: q * 2, km }; else { best[key].a = Math.min(best[key].a, a * 2); best[key].b = Math.max(best[key].b, b * 2); } } return Object.values(best).sort((p, q) => p.t - q.t); }
export const visibleAt = (j, t, side, sec) => t.ev.filter(e => e[1] === side && e[2] * 2 - 1 <= sec && e[3] * 2 + 1 >= sec).map(e => ({ id: j.lm[e[0]], km: e[5], a: e[2] * 2, b: e[3] * 2, t: e[4] * 2 }));
// seconds the skyline can be seen from a side on this track (same rule as src/tracks.py)
export function cityTime(t, side, LM) { const pts = [[LM.wtc.x, LM.wtc.y], [LM.esb.x, LM.esb.y], [LM.cpt.x, LM.cpt.y]]; let s = 0, near = 99; for (let i = 0; i < t.N - 1; i++) { const h = Math.atan2(t.x[i + 1] - t.x[i], t.y[i + 1] - t.y[i]) * R2D; let hit = false; for (const [x, y] of pts) { const d = Math.hypot(x - t.x[i], y - t.y[i]); if (d > 30000) continue; let r = ((Math.atan2(x - t.x[i], y - t.y[i]) * R2D - h) % 360 + 540) % 360 - 180; if (Math.abs(r) >= 35 && Math.abs(r) <= 145 && (r > 0) === (side === 'R')) { hit = true; near = Math.min(near, d / 1000); } } if (hit) s += 2; } return { s, near }; }
