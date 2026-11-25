// Everything that is drawn on the street: lights, road paint, walkers, the time they stood.
import * as E from "./engine.js";
import { drawCity, THEMES, tint, hasCity, PARK } from "./city.js";
const PAINT = { you: "#ffcf1f", nb: "#c9ced1", a: "#ffffff", b: "#8fd0f0", c: "#b9e08a", wait: "#ff6a1a" };
export { PAINT };
const FT = E.FT, MAP = { x0: -420, x1: 1330, y0: 230, y1: 1880 };
export const AVN = { 6: "6 AVE", 5: "5 AVE", Mad: "MADISON AVE", Park: "PARK AVE", Lex: "LEXINGTON AVE", 3: "3 AVE", 2: "2 AVE" };
export class Stage {
  constructor(cv) { this.cv = cv; this.ctx = cv.getContext("2d"); this.cam = { x: 600, y: 1000, k: 1 }; this.tgt = null; this.sim = null; this.theme = "light"; this.map = {}; this.goal = null; this.dirty = true; this.img = null; this.detail = null; this.tags = []; this.calm = matchMedia("(prefers-reduced-motion: reduce)").matches; }
  size() { const r = this.cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); if (r.width && (this.W !== r.width || this.H !== r.height || this.d !== d)) { this.W = r.width; this.H = r.height; this.d = d; this.cv.width = Math.round(r.width * d); this.cv.height = Math.round(r.height * d); this.detail = null; this.dirty = true; return true; } }
  X(x) { return this.W / 2 + (x - this.cam.x) * this.cam.k; }
  Y(y) { return this.H / 2 - (y - this.cam.y) * this.cam.k; }
  inv(px, py) { return { x: this.cam.x + (px - this.W / 2) / this.cam.k, y: this.cam.y - (py - this.H / 2) / this.cam.k }; }
  fit(b, pad) { const w = this.W - pad.l - pad.r, h = this.H - pad.t - pad.b; const k = Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0), pad.max || 9); return { k, x: (b.x0 + b.x1) / 2 + (pad.r - pad.l) / 2 / k, y: (b.y0 + b.y1) / 2 - (pad.b - pad.t) / 2 / k }; }
  look(c, snap) { this.tgt = c; if (snap || this.calm) { this.cam = { ...c }; } this.dirty = true; }
  async loadMap(url) { const im = new Image(); im.src = url; await im.decode(); this.img = im; this.mapCv = {}; this.dirty = true; }
  mapFor(th) {
    if (!this.img) return null; if (this.mapCv[th]) return this.mapCv[th];
    const c = document.createElement("canvas"); c.width = this.img.naturalWidth; c.height = this.img.naturalHeight; const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(this.img, 0, 0); tint(x, c.width, c.height, th); this.mapCv = { [th]: c }; return c;
  }
  // a sharp picture of one place, drawn from the vectors (used when the camera is close)
  sharp() {
    const { x, y, k } = this.cam; if (k < 1.6 || !hasCity()) return; const d = this.d, W = this.cv.width, H = this.cv.height;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    drawCity(c.getContext("2d"), { W, H, k: k * d, X: v => W / 2 + (v - x) * k * d, Y: v => H / 2 - (v - y) * k * d, x0: x - W / 2 / k / d, x1: x + W / 2 / k / d, y0: y - H / 2 / k / d, y1: y + H / 2 / k / d }, this.theme);
    this.detail = { c, x, y, k, theme: this.theme };
  }
  frame(dt) {
    if (this.tgt) { const c = this.cam, g = this.tgt, f = 1 - Math.exp(-dt * 6); c.x += (g.x - c.x) * f; c.y += (g.y - c.y) * f; c.k *= Math.pow(g.k / c.k, f); if (Math.abs(g.x - c.x) * c.k < .3 && Math.abs(g.y - c.y) * c.k < .3 && Math.abs(g.k / c.k - 1) < .002) { this.cam = { ...g }; this.tgt = null; } this.dirty = true; }
    if (!this.dirty) return; this.dirty = false;
    const D = this.detail, still = !this.tgt;
    if (still && this.cam.k >= 1.6 && !(D && D.theme === this.theme && D.x === this.cam.x && D.y === this.cam.y && D.k === this.cam.k)) this.sharp();
    this.paint(this.ctx, this.d);
  }
  paint(ctx, d) {
    const T = THEMES[this.theme], { W, H, cam } = this, k = cam.k;
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.imageSmoothingQuality = "high"; ctx.globalAlpha = 1;
    ctx.fillStyle = T.walk; ctx.fillRect(0, 0, W, H);
    const m = this.mapFor(this.theme);
    if (m) { ctx.drawImage(m, this.X(MAP.x0), this.Y(MAP.y1), (MAP.x1 - MAP.x0) * k, (MAP.y1 - MAP.y0) * k); }
    const D = this.detail; if (D && D.theme === this.theme) { const z = k / D.k, w = W * z, h = H * z; ctx.drawImage(D.c, this.X(D.x) - w / 2, this.Y(D.y) - h / 2, w, h); }
    else if (!m) { ctx.fillStyle = T.asphalt; ctx.fillRect(0, 0, W, H); }
    this.mall(ctx); this.cars(ctx); this.veil(ctx); this.zebra(ctx); this.letters(ctx);
    if (this.sim) { for (const a of this.sim.actors) this.trail(ctx, a); if (this.goal) this.flag(ctx); for (const a of this.sim.actors) this.spots(ctx, a); if (this.ask) this.hand(ctx); const L = [...this.sim.actors].sort((a, b) => (a.z || 0) - (b.z || 0)); for (const a of L) this.person(ctx, a); }
    if (this.extra) this.extra(ctx, this);
  }
  each(f) { const P = 60 / this.cam.k + 30, x0 = this.inv(0, 0).x - P, x1 = this.inv(this.W, 0).x + P, y0 = this.inv(0, this.H).y - P, y1 = this.inv(0, 0).y + P; for (let a = 0; a < E.AVE.length; a++) { if (E.AVE[a].x < x0 || E.AVE[a].x > x1) continue; for (let s = 0; s < E.ST.length; s++) { if (E.ST[s].y < y0 || E.ST[s].y > y1) continue; f(a, s); } } }
  veil(ctx) {        // what the walk does not touch steps back
    const v = this.focus; if (!v) return; const x0 = this.X(v.x0), x1 = this.X(v.x1), y0 = this.Y(v.y1), y1 = this.Y(v.y0); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, this.W, this.H); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 4); ctx.clip("evenodd"); ctx.fillStyle = this.theme === "dark" ? "rgba(14,16,17,.6)" : "rgba(205,209,208,.62)"; ctx.fillRect(0, 0, this.W, this.H); ctx.restore();
  }
  mall(ctx) { ctx.fillStyle = this.theme === "dark" ? "rgba(40,58,42,.55)" : "rgba(120,148,98,.36)"; ctx.fillRect(this.X(PARK.x0), this.Y(PARK.y1), (PARK.x1 - PARK.x0) * this.cam.k, (PARK.y1 - PARK.y0) * this.cam.k); const a = E.AVE[3], k = this.cam.k, w = 6.4; ctx.fillStyle = this.theme === "dark" ? "#26302a" : "#8f9d88"; for (let s = 0; s + 1 < E.ST.length; s++) { const y0 = E.ST[s].y + E.ST[s].w * FT / 2 + 4, y1 = E.ST[s + 1].y - E.ST[s + 1].w * FT / 2 - 4; ctx.fillRect(this.X(a.x - w / 2), this.Y(y1), w * k, (y1 - y0) * k); } }
  zebra(ctx) {
    const w = this.sim ? this.sim.w : this.idle; if (!w) return; const t = this.sim ? this.sim.t : 0, k = this.cam.k, blink = Math.floor(performance.now() / 400) % 2;
    const off = this.theme === "dark" ? "rgba(255,255,255,.17)" : "rgba(255,255,255,.22)";
    this.each((a, s) => {
      if (a === 0 && s === 14) return; const F = this.focus; if (F && (E.AVE[a].x < F.x0 || E.AVE[a].x > F.x1 || E.ST[s].y < F.y0 || E.ST[s].y > F.y1)) return;
      const A = E.AVE[a], S = E.ST[s], hx = A.w * FT / 2, hy = S.w * FT / 2, cw = 4.2, gap = 1.1;
      for (const d of ["N", "E"]) {
        const L = E.light(w, a, s, d, t); ctx.fillStyle = L.st === "walk" ? "#fff" : L.st === "flash" ? (blink || this.calm ? "rgba(255,255,255,.55)" : off) : off;
        const len = d === "N" ? 2 * hy : 2 * hx, n = Math.max(3, Math.round(len / (k > 2 ? 1.25 : k > .9 ? 2.1 : 3.2))), st = len / n;
        for (const side of [-1, 1]) for (let i = 0; i < n; i++) {
          const u = -len / 2 + (i + .22) * st, th = st * .56;
          if (d === "N") { if (A.id === "Park" && 0) continue; ctx.fillRect(this.X(A.x + side * (hx + gap + cw / 2) - cw / 2 - (side > 0 ? 0 : 0)), this.Y(S.y + u + th), cw * k, th * k); }
          else ctx.fillRect(this.X(A.x + u), this.Y(S.y + side * (hy + gap + cw / 2) + cw / 2), th * k, cw * k);
        }
      }
    });
  }
  cars(ctx) {
    const w = this.sim ? this.sim.w : this.idle; if (!w || this.cam.k < .5) return; const t = this.sim ? this.sim.t : 0, k = this.cam.k, V = E.SIG.waveMph * 5280 / 3600 * FT, y0 = Math.max(MAP.y0, this.inv(0, this.H).y - 20), y1 = Math.min(MAP.y1, this.inv(0, 0).y + 20), C = w.C;
    const blur = Math.min(26, Math.abs(this.rate || 0) * V / 60 * .7);
    for (let a = 0; a < E.AVE.length; a++) {
      const A = E.AVE[a]; if (!A.d) continue; if (this.X(A.x) < -60 || this.X(A.x) > this.W + 60) continue;
      const base = w.base[a], yr = E.ST[0].y;
      for (let j = 0; j < 15; j++) {
        const ph = 1.5 + j * 2.05 + ((j * 37) % 10) / 14; const lane = ((j * 7 + a * 3) % 4) - 1.5; // phase of this car, constant
        // y with (t - base - d*(y-yr)/V) = ph + n*C
        const n0 = Math.floor((t - base - ph - A.d * (y0 - yr) / V) / C), n1 = Math.floor((t - base - ph - A.d * (y1 - yr) / V) / C);
        for (let n = Math.min(n0, n1) - 1; n <= Math.max(n0, n1) + 1; n++) {
          const y = yr + A.d * V * (t - base - ph - n * C); if (y < y0 || y > y1 || this.focus && (y < this.focus.y0 || y > this.focus.y1 || A.x < this.focus.x0 || A.x > this.focus.x1)) continue;
          const x = A.x + lane * A.w * FT / 4.6, l = 4.6 + blur; ctx.fillStyle = ["#8d9498", "#6f777c", "#a9afb2", "#5d656a"][(j * 5 + n) & 3]; ctx.globalAlpha = blur > 2 ? .5 : .9;
          ctx.beginPath(); ctx.roundRect(this.X(x - 1), this.Y(y + l / 2), Math.max(1.6, 2 * k), Math.max(3, l * k), Math.min(3, .6 * k)); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  }
  letters(ctx) {
    const k = this.cam.k, b = this.names; if (!b) return; ctx.save(); ctx.fillStyle = "rgba(255,255,255,.62)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const n of b) {
      ctx.save(); ctx.translate(this.X(n.x), this.Y(n.y)); if (n.v) ctx.rotate(-Math.PI / 2);
      const h = Math.max(n.min || 11, Math.min(n.max || 30, n.h * k)); ctx.font = `600 ${h}px Sofia, "Arial Narrow", sans-serif`; try { ctx.letterSpacing = h * .12 + "px"; } catch { }
      ctx.lineWidth = 3; ctx.strokeStyle = THEMES[this.theme].asphalt; ctx.scale(n.v ? 1.25 : 1, 1); ctx.strokeText(n.s, 0, 0); ctx.fillText(n.s, 0, 0); ctx.restore();
    }
    ctx.restore();
  }
  trail(ctx, a) {
    if (a.hide) return; const P = [...a.path]; if (a.mode === "move") P.push(this.sim.at(a)); if (P.length < 2) return; const o = (a.lane || 0);
    ctx.lineJoin = ctx.lineCap = "round"; const line = () => { ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(this.X(p.x) + o, this.Y(p.y) + o) : ctx.moveTo(this.X(p.x) + o, this.Y(p.y) + o)); };
    const lw = a.thick || 4; line(); ctx.strokeStyle = "rgba(10,12,14,.55)"; ctx.lineWidth = lw + 3; ctx.stroke(); line(); ctx.strokeStyle = a.color; ctx.lineWidth = lw; if (a.dash) ctx.setLineDash(a.dash); ctx.stroke(); ctx.setLineDash([]);
  }
  spots(ctx, a) {
    if (a.hide) return; const c = this.spot || 2.1, o = a.lane || 0;
    for (const q of a.stops) {
      const s = Math.max(0, Math.min(this.sim.t, q.t1) - q.t0); if (s < .4) continue; const r = Math.max(2.5, c * Math.sqrt(s)), x = this.X(q.x) + o + (a.spotX || 0) * (r + 7), y = this.Y(q.y) + o;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = PAINT.wait; ctx.globalAlpha = .93; ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 1.5; ctx.strokeStyle = a.color; ctx.stroke();
      if (!this.plain && r > 8.5 && s >= 1) { ctx.fillStyle = "#1a0d05"; ctx.font = `700 ${Math.min(17, Math.max(11, r * .95))}px Sofia, "Arial Narrow", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(Math.round(s), x, y + .5); }
    }
  }
  man(ctx, x, y, s, color, ph, face, wave) {      // the walking figure, side view, like road paint
    const L = []; const sw = Math.sin(ph), cw = Math.cos(ph), f = face || 1; const leg = .5 * sw, arm = .42 * sw;
    const hip = [0, -.46], sh = [.03 * f, -.80], head = [.06 * f, -.97];
    const knee = (q, fwd) => [hip[0] + f * q * .30 + f * fwd * .05, hip[1] + .24]; const foot = (q, fwd) => [hip[0] + f * q * .58, hip[1] + .46 - fwd * .06];
    L.push([hip, knee(leg, 1), foot(leg, Math.max(0, cw) * 1)]); L.push([hip, knee(-leg, 1), foot(-leg, Math.max(0, -cw) * 1)]); L.push([hip, sh]);
    const hand = q => [sh[0] + f * q * .42 + .04 * f, sh[1] + .30], el = q => [sh[0] + f * q * .16 - .03 * f, sh[1] + .18];
    if (wave) { const u = Math.sin(wave * 6) * .1; L.push([sh, [sh[0] + .18, sh[1] - .08], [sh[0] + .26 + u, sh[1] - .34]]); } else L.push([sh, el(-arm), hand(-arm)]); L.push([sh, el(arm), hand(arm)]);
    const go = (lw, col) => { ctx.strokeStyle = ctx.fillStyle = col; ctx.lineCap = ctx.lineJoin = "round"; L.forEach((l, i) => { ctx.lineWidth = lw(i === 2 ? .2 : i < 2 ? .125 : .095); ctx.beginPath(); l.forEach((p, j) => j ? ctx.lineTo(x + p[0] * s, y + p[1] * s) : ctx.moveTo(x + p[0] * s, y + p[1] * s)); ctx.stroke(); }); ctx.beginPath(); ctx.arc(x + head[0] * s, y + head[1] * s, lw(.2) / 2, 0, 7); ctx.fill(); };
    go(v => v * s + 4.5, "rgba(12,14,16,.9)"); go(v => v * s, color);
  }
  person(ctx, a) {
    if (a.hide) return; const p = this.sim.at(a), s = Math.max(this.W > 600 ? 38 : 32, Math.min(46, 9 * this.cam.k)), x = this.X(p.x) + (a.lane || 0) + (a.mode === "move" ? 0 : a.mode === "done" ? (a.doneAt ?? a.stand ?? 0) : (a.stand || 0)), y = this.Y(p.y) + (a.lane || 0) + 4;
    const mv = a.mode === "move"; a.face = mv && Math.abs(a.B.x - a.A.x) > .5 ? Math.sign(a.B.x - a.A.x) : a.face || 1; const ph = mv ? performance.now() / 1000 * 11 : 0;
    this.man(ctx, x, y + s * .02, s, a.color, mv ? ph : .5, a.face, a.mode === "done" && a.cheer ? performance.now() / 1000 : 0);
    if (a.badge && a.mode !== "done") { ctx.font = `700 13px Sofia, "PingFang SC", "Noto Sans SC", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const w = Math.max(18, ctx.measureText(a.badge).width + 10), by = y + 15; ctx.fillStyle = "rgba(12,14,16,.92)"; ctx.beginPath(); ctx.roundRect(x - w / 2, by - 10, w, 20, 3); ctx.fill(); ctx.fillStyle = a.color; ctx.fillText(a.badge, x, by + 1); }
  }
  flag(ctx) {
    const g = this.goal, x = this.X(g.x), y = this.Y(g.y), T = performance.now() / 1000, r = 13 + (this.calm ? 0 : 3 * Math.sin(T * 3)); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(12,14,16,.8)"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
    if (g.friend) this.man(ctx, x + 2, y + 6, Math.max(this.W > 600 ? 38 : 32, Math.min(46, 9 * this.cam.k)), "#fff", 0, -1, this.calm ? .2 : T);
    if (g.label) { ctx.font = `600 14px Sofia, "PingFang SC", "Noto Sans SC", sans-serif`; ctx.textAlign = g.al || "center"; ctx.textBaseline = "middle"; const w = ctx.measureText(g.label).width + 14, bx = g.al === "right" ? x - 22 - w : g.al === "left" ? x + 22 : x - w / 2, by = g.al === "center" || !g.al ? y - (g.friend ? 64 : 34) : y; ctx.fillStyle = "rgba(12,14,16,.92)"; ctx.beginPath(); ctx.roundRect(bx, by - 12, w, 24, 3); ctx.fill(); ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.fillText(g.label, bx + 7, by + 1); }
  }
  handIcon(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = "#101214"; ctx.beginPath(); ctx.roundRect(-.62, -.66, 1.24, 1.32, .16); ctx.fill(); ctx.strokeStyle = ctx.fillStyle = PAINT.wait; ctx.lineCap = "round"; ctx.lineWidth = .15; for (const [u, v] of [[-.24, -.36], [-.07, -.46], [.1, -.42], [.26, -.28]]) { ctx.beginPath(); ctx.moveTo(u * .9, .1); ctx.lineTo(u, v); ctx.stroke(); } ctx.beginPath(); ctx.roundRect(-.3, -.02, .62, .42, .16); ctx.fill(); ctx.beginPath(); ctx.moveTo(-.24, .22); ctx.lineTo(-.43, .0); ctx.stroke(); ctx.restore(); }
  hand(ctx) {
    const k = this.ask, A = E.pos(k.a.p), w = this.sim.w; const tgt = d => { const m = E.move(w, k.a.p, d), B = E.pos(m.to); return { A, B, m }; };
    const M = tgt(k.main), O = tgt(k.other); const mx = (M.A.x + M.B.x) / 2, my = (M.A.y + M.B.y) / 2; const hs = Math.max(14, Math.min(19, 5 * this.cam.k)), vx = Math.sign(M.B.x - M.A.x), vy = -Math.sign(M.B.y - M.A.y); this.handIcon(ctx, this.X(M.A.x) + vx * (hs + 34), this.Y(M.A.y) + vy * (hs * .9 + 50), hs);
    // the open way: a road-paint arrow
    const ex = O.m.cross ? O.B.x : O.A.x + Math.sign(O.B.x - O.A.x) * Math.min(Math.abs(O.B.x - O.A.x), 60 / this.cam.k), ey = O.m.cross ? O.B.y : O.A.y + Math.sign(O.B.y - O.A.y) * Math.min(Math.abs(O.B.y - O.A.y), 60 / this.cam.k);
    const ux = Math.sign(O.B.x - O.A.x), uy = -Math.sign(O.B.y - O.A.y), x0 = this.X(A.x) + ux * 14, y0 = this.Y(A.y) + uy * 14, x1 = this.X(ex) - ux * 2, y1 = this.Y(ey) - uy * 2, T = this.calm ? 0 : (performance.now() / 700) % 1;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; for (const [lw, c] of [[9, "rgba(12,14,16,.7)"], [5, "#ffcf1f"]]) { ctx.lineWidth = lw; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.moveTo(x1 - ux * 9 - uy * 8, y1 - uy * 9 - ux * 8); ctx.lineTo(x1, y1); ctx.lineTo(x1 - ux * 9 + uy * 8, y1 - uy * 9 + ux * 8); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * T, y0 + (y1 - y0) * T, 4, 0, 7); ctx.fillStyle = "#fff"; ctx.fill();
    this.hot = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, rx: Math.abs(x1 - x0) / 2 + 26, ry: Math.abs(y1 - y0) / 2 + 26, wx: this.X(mx), wy: this.Y(my) };
  }
}
