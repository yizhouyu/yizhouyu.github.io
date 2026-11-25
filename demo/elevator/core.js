// Rules shared by the page and the tests: the action log, the links, the three ways and their fewest numbers.
import { Sim, P } from "./sim.js";
export const MIN = { cables: 7, nocable: 3, up: 2 };            // proved by tests/truth.mjs (every combination, every floor, every load)
export const PART = { b: "brake", m: "motor", g: "gov", w: "govRope", l: "jawL", k: "jawR", c: "buf", v: "cwBuf" };
export const CODE = Object.fromEntries(Object.entries(PART).map(([a, b]) => [b, a]));
export const isBreak = c => /^[rbmgwlkcv]/.test(c);
export class Game {
  constructor({ floor = 5, people = 1 } = {}) { this.floor = floor; this.people = people; this.log = []; this.sim = new Sim({ floor, people }); this.vis(); }
  vis() { this.cuts = [null, null, null, null, null, null]; this.b = {}; this.cwAll = this.carAll = 0; this.govCutY = 0; this.gth = 0; this.govPh = .4; }
  // now = clock of the picture; returns true when something really happened
  apply(code, now = -10, rec = true) {
    const s = this.sim, c = code[0]; let ok = false;
    if (c === "r") { const i = +code[1], side = code[2] === "b" ? "cw" : "car", y = +code.slice(3) / 10; if (i >= 0 && i < 6 && !this.cuts[i] && Number.isFinite(y) && s.snip()) { this.cuts[i] = { y, side, t: now, th: s.xr, hy: s.y + P.hitch + .24 }; if (s.n === 0) { this.cwAll = s.w; this.carAll = s.y; } ok = true; } }
    else if (PART[c]) { if (s.smash(PART[c])) { this.b[PART[c]] = now; if (c === "w") this.govCutY = +code.slice(1) / 10 || s.y + 3; ok = true; } }
    else if (c === "p") { const n = +code.slice(1); if (n >= 0 && n <= 12 && n !== s.people) { s.setPeople(n); ok = true; } }
    else if (c === "f") { const f = +code.slice(1); ok = f >= 1 && f <= 12 && s.go(f); }
    else if (c === "U") ok = s.go(Infinity); else if (c === "D") ok = s.go(-Infinity);
    if (ok && rec) this.log.push([s.k, code]); return ok;
  }
  frozen() { const s = this.sim; return s.hand === null && !s.run && s.quiet > .9; }
  step() { const s = this.sim, n0 = s.n; s.step(); if (s.n < n0) { const i = this.cuts.findIndex(q => !q); if (i >= 0) this.cuts[i] = { y: s.y + P.hitch + 1.4, side: "car", t: this.now ?? -10, th: s.xr, hy: s.y + P.hitch + .24, self: true }; if (s.n === 0) { this.cwAll = s.w; this.carAll = s.y; } } }
  settle(max = 80) { const s = this.sim, t0 = s.t; while (s.t - t0 < max && !this.frozen() && !(s.out && s.t - s.out.t > 2.5)) this.step(); }
  count() { return this.log.filter(([, c]) => isBreak(c)).length; }
  broken() { const b = { rope: 0 }; for (const [, c] of this.log) if (c[0] === "r") b.rope++; else if (PART[c[0]]) b[PART[c[0]]] = 1; return b; }
  way() { const o = this.sim.out; return !o ? null : o.dir === "up" ? "up" : this.sim.n > 0 ? "nocable" : "cables"; }
  static replay(floor, people, log, { last = true } = {}) {
    const g = new Game({ floor, people }); const list = last ? log : log.slice(0, -1);
    for (const [k, c] of list) { if (k > 4e6 || k < g.sim.k) throw new Error("bad step"); while (g.sim.k < k) g.step(); if (!g.apply(c)) throw new Error("bad action " + c); }
    if (!last && log.length) { const k = log.at(-1)[0]; if (k < 4e6) while (g.sim.k < k) g.step(); }
    return g;
  }
  hash() { return [this.floor, this.people, ...this.log.map(([k, c]) => k.toString(36) + "." + c)].join("~"); }
  static parse(h) { const [f, p, ...r] = h.split("~"), floor = +f, people = +p; if (!(floor >= 1 && floor <= 12 && people >= 0 && people <= 12) || r.length > 400) throw new Error("bad"); return { floor, people, log: r.map(x => { const m = /^([0-9a-z]+)\.([A-Za-z0-9]{1,8})$/.exec(x); if (!m) throw new Error("bad"); return [parseInt(m[1], 36), m[2]]; }) }; }
}
// what saved the car? before = {y, n, set, ev, run} at the moment of the action
export function verdict(g, code, before) {
  const s = g.sim, ev = s.events.slice(before.ev), has = k => ev.find(e => e.k === k), c = code[0], fell = before.y - s.y, speed = Math.abs(before.peak || 0);
  if (s.out) return { k: "out" };
  const jaws = (s.ok.jawL ? 1 : 0) + (s.ok.jawR ? 1 : 0), hit = s.hits.slice(before.hits).filter(h => h.v > 1).sort((a, b) => b.v - a.v)[0];
  if (has("set") && !(hit && hit.dir === "down")) return { k: jaws === 2 ? "clamps" : "clamp1", a: fell, found: ["clamps", "watcher"], lit: ["jawL", "jawR", "gov"] };
  if (hit) return hit.dir === "down" ? { k: "soft", a: hit.v, found: s.ok.buf && has("buf") ? ["cushion"] : [], lit: s.ok.buf ? ["buf"] : [] } : { k: "softUp", a: hit.v, found: s.ok.cwBuf && has("cwbuf") ? ["cushion"] : [], lit: s.ok.cwBuf ? ["cwBuf"] : [] };
  const buf = has("buf"); if (buf && buf.v > .8) return { k: "cushion", a: buf.v, found: ["cushion"], lit: ["buf"] };
  if (has("overrunEnd") && has("cwbuf")) return { k: "gripUp", found: ["grip", "cushion"], lit: ["wheel", "cwBuf"] };
  if (has("cwbuf") && fell < -.5) return { k: "cushionTop", found: ["cushion", "weight"], lit: ["cwBuf"] };
  if (has("switch")) return { k: "switch", found: ["brake"], lit: ["brake"] };
  if (s.set && s.n === 0) return { k: jaws === 2 ? "stillClamped" : "stillClamp1", found: ["clamps"], lit: ["jawL", "jawR"] };
  const rest = s.n > 0 && s.w <= P.bufTop + .02 ? "restTop" : s.y - P.carLow <= P.bufTop + .02 ? "restBottom" : null;
  const bal = rest ? { k: rest, found: ["cushion"], lit: [rest === "restTop" ? "cwBuf" : "buf"] } : { k: "balance", found: ["weight"], lit: ["cw"] };
  const creep = Math.abs(s.v) > .06 && s.n > 0;
  if (creep && !s.ok.brake && s.ok.motor) return { k: s.v > 0 ? "motorUp" : "motorDown", a: Math.abs(s.v), found: ["motor", "weight"], lit: ["motor", "cw"] };
  if (creep && s.ok.brake && !s.run && s.n > 0) return { k: "tooHeavy", found: [], lit: ["brake"] };
  if (c === "m") return s.ok.brake ? { k: before.run ? "brakeRun" : "brake", found: ["brake"], lit: ["brake"] } : bal;
  if (c === "b") return bal;
  if (c === "r" && s.n > 0) return { k: s.ok.brake ? "cablesBoth" : "cables", a: s.n, found: s.ok.brake ? ["cables", "brake"] : ["cables"], lit: s.ok.brake ? ["ropes", "brake"] : ["ropes"] };
  if (c === "g" || c === "w") return { k: "watcher", found: s.n > 0 ? ["cables"] : [], lit: s.n > 0 ? ["ropes"] : [] };
  if (c === "l" || c === "k") return { k: jaws ? "oneclamp" : "noclamp", found: [], lit: s.n > 0 ? ["ropes"] : [] };
  if (c === "c" || c === "v") return { k: "nocushion", found: [], lit: [] };
  if (c === "p" && !s.ok.brake) return bal;
  if (has("arrive")) return { k: "arrive", a: Math.round((s.y - P.y1) / P.floorH) + 1, found: [], lit: [] };
  return null;
}
