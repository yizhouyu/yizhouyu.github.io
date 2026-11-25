import { Chapter } from "./chapter.js";
import { el, clamp, ease, vib } from "./util.js";
import { encode, mapOf, maskBit, formatCells, formatCode } from "./core.js";
import { decodeImage } from "./decode.js";
import { strPack, strUnpack, INK } from "./damage.js";
import { squares, trail, GREEN, bracket } from "./draw.js";
import { poster } from "./poster.js";
import { play } from "./sound.js";
const N = 21, U = 1 / 29, CORN = [[3.5, 3.5], [17.5, 3.5], [3.5, 17.5]];
export class Make extends Chapter {
  constructor(S) { super(S, "make", ["corners", "ruler", "word", "lay", "flip", "sign", "read"], 0); this.word = ""; this.mask = -1; }
  read(q) {
    if (!q?.get) return; try { if (q.get("t")) { const w = strUnpack(q.get("t")); if (encode(w, "Q", { byte: true, version: 1 })) this.word = w; } } catch { } const k = q.get("k"); this.mask = k != null ? clamp(+k, 0, 7) | 0 : -1; if (this.step > 3 && !this.word) this.step = 0; if (this.step > 5 && this.mask < 0) this.step = 4;
  }
  extra() { return (this.word ? "&t=" + strPack(this.word) : "") + (this.mask >= 0 ? "&k=" + this.mask : ""); }
  begin() {
    const s = this.step; this.st = s > 0 ? new Set([0, 1, 2]) : new Set(); this.when = [0, 0, 0]; this.r = s > 1 ? [5, 5] : [0, 0]; this.lay = s > 3 ? 999 : 0; this.auto = false; this.signed = s > 5 ? 99 : 0; this.S.over.style.cursor = s === 0 || s === 5 ? "pointer" : s === 3 || s === 1 ? "grab" : "default"; this.flipAt = -1e9; this.prev = this.mask; if (s > 2) this.build(); this.seen = null; if (s === 6) this.check();
    if (s === 5 && this.mask < 0) this.mask = encode(this.word, "Q", { byte: true, version: 1 }).mask; if (s === 4 || s === 3) { if (s === 3) this.mask = -1; } if (s > 4) this.build();
  }
  build() { const w = this.word || "HELLO"; this.e = encode(w, "Q", { byte: true, version: 1, mask: this.mask < 0 ? 0 : this.mask }); this.map = mapOf(this.e); const P = this.map.path; this.order = new Int32Array(N * N).fill(-1); P.forEach((c, i) => this.order[c] = i); this.plain = this.e.modules.map((b, i) => this.map.roles[i] ? b : b ^ (maskBit(this.e.mask, i % N, Math.floor(i / N)) ? 1 : 0)); this.end = 12 + this.map.letters.reduce((s, l) => s + l.cells.length, 0); this.data = this.e.lay.dataBytes * 8; }
  words() { super.words(); if (this.name === "read") this.S.ready(true); }
  talk() { super.talk(); if (this.name === "word") { this.S.next(this.S.T.next, () => { if (this.word) this.set(3); else { this.note.textContent = this.T.needWord; document.querySelector("#word")?.focus(); } }, !!this.word); } if (this.name === "read") this.S.next(this.T.ruinIt, () => { this.S.go("ruin", { text: this.word, level: "Q" }); this.S.save(); }, true); else if (this.name === "lay" && !this.ok.has(3)) this.S.next(this.T.layRest, () => { this.auto = true; }, false); else if (this.name === "flip") this.S.next(this.S.T.next, () => this.set(5), this.ok.has(4)); }
  controls() {
    const t = this.T, S = this.S, b = (l, fn) => el("button", { class: "link", type: "button", onclick: fn }, l);
    if (this.name === "word") { const i = el("input", { id: "word", type: "text", maxlength: 16, spellcheck: "false", autocomplete: "off", "aria-label": t.yourWord, placeholder: t.yourWord, oninput: e => { let v = e.target.value, cut = false; while (v && !encode(v, "Q", { byte: true, version: 1 })) { v = [...v].slice(0, -1).join(""); cut = true; } if (v !== e.target.value) e.target.value = v; this.word = v; this.note.textContent = cut ? t.full : v ? t.bytes(new TextEncoder().encode(v).length) : t.room; if (v) this.pass(); else { this.ok.delete(2); this.talk(); } S.save(); S.mark(); }, onkeydown: e => { if (e.key === "Enter" && this.word) this.set(3); } }); i.value = this.word; this.note = el("p", { class: "cap" }, this.word ? t.bytes(new TextEncoder().encode(this.word).length) : t.room); if (this.word) this.ok.add(2); return [el("div", { class: "field" }, i, this.note)]; }
    if (this.name === "lay") { this.note = el("p", { class: "cap" }); return [this.note]; }
    if (this.name === "flip") { this.sw = el("div", { class: "sw" }, ...Array.from({ length: 8 }, (_, k) => { const c = el("canvas", { width: 12, height: 12 }), x = c.getContext("2d"); x.fillStyle = "#f7f7f3"; x.fillRect(0, 0, 12, 12); x.fillStyle = INK; for (let j = 0; j < 12; j++) for (let i = 0; i < 12; i++) if (maskBit(k, i, j)) x.fillRect(i, j, 1, 1); return el("button", { type: "button", "aria-label": S.T.flip.pattern(k + 1), "aria-pressed": String(k === this.mask), onclick: () => this.pickMask(k) }, c); })); return [this.sw, el("div", { class: "row" }, b(t.best, () => this.pickMask(encode(this.word, "Q", { byte: true, version: 1 }).mask)))]; }
    if (this.name === "read") { this.msg = el("div", { class: "msg" }, ...[...this.word].map(ch => el("span", { class: "fix" }, ch))); return [this.msg, el("div", { class: "row" }, b(t.png, () => this.png()), b(t.svg, () => this.svg()), b(t.poster, () => this.keep()), b(S.T.copyLink, () => S.copy(S.link())), b(t.parts, () => S.about()), b(t.another, () => { this.word = ""; this.mask = -1; this.ok.clear(); this.set(0); }))]; }
    return [];
  }
  pickMask(k) { this.prevMask = this.mask; this.mask = k; this.build(); this.flipAt = performance.now(); this.sw?.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === k))); play.print(); this.pass(); this.S.paint(); this.S.mark(); this.S.save(); }
  isFormat(k) { const r = this.map.roles[k]; return r === 4 || r === 6; }
  inside(i, j) { for (const [q, [x, y]] of CORN.entries()) { const d = Math.max(Math.abs(i + .5 - x), Math.abs(j + .5 - y)); if (d < 4) return [q, d]; } return null; }
  draw(c) {
    const now = performance.now(), s = this.step; if (!this.map) this.build();
    if (s < 5) { c.strokeStyle = "rgba(22,24,23,.16)"; c.lineWidth = 1 / this.S.size; c.beginPath(); for (let i = 0; i <= N; i++) { c.moveTo((4 + i) * U, 4 * U); c.lineTo((4 + i) * U, (4 + N) * U); c.moveTo(4 * U, (4 + i) * U); c.lineTo((4 + N) * U, (4 + i) * U); } c.stroke(); c.fillStyle = "#f7f7f3"; this.st.forEach(q => { const [x, y] = CORN[q]; c.fillRect((x + 4 - 3.5) * U + (x > 9 ? -U * .9 : 0), (y + 4 - 3.5) * U + (y > 9 ? -U * .9 : 0), 7.9 * U, 7.9 * U); }); }
    squares(c, N, (i, j, k) => {
      const f = this.inside(i, j); if (f) { const [q, d] = f, r = Math.round(d); if (!this.st.has(q)) return null; const dark = Math.floor(d + .001) === 3 || d < 2; return dark ? { k: 1 + .5 * (1 - ease(clamp((now - this.when[q]) / 160))) * (this.when[q] ? 1 : 0) } : null; }
      const role = this.map.roles[k]; if (role === 2) { const a = j === 6 ? i - 8 : j - 8, w = j === 6 ? 0 : 1; return a >= 0 && a < this.r[w] && a % 2 === 0 ? {} : null; }
      if (this.isFormat(k)) { if (s < 5) return null; const o = this.sign(k); return this.signed > o && this.e.modules[k] ? {} : null; }
      const o = this.order[k]; if (o < 0 || s < 3) return null; if (o >= this.lay) return null; const base = this.plain[k], spare = s === 3 && o >= this.data; let on = base;
      if (this.mask >= 0 && s >= 4) { const flipped = base ^ (maskBit(this.mask, i, j) ? 1 : 0), was = this.prevMask >= 0 ? base ^ (maskBit(this.prevMask, i, j) ? 1 : 0) : base, t = ease(clamp((now - this.flipAt - (i + N - j) * 14) / 300)); if (was !== flipped) { const v = t < .5 ? was : flipped; return v ? { s: Math.max(.02, Math.abs(1 - 2 * t)) } : null; } on = flipped; }
      return on ? { color: spare ? "#1c6b4e" : undefined } : null;
    });
  }
  sign(k) { if (!this.fo) { this.fo = {}; formatCells(N).forEach((cs, c) => cs.forEach(([x, y], i) => { this.fo[y * N + x] = i; })); this.fo[(N - 8) * N + 8] = 7; } return this.fo[k] ?? 0; }
  marks(c) {
    const w = 1 / this.S.size, s = this.step, dash = "rgba(22,24,23,.45)";
    if (s === 0) CORN.forEach(([x, y], q) => { if (this.st.has(q)) return; c.strokeStyle = GREEN; c.lineWidth = w * 1.8; c.setLineDash([.012, .01]); c.strokeRect((x + 4 - 3.5) * U, (y + 4 - 3.5) * U, 7 * U, 7 * U); c.strokeRect((x + 4 - 1.5) * U, (y + 4 - 1.5) * U, 3 * U, 3 * U); c.setLineDash([]); });
    if (s === 1) [[0, [12, 10.5], [17, 10.5]], [1, [10.5, 12], [10.5, 17]]].forEach(([k, a, b]) => { if (this.r[k] >= 5) return; c.strokeStyle = GREEN; c.lineWidth = w * 1.8; c.setLineDash([.012, .01]); c.strokeRect(a[0] * U - (k ? .5 * U : 0), a[1] * U - (k ? 0 : .5 * U), k ? U : 5 * U, k ? 5 * U : U); c.setLineDash([]); });
    if (s === 3) { const P = this.map.path, p = i => [(P[i] % N + 4.5) * U, (Math.floor(P[i] / N) + 4.5) * U], h = Math.floor(this.lay); if (h < P.length) { const show = Math.min(P.length - 1, h + 26); c.setLineDash([U * .12, U * .2]); trail(c, Array.from({ length: show - h + 1 }, (_, i) => p(h + i)), U, GREEN, U * .08); c.setLineDash([]); const q = p(h); c.strokeStyle = GREEN; c.fillStyle = "rgba(0,165,106,.16)"; c.lineWidth = U * .1; c.beginPath(); c.arc(q[0], q[1], U * .9, 0, 7); c.fill(); c.stroke(); } }
    if (s === 5 && !this.signed) { c.strokeStyle = GREEN; c.lineWidth = w * 1.8; c.setLineDash([.012, .01]); formatCells(N).flat().forEach(([x, y]) => c.strokeRect((x + 4) * U + U * .1, (y + 4) * U + U * .1, U * .8, U * .8)); c.setLineDash([]); }
    if (s === 6 && this.seen) CORN.forEach(([x, y]) => bracket(c, (x + 4) * U, (y + 4) * U, U * 4.6, GREEN, w * 1.8));
  }
  check() { const px = 8, W = 29 * px, g = new Uint8Array(W * W).fill(245); this.build(); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const i = Math.floor(x / px) - 4, j = Math.floor(y / px) - 4; if (i >= 0 && j >= 0 && i < N && j < N && this.e.modules[j * N + i]) g[y * W + x] = 22; } const r = decodeImage(g, W, W); this.seen = r.stage === "ok" && r.text === this.word; if (this.seen) { this.S.finish("make"); play.alive(); } }
  down(p) {
    this.held = true; const x = p[0] / U - 4, y = p[1] / U - 4;
    if (this.step === 0) { const q = CORN.findIndex(([a, b], i) => !this.st.has(i) && Math.max(Math.abs(a - x), Math.abs(b - y)) < 5.2); if (q >= 0) this.stamp(q); }
    if (this.step === 5 && !this.signed) { this.signed = .01; play.print(); }
    this.move(p);
  }
  stamp(q) { this.st.add(q); this.when[q] = performance.now(); play.stamp(); vib(15); this.S.paint(); this.S.mark(); if (this.st.size === 3) this.pass(); }
  move(p) {
    if (!this.held) return; const x = p[0] / U - 4, y = p[1] / U - 4;
    if (this.step === 1) { let ch = false; if (Math.abs(y - 6.5) < 2) { const k = clamp(Math.floor(x - 8) + 1, 0, 5); if (k > this.r[0] && k <= this.r[0] + 3) { this.r[0] = k; ch = true; } } if (Math.abs(x - 6.5) < 2) { const k = clamp(Math.floor(y - 8) + 1, 0, 5); if (k > this.r[1] && k <= this.r[1] + 3) { this.r[1] = k; ch = true; } } if (ch) { play.dot(); this.S.paint(); this.S.mark(); if (this.r[0] === 5 && this.r[1] === 5) this.pass(); } }
    if (this.step === 3 && !this.auto) { const P = this.map.path; let best = -1, bd = 2.6; for (let i = Math.floor(this.lay); i < Math.min(P.length, this.lay + 10); i++) { const d = Math.hypot(P[i] % N + .5 - x, Math.floor(P[i] / N) + .5 - y); if (d < bd && (d < 1.1 || i - this.lay < 4)) { bd = d; best = i; } } if (best >= 0) this.adv(best + 1); }
  }
  adv(h) { const a = Math.floor(this.lay); this.lay = Math.min(this.map.path.length, Math.max(this.lay, h)); const b = Math.floor(this.lay); if (b === a) return; if (b >> 1 !== a >> 1) play.print(); this.S.paint(); this.S.mark(); const t = this.T; if (this.note) this.note.textContent = b < 12 ? t.n1 : b < this.end ? t.n2 : b < this.data ? t.n3 : t.n4; if (b >= this.end && !this.auto) this.auto = true; if (b >= this.map.path.length) { this.auto = false; play.alive(); this.pass(); } }
  tick(dt, now) {
    if (this.step === 3 && this.auto) { this.adv(this.lay + dt * .07); return true; }
    if (this.step === 5 && this.signed > 0 && this.signed < 16) { const a = Math.floor(this.signed); this.signed += dt * .014; if (Math.floor(this.signed) !== a) play.dot(); if (this.signed >= 15) { this.signed = 99; this.pass(); } return true; }
    return this.step === 0 && this.when.some(w => now - w < 200) || now - this.flipAt < 1000;
  }
  up() { this.held = false; }
  key(k) {
    if (k !== " " && k !== "Enter" && k !== "ArrowRight") return false; if (document.activeElement?.tagName === "BUTTON" && k !== "ArrowRight") return false;
    if (this.step === 0) { const q = [0, 1, 2].find(i => !this.st.has(i)); if (q != null) this.stamp(q); return true; }
    if (this.step === 1) { const w = this.r[0] < 5 ? 0 : 1; if (this.r[w] < 5) { this.r[w]++; play.dot(); this.S.paint(); this.S.mark(); if (this.r[0] === 5 && this.r[1] === 5) this.pass(); } return true; }
    if (this.step === 3) { this.adv(this.lay + 1); return true; } if (this.step === 5 && !this.signed) { this.signed = .01; return true; } return false;
  }
  flat(px) { const W = 29 * px, c = document.createElement("canvas"); c.width = c.height = W; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, W, W); x.fillStyle = "#000"; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (this.e.modules[j * N + i]) x.fillRect((i + 4) * px, (j + 4) * px, px, px); return c.toDataURL("image/png"); }
  png() { this.S.download(this.flat(72), "my-qr.png"); }
  svg() { let d = ""; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (this.e.modules[j * N + i]) d += `M${i + 4} ${j + 4}h1v1h-1z`; const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29" shape-rendering="crispEdges"><path fill="#fff" d="M0 0h29v29H0z"/><path d="${d}"/></svg>`; this.S.download("data:image/svg+xml;charset=utf-8," + encodeURIComponent(s), "my-qr.svg"); }
  async keep() { const t = this.T, url = await poster(this.S, { src: this.S.look, head: t.pHead, lines: [t.pSays(this.word), t.pLine(this.mask + 1)] }); this.S.poster(url, t.pHead, [[this.S.T.savePic, () => this.S.download(url, "my-qr-print.png")], [this.S.T.copyLink, () => this.S.copy(this.S.link())]]); }
}
