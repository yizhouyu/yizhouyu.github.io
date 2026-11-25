import { Chapter } from "./chapter.js";
import { el, ease, clamp } from "./util.js";
import { text, line, GREEN } from "./draw.js";
import { INK } from "./damage.js";
import { play } from "./sound.js";
const enc = new TextEncoder(), dec = new TextDecoder("utf-8", { fatal: true });
// order inside a 2-wide column going up: right then left, biggest first
const SPOT = [[1, 3], [0, 3], [1, 2], [0, 2], [1, 1], [0, 1], [1, 0], [0, 0]];
export class Letter extends Chapter {
  constructor(S) { super(S, "letter", ["c", "small", "own"], 2); }
  begin() { this.bytes = this.name === "c" ? [65] : this.name === "small" ? [67] : this.own ? [...enc.encode(this.own)] : [65]; this.vis = this.bytes.map(b => bitsOf(b)); this.S.over.style.cursor = "pointer"; this.aim = this.name === "c" ? "C" : this.name === "small" ? "c" : ""; }
  read(q) { const w = q?.get?.("w"); if (w) { try { this.own = [...decodeURIComponent(w)][0]; } catch { } } }
  extra() { return this.name === "own" && this.own ? "&w=" + encodeURIComponent(this.own) : ""; }
  get char() { try { const s = dec.decode(new Uint8Array(this.bytes)); return /[\p{C}]/u.test(s) ? "" : s; } catch { return ""; } }
  controls() {
    if (this.name !== "own") return []; const t = this.T, i = el("input", { id: "own", type: "text", maxlength: 4, autocomplete: "off", autocapitalize: "off", spellcheck: "false", "aria-label": t.typeOne, placeholder: t.typeOne, oninput: e => { const ch = [...e.target.value].pop(); if (!ch) return; e.target.value = ch; this.own = ch; this.bytes = [...enc.encode(ch)].slice(0, 4); this.vis = this.bytes.map(() => Array(8).fill(0)); this.pass(); this.S.paint(); this.S.save(); play.dot(); } });
    i.value = this.own || ""; return [el("div", { class: "field" }, i)];
  }
  geo() { const k = this.bytes.length, u = k === 1 ? .142 : k === 2 ? .1 : k === 3 ? .082 : .062, gap = u * .7, w = k * 2 * u + (k - 1) * gap, x0 = k === 1 ? .12 : .5 - w / 2, y0 = k === 1 ? .16 : .52; return { k, u, gap, x0, y0 }; }
  draw(c) {
    const { k, u, gap, x0, y0 } = this.geo(), ch = this.char;
    for (let b = 0; b < k; b++) SPOT.forEach(([i, j], q) => {
      const x = x0 + b * (2 * u + gap) + i * u, y = y0 + j * u, v = this.vis[b][q], w = 128 >> q, p = u * .035; c.strokeStyle = "rgba(22,24,23,.3)"; c.lineWidth = .0016; c.strokeRect(x + p, y + p, u - 2 * p, u - 2 * p);
      if (v > .01) { c.fillStyle = INK; const s = (u - 2 * p) * v; c.fillRect(x + u / 2 - s / 2, y + u / 2 - s / 2, s, s); }
    });
    const g = ch || "–"; if (k === 1) text(c, g, .7, .45, .44, { weight: 300 }); else text(c, g, .5, .27, .34, { weight: 300 });
  }
  sum(b) { const on = SPOT.map((_, q) => 128 >> q).filter(w => b & w); return on.length ? on.join(" + ") + (on.length > 1 ? " = " + b : "") : "0"; }
  tick(dt) { let mv = false; this.bytes.forEach((b, i) => bitsOf(b).forEach((t, q) => { const d = t - this.vis[i][q]; if (Math.abs(d) > .004) { this.vis[i][q] += d * Math.min(1, dt / 70); mv = true; } else if (d) { this.vis[i][q] = t; mv = true; } })); return mv; }
  hit(p) { const { k, u, gap, x0, y0 } = this.geo(); for (let b = 0; b < k; b++) for (let q = 0; q < 8; q++) { const x = x0 + b * (2 * u + gap) + SPOT[q][0] * u, y = y0 + SPOT[q][1] * u; if (p[0] >= x && p[0] < x + u && p[1] >= y && p[1] < y + u) return [b, q]; } return null; }
  toggle(b, q) { this.bytes[b] ^= 128 >> q; play.dot(); this.S.paint(); if (this.aim && this.char === this.aim) { play.alive(); this.pass(); } else if (this.name === "own") { this.own = this.char || this.own; const i = document.getElementById("own"); if (i && this.char) i.value = this.char; this.pass(); this.S.save(); } else this.talk(); }
  down(p) { const h = this.hit(p); if (h) this.toggle(...h); }
  hover(p) { this.S.over.style.cursor = p && this.hit(p) ? "pointer" : "default"; }
  marks(c) {
    const { k, u, gap, x0, y0 } = this.geo();
    if (k < 3) for (let b = 0; b < k; b++) SPOT.forEach(([i, j], q) => text(c, String(128 >> q), x0 + b * (2 * u + gap) + (i + .5) * u, y0 + (j + .5) * u, u * .2, { color: this.vis[b][q] > .5 ? "#f7f7f3" : "#6b716e", weight: 400 }));
    const sum = k === 1 ? this.sum(this.bytes[0]) : this.bytes.join("  ·  ");
    const fs = k === 1 ? Math.min(.036, .9 / (sum.length * .56)) : .04; text(c, sum, .5, .89, fs, { weight: 400, color: "#3a3f3c" });
    if (this.aim && k === 1 && this.ok.has(this.step) === false) text(c, "→ " + this.aim, .7, .72, .05, { color: "#00714a", weight: 400 });
    if (this.cur != null) { const [i, j] = SPOT[this.cur]; c.strokeStyle = GREEN; c.lineWidth = .004; c.strokeRect(x0 + i * u, y0 + j * u, u, u); }
  }
  key(k) { if (/^Arrow/.test(k)) { this.cur = ((this.cur ?? -1) + (k === "ArrowRight" || k === "ArrowDown" ? 1 : 7)) % 8; this.S.mark(); return true; } if ((k === " " || k === "Enter") && this.cur != null && document.activeElement?.tagName !== "BUTTON") { this.toggle(0, this.cur); return true; } return false; }
  sentence() {
    const t = this.T; if (this.name === "own") { if (!this.ok.has(this.step)) return t.do.own; const ch = this.char; return ch ? (this.bytes.length > 1 ? t.many(ch, this.bytes.length) : t.one(ch, this.bytes[0])) : t.none; }
    if (!this.ok.has(this.step) && this.char !== (this.name === "c" ? "A" : "C")) return t.now(this.char || "–") + " " + t.do[this.name]; return null;
  }
}
const bitsOf = b => SPOT.map((_, q) => b & (128 >> q) ? 1 : 0);
