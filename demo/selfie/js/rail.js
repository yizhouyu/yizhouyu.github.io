// The side view: the sitter in true scale, the phone in true scale, one knob to drag. It draws only lines; the sculpture comes from gl.js.
import { ortho, mul, lensZ, rotY } from './optics.js';
const NS = 'http://www.w3.org/2000/svg';
const el = (n, a = {}, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); p && p.append(e); return e; };
export class Rail {
  constructor(host, o) { // o: {min,max,get,set,head,label(d),aria,goal:{d,text},lens,lines:'fov'|'why'|'', big}
    this.o = o; this.el = document.createElement('div'); this.el.className = 'rail'; host.append(this.el); this.el.tabIndex = 0; this.el.setAttribute('role', 'slider'); this.el.setAttribute('aria-label', o.aria); this.el.setAttribute('aria-valuemin', o.min / 10); this.el.setAttribute('aria-valuemax', o.max / 10);
    this.s = el('svg', {}, this.el); this.base = el('line', { class: 'base' }, this.s); this.goal = el('line', { class: 'goal' }, this.s); this.gt = el('text', { class: 'acc', 'text-anchor': 'middle' }, this.s);
    this.r = [0, 1, 2].map(() => el('line', { class: 'ray' }, this.s)); this.rt = [0, 1].map(() => el('text', { 'text-anchor': 'middle' }, this.s)); this.ph = el('rect', { class: 'ph', rx: 1.5 }, this.s); this.stem = el('line', { class: 'ray', 'stroke-dasharray': '1 4' }, this.s);
    this.kn = el('g', {}, this.s); this.kh = el('g', {}, this.kn); el('rect', { class: 'knob', x: -34, y: -22, width: 68, height: 44 }, this.kh); this.ka = el('path', { class: 'kn2', d: 'M-14 -6l-7 6l7 6M14 -6l7 6l-7 6M-19 0H19' }, this.kh); this.now = el('text', { class: 'now', 'text-anchor': 'middle' }, this.s);
    const at = e => { const b = this.el.getBoundingClientRect(); return e.clientX - b.left; };
    let off = 0, act = false;
    this.el.addEventListener('pointerdown', e => { if (o.off?.()) return; act = true; this.el.setPointerCapture(e.pointerId); const x = at(e), k = this.x(o.get()); off = Math.abs(x - k) < 48 ? k - x : 0; this.moved = true; if (!off && Math.abs(x - k) > 48) this.glide(this.d(x)); else o.set(this.d(x + off)); this.el.classList.add('ptr'); this.el.focus({ preventScroll: true }); e.preventDefault(); });
    this.el.addEventListener('pointermove', e => { if (act && Math.abs(e.movementX || 0) + 1 > 1) { this.gl_ = 0; o.set(this.d(at(e) + off)); } else if (act && e.pointerType === 'touch' && !this.gl_) o.set(this.d(at(e) + off)); });
    const up = () => { if (act) { act = false; if (!this.gl_) o.end && o.end(); } }; this.el.addEventListener('pointerup', up); this.el.addEventListener('pointercancel', up); this.el.addEventListener('lostpointercapture', up);
    this.el.addEventListener('keydown', e => { this.el.classList.remove('ptr'); const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key]; if (k) { this.moved = true; o.set(this.cl(o.get() + k * (e.shiftKey ? 100 : 20))); o.end && o.end(); e.preventDefault(); } if (e.key === 'Home' || e.key === 'End') { o.set(e.key === 'Home' ? o.min : o.max); o.end && o.end(); e.preventDefault(); } });
    this.el.addEventListener('wheel', e => { e.preventDefault(); if (o.off?.()) return; this.moved = true; o.set(this.cl(o.get() + Math.sign(e.deltaY || e.deltaX) * 20)); clearTimeout(this.wt); this.wt = setTimeout(() => o.end && o.end(), 300); }, { passive: false });
  }
  /** a tap far from the knob: the phone walks there, so the change can be seen */
  glide(to) { if (matchMedia('(prefers-reduced-motion:reduce)').matches) return this.o.set(to); const from = this.o.get(), id = this.gl_ = Math.random(); let t0; const f = t => { if (this.gl_ !== id) return; t0 ??= t; const u = Math.min(1, (t - t0) / 1300), e = u < .5 ? 2 * u * u : 1 - (2 - 2 * u) ** 2 / 2; this.o.set(from + (to - from) * e); if (u < 1) requestAnimationFrame(f); else { this.gl_ = 0; this.o.end && this.o.end(); } }; requestAnimationFrame(f); }
  cl(d) { return Math.min(this.o.max, Math.max(this.o.min, d)); }
  place(x, y, w, h) { Object.assign(this.el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' }); this.w = w; this.h = h; }
  /** layout: world z (mm) -> px */
  fit() { const o = this.o, hd = o.head(), back = hd.name === 'cat' ? -90 : -215, pad = 8, endpad = 44; this.z0 = back; this.k = (this.w - pad - endpad) / (lensZ(hd, o.max) - back); this.pad = pad; this.eye = o.eyeY ?? Math.max((this.h - 62) * .34, hd.top * this.k + 4); }
  X(z) { return this.pad + (z - this.z0) * this.k; } Y(y) { return this.eye - y * this.k; }
  x(d) { return this.X(lensZ(this.o.head(), d)); } d(x) { const hd = this.o.head(); return this.cl((x - this.pad) / this.k + this.z0 - hd.nose[2]); }
  update() {
    this.fit(); const o = this.o, hd = o.head(), d = o.get(), x = this.x(d), floor = this.h - 62, A = (e, a) => { for (const k in a) e.setAttribute(k, a[k]); };
    A(this.base, { x1: 0, x2: this.w, y1: floor, y2: floor }); const ky = floor + 30; A(this.kn, { transform: `translate(${x} ${ky})` }); this.ka.classList.toggle('hint', !this.moved && !o.quiet); A(this.stem, { x1: x, x2: x, y1: this.eye + 135 * this.k, y2: ky - 22 });
    const ph = 150 * this.k, pw = Math.max(3, 8 * this.k); const tl = o.tilt ? o.tilt() : 0; A(this.ph, { x, y: this.Y(18), width: pw, height: ph, transform: `rotate(${-tl} ${x} ${this.eye})` });
    const lab = o.hide ? '?' : o.label(d); this.now.textContent = lab; const side = x > this.w - 130 ? -1 : 1; A(this.now, { x: x + side * (this.moved || o.quiet ? 44 : 60), y: ky + 6, 'text-anchor': side > 0 ? 'start' : 'end' });
    if (o.goal && !o.goal.done) { const gx = this.x(o.goal.d); A(this.goal, { x1: gx, x2: gx, y1: 18, y2: o.bars ? floor - 76 : floor, visibility: 'visible' }); this.gt.textContent = o.goal.text; A(this.gt, { x: Math.min(this.w - 34, Math.max(40, gx)), y: 12, visibility: 'visible' }); } else { A(this.goal, { visibility: 'hidden' }); A(this.gt, { visibility: 'hidden' }); }
    const L = [x, this.eye]; const ray = (i, p) => A(this.r[i], { x1: L[0], y1: L[1], x2: this.X(p[2]), y2: this.Y(p[1]), visibility: 'visible' });
    this.r.forEach(r => A(r, { visibility: 'hidden' })); this.rt.forEach(t => A(t, { visibility: 'hidden' }));
    if (o.lines === 'fov') { const t = hd.name === 'cat'; ray(0, [0, hd.top, t ? -38 : hd.name === 'honey' ? -115 : -75]); ray(1, t ? [0, -38, 12] : [0, hd.name === 'child' ? -92 : -118, 12]); this.r.forEach(r => r.style.opacity = .55); }
    this.bars ||= [0, 1].map(() => el('path', { class: 'bar' }, this.s)); if (o.bars) o.bars().forEach(([t, k], i) => { const y = floor - 46 + i * 30, xe = this.X(hd[k][2]); A(this.bars[i], { d: `M${xe} ${y - 5}v10M${x} ${y - 5}v10M${xe} ${y}H${x}` }); this.rt[i].textContent = t; const left = x > this.w - 170; A(this.rt[i], { x: left ? (xe + x) / 2 : x + 12, y: left ? y - 7 : y + 5, 'text-anchor': left ? 'middle' : 'start', visibility: 'visible' }); });
    if (o.ring) { this.er ||= el('circle', { class: 'er' }, this.s); this.et ||= el('text', { 'text-anchor': 'middle' }, this.s); const vis = o.ring(), ex = this.X(hd.ear[2]), ey = this.Y(hd.ear[1]), er = Math.max(13, 40 * this.k); A(this.er, { cx: ex, cy: ey, r: er }); this.er.classList.toggle('off', !vis); this.et.textContent = vis ? '' : o.ringText; A(this.et, { x: Math.max(ex, 64), y: this.Y(hd.top) - 12 }); }
    if (o.lines === 'why') { ray(0, hd.nose); ray(1, hd.ear); this.r.forEach(r => r.style.opacity = 1); }
    this.el.setAttribute('aria-valuenow', Math.round(d / 10)); this.el.setAttribute('aria-valuetext', lab);
  }
  /** what gl.js must draw into this element */
  view(origin, look, lens) {
    const hd = this.o.head(), floor = this.h - 62, k = this.k, zl = this.z0 - this.pad / k, zr = zl + this.w / k, yt = this.eye / k, yb = yt - floor / k;
    // camera at -x looking along +x: screen right = +z
    const vp = mul(ortho(zl, zr, yb, yt, -2000, 2000), rotY(Math.PI / 2)); // rotY(+90): z -> x(screen), x -> -z(depth)
    const b = this.el.getBoundingClientRect();
    return { x: b.left - origin.left, y: b.top - origin.top, w: this.w, h: floor, vp, eye: [-4000, 0, 0], ortho: true, viewDir: [-1, 0, 0], look, items: [{ head: hd }], lens };
  }
}
