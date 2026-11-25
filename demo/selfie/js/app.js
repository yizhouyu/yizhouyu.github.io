import * as O from './optics.js';
import { GL, STONE } from './gl.js';
import { S } from './i18n.js';
import { HUMANS, turn, pulled, F, PA, WALK, FAR, faceShare, zoomFor, guessSet, GA, SLOT, GD } from './model.js';
import { Rail } from './rail.js';
import { about } from './about.js';
import { poster } from './poster.js';

const $ = id => document.getElementById(id), doc = document.documentElement, store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { } } };
const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
const ALL = [...HUMANS, 'cat'];
const DOT = { plaster: '#dedad2', basalt: '#45423f', honey: '#d9bd8c', terracotta: '#b8703f', child: '#7d5a34', cat: '#23282a' };
let lang = /^zh/.test(doc.lang) ? 'zh' : 'en', T = S[lang], meta, gl, ready = false;
const st = { step: 'near', head: 'plaster', d: 200, done: {}, zoomA: 1500, zoomB: 1, lockA: false, lockB: false, order: ['terracotta', 'basalt', 'child', 'plaster', 'honey'], gd: 600, az: 0, el: 0, guess: null };
const head = () => gl.heads[st.head] || gl.heads.plaster;
const human = () => gl.heads[st.head === 'cat' || !gl.heads[st.head] ? 'plaster' : st.head];
const dark = () => doc.dataset.light === 'off';
const LOOK = () => dark() ? { key: [.84, .785, .70], fill: [.085, .094, .112], rim: [.50, .535, .60], expo: .9, grain: .02 } : { key: [.86, .82, .76], fill: [.235, .245, .27], rim: [.26, .27, .30], expo: .9, grain: .018 };
const lift = n => dark() ? { basalt: 1.5, cat: 1.7, child: 1.25 }[n] || 1 : 1;
const rgb = v => { const m = getComputedStyle(doc).getPropertyValue(v).trim(); return [1, 3, 5].map(i => (parseInt(m.slice(i, i + 2), 16) / 255) ** 2.2); };

// ---------- drawing on demand
let dirty = false, views = [], rail = null, anim = null;
const kick = () => { if (!dirty) { dirty = true; requestAnimationFrame(frame); } };
let dpr = Math.min(2, devicePixelRatio || 1), slow = 0, lastT = 0;
function frame(t) {
  dirty = false; if (!ready || gl.lost || document.hidden) return; const dt = t - lastT; lastT = t;
  if (dt > 45 && dt < 200) { if (++slow > 12 && dpr > 1) { dpr = Math.max(1, dpr - .5); slow = 0; } } else if (dt <= 45) slow = Math.max(0, slow - 1);
  gl.size(innerWidth, innerHeight, dpr); gl.begin(); for (const v of views) { const q = v(); if (q) gl.view(q); } window.__frames = (window.__frames || 0) + 1;
}
/** a photo box: host element + function giving the camera */
const box = el => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
function portraitView(el, h, d, extra) { return () => { const b = box(el), hd = h(), dd = d(); return { ...b, vp: O.portrait(hd, dd, b.w / b.h), eye: [0, 0, O.lensZ(hd, dd)], look: LOOK(), items: [{ head: hd, expo: lift(hd.name) }], ...(extra ? extra() : {}) }; }; }
const div = (cls, host, html = '') => { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; host.append(e); return e; };
const put = (e, x, y, w, h) => { const r = Math.round; Object.assign(e.style, { left: r(x) + 'px', top: r(y) + 'px', width: r(x + w) - r(x) + 'px', height: h === undefined ? '' : r(y + h) - r(y) + 'px' }); };
const phone = () => innerWidth <= 820 && innerHeight > 560;
function flash() { if (still) return; const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(20); }
function tween(from, to, ms, fn, done) { if (still || ms <= 0) { fn(to); done && done(); return () => { }; } let t0, stop = false; const f = t => { if (stop) return; t0 ??= t; const u = Math.min(1, (t - t0) / ms), e = u < .5 ? 2 * u * u : 1 - (2 - 2 * u) ** 2 / 2; fn(from + (to - from) * e); if (u < 1) requestAnimationFrame(f); else done && done(); }; requestAnimationFrame(f); return () => { stop = true; }; }

// ---------- text column
function say({ kick: k = '', h, d, tick }) { $('kick').textContent = k; $('h1').textContent = h; $('do').innerHTML = d || ''; $('do').hidden = !d; $('do').classList.toggle('done', !!tick); }
function meter(big, cap) { $('meter').classList.toggle('off', big == null); if (big != null) { $('mBig').textContent = big; $('mCap').textContent = cap; } }
function after(html, acts = []) { const a = $('after'); if (a.dataset.html !== html) { a.dataset.html = html; a.innerHTML = html; a.classList.remove('in'); void a.offsetWidth; if (html) a.classList.add('in'); } $('acts').replaceChildren(...acts); if (html && phone()) $('say').scrollTop = 0; }
const btn = (cls, text, fn, id) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = text; if (id) b.id = id; b.onclick = fn; return b; };

