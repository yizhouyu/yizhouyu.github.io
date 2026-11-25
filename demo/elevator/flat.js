// The same model as a flat section, for browsers without WebGL 2. Same interface as View in scene.js.
import { Art, drawStatic, makeDummies, X, MR, ropeOff } from "./flatdraw.js";
import { P } from "./sim.js";
const G = { Ta: 43.9, Pb: 1.75, Hm: 4.7, gap: .34, top: 48.6 };
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export class Flat {
  constructor(cv) { this.cv = cv; this.ctx = cv.getContext("2d"); this.art = new Art(); this.yawT = this.pitchT = 0; this.box = { x0: -2.5, x1: 2.75, y0: -.5, y1: 12 }; this.boxT = { ...this.box }; this.dark = false; this.n = -1; this.r = { shadowMap: {}, info: null }; this.ds = []; this.box0 = null; }
  setTheme(d) { this.dark = d; this.cache = null; } setRiders(n) { this.ds = makeDummies(n).map(d => ({ ...d, off: 0, v: 0, rot: 0, sq: 0 })); } cheap() { } setTall() { } spark() { }
  resize(w, h, dpr, rect) { if (this.w !== w || this.h !== h || this.dpr !== dpr) { this.cv.width = w * dpr; this.cv.height = h * dpr; } this.w = w; this.h = h; this.dpr = dpr; this.rect = rect; }
  map(y) { const lo = G.Pb + G.Hm / 2, hi = G.Ta - G.Hm / 2; this.c = Math.max(lo, Math.min(hi, y + 1.36)); this.gp = G.gap * sm(0, 1.2, this.c - lo); this.gt = G.gap * sm(0, 1.2, hi - this.c); this.m0 = G.Pb + this.gp; this.off = this.m0 + G.Hm / 2 - this.c; this.t0 = this.m0 + G.Hm + this.gt; this.offT = this.t0 - G.Ta; this.lo = this.c - G.Hm / 2; this.hi = this.c + G.Hm / 2; this.H = this.t0 + G.top - G.Ta; }
  Y(y) { return y < this.lo && y <= G.Pb ? y : y >= this.hi - 1e-6 && y >= G.Ta - 1e-6 ? y + this.offT : y + this.off; }
  update(sim, st, dt) { this.sim = sim; this.st = st; this.map(sim.y); this.Yc = this.Y(sim.y); const ge = P.g + st.acc; for (const d of this.ds) { if (dt > 0) { d.v -= ge * dt * (d.off > 0 || ge < 0 ? 1 : 0); d.off += d.v * dt; const top = 2.3 - d.h - .15; if (d.off <= 0) { d.off = 0; d.v = 0; d.rot *= .85; } else d.rot += (d.x > 0 ? 1 : -1) * dt * .4; if (d.off > top) { d.off = top; d.v = -Math.abs(d.v) * .2; } } }
    sim.gth = st.gth; st.dummies = this.ds; st.lampA = 0; st.lw = 1; st.cuts.forEach(c => { if (c && c.hy > 90) c.hy = sim.y + 3; }); }
  look(dt, j) { const k = j ? 1 : 1 - Math.exp(-dt * 4.2); for (const q in this.box) this.box[q] += (this.boxT[q] - this.box[q]) * k; const b = this.box, r = this.rect; this.scale = Math.min(r.w / (b.x1 - b.x0), r.h / (b.y1 - b.y0)); this.ox = r.x + r.w / 2 - (b.x0 + b.x1) / 2 * this.scale; this.oy = r.y + r.h / 2 + (b.y0 + b.y1) / 2 * this.scale; }
  hitchY(sim) { return sim.y + P.hitch + .12; } ropeX(i) { return [ropeOff(i), 0]; }
  project3(x, y) { return { x: this.ox + x * this.scale, y: this.oy - y * this.scale }; }
  project(v) { return this.project3(v.x, v.y); }
  anchor(k, sim) { const o = this.offT, c = this.Yc, m = { motor: [1, P.sheaveY + o + .3], brake: [.6, P.sheaveY + o + .8], wheel: [P.geo.R, P.sheaveY + o], gov: [X.gA, MR.floor + .9 + o], jawL: [-X.rail, c - .3], jawR: [X.rail, c - .3], buf: [0, .8], cwBuf: [X.cw, .8], car: [0, c + 1.2], ropes: [0, c + 3.4], govRope: [X.gA, c + 1.6], cw: [X.cw, this.Y(Math.max(this.lo, Math.min(this.hi, sim.w + 1.6)))] }[k] || [0, c]; return { x: m[0], y: m[1], z: 0 }; }
  targets(sim, st) {
    const out = [], o = this.offT, add = (key, pts, r, e) => out.push({ key, pts: pts.map(p => this.project3(...p)), r, ...e }), hy = sim.y + P.hitch + .12;
    if (st.b.brake == null) add("brake", [[.1, P.sheaveY + o + .85], [1.2, P.sheaveY + o + .85]], 20); if (st.b.motor == null) { add("motor", [[1.6, 46.1 + o], [2.5, 46 + o]], 24); add("motor", [[1.6, 47 + o]], 26, { weak: 1 }); } if (st.b.gov == null) add("gov", [[-1.28, MR.floor + .3 + o], [-1.28, MR.floor + 1.4 + o]], 24);
    if (st.b.govRope == null) add("govRope", [[X.gA, this.Y(this.lo) + .05], [X.gA, this.Y(this.hi) - .05]], 12); for (const q of [-1, 1]) { const k = q < 0 ? "jawL" : "jawR"; if (st.b[k] == null) add(k, [[q * X.rail, this.Yc - .25]], 22); } if (st.b.buf == null) add("buf", [[0, .2], [0, 1.1]], 22); if (st.b.cwBuf == null) add("cwBuf", [[X.cw, .2], [X.cw, 1.1]], 20);
    for (let i = 0; i < 6; i++) if (!st.cuts[i]) { const x = ropeOff(i); if (hy < this.hi) add("rope", [[x, this.Y(hy)], [x, this.Y(this.hi - .001)]], 14, { i, side: "car", ya: hy, yb: this.hi }); add("rope", [[x, this.Y(Math.max(hy, Math.max(this.hi, G.Ta)))], [x, this.Y(P.sheaveY)]], 14, { i, side: "car", ya: Math.max(hy, G.Ta), yb: P.sheaveY }); }
    return out;
  }
  render() {
    const x = this.ctx, s = this.scale, d = this.dpr, sim = this.sim, st = this.st; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, this.cv.width, this.cv.height);
    const zones = [[-.6, this.gp > .01 ? G.Pb : this.lo, 0], [this.lo, this.hi, this.off], [this.gt > .01 ? G.Ta : this.hi, G.top + .4, this.offT]]; const sig = [s, this.w, this.h].join();
    for (const [a, b, o] of zones) {
      x.save(); x.setTransform(s * d, 0, 0, -s * d, this.ox * d, this.oy * d); x.beginPath(); x.rect(-3.2, a + o, 6.9, b - a); x.clip(); x.translate(0, o);
      drawStatic(x, s * d, a, b, 1); const A = this.art; A.govRope(x, s, sim, st, a, b); A.ropes(x, s, sim, st, a, b); if (sim.w < b && sim.w + P.cwH > a) A.cw(x, s, sim, st); if (a < 1) { A.buffer(x, s, 0, sim.x1, st.b.buf, st.lit.buf, st.now); A.buffer(x, s, X.cw, sim.x2, st.b.cwBuf, st.lit.cwBuf, st.now, .2); } if (sim.y - .6 < b && sim.y + 3.3 > a) A.car(x, s, sim, st); if (b > 45) { A.sheave(x, s, sim, st); A.governor(x, s, sim, st); A.ropes(x, s, sim, st, a, b); } x.restore();
    }
    x.setTransform(1, 0, 0, 1, 0, 0); if (this.dark) { x.globalCompositeOperation = "multiply"; x.fillStyle = "#b9b29c"; x.fillRect(0, 0, this.cv.width, this.cv.height); x.globalCompositeOperation = "source-over"; }
  }
  still(w, h, rect, box) { const k = { w: this.w, h: this.h, dpr: this.dpr, rect: this.rect, box: { ...this.box }, cv: this.cv, ctx: this.ctx }; const c = document.createElement("canvas"); this.cv = c; this.ctx = c.getContext("2d"); this.w = 0; this.resize(w, h, 1, rect); this.box = { ...box }; const bt = this.boxT; this.boxT = { ...box }; this.look(0, true); this.render(); this.cv = k.cv; this.ctx = k.ctx; this.w = k.w; this.h = k.h; this.dpr = k.dpr; this.rect = k.rect; this.box = k.box; this.boxT = bt; this.look(0, false); return c; }
}
