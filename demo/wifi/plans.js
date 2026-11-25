// Homes. Metres, plan view. Walls are centre lines; features (doors, windows, openings) cut a gap in the wall they sit on.
import { WALLS, W, H, W0, H0, SIZE, LARGE } from "./physics.js";
import { HOMES, SOIL } from "./homes.js";

const w = (m, x1, y1, x2, y2) => ({ m, x1, y1, x2, y2 });
const f = (k, o, x, y, len, extra = {}) => ({ k, o, x, y, w: len, ...extra }); // k: door | win | gap, o: h | v (direction of the wall)
const outer = (m, a, b, c, d) => [w(m, a, b, c, b), w(m, c, b, c, d), w(m, a, d, c, d), w(m, a, b, a, d)];

export const PLANS = { ...HOMES,
  concrete: {
    router: [4.4, 1.42], phone: [9.95, 6.4],
    walls: [...outer("concrete", 0.7, 0.7, 10.5, 7.0),
      w("brick", 2.9, 0.7, 2.9, 2.9), w("brick", 0.7, 2.9, 2.9, 2.9),
      w("concrete", 4.6, 0.7, 4.6, 7.0), w("concrete", 4.6, 3.55, 10.5, 3.55), w("brick", 4.6, 4.65, 8.5, 4.65),
      w("brick", 8.5, 3.55, 8.5, 4.65), w("concrete", 7.4, 4.65, 7.4, 7.0), w("brick", 6.5, 0.7, 6.5, 3.55),
      // the metal cabinet by the front door, open in front
      w("metal", 4.2, 1.2, 4.47, 1.2), w("metal", 4.2, 1.64, 4.47, 1.64), w("metal", 4.47, 1.2, 4.47, 1.64)],
    feats: [f("door", "h", 3.72, 0.7, 0.95, { m: "metal", h: -1, s: 1 }), f("door", "v", 2.9, 2.1, 0.85, { h: 1, s: -1 }),
      f("gap", "v", 4.6, 4.1, 0.9), f("door", "h", 5.35, 3.55, 0.8, { h: -1, s: -1, open: 1 }), f("door", "h", 7.5, 3.55, 0.85, { h: -1, s: -1, open: 1 }),
      f("door", "h", 5.7, 4.65, 0.85, { h: -1, s: 1, open: 1 }), f("door", "v", 8.5, 4.1, 0.8, { h: 1, s: 1 }),
      f("win", "h", 2.65, 7.0, 2.4), f("win", "v", 0.7, 1.8, 1.1), f("win", "v", 10.5, 2.1, 1.7), f("win", "v", 10.5, 5.8, 1.5), f("win", "h", 5.95, 7.0, 1.4), f("win", "h", 5.6, 0.7, 0.7)],
    boxes: [[0.82, 0.82, 1.5, 1.5, "fridge"]],
    labels: [["living", 2.5, 5.1], ["kitchen", 1.9, 2.3], ["bath", 5.5, 2.0], ["bed2", 8.5, 2.0], ["hall", 6.9, 4.1], ["study", 5.95, 5.9], ["bed1", 9.0, 6.0]],
  },
  railroad: {
    router: [1.05, 5.9], phone: [9.6, 3.1],
    walls: [...outer("brick", 0.65, 0.95, 10.55, 6.6), w("brick", 0.65, 2.25, 10.55, 2.25),
      w("brick", 3.75, 2.25, 3.75, 6.6), w("brick", 5.95, 2.25, 5.95, 6.6), w("brick", 7.85, 2.25, 7.85, 6.6),
      w("brick", 8.9, 4.75, 10.55, 4.75), w("brick", 8.9, 4.75, 8.9, 6.6)],
    feats: [f("door", "v", 3.75, 2.95, 0.85, { h: 1, s: 1, open: 1 }), f("door", "v", 5.95, 2.95, 0.85, { h: 1, s: 1 }), f("door", "v", 7.85, 2.95, 0.85, { h: 1, s: 1, open: 1 }),
      f("door", "v", 8.9, 5.6, 0.7, { h: 1, s: 1 }), f("door", "h", 9.5, 2.25, 0.9, { m: "metal", h: 1, s: 1 }), f("door", "h", 1.3, 2.25, 0.9, { m: "metal", h: 1, s: 1 }),
      f("win", "v", 0.65, 3.5, 1.0), f("win", "v", 0.65, 5.2, 1.0), f("win", "v", 10.55, 3.4, 0.9), f("win", "h", 6.9, 6.6, 0.8), f("win", "h", 4.85, 6.6, 0.8)],
    boxes: [[7.97, 5.75, 8.6, 6.45, "fridge"]],
    labels: [["living", 2.2, 4.4], ["bed1", 4.85, 4.4], ["bed2", 6.9, 4.4], ["kitchen", 9.6, 3.5], ["bath", 9.75, 5.7], ["stairs", 5.5, 1.6]],
  },
  drywall: {
    router: [1.1, 6.5], phone: [9.6, 1.6],
    walls: [...outer("brick", 0.7, 0.7, 10.5, 7.0), w("drywall", 3.9, 3.6, 3.9, 7.0), w("drywall", 0.7, 3.6, 3.9, 3.6),
      w("drywall", 0.7, 2.0, 2.6, 2.0), w("drywall", 2.6, 0.7, 2.6, 3.6),
      w("drywall", 7.2, 0.7, 7.2, 7.0), w("drywall", 7.2, 3.3, 10.5, 3.3), w("drywall", 7.2, 4.9, 10.5, 4.9)],
    feats: [f("door", "v", 2.6, 2.8, 0.8, { h: 1, s: -1 }), f("door", "v", 3.9, 4.3, 0.8, { h: -1, s: -1, open: 1 }), f("door", "v", 7.2, 2.6, 0.85, { h: 1, s: 1, open: 1 }),
      f("door", "v", 7.2, 5.6, 0.85, { h: -1, s: 1 }), f("door", "h", 8.3, 4.9, 0.75, { h: -1, s: -1, open: 1 }), f("door", "v", 2.6, 1.4, 0.75, { h: -1, s: -1 }),
      f("door", "h", 3.4, 0.7, 0.95, { m: "metal", h: -1, s: 1 }), f("win", "h", 5.55, 7.0, 2.2), f("win", "h", 2.2, 7.0, 1.5), f("win", "v", 10.5, 2.0, 1.5), f("win", "h", 8.8, 7.0, 1.6)],
    boxes: [[6.4, 0.85, 7.08, 1.55, "fridge"]],
    labels: [["living", 5.5, 4.6], ["bed1", 2.2, 5.5], ["bath", 1.55, 2.85], ["closet", 1.6, 1.35], ["bed2", 8.9, 2.0], ["bath2", 9.2, 4.1], ["study", 8.8, 6.0]],
  },
  onebed: {
    router: [9.1, 4.6], phone: [2.15, 1.7],
    walls: [...outer("concrete", 1.6, 1.0, 9.6, 6.7), w("concrete", 6.6, 1.0, 6.6, 4.1), w("concrete", 6.6, 4.1, 9.6, 4.1),
      w("concrete", 4.6, 1.0, 4.6, 4.35), w("concrete", 1.6, 4.35, 4.6, 4.35)],
    feats: [f("door", "h", 7.3, 4.1, 0.8, { h: -1, s: -1 }), f("door", "v", 9.6, 5.4, 0.95, { m: "metal", h: 1, s: -1 }),
      f("door", "v", 4.6, 3.6, 0.85, { h: 1, s: 1 }), f("win", "v", 1.6, 2.6, 1.7), f("win", "h", 4.4, 6.7, 2.2)],
    boxes: [[8.72, 6.0, 9.4, 6.55, "fridge"]],
    mirrors: [[6.47, 2.4, 1.6, 90]],
    labels: [["living", 5.2, 5.5], ["bed1", 3.1, 2.9], ["bath", 8.1, 2.4]],
  },
  own: {
    router: [1.6, 5.8], phone: [8.8, 2],
    walls: [...outer("concrete", 1.0, 1.0, 10.25, 6.75), w("brick", 5.5, 1.0, 5.5, 6.75)],
    feats: [f("door", "v", 5.5, 4.25, 0.9, { h: 1, s: 1, open: 1 }), f("door", "h", 2.0, 1.0, 0.9, { m: "metal", h: -1, s: 1 }), f("win", "h", 3.2, 6.75, 2), f("win", "h", 8, 6.75, 2)],
    boxes: [], labels: [],
  },
};
// rooms where nobody puts a router / that do not count for the score
export const NO_ROUTER = new Set(["bath", "bath2", "lift"]);
export const NOT_COUNTED = new Set(["stairs", "hall", "closet", "landing", "garage", "lift", "cellar", "stock"]);

