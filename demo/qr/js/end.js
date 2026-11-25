import { el } from "./util.js";
import { encode, mapOf } from "./core.js";
import { text, line, GREEN } from "./draw.js";
import { INK, PAPER } from "./damage.js";
import { R } from "./scan.js";
import { poster } from "./poster.js";
// What to take home: three pictures, three sentences, two dares, three deeper rooms.
export class End {
  id = "end";
  constructor(S) { this.S = S; }
  get T() { return this.S.T.end; }
  enter() { this.e = encode(this.S.T.ruin.def, "H", { byte: true }); this.map = mapOf(this.e); this.S.over.style.cursor = "default"; this.S.finish("end"); this.words(); }
  leave() { } hash() { return "m=end"; }
  words() {
    const S = this.S, t = this.T, b = (l, fn) => el("button", { class: "link", type: "button", onclick: fn }, l); S.aria(t.canvas); if (this.e) { this.e = encode(S.T.ruin.def, "H", { byte: true }); this.map = mapOf(this.e); S.paint(); S.mark(); }
    const how = this.score; S.say(how ? t.said(...how) : t.say, { title: t.title, kick: "", won: true });
    S.ctl(el("ol", { class: "three" }, ...t.three.map(([h, p], i) => el("li", {}, el("b", {}, h), el("span", { html: p })))),
      el("div", { class: "row" }, b(t.save, () => this.keep()), b(t.send, () => S.copy(t.dare + " " + location.origin + location.pathname + "?lang=" + S.lang))),
      el("details", { class: "deep" }, el("summary", {}, t.deeper), el("div", { class: "row" }, ...["ruin", "make", "flip", "guess", "find", "spare"].map(id => b(S.T.then[id], () => S.go(id))), b(t.parts, () => S.about()))));
    S.next("");
  }
  mini(c, x, y, s, { hide = null, ink = INK } = {}) { const n = 25, u = s / n; c.fillStyle = ink; for (let k = 0; k < n * n; k++) { const i = k % n, j = Math.floor(k / n); if (this.e.modules[k] && !(hide && hide(i + .5, j + .5, k))) c.fillRect(x + i * u, y + j * u, u * 1.04, u * 1.04); } }
  draw() { }
  art(c) {
    const s = .2, X = .11, X2 = .52, Y = i => .085 + i * .3, u = s / 25; Object.assign(this, { s, X, X2, Y });
    const st = (x, y, cx, cy) => { this.mini(c, x, y, s); c.fillStyle = "#fdfdfb"; c.strokeStyle = "rgba(22,24,23,.35)"; c.lineWidth = .002; c.beginPath(); c.arc(x + cx * u, y + cy * u, R * u, 0, 7); c.fill(); c.stroke(); };
    st(X, Y(0), 12.5, 12.5); st(X2, Y(0), 3.5, 3.5);
    for (const [x, m] of [[X, 4 * u], [X2, 0]]) { c.fillStyle = "#1c262d"; c.fillRect(x - .05, Y(1) - .045, s + .1, s + .09); c.fillStyle = "#f7f7f3"; c.fillRect(x - m, Y(1) - m, s + 2 * m, s + 2 * m); this.mini(c, x, Y(1), s); } this.mini(c, X, Y(2), s);
  }
  marks(c) {
    this.art(c); const { s, X, X2, Y } = this; if (!Y) return; const w = .007, tick = (x, y) => line(c, [[x - .022, y], [x - .006, y + .018], [x + .026, y - .022]], GREEN, w), cross = (x, y) => { line(c, [[x - .02, y - .02], [x + .02, y + .02]], "#b3261e", w); line(c, [[x + .02, y - .02], [x - .02, y + .02]], "#b3261e", w); }, m = y => y + s / 2;
    tick(X + s + .085, m(Y(0))); cross(X2 + s + .085, m(Y(0))); tick(X + s + .085, m(Y(1))); cross(X2 + s + .085, m(Y(1)));
    const bx = X2 - .1, by = m(Y(2)) - .035; c.strokeStyle = INK; c.lineWidth = .003; c.strokeRect(bx, by, .48, .07); text(c, this.T.addr, bx + .02, by + .037, .03, { align: "left", weight: 400 }); line(c, [[X + s + .02, m(Y(2))], [bx - .016, m(Y(2))]], GREEN, .004); line(c, [[bx - .034, m(Y(2)) - .012], [bx - .016, m(Y(2))], [bx - .034, m(Y(2)) + .012]], GREEN, .004); text(c, this.T.look, bx + .02, by - .03, .027, { align: "left", weight: 500, color: "#00714a" });
  }
  async keep() { const t = this.T, url = await poster(this.S, { src: this.S.look, marks: c => this.marks(c), head: t.title, lines: t.three.map(([h], i) => `${i + 1}  ${h}`) }); this.S.poster(url, t.title, [[this.S.T.savePic, () => this.S.download(url, "qr-3-things.png")]]); }
}
