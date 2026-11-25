import { INK, PAPER, QUIET } from "./damage.js";
export const GREEN = "#00a56a", GREY = "#b9bdb9";
// c is scaled so that the sheet is 1×1. All helpers work in those units.
export function text(c, str, x, y, size, { align = "center", base = "middle", color = INK, weight = 300, font = "Host,NotoQR,'PingFang SC','Noto Sans SC',sans-serif", alpha = 1, rot = 0, spacing = 0 } = {}) {
  const m = c.getTransform(), k = m.a || 1; c.save(); c.setTransform(1, 0, 0, 1, m.e + x * m.a + y * m.c, m.f + x * m.b + y * m.d); if (rot) c.rotate(rot); c.globalAlpha *= alpha; c.fillStyle = color; c.textAlign = align; c.textBaseline = base; c.font = `${weight} ${size * k}px ${font}`; if (spacing && "letterSpacing" in c) c.letterSpacing = spacing * k + "px"; c.fillText(str, 0, 0); c.restore();
}
export function line(c, pts, color, w) { c.strokeStyle = color; c.lineWidth = w; c.lineJoin = "round"; c.lineCap = "butt"; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
// squares with the printed edge merged: fn(i,j,index) → null | {on, color, s (scale x), k (scale both), alpha}
export function squares(c, n, fn, q = QUIET) {
  const u = 1 / (n + 2 * q);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const r = fn(i, j, j * n + i); if (!r) continue; const k = r.k ?? 1, sx = (r.s ?? 1) * k; if (k <= 0 || sx === 0) continue;
    const w = u * Math.abs(sx), h = u * k, o = k >= .999 && sx >= .999 ? u * .012 : 0; // a hair of ink spread so neighbours join
    c.fillStyle = r.alpha != null && r.alpha < 1 ? pale(r.alpha) : r.color || INK; c.fillRect((i + q + .5) * u - w / 2 - o, (j + q + .5) * u - h / 2 - o, w + 2 * o, h + 2 * o);
  }
}
const pale = a => `rgb(${Math.round(247 - 225 * a)},${Math.round(247 - 223 * a)},${Math.round(243 - 220 * a)})`; // solid, so joined squares show no seams
export const cellAt = (p, n, q = QUIET) => { const k = n + 2 * q, i = Math.floor(p[0] * k) - q, j = Math.floor(p[1] * k) - q; return [i, j, i >= 0 && j >= 0 && i < n && j < n ? j * n + i : -1]; };
export function bracket(c, x, y, r, color, w, ang = 0, len = .36) { // four corner ticks around a point
  c.save(); c.translate(x, y); c.rotate(ang); c.strokeStyle = color; c.lineWidth = w; c.beginPath();
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.moveTo(a * r, b * r * (1 - len)); c.lineTo(a * r, b * r); c.lineTo(a * r * (1 - len), b * r); } c.stroke(); c.restore();
}
export function hatch(c, x, y, u, color, w) { c.strokeStyle = color; c.lineWidth = w; c.beginPath(); for (const d of [.33, .66, 1, 1.33, 1.66]) { const a = Math.max(0, d - 1), b = Math.min(1, d); c.moveTo(x + a * u, y + (d - a) * u); c.lineTo(x + b * u, y + (d - b) * u); } c.stroke(); }

export function trail(c, pts, u, color, w) { // the reading path; it lifts the pen where it jumps over a mark
  c.strokeStyle = color; c.lineWidth = w; c.lineJoin = "round"; c.beginPath(); pts.forEach(([x, y], i) => { const a = pts[i - 1]; if (!i || Math.hypot(x - a[0], y - a[1]) > 2.6 * u) c.moveTo(x, y); else c.lineTo(x, y); }); c.stroke();
}