export const clone = (p) => ({ walls: [], feats: [], boxes: [], mirrors: [], blocks: [], labels: [], size: 1, ...JSON.parse(JSON.stringify(p)) });
export const wallRect = (s) => { const t = WALLS[s.m].t / 2; return [Math.min(s.x1, s.x2) - t, Math.min(s.y1, s.y2) - t, Math.max(s.x1, s.x2) + t, Math.max(s.y1, s.y2) + t]; };
export const gapRect = (d, t = 0.13) => d.o === "h" ? [d.x - d.w / 2, d.y - t, d.x + d.w / 2, d.y + t] : [d.x - t, d.y - d.w / 2, d.x + t, d.y + d.w / 2];
// the door leaf as a rectangle: closed in the wall, open at a right angle to it
export function leafRect(d) {
  const t = WALLS.door.t / 2, h = d.h || 1, s = d.s || 1;
  if (!d.open) return d.o === "h" ? [d.x - d.w / 2, d.y - t, d.x + d.w / 2, d.y + t] : [d.x - t, d.y - d.w / 2, d.x + t, d.y + d.w / 2];
  const hx = d.o === "h" ? d.x + h * (d.w / 2 - t) : d.x, hy = d.o === "v" ? d.y + h * (d.w / 2 - t) : d.y;
  return d.o === "h" ? [hx - t, Math.min(hy, hy + s * d.w), hx + t, Math.max(hy, hy + s * d.w)] : [Math.min(hx, hx + s * d.w), hy - t, Math.max(hx, hx + s * d.w), hy + t];
}
export function fill(ids, nx, ny, dx, [a, b, c, d], id) {
  // exact cell counts: start from the rounded corner, keep the rounded size, so every wall has the thickness that was fitted
  const ni = Math.max(1, Math.round((c - a) / dx)), nj = Math.max(1, Math.round((d - b) / dx)), i0 = Math.round(a / dx), j0 = Math.round(b / dx);
  for (let j = Math.max(0, j0); j < Math.min(ny, j0 + nj); j++) for (let i = Math.max(0, i0); i < Math.min(nx, i0 + ni); i++) ids[j * nx + i] = id;
}
export function raster(plan, nx, ny, dx) {
  const ids = new Uint8Array(nx * ny);
  for (const b of plan.solid || []) fill(ids, nx, ny, dx, b, WALLS.concrete.id);
  const order = ["drywall", "glass", "brick", "concrete", "metal"];
  for (const m of order) for (const s of plan.walls) if (s.m === m) fill(ids, nx, ny, dx, wallRect(s), WALLS[m].id);
  for (const d of plan.feats) { fill(ids, nx, ny, dx, gapRect(d), 0);
    if (d.k === "win") { const t = WALLS.glass.t / 2; fill(ids, nx, ny, dx, d.o === "h" ? [d.x - d.w / 2, d.y - t, d.x + d.w / 2, d.y + t] : [d.x - t, d.y - d.w / 2, d.x + t, d.y + d.w / 2], 4); } }
  for (const d of plan.feats) if (d.k === "door") fill(ids, nx, ny, dx, leafRect(d), d.m === "metal" ? 6 : 5);
  for (const b of plan.boxes) fill(ids, nx, ny, dx, b, 6);
  for (const m of plan.mirrors || []) fillMirror(ids, nx, ny, dx, m, 6);
  return ids;
}
// a mirror: [x, y, length, angle in degrees]; its back is metal. A 4 cm strip, any angle.
export const MIRROR_T = 0.04;
export function mirrorEnds([x, y, l, a]) { const c = Math.cos(a * Math.PI / 180) * l / 2, s = Math.sin(a * Math.PI / 180) * l / 2; return [[x - c, y - s], [x + c, y + s]]; }
export function fillMirror(ids, nx, ny, dx, m, id) {
  const [x, y, l, a] = m, c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180), R = l / 2 + 0.1;
  for (let j = Math.max(0, Math.floor((y - R) / dx)); j <= Math.min(ny - 1, (y + R) / dx); j++) for (let i = Math.max(0, Math.floor((x - R) / dx)); i <= Math.min(nx - 1, (x + R) / dx); i++) {
    const X = (i + .5) * dx - x, Y = (j + .5) * dx - y; if (Math.abs(X * c + Y * s) <= l / 2 && Math.abs(Y * c - X * s) <= MIRROR_T / 2) ids[j * nx + i] = id; }
}
// rooms = closed regions when every door counts as shut. 8 cm grid.
export const RG0 = 0.08, RNX = Math.round(W0 / RG0), RNY = Math.round(H0 / RG0);
export const rg = () => RG0 * SIZE;
export function findRooms(plan) {
  const RG = rg();
  const b = new Uint8Array(RNX * RNY);
  for (const s of plan.walls) if (s.m !== "metal" || Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 1.5) fill(b, RNX, RNY, RG, pad(wallRect(s)), 1);
  for (const d of plan.feats) fill(b, RNX, RNY, RG, pad(gapRect(d, 0.06)), 1);
  for (const x of plan.boxes) fill(b, RNX, RNY, RG, x, 1);
  const id = new Int16Array(RNX * RNY).fill(-1), rooms = [];
  for (let q = 0; q < b.length; q++) { if (b[q] || id[q] >= 0) continue;
    const st = [q], cells = []; id[q] = rooms.length; let out = false;
    while (st.length) { const c = st.pop(); cells.push(c); const i = c % RNX, j = (c / RNX) | 0;
      if (i === 0 || j === 0 || i === RNX - 1 || j === RNY - 1) out = true;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, e = j + dj; if (a < 0 || e < 0 || a >= RNX || e >= RNY) continue; const n = e * RNX + a; if (!b[n] && id[n] < 0) { id[n] = rooms.length; st.push(n); } } }
    rooms.push({ cells, out, area: cells.length * RG * RG }); }
  const keep = [], map = new Int16Array(RNX * RNY).fill(-1);
  let n = 0;
  rooms.forEach((r, k) => { if (r.out || r.area < 1.1) return;
    const lab = plan.labels.find((l) => id[Math.floor(l[2] / RG) * RNX + Math.floor(l[1] / RG)] === k);
    let at = lab ? [lab[1], lab[2]] : middle(r.cells);
    const room = { key: lab ? lab[0] : null, num: lab ? 0 : ++n, at, area: r.area, cells: r.cells, index: keep.length };
    room.counted = !NOT_COUNTED.has(room.key); room.routerOk = !NO_ROUTER.has(room.key) && room.key !== "stairs" && room.key !== "lift";
    r.cells.forEach((c) => map[c] = keep.length); keep.push(room); });
  return { rooms: keep, map };
}
const pad = ([a, b, c, d]) => { const RG = rg(); // at least one cell thick
  if (c - a < RG) { const m = (a + c) / 2; a = m - RG / 2; c = m + RG / 2; } if (d - b < RG) { const m = (b + d) / 2; b = m - RG / 2; d = m + RG / 2; } return [a, b, c, d]; };