// ---------- steps
const ORDER = ['near', 'why', 'zoom', 'group', 'end'];
const STEP = {};
let cur = null;
function go(s, opt = {}) { if (!STEP[s]) s = 'near'; st.step = s; st.enter = true; if (opt.fresh) delete st.done[s]; build(); hash(!opt.silent); if (phone()) $('say').scrollTop = 0; }
function build() {
  views = []; rail = null; anim && anim(); anim = null; const stage = $('stage'); stage.replaceChildren(); document.body.classList.toggle('eye', st.step === 'eye'); $('after').dataset.html = ''; $('after').innerHTML = ''; $('acts').replaceChildren(); meter(null);
  if (phone()) stage.style.height = { why: '54dvh', zoom: '53dvh', group: '48dvh', end: '36dvh', eye: '100%' }[st.step] || '52dvh'; else stage.style.height = '';
  nav(); cur = STEP[st.step](stage); st.enter = false; layout(); refresh();
}
function layout() { cur?.layout && cur.layout($('stage').clientWidth, $('stage').clientHeight); kick(); }
function refresh() { cur?.refresh && cur.refresh(); if (rail) rail.update(); kick(); }
function nav() {
  const n = $('steps'), k = [...n.querySelectorAll('button')]; if (!k.length || n.dataset.lang !== lang) { n.dataset.lang = lang; n.replaceChildren(...ORDER.map((s, i) => { const b = btn('', T.steps[i], () => go(s)); b.dataset.s = s; return b; }), document.createElement('i'), ...['guess', 'studio'].map(s => { const b = btn('', T.extra[s], () => go(s)); b.dataset.s = s; return b; })); }
  for (const b of n.querySelectorAll('button')) if (b.dataset.s === st.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
}
const kicker = i => `${i} / 4`;
function dots(host, names, get, set) { const e = div('dots', host); e.setAttribute('role', 'group'); e.setAttribute('aria-label', T.studio.sit); for (const n of names) { const b = btn('', '', async () => { await need(n); set(n); refresh(); for (const x of e.children) x.setAttribute('aria-pressed', x.dataset.n === get()); }); b.dataset.n = n; b.style.background = DOT[n]; b.title = T.studio.names[n]; b.setAttribute('aria-label', T.studio.names[n]); b.setAttribute('aria-pressed', n === get()); e.append(b); } return e; }
async function need(...names) { try { await Promise.all(names.map(n => gl.load(n, meta[n]))); } catch (e) { toast(T.err); throw e; } }
/** big photo over a rail: shared by near / guess / studio */
function photoAndRail(stage, r, o = {}) {
  const ph = div('photo', stage), mast = div('mast', ph), over = div('over', stage); rail = new Rail(stage, r); const rl_ = rail; views.push(() => (r.ready && !r.ready()) || rl_.el.style.display === 'none' ? null : rl_.view({ left: 0, top: 0 }, LOOK()));
  return {
    ph, mast, over, layout(W, H) {
      const p = phone(), rh = p ? 118 : Math.round(Math.min(200, Math.max(160, H * .235))), gap = p ? 4 : 26, ph_ = H - rh - gap, w = p ? W : Math.min(W, ph_ * .8), x = p ? 0 : Math.max(46, Math.min((W - w) / 2, o.room ? W - w - 186 : 1e9)); put(ph, x, 0, w, ph_); put(over, x, 0, w, ph_); rail.place(p ? 10 : 0, ph_ + gap, p ? W - 20 : W, rh); mast.style.fontSize = Math.min(w * .25, ph_ * .20) + 'px'; this.box = { x, w, h: ph_, rh, gap };
    },
    setMast(d) { if (o.mast === false) return; mast.innerHTML = `${Math.round(d / 10)}<i>${T.unit[0]}</i>`; }
  };
}

// 1 ---------------------------------------------------------------- near and far
STEP.near = stage => {
  const G = 1500; let th = null; if (st.enter && !st.done.near) st.d = Math.min(st.d, 320);
  const goal = { d: G, text: T.cm(G) + ' · ' + T.s1.goal, done: !!st.done.near };
  const p = photoAndRail(stage, { min: 150, max: 1800, head, aria: T.railAria, label: T.cm, goal, lines: 'fov', get: () => st.d, set: d => { st.d = d; if (!st.done.near && d >= G - 12) { st.done.near = true; goal.done = true; st.d = G; flash(); finish(); } refresh(); }, end: () => hash() }, { room: true });
  const sit = dots(stage, ALL, () => st.head, n => { st.head = n; hash(); });
  const finish = () => { const h = human(); after(`<p class="ok">${T.s1.ok}</p><p>${T.s1.why(T.p0(O.noseGrowth(h, 200)), T.p0(-O.growth(h, 200, 'sh') / (1 + O.growth(h, 200, 'sh'))), T.p0(O.noseGrowth(h, G)))}</p>`, [btn('next', T.s1.next, () => go('why'), 'next')]); $('do').classList.add('done'); if (th) th.style.display = ''; };
  // the first print stays pinned next to the live one, so the two can be compared
  const cmp = div('photo', stage), ccap = div('cap', stage); cmp.style.display = 'none'; ccap.style.display = 'none';
  views.push(portraitView(p.ph, head, () => st.d)); views.push(() => cmp.style.display === 'none' ? null : portraitView(cmp, head, () => 200, () => ({ clear: true }))());
  say({ kick: kicker(1), h: T.s1.h, d: T.s1.do }); if (st.done.near) finish();
  return {
    layout(W, H) {
      p.layout(W, H); const b = p.box, d = !!st.done.near; cmp.style.display = ccap.style.display = d ? '' : 'none';
      if (phone()) { const w = Math.round(W * .30), h = w * 1.25; put(cmp, W - w - 8, b.h - h - 8, w, h); cmp.style.boxShadow = '0 0 0 2px var(--film)'; ccap.className = 'cap strip'; put(ccap, W - w - 10, b.h - h - 35, w + 4); sit.style.left = '14px'; sit.style.top = b.h - 40 + 'px'; }
      else { const w = Math.min(W - b.x - b.w - 34, 190), h = w * 1.25; if (w > 90) { put(cmp, b.x + b.w + 34, b.h - h - 34, w, h); put(ccap, b.x + b.w + 34, b.h - 26, w); } else { const w2 = 120, h2 = 150; put(cmp, b.x + b.w - w2 - 8, 8, w2, h2); put(ccap, b.x + b.w - w2 - 8, 164, w2); } sit.style.left = Math.max(0, b.x - 46) + 'px'; sit.style.top = '6px'; sit.style.flexDirection = 'column'; }
      ccap.textContent = T.s1.was;
    },
    refresh() { p.setMast(st.d); meter(T.pc(O.noseGrowth(head(), st.d)), T.s1.cap); if (st.done.near && cmp.style.display === 'none') this.layout(stage.clientWidth, stage.clientHeight); aria(p.ph, st.d); }
  };
};
function aria(el, d) { el.setAttribute('role', 'img'); el.setAttribute('aria-label', T.aria(T.cm(d), T.pc(O.noseGrowth(head(), d)))); }

// 2 ---------------------------------------------------------------- why
STEP.why = stage => {
  if (st.head === 'cat') st.head = 'plaster'; const h = human(); gl.earTable(h); let target = 1000; for (let d = 1000; d > 150; d -= 5) if (gl.earShare(h, d) < .12) { target = d; break; } st.target = target; if (!st.d2 || (st.enter && !st.done.why)) st.d2 = 950;
  const goal = { d: target, text: T.s2.goal, done: !!st.done.why };
  rail = new Rail(stage, { min: 150, max: 1050, head: human, aria: T.railAria, label: T.cm, goal, lines: 'why', ring: () => gl.earShare(human(), st.d2) > .12, ringText: T.s2.hidden, bars: () => [[T.s2.toNose, 'nose'], [T.s2.toEar, 'ear']].map(([t, k]) => [t + ' ' + T.cm(O.reach(human(), st.d2, k)), k]), get: () => st.d2, set: d => { st.d2 = d; if (!st.done.why && d <= target) { st.done.why = true; goal.done = true; flash(); finish(); } refresh(); }, end: () => hash() });
  const mini = div('photo', stage), mcap = div('cap', stage);
  views.push(() => rail.view({ left: 0, top: 0 }, LOOK(), { head: human(), pos: [0, 0, O.lensZ(human(), st.d2)], acc: rgb('--accFill').map(x => x * 1.1), amount: 1 })); views.push(portraitView(mini, human, () => st.d2));
  const cmr = (d, k) => Math.round(O.reach(h, d, k) / 10), ratio = d => cmr(d, 'ear') / cmr(d, 'nose');
  const html = () => `<p class="ok">${T.s2.ok}</p><p>${T.s2.why(T.cm(Math.min(st.d2, target)), ratio(Math.min(st.d2, target)).toFixed(1), ratio(1500).toFixed(1))}</p>`; const finish = () => { after(html(), [btn('next', T.s2.next, () => go('zoom'), 'next')]); $('do').classList.add('done'); };
  say({ kick: kicker(2), h: T.s2.h, d: T.s2.do }); if (st.done.why) finish();
  return {
    layout(W, H) { const p = phone(), mw = p ? Math.round(W * .30) : Math.min(190, W * .22), mh = mw * 1.25; rail.o.eyeY = mh + (p ? 62 : 78); rail.place(p ? 6 : 0, 0, p ? W - 12 : W, H); put(mini, W - mw - (p ? 10 : 6), p ? 4 : 6, mw, mh); if (p) mini.style.boxShadow = '0 0 0 2px var(--film)'; put(mcap, W - mw - (p ? 10 : 6), mh + (p ? 8 : 18), mw); },
    refresh() { meter(ratio(st.d2).toFixed(1) + '×', T.s2.cap()); if (st.done.why && $('after').dataset.html) { const a = $('after'); a.innerHTML = a.dataset.html = html(); } mcap.textContent = T.s2.ears(Math.round(gl.earShare(h, st.d2) * 100) + '%'); aria(mini, st.d2); }
  };
};

// 3 ---------------------------------------------------------------- walk or zoom
function slider(host, o) { // {min,max,get,set,l,r,log}
  const e = div('slide', host, `<div class="tr"></div><div class="kn"><svg viewBox="0 0 26 16"><path d="M7 3L2 8l5 5M19 3l5 5l-5 5M3 8h20"/></svg></div><span class="lb">${o.l}</span><span class="rb">${o.r}</span>`), kn = e.querySelector('.kn'); e.tabIndex = 0; e.setAttribute('role', 'slider'); e.setAttribute('aria-label', o.l);
  const u = v => o.u(v), val = x => o.v(Math.min(1, Math.max(0, x))); let act = false, off = 0; const at = ev => { const b = e.getBoundingClientRect(); return (ev.clientX - b.left - 26) / (b.width - 52); };
  e.addEventListener('pointerdown', ev => { if (o.locked()) return; act = true; e.setPointerCapture(ev.pointerId); const x = at(ev), k = u(o.get()); off = Math.abs(x - k) * (e.clientWidth - 52) < 50 ? k - x : 0; o.set(val(x + off)); ev.preventDefault(); });
  e.addEventListener('pointermove', ev => { if (act && !o.locked()) o.set(val(at(ev) + off)); }); for (const n of ['pointerup', 'pointercancel', 'lostpointercapture']) e.addEventListener(n, () => { act = false; });
  e.addEventListener('keydown', ev => { const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[ev.key]; if (k && !o.locked()) { o.set(val(u(o.get()) + k * .02)); ev.preventDefault(); } });
  return { e, update() { kn.style.left = `calc(26px + (100% - 52px) * ${u(o.get())})`; e.classList.toggle('lock', o.locked()); e.setAttribute('aria-valuenow', Math.round(u(o.get()) * 100)); e.querySelector('.rb').textContent = o.rt ? o.rt() : o.r; } };
}
STEP.zoom = stage => {
  if (st.head === 'cat') st.head = 'plaster'; const h = human(), Z = zoomFor(h); if (st.enter && !st.done.zoom) { st.zoomA = FAR; st.zoomB = 1; st.lockA = st.lockB = false; }
  const A = div('photo', stage), B = div('photo', stage), oa = div('oval', stage), ob = div('oval', stage), ca = div('cap', stage), cb = div('cap', stage);
  const check = () => { const want = faceShare(h, WALK, 1); if (!st.lockA && Math.abs(faceShare(h, st.zoomA, 1) / want - 1) < .06) { st.lockA = true; st.zoomA = WALK; flash(); } if (!st.lockB && Math.abs(faceShare(h, FAR, st.zoomB) / want - 1) < .06) { st.lockB = true; st.zoomB = Z; flash(); } if (st.lockA && st.lockB && !st.done.zoom) { st.done.zoom = true; finish(); } refresh(); };
  // both sliders move in equal steps of face size, so they feel the same
  const ul = (v, a, b) => Math.log(v / a) / Math.log(b / a), vl = (u, a, b) => a * (b / a) ** u;
  const DA = d => O.lensZ(h, d) - h.zy[2], dA = D => D - h.nose[2] + h.zy[2];
  const sa = slider(stage, { l: T.s3.walk, r: '', rt: () => T.cm(st.zoomA), get: () => st.zoomA, set: v => { st.zoomA = v; check(); }, u: d => ul(DA(d), DA(FAR), DA(220)), v: u => dA(vl(u, DA(FAR), DA(220))), locked: () => st.lockA });
  const sb = slider(stage, { l: T.s3.zoom, r: '', rt: () => st.zoomB.toFixed(1) + '×', get: () => st.zoomB, set: v => { st.zoomB = v; check(); }, u: z => ul(z, 1, Z * DA(WALK) / DA(220)), v: u => vl(u, 1, Z * DA(WALK) / DA(220)), locked: () => st.lockB });
  const cam = (el, d, z) => () => { const b = box(el), dd = d(), zc = O.lensZ(h, dd); return { ...b, vp: O.phoneCam(F * z(), PA, [0, 0, zc], 0, -.045), eye: [0, 0, zc], look: LOOK(), items: [{ head: h, expo: lift(h.name) }] }; };
  views.push(cam(A, () => st.zoomA, () => 1), cam(B, () => FAR, () => st.zoomB));
  const finish = () => { after(`<p class="ok">${T.s3.ok}</p><p>${T.s3.why}</p>`, [btn('next', T.s3.next, () => go('group'), 'next')]); $('do').classList.add('done'); };
  say({ kick: kicker(3), h: T.s3.h, d: T.s3.do }); if (st.done.zoom) finish();
  return {
    layout(W, H) {
      const p = phone(), gap = p ? 18 : 44, sh = 78, cap = p ? 40 : 50; const gut = p ? 18 : 0; let w = Math.min((W - gap - 2 * gut) / 2, (H - sh - cap) * PA), hh = w / PA; const x0 = p ? (W - 2 * w - gap) / 2 : (W - 2 * w - gap) / 2, y = p ? 0 : Math.max(0, (H - hh - sh - cap) / 2);
      [[A, oa, sa, ca, 0], [B, ob, sb, cb, 1]].forEach(([el, ov, s, c, i]) => { const x = x0 + i * (w + gap); put(el, x, y, w, hh); const fs = faceShare(h, WALK, 1) * w, ow = fs * 1.16, oh = fs * 1.62; put(ov, x + (w - ow) / 2, y + hh * .455 - oh * .5, ow, oh); put(s.e, x, y + hh + cap, w, 60); put(c, x, y + hh + (p ? 5 : 12), w); });
    },
    refresh() { sa.update(); sb.update(); oa.classList.toggle('ok', st.lockA); ob.classList.toggle('ok', st.lockB); const want = faceShare(h, WALK, 1), fA = faceShare(h, st.zoomA, 1) / want, fB = faceShare(h, FAR, st.zoomB) / want, say_ = f => f < .3 ? '' : f > 1.06 ? T.s3.over : f > .7 ? T.s3.almost(T.p0(f)) : T.s3.fill(T.p0(f)); ca.innerHTML = st.lockA ? `<b>${T.s3.nose(T.pc(O.noseGrowth(h, WALK)))}</b>` : say_(fA); cb.innerHTML = st.lockB ? `<b>${T.s3.nose(T.pc(O.noseGrowth(h, FAR)))}</b>` : say_(fB) || T.s3.stay; if (!st.done.zoom && (st.lockA || st.lockB) && !$('after').dataset.html) after(`<p>${T.s3.one}</p>`); aria(A, st.zoomA); aria(B, FAR); }
  };
};

// 4 ---------------------------------------------------------------- group photo
STEP.group = stage => {
  const load = div('load', stage, T.loading); if (st.enter && !st.done.group) { st.order = ['terracotta', 'basalt', 'child', 'plaster', 'honey']; st.gd = GD; st.groupB = false; }
  const ph = div('photo', stage), who = div('who', stage, `<div class="ring"></div><div class="arr"></div>`), ringEl = who.children[0], arr = who.children[1]; let drag = null, pos = SLOT.slice(); let ok = HUMANS.every(n => gl.heads[n]), rl = null;
  const loupes = [0, 1].map(() => ({ el: div('photo loupe', stage), cap: div('cap', stage) }));
  const D0 = GD + 46, D = () => st.gd + 46, f = () => 13 * D() / D0, CY = -60, SH = -.085;
  const vpOf = (w, h) => O.phoneCam(f(), w / h, [0, CY, D()], 0, SH);
  const items = () => st.order.map((n, i) => ({ head: gl.heads[n], expo: lift(n), model: O.mul(O.translate(pos[i], n === 'child' ? -60 : 0, 0), O.rotY(turn(pos[i], D()))) }));
  const base = () => ({ eye: [0, CY, D()], look: LOOK(), items: items() });
  views.push(() => { if (!ok) return null; const b = box(ph); return { ...b, vp: vpOf(b.w, b.h), ...base() }; });
  const idx = () => st.order.indexOf('honey');
  // a loupe: the same picture, the same lines, only enlarged around one face
  const who_ = k => rl ? (k ? 4 : 0) : idx();
  loupes.forEach((l, k) => views.push(() => { if (!ok || l.el.style.display === 'none') return null; const b = box(l.el), s = box(ph), i = who_(k), V = vpOf(s.w, s.h), p = O.project(V, [pos[i], st.order[i] === 'child' ? -45 : 12, 0]); const q = O.project(V, [pos[i], st.order[i] === 'child' ? 45 : 102, 0]); const hpx = Math.abs(q[1] - p[1]) * s.h; const z = b.h * .30 / hpx, m = O.ident(); m[0] = z * s.w / b.w; m[5] = z * s.h / b.h; m[12] = -(p[0] * 2 - 1) * m[0]; m[13] = -(1 - p[1] * 2) * m[5]; return { ...b, vp: O.mul(m, V), ...base() }; }));
  const edgeOf = k => pulled(gl.heads[st.order[k]], SLOT[k], D()), edge = () => Math.max(edgeOf(0), edgeOf(4));
  const scr = X => { const w = ph.clientWidth, h = ph.clientHeight, p = O.project(vpOf(w, h), [X, 0, 0]); return [p[0] * w, p[1] * h]; };
  const inv = px => { const a = scr(0)[0], k = scr(100)[0] - a; return (px - a) / k * 100; };
  ph.classList.add('drag'); let off = 0;
  ph.addEventListener('pointerdown', e => { if (st.done.group || !ok) return; const b = box(ph), x = e.clientX - b.x, i = idx(), s = scr(pos[i])[0]; if (Math.abs(x - s) > Math.max(70, b.w * .13)) { who.classList.remove('shake'); void who.offsetWidth; who.classList.add('shake'); return; } drag = i; off = pos[i] - inv(x); ph.setPointerCapture(e.pointerId); e.preventDefault(); });
  ph.addEventListener('pointermove', e => { if (drag == null) return; const b = box(ph); pos[idx()] = Math.max(-770, Math.min(770, inv(e.clientX - b.x) + off)); reflow(); });
  const drop = () => { if (drag == null) return; drag = null; const n = 'honey', i = idx(), from = pos[i]; tween(0, 1, 240, u => { const j = st.order.indexOf(n); pos[j] = from + (SLOT[j] - from) * u; refresh(); }); if (i === 2 && !st.done.group) finishA(); };
  for (const n of ['pointerup', 'pointercancel', 'lostpointercapture']) ph.addEventListener(n, drop);
  ph.tabIndex = 0; ph.addEventListener('keydown', e => { const k = { ArrowLeft: -1, ArrowRight: 1 }[e.key]; if (!k || st.done.group || !ok) return; e.preventDefault(); const i = idx(), j = i + k; if (j < 0 || j > 4) return; swap(i, j); pos = SLOT.slice(); if (idx() === 2) finishA(); refresh(); });
  const swap = (i, j) => { [st.order[i], st.order[j]] = [st.order[j], st.order[i]];[pos[i], pos[j]] = [pos[j], pos[i]]; };
  function reflow() { let i = idx(); while (i > 0 && pos[i] < (SLOT[i - 1] + SLOT[i]) / 2) { swap(i, i - 1); slideTo(i); i--; } while (i < 4 && pos[i] > (SLOT[i + 1] + SLOT[i]) / 2) { swap(i, i + 1); slideTo(i); i++; } refresh(); }
  const slideTo = k => { const n = st.order[k], a = pos[k]; tween(0, 1, 260, u => { const j = st.order.indexOf(n); if (st.step === 'group') { pos[j] = a + (SLOT[j] - a) * u; refresh(); } }); };
  const goalD = () => { for (let d = GD; d < 4000; d += 10) if (Math.max(...[0, 4].map(k => pulled(gl.heads[st.order[k]], SLOT[k], d + 46))) <= .05) return d; return 3000; };
  function finishA() { st.done.group = true; flash(); hash(); const far = st.order[4] === 'honey' ? 0 : 4; after(`<p class="ok">${T.s4.ok(T.p0(edgeOf(far)))}</p><p>${T.s4.why}</p>`, [btn('next', T.s4.next, partB, 'next')]); $('do').classList.add('done'); refresh(); }
  function partB() { st.groupB = true; hash(); say({ kick: kicker(4), h: T.s4b.h, d: T.s4b.do }); after(''); const gd = goalD(), max = Math.max(3000, gd + 500), goal = { d: gd, text: T.cm(gd) + ' · ' + T.s1.goal, done: !!st.done.groupB };
    rail = rl = new Rail(stage, { min: GD, max, head: () => gl.heads[st.order[2]], aria: T.railAria, label: T.cm, goal, lines: '', get: () => st.gd, set: d => { st.gd = d; if (!st.done.groupB && d >= gd - 10) { st.done.groupB = true; goal.done = true; st.gd = gd; flash(); finishB(); } refresh(); }, end: () => hash() });
    views.push(() => rl.view({ left: 0, top: 0 }, LOOK())); if (st.done.groupB) finishB(); layout(); refresh(); }
  function finishB() { after(`<p class="ok">${T.s4b.ok(T.cm(st.gd))}</p><p>${T.s4b.why}</p>`, [btn('next', T.s4b.next, () => go('end'), 'next')]); $('do').classList.add('done'); }
  say({ kick: kicker(4), h: T.s4.h, d: T.s4.do });
  const boot = () => { load.remove(); if (st.done.group && st.groupB) partB(); else if (st.done.group) finishA(); layout(); refresh(); };
  if (ok) setTimeout(boot); else need(...HUMANS).then(() => { ok = true; if (st.step === 'group') boot(); }, () => { load.innerHTML = ''; load.append(btn('next', T.retry, () => location.reload())); });
  return {
    layout(W, H) {
      const p = phone(), rh = rl ? (p ? 112 : Math.min(170, H * .24)) : 0, w = W, hh = Math.min(w / GA, H * .5), gap = p ? 8 : 24, room = H - hh - rh - gap * 2 - (p ? 0 : 8), lh = Math.max(60, Math.min(room, p ? 150 : 250)), lw = lh * .95, used = hh + gap + lh + (rl ? gap + rh : 0), y = p ? 0 : Math.max(0, (H - used) / 2);
      if (p) stage.style.height = Math.max(used + 4, innerHeight * .48) + 'px'; put(ph, 0, y, w, hh); this.b = { x: 0, y, w, hh }; const ly = y + hh + gap;
      loupes.forEach((l, k) => { const on = rl || k === 0; l.el.style.display = l.cap.style.display = on ? '' : 'none'; const x = rl ? (k ? w - lw - (p ? 10 : 0) : (p ? 10 : 0)) : (w - lw) / 2; put(l.el, x, ly, lw, lh); const cw = rl ? Math.min(180, (w - 2 * lw - (p ? 48 : 60)) / 2) : Math.min(180, (w - lw) / 2 - 24); l.cap.style.top = 'auto'; if (rl && k) { put(l.cap, x - cw - 12, ly + (p ? 0 : lh - 50), cw); l.cap.style.textAlign = 'right'; } else { put(l.cap, x + lw + 12, ly + (p ? 0 : lh - 50), cw); l.cap.style.textAlign = 'left'; } });
      if (rl) rl.place(p ? 10 : 0, ly + lh + gap, p ? W - 20 : W, rh);
    },
    refresh() {
      if (!ok || !this.b) return; const b = this.b; let i = idx(), s = scr(pos[i]); const pin = !!st.done.group; who.style.display = rl ? 'none' : ''; who.classList.toggle('pin', pin); if (pin) { i = 4; s = scr(pos[4]); } const R = b.hh * .19, px = O.edgeStretch(Math.atan(pos[i] / D0)); put(ringEl, -R * px, -R, 2 * R * px, 2 * R); who.style.left = b.x + s[0] + 'px'; who.style.top = b.y + s[1] + 'px'; arr.style.top = -R - (phone() ? 26 : 34) + 'px'; arr.style.left = Math.min(0, b.w - s[0] - 40) + 'px'; arr.textContent = pin ? T.pc(edgeOf(4)) : (pos[i] > 100 ? '← ' : '') + T.s4.drag;
      const own = Math.max(0, pulled(gl.heads.honey, pos[idx()], D())); loupes.forEach((l, k) => { const v = rl ? edgeOf(k ? 4 : 0) : own; l.cap.innerHTML = rl ? `<b>${T.pc(v)}</b><br>${T.s4b.who[k]}` : T.s4.who; });
      if (rl) meter(null); else meter(T.p0(own), T.s4.cap); ph.setAttribute('role', 'img'); ph.setAttribute('aria-label', T.s4.do);
    }
  };
};

// ending ------------------------------------------------------------
STEP.end = stage => {
  const A = div('photo', stage), B = div('photo', stage), ca = div('cap', stage), cb = div('cap', stage), h = head;
  views.push(portraitView(A, h, () => 300), portraitView(B, h, () => 1500)); const hh = human();
  say({ kick: '', h: T.end.h }); after(`<ul class="rules">${T.end.rules(T.p0(O.noseGrowth(hh, 600)), T.p0(O.noseGrowth(hh, 300))).map(x => `<li>${x}</li>`).join('')}</ul>`, [btn('next', T.end.save, save, 'save'), btn('lnk', T.end.link, () => copy(url('near'))), btn('lnk', T.end.again, restart)]);
  const m = div('more', $('acts')); m.append(Object.assign(document.createElement('span'), { className: 'kick', textContent: T.end.more }), btn('lnk', T.end.guess, () => go('guess')), btn('lnk', T.end.eye, () => go('eye')), btn('lnk', T.end.studio, () => go('studio')));
  return { layout(W, H) { const p = phone(), gap = p ? 2 : 10, cap = p ? 36 : 54, w = Math.min((W - gap) / 2, (H - cap) * .8), hh = w / .8, x = (W - 2 * w - gap) / 2, y = p ? 0 : Math.max(0, (H - hh - cap) / 2);[[A, ca, 0, 300], [B, cb, 1, 1500]].forEach(([e, c, i, d]) => { put(e, x + i * (w + gap), y, w, hh); put(c, x + i * (w + gap) + (p ? 10 : 0), y + hh + (p ? 4 : 14), w); c.innerHTML = `<b>${T.cm(d)}</b> &nbsp;${T.s3.nose(T.pc(O.noseGrowth(head(), d)))}`; }); }, refresh() { aria(A, 300); aria(B, 1500); } };
};
function restart() { Object.assign(st, { done: {}, d: 200, head: 'plaster', groupB: false, lockA: false, lockB: false, gd: GD, d2: 950 }); go('near'); }
async function save() { const c = poster(gl, head(), T, { portrait: O.portrait, lensZ: O.lensZ, look: LOOK(), dark: dark(), lift: lift(st.head), growth: O.noseGrowth, lang }); kick(); dl(c, 'selfie-30cm-150cm'); }
function dl(canvas, name) { canvas.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name + '.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast(T.saved); }, 'image/png'); }

// extra: the picture is not lying ------------------------------------
STEP.eye = stage => {
  const ph = div('photo', stage), tx = div('eyeText', stage), h = human, res = div('', tx); let answered = null;
  const ed = () => phone() ? 300 : 200, ez = () => phone() ? 1.5 : 1;
  views.push(() => { const b = box(ph), H = h(), W = O.frameW(H) * Math.max(1, b.w / b.h / .8) / ez(); return { ...b, vp: O.portrait(H, ed(), b.w / b.h, { w: W, eyeLine: phone() ? .42 : .455 }), eye: [0, 0, O.lensZ(H, ed())], look: LOOK(), items: [{ head: H, expo: lift(H.name) }] }; });
  const draw = () => { const w = Math.min(ph.clientWidth, ph.clientHeight * .8) * ez() / (phone() ? 160 : 100) * 25.4, v = O.viewingDistance(h(), ed(), w), txt = lang === 'zh' ? `${Math.round(v / 10)} 厘米` : `${Math.round(v / 10)} cm`; tx.replaceChildren(); const H = document.createElement('h2'); H.textContent = T.eye.h; const p1 = document.createElement('p'); p1.textContent = T.eye.p1(T.cm(ed())); const p2 = document.createElement('p'); p2.innerHTML = T.eye.p2(txt); const sm = document.createElement('p'); sm.className = 'kick'; sm.style.display = 'block'; sm.textContent = (phone() ? T.eye.small + ' ' : '') + T.eye.calc; tx.append(H, p1, p2, sm); if (answered) { const r = document.createElement('p'); r.textContent = answered === 'y' ? T.eye.ry : T.eye.rn; tx.append(r, btn('next', T.eye.back, () => go('end'))); } else tx.append(btn('lnk', T.eye.yes, () => { answered = 'y'; draw(); }), btn('lnk', T.eye.no, () => { answered = 'n'; draw(); }), btn('lnk', T.eye.back, () => go('end'))); for (const b of tx.querySelectorAll('button')) b.style.justifySelf = 'start'; };
  return { layout(W, H) { if (phone()) { const hh = H * .56; put(ph, 0, 0, W, hh); put(tx, 18, hh + 12, W - 36); tx.style.maxHeight = H - hh - 12 + 'px'; tx.style.overflow = 'auto'; } else { const w = Math.min(H * .8, W * .62); put(ph, W - w, 0, w, H); put(tx, 0, H * .2, Math.min(420, W - w - 50)); } draw(); } };
};

// extra: guess the distance -------------------------------------------
const today = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
STEP.guess = stage => {
  const seed = st.seed || today(); const g = st.guess && st.guess.seed === seed ? st.guess : (st.guess = { seed, i: 0, list: guessSet(seed), ans: [], d: 600, shown: false }); let ok = g.list.every(x => gl.heads[x.h]);
  const q = () => g.list[Math.min(g.i, 4)], hd = () => gl.heads[q().h] || gl.heads.plaster; const load = ok ? null : div('load', stage, T.loading);
  const p = photoAndRail(stage, { ready: () => ok, min: 150, max: 1800, head: hd, aria: T.railAria, label: T.cm, lines: '', get: () => g.d, set: d => { if (!g.shown) { g.d = d; refresh(); } }, off: () => g.shown }, { mast: false });
  views.push(() => ok && p.ph.style.display !== 'none' ? portraitView(p.ph, hd, () => q().d)() : null);
  const err = (a, t) => Math.abs(a - t) / t, avg = () => g.ans.reduce((s, a, i) => s + err(a, g.list[i].d), 0) / g.ans.length;
  const thumbs = []; const sheet = () => { if (thumbs.length) return; p.ph.style.display = 'none'; rail.el.style.display = 'none'; g.list.forEach((x, i) => { const t = div('photo', stage), c = div('cap', stage, `<b>${T.cm(x.d)}</b><br>${T.guess.you(T.cm(g.ans[i]))}`); thumbs.push([t, c]); views.push(portraitView(t, () => gl.heads[x.h], () => x.d)); }); rail = null; layout(); };
  const ui = () => {
    if (g.i >= 5) { const e = T.cm(g.ans.reduce((x, a, i) => x + Math.abs(a - g.list[i].d), 0) / 5); say({ kick: '', h: T.guess.end(e), d: T.guess.grade[avg() < .15 ? 0 : avg() < .35 ? 1 : 2] }); sheet(); after('', [btn('next', T.guess.share, () => copy(T.guess.shareText(e) + ' ' + url('guess'))), btn('lnk', T.guess.again, () => { st.seed = (seed * 7 + 13) % 100000000; st.guess = null; build(); hash(); })]); return; }
    say({ kick: T.guess.n(g.i + 1, 5), h: T.guess.h, d: g.shown ? '' : T.guess.do });
    if (g.shown) after(`<p class="big">${T.guess.res(T.cm(q().d), T.cm(g.d))}</p>${g.i === 0 ? `<p>${T.guess.tip}</p>` : ''}`, [btn('next', g.i < 4 ? T.guess.next : T.guess.last, () => { g.i++; g.shown = false; g.d = 600; if (rail) rail.moved = false; ui(); refresh(); }, 'next')]);
    else after(g.i === 0 ? `<p class="kick" style="display:block">${T.guess.today}</p>` : '', [btn('next', T.guess.btn, () => { g.ans.push(g.d); g.shown = true; g.moved = false; flash(); ui(); refresh(); hash(); }, 'next')]);
  };
  if (!ok) need(...HUMANS).then(() => { ok = true; load.remove(); refresh(); }, () => { });
  setTimeout(() => { if (g.i >= 5) ui(); }); if (g.i < 5) ui(); return { layout(W, H) { if (!thumbs.length) return p.layout(W, H); const ph = phone(), n = ph ? 3 : 5, gp = ph ? 10 : 18, w = Math.min((W - gp * (n - 1) - (ph ? 36 : 0)) / n, ph ? 999 : (H - 120) * .8), h = w * 1.25, y = ph ? 0 : (H - h) / 2 - 20, x0 = (W - n * w - (n - 1) * gp) / 2; thumbs.forEach(([t, c], i) => { const X = x0 + (i % n) * (w + gp), Y = y + Math.floor(i / n) * (h + 62); put(t, X, Y, w, h); put(c, X, Y + h + 8, w); }); }, refresh() { if (!rail) return; rail.o.goal = g.shown && g.i < 5 ? { d: q().d, text: T.cm(q().d) } : null; } };
};

// extra: studio --------------------------------------------------------
STEP.studio = stage => {
  st.sd ??= 500; const p = photoAndRail(stage, { min: 150, max: 1800, head, aria: T.railAria, label: T.cm, lines: '', quiet: true, tilt: () => st.el, get: () => st.sd, set: d => { st.sd = d; refresh(); }, end: () => hash() }); const sit = dots(stage, ALL, () => st.head, n => { st.head = n; hash(); });
  const cam = (b) => { const h = head(), el = st.el * Math.PI / 180, az = st.az * Math.PI / 180, pv = [0, 0, h.zy[2]], R = O.mul(O.translate(...pv), O.mul(O.rotX(el), O.mul(O.rotY(-az), O.translate(-pv[0], -pv[1], -pv[2])))); const zc = O.lensZ(h, st.sd) - pv[2]; return { vp: O.mul(O.portrait(h, st.sd, b.w / b.h, { eyeLine: .455 + .0 * el }), R), eye: [Math.sin(az) * Math.cos(el) * zc + pv[0], Math.sin(el) * zc, Math.cos(az) * Math.cos(el) * zc + pv[2]] }; };
  views.push(() => { const b = box(p.ph); return { ...b, ...cam(b), look: LOOK(), items: [{ head: head(), expo: lift(st.head) }] }; }); p.ph.classList.add('drag'); let a = null;
  p.ph.addEventListener('pointerdown', e => { a = [e.clientX, e.clientY, st.az, st.el]; p.ph.setPointerCapture(e.pointerId); e.preventDefault(); }); p.ph.addEventListener('pointermove', e => { if (!a) return; st.az = Math.max(-75, Math.min(75, a[2] + (e.clientX - a[0]) * .3)); st.el = Math.max(-40, Math.min(50, a[3] - (e.clientY - a[1]) * .25)); refresh(); }); for (const n of ['pointerup', 'pointercancel']) p.ph.addEventListener(n, () => { if (a) { a = null; hash(); } });
  p.ph.tabIndex = 0; p.ph.addEventListener('keydown', e => { const k = { ArrowLeft: ['az', -3], ArrowRight: ['az', 3], ArrowUp: ['el', 3], ArrowDown: ['el', -3] }[e.key]; if (k) { st[k[0]] = Math.max(k[0] === 'az' ? -75 : -40, Math.min(k[0] === 'az' ? 75 : 50, st[k[0]] + k[1])); refresh(); e.preventDefault(); } });
  say({ h: T.studio.h, d: T.studio.do }); $('acts').replaceChildren(btn('next', T.studio.save, () => { const W = 1600, H = 2000; dl(poster(gl, head(), T, { single: true, W, H, cam, d: st.sd, look: LOOK(), dark: dark(), lift: lift(st.head), lang, growth: O.noseGrowth }), 'portrait'); kick(); }), btn('lnk', T.end.link, () => copy(url('studio'))), btn('lnk', T.studio.reset, () => { st.az = st.el = 0; st.sd = 500; refresh(); hash(); }));
  return { layout(W, H) { p.layout(W, H); const b = p.box; if (phone()) { sit.style.left = '14px'; sit.style.top = b.h - 40 + 'px'; } else { sit.style.left = Math.max(0, b.x - 46) + 'px'; sit.style.top = '6px'; sit.style.flexDirection = 'column'; } }, refresh() { p.setMast(st.sd); meter(Math.abs(st.az) < 12 && Math.abs(st.el) < 12 ? T.pc(O.noseGrowth(head(), st.sd)) : null, T.studio.cap); const s = T.studio.say(st.el); after(`<p>${s}</p>`, [...$('acts').children]); aria(p.ph, st.sd); } };
};

// ---------- url, language, light, toast
function url(step) { const q = new URLSearchParams(); q.set('s', step); if (step === 'near') { q.set('h', st.head); q.set('d', Math.round(st.d / 10)); } if (step === 'studio') { q.set('h', st.head); q.set('d', Math.round(st.sd / 10)); q.set('a', Math.round(st.az)); q.set('e', Math.round(st.el)); } if (step === 'group' && st.groupB) q.set('p', 2); if (step === 'guess') q.set('g', st.seed || today()); if (step === 'why') q.set('d', Math.round((st.d2 || 950) / 10)); if (step === 'zoom' || step === 'why' || step === 'end') q.set('h', st.head); return location.origin + location.pathname + '#' + q; }
let pushed = '';
function hash(push) { const u = url(st.step); if (push && pushed && pushed !== st.step) history.pushState(null, '', u); else history.replaceState(null, '', u); pushed = st.step; }
function readHash() { const q = new URLSearchParams(location.hash.slice(1)), s = q.get('s'), n = (k, a, b, def) => { const v = parseFloat(q.get(k)); return isFinite(v) ? Math.min(b, Math.max(a, v)) : def; }; if (STEP[s]) st.step = s; if (ALL.includes(q.get('h'))) st.head = q.get('h'); if (s === 'near' && q.has('d')) { st.d = n('d', 15, 180, 25) * 10; st.shared = st.d; if (st.d > 320) st.done.near = true; } if (s === 'why') st.d2 = n('d', 15, 105, 95) * 10; if (s === 'group' && q.get('p') === '2') { st.done.group = true; st.groupB = true; st.order = ['terracotta', 'basalt', 'honey', 'child', 'plaster']; } if (s === 'studio') { st.sd = n('d', 15, 180, 50) * 10; st.az = n('a', -75, 75, 0); st.el = n('e', -40, 50, 0); } if (s === 'guess') st.seed = n('g', 1, 99999999, 0) || undefined; }
async function copy(t) { try { await navigator.clipboard.writeText(t); toast(T.copied); } catch { const a = document.createElement('textarea'); a.value = t; document.body.append(a); a.select(); try { document.execCommand('copy'); toast(T.copied); } catch { toast(t); } a.remove(); } }
let tt; function toast(s) { const t = $('toast'); t.textContent = s; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2400); }
function chrome() { document.title = T.title; doc.lang = lang === 'zh' ? 'zh-CN' : 'en'; $('home').textContent = T.home; $('lang').textContent = T.lang; $('about').textContent = T.about; $('light').textContent = dark() ? T.light : T.dark; }
$('lang').onclick = () => { lang = lang === 'zh' ? 'en' : 'zh'; T = S[lang]; store.set('demo.lang', lang); chrome(); if (ready) build(); else boot0(); };
$('light').onclick = () => { doc.dataset.light = dark() ? 'on' : 'off'; store.set('selfie.light', doc.dataset.light); chrome(); kick(); };
$('about').onclick = () => { about($('aboutPage'), lang, T, meta); $('aboutBox').showModal(); $('aboutBox').scrollTop = 0; };
let wasPhone = null; addEventListener('resize', () => { if (!ready) return; const p = phone(); if (wasPhone === null) wasPhone = cur && $('stage').style.height !== ''; if (p !== wasPhone) { wasPhone = p; build(); } else { layout(); refresh(); } }); addEventListener('popstate', () => { if (!ready) return; readHash(); pushed = st.step; build(); }); addEventListener('hashchange', () => { if (!ready || url(st.step).endsWith(location.hash)) return; readHash(); build(); }); document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
$('say').addEventListener('scroll', kick);
addEventListener('keydown', e => { if (e.target.closest?.('[role=slider],.photo')) return; if (e.key === 'Enter' && document.activeElement === document.body) $('next')?.click(); });
function fail(msg) { $('stage').replaceChildren(); const l = div('load', $('stage')); l.style.padding = '24px'; l.textContent = msg; say({ h: T.title, d: '' }); $('steps').style.display = 'none'; }
function boot0() { say({ kick: kicker(1), h: T.s1.h, d: T.s1.do }); meter(null); }
async function main() {
  chrome(); readHash(); boot0(); let l = div('load', $('stage'), T.loading);
  try { gl = new GL($('gl')); } catch (e) { console.info(e.message); return fail(T.nogl); } gl.onrestore = kick;
  try { meta = await (await fetch('assets/meta.json')).json(); await gl.load('plaster', meta.plaster); if (st.head !== 'plaster') await gl.load(st.head, meta[st.head]); } catch (e) { console.info(e.message); fail(T.err); $('acts').replaceChildren(btn('next', T.retry, () => location.reload())); return; }
  ready = true; st.enter = !location.hash.includes('d='); wasPhone = phone(); build(); hash(); window.__all = 1; window.__st = st; window.__api = { kick, O, gl, st, go, pulled, guessSet, human, faceShare, zoomFor };
  // the other sitters arrive quietly, one after another
  const idle = window.requestIdleCallback || (f => setTimeout(f, 600)); const q = HUMANS.slice(1); const nextOne = () => { const n = q.shift(); if (n) gl.load(n, meta[n]).then(() => idle(nextOne), () => { }); }; setTimeout(() => idle(nextOne), 1500);
}
main();
