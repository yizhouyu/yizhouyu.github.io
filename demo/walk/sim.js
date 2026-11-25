// A walk in simulated time. Actors follow a habit, or ask the visitor what to do when the light ahead is red and the other way is open.
import * as E from "./engine.js";
export class Sim {
  constructor(w) { this.w = w; this.t = 0; this.actors = []; this.asking = null; this.onAsk = this.onDone = null; }
  add(o) { const a = { ...o, p: o.from, mode: "node", since: 0, wait: 0, stops: [], path: [E.pos(o.from)], done: 0, log: [], asks: [] }; E.aim(this.w, o.from, o.to); this.actors.push(a); return a; }
  start() { for (const a of this.actors) this.node(a); }
  go(a, d) {
    const m = E.move(this.w, a.p, d), q = m.cross ? E.waitFor(this.w, a.p.a, a.p.s, d, this.t) : 0;
    if (d === a.main ? 0 : m.cross) a.used = (a.used || 0) + 1;
    a.next = { d, m, go: this.t + q, end: this.t + q + m.len / this.w.v };
    if (q > 0) { this.stand(a, a.next.go); a.after = null; } else this.walk(a);
  }
  stand(a, until) { a.mode = "wait"; a.since = this.t; a.until = until; const P = E.pos(a.p), L = a.stops[a.stops.length - 1]; if (L && Math.abs(L.t1 - this.t) < .01 && L.x === P.x && L.y === P.y) L.t1 = until, a.cur = L; else { a.cur = { x: P.x, y: P.y, t0: this.t, t1: until }; a.stops.push(a.cur); } }
  walk(a) { a.mode = "move"; a.since = this.t; a.until = a.next.end; a.A = E.pos(a.p); a.B = E.pos(a.next.m.to); }
  node(a) {
    if (E.same(a.p, a.to)) { a.mode = "done"; a.done = this.t; this.onDone && this.onDone(a); return; }
    const L = E.left(a.p, a.to);
    if (L.E <= 0) return this.go(a, "N"); if (L.N <= 0) return this.go(a, "E");
    if (a.policy) return this.go(a, a.policy(this.w, a.p, this.t, a.to, a));
    const q = E.waits(this.w, a.p, this.t), o = a.main === "N" ? "E" : "N";
    if (q[a.main] === 0) { a.swept = false; return this.go(a, a.main); }
    if (a.swept && q[o] === 0 && q[a.main] > 25) { a.swept = false; return this.go(a, o); }   // just crossed to the right: keep going that way, unless straight on is open or opens within 25 s: then ask
    if (q[o] === 0) { a.mode = "ask"; this.asking = { a, main: a.main, other: o, wait: q[a.main], cross: E.move(this.w, a.p, o).cross }; return; }
    a.next = null; this.stand(a, this.t + Math.min(q.N, q.E) + 1e-6);
  }
  choose(turn) { const k = this.asking; if (!k) return; this.asking = null; k.a.asks.push({ wait: k.wait, turn: !!turn }); k.a.swept = !!turn && k.cross; this.go(k.a, turn ? k.other : k.main); }
  advance(dt) {
    let end = this.t + dt;
    for (let guard = 0; guard < 4000; guard++) {
      if (this.asking) return;
      let n = null; for (const a of this.actors) if ((a.mode === "wait" || a.mode === "move") && (!n || a.until < n.until)) n = a;
      if (!n || n.until > end) { this.t = end; return; }
      this.t = n.until;
      if (n.mode === "wait") { if (n.next) this.walk(n); else this.node(n); } else { n.p = n.next.m.to; n.path.push(E.pos(n.p)); this.node(n); }
      if (this.actors.every(a => a.mode === "done")) return;
    }
  }
  waited(a) { let s = 0; for (const q of a.stops) s += Math.max(0, Math.min(this.t, q.t1) - q.t0); return s; }
  at(a) { if (a.mode !== "move") return E.pos(a.p); const f = Math.max(0, Math.min(1, (this.t - a.since) / (a.until - a.since))); return { x: a.A.x + (a.B.x - a.A.x) * f, y: a.A.y + (a.B.y - a.A.y) * f }; }
  get over() { return this.actors.every(a => a.mode === "done"); }
}
