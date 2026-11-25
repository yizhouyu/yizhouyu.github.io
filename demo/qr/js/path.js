import { Chapter } from "./chapter.js";
import { el, clamp, still } from "./util.js";
import { encode, mapOf, maskBit } from "./core.js";
import { squares, text, trail, GREEN, cellAt } from "./draw.js";
import { play } from "./sound.js";
export class Path extends Chapter {
  constructor(S) { super(S, "path", ["drag"], 0); this.word = "HELLO"; }
  read(q) { const w = q?.get?.("w"); if (w) try { const d = decodeURIComponent(w); if (encode(d, "M", { byte: true, version: 1 })) this.word = d; } catch { } }
  extra() { return this.word !== "HELLO" ? "&w=" + encodeURIComponent(this.word) : ""; }
  begin() {
    this.e = encode(this.word, "M", { byte: true, version: 1 }); const n = this.n = this.e.n; this.map = mapOf(this.e); this.path = this.map.path; this.order = new Int32Array(n * n).fill(-1); this.path.forEach((c, i) => this.order[c] = i);
    this.bits = this.e.modules.map((b, i) => this.map.roles[i] ? b : b ^ (maskBit(this.e.mask, i % n, Math.floor(i / n)) ? 1 : 0)); this.h = 0; this.auto = false; this.S.over.style.cursor = "grab"; this.end = 12 + this.map.letters.reduce((s, l) => s + l.cells.length, 0); this.data = this.e.lay.dataBytes * 8; this.total = this.e.lay.total * 8;
  }
  ghost() { if (this.auto || this.ok.has(0)) return null; const P = this.path, h = Math.floor(this.h), n = this.n; return [0, 5, 10, 15, 20].map(d => P[Math.min(P.length - 1, h + d)]).map(k => [(k % n + 4.5) / (n + 8), (Math.floor(k / n) + 4.5) / (n + 8)]); }
  controls() {
    const t = this.T; this.out = el("div", { class: "msg" }); this.note = el("p", { class: "cap" }); const r = [this.out, this.note, this.rowEl = el("div", { class: "row" }, el("button", { class: "link", type: "button", onclick: () => { this.begin(); this.ok.clear(); this.words(); this.S.paint(); this.S.mark(); } }, t.again))]; this.rowEl.hidden = !this.ok.has(0); setTimeout(() => this.read2()); return r;
  }
  read2() { if (!this.out) return; const t = this.T, h = Math.floor(this.h); let k = 0, b = 12; const got = this.map.letters.filter(l => { b += l.cells.length; return b <= h; }); this.out.replaceChildren(...this.map.letters.map((l, i) => el("span", { class: i < got.length ? "fix" : "gone" }, l.ch))); this.note.textContent = h < 1 ? "" : h < 12 ? t.note : h < this.end ? t.letters : h < this.data ? t.filler : h < this.total ? t.spare : t.allDone; }
  advance(h) { const a = Math.floor(this.h); this.h = Math.max(this.h, Math.min(h, this.path.length)); const b = Math.floor(this.h); if (b > a) { if (b >> 3 !== a >> 3 && !this.auto) play.patch(1 - this.h / this.total); this.S.paint(); this.S.mark(); this.read2(); if (b >= this.end && !this.ok.has(0)) { play.alive(); this.auto = true; } if (b >= this.total) { this.auto = false; this.pass(); if (this.rowEl) this.rowEl.hidden = false; } } }
  tick(dt) { if (!this.auto) return false; this.advance(this.h + dt * (this.h < this.end ? .022 : .06)); return true; }
  draw(c) { const h = this.h; squares(c, this.n, (i, j, k) => { if (!this.bits[k]) return null; const o = this.order[k]; if (o < 0) return { alpha: .16 }; return o < h ? { color: o >= this.data ? "#1c6b4e" : undefined } : { alpha: .45 }; }); }
  marks(c) {
    const n = this.n, u = 1 / (n + 8), w = 1 / this.S.size, P = i => [(this.path[i] % n + 4.5) * u, (Math.floor(this.path[i] / n) + 4.5) * u], h = Math.floor(this.h);
    if (h > 0) { c.globalAlpha = h >= this.total ? .5 : .85; trail(c, Array.from({ length: h }, (_, i) => P(i)), u, GREEN, u * .085); c.globalAlpha = 1; }
    const show = Math.min(this.path.length - 1, h + 22); if (!this.auto) { c.setLineDash([u * .12, u * .2]); if (show > h) trail(c, Array.from({ length: show - h + 1 }, (_, i) => P(h + i)), u, GREEN, u * .07); c.setLineDash([]); }
    if (h >= 12) { const cs = this.path.slice(0, 12), xs = cs.map(k => k % n), ys = cs.map(k => Math.floor(k / n)), x0 = Math.min(...xs), y0 = Math.min(...ys), g = u * .1, W2 = (Math.max(...xs) + 1 - x0) * u, H2 = (Math.max(...ys) + 1 - y0) * u; c.fillStyle = "#f7f7f3"; c.strokeStyle = "#007a4f"; c.lineWidth = u * .1; c.fillRect((x0 + 4) * u + g, (y0 + 4) * u + g, W2 - 2 * g, H2 - 2 * g); c.strokeRect((x0 + 4) * u + g, (y0 + 4) * u + g, W2 - 2 * g, H2 - 2 * g); text(c, this.T.count(this.map.letters.length), (x0 + 4) * u + W2 / 2, (y0 + 4) * u + H2 / 2, u * .92, { color: "#00714a", weight: 500, rot: -Math.PI / 2 }); }
    let b = 12; this.map.letters.forEach(l => { b += l.cells.length; if (b > h) return; // its 8 squares have become a letter
      const xs = l.cells.map(k => k % n), ys = l.cells.map(k => Math.floor(k / n)), x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, y0 = Math.min(...ys), y1 = Math.max(...ys) + 1; if ((x1 - x0) * (y1 - y0) !== l.cells.length) return;
      const g = u * .1; c.fillStyle = "#007a4f"; c.fillRect((x0 + 4) * u + g, (y0 + 4) * u + g, (x1 - x0) * u - 2 * g, (y1 - y0) * u - 2 * g); text(c, l.ch, ((x0 + x1) / 2 + 4) * u, ((y0 + y1) / 2 + 4) * u + u * .08, u * 1.7, { color: "#fff", weight: 300 }); });
    const q = P(Math.min(h, this.path.length - 1)); if (h < this.total && !this.S.ghosting) { c.strokeStyle = GREEN; c.lineWidth = Math.max(w * 2, u * .1); c.fillStyle = "rgba(0,165,106,.16)"; c.beginPath(); c.arc(q[0], q[1], u * .95, 0, 7); c.fill(); c.stroke(); }
  }
  down(p) { this.held = true; this.move(p); }
  move(p) { if (!this.held || this.auto) return; const n = this.n, x = p[0] * (n + 8) - 4, y = p[1] * (n + 8) - 4; let best = -1, bd = 3; for (let i = Math.floor(this.h); i < Math.min(this.path.length, this.h + 10); i++) { const c = this.path[i], d = Math.hypot(c % n + .5 - x, Math.floor(c / n) + .5 - y); if (d < bd && (d < 1.4 || i - this.h < 5)) { bd = d; best = i; } } if (best >= 0) this.advance(best + 1); }
  up() { this.held = false; }
  key(k) { if (k === "ArrowRight" || k === "ArrowUp" || k === " " && document.activeElement === this.S.over) { this.advance(this.h + 1); return true; } return false; }
}
