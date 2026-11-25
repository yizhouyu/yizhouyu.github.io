import { clamp, ease, lerp, still, vib } from "./util.js";
import { line, squares, GREEN } from "./draw.js";
import { INK } from "./damage.js";
import { encode, mapOf } from "./core.js";
import { Level } from "./level.js";
import { settle } from "./settle.js";
import { play } from "./sound.js";
// Four pieces (8 squares each) fly out of the code just read and line up. Pull one off: the other three pull it back, and all fly home.
const X = [.2, .4, .6, .8], LINE = [4, 5, 6, 7], TOP = 12, yOf = v => .84 + (.16 - .84) * v / TOP, vOf = y => clamp(Math.round((.84 - y) / .68 * TOP), 0, TOP), BW = .064, BH = .128, n = 21, U = 1 / 29;
export class Mend extends Level {
  constructor(S) { super(S, "mend"); }
  start() {
    this.e = encode("HELLO", "M", { byte: true, version: 1 }); this.map = mapOf(this.e); const p = this.map.pieces; this.pick = [p[2], p[8], p[19], p[23]].map(q => q.j); // two pieces of the message, two spares
    this.val = LINE.slice(); this.vis = LINE.slice(); this.drag = -1; this.fixAt = 0; this.was = null; this.fixed = -1; this.said = false; this.fly = 0; this.t0 = performance.now() + 500; this.back = 0; this.S.over.style.cursor = "grab";
  }
  ghost() { return this.won || this.fly < 1 ? null : [[X[2], yOf(6)], [X[2], yOf(10)], [X[2], yOf(10)]]; }
  sentence() { const t = this.T; return this.fixAt ? t.looking : this.won ? t.why : t.say; }
  cellsOf(i) { return this.map.pieces[this.pick[i]].cells; }
  draw(c) {
    const set = new Set(this.pick.flatMap(j => this.map.pieces[j].cells)), f = this.fly, a = lerp(1, .13, f); squares(c, n, (i, j, k) => this.e.modules[k] && !set.has(k) ? { alpha: a } : null);
  }
  marks(c) {
    const f = ease(this.fly), ln = settle(this.val), px = i => .2 + .2 * i, la = clamp((this.fly - .8) / .2);
    if (la > 0) { c.globalAlpha = la; if (ln.kind !== "lost" && this.drag < 0) line(c, [[px(-.5), yOf(ln.f(-.5))], [px(3.5), yOf(ln.f(3.5))]], GREEN, .005); else { c.setLineDash([.014, .012]); line(c, [[px(-.5), yOf(3.5)], [px(3.5), yOf(7.5)]], "rgba(22,24,23,.3)", .003); c.setLineDash([]); } c.globalAlpha = 1; }
    X.forEach((x, i) => {
      const y = yOf(this.vis[i]), cells = this.cellsOf(i), w = this.was?.[i];
      if (w != null && this.fly > .9) { const y0 = yOf(w), s = Math.sign(y - y0); c.strokeStyle = "rgba(22,24,23,.45)"; c.lineWidth = .003; c.setLineDash([.01, .008]); c.strokeRect(x - BW / 2, y0 - BH / 2, BW, BH); c.setLineDash([]); const a = y0 + s * BH / 2, b = y - s * (BH / 2 + .012); if ((b - a) * s > .03) { c.strokeStyle = GREEN; c.lineWidth = .006; c.beginPath(); c.moveTo(x, a); c.lineTo(x, b); c.moveTo(x - .018, b - s * .022); c.lineTo(x, b); c.lineTo(x + .018, b - s * .022); c.stroke(); } }
      const fixed = this.fixed === i, dark = fixed ? "#007a4f" : INK; if (this.fly > .05) { c.globalAlpha = clamp(this.fly * 2); c.fillStyle = "#f7f7f3"; c.strokeStyle = fixed ? GREEN : "rgba(22,24,23,.55)"; c.lineWidth = .003; const bx = lerp(0, 1, f); if (f > .6) { c.fillRect(x - BW / 2 - .008, y - BH / 2 - .008, BW + .016, BH + .016); c.strokeRect(x - BW / 2 - .008, y - BH / 2 - .008, BW + .016, BH + .016); } c.globalAlpha = 1; }
      cells.forEach((k, q) => { const hx = (k % n + 4) * U, hy = (Math.floor(k / n) + 4) * U, qx = x - BW / 2 + (1 - q % 2) * BW / 2, qy = y + BH / 2 - (Math.floor(q / 2) + 1) * BH / 4, X0 = lerp(hx, qx, f), Y0 = lerp(hy, qy, f), s = lerp(U, BW / 2, f); if (this.e.modules[k]) { c.fillStyle = dark; c.fillRect(X0, Y0, s * 1.02, s * 1.02); } else if (f > .05 || fixed) { c.strokeStyle = fixed ? GREEN : "rgba(22,24,23,.18)"; c.lineWidth = .0016; c.strokeRect(X0 + s * .08, Y0 + s * .08, s * .84, s * .84); } });
    });
  }
  tick(dt, now) {
    let mv = false; const goal = this.won && now > this.back ? 0 : now > this.t0 ? 1 : 0; if (goal !== this.fly) { const step = dt / 1100; this.fly = still.matches || Math.abs(goal - this.fly) <= step ? goal : this.fly + Math.sign(goal - this.fly) * step; mv = true; if (this.fly === 1 && !this.said) { this.said = true; this.S.touched = now; } }
    if (this.fixAt && now > this.fixAt) { this.fixAt = 0; this.was = this.val.map((v, i) => v !== LINE[i] ? v : null); this.fixed = this.val.findIndex((v, i) => v !== LINE[i]); this.val = LINE.slice(); play.alive(); vib(12); this.back = now + 2600; if (!this.won) this.win(true); this.talk(); mv = true; }
    if (this.won && this.back && now > this.back && this.was) { this.was = null; mv = true; }
    this.val.forEach((t, i) => { const d = t - this.vis[i]; if (Math.abs(d) > .005) { this.vis[i] += d * Math.min(1, dt / (this.drag === i ? 25 : 260)); mv = true; } else if (d) { this.vis[i] = t; mv = true; } }); return mv;
  }
  down(p) { if (this.fixAt || this.won) return; this.fly = 1; this.t0 = 0; this.S.paint(); let b = -1, bd = .12; X.forEach((x, i) => { const d = Math.abs(p[0] - x); if (d < bd) { bd = d; b = i; } }); if (b < 0) return; this.drag = b; this.move(p); }
  move(p) { const i = this.drag; if (i < 0) return; const v = vOf(p[1]); if (v !== this.val[i]) { this.val[i] = v; play.dot(); this.S.mark(); } }
  up() { const i = this.drag; this.drag = -1; if (i < 0) return; if (this.val.some((v, k) => v !== LINE[k])) this.fixAt = performance.now() + 700; this.talk(); this.S.mark(); }
  key(k) { if (this.won) return false; if (k === "ArrowLeft" || k === "ArrowRight") { this.kb = clamp((this.kb ?? -1) + (k === "ArrowRight" ? 1 : -1), 0, 3); this.S.mark(); return true; } if ((k === "ArrowUp" || k === "ArrowDown") && this.kb != null && !this.fixAt) { this.val[this.kb] = clamp(this.val[this.kb] + (k === "ArrowUp" ? 3 : -3), 0, TOP); this.drag = this.kb; this.up(); return true; } return false; }
}
