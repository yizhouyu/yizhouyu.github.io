// Damage = a list of operations in card units (0..1 across the paper, white margin included).
// The same list can be replayed on any print of the code (other toughness, share link, small copies).
export const QUIET = 4;
const TAU = Math.PI * 2, Q = 1024, q = v => Math.round(v * Q) / Q;
export const rng = s => () => { s |= 0; s = s + 0x6d2b79f5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export const quant = q;
export const INK = "#161817", PAPER = "#f7f7f3";
export const SCRATCH_W = .019;

function blob(r, seed, x, y, rough, k = 44) { // irregular closed outline
  const R = rng(seed), ph = [R() * TAU, R() * TAU, R() * TAU, R() * TAU], pts = [];
  for (let i = 0; i < k; i++) { const a = i / k * TAU, m = 1 + rough * (.5 * Math.sin(2 * a + ph[0]) + .3 * Math.sin(3 * a + ph[1]) + .22 * Math.sin(5 * a + ph[2]) + .16 * Math.sin(9 * a + ph[3])); pts.push([x + Math.cos(a) * r * m, y + Math.sin(a) * r * m]); }
  return pts;
}
export function path(c, pts) { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); }
export function coffeeShapes(o) {
  const R = rng(o.seed), list = [blob(o.r, o.seed, o.x, o.y, .16)];
  for (let i = 0; i < 9; i++) { const a = R() * TAU, d = o.r * (1.15 + R() * .9), r = o.r * (.03 + R() * .1); list.push(blob(r, o.seed + i + 1, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, .12, 18)); }
  return list;
}
export function halfPlane(o) { // the smaller part that a straight cut removes from the unit square
  const nx = o.y1 - o.y2, ny = o.x2 - o.x1, side = p => (p[0] - o.x1) * nx + (p[1] - o.y1) * ny;
  const sq = [[0, 0], [1, 0], [1, 1], [0, 1]], clip = s => { const out = [];
    sq.forEach((a, i) => { const b = sq[(i + 1) % 4], da = side(a) * s, db = side(b) * s; if (da >= 0) out.push(a); if (da * db < 0) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }); return out; };
  const area = P => Math.abs(P.reduce((s, p, i) => { const w = P[(i + 1) % P.length]; return s + p[0] * w[1] - w[0] * p[1]; }, 0)) / 2;
  const A = clip(1), B = clip(-1); return area(A) <= area(B) ? A : B;
}

