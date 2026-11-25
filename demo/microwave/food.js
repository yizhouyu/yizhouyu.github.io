// Shapes. A pile of rice that can be pressed flat (a: 0..1) and opened in the middle (b: 0..1); the amount never changes.
import { G } from "./heat.js";
export const VOL = 577; // mL, about 550 g: two bowls
const raw = (a, b) => { const R1 = 80 + 12 * a, R = R1 + (102 - R1) * b, p = 2 + 8 * a, A = 34 * b, d = Math.min(1, b * 2.2); return (r) => { if (r >= R) return 0; const heap = Math.cos(Math.PI / 2 * r / R), x = r / R, disc = Math.sqrt(1 - Math.pow(x, p)); let o = (1 - a) * (1 - b) * heap + (1 - (1 - a) * (1 - b)) * disc; if (b > 0) { const c = (A + R) / 2, w = (R - A) / 2, q = (r - c) / w, ring = Math.abs(q) < 1 ? Math.sqrt(1 - q ** 4) : 0; o = o * (1 - d) + ring * d; } return o; }; };
const vol = (g) => { let v = 0; for (let r = .25; r < 120; r += .5) v += 2 * Math.PI * r * .5 * g(r); return v / 1000; };
export function profile(a, b, v = VOL) { const g = raw(a, b), k = v / vol(g); return (r) => k * g(r); }
export const disc = (R, h) => (r) => r < R ? h * Math.pow(1 - Math.pow(r / R, 16), .5) : 0;
export function fill(pf) { const { NX, NY, NZ, HX, HZ } = G, f = new Float32Array(NX * NY * NZ), hx = HX * 1000, hz = HZ * 1000, S = 3; for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) for (let s = 0; s < S * S; s++) { const h = pf(Math.hypot((i - NX / 2 + ((s / S | 0) + .5) / S) * hx, (j - NY / 2 + (s % S + .5) / S) * hx)); for (let k = 0; k < NZ && k * hz < h; k++) f[(i * NY + j) * NZ + k] += Math.min(1, h / hz - k) / (S * S); } return f; }