function middle(cells) { const RG = rg(); // the room cell furthest from the room's edge, roughly
  const set = new Set(cells); let best = -1, at = cells[0];
  for (let k = 0; k < cells.length; k += 3) { const c = cells[k]; let r = 0; while (r < 40 && set.has(c - r) && set.has(c + r) && set.has(c - r * RNX) && set.has(c + r * RNX)) r++; if (r > best) { best = r; at = c; } }
  return [(at % RNX + 0.5) * RG, (Math.floor(at / RNX) + 0.5) * RG];
}
// What the straight way from a to b goes through: [{m, x, y}] (m: wall kind, or "metal")
export function crossings(ids, nx, ny, dx, a, b) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 0.005), out = []; let cur = 0, from = 0;
  for (let k = 0; k <= n; k++) {
    const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n, i = Math.floor(x / dx), j = Math.floor(y / dx);
    const id = k < n && i >= 0 && j >= 0 && i < nx && j < ny ? ids[j * nx + i] : 0;
    if (id !== cur) { if (cur) { const h = (from + k) / 2 / n; out.push({ id: cur, x: a[0] + (b[0] - a[0]) * h, y: a[1] + (b[1] - a[1]) * h, len: (k - from) / n * L }); } cur = id; from = k; }
  }
  // two pieces of the same corner count once
  return out.filter((c, k) => !(k && Math.hypot(c.x - out[k - 1].x, c.y - out[k - 1].y) < 0.14 && out[k - 1].len >= c.len));
}