export class Print { // one printed copy drawn on a canvas. kind: look | probe | touch
  constructor(kind, canvas, probe) { this.kind = kind; this.canvas = canvas; this.ctx = canvas.getContext("2d", { willReadFrequently: kind !== "look" }); this.probe = probe; }
  setCode(code, mpx, margin = 0) { // mpx = pixels per square, margin = extra squares of table around the paper
    this.code = code; this.mpx = mpx; this.margin = margin * mpx; this.side = (code.n + QUIET * 2) * mpx;
    this.canvas.width = this.canvas.height = this.side + 2 * this.margin; return this;
  }
  base() {
    const { ctx: c, code, mpx, margin: m, side } = this, n = code.n;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.kind !== "touch") {
      c.fillStyle = PAPER; c.fillRect(m, m, side, side); c.fillStyle = INK;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (code.modules[y * n + x]) { let w = 1; while (x + w < n && code.modules[y * n + x + w]) w++; c.fillRect(m + (x + QUIET) * mpx, m + (y + QUIET) * mpx, w * mpx, mpx); x += w; }
    }
  }
  replay(ops) { this.base(); for (const o of ops) this.apply(o); }
  apply(o, from = 0) {
    const c = this.ctx; c.save(); c.setTransform(this.side, 0, 0, this.side, this.margin, this.margin); c.beginPath(); c.rect(0, 0, 1, 1); c.clip();
    if (this.kind === "touch") this.touch(c, o, from); else this[o.k](c, o, from);
    c.restore();
  }
  touch(c, o, from) {
    c.fillStyle = c.strokeStyle = "#000"; c.lineCap = "round";
    const m = 1 / (this.code.n + 2 * QUIET);
    if (o.k === "s") { c.lineWidth = SCRATCH_W; c.beginPath(); const i0 = Math.max(0, from - 1); c.moveTo(...o.p[i0]); for (let i = i0; i < o.p.length; i++) c.lineTo(...o.p[i]); c.stroke(); }
    if (o.k === "b") for (let i = from; i < o.p.length; i++) { c.beginPath(); c.arc(o.p[i][0], o.p[i][1], o.p[i][2] * 1.25, 0, TAU); c.fill(); }
    if (o.k === "c") coffeeShapes(o).forEach(s => { path(c, s); c.fill(); });
    if (o.k === "l") { if (o.logo) c.fillRect(o.x - o.r, o.y - o.r, 2 * o.r, 2 * o.r); else { c.beginPath(); c.arc(o.x, o.y, o.r, 0, TAU); c.fill(); } }
    if (o.k === "x") { path(c, halfPlane(o)); c.fill(); }
    if (o.k === "d") { const [i, j] = this.cell(o); c.fillRect((i + QUIET) * m, (j + QUIET) * m, m, m); }
  }
  cell(o) { const k = this.code.n + 2 * QUIET; return [Math.floor(o.x * k) - QUIET, Math.floor(o.y * k) - QUIET]; }
  // scratch: a coin takes the ink off; on bare paper it changes (almost) nothing
  s(c, o, from) {
    c.globalCompositeOperation = "source-atop"; c.lineCap = "round";
    if (o.p.length === 1 || from === 0) { c.fillStyle = "#f4f3ee"; c.beginPath(); c.arc(o.p[0][0], o.p[0][1], SCRATCH_W * .33, 0, TAU); c.fill(); }
    for (let i = Math.max(1, from); i < o.p.length; i++) {
      const [x0, y0] = o.p[i - 1], [x1, y1] = o.p[i], d = Math.hypot(x1 - x0, y1 - y0); if (!d) continue;
      const nx = -(y1 - y0) / d, ny = (x1 - x0) / d, R = rng(o.seed + i * 7919);
      const line = (off, w, col, jit = 0) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0 + nx * off, y0 + ny * off); c.lineTo(x1 + nx * (off + jit), y1 + ny * (off + jit)); c.stroke(); };
      line(0, SCRATCH_W * .62, "#f4f3ee");
      for (let f = -3; f <= 3; f++) { const off = f / 3 * SCRATCH_W * .5 + (R() - .5) * .0016; if (R() < .86) line(off, .0016 + R() * .0032, "#f4f3ee", (R() - .5) * .002); }
      if (this.kind === "look") for (let f = 0; f < 3; f++) line((R() - .5) * SCRATCH_W * .9, .0009, R() < .5 ? "rgba(120,108,90,.34)" : "rgba(255,255,255,.9)", (R() - .5) * .002);
    }
  }
  // burn: scorch, char, hole
  b(c, o, from) {
    for (let i = from; i < o.p.length; i++) { const [x, y, r] = o.p[i], sd = o.seed + i * 131;
      c.globalCompositeOperation = "source-atop";
      const g = c.createRadialGradient(x, y, r * .8, x, y, r * 2); g.addColorStop(0, "rgba(58,30,12,.30)"); g.addColorStop(1, "rgba(110,64,24,0)"); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2, 0, TAU); c.fill();
      c.fillStyle = "#15100d"; path(c, blob(r * 1.22, sd, x, y, .16)); c.fill();
      if (r > .017) { c.globalCompositeOperation = "destination-out"; path(c, blob(r * .86, sd + 7, x, y, .2)); c.fill(); }
    }
  }
  // coffee: see-through stain with a darker dried rim; it multiplies what is under it, and only where there is paper
  c(c, o) {
    const t = document.createElement("canvas"); t.width = t.height = this.canvas.width; const k = t.getContext("2d"); k.setTransform(this.side, 0, 0, this.side, this.margin, this.margin);
    const S = coffeeShapes(o);
    k.lineJoin = "round"; for (const [w, a] of [[.012, .06], [.007, .1], [.003, .18]]) S.forEach((s, i) => { path(k, s); k.strokeStyle = `rgba(120,78,38,${a})`; k.lineWidth = i ? w * .4 : w; k.stroke(); });
    S.forEach((s, i) => { path(k, s); k.save(); k.clip(); k.globalCompositeOperation = "source-over"; const g = k.createRadialGradient(o.x - o.r * .25, o.y - o.r * .3, o.r * .1, o.x, o.y, o.r * 1.22); g.addColorStop(0, "#e7d5ba"); g.addColorStop(.55, "#dcc3a0"); g.addColorStop(.86, "#cda97c"); g.addColorStop(1, "#b98c58"); k.fillStyle = i ? "#d0ad82" : g; k.fill(); k.restore(); });
    for (const [w, a] of [[.03, .07], [.02, .1], [.012, .16], [.0065, .34], [.003, .5]]) S.forEach((s, i) => { k.save(); path(k, s); k.clip(); k.strokeStyle = `rgba(84,44,14,${a})`; k.lineWidth = i ? w * .35 : w; path(k, s); k.stroke(); k.restore(); });
    { const R = rng(o.seed + 99), list = S[0]; k.save(); path(k, list); k.clip(); for (let i = 0; i < 60; i++) { const a = R() * TAU, d = Math.sqrt(R()) * o.r, r = o.r * (.02 + R() * .12); k.fillStyle = R() < .6 ? "rgba(120,76,34,.055)" : "rgba(255,244,224,.09)"; path(k, blob(r, o.seed + 300 + i, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, .25, 14)); k.fill(); } k.restore(); }
    k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = "destination-in"; k.drawImage(this.canvas, 0, 0);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "multiply"; c.drawImage(t, 0, 0);
  }
  // sticker / logo
  l(c, o) { drawSticker(c, o, this.kind === "look"); }
  // cut
  x(c, o) { c.globalCompositeOperation = "destination-out"; path(c, halfPlane(o)); c.fillStyle = "#000"; c.fill(); }
  // dot: one square painted the wrong colour
  d(c, o) { const n = this.code.n, [i, j] = this.cell(o); if (i < 0 || j < 0 || i >= n || j >= n) return; const m = 1 / (n + 2 * QUIET);
    c.globalCompositeOperation = "source-atop"; const x = (i + QUIET) * m, y = (j + QUIET) * m;
    c.fillStyle = this.code.modules[j * n + i] ? "#f4f3ee" : "#161817"; c.fillRect(x, y, m, m); }
  gray(table = 190) { // what a camera gets: grey values, the grey mount showing through where paper is gone
    const w = this.canvas.width, d = this.ctx.getImageData(0, 0, w, w).data, g = new Uint8Array(w * w);
    for (let i = 0, j = 0; i < g.length; i++, j += 4) { const a = d[j + 3] / 255; g[i] = (d[j] * .299 + d[j + 1] * .587 + d[j + 2] * .114) * a + table * (1 - a); }
    return g;
  }
  touchedShare() { // share of the code (without the white margin) that has been touched
    const w = this.canvas.width, a = QUIET * this.mpx, s = this.code.n * this.mpx, d = this.ctx.getImageData(a, a, s, s).data; let k = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 127) k++; return k / (s * s);
  }
}
export function drawSticker(c, o, shadow) {
  const { x, y, r } = o; c.globalCompositeOperation = "source-over";
  if (shadow) { c.fillStyle = "rgba(20,16,10,.28)"; if (o.logo) c.fillRect(x - r + r * .03, y - r + r * .05, 2 * r, 2 * r); else { c.beginPath(); c.arc(x + r * .02, y + r * .045, r, 0, TAU); c.fill(); } }
  if (o.logo) { // the visitor's own picture on a white square
    c.fillStyle = "#fff"; c.fillRect(x - r, y - r, 2 * r, 2 * r);
    const im = o.img, w = r * 1.76; if (im) { const f = Math.min(w / im.width, w / im.height); c.imageSmoothingQuality = "high"; c.drawImage(im, x - im.width * f / 2, y - im.height * f / 2, im.width * f, im.height * f); }
    
    return;
  }
  c.fillStyle = "#fdfdfb"; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.strokeStyle = "rgba(22,24,23,.16)"; c.lineWidth = Math.max(.0012, r * .012); c.beginPath(); c.arc(x, y, r * .9, 0, TAU); c.stroke();
}
/* ---- link format ---- */
const KINDS = "sbclxd";
export function packOps(ops) {
  const b = [], u16 = v => { const k = Math.max(0, Math.min(65535, Math.round((v + 1) * Q))); b.push(k >> 8, k & 255); };
  for (const o of ops) {
    b.push(KINDS.indexOf(o.k));
    if (o.k === "s") { b.push(o.seed >> 8 & 255, o.seed & 255, o.p.length >> 8, o.p.length & 255); let px = 0, py = 0; o.p.forEach(([x, y], i) => { if (!i) { u16(x); u16(y); } else { b.push((Math.round((x - px) * Q) + 128) & 255, (Math.round((y - py) * Q) + 128) & 255); } px = x; py = y; }); }
    if (o.k === "b") { b.push(o.seed >> 8 & 255, o.seed & 255, o.p.length >> 8, o.p.length & 255); o.p.forEach(p => p.forEach(u16)); }
    if (o.k === "c") { b.push(o.seed >> 8 & 255, o.seed & 255); u16(o.x); u16(o.y); u16(o.r); }
    if (o.k === "l") { b.push(o.logo ? 1 : 0); u16(o.x); u16(o.y); u16(o.r); }
    if (o.k === "x") [o.x1, o.y1, o.x2, o.y2].forEach(u16);
    if (o.k === "d") { u16(o.x); u16(o.y); }
  }
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function unpackOps(s) {
  const b = Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)), ops = []; let i = 0;
  const u8 = () => { if (i >= b.length) throw 0; return b[i++]; }, u16 = () => (u8() << 8 | u8()) / Q - 1, w = () => u8() << 8 | u8();
  while (i < b.length && ops.length < 800) { const k = KINDS[u8()];
    if (k === "s") { const o = { k, seed: w(), p: [] }, n = w(); for (let j = 0; j < n; j++) { if (!j) o.p.push([u16(), u16()]); else { const a = o.p[j - 1]; o.p.push([a[0] + (u8() - 128) / Q, a[1] + (u8() - 128) / Q]); } } if (n) ops.push(o); }
    else if (k === "b") { const o = { k, seed: w(), p: [] }, n = w(); for (let j = 0; j < n; j++) o.p.push([u16(), u16(), u16()]); if (n) ops.push(o); }
    else if (k === "c") ops.push({ k, seed: w(), x: u16(), y: u16(), r: u16() });
    else if (k === "l") ops.push({ k, logo: u8() === 1, x: u16(), y: u16(), r: u16() });
    else if (k === "x") ops.push({ k, x1: u16(), y1: u16(), x2: u16(), y2: u16() });
    else if (k === "d") ops.push({ k, x: u16(), y: u16() });
    else throw 0;
  }
  return ops;
}
export const strPack = s => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const strUnpack = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));
