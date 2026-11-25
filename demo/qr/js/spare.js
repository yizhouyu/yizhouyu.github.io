import { Chapter } from "./chapter.js";
import { el, clamp, ease, vib } from "./util.js";
import { encode, mapOf } from "./core.js";
import { decodeGrid } from "./decode.js";
import { squares, text, line, hatch, GREEN, cellAt } from "./draw.js";
import { INK } from "./damage.js";
import { play } from "./sound.js";
import { settle, settleCurve, TOP } from "./settle.js";
const X4 = [.2, .4, .6, .8], X7 = [.14, .26, .38, .5, .62, .74, .86], CURVE = [10, 5, 2, 1, 2, 5, 10], Y0 = .84, Y1 = .14, yOf = v => Y0 + (Y1 - Y0) * v / TOP, vOf = y => clamp(Math.round((Y0 - y) / (Y0 - Y1) * TOP), 0, TOP);
export class Spare extends Chapter {
  constructor(S) { super(S, "spare", ["line", "one", "two", "curve", "real"], 5); }
  begin() {
    if (!this.pair) this.pair = [4, 5]; this.val = this.four(); this.vis = this.val.slice(); this.drag = -1; this.res = null; this.was = null; this.moved = new Set(); this.S.over.style.cursor = "ns-resize"; this.broken = new Set();
    if (this.name === "real") { this.e = encode(this.S.T.ruin.def, "H", { byte: true }); this.map = mapOf(this.e); this.S.over.style.cursor = "pointer"; this.pieceCheck(); }
  }
  read(q) { const p = q?.get?.("p")?.split(",").map(Number); if (p?.length === 2 && p.every(x => x >= 0 && x <= TOP)) this.pair = p; }
  extra() { return this.pair && (this.pair[0] !== 4 || this.pair[1] !== 5) ? "&p=" + this.pair.join(",") : ""; }
  four() { if (this.name === "curve") return CURVE.slice(); const [a, b] = this.pair; return [a, b, 2 * b - a, 3 * b - 2 * a]; }
  solve() { return this.name === "curve" ? settleCurve(this.val) : settle(this.val); }
  get X() { return this.name === "curve" ? X7 : X4; }
  get mine() { return this.name === "curve" ? 3 : 2; }
  get word() { return this.S.T.ruin.def; }
  words() { if (this.name === "real" && this.e?.text !== this.word) this.begin(); super.words(); this.S.paint(); }
  controls() { if (this.name !== "real") return []; const t = this.T; this.msg = el("div", { class: "msg" }); this.met = el("div", { class: "meter" }); setTimeout(() => this.show()); return [this.msg, this.met, el("div", { class: "row" }, el("button", { class: "link", type: "button", onclick: () => this.smash(1) }, t.one), el("button", { class: "link", type: "button", onclick: () => { this.broken.clear(); this.pieceCheck(); this.show(); } }, t.heal))]; }
  /* the real code */
  pieceCheck() { const m = this.e.modules.slice(); this.broken.forEach(j => this.map.pieces[j].cells.forEach(c => m[c] ^= 1)); this.bits = m; const r = decodeGrid(m, this.e.n); this.alive = r.stage === "ok" && r.text === this.e.text; this.S.paint(); this.S.mark(); }
  smash(k) { const left = this.map.pieces.map(p => p.j).filter(j => !this.broken.has(j)); for (let i = 0; i < k && left.length; i++) this.broken.add(left.splice(Math.floor(Math.random() * left.length), 1)[0]); this.after(); }
  after() { const was = this.alive; this.pieceCheck(); this.show(); if (was && !this.alive) { this.S.flicker(); play.dead(); vib([30, 40, 80]); } else play.patch(Math.max(0, 1 - this.broken.size / 14)); if (this.broken.size >= 6 || !this.alive) this.pass(); else this.talk(); }
  show() { if (!this.msg || this.name !== "real") return; const t = this.S.T.ruin, n = this.broken.size; this.msg.replaceChildren(...this.map.letters.map(l => el("span", { class: !this.alive ? "gone" : l.cells.some(c => this.broken.has(this.map.pieceAt[c])) ? "fix" : "" }, l.ch))); this.met.replaceChildren(el("div", { class: n > 14 ? "over" : "" }, ...Array.from({ length: 14 }, (_, i) => el("i", { class: i < n ? "on" : "" }))), el("p", {}, n > 14 ? t.meterOver(n, 14) : t.meter(n, 14))); this.talk(); }
  sentence() {
    const t = this.T; if (this.name === "curve" && !this.res && this.moved.size === 1) return t.oneMore; if (this.name === "two" && !this.res && this.moved.size === 1) return t.oneMore; if (this.name === "real" && this.e) { const n = this.broken.size; return n === 0 ? t.do.real : this.alive ? t.realOk(n) : t.realDead(n); }
    if (this.name === "line" && this.ok.has(0)) return t.lineNow(this.val); if (this.name === "line") return t.do.line;
    if (this.res) return this.res.kind === "fixed" ? (this.fixAt ? t.looking : !this.same() ? t.fooled : this.name === "curve" ? t.done.curve : t.fixed(this.res.n + 1)) : this.res.kind === "lost" ? t.lost : null; return null;
  }
  same() { const f = this.four(); return this.val.every((v, i) => v === f[i]); }
  draw(c) {
    if (this.name === "real") { const m = this.e.modules, role = this.map.roles; squares(c, this.e.n, (i, j, k) => { const p = this.map.pieceAt[k]; if (p >= 0 && this.broken.has(p)) return this.alive ? null : null; return m[k] ? { alpha: p < 0 ? .16 : 1, color: p >= 0 && this.map.pieces[p].spare ? INK : INK } : null; }); return; }
    for (let k = 0; k <= TOP; k++) { const y = yOf(k); line(c, [[.1, y], [.9, y]], k % 4 ? "rgba(22,24,23,.09)" : "rgba(22,24,23,.2)", .0014); }
    this.X.forEach((x, i) => { line(c, [[x, Y0], [x, Y0 + .015]], "rgba(22,24,23,.4)", .0016); });
  }
  marks(c) {
    if (this.name === "real") {
      const n = this.e.n, u = 1 / (n + 8), m = this.e.modules; // outline pieces; show what was put back
      this.map.pieces.forEach(p => { const bad = this.broken.has(p.j); p.cells.forEach(k => { const x = (k % n + 4) * u, y = (Math.floor(k / n) + 4) * u; if (bad) { if (this.alive) { if (m[k]) { c.fillStyle = GREEN; c.fillRect(x + u * .07, y + u * .07, u * .86, u * .86); } } else hatch(c, x, y, u, "rgba(22,24,23,.45)", u * .06); } }); if (p.j === this.hot || bad) this.edge(c, p, u, n, bad ? "rgba(0,113,74,.75)" : "rgba(0,113,74,1)"); });
      return;
    }
    for (let k = 0; k <= TOP; k += 4) text(c, String(k), .062, yOf(k), .024, { color: "#6b716e", weight: 400 });
    this.X.forEach((x, i) => text(c, i < this.mine ? this.T.mine : this.T.spare, x, .905, this.name === "curve" ? .021 : .027, { color: i < this.mine ? INK : "#00714a", weight: 400 }));
    const v = this.vis, ghost = this.four(), w = 1 / this.S.size, held = this.drag;
    const f = this.solve(), l = this.drag >= 0 && this.name !== "line" ? null : f.kind !== "lost" ? f.f : null;
    if (this.name === "line" || l) { const cv = this.name === "curve", g = this.name === "line" ? (i => v[0] + (v[1] - v[0]) * i) : l, a = cv ? -.12 : -.55, b = cv ? 6.12 : 3.55, px = i => cv ? .14 + .12 * i : .2 + .2 * i, M = cv ? 60 : 1; line(c, Array.from({ length: M + 1 }, (_, k) => { const i = a + (b - a) * k / M; return [px(i), yOf(g(i))]; }), GREEN, .004); }
    this.X.forEach((x, i) => {
      const y = yOf(v[i]), sp = i >= this.mine, off = this.name !== "line" && Math.abs(v[i] - ghost[i]) > .02; if (off && (this.res?.kind === "lost" || this.drag === i)) { c.strokeStyle = "rgba(22,24,23,.35)"; c.lineWidth = .002; c.setLineDash([.008, .008]); c.beginPath(); c.arc(x, yOf(ghost[i]), .026, 0, 7); c.stroke(); c.setLineDash([]); }
      const was = this.was?.[i]; if (was != null && Math.abs(was - ghost[i]) > .1 && this.drag < 0) { const y0 = yOf(was), s = Math.sign(y - y0), ax = x + .047; c.strokeStyle = "rgba(22,24,23,.4)"; c.lineWidth = .002; c.setLineDash([.008, .008]); c.strokeRect(x - .027, y0 - .027, .054, .054); c.setLineDash([]); if (Math.abs(y - y0) > .07) { c.strokeStyle = GREEN; c.lineWidth = .0035; c.beginPath(); c.moveTo(ax, y0); c.lineTo(ax, y); c.moveTo(ax - .012, y - s * .016); c.lineTo(ax, y); c.lineTo(ax + .012, y - s * .016); c.stroke(); } }
      c.fillStyle = sp ? "#f7f7f3" : INK; c.strokeStyle = sp ? GREEN : INK; c.lineWidth = .008; c.beginPath(); c.rect(x - .027, y - .027, .054, .054); c.fill(); if (sp) c.stroke(); text(c, String(Math.round(v[i])), x, y - .062, .036, { color: sp ? "#00714a" : INK, weight: 500 });
    });
  }
  edge(c, p, u, n, col) { const set = new Set(p.cells); c.strokeStyle = col; c.lineWidth = u * .1; c.beginPath(); p.cells.forEach(k => { const i = k % n, j = Math.floor(k / n), x = (i + 4) * u, y = (j + 4) * u; if (!set.has(k - 1) || i === 0) { c.moveTo(x, y); c.lineTo(x, y + u); } if (!set.has(k + 1) || i === n - 1) { c.moveTo(x + u, y); c.lineTo(x + u, y + u); } if (!set.has(k - n)) { c.moveTo(x, y); c.lineTo(x + u, y); } if (!set.has(k + n)) { c.moveTo(x, y + u); c.lineTo(x + u, y + u); } }); c.stroke(); }
  tick(dt, now) {
    if (this.name === "real") return false; let mv = false; if (this.fixAt && now > this.fixAt) { this.fixAt = 0; this.was = this.val.map((v, i) => this.res.fix[i] !== v ? v : null); this.val = this.res.fix.slice(); play.alive(); this.pass(); this.talk(); mv = true; }
    this.val.forEach((t, i) => { const d = t - this.vis[i]; if (Math.abs(d) > .005) { this.vis[i] += d * Math.min(1, dt / (this.drag === i ? 30 : 110)); mv = true; } else if (d) { this.vis[i] = t; mv = true; } }); return mv;
  }
  down(p) {
    if (this.name === "real") { const k = cellAt(p, this.e.n)[2], j = k >= 0 ? this.map.pieceAt[k] : -1; if (j < 0) return; if (this.broken.has(j)) this.broken.delete(j); else this.broken.add(j); this.after(); return; }
    if (this.fixAt) return; let b = -1, bd = this.name === "curve" ? .07 : .13; this.X.forEach((x, i) => { const d = Math.abs(p[0] - x); if (d < bd) { bd = d; b = i; } }); if (this.name === "line" && b > 1) b = -1; if (this.name !== "line") { this.was = null; if (this.res) { this.res = null; this.val = this.four(); this.moved.clear(); } } this.drag = b; if (b >= 0) this.move(p);
  }
  move(p) {
    if (this.drag < 0 || this.name === "real") return; let v = vOf(p[1]); const i = this.drag;
    if (this.name === "line") { const fits = w => { const q = this.pair.slice(); q[i] = w; const [a, b] = q, f = [a, b, 2 * b - a, 3 * b - 2 * a]; return f.every(x => x >= 0 && x <= TOP) ? [q, f] : null; }; while (v !== this.pair[i] && !fits(v)) v += Math.sign(this.pair[i] - v); if (v === this.pair[i]) return; const [q, f] = fits(v); this.pair = q; this.val = f; play.dot(); this.changed = (this.changed || 0) + 1; this.pass(); this.S.save(); this.S.mark(); return; }
    if (v !== this.val[i]) { this.val[i] = v; play.dot(); this.S.mark(); }
  }
  up() {
    const i = this.drag; this.drag = -1; if (i < 0 || this.name === "line" || this.name === "real") { this.S.mark(); return; } const g = this.four(); if (this.val[i] !== g[i]) this.moved.add(i); else this.moved.delete(i);
    if (this.name === "one" && this.moved.size >= 1 || (this.name === "two" || this.name === "curve") && this.moved.size >= 2) { const r = this.solve(); this.res = { ...r, n: r.odd }; if (r.kind === "fixed") this.fixAt = performance.now() + 900; else if (r.kind === "lost") { play.dead(); this.pass(); } else this.res = null; }
    this.talk(); this.S.mark();
  }
  hover(p) { if (this.name !== "real") return; const k = p ? cellAt(p, this.e.n)[2] : -1, j = k >= 0 ? this.map.pieceAt[k] : -1; if (j !== this.hot) { this.hot = j; this.S.mark(); } }
  key(k) {
    if (this.name === "real") { if (k === " " && document.activeElement === this.S.over) { this.smash(1); return true; } return false; }
    if (k === "ArrowLeft" || k === "ArrowRight") { this.kb = clamp((this.kb ?? -1) + (k === "ArrowRight" ? 1 : -1), 0, this.val.length - 1); return true; }
    if ((k === "ArrowUp" || k === "ArrowDown") && this.kb != null) { const v = this.val[this.kb] + (k === "ArrowUp" ? 1 : -1); this.down([this.X[this.kb], yOf(v)]); this.up(); return true; } return false;
  }
}
