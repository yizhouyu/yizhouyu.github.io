import { Chapter } from "./chapter.js";
import { el, clamp, ease, vib } from "./util.js";
import { encode, mapOf, maskBit, formatCells } from "./core.js";
import { decodeImage } from "./decode.js";
import { strPack, strUnpack, INK } from "./damage.js";
import { squares, trail, GREEN, bracket } from "./draw.js";
import { poster } from "./poster.js";
import { play } from "./sound.js";
// Build a real 25×25 code. Parts: three corners, the small square, two rulers.
const N = 25, U = 1 / 33, LV = "Q", PARTS = [["corner", 0, 0, 7, 7], ["corner", 18, 0, 7, 7], ["corner", 0, 18, 7, 7], ["small", 16, 16, 5, 5], ["ruler", 8, 6, 9, 1], ["ruler", 6, 8, 1, 9]];
const enc = (w, o = {}) => encode(w, LV, { byte: true, version: 2, ...o });
export class Make extends Chapter {
  constructor(S) { super(S, "make", ["place", "word", "lay", "flip", "read"], 0); this.word = ""; this.mask = -1; }
  read(q) { if (!q?.get) return; try { if (q.get("t")) { const w = strUnpack(q.get("t")); if (enc(w)) this.word = w; } } catch { } const k = q.get("k"); this.mask = k != null ? clamp(+k, 0, 7) | 0 : -1; if (this.step > 1 && !this.word) this.step = 0; if (this.step > 3 && this.mask < 0) this.step = 3; }
  extra() { return (this.word ? "&t=" + strPack(this.word) : "") + (this.mask >= 0 ? "&k=" + this.mask : ""); }
  begin() {
    const s = this.step; this.put = new Set(s > 0 ? [0, 1, 2, 3, 4, 5] : []); this.when = Array(6).fill(0); this.lay = s > 2 ? 999 : 0; this.auto = false; this.signed = s > 3 ? 99 : 0; this.flipAt = -1e9; this.prevMask = -1; if (s < 4 && s > 0) this.mask = -1; this.seen = null; this.lastKind = ""; this.build(); this.S.over.style.cursor = s === 0 ? "pointer" : s === 2 ? "grab" : "default"; if (s === 4) this.check();
  }
  ghost() { const c = (i, j) => [(i + 4) * U, (j + 4) * U]; if (this.step === 0) { const k = [0, 1, 2, 3, 4, 5].find(i => !this.put.has(i)); if (k == null) return null; const [, x, y, w, h] = PARTS[k], p = c(x + w / 2, y + h / 2); return [p, p]; } if (this.step === 2 && !this.auto && this.lay < 900) { const P = this.map.path, h = Math.floor(this.lay); return h >= P.length ? null : [0, 5, 10, 14, 19].map(d => P[Math.min(P.length - 1, h + d)]).map(k => c(k % N + .5, Math.floor(k / N) + .5)); } return null; }
  build() { const w = this.word || "HELLO"; this.e = enc(w, { mask: this.mask < 0 ? 0 : this.mask }); this.map = mapOf(this.e); const P = this.map.path; this.order = new Int32Array(N * N).fill(-1); P.forEach((c, i) => this.order[c] = i); this.plain = this.e.modules.map((b, i) => this.map.roles[i] ? b : b ^ (maskBit(this.e.mask, i % N, Math.floor(i / N)) ? 1 : 0)); this.end = 12 + this.map.letters.reduce((s, l) => s + l.cells.length, 0); this.data = this.e.lay.dataBytes * 8; }
  words() { super.words(); }
  talk() { super.talk(); const S = this.S, t = this.T; if (this.name === "word") { if (this.word) S.next(S.T.next, () => this.set(2), true); else S.next(""); } if (this.name === "read") S.next(this.seen ? t.finish : "", () => S.go("end"), true); }
  sentence() { const t = this.T; if (this.name === "place" && this.put.size < 6 && this.lastKind) return t.put[this.lastKind] + " " + t.left(6 - this.put.size); if (this.name === "place" && this.put.size === 6) return t.put[this.lastKind || "ruler"]; if (this.name === "lay" && !this.ok.has(2) && this.note) return this.note; return null; }
  controls() {
    const t = this.T, S = this.S, b = (l, fn) => el("button", { class: "link", type: "button", onclick: fn }, l);
    if (this.name === "word") { const set = v => { let cut = false; while (v && !enc(v)) { v = [...v].slice(0, -1).join(""); cut = true; } if (i.value !== v) i.value = v; this.word = v; this.cap.textContent = cut ? t.full : ""; if (v) this.ok.add(1); else this.ok.delete(1); this.talk(); S.save(); }; const i = el("input", { id: "word", type: "text", maxlength: 24, spellcheck: "false", autocomplete: "off", "aria-label": t.yourWord, placeholder: t.yourWord, oninput: e => set(e.target.value), onkeydown: e => { if (e.key === "Enter" && this.word) this.set(2); } }); i.value = this.word; this.cap = el("p", { class: "cap" }); return [el("div", { class: "field" }, i, this.cap), el("div", { class: "row" }, ...t.chips.map(c => b(c, () => { set(c); play.dot(); })))]; }
    if (this.name === "flip") { this.sw = el("div", { class: "sw" }, ...Array.from({ length: 8 }, (_, k) => { const c = el("canvas", { width: 12, height: 12 }), x = c.getContext("2d"); x.fillStyle = "#f7f7f3"; x.fillRect(0, 0, 12, 12); x.fillStyle = INK; for (let j = 0; j < 12; j++) for (let i = 0; i < 12; i++) if (maskBit(k, i, j)) x.fillRect(i, j, 1, 1); return el("button", { type: "button", "aria-label": S.T.flip.pattern(k + 1), "aria-pressed": String(k === this.mask), onclick: () => this.pickMask(k) }, c); })); return [this.sw]; }
    if (this.name === "read") return [el("div", { class: "msg" }, ...[...this.word].map(ch => el("span", { class: "fix" }, ch))), el("div", { class: "row" }, b(t.png, () => this.png()), b(t.svg, () => this.svg()), b(t.poster, () => this.keep()), b(S.T.copyLink, () => S.copy(S.link())), b(t.ruinIt, () => { S.go("ruin", { text: this.word, level: LV }); S.save(); }))];
    return [];
  }
  pickMask(k) { this.prevMask = this.mask; this.mask = k; this.build(); this.flipAt = performance.now(); this.signed = .01 - 700 * .016; this.sw?.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === k))); play.print(); this.S.paint(); this.S.mark(); this.S.save(); }
  isStrip(k) { const r = this.map.roles[k]; return r === 4 || r === 6; }
  draw(c) {
    const now = performance.now(), s = this.step; if (!this.map) this.build();
    if (s < 3) { c.strokeStyle = "rgba(22,24,23,.15)"; c.lineWidth = 1 / this.S.size; c.beginPath(); for (let i = 0; i <= N; i++) { c.moveTo((4 + i) * U, 4 * U); c.lineTo((4 + i) * U, (4 + N) * U); c.moveTo(4 * U, (4 + i) * U); c.lineTo((4 + N) * U, (4 + i) * U); } c.stroke(); c.fillStyle = "#f7f7f3"; PARTS.forEach(([k, x, y, w, h], i) => { if (!this.put.has(i)) return; const m = k === "corner" ? .9 : 0; c.fillRect((x + 4) * U - (x > 9 ? m * U : 0), (y + 4) * U - (y > 9 ? m * U : 0), (w + m) * U, (h + m) * U); }); }
    const part = (i, j) => PARTS.findIndex(([k, x, y, w, h]) => i >= x && i < x + w && j >= y && j < y + h);
    squares(c, N, (i, j, k) => {
      const p = part(i, j); if (p >= 0) { if (!this.put.has(p) || !this.e.modules[k]) return null; return { k: 1 + .5 * (this.when[p] ? 1 - ease(clamp((now - this.when[p]) / 170)) : 0) }; }
      if (this.isStrip(k)) return s >= 3 && this.signed > this.sign(k) && this.e.modules[k] ? {} : null;
      const o = this.order[k]; if (o < 0 || s < 2 || o >= this.lay) return null; const base = this.plain[k]; let on = base;
      if (this.mask >= 0 && s >= 3) { const f = base ^ (maskBit(this.mask, i, j) ? 1 : 0), was = this.prevMask >= 0 ? base ^ (maskBit(this.prevMask, i, j) ? 1 : 0) : base, t = ease(clamp((now - this.flipAt - (i + N - j) * 12) / 300)); if (was !== f) { const v = t < .5 ? was : f; return v ? { s: Math.max(.02, Math.abs(1 - 2 * t)) } : null; } on = f; }
      return on ? { color: s === 2 && o >= this.data ? "#1c6b4e" : undefined } : null;
    });
  }
  sign(k) { if (!this.fo) { this.fo = {}; formatCells(N).forEach(cs => cs.forEach(([x, y], i) => { this.fo[y * N + x] = i; })); this.fo[(N - 8) * N + 8] = 7; } return this.fo[k] ?? 0; }
  marks(c) {
    const w = 1 / this.S.size, s = this.step;
    if (s === 0) PARTS.forEach(([k, x, y, pw, ph], i) => { if (this.put.has(i)) return; c.strokeStyle = GREEN; c.fillStyle = "rgba(0,165,106,.07)"; c.lineWidth = w * 2; c.setLineDash([.012, .009]); c.fillRect((x + 4) * U, (y + 4) * U, pw * U, ph * U); c.strokeRect((x + 4) * U, (y + 4) * U, pw * U, ph * U); c.setLineDash([]); });
    if (s === 2) { const P = this.map.path, p = i => [(P[i] % N + 4.5) * U, (Math.floor(P[i] / N) + 4.5) * U], h = Math.floor(this.lay); if (h < P.length && !this.S.ghosting) { const show = Math.min(P.length - 1, h + 30); c.setLineDash([U * .12, U * .2]); trail(c, Array.from({ length: show - h + 1 }, (_, i) => p(h + i)), U, GREEN, U * .09); c.setLineDash([]); const q = p(h); c.strokeStyle = GREEN; c.fillStyle = "rgba(0,165,106,.2)"; c.lineWidth = U * .12; c.beginPath(); c.arc(q[0], q[1], U * 1.1, 0, 7); c.fill(); c.stroke(); } }
    if (s === 3 && this.signed >= 16) { c.strokeStyle = GREEN; c.lineWidth = w * 2; [[0, 8, 9, 1], [8, 0, 1, 9], [N - 8, 8, 8, 1], [8, N - 8, 1, 8]].forEach(([x, y, a, b]) => c.strokeRect((x + 4) * U, (y + 4) * U, a * U, b * U)); }
    if (s === 4 && this.seen) [[3.5, 3.5], [21.5, 3.5], [3.5, 21.5]].forEach(([x, y]) => bracket(c, (x + 4) * U, (y + 4) * U, U * 4.6, GREEN, w * 1.8));
  }
  check() { const px = 8, W = 33 * px, g = new Uint8Array(W * W).fill(245); this.build(); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const i = Math.floor(x / px) - 4, j = Math.floor(y / px) - 4; if (i >= 0 && j >= 0 && i < N && j < N && this.e.modules[j * N + i]) g[y * W + x] = 22; } const r = decodeImage(g, W, W); this.seen = r.stage === "ok" && r.text === this.word; if (this.seen) { this.ok.add(4); this.S.finish("make"); play.alive(); this.S.tick(); } }
  down(p) { this.held = true; const x = p[0] / U - 4, y = p[1] / U - 4; if (this.step === 0) { let b = -1, bd = 2.2; PARTS.forEach(([k, a, c, w, h], i) => { if (this.put.has(i)) return; const d = Math.hypot(Math.max(a - x, 0, x - a - w), Math.max(c - y, 0, y - c - h)); if (d < bd) { bd = d; b = i; } }); if (b >= 0) this.place(b); } if (this.step === 3) this.pickMask(this.mask < 0 ? 0 : (this.mask + 1) % 8); this.move(p); }
  place(i) { this.put.add(i); this.when[i] = performance.now(); this.lastKind = PARTS[i][0]; play.stamp(); vib(15); this.S.paint(); this.S.mark(); if (this.put.size === 6) this.pass(); else this.talk(); }
  move(p) { if (!this.held || this.step !== 2 || this.auto) return; const x = p[0] / U - 4, y = p[1] / U - 4, P = this.map.path; let best = -1, bd = 3; for (let i = Math.floor(this.lay); i < Math.min(P.length, this.lay + 12); i++) { const d = Math.hypot(P[i] % N + .5 - x, Math.floor(P[i] / N) + .5 - y); if (d < bd && (d < 1.4 || i - this.lay < 5)) { bd = d; best = i; } } if (best >= 0) this.adv(best + 1); }
  adv(h) { const a = Math.floor(this.lay); this.lay = Math.min(this.map.path.length, Math.max(this.lay, h)); const b = Math.floor(this.lay); if (b === a) return; if (b >> 1 !== a >> 1) play.print(); this.S.paint(); this.S.mark(); const t = this.T, n = b < 12 ? t.n1 : b < this.end ? t.n2 : b < this.data ? t.n3 : t.n4; if (n !== this.note) { this.note = n; this.talk(); } if (b >= Math.min(this.end, 70) && !this.auto) this.auto = true; if (b >= this.map.path.length) { this.auto = false; play.alive(); this.pass(); } }
  tick(dt, now) {
    if (this.step === 2 && this.auto) { this.adv(this.lay + dt * (this.lay < this.end ? .05 : .085)); return true; }
    if (this.step === 3 && this.signed !== 0 && this.signed < 16) { this.signed += dt * .016; if (this.signed >= 16) { this.signed = 99; this.pass(); } return true; }
    return this.when.some(w => now - w < 220) || now - this.flipAt < 900;
  }
  up() { this.held = false; }
  key(k) { if (k !== " " && k !== "Enter" && k !== "ArrowRight") return false; if (document.activeElement?.tagName === "BUTTON" && k !== "ArrowRight") return false; if (this.step === 0) { const q = [0, 1, 2, 3, 4, 5].find(i => !this.put.has(i)); if (q != null) this.place(q); return true; } if (this.step === 2 && !this.auto) { this.adv(this.lay + 1); return true; } return false; }
  flat(px) { const W = 33 * px, c = document.createElement("canvas"); c.width = c.height = W; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, W, W); x.fillStyle = "#000"; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (this.e.modules[j * N + i]) x.fillRect((i + 4) * px, (j + 4) * px, px, px); return c.toDataURL("image/png"); }
  png() { this.S.download(this.flat(64), "my-qr.png"); }
  svg() { let d = ""; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (this.e.modules[j * N + i]) d += `M${i + 4} ${j + 4}h1v1h-1z`; this.S.download("data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 33" shape-rendering="crispEdges"><path fill="#fff" d="M0 0h33v33H0z"/><path d="${d}"/></svg>`), "my-qr.svg"); }
  async keep() { const t = this.T, url = await poster(this.S, { src: this.S.look, head: t.pHead, lines: [t.pSays(this.word), t.pLine(this.mask + 1)] }); this.S.poster(url, t.pHead, [[this.S.T.savePic, () => this.S.download(url, "my-qr-print.png")], [this.S.T.copyLink, () => this.S.copy(this.S.link())]]); }
}
