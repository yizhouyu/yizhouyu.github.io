// Elevator physics. Pure functions + one class; no DOM. SI units, y up, 0 = pit floor.
export const P = {
  g: 9.81,
  floors: 12, floorH: 3.5, y1: 1.9,               // car floor level at landing 1
  Mcar: 1500, person: 75, rated: 12, maxPeople: 15,
  balance: 0.45,                                  // counterweight = car + 45 % of rated load
  ropes: 6, EA: 3.6e6, tau: 0.006, MBL: 64500,    // per rope
  Msheave: 600, Mrope: 120,
  vRated: 2.5, aRun: 0.8,
  fGroove: 0.28,                                  // apparent groove friction
  brakeF: 10000, motorMax: 16000, dynB: 3485, dynMax: 15000,
  guideF: 150, bearF: 200,
  vTrip: 3.0, vSwitch: 2.75, pull: 0.12, ramp: 0.08,
  jawF: 0.5 * 2400 * 9.81 * 1.5,                  // each of two jaws
  carLow: 0.4, carTop: 3.15,                      // frame bottom / highest point, from car floor
  hitch: 2.9, cwH: 3.2,
  bufTop: 1.2, bufS: (1.15 * 2.5) ** 2 / (2 * 9.81), bufMd: 2400, bufMw: 1905, bufCap: 3.5,
  ceil: 45.2, sheaveY: 46.6,
  hardV: Math.sqrt(2 * 9.81 * 0.5),               // harder than a 0.5 m jump counts as a fall
  // plan of the overhead machine (x of rope drops, radii) – also used by the drawing
  geo: { xCar: 0, R: 0.46, xCw: 1.45, r: 0.26, dy: 0.74 },
};
// wrap angle of the rope on the drive wheel, from the drawing's own geometry (rad)
export function wrapAngle(geo = P.geo) {
  const x0 = geo.xCar + geo.R, x1 = geo.xCw - geo.r;       // centres: drive wheel (x0,0), deflector (x1,-dy)
  const dx = x1 - x0, dy = -geo.dy, D = Math.hypot(dx, dy);
  const base = Math.atan2(dy, dx), tilt = Math.acos((geo.R - geo.r) / D);
  const th = base + tilt;                                   // angle of the external tangent's normal (upper side)
  return Math.PI - th;                                      // contact from th to 180°
}
export const floorY = (f, p = P) => p.y1 + (f - 1) * p.floorH;
export const PARTS = ["brake", "motor", "gov", "govRope", "jawL", "jawR", "buf", "cwBuf"];

