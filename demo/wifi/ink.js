// The drafted part: walls, doors, windows, mirrors, the scale. Canvas 2D, any zoom, both orientations.
import { WALLS, C, BANDS } from "./physics.js";
import { wallRect, gapRect, leafRect, mirrorEnds, MIRROR_T } from "./plans.js";

export const PAPER = "#f3f5f3", INK = "#061a38", RED = "#e0352b";
// plan metres <-> picture pixels. v = { x, y, w, h (metres shown), k (pixels per metre), p (portrait) }
export const toView = (X, Y, v) => v.p ? [(v.y + v.h - Y) * v.k, (X - v.x) * v.k] : [(X - v.x) * v.k, (Y - v.y) * v.k];
export const toPlan = (X, Y, v) => v.p ? [v.x + Y / v.k, v.y + v.h - X / v.k] : [v.x + X / v.k, v.y + Y / v.k];
const rectV = ([a, b, c, d], v) => { const [x1, y1] = toView(a, b, v), [x2, y2] = toView(c, d, v); return [Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)]; };
const grow = ([x, y, w, h], e) => [x - e, y - e, w + 2 * e, h + 2 * e];

export function pieces(plan) { // wall rectangles with the gaps cut out
  const out = [];
  for (const s of plan.walls) { let list = [wallRect(s)]; const horiz = Math.abs(s.x2 - s.x1) >= Math.abs(s.y2 - s.y1);
    for (const d of plan.feats) { const g = gapRect(d); if ((d.o === "h") !== horiz) continue; const next = [];
      for (const r of list) { if (g[0] >= r[2] || g[2] <= r[0] || g[1] >= r[3] || g[3] <= r[1]) { next.push(r); continue; }
        if (horiz) { if (g[0] > r[0]) next.push([r[0], r[1], g[0], r[3]]); if (g[2] < r[2]) next.push([g[2], r[1], r[2], r[3]]); }
        else { if (g[1] > r[1]) next.push([r[0], r[1], r[2], g[1]]); if (g[3] < r[3]) next.push([r[0], g[3], r[2], r[3]]); } }
      list = next; }
    for (const r of list) out.push({ m: s.m, r, s }); }
  return out;
}
// pattern of the concrete dots is fixed to the plan, so it does not swim when the view moves
const DOTS = (() => { let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; return Array.from({ length: 260 }, () => [rnd(), rnd(), rnd()]); })();