// ---- links
const M = ["drywall", "brick", "concrete", "glass", "metal"], KS = ["door", "win", "gap"];
export const NAMES = ["living", "kitchen", "bed1", "bed2", "study", "bath", "hall", "closet", "stairs", "bath2", "dining", "common", "shop", "meeting", "office", "stock", "garage", "landing", "cellar", "lift"];
export function encodePlan(p) {
  const r = (v) => Math.max(0, Math.round(v * 20)), j = (a) => a.map((n) => n.toString(36)).join(".");
  return [p.walls.map((s) => j([M.indexOf(s.m), r(s.x1), r(s.y1), r(s.x2), r(s.y2)])).join("_"),
    p.feats.map((d) => j([KS.indexOf(d.k), d.o === "h" ? 0 : 1, r(d.x), r(d.y), r(d.w), d.open ? 1 : 0, d.h < 0 ? 1 : 0, d.s < 0 ? 1 : 0, d.m === "metal" ? 1 : 0])).join("_"),
    p.boxes.map((b) => j(b.slice(0, 4).map(r))).join("_"),
    (p.mirrors || []).map((m) => j([r(m[0]), r(m[1]), r(m[2]), Math.round(m[3] / 45) & 3])).join("_"),
    p.labels.filter((l) => NAMES.includes(l[0])).map((l) => j([NAMES.indexOf(l[0]), r(l[1]), r(l[2])])).join("_"),
    (p.size === LARGE ? "1" : "0") + (p.side ? "s" : "")].join("~");
}
export function decodePlan(s) {
  const [a = "", b = "", c = "", d = "", e = "", z = ""] = s.split("~"), num = (x) => x.split(".").map((v) => parseInt(v, 36));
  const k = z[0] === "1" ? LARGE : 1, mx = Math.round(W0 * k * 20), my = Math.round(H0 * k * 20);
  const ok = (v, m) => Number.isFinite(v) && v >= 0 && v <= m;
  const p = { walls: [], feats: [], boxes: [], mirrors: [], blocks: [], labels: [], size: k, ...(z.includes("s") ? { side: 1, ...JSON.parse(JSON.stringify(SOIL)) } : {}) };
  for (const t of a.split("_").filter(Boolean).slice(0, 200)) { const [m, x1, y1, x2, y2] = num(t); if (M[m] && [x1, x2].every((v) => ok(v, mx)) && [y1, y2].every((v) => ok(v, my)) && (x1 === x2 || y1 === y2)) p.walls.push(w(M[m], x1 / 20, y1 / 20, x2 / 20, y2 / 20)); }
  for (const t of b.split("_").filter(Boolean).slice(0, 100)) { const [kk, o, x, y, l, op, h, sw, me] = num(t); if (KS[kk] && ok(x, mx) && ok(y, my) && ok(l, 100)) p.feats.push(f(KS[kk], o ? "v" : "h", x / 20, y / 20, l / 20, { open: op ? 1 : 0, h: h ? -1 : 1, s: sw ? -1 : 1, ...(me ? { m: "metal" } : {}) })); }
  for (const t of c.split("_").filter(Boolean).slice(0, 20)) { const q = num(t); if (q.length === 4 && q.every((v) => ok(v, mx)) && q[2] > q[0] && q[3] > q[1]) p.boxes.push([...q.map((v) => v / 20), "fridge"]); }
  for (const t of d.split("_").filter(Boolean).slice(0, 20)) { const [x, y, l, g] = num(t); if (ok(x, mx) && ok(y, my) && ok(l, 100) && ok(g, 3)) p.mirrors.push([x / 20, y / 20, l / 20, g * 45]); }
  for (const t of e.split("_").filter(Boolean).slice(0, 40)) { const [n, x, y] = num(t); if (NAMES[n] && ok(x, mx) && ok(y, my)) p.labels.push([NAMES[n], x / 20, y / 20]); }
  return p.walls.length ? p : null;
}
// ---- drawing a room as a box: only the parts that have no wall yet get one
export function addRoom(plan, m, x1, y1, x2, y2) {
  if (x2 < x1) [x1, x2] = [x2, x1]; if (y2 < y1) [y1, y2] = [y2, y1]; let n = 0;
  const edge = (horiz, at, from, to) => {
    let list = [[from, to]];
    for (const s of plan.walls) { const h = s.y1 === s.y2; if (h !== horiz && s.x1 !== s.x2) continue; if ((s.y1 === s.y2) !== horiz) continue;
      const line = horiz ? s.y1 : s.x1; if (Math.abs(line - at) > 0.13) continue;
      const a = Math.min(horiz ? s.x1 : s.y1, horiz ? s.x2 : s.y2), b = Math.max(horiz ? s.x1 : s.y1, horiz ? s.x2 : s.y2);
      list = list.flatMap(([p, q]) => b <= p || a >= q ? [[p, q]] : [[p, Math.max(p, a)], [Math.min(q, b), q]]).filter(([p, q]) => q - p > 0.12); }
    for (const [p, q] of list) { plan.walls.push(horiz ? w(m, p, at, q, at) : w(m, at, p, at, q)); n++; }
  };
  edge(true, y1, x1, x2); edge(true, y2, x1, x2); edge(false, x1, y1, y2); edge(false, x2, y1, y2); return n;
}
