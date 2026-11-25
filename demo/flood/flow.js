// Water on one street, on the CPU. Local inertial form of the shallow water equations
// (Bates, Horritt & Fewtrell 2010, with the flux smoothing of de Almeida et al. 2012). Volumes are exact:
// what leaves one cell enters the next one, drains and stairs count what they swallow.
export const G = 9.81;
export class Flow {
  constructor(nx, ny, dx, bed, open) { // bed: metres; open: 1 = water can be here
    this.nx = nx; this.ny = ny; this.dx = dx; this.z = Float32Array.from(bed); this.z0 = Float32Array.from(bed); this.open = Uint8Array.from(open); const n = nx * ny;
    this.h = new Float32Array(n); this.qx = new Float32Array(n); this.qy = new Float32Array(n); // face on +x / +y side, m2/s
    this.bx = new Uint8Array(n); this.by = new Uint8Array(n); // blocked faces
    this.manning = .016; this.theta = .85; this.rain = 0; this.rainAt = null; this.src = []; this.sinks = []; this.fixed = []; this.t = 0; this.in = 0; this.out = 0; this.edgeOut = 0;
  }
  reset() { this.act = null; this.lastSea = undefined; this.h.fill(0); this.qx.fill(0); this.qy.fill(0); this.t = 0; this.in = this.out = this.edgeOut = 0; for (const s of this.sinks) s.got = 0; }
  dt() { let m = .05; const { h, sea, act } = this; if (!act) return .05; for (let a = 0; a < this.na; a++) { const k = act[a]; if (h[k] > m && !(sea && sea[k])) m = h[k]; } return Math.min(.4, .6 * this.dx / Math.sqrt(G * m)); }
  // cells that can matter in the next few steps: wet ones, a margin round them, sources, and the edge of the sea
  scan() { const { nx, ny, h, open, sea } = this, n = h.length, M = this.mark || (this.mark = new Uint8Array(n)); if (!this.act) this.act = new Int32Array(n); M.fill(0); const R = 4;
    const put = k => { const i = k % nx, j = (k - i) / nx; for (let b = Math.max(0, j - R); b <= Math.min(ny - 1, j + R); b++) for (let a = Math.max(0, i - R); a <= Math.min(nx - 1, i + R); a++) M[b * nx + a] = 1; };
    for (let k = 0; k < n; k++) if (open[k] && h[k] > 5e-5 && !(sea && sea[k])) put(k); for (const s of this.src) if (s.q > 0) for (const k of s.cells) put(k);
    if (sea) { if (!this.shore) { this.shore = []; for (let k = 0; k < n; k++) if (sea[k] && ((k % nx && !sea[k - 1]) || (k % nx < nx - 1 && !sea[k + 1]) || (k >= nx && !sea[k - nx]) || (k < n - nx && !sea[k + nx]))) this.shore.push(k); } for (const k of this.shore) put(k); }
    let c = 0; for (let k = 0; k < n; k++) if (open[k] && (M[k] || this.rain > 0)) { if (sea && sea[k]) { let e = 0; const i = k % nx; if (i && !sea[k - 1] || i < nx - 1 && !sea[k + 1] || k >= nx && !sea[k - nx] || k < n - nx && !sea[k + nx]) e = 1; if (!e) continue; } this.act[c++] = k; } this.na = c; this.age = 0; }
  volume() { let s = 0; for (let k = 0; k < this.h.length; k++) if (this.open[k] && !(this.sea && this.sea[k])) s += this.h[k]; return s * this.dx * this.dx; }
  step(dt) {
    const { nx, ny, dx, z, h, qx, qy, open, bx, by, sea } = this, n2 = this.manning * this.manning, A = dx * dx, th = this.theta, t2 = (1 - th) * .5, c = dt / dx, n = h.length;
    if (!this.act || ++this.age > 3) { const old = this.act ? this.na : 0; for (let a = 0; a < old; a++) { const k = this.act[a]; if (h[k] < 5e-5) { qx[k] = qy[k] = 0; } } this.scan(); }
    const act = this.act, na = this.na, out = this.o_ || (this.o_ = new Float32Array(n).fill(1));
    if (sea && this.seaLevel !== this.lastSea) { for (let k = 0; k < n; k++) if (sea[k]) h[k] = Math.max(0, this.seaLevel - z[k]); this.lastSea = this.seaLevel; }
    for (let a = 0; a < na; a++) { const k = act[a], i = k % nx, hk = h[k];
      let b = k + 1; if (i < nx - 1 && open[b] && !bx[k] && (hk > 1e-4 || h[b] > 1e-4) && !(sea && sea[k] && sea[b])) { const ea = z[k] + hk, eb = z[b] + h[b], hf = (ea > eb ? ea : eb) - (z[k] > z[b] ? z[k] : z[b]); if (hf < 1e-4) qx[k] = 0; else { const q = qx[k], qm = th * q + t2 * ((i ? qx[k - 1] : 0) + (i < nx - 2 ? qx[b] : 0)), cr = Math.cbrt(hf); let r = (qm - G * hf * dt * (eb - ea) / dx) / (1 + G * dt * n2 * Math.abs(q) / (hf * hf * cr)); const L = 1.8 * hf * Math.sqrt(G * hf); qx[k] = r > L ? L : r < -L ? -L : r; } } else qx[k] = 0;
      b = k + nx; if (b < n && open[b] && !by[k] && (hk > 1e-4 || h[b] > 1e-4) && !(sea && sea[k] && sea[b])) { const ea = z[k] + hk, eb = z[b] + h[b], hf = (ea > eb ? ea : eb) - (z[k] > z[b] ? z[k] : z[b]); if (hf < 1e-4) qy[k] = 0; else { const q = qy[k], qm = th * q + t2 * ((k >= nx ? qy[k - nx] : 0) + (b + nx < n ? qy[b] : 0)), cr = Math.cbrt(hf); let r = (qm - G * hf * dt * (eb - ea) / dx) / (1 + G * dt * n2 * Math.abs(q) / (hf * hf * cr)); const L = 1.8 * hf * Math.sqrt(G * hf); qy[k] = r > L ? L : r < -L ? -L : r; } } else qy[k] = 0; }
    // never take more than a cell has
    for (let a = 0; a < na; a++) { const k = act[a]; if (sea && sea[k]) { out[k] = 1; continue; } let o = 0, v; if ((v = qx[k]) > 0) o += v; if ((v = qy[k]) > 0) o += v; if (k % nx && (v = qx[k - 1]) < 0) o -= v; if (k >= nx && (v = qy[k - nx]) < 0) o -= v; o *= c; out[k] = o > h[k] ? h[k] / o : 1; }
    for (let a = 0; a < na; a++) { const k = act[a]; if (qx[k]) qx[k] *= qx[k] > 0 ? out[k] : out[k + 1]; if (qy[k]) qy[k] *= qy[k] > 0 ? out[k] : out[k + nx]; }
    for (let a = 0; a < na; a++) { const k = act[a], net = (k % nx ? qx[k - 1] : 0) - qx[k] + (k >= nx ? qy[k - nx] : 0) - qy[k]; if (sea && sea[k]) { this.in -= net * c * A; continue; } h[k] += net * c; if (h[k] < 0) h[k] = 0; }
    if (this.rain > 0) for (let a = 0; a < na; a++) { const k = act[a]; if (!(sea && sea[k])) { h[k] += this.rain * dt; this.in += this.rain * dt * A; } }
    for (const s of this.src) if (s.q) { const d = s.q * dt / (s.cells.length * A); for (const k of s.cells) h[k] += d; this.in += s.q * dt; }
    for (const s of this.sinks) { if (!s.cap) continue; const want = s.cap * dt / s.cells.length; for (const k of s.cells) { const w = h[k] * A, t = w < want ? w : want; h[k] -= t / A; s.got = (s.got || 0) + t; this.out += t; } }
    this.t += dt;
  }
  run(T, cb) { const t1 = this.t + T; while (this.t < t1 - 1e-6) { this.step(Math.min(this.dt(), t1 - this.t)); cb && cb(this); } }
}
