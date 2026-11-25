// The shape of the street for the water solver (shared by the page, its worker and the tests). One street, cut open like a doll's house: a hill, a low spot, a small rise, a river. Geometry, light, water, small things.
import { Flow } from './flow.js';
export const X1 = 72, Z1 = 34, DX = .5, NX = X1 / DX, NZ = Z1 / DX;
export const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const g = x => x < 31 ? 2.7 - .25 * ss(0, 10, x) - 2.05 * ss(10, 27, x) : x < 60 ? .4 + 1.65 * ss(34, 45, x) - 1.45 * ss(45.5, 53, x) : .6;
export const RIVER = 62, LOW = -.8;
// rooms you can look into. floor: height of the floor; open front at z=10
export const ROOMS = { A: { x0: 3, x1: 10, y0: 6.1, y1: 8.7, z0: 6.4 }, D: { x0: 22.3, x1: 26.7, y0: -.75, y1: 1.75, z0: 6.4, pit: [22.3, 26.7], step: [25.1, 26.6] }, B: { x0: 28.3, x1: 35.3, y0: -.95, y1: 1.7, z0: 6, pit: [28.3, 35.3], step: [28.5, 30] }, C: { x0: 52.2, x1: 56.6, y0: .78, y1: 3.4, z0: 6 } };
export const HOUSES = [['A', 1.5, 11, 4, '#efece4'], ['E', 11.3, 21, 4, '#e6e2d8'], ['D', 21.3, 27.4, 3, '#eceae3'], ['B', 27.7, 36, 4, '#f0ede6'], ['F', 36.3, 45, 5, '#e4e1d9'], ['H', 45.3, 50.6, 4, '#ebe8e0'], ['C', 50.9, 57, 6, '#eeebe4']];
export const COURT = { x0: 7, x1: 21, z0: 26, z1: 33.6, y: .25, gate: [18.2, 20.6] };
const isWalk = z => z >= 13 && z < 16 || z >= 24 && z < 26;
export const ground = (x, z) => { const y = g(x); if (x >= 57.5) return y; if (z >= 16 && z < 24) return y - .05 * (1 - Math.abs(z - 20) / 4 * 0) + (z - 20) * .004; return y + .15; };
export const inPit = (x, z) => { for (const k of ['B', 'D']) { const r = ROOMS[k]; if (x > r.pit[0] && x < r.pit[1] && z > 10 && z < 13) return k; } return null; };
export const DRAINS = [{ x: 27.2, z: 16.4 }, { x: 33, z: 16.4 }, { x: 30.2, z: 23.5 }];
export const CAP = .0875; // m3/s each: the three together carry 1.75 inches of rain an hour from this hill
export const Q = inch => .15 * inch; // runoff of the hill above for a rain of so many inches an hour

export function makeFlow() {
  const bed = new Float32Array(NX * NZ), open = new Uint8Array(NX * NZ).fill(1), sea = new Uint8Array(NX * NZ);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const x = (i + .5) * DX, z = (j + .5) * DX, k = j * NX + i; let b = ground(x, z);
    if (x > RIVER) { b = -3; sea[k] = 1; }
    else if (z < 10) { open[k] = 0; for (const n of ['B', 'D', 'C']) { const r = ROOMS[n]; if (x > r.x0 && x < r.x1 && z > r.z0) { open[k] = 1; b = r.y0; } } if (x > 57) { open[k] = 1; } }
    else if (z < 13) { const p = inPit(x, z); if (p) { const r = ROOMS[p]; b = r.y0; if (z > 12.4) { const st = x > r.step[0] && x < r.step[1]; b = g(x) + .15 + (st ? (p === 'D' ? .18 : .03) : .6); } } else if (x > 50.9 && x < 57) b = Math.min(b, r0(x)); }
    else if (x > COURT.x0 && x < COURT.x1 && z > COURT.z0 && z < COURT.z1) b = COURT.y;
    if (!(x > RIVER) && z > 25.4 && z < 26 && x > COURT.x0 - .5 && x < COURT.x1 + .5) b = g(x) + (x > COURT.gate[0] && x < COURT.gate[1] ? .02 : .75);
    bed[k] = b; }
  const f = new Flow(NX, NZ, DX, bed, open); f.sea = sea; f.seaLevel = LOW;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) if (sea[j * NX + i]) f.h[j * NX + i] = LOW + 3;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX - 1; i++) { const z = (j + .5) * DX, a = inPit((i + .5) * DX, z), b = inPit((i + 1.5) * DX, z); if (z > 10 && z < 13 && a !== b) f.bx[j * NX + i] = 1; }
  for (let j = 0; j < 20; j++) for (let i = 0; i < NX - 1; i++) { const z = (j + .5) * DX, R = x => { for (const n of ['B', 'D', 'C']) { const r = ROOMS[n]; if (x > r.x0 && x < r.x1 && z > r.z0) return n; } return 0; }; if (R((i + .5) * DX) !== R((i + 1.5) * DX)) f.bx[j * NX + i] = 1; }
  const cells = (x0, x1, z0, z1) => { const o = []; for (let j = Math.floor(z0 / DX); j < z1 / DX; j++) for (let i = Math.floor(x0 / DX); i < x1 / DX; i++) o.push(j * NX + i); return o; };
  f.cells = cells; f.hill = { q: 0, cells: [...cells(0, 1, 16, 17.5), ...cells(0, 1, 22.5, 24), ...cells(0, 1, 19.5, 20.5)] }; f.src = [f.hill];
  f.drain = DRAINS.map(d => ({ cells: cells(d.x - .75, d.x + .75, d.z - .5, d.z + .5), cap: CAP * .04, got: 0 })); f.sinks = [...f.drain];
  f.roomDepth = n => { const r = ROOMS[n]; let s = 0, m = 0; for (const k of cells(r.x0 + .5, r.x1 - .5, r.z0 + .5, 9.5)) { s += f.h[k]; m++; } return s / m; };
  f.depthAt = (x, z) => f.h[Math.floor(z / DX) * NX + Math.floor(x / DX)] || 0;
  f.levelAt = (x, z) => { const k = Math.floor(z / DX) * NX + Math.floor(x / DX); return f.z[k] + f.h[k]; };
  return f;
}
function r0(x) { return x > 52 ? .72 : 9; }

// one flood board (level 6). at the door of B, at the door of D, or across the street so that it leads into the court
export function setBoard(f, where) { f.z.set(f.z0); const up = (k, h) => { f.z[k] = Math.max(f.z[k], f.z0[k] + h); };
  if (where === 'B' || where === 'D') { const r = ROOMS[where]; for (const k of f.cells(r.step[0], r.step[1], 12.5, 13)) f.z[k] = g(r.step[0]) + .9; }
  if (where === 'S') for (const p of slopeLine()) { const i = Math.floor(p[0] / DX), j = Math.floor(p[1] / DX); up(j * NX + i, .55); up(j * NX + i + 1, .55); } f.act = null; }
export const SLOPE = [[15.2, 10], [20.9, 26]];
export const slopeLine = () => { const o = [], n = 60; for (let i = 0; i <= n; i++) o.push([SLOPE[0][0] + (SLOPE[1][0] - SLOPE[0][0]) * i / n, SLOPE[0][1] + (SLOPE[1][1] - SLOPE[0][1]) * i / n]); return o; };

