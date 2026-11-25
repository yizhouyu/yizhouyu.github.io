// Small geometry kit on top of three: one merged mesh per material, live ropes, painted textures.
import * as T from "./vendor/three.module.min.js";
export { T };
const tmp = new T.Matrix4();
export const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(sx, sy, sz));

export class Build {
  constructor() { this.map = new Map(); this.base = new T.Matrix4(); }
  add(geo, mat, m) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(m ? tmp.multiplyMatrices(this.base, m) : this.base);
    if (!this.map.has(mat)) this.map.set(mat, []); this.map.get(mat).push(g); return this;
  }
  // box given by its min corner and size
  box(mat, x, y, z, w, h, d, bev = 0) { return this.add(bev ? bevel(w, h, d, bev) : new T.BoxGeometry(w, h, d), mat, M4(x + w / 2, y + h / 2, z + d / 2)); }
  cyl(mat, x, y, z, r, len, axis = "y", r2 = r, seg = 28) { const g = new T.CylinderGeometry(r2, r, len, seg); return this.add(g, mat, M4(x, y, z, axis === "z" ? Math.PI / 2 : 0, 0, axis === "x" ? -Math.PI / 2 : 0)); }
  ball(mat, x, y, z, r, seg = 20) { return this.add(new T.SphereGeometry(r, seg, seg * .6 | 0), mat, M4(x, y, z)); }
  lathe(mat, pts, x = 0, y = 0, z = 0, axis = "y", seg = 40) { return this.add(new T.LatheGeometry(pts.map(p => new T.Vector2(...p)), seg), mat, M4(x, y, z, axis === "z" ? Math.PI / 2 : 0, 0, axis === "x" ? -Math.PI / 2 : 0)); }
  rod(mat, a, b, r, seg = 10) { const A = new T.Vector3(...a), B = new T.Vector3(...b), d = B.clone().sub(A), L = d.length(), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); return this.add(new T.CylinderGeometry(r, r, L, seg), mat, new T.Matrix4().compose(A.add(B).multiplyScalar(.5), q, new T.Vector3(1, 1, 1))); }
  tube(mat, pts, r, seg = 24, rad = 8) { return this.add(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), seg, r, rad), mat, null); }
  extrude(mat, shape, depth, m, bev = 0) { return this.add(new T.ExtrudeGeometry(shape, { depth, bevelEnabled: bev > 0, bevelSize: bev, bevelThickness: bev, bevelSegments: 1, curveSegments: 24 }), mat, m); }
  done(parent, { cast = true, receive = true } = {}) {
    const g = new T.Group();
    for (const [mat, list] of this.map) { const m = new T.Mesh(merge(list), mat); m.castShadow = cast && !mat.userData.noCast; m.receiveShadow = receive; g.add(m); }
    if (parent) parent.add(g); this.map.clear(); return g;
  }
}
function merge(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
  for (const g of list) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
  const r = new T.BufferGeometry(); r.setAttribute("position", new T.BufferAttribute(P, 3)); r.setAttribute("normal", new T.BufferAttribute(N, 3)); r.setAttribute("uv", new T.BufferAttribute(U, 2)); return r;
}
export function bevel(w, h, d, b) {
  const s = new T.Shape(), x = w / 2 - b, y = h / 2 - b; s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y);
  const g = new T.ExtrudeGeometry(s, { depth: Math.max(.001, d - 2 * b), bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 2 }); g.translate(0, 0, -(d - 2 * b) / 2); return g;
}
export function ring(R, r, a0 = 0, a1 = Math.PI * 2) {
  const s = new T.Shape(); if (a1 - a0 > 6.28) { s.absarc(0, 0, R, 0, Math.PI * 2); const h = new T.Path(); h.absarc(0, 0, r, 0, Math.PI * 2, true); s.holes.push(h); }
  else { s.absarc(0, 0, R, a0, a1); s.absarc(0, 0, r, a1, a0, true); s.closePath(); } return s;
}
// spoked wheel web
export function web(R, r, n, gap = .24) {
  const s = new T.Shape(); s.absarc(0, 0, R, 0, Math.PI * 2);
  for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n, b = a + Math.PI * 2 / n, p = new T.Path(), g2 = Math.min(.48, gap * R * .62 / r * .9); p.absarc(0, 0, R * .82, a + gap, b - gap); p.absarc(0, 0, r * 1.25, b - g2, a + g2, true); p.closePath(); s.holes.push(p); }
  return s;
}
export function helix(x, y, z, r, len, turns, axis = "x") {
  const pts = [], n = turns * 14; for (let i = 0; i <= n; i++) { const a = i / n * turns * Math.PI * 2, t = (i / n - .5) * len; pts.push(axis === "x" ? [x + t, y + Math.cos(a) * r, z + Math.sin(a) * r] : [x + Math.cos(a) * r, y + t, z + Math.sin(a) * r]); } return pts;
}
// a rope whose centre line is rewritten every frame
export class Rope {
  constructor(mat, n, r, parent, rad = 7) {
    this.n = n; this.r = r; this.rad = rad; const v = (n + 1) * (rad + 1);
    this.P = new Float32Array(v * 3); this.N = new Float32Array(v * 3); this.U = new Float32Array(v * 2);
    const ix = []; for (let i = 0; i < n; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; ix.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = this.g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(this.P, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute("normal", new T.BufferAttribute(this.N, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute("uv", new T.BufferAttribute(this.U, 2).setUsage(T.DynamicDrawUsage)); g.setIndex(ix);
    this.m = new T.Mesh(g, mat); this.m.frustumCulled = false; this.m.castShadow = true; this.m.receiveShadow = true; parent.add(this.m);
    this.pts = new Float32Array((n + 1) * 3);
  }
  hide() { this.m.visible = false; }
  // pts: array of [x,y,z] with any length >= 2; resampled by arc length. off = texture phase in metres
  set(pts, off = 0) {
    this.m.visible = true; const n = this.n, Q = this.pts; let L = 0; const acc = [0];
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; L += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); acc.push(L); }
    if (L < 1e-4) { this.m.visible = false; return; }
    if (pts.length === n + 1) for (let i = 0; i <= n; i++) { Q[i * 3] = pts[i][0]; Q[i * 3 + 1] = pts[i][1]; Q[i * 3 + 2] = pts[i][2]; }
    else { let k = 1; for (let i = 0; i <= n; i++) { const s = L * i / n; while (k < pts.length - 1 && acc[k] < s) k++; const a = pts[k - 1], b = pts[k], d = acc[k] - acc[k - 1], t = d > 0 ? (s - acc[k - 1]) / d : 0; for (let j = 0; j < 3; j++) Q[i * 3 + j] = a[j] + (b[j] - a[j]) * t; } }
    let nx = 0, ny = 0, nz = 1, w = 0, s = 0; const { P, N, U, rad, r } = this;
    for (let i = 0; i <= n; i++) {
      const a = Math.max(0, i - 1) * 3, b = Math.min(n, i + 1) * 3; let tx = Q[b] - Q[a], ty = Q[b + 1] - Q[a + 1], tz = Q[b + 2] - Q[a + 2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let d = nx * tx + ny * ty + nz * tz; nx -= d * tx; ny -= d * ty; nz -= d * tz; let nl = Math.hypot(nx, ny, nz); if (nl < 1e-3) { nx = 1 - tx * tx; ny = -tx * ty; nz = -tx * tz; nl = Math.hypot(nx, ny, nz) || 1; } nx /= nl; ny /= nl; nz /= nl;
      const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
      if (i) s += Math.hypot(Q[i * 3] - Q[i * 3 - 3], Q[i * 3 + 1] - Q[i * 3 - 2], Q[i * 3 + 2] - Q[i * 3 - 1]);
      for (let j = 0; j <= rad; j++, w++) { const q = j / rad * Math.PI * 2, c = Math.cos(q), e = Math.sin(q), X = nx * c + bx * e, Y = ny * c + by * e, Z = nz * c + bz * e; N[w * 3] = X; N[w * 3 + 1] = Y; N[w * 3 + 2] = Z; P[w * 3] = Q[i * 3] + X * r; P[w * 3 + 1] = Q[i * 3 + 1] + Y * r; P[w * 3 + 2] = Q[i * 3 + 2] + Z * r; U[w * 2] = j / rad; U[w * 2 + 1] = s + off; }
    }
    for (const k of ["position", "normal", "uv"]) this.g.attributes[k].needsUpdate = true;
  }
}
const canvas = (w, h, f) => { const c = document.createElement("canvas"); c.width = w; c.height = h; f(c.getContext("2d"), w, h); return c; };
const tex = (c, srgb = true) => { const t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; return t; };
let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
// glazed brick: 4 x 8 bricks = 0.96 m x 0.64 m. returns {map, bump}
export function brick() {
  const W = 768, H = 512, bw = W / 4, bh = H / 8; seed = 9; const tone = [];
  for (let i = 0; i < 40; i++) tone.push([rnd(), rnd(), rnd()]);
  const draw = (x, bump) => {
    x.fillStyle = bump ? "#000" : "#a9a695"; x.fillRect(0, 0, W, H);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) {
      const t = tone[r * 4 + ((c + 4) % 4)], X = (c + (r % 2 ? .5 : 0)) * bw + 4, Y = r * bh + 4, w = bw - 8, h = bh - 8;
      if (bump) { for (let k = 0; k < 6; k++) { const v = 120 + k * 24; x.fillStyle = `rgb(${v},${v},${v})`; x.beginPath(); x.roundRect(X + k * 1.2, Y + k * 1.2, w - k * 2.4, h - k * 2.4, 6); x.fill(); } }
      else { const L = 88 + t[0] * 5, g = x.createLinearGradient(0, Y, 0, Y + h); g.addColorStop(0, `hsl(${52 + t[1] * 14} ${18 + t[2] * 8}% ${L}%)`); g.addColorStop(1, `hsl(${50 + t[1] * 14} ${18 + t[2] * 8}% ${L - 3}%)`); x.fillStyle = g; x.beginPath(); x.roundRect(X, Y, w, h, 6); x.fill(); }
    }
  };
  return { map: tex(canvas(W, H, x => draw(x, 0))), bump: tex(canvas(W, H, x => draw(x, 1)), false), w: .96, h: .64 };
}
// rope lay: diagonal strands. v in metres: repeat 1 / 0.09 m
export function lay() {
  const c = canvas(64, 64, (x, w, h) => { x.fillStyle = "#23241f"; x.fillRect(0, 0, w, h); for (let i = -2; i < 4; i++) { const g = x.createLinearGradient(0, i * 32, 0, i * 32 + 32); x.beginPath(); x.moveTo(0, i * 32 + 4); x.lineTo(w, i * 32 + 68); x.lineTo(w, i * 32 + 90); x.lineTo(0, i * 32 + 26); x.fillStyle = "#b9b4a6"; x.fill(); x.beginPath(); x.moveTo(0, i * 32 + 9); x.lineTo(w, i * 32 + 73); x.lineTo(w, i * 32 + 80); x.lineTo(0, i * 32 + 16); x.fillStyle = "#e6e1d2"; x.fill(); } });
  const t = tex(c); t.repeat.set(2, 1 / .13); return t;
}
export function wood(a = "#7a4c2a", b = "#5d371d") {
  seed = 5; return tex(canvas(256, 512, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const X = rnd() * w; x.strokeStyle = rnd() < .5 ? b : "#96643a"; x.globalAlpha = .05 + rnd() * .16; x.lineWidth = .6 + rnd() * 2; x.beginPath(); x.moveTo(X, 0); x.bezierCurveTo(X + rnd() * 14 - 7, h * .3, X + rnd() * 14 - 7, h * .6, X + rnd() * 10 - 5, h); x.stroke(); } }));
}
export function words(t, { font = "600 220px Goudy", c = "#20261f", w = 256, h = 256 } = {}) { const q = tex(canvas(w, h, x => { x.clearRect(0, 0, w, h); x.font = font; x.fillStyle = c; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(t, w / 2, h / 2 + 6); })); return q; }
export function checker(a, b) { const t = tex(canvas(128, 128, x => { x.fillStyle = a; x.fillRect(0, 0, 128, 128); x.fillStyle = b; x.fillRect(0, 0, 64, 64); x.fillRect(64, 64, 64, 64); })); return t; }
export function blob() { return tex(canvas(128, 128, x => { const g = x.createRadialGradient(64, 64, 2, 64, 64, 63); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.35, "rgba(255,255,255,.38)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); })); }
