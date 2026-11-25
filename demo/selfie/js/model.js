// The parts of the page that can be checked without a browser.
import * as O from './optics.js';
export const HUMANS = ['plaster', 'basalt', 'honey', 'terracotta', 'child'];
export const turn = (X, D) => Math.atan2(-X, D);
export function pointsOf(h) { if (h.pts) return h.pts; const n = h.v, out = [], q = h.q, s = [0, 1, 2].map(k => (h.hi[k] - h.lo[k]) / 65535); for (let i = 0; i < n; i += 7) { const p = [0, 1, 2].map(k => h.lo[k] + q[i * 3 + k] * s[k]); if (p[1] > -105) out.push(p); } return h.pts = out; }
/** outline of a head standing at X, looking at the lens D away: width / height of its image */
export function outline(h, X, D, a = turn(X, D)) { const c = Math.cos(a), s = Math.sin(a); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of pointsOf(h)) { const px = X + c * p[0] + s * p[2], z = D - (-s * p[0] + c * p[2]), x = px / z, y = p[1] / z; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return [x0, x1, y0, y1]; }
/** how much wider the head is drawn than the same head, equally far away, in the middle of the picture */
export function pulled(h, X, D) { const a = outline(h, X, D), b = outline(h, 0, Math.hypot(X, D)), r = o => (o[1] - o[0]) / (o[3] - o[2]); return r(a) / r(b) - 1; }
export const F = 26, PA = .75, WALK = 300, FAR = 1500;
export const faceShare = (h, d, z) => { const D = O.lensZ(h, d) - h.zy[2], wid = 43.2666 * PA / Math.hypot(PA, 1); return 2 * h.zy[0] * F * z / D / wid; };
export const zoomFor = h => faceShare(h, WALK, 1) / faceShare(h, FAR, 1);
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function guessSet(seed) { const r = rng(seed), hs = HUMANS.slice(); for (let i = hs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[hs[i], hs[j]] = [hs[j], hs[i]]; } const bands = [[180, 280], [280, 420], [420, 650], [650, 1000], [1000, 1600]]; for (let i = 4; i > 0; i--) { const j = Math.floor(r() * (i + 1));[bands[i], bands[j]] = [bands[j], bands[i]]; } return hs.map((h, i) => ({ h, d: Math.round((bands[i][0] + r() * (bands[i][1] - bands[i][0])) / 10) * 10 })); }
export const GA = 2.35, SLOT = [-750, -375, 0, 375, 750], GD = 600; // five sitters on one line, 37.5 cm apart, all looking at the lens; the lens is GD in front of the noses
