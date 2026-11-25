import { Chapter } from "./chapter.js";
import { el, clamp, vib } from "./util.js";
import { encode, mapOf } from "./core.js";
import { decodeImage, threshold, gridFrom, gridFrom4, findAlign, findFinders, pickThree, sample, homography, project } from "./decode.js";
import { squares, text, line, bracket, GREEN } from "./draw.js";
import { INK } from "./damage.js";
import { play } from "./sound.js";
const W = 300, K = .58; // camera picture size; the code takes this much of the sheet while it turns
export class Find extends Chapter {
  constructor(S) { super(S, "find", ["turn", "cover", "count", "tilt"], 1); }
  begin() {
    const S = this.S; this.e = encode(S.T.ruin.def, "H", { byte: true }); this.n = this.e.n; this.map = mapOf(this.e); this.ang = this.name === "turn" ? -.22 : 0; this.turned = 0; this.cov = -1; this.count = 0; this.dir = 0; this.rx = 0; this.ry = 0; this.use4 = false; this.tiltSeen = 0; this.spin = 0; this.auto = this.name === "turn";
    S.plane.style.transform = ""; S.over.style.cursor = { turn: "grab", cover: "pointer", count: "ew-resize", tilt: "move" }[this.name]; this.look(); this.cam = null; if (this.name === "tilt") { this.rx = .0; this.ry = 0; this.tilt(); }
  }
  leave() { this.S.plane.style.transform = ""; }
  words() { const d = this.S.T.ruin.def; if (this.e && this.e.text !== d) { this.e = encode(d, "H", { byte: true }); this.map = mapOf(this.e); this.look(); this.name === "tilt" && this.tilt(); } super.words(); this.S.paint(); this.S.mark(); }
  controls() {
    if (this.name === "cover") return [this.rep = el("p", { class: "cap" })];
    if (this.name === "count") return [this.num1 = el("p", { class: "big" }, String(this.count || ""))];
    if (this.name === "tilt") { const t = this.T, mk = (v, l) => el("button", { type: "button", role: "radio", "aria-checked": String(this.use4 === v), onclick: () => { this.use4 = v; this.tilt(); this.words(); if (v && this.tiltSeen) this.pass(); play.dot(); } }, l); return [this.bad = el("p", { class: "big" }), el("p", { class: "cap" }, t.misread), el("div", { class: "seg", role: "radiogroup" }, mk(false, t.without), mk(true, t.with))]; }
    return [];
  }
  point(e) { const r = this.S.sheet.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
  /* what the camera sees: the sheet turned in its plane */
  look() {
    const n = this.n, g = new Uint8Array(W * W).fill(245), c = Math.cos(this.ang), s = Math.sin(this.ang), k = this.name === "turn" ? K : n / (n + 8), m = this.e.modules, cv = this.cov >= 0 ? this.covAt() : null;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const X = (x + .5) / W - .5, Y = (y + .5) / W - .5; if (cv && Math.hypot(X + .5 - cv[0], Y + .5 - cv[1]) < cv[2]) continue; const u = (X * c + Y * s) / k + .5, v = (-X * s + Y * c) / k + .5; if (u >= 0 && v >= 0 && u < 1 && v < 1 && m[Math.floor(v * n) * n + Math.floor(u * n)]) g[y * W + x] = 22; }
    const r = decodeImage(g, W, W); this.r = r; this.seen = r.three || null; this.S.mark();
  }
  covAt() { const n = this.n, u = 1 / (n + 8), a = 7.5 * u, b = 1 - a; return [...[[a, a], [b, a], [a, b], [b, b]][this.cov], 5.6 * u]; }
  tilt() {
    const S = this.S, n = this.n, a = this.rx, b = this.ry, d = 2.4, P = (x, y) => { const x1 = x * Math.cos(b), z1 = -x * Math.sin(b), y2 = y * Math.cos(a) - z1 * Math.sin(a), z2 = y * Math.sin(a) + z1 * Math.cos(a), k = d / (d - z2); return [x1 * k, y2 * k]; };
    S.plane.style.transform = `rotateX(${a}rad) rotateY(${b}rad)`;
    const src = [[0, 0], [1, 0], [0, 1], [1, 1]], scr = src.map(([x, y]) => { const q = P(x - .5, y - .5); return [(q[0] / 1.24 + .5) * W, (q[1] / 1.24 + .5) * W]; });
    const inv = homography(scr, src), g = new Uint8Array(W * W).fill(200), m = this.e.modules; this.inv = inv;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const [u, v] = project(inv, x + .5, y + .5); if (u < 0 || v < 0 || u >= 1 || v >= 1) continue; const i = Math.floor(u * (n + 8)) - 4, j = Math.floor(v * (n + 8)) - 4; g[y * W + x] = i >= 0 && j >= 0 && i < n && j < n && m[j * n + i] ? 22 : 245; }
    const T = threshold(g), set = pickThree(findFinders(g, W, W, T))[0]; this.dots = null; this.miss = 0;
    if (set) {
      let h = gridFrom(set.t, n), mk = null; if (this.use4) { mk = findAlign(g, W, W, T, h, n); if (mk) h = gridFrom4(set.t, mk, n) || h; }
      const bits = sample(g, W, W, T, h, n); this.dots = []; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i, wrong = bits[k] !== m[k]; if (wrong) this.miss++; const s = project(h, i + .5, j + .5); this.dots.push([...project(inv, s[0], s[1]), wrong]); }
      this.mk = mk ? project(inv, mk.x, mk.y) : null;
    } else this.miss = -1;
    this.S.mark(); this.S.paint();
  }
  tick(dt) {
    if (this.auto && !this.held) { this.ang += dt * .00012; this.look(); return true; }
    if (this.name === "turn" && !this.held && Math.abs(this.spin) > .0002) { this.ang += this.spin * dt; this.spin *= Math.exp(-dt / 420); this.look(); return true; } return false;
  }
  draw(c) {
    const n = this.n, m = this.e.modules, role = this.map.roles;
    if (this.name === "turn") { const t = c.getTransform(); c.translate(.5, .5); c.rotate(this.ang); c.scale(K, K); c.translate(-.5, -.5); squares(c, n, (i, j, k) => m[k] ? {} : null, 0); c.setTransform(t); }
    else if (this.name === "count") squares(c, n, (i, j, k) => m[k] ? { alpha: j === 6 || i === 6 ? 1 : .13 } : null);
    else { squares(c, n, (i, j, k) => m[k] ? {} : null);
      if (this.cov >= 0) { const [x, y, r] = this.covAt(); c.fillStyle = "rgba(22,24,23,.2)"; c.beginPath(); c.arc(x + .003, y + .006, r, 0, 7); c.fill(); c.fillStyle = "#fdfdfb"; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = "rgba(22,24,23,.18)"; c.lineWidth = .0015; c.stroke(); } }
  }
  marks(c) {
    const w = 1 / this.S.size, n = this.n, u = 1 / (n + 8);
    if (this.name === "turn" && this.seen) {
      const s = this.seen.map(f => [(f.x + .5) / W, (f.y + .5) / W]), sz = K / n, [a, b, d] = s; s.forEach(([x, y]) => bracket(c, x, y, sz * 4.8, GREEN, w * 1.8, this.ang, .35));
      c.fillStyle = GREEN; s.forEach(([x, y]) => { // the bar the reader looks for, on a level line through each corner
        const f = sz / Math.max(Math.abs(Math.cos(this.ang)), Math.abs(Math.sin(this.ang))); let p = x - 3.5 * f; [1, 1, 3, 1, 1].forEach((k, i) => { if (i % 2 === 0) c.fillRect(p, y - w * 2, k * f, w * 4); p += k * f; }); });
      const up = [(a[0] - d[0]), (a[1] - d[1])], L = Math.hypot(...up), U = [up[0] / L, up[1] / L], mid = [(a[0] + b[0]) / 2 + U[0] * .115, (a[1] + b[1]) / 2 + U[1] * .115], R = [-U[1], U[0]];
      c.strokeStyle = GREEN; c.lineWidth = w * 1.8; c.beginPath(); c.moveTo(mid[0] - U[0] * .05, mid[1] - U[1] * .05); c.lineTo(...mid); c.moveTo(mid[0] - U[0] * .018 + R[0] * .015, mid[1] - U[1] * .018 + R[1] * .015); c.lineTo(...mid); c.lineTo(mid[0] - U[0] * .018 - R[0] * .015, mid[1] - U[1] * .018 - R[1] * .015); c.stroke();
      const L0 = .5 - .098, bx = .028; let q = L0; [1, 1, 3, 1, 1].forEach((k, i) => { const wd = k * bx; if (i % 2 === 0) { c.fillStyle = GREEN; c.fillRect(q, .93, wd, .012); } text(c, String(k), q + wd / 2, .964, .022, { color: "#00714a", weight: 500 }); q += wd; });
    }
    if (this.name === "cover") {
      if (this.seen) this.seen.forEach(f => bracket(c, (f.x + .5) / W, (f.y + .5) / W, u * 4.6, GREEN, w * 1.8));
    }
    if (this.name === "count") {
      const done = this.count, N = n, seen = i => (this.dir >= 0 ? i : N - 1 - i) < done; line(c, [[4 * u, 2.6 * u], [(4 + N) * u, 2.6 * u]], "rgba(22,24,23,.35)", w);
      for (let i = 0; i < N; i++) { const x = (4 + i) * u, on = seen(i), mid = i >= 8 && i < N - 8; line(c, [[x + u / 2, (on && mid ? 1.9 : 2.25) * u], [x + u / 2, 2.6 * u]], on ? GREEN : "rgba(22,24,23,.35)", w * (on && mid ? 2 : 1)); if (!on) continue; c.fillStyle = GREEN; c.strokeStyle = GREEN; if (this.e.modules[6 * N + i]) c.fillRect(x, 10 * u, u, u); else if (mid) { c.lineWidth = u * .07; c.strokeRect(x + u * .06, 10 * u + u * .06, u * .88, u * .88); } }
      const part = (a, b, label) => { for (let i = a; i < b; i++) if (!seen(i)) return; text(c, label, (4 + (a + b) / 2) * u, 1.15 * u, u * 1.25, { color: "#00714a", weight: 500 }); }; part(0, 8, "8"); part(8, N - 8, String(N - 16)); part(N - 8, N, "8");
    }
    if (this.name === "tilt" && this.dots) {
      for (const [x, y, bad] of this.dots) { if (bad) { c.fillStyle = "#fff"; c.strokeStyle = INK; c.lineWidth = u * .16; c.beginPath(); c.arc(x, y, u * .34, 0, 7); c.fill(); c.stroke(); } else { c.fillStyle = GREEN; c.beginPath(); c.arc(x, y, u * .13, 0, 7); c.fill(); } }
      if (this.mk) bracket(c, this.mk[0], this.mk[1], u * 3.4, GREEN, w * 2);
    }
  }
  sentence() {
    const t = this.T; if (this.name === "cover" && this.cov >= 0) return this.cov === 3 ? t.fourth : t.covered; if (this.name === "tilt") { if (this.bad) this.bad.textContent = this.miss < 0 ? "–" : String(this.miss); if (this.miss < 0) return t.steep; if (!this.use4) return this.miss > 0 ? t.off(this.miss) : t.do.tilt; return this.miss === 0 ? (this.tiltSeen ? t.done.tilt : t.do.tilt) : t.nearly(this.miss); }
    if (this.name === "cover" && this.ok.has(this.step)) return t.done.cover; return null;
  }
  down(p) {
    this.held = p; this.auto = false; this.spin = 0; this.lastA = Math.atan2(p[1] - .5, p[0] - .5); this.S.over.style.cursor = this.name === "turn" ? "grabbing" : this.S.over.style.cursor;
    if (this.name === "cover") { const q = (p[0] > .5 ? 1 : 0) + (p[1] > .5 ? 2 : 0); this.cov = this.cov === q ? -1 : q; this.look(); this.S.paint(); play.stick(); vib(8); if (this.cov >= 0 && this.cov < 3 && !this.seen) this.pass(); else this.talk(); }
    if (this.name === "count") this.move(p);
  }
  move(p) {
    if (!this.held) return;
    if (this.name === "turn") { const a = Math.atan2(p[1] - .5, p[0] - .5); let d = a - this.lastA; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; this.lastA = a; const now = performance.now(), dt = Math.max(8, now - (this.lt || now)); this.lt = now; this.spin = this.spin * .6 + .4 * clamp(d / dt, -.006, .006); this.ang += d; this.turned += Math.abs(d); this.look(); this.S.paint(); if (this.turned > 1.4) this.pass(); }
    if (this.name === "count") { const u = 1 / (this.n + 8), x = clamp(Math.floor(p[0] / u - 4) + 1, 0, this.n + 1); if (!this.count && !this.dir) { this.dir = x <= 7 ? 1 : x >= this.n - 6 ? -1 : 0; if (!this.dir) return; } const k = clamp(this.dir > 0 ? x : this.n + 1 - x, 0, this.n); if (k > this.count) { this.count = k; play.patch(1 - k / this.n); this.num1.textContent = String(k); this.S.mark(); if (k === this.n) this.pass(); } }
    if (this.name === "tilt") { this.ry += (p[0] - this.held[0]) * 1.4; this.rx -= (p[1] - this.held[1]) * 1.4; this.limit(); this.held = p; this.tilt(); if (Math.hypot(this.rx, this.ry) > .3) this.tiltSeen = 1; if (this.use4 && this.tiltSeen && this.miss === 0) this.pass(); this.talk(); }
  }
  limit() { const L = Math.hypot(this.rx, this.ry), m = .56; if (L > m) { this.rx *= m / L; this.ry *= m / L; } }
  up() { this.held = null; if (this.name === "turn") this.S.over.style.cursor = "grab"; }
  key(k) {
    const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1 }[k]; if (!d) { if (this.name === "cover" && "1234".includes(k) && k) { this.down([+k % 2 ? .2 : .8, +k > 2 ? .8 : .2]); this.held = null; return true; } return false; } this.auto = false;
    if (this.name === "turn") { this.ang += d * .12; this.turned += .12; this.look(); this.S.paint(); if (this.turned > 1.4) this.pass(); return true; }
    if (this.name === "count" && d > 0) { this.held = [0, 0]; this.move([(4 + this.count + .5) / (this.n + 8), .3]); this.held = null; return true; }
    if (this.name === "tilt") { if (k === "ArrowLeft" || k === "ArrowRight") this.ry += d * .08; else this.rx -= d * .08; this.limit(); this.tilt(); if (Math.hypot(this.rx, this.ry) > .3) this.tiltSeen = 1; if (this.use4 && this.tiltSeen) this.pass(); this.talk(); return true; } return false;
  }
}
