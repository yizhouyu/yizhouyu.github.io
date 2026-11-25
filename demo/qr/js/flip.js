import { Chapter } from "./chapter.js";
import { el, ease, clamp, still } from "./util.js";
import { encode, mapOf, maskBit, penalty, formatCells } from "./core.js";
import { squares, text, GREEN } from "./draw.js";
import { INK } from "./damage.js";
import { play } from "./sound.js";
export class Flip extends Chapter {
  constructor(S, id = "flip", steps = ["try"]) { super(S, id, steps, 0); }
  get T() { return this.S.T.flip; }
  blank() { const n = this.n, m = this.to, h = new Int32Array(n); let best = 0; for (let j = 0; j < n; j++) { for (let i = 0; i < n; i++) h[i] = m[j * n + i] || this.map.roles[j * n + i] === 1 ? 0 : h[i] + 1; for (let i = 0; i < n; i++) { let lo = 99; for (let k = i; k < n && h[k]; k++) { lo = Math.min(lo, h[k]); best = Math.max(best, lo * (k - i + 1)); } } } return best; }
  ghost() { return null; }
  begin() {
    const t = "hmm...                        ok"; this.e = encode(t, "L", { byte: true, version: 2 }) || encode(t, "L", { byte: true }); this.n = this.e.n; this.map = mapOf(this.e); const n = this.n;
    this.plain = this.e.modules.map((b, i) => this.map.roles[i] ? b : b ^ (maskBit(this.e.mask, i % n, Math.floor(i / n)) ? 1 : 0));
    this.cur = this.name === "score" && this.cur >= 0 ? this.cur : -1; this.from = this.view(this.cur); this.to = this.from; this.t0 = -1e9; this.o = [12, 12]; this.tried = new Set(); this.S.over.style.cursor = "default"; this.shown = false; this.cover = false; this.guessed = -1; this.back = false;
    if (this.name === "strip") { this.real = this.want ?? (this.cur >= 0 ? this.cur : this.e.mask); this.code = this.full(this.real); this.cur = -1; this.from = this.to = this.code; this.S.over.style.cursor = "pointer"; this.want = null; }
  }
  /* the strip */
  guess(g) { if (!this.cover) { this.S.toast(this.T.coverFirst); return; } const n = this.n; this.guessed = g; this.from = this.to; this.to = this.code.map((b, i) => this.map.roles[i] ? b : b ^ (maskBit(g, i % n, Math.floor(i / n)) ? 1 : 0)); this.t0 = performance.now(); this.o = [0, n]; this.cur = g; this.S.paint(); this.buttons(); this.readout(); if (g === this.real) { play.alive(); this.pass(); } else { play.print(); this.tries = (this.tries || 0) + 1; this.talk(); } }
  readout() {
    if (!this.out) return; const n = this.n, ls = this.map.letters, g = this.cover ? this.guessed : this.real, plain = g < 0 ? null : this.code.map((b, i) => b ^ (maskBit(g, i % n, Math.floor(i / n)) ? 1 : 0));
    this.out.replaceChildren(...ls.map(l => { if (!plain) return el("span", { class: "gone" }, "x"); const v = l.cells.reduce((s, c) => s * 2 + plain[c], 0), ch = v >= 32 && v < 127 ? String.fromCharCode(v) : v > 160 ? String.fromCharCode(v) : "·"; return el("span", { class: g === this.real ? "fix" : "" }, ch); }));
  }
  read(q) { const k = q?.get?.("k"); this.want = k != null ? clamp(+k, 0, 7) | 0 : null; }
  extra() { const k = this.name === "strip" ? this.real : this.cur; return k >= 0 ? "&k=" + k : ""; }
  words() { super.words(); if (this.want != null && this.name !== "strip") { const k = this.want; this.want = null; this.flip(k); } }
  view(k) { const n = this.n; return k < 0 ? this.plain : this.plain.map((b, i) => this.map.roles[i] ? b : b ^ (maskBit(k, i % n, Math.floor(i / n)) ? 1 : 0)); }
  full(k) { const e = encode(this.e.text, "L", { byte: true, version: this.e.version, mask: k }); return e.modules; }
  flip(k, at) { if (this.name === "strip") { this.guess(k); return; } this.from = this.to; this.cur = this.cur === k ? -1 : k; this.to = this.view(this.cur); this.t0 = performance.now(); this.o = at || [0, this.n]; if (k >= 0) this.tried.add(k); play.print(); this.S.paint(); this.S.mark(); this.buttons(); if (this.cur < 0) this.back = true; if (this.num1) this.num1.textContent = this.blank(); if (this.name === "try" && this.cur >= 0) this.pass(); this.talk(); this.S.save(); }
  controls() {
    const t = this.T; if (this.name === "strip") { this.out = el("div", { class: "msg long mono" }); setTimeout(() => this.readout()); }
    this.sw = el("div", { class: "sw" }, ...Array.from({ length: 8 }, (_, k) => { const c = el("canvas", { width: 12, height: 12 }), x = c.getContext("2d"); x.fillStyle = "#f7f7f3"; x.fillRect(0, 0, 12, 12); x.fillStyle = INK; for (let j = 0; j < 12; j++) for (let i = 0; i < 12; i++) if (maskBit(k, i, j)) x.fillRect(i, j, 1, 1); return el("button", { type: "button", "aria-label": t.pattern(k + 1), onclick: () => this.flip(k) }, c, this.name === "score" ? el("div", { class: "bar" }, el("i", { style: "height:0" })) : null, this.name === "score" ? el("small", {}) : null); }));
    const out = this.name === "strip" ? [this.out, this.sw] : this.name === "try" ? [this.sw, this.num1 = el("p", { class: "big" }, String(this.blank())), el("p", { class: "cap" }, t.blank)] : [this.sw]; if (this.name === "score" && !this.shown) out.push(this.go = el("button", { class: "btn", type: "button", onclick: () => this.reveal() }, t.reveal)); setTimeout(() => { this.buttons(); if (this.shown) this.reveal(true); }); return out;
  }
  buttons() { this.sw?.querySelectorAll("button").forEach((b, k) => b.setAttribute("aria-pressed", String(k === this.cur))); }
  reveal(again) {
    const s = Array.from({ length: 8 }, (_, k) => penalty(this.full(k), this.n)), best = s.indexOf(Math.min(...s)), hi = Math.max(...s); this.scores = s; this.best = best; this.shown = true; this.go?.remove();
    this.sw.querySelectorAll("button").forEach((b, k) => { b.classList.toggle("best", k === best); b.querySelector(".bar i").style.height = s[k] / hi * 100 + "%"; b.querySelector("small").textContent = s[k]; }); if (again) return;
    this.picked = this.cur; if (this.cur !== best) this.flip(best); this.pass(); play.alive();
  }
  sentence() {
    if (this.name === "strip") { const t = this.T; return !this.cover ? t.do.strip : this.guessed < 0 ? t.guess : this.guessed === this.real ? t.done.strip : t.garbage; }
    if (this.name === "try" && this.ok.has(0) && this.cur >= 0) return this.T.done.try; if (this.name === "score" && this.shown) return this.T.best(this.picked === this.best, this.scores[this.best], Math.max(...this.scores)); if (this.name === "try" && this.cur < 0 && this.back) return this.T.backAgain; return null; }
  tick(dt, now) { return now - this.t0 < 1100; }
  draw(c) {
    const now = performance.now(), n = this.n; squares(c, n, (i, j, k) => {
      const a = this.from[k], b = this.to[k], role = this.map.roles[k]; if (role) return a ? {} : null; if (a === b) return a ? {} : null;
      const d = Math.hypot(i - this.o[0], j - this.o[1]) * 15, t = still.matches ? 1 : clamp((now - this.t0 - d) / 320), e = ease(t), on = e < .5 ? a : b, s = Math.abs(1 - 2 * e); return on ? { s: Math.max(.02, s) } : null;
    });
    if (this.cover) { const u = 1 / (n + 8); c.fillStyle = "#fdfdfb"; c.strokeStyle = "rgba(22,24,23,.2)"; c.lineWidth = .0016; this.bars().forEach(([x, y, w, h]) => { const r = [(x + 4) * u - u * .08, (y + 4) * u - u * .08, (w + .16) * u, (h + .16) * u]; c.fillRect(...r); c.strokeRect(...r); }); }
  }
  marks(c) {
    if (this.name === "score" || this.name === "try" && !(this.ok.has(0) && this.cur >= 0)) return; const n = this.n, u = 1 / (n + 8); if (this.cover) return; c.strokeStyle = GREEN; c.lineWidth = Math.max(1.8 / this.S.size, u * .08); const B = (x, y, w, h) => c.strokeRect((x + 4) * u, (y + 4) * u, w * u, h * u); this.bars().forEach(b => B(...b));
  }
  bars() { const n = this.n; return [[0, 8, 9, 1], [8, 0, 1, 9], [n - 8, 8, 8, 1], [8, n - 8, 1, 8]]; }
  down(p) {
    if (this.name === "strip") { const n = this.n, x = p[0] * (n + 8) - 4, y = p[1] * (n + 8) - 4; if (!this.cover && !this.bars().some(([a, b, w, h]) => x > a - 1.2 && x < a + w + 1.2 && y > b - 1.2 && y < b + h + 1.2)) return; this.cover = !this.cover; this.guessed = -1; this.cur = -1; this.from = this.to; this.to = this.code; this.t0 = performance.now(); play.stick(); this.buttons(); this.readout(); this.talk(); this.S.paint(); this.S.mark(); return; } const q = this.cur >= 0 ? this.cur : (this.lastK ?? 0); this.lastK = q; this.flip(q, [p[0] * (this.n + 8) - 4, p[1] * (this.n + 8) - 4]); }
  key(k) { const i = "12345678".indexOf(k); if (i >= 0 && k) { this.flip(i); return true; } return false; }
}
