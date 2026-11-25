import { el, clamp, vib } from "./util.js";
import { encode, mapOf } from "./core.js";
import { Print, QUIET, quant } from "./damage.js";
import { decodeImage, sample, threshold } from "./decode.js";
import { GREEN, bracket, line } from "./draw.js";
import { Level } from "./level.js";
import { deadly } from "./scan.js";
import { play } from "./sound.js";
export const STROKES = 3, LONG = .42; // strokes per turn, longest stroke (share of the sheet)
export class Duel extends Level {
  fine = true; kills = true;
  constructor(S) { super(S, "duel"); this.probe = new Print("probe", document.createElement("canvas")); }
  start() { this.turn = 0; this.spared = 0; this.heat = null; this.fresh(); this.S.over.style.cursor = "crosshair"; }
  fresh() { this.ops = []; this.left = STROKES; this.op = null; this.dead = false; this.make(); }
  make() { const S = this.S; this.e = encode(S.T.ruin.def, "H", { byte: true }); this.map = mapOf(this.e); this.look = new Print("look", S.look); this.look.setCode(this.e, Math.max(6, Math.floor(S.px / 33))); this.probe.setCode(this.e, 8); this.look.replay(this.ops); this.probe.replay(this.ops); S.paper.dirtyTex = S.paper.dirty = true; this.check(); }
  resize() { this.make(); }
  words() { if (this.e && this.e.text !== this.S.T.ruin.def && !this.won) { this.make(); } super.words(); }
  ghost() { if (this.won || this.ops.length) return null; return this.turn < 2 ? [[.36, .56], [.64, .5], [.64, .5]] : [[.14, .14], [.33, .33], [.33, .33]]; }
  check() {
    const p = this.probe, W = p.canvas.width, g = p.gray(), T = clamp(threshold(g), 60, 150), r = decodeImage(g, W, W, T), bits = sample(g, W, W, T, [8, 0, 32, 0, 8, 32, 0, 0, 1], 25), wrong = []; bits.forEach((b, i) => { if (b !== this.e.modules[i]) wrong.push(i); });
    this.wrong = wrong; this.alive = r.stage === "ok" && r.text === this.e.text; this.lost = !r.three; const bad = new Set(wrong.map(i => this.map.pieceAt[i]).filter(k => k >= 0)); this.places = bad.size; this.three = r.three ? r.three.map(f => [(f.x + .5) / W, (f.y + .5) / W]) : null;
    this.dataWrong = wrong.filter(i => this.map.roles[i] !== 1); this.show(); this.S.mark();
  }
  controls() { this.msg = el("div", { class: "msg" }); this.coins = el("div", { class: "coins", role: "img" }); setTimeout(() => this.show()); return [this.msg, this.coins]; }
  show() { if (!this.msg) return; const set = new Set(this.wrong); this.msg.replaceChildren(...this.map.letters.map(l => el("span", { class: !this.alive ? "gone" : l.cells.some(c => set.has(c)) ? "fix" : "" }, l.ch))); this.coins.replaceChildren(...Array.from({ length: STROKES }, (_, i) => el("i", { class: i < this.left ? "on" : "" })), el("span", {}, this.won ? "" : this.T.left(this.left))); this.coins.style.visibility = this.won ? "hidden" : "visible"; }
  sentence() {
    const t = this.T, w = this.wrong.length, c = this.dataWrong.length; if (this.won) return this.lost ? t.whyCorner(w, this.spared) : t.whyMany(this.places);
    if (this.tapped) return t.tapped; if (this.left === 0 && w > c) return t.stillCorner; if (this.left === 0) return t.out(c) + " " + (this.turn ? t.hint2 : t.hint1); return (this.full && !this.op ? t.full + " " : "") + (w > c ? t.stillCorner : c ? t.still(c) : this.turn ? t.again : t.say);
  }
  nextWord() { return this.S.T.next; }
  talk() { super.talk(); if (!this.won && this.left === 0 && !this.op) this.S.next(this.T.more, () => { this.turn++; this.spared = Math.max(this.spared, this.wrong.length); this.fresh(); this.talk(); }, true); }
  down(p) { if (this.won || this.left === 0) return; this.tapped = false; this.full = null; const x = quant(clamp(p[0])), y = quant(clamp(p[1])); this.op = { k: "s", seed: Math.floor(Math.random() * 65535), p: [[x, y]] }; this.len = 0; this.ops.push(this.op); this.look.apply(this.op); this.probe.apply(this.op); this.S.paper.dirtyTex = this.S.paper.dirty = true; }
  move(p) {
    if (!this.op) return; const o = this.op, a = o.p[o.p.length - 1], x = quant(clamp(p[0])), y = quant(clamp(p[1])), d = Math.hypot(x - a[0], y - a[1]); if (d < .003) return; const k = Math.ceil(d / .05), from = o.p.length; for (let i = 1; i <= k; i++) { if (this.len + d * i / k > LONG) { this.grow(from); this.full = [x, y]; this.up(); return; } o.p.push([quant(a[0] + (x - a[0]) * i / k), quant(a[1] + (y - a[1]) * i / k)]); } this.len += d; this.grow(from); this.drain();
    if (performance.now() - (this.sn || 0) > 45) { this.sn = performance.now(); play.scratch(Math.min(1, d * 20)); this.check(); }
  }
  drain() { const c = this.coins?.children[this.left - 1]; if (c?.tagName === "I") c.style.setProperty("--p", 1 - Math.min(1, this.len / LONG)); }
  grow(from) { this.look.apply(this.op, from); this.probe.apply(this.op, from); this.S.paper.dirtyTex = this.S.paper.dirty = true; }
  up() {
    const o = this.op; if (!o) return; this.op = null; if (o.p.length < 3 || this.len < .03) { this.ops.pop(); this.make(); this.tapped = true; this.talk(); return; }
    this.left--; this.check(); if (!this.alive) { this.S.flicker(); play.dead(); vib([30, 40, 80]); this.win(true); this.S.modes.end.kill = { lost: this.lost, w: this.wrong.length }; deadly(this.e, l => { this.heat = l; this.t = 0; this.S.mark(); }, () => this.S.mode === this); } else if (this.left === 0) this.spared = Math.max(this.spared, this.wrong.length);
    this.show(); this.talk();
  }
  tick(dt) { if (this.heat && this.t < 1) { this.t = Math.min(1, this.t + dt / 900); this.S.mark(); } return false; }
  marks(c) {
    const u = 1 / 33, w = 1 / this.S.size; if (this.alive) { for (const i of this.dataWrong) { const x = (i % 25 + 4) * u, y = (Math.floor(i / 25) + 4) * u; if (this.e.modules[i]) { c.fillStyle = GREEN; c.fillRect(x + u * .1, y + u * .1, u * .8, u * .8); } } if (this.full) { const q = this.full; c.strokeStyle = "#b3261e"; c.lineWidth = w * 2; c.beginPath(); c.arc(q[0], q[1], .02, 0, 7); c.stroke(); } }
    if (this.heat) { c.globalAlpha = .62 * this.t; c.fillStyle = "#d8392b"; const s = new Set(this.heat.map(([x, y]) => y * 33 + x)); for (const [x, y] of this.heat) c.fillRect(x * u, y * u, u * 1.02, u * 1.02); c.globalAlpha = 1; }
  }
  key(k) { if (k === "Enter" && document.activeElement === this.S.over && !this.won && this.left) { this.down([.3, .5]); this.move([.6, .5]); this.up(); return true; } return false; }
}