export class Sim {
  constructor(opt = {}) {
    this.p = { ...P, ...(opt.params || {}) };
    const p = this.p;
    this.dt = opt.dt || 0.0005;
    this.alpha = wrapAngle(p.geo);
    this.Mw = p.Mcar + p.balance * p.rated * p.person;
    this.people = opt.people ?? 1;
    this.ok = { brake: true, motor: true, gov: true, govRope: true, jawL: true, jawR: true, buf: true, cwBuf: true };
    this.n = p.ropes;
    this.y = floorY(opt.floor ?? 5, p); this.v = 0;
    // counterweight bottom sits 0.3 m above its buffer with the car at the top landing
    this.travel0 = floorY(p.floors, p) + (p.bufTop + 0.3);
    this.w = this.travel0 - this.y; this.vw = 0;
    this.u = 0; this.vs = 0; this.th = 0;       // rope over wheel, wheel rim speed, wheel turned
    this.l1 = 0; this.l2 = 0; this.restRopes();
    this.t = 0;
    this.run = null;                            // {target, dir}
    this.vref = 0;
    this.tripped = false; this.pullX = 0; this.set = false; this.jawX = 0; this.tSet = -1; this.tHeld = -1; this.setY0 = 0; this.vAtSet = 0; this.jawHold = 0;
    this.x1 = 0; this.x2 = 0;                   // buffer strokes
    this.out = null;                            // {dir, v}
    this.events = [];
    this.maxCarV = 0; this.T1 = 0; this.T2 = 0; this.a = 0; this.quiet = 0; this.slip = 0; this.slipTime = 0;
    this.landV = 0; this.hits = [];
    this.hand = null; this.xr = 0; this.k = 0;   // hand = speed at which a hand moves the car (m/s); xr = rope travel; k = step count
    this.W = { hand: 0, brake: 0, bear: 0, guide: 0, motor: 0, jaws: 0, buf: 0, hit: 0, rope: 0, slip: 0, cut: 0 };
    this._init = this.energy();
  }
  get M() { return this.p.Mcar + this.people * this.p.person; }
  restRopes() {
    const p = this.p, k = p.EA * Math.max(1, this.n);
    const s1 = p.sheaveY - (this.y + p.hitch), s2 = p.sheaveY - (this.w + p.cwH);
    this.l1 = s1 / (1 + this.M * p.g / k); this.l2 = s2 / (1 + this.Mw * p.g / k);
  }
  say(k, d) { this.events.push({ k, t: this.t, ...d }); }
  snip() { if (this.n <= 0) return false; const e = this.elastic(); this.n--; this.W.cut += e - this.elastic(); this.say("snip", { n: this.n }); this.quiet = 0; if (this.n === 0) { this.run = null; } return true; }
  smash(k) {
    if (!this.ok[k]) return false; this.ok[k] = false; this.say("smash", { part: k }); this.quiet = 0;
    if (k === "motor") this.run = null;
    if (k === "buf" ) this.x1 = 0; if (k === "cwBuf") this.x2 = 0;
    return true;
  }
  setPeople(n) { n = Math.max(0, Math.min(this.p.maxPeople, n)); this._init += (n - this.people) * this.p.person * (0.5 * this.v * this.v + this.p.g * this.y); this.people = n; this.quiet = 0; }
  release() { if (this.set) { this.set = false; this.tripped = false; this.pullX = 0; this.say("release"); } }   // lifting the car frees the clamps
  canRun() { return this.ok.motor && this.n > 0 && !this.set && !this.tripped && !this.out; }
  go(f) { // floor number, or Infinity / -Infinity to run past the ends
    if (!this.canRun()) return false;
    const target = f === Infinity ? 1e3 : f === -Infinity ? -1e3 : floorY(f, this.p);
    this.run = { target, f, stuck: 0 }; this.vref = this.vs; this.quiet = 0; this.say("go", { f }); return true;
  }
  elastic() {
    if (!this.n) return 0; const p = this.p;
    const s1 = p.sheaveY - (this.y + p.hitch) - this.l1, s2 = p.sheaveY - (this.w + p.cwH) - this.l2;
    return 0.5 * p.EA * this.n * ((s1 > 0 ? s1 * s1 / this.l1 : 0) + (s2 > 0 ? s2 * s2 / this.l2 : 0));
  }
  energy() {
    const g = this.p.g;
    return 0.5 * this.M * this.v ** 2 + 0.5 * this.Mw * this.vw ** 2 + 0.5 * this.p.Msheave * this.vs ** 2 + 0.5 * this.p.Mrope * this.u ** 2 + this.M * g * this.y + this.Mw * g * this.w + this.elastic();
  }
  ledger() { let s = this.energy(); for (const k in this.W) s += this.W[k]; return s - this._init; }   // should stay ~0
  step() {
    const p = this.p, dt = this.dt, g = p.g, M = this.M, Mw = this.Mw, W = this.W, n = this.n;
    const v0 = this.v;
    // --- ropes
    let T1 = 0, T2 = 0;
    if (n > 0) {
      const s1 = p.sheaveY - (this.y + p.hitch), s2 = p.sheaveY - (this.w + p.cwH);
      const e1 = s1 - this.l1, e2 = s2 - this.l2, r1 = -this.v + this.u, r2 = -this.vw - this.u;
      const k1 = p.EA * n / this.l1, k2 = p.EA * n / this.l2;
      if (e1 > 0) { const d = k1 * p.tau * r1; T1 = Math.max(0, k1 * e1 + d); W.rope += (T1 - k1 * e1) * r1 * dt; }
      if (e2 > 0) { const d = k2 * p.tau * r2; T2 = Math.max(0, k2 * e2 + d); W.rope += (T2 - k2 * e2) * r2 * dt; }
      if (Math.max(T1, T2) / n > p.MBL) { const e = this.elastic(); this.n--; W.cut += e - this.elastic(); this.say("ropeBreak", { n: this.n }); }
    }
    this.T1 = T1; this.T2 = T2;
    // --- wheel + rope over it
    const braking = this.ok.brake && !this.run;
    let Fm = 0;
    if (this.run) {
      const R = this.run, d = R.target - this.y;
      const want = Math.sign(d) * Math.min(p.vRated, Math.sqrt(2 * p.aRun * Math.abs(d)));
      this.vref += Math.max(-p.aRun * dt, Math.min(p.aRun * dt, want - this.vref));
      if (Math.abs(d) < 0.4) this.vref = want * 1;
      Fm = Math.max(-p.motorMax, Math.min(p.motorMax, 30000 * (this.vref - this.vs) + (T1 - T2)));
      if (Math.abs(this.v) > p.vSwitch) { this.run = null; this.say("switch"); }
      else if (Math.abs(d) < 0.006 && Math.abs(this.v) < 0.12) { this.run = null; this.say("arrive"); }
      else if (Math.abs(R.target) > 500) { if (Math.abs(this.v) < 0.25 && Math.abs(this.vs) > 0.5) R.stuck += dt; if (R.stuck > 3.2) { this.run = null; this.say("overrunEnd", { dir: Math.sign(R.target) }); } }
    } else if (this.ok.motor) Fm = Math.max(-p.dynMax, Math.min(p.dynMax, -p.dynB * this.vs));
    // implicit viscous coupling rope<->wheel, clamped at the friction (capstan) limit
    const cap = Math.exp(p.fGroove * this.alpha) - 1;
    const lim = n > 0 ? Math.min(T1, T2) * cap : 0;
    // slack on one side: limit uses the smaller tension -> no grip
    const C = 4e8, A = dt * C;
    const uf = this.u + dt * (T1 * -1 + T2) / p.Mrope;      // car side tension resists rope moving up (+u)
    const sf = this.vs + dt * Fm / p.Msheave;
    // rope force on wheel F = C*(u - vs) ; solve implicitly
    let F = C * (uf - sf) / (1 + A / p.Mrope + A / p.Msheave);
    let slipping = false;
    if (Math.abs(F) > lim) { F = Math.sign(F) * lim; slipping = true; }
    if (n > 0) this.u = uf - dt * F / p.Mrope; else this.u *= 0.999;
    let vs = sf + dt * F / p.Msheave;
    W.motor -= Fm * this.vs * dt;
    const fr = (braking ? p.brakeF : 0) + p.bearF, need = -vs * p.Msheave / dt;
    const Ff = Math.max(-fr, Math.min(fr, need)), vs2 = vs + dt * Ff / p.Msheave;
    W.brake -= Ff * 0.5 * (vs + vs2) * dt;
    this.vs = vs2; this.th += this.vs * dt;
    this.slip = n > 0 ? this.u - this.vs : 0;
    if (n > 0) { W.slip += F * (this.u - this.vs) * dt; }
    if (slipping && Math.abs(this.slip) > 0.3 && n > 0) this.slipTime += dt;
    // --- car
    let Fc = T1 - M * g;
    // buffer
    let Fb = 0; const bx = p.bufTop - (this.y - p.carLow);
    if (this.ok.buf && bx > 0) {
      if (!this.inBuf) { this.inBuf = true; this.landV = -this.v; this.say("buf", { v: -this.v }); }
      if (this.v < 0) Fb = Math.min(p.bufMd * this.v ** 2 / Math.max(0.02, p.bufS - bx), p.bufMd * g * p.bufCap); this.x1 = Math.min(p.bufS, Math.max(this.x1, bx));
    } else if (bx < -0.02) { this.inBuf = false; this.x1 = Math.max(0, this.x1 - dt * 0.6); }
    let Fh = 0; if (this.hand !== null) { const free = this.v + dt * (Fc + Fb) / M, f = (this.hand - free) * M / dt, top = 6 * M * g; Fh = Math.max(-top, Math.min(top, f)); if (this.set && Fh < 0) Fh = Math.max(Fh, -0.5 * M * g); }
    let vn = this.v + dt * (Fc + Fb + Fh) / M; W.hand -= Fh * 0.5 * (this.v + vn) * dt; W.buf -= Fb * 0.5 * (this.v + vn) * dt; this.Fb = Fb;
    // guides
    { const q = vn, f = Math.max(-p.guideF, Math.min(p.guideF, -q * M / dt)); vn = q + dt * f / M; W.guide -= f * 0.5 * (q + vn) * dt; }
    // governor + rail clamps
    if (!this.tripped && this.ok.gov && this.ok.govRope && this.v < -p.vTrip) { this.tripped = true; this.vTripped = -this.v; this.say("trip", { v: -this.v }); if (this.run) this.run = null; }
    if (this.tripped && !this.set) {
      if (!this.ok.gov || !this.ok.govRope) this.tripped = false;
      else { this.pullX += Math.max(0, -this.v * dt); if (this.pullX > p.pull && (this.ok.jawL || this.ok.jawR)) { this.set = true; this.tHeld = -1; this.tSet = this.t; this.setY0 = this.y; this.vAtSet = -this.v; this.say("set", { v: -this.v }); } }
    }
    this.jawHold = 0;
    if (this.set && vn < 0) {
      const jaws = (this.ok.jawL ? 1 : 0) + (this.ok.jawR ? 1 : 0);
      const fmax = jaws * p.jawF * Math.min(1, (this.t - this.tSet) / p.ramp);
      const f = Math.min(fmax, -vn * M / dt), q = vn; vn = q + dt * f / M; W.jaws -= f * 0.5 * (q + vn) * dt; this.jawHold = f;
      if (vn < -1e-9) this.jawX -= vn * dt; else if (this.tHeld < 0) this.tHeld = this.t;
    }
    this.a = (vn - v0) / dt;
    this.v = vn; this.y += dt * vn;
    // hard stops for the car
    const floorLim = this.ok.buf ? p.bufTop - p.bufS + p.carLow : p.carLow;
    if (this.y < floorLim) this.hit("down", floorLim);
    if (this.y + p.carTop > p.ceil) this.hit("up", p.ceil - p.carTop);
    // --- counterweight
    let Gb = 0; const cx = p.bufTop - this.w;
    if (this.ok.cwBuf && cx > 0) { if (this.vw < 0) Gb = Math.min(p.bufMw * this.vw ** 2 / Math.max(0.02, p.bufS - cx), p.bufMw * g * p.bufCap); this.x2 = Math.min(p.bufS, Math.max(this.x2, cx)); if (!this.inCw) { this.inCw = true; this.say("cwbuf", { v: -this.vw }); } }
    else if (cx < -0.02) { this.inCw = false; this.x2 = Math.max(0, this.x2 - dt * 0.6); }
    let wn = this.vw + dt * (T2 - Mw * g + Gb) / Mw; W.buf -= Gb * 0.5 * (this.vw + wn) * dt;
    { const f = Math.max(-p.guideF, Math.min(p.guideF, -wn * Mw / dt)), q = wn; wn = q + dt * f / Mw; W.guide -= f * 0.5 * (q + wn) * dt; }
    this.vw = wn; this.w += dt * wn;
    const wLim = this.ok.cwBuf ? p.bufTop - p.bufS : 0;
    if (this.w < wLim) { if (this.vw < -0.6) { this.say("cwhit", { v: -this.vw }); this.cwHitV = Math.max(this.cwHitV || 0, -this.vw); } W.hit += 0.5 * Mw * this.vw ** 2 + Mw * g * (this.w - wLim); this.vw = this.vw < -1 ? -0.12 * this.vw : 0; W.hit -= 0.5 * Mw * this.vw ** 2; this.w = wLim; }
    if (this.w + p.cwH > p.ceil) { W.hit += 0.5 * Mw * this.vw ** 2 + Mw * g * (this.w - (p.ceil - p.cwH)); this.vw = 0; this.w = p.ceil - p.cwH; }
    if (this.n > 0) { this.l1 -= dt * this.u; this.l2 += dt * this.u; if (this.l1 < 0.3) this.l1 = 0.3; if (this.l2 < 0.3) this.l2 = 0.3; }
    this.xr += dt * (n > 0 ? this.u : 0); this.t += dt; this.k++;
    if (Math.abs(this.v) > this.maxCarV) this.maxCarV = Math.abs(this.v);
    if (Math.abs(this.v) < 0.012 && (this.n === 0 || Math.abs(this.vw) < 0.02) && !this.run && Math.abs(this.a) < 0.6) this.quiet += dt; else this.quiet = 0;
  }
  hit(dir, yl) {
    const sp = Math.abs(this.v), M = this.M;
    if (sp > 0.25) { this.say("hit", { dir, v: sp }); this.hits.push({ dir, v: sp }); if (sp >= this.p.hardV && !this.out) { this.out = { dir, v: sp, t: this.t, floorLim: yl }; this.say("crash", { dir, v: sp }); } }
    this.W.hit += 0.5 * M * this.v ** 2 + M * this.p.g * (this.y - yl);
    this.v = sp > 1 ? -0.12 * this.v : 0; if (sp < 0.25) this.a = 0; this.W.hit -= 0.5 * M * this.v ** 2; this.y = yl;
  }
  advance(T) { const k = Math.round(T / this.dt); for (let i = 0; i < k; i++) this.step(); }
  settle(max = 60) { const t0 = this.t; while (this.t - t0 < max && !this.out && this.quiet < 0.7) this.step(); return this.out; }
  broken() { const b = []; for (let i = 0; i < this.p.ropes - this.n; i++) b.push("rope"); for (const k of PARTS) if (!this.ok[k]) b.push(k); return b; }
}
