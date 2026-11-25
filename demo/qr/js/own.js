import { el, clamp } from "./util.js";
import { encode } from "./core.js";
import { decodeImage, threshold } from "./decode.js";
import { squares, text, bracket, GREEN } from "./draw.js";
import { INK, strPack, strUnpack } from "./damage.js";
import { Level } from "./level.js";
import { poster } from "./poster.js";
import { play } from "./sound.js";
// Type, see the code at once, put something in the middle, push it until it dies.
export class Own extends Level {
  constructor(S) { super(S, "own"); this.text = null; this.size = .14; this.logo = null; this.img = null; }
  load(q) { if (q?.get?.("t")) try { const w = strUnpack(q.get("t")); if (encode(w, "H", { byte: true })) this.text = w; } catch { } if (q?.get?.("z")) this.size = clamp(+q.get("z") || .14, .04, .6); }
  extra() { return (this.text ? "&t=" + strPack(this.text) : "") + `&z=${this.size.toFixed(2)}`; }
  start() { this.stage = this.text ? 1 : 0; this.touchedText = !!this.text; this.best = 0; this.diedAt = 0; this.over1 = false; this.build(); this.S.over.style.cursor = "grab"; }
  words() { super.words(); this.build(); }
  get said() { return this.text || this.T.sample; }
  get mark1() { return this.logo ?? this.T.mark; }
  build() { this.e = encode(this.said, "H", { byte: true }); const keep = this.size; let lim = .04; const h = this.held; this.held = false; for (let s = .06; s <= .6; s += .02) { this.size = s; this.test(true); if (!this.alive) break; lim = s; } this.limit = lim; this.size = keep; this.alive = undefined; this.over1 = false; this.test(); this.held = h; }
  dotAt(s = this.size) { const n = this.e.n; return .5 + s * n / (n + 8) / 2; }
  ghost() { if (this.won || this.stage === 0) return null; const a = this.dotAt(), b = this.over1 ? this.dotAt(Math.max(.06, this.limit - .02)) : Math.min(.9, a + .16); return [[a, a], [b, b], [b, b]]; }
  paint(c, s = 1) { const n = this.e.n, q = n + 8, L = this.size * n / q; squares(c, n, (i, j, k) => this.e.modules[k] ? {} : null); c.fillStyle = "#fdfdfb"; c.fillRect(.5 - L / 2, .5 - L / 2, L, L); if (this.img) { const w = L * .84, f = Math.min(w / this.img.width, w / this.img.height); c.drawImage(this.img, .5 - this.img.width * f / 2, .5 - this.img.height * f / 2, this.img.width * f, this.img.height * f); } else text(c, this.mark1, .5, .5 + L * .03, L * .72, { weight: 400, color: "#b3261e" }); }
  draw(c) { this.paint(c); }
  test(dry) { const W = (this.e.n + 8) * 8, k = this.k || (this.k = document.createElement("canvas")); k.width = k.height = W; const c = k.getContext("2d", { willReadFrequently: true }); c.fillStyle = "#f7f7f3"; c.fillRect(0, 0, W, W); c.setTransform(W, 0, 0, W, 0, 0); this.paint(c); const d = c.getImageData(0, 0, W, W).data, g = new Uint8Array(W * W); for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = d[j] * .299 + d[j + 1] * .587 + d[j + 2] * .114; const r = decodeImage(g, W, W); if (dry) { this.alive = r.stage === "ok" && r.text === this.said; return; } const was = this.alive; this.alive = r.stage === "ok" && r.text === this.said; this.W = W; this.three = r.three; if (was && !this.alive && this.held) { play.dead(); this.S.flicker(); } if (!this.alive) this.over1 = true; else this.best = Math.max(this.best, this.size); this.S.paint(); this.S.mark(); this.show(); }
  marks(c) { const n = this.e.n, u = 1 / (n + 8), L = this.size * n / (n + 8), w = 1 / this.S.size; if (this.alive) [[7.5, 7.5], [n + .5, 7.5], [7.5, n + .5]].forEach(([x, y]) => bracket(c, x * u, y * u, u * 4.6, GREEN, w * 1.8)); c.strokeStyle = this.alive ? GREEN : INK; c.lineWidth = w * 1.5; c.strokeRect(.5 - L / 2, .5 - L / 2, L, L); if (this.stage === 0) return; const h = .5 + L / 2; c.fillStyle = GREEN; c.beginPath(); c.arc(h, h, Math.max(.016, 9 * w), 0, 7); c.fill(); }
  controls() {
    const t = this.T; this.inp = el("input", { id: "own-text", type: "text", maxlength: 110, spellcheck: "false", autocomplete: "off", placeholder: t.sample, oninput: e => { const v = e.target.value; if (v && !encode(v, "H", { byte: true })) { this.cap.textContent = t.full; return; } this.cap.textContent = ""; this.text = v || null; this.touchedText = !!v; this.build(); this.talk(); this.S.save(); } }); this.inp.value = this.text || "";
    this.one = el("input", { id: "own-mark", type: "text", maxlength: 4, autocomplete: "off", placeholder: t.mark, oninput: e => { const ch = [...e.target.value].pop() || ""; e.target.value = ch; this.logo = ch || null; this.img = null; this.build(); } }); this.one.value = this.logo || "";
    this.cap = el("p", { class: "cap" }); this.state = el("p", { class: "verdict" });
    const pic = el("div", { class: "row" }, el("label", { class: "link", style: "cursor:pointer;display:inline-flex;align-items:center" }, t.pic, el("input", { type: "file", accept: "image/*", hidden: true, onchange: async e => { const f = e.target.files[0]; if (!f) return; try { this.img = await createImageBitmap(f); this.touchedText = true; this.build(); this.talk(); } catch { this.S.toast(this.S.T.ruin.logoBad); } } }))); this.tools = el("div", { class: "row" }, el("button", { class: "link", type: "button", onclick: () => this.save(Math.sqrt(.5)) }, t.save), el("button", { class: "link", type: "button", onclick: () => this.save(1) }, t.saveMax), el("button", { class: "link", type: "button", onclick: () => this.S.copy(this.S.link()) }, this.S.T.copyLink)); this.tools.hidden = !this.won;
    setTimeout(() => this.show()); return this.stage === 0 ? [el("div", { class: "duo" }, el("div", { class: "field" }, el("label", { for: "own-text" }, t.type), this.inp, this.cap), el("div", { class: "field" }, el("label", { for: "own-mark" }, t.markLabel), this.one, pic))] : [this.state, this.tools];
  }
  show() { if (!this.state || !this.e) return; const t = this.T; this.state.className = "verdict " + (this.alive ? "yes" : "no"); this.state.textContent = this.alive ? t.ok(this.pct(this.size)) : t.bad(this.pct(this.size)); }
  pct(s) { return Math.round(s * s * 100); }
  after() { if (this.over1 && this.alive && !this.won) { this.size = this.limit; this.test(); this.win(); if (this.tools) this.tools.hidden = false; this.show(); } this.talk(); this.S.save(); }
  sentence() { const t = this.T; if (this.stage === 0) return t.say0; if (this.won) return t.why(this.pct(this.limit)); return this.over1 ? t.back : t.say; }
  talk() { const S = this.S, t = this.T; S.say(this.sentence(), { title: this.stage === 0 ? t.goal0 : this.won ? t.won : t.goal, kick: `${t.kick}  ${this.stage + 1} / 2`, won: this.won }); if (this.stage === 0) { if (this.touchedText) S.next(S.T.next, () => { this.stage = 1; this.size = .12; this.over1 = false; S.ctl(...this.controls()); this.build(); this.talk(); S.touched = performance.now(); }, true); else S.next(""); } else if (this.won) S.next(S.T.next, () => S.go(S.after("own")), true); else S.next(""); }
  down(p) { if (this.stage === 0) return; this.held = true; this.move(p); }
  move(p) { if (!this.held) return; const n = this.e.n, L = 2 * Math.max(Math.abs(p[0] - .5), Math.abs(p[1] - .5)) * (n + 8) / n; this.size = clamp(L, .04, .6); this.test(); this.show(); }
  up() { if (!this.held) return; this.held = false; this.after(); }
  key(k) { if (this.stage === 0) return false; const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[k]; if (!d) return false; this.size = clamp(this.size + d * .02, .04, .6); this.test(); this.after(); return true; }
  save(k1) { const full = this.size; this.size = full * k1; const n = this.e.n, px = Math.ceil(2000 / (n + 8)), W = (n + 8) * px, k = document.createElement("canvas"); k.width = k.height = W; const c = k.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, W, W); c.setTransform(W, 0, 0, W, 0, 0); this.paint(c); this.size = full; this.S.paint(); this.S.download(k.toDataURL("image/png"), "my-qr.png"); }
}