export function drawInk(g, plan, v, o = {}) {
  const px = o.px || Math.max(0.8, Math.min(3.2, v.k / 100)), all = pieces(plan), P = all.filter((p) => p.m !== "metal"), Mx = all.filter((p) => p.m === "metal"), R = (r) => rectV(r, v);
  g.save(); g.lineJoin = "miter"; g.lineCap = "butt";
  // solid masses (experiment 2): the negative of a concrete section, so the print keeps its shape
  for (const b of plan.blocks || []) { const [x, y, w, h] = R(b.r); g.fillStyle = "rgba(4,18,44,.94)"; g.fillRect(x, y, w, h); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = g.strokeStyle = "rgba(243,245,243,.5)"; const S = 110 * px; for (let X = Math.floor(x / S) * S; X < x + w; X += S) for (let Y = Math.floor(y / S) * S; Y < y + h; Y += S) for (const [i, j, c] of DOTS) { if (c < .45) continue; const sh = Math.abs(Math.sin((X / S) * 12.9 + (Y / S) * 78.2) * 43758.5) % 1, dx = X + ((i + sh) % 1) * S, dy = Y + ((j + sh * 1.7) % 1) * S; if (c < .93) { const q = (.4 + c * .6) * px; g.fillRect(dx, dy, q, q); } else { g.lineWidth = .6 * px; const s = 3 * px; g.beginPath(); g.moveTo(dx, dy); g.lineTo(dx + s, dy + .5 * s); g.lineTo(dx + .2 * s, dy + s); g.closePath(); g.stroke(); } } g.restore(); }
  if (plan.outline) { g.strokeStyle = PAPER; g.lineWidth = 1.6 * px; for (const L of plan.outline) { g.beginPath(); L.forEach((q, i) => { const [x, y] = toView(...q, v); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); } }
  // a thin dark halo keeps the paper-white walls crisp on bright waves
  g.fillStyle = "rgba(4,18,44,.9)"; for (const { r } of P) g.fillRect(...grow(R(r), 1.3 * px));
  for (const m of ["glass", "drywall", "brick", "concrete"]) { const L = P.filter((p) => p.m === m); if (!L.length) continue;
    g.fillStyle = PAPER; for (const { r } of L) g.fillRect(...R(r));
    if (m === "glass") { for (const { r } of L) glass(g, ...R(r), px); continue; }
    g.save(); g.beginPath(); for (const { r } of L) g.rect(...R(r)); g.clip(); g.strokeStyle = g.fillStyle = INK;
    for (const { r } of L) { const [x, y, w, h] = R(r);
      if (m === "brick") { g.lineWidth = .6 * px; g.globalAlpha = .62; const st = 4.6 * px; g.beginPath(); const o0 = Math.floor((x + y) / st) * st; for (let c = o0; c < x + w + y + h; c += st) { g.moveTo(c - y, y); g.lineTo(c - y - h, y + h); } g.stroke(); }
      if (m === "concrete") { g.globalAlpha = .72; const S = 64 * px; for (let X = Math.floor(x / S) * S; X < x + w; X += S) for (let Y = Math.floor(y / S) * S; Y < y + h; Y += S) for (const [a, b, c] of DOTS) { const dx = X + a * S, dy = Y + b * S; if (dx < x || dy < y || dx > x + w || dy > y + h) continue;
        if (c < .93) { const q = (.5 + c * .55) * px; g.fillRect(dx, dy, q, q); } else { g.lineWidth = .5 * px; const s = 2.3 * px; g.beginPath(); g.moveTo(dx, dy); g.lineTo(dx + s, dy + .5 * s); g.lineTo(dx + .2 * s, dy + s); g.closePath(); g.stroke(); } } }
      if (m === "drywall") { g.globalAlpha = .5; g.lineWidth = .6 * px; g.beginPath(); if (w > h) { g.moveTo(x, y + h * .5); g.lineTo(x + w, y + h * .5); } else { g.moveTo(x + w * .5, y); g.lineTo(x + w * .5, y + h); } g.stroke(); } }
    g.restore(); }
  for (const d of plan.feats) {
    if (d.k === "win") glass(g, ...R(gapRect(d, 0.07)), px);
    if (d.k === "door") door(g, d, v, px);
  }
  for (const { r } of Mx) { g.fillStyle = PAPER; g.fillRect(...grow(R(r), px)); g.fillStyle = INK; g.fillRect(...R(r)); }
  for (const b of plan.boxes) { const [x, y, w, h] = R(b); g.fillStyle = INK; g.fillRect(x, y, w, h); g.strokeStyle = PAPER; g.lineWidth = 1.1 * px; g.strokeRect(x + .5 * px, y + .5 * px, w - px, h - px); g.lineWidth = .6 * px; g.strokeRect(x + 3 * px, y + 3 * px, w - 6 * px, h - 6 * px);
    if (o.t) { const tx = (o.t.boxes && o.t.boxes[b[4]]) || o.t.fridge, q = o.dpr || 1, up = h > w * 1.6; g.font = `${Math.max(9 * q, Math.min((up ? h * .16 : w * .25), 15 * q))}px ${o.font}`; const tw = g.measureText(tx).width; if (tw < (up ? h : w) - 5 * q && Math.min(w, h) > 11 * q) { g.save(); g.translate(x + w / 2, y + h / 2); if (up) g.rotate(-Math.PI / 2); g.fillStyle = PAPER; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(tx, 0, 0); g.restore(); } } }
  for (const m of plan.mirrors || []) { const [a, b] = mirrorEnds(m).map((q) => toView(...q, v)), L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L], t = Math.max(2.2 * px, MIRROR_T * v.k);
    g.lineCap = "butt"; g.strokeStyle = "rgba(4,18,44,.9)"; g.lineWidth = t + 3.4 * px; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); g.strokeStyle = PAPER; g.lineWidth = t + 1.2 * px; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); g.strokeStyle = INK; g.lineWidth = Math.max(.8 * px, t - 1.4 * px); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
    g.strokeStyle = PAPER; g.lineWidth = .8 * px; g.beginPath(); for (let s = 6 * px; s < L - 2 * px; s += 7 * px) { const X = a[0] + (b[0] - a[0]) * s / L, Y = a[1] + (b[1] - a[1]) * s / L; g.moveTo(X + n[0] * t * .45, Y + n[1] * t * .45); g.lineTo(X - n[0] * t * .45 + (b[0] - a[0]) / L * t * .5, Y - n[1] * t * .45 + (b[1] - a[1]) / L * t * .5); } g.stroke(); }
  if (o.sel) selection(g, o.sel, v, px);
  for (const L of o.sizes || []) { const [x, y] = toView(L.x, L.y, v), fs = 14 * (o.dpr || 1); g.font = `${fs}px ${o.font}`; g.textAlign = "center"; g.textBaseline = "middle"; const w = g.measureText(L.text).width + fs * .9; g.fillStyle = "rgba(4,18,44,.9)"; g.fillRect(x - w / 2, y - fs * .8, w, fs * 1.6); g.fillStyle = L.red ? "#ff8075" : PAPER; g.fillText(L.text, x, y); }
  if (o.scale) scaleBar(g, v, px, o);
  g.restore();
}
function glass(g, x, y, w, h, px) {
  g.fillStyle = "rgba(4,18,44,.92)"; g.fillRect(x - px, y - px, w + 2 * px, h + 2 * px);
  g.strokeStyle = PAPER; g.lineWidth = .9 * px; g.strokeRect(x, y, w, h); g.beginPath(); if (w > h) { g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); } else { g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); } g.stroke();
}
function door(g, d, v, px) {
  const h = d.h || 1, s = d.s || 1, hx = d.o === "h" ? d.x + h * d.w / 2 : d.x, hy = d.o === "v" ? d.y + h * d.w / 2 : d.y;
  const A = d.o === "h" ? [hx, hy + s * d.w] : [hx + s * d.w, hy], B = d.o === "h" ? [hx - h * d.w, hy] : [hx, hy - h * d.w];
  const [cx, cy] = toView(hx, hy, v), [ax, ay] = toView(...A, v), [bx, by] = toView(...B, v);
  const a0 = Math.atan2(ay - cy, ax - cx), a1 = Math.atan2(by - cy, bx - cx); let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  if (d.m !== "metal") { g.strokeStyle = "rgba(243,245,243,.8)"; g.lineWidth = .75 * px; g.setLineDash(d.open ? [] : [3 * px, 3 * px]); g.beginPath(); g.arc(cx, cy, d.w * v.k, a0, a1, da < 0); g.stroke(); g.setLineDash([]); }
  const r = rectV(leafRect(d), v); g.fillStyle = "rgba(4,18,44,.9)"; g.fillRect(...grow(r, px));
  g.fillStyle = d.m === "metal" ? INK : PAPER; g.fillRect(...r); if (d.m === "metal") { g.strokeStyle = PAPER; g.lineWidth = .9 * px; g.strokeRect(...r); }
}
function selection(g, sel, v, px) {
  g.strokeStyle = RED; g.lineWidth = 2 * px; g.setLineDash([]);
  if (sel.kind === "wall") g.strokeRect(...grow(rectV(wallRect(sel.it), v), 3.4 * px));
  else if (sel.kind === "feat") g.strokeRect(...grow(rectV(gapRect(sel.it), v), 3.4 * px));
  else if (sel.kind === "box") g.strokeRect(...grow(rectV(sel.it, v), 3.4 * px));
  else if (sel.kind === "mirror") { for (const e of mirrorEnds(sel.it)) { const [x, y] = toView(...e, v); g.beginPath(); g.arc(x, y, 6 * px, 0, 7); g.stroke(); } }
}
function scaleBar(g, v, px, o) { // 1 m, and the true size of one ripple, in the bottom margin
  const WW = (v.p ? v.h : v.w) * v.k, HH = (v.p ? v.w : v.h) * v.k, q = o.dpr || 1, y = HH - (o.low ? 11 : 21) * q, m = 34 * q, fs = (o.small ? 10.5 : 12.5) * q, u = v.k < 50 * q ? 1 : v.k > 300 * q ? .25 : v.k > 150 * q ? .5 : 1;
  g.font = `${fs}px ${o.font}`; g.textBaseline = "middle"; g.strokeStyle = g.fillStyle = "rgba(243,245,243,.94)"; g.lineWidth = q;
  const X = WW - m, l = u * v.k, tick = (x) => { g.moveTo(x, y - 3.5 * q); g.lineTo(x, y + 3.5 * q); };
  g.beginPath(); g.moveTo(X, y); g.lineTo(X - l, y); tick(X); tick(X - l); g.stroke(); g.textAlign = "right"; g.fillText(u < 1 ? u * 100 + " cm" : "1 m", X - l - 7 * q, y);
  if (o.band && o.t) { const lam = C / BANDS[o.band].f, n = Math.max(2, Math.min(5, Math.round(26 * q / (lam * v.k)))), A = m; g.textAlign = "left"; g.beginPath(); for (let i = 0; i <= 80; i++) { const a = A + i / 80 * n * lam * v.k, b = y - Math.sin(i / 80 * n * 2 * Math.PI) * 4 * q; i ? g.lineTo(a, b) : g.moveTo(a, b); } g.stroke(); g.fillText((o.small && o.zoomed ? o.t.rippleS : o.t.ripple)((lam * 100).toFixed(1)), A + n * lam * v.k + 8 * q, y); }
}
// ---- red pencil
export function circlePath([x, y], R) { let d = ""; for (let i = 0; i <= 46; i++) { const a = -2 + i / 40 * 2 * Math.PI, r = R * (1 + .05 * Math.sin(a * 2 + .6) + .0022 * (i - 20)); d += (i ? "L" : "M") + (x + r * 1.08 * Math.cos(a)).toFixed(1) + " " + (y + r * .96 * Math.sin(a)).toFixed(1); } return d; }
export function arrowPath(A, B, g0 = 34, g1 = 52, h = 13) {
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]); if (L < g0 + g1 + 34) return "";
  const u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], n = [-u[1], u[0]], s = [A[0] + u[0] * g0, A[1] + u[1] * g0], e = [B[0] - u[0] * g1, B[1] - u[1] * g1], b = Math.min(40, L * .12);
  const c = [(s[0] + e[0]) / 2 + n[0] * b, (s[1] + e[1]) / 2 + n[1] * b], t = [e[0] - c[0], e[1] - c[1]], l = Math.hypot(...t), q = [t[0] / l, t[1] / l], p = (k) => [e[0] - q[0] * h + k * q[1] * h * .55, e[1] - q[1] * h - k * q[0] * h * .55], f = (z) => z.map((m) => m.toFixed(1)).join(" ");
  return `M${f(s)}Q${f(c)} ${f(e)}M${f(p(1))}L${f(e)}L${f(p(-1))}`;
}
export const scalePath = (d, s) => d.replace(/-?\d+(\.\d+)?/g, (n) => (n * s).toFixed(1));
