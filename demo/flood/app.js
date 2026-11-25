import { Sim } from './sim.js';
import { View, EX } from './render.js';
import * as D from './data.js';
import { World, SANDY, FT, enc, dec } from './world.js';
import { T, pickLang } from './i18n.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const ls = { get(k) { try { return localStorage.getItem('flood.' + k); } catch { return null; } }, set(k, v) { try { localStorage.setItem('flood.' + k, v); } catch { } } };
let lang = pickLang(), t = T[lang];
const { U0, V0, W, H, NX, NY, DX, MHHW } = D;
const small = Math.min(screen.width, screen.height) < 600 || /Mobi|Android/i.test(navigator.userAgent), phone = () => innerWidth <= 760, calm = matchMedia('(prefers-reduced-motion:reduce)').matches;
const PHI = .586, LO = -1.5, HI = 4.6, WALLH = 2, BUDGET = 1200, SEAT = MHHW;
const S = { ch: 1, free: false, tool: 'tap', level: 0, target: 0, map: 0, wipe: 0, pin: null, walls: [], shift: 0, night: null, nightPanel: false, rain: new Map(), poured: 0, doors: 0, sub: 0, area: 0, did: {}, result: null, unsettled: 0, chal: false, base: null };
let gl, sim, view, world, cv = $('#gl'), dpr = 1, need = true, stepsN = small ? 10 : 24, ema = 16, last = 0, lastRead = 0, hist = [];

// ---------- numbers
const len = (m, d = 1) => lang === 'zh' ? (Math.abs(m) < .995 && d === 1 ? Math.round(m * 100) + ' 厘米' : m.toFixed(d) + ' 米') : (m / FT).toFixed(d) + ' ft';
const lev = m => lang === 'zh' ? m.toFixed(1) + ' 米' : (m / FT).toFixed(1) + ' ft';
const dist = m => lang === 'zh' ? Math.round(m / 10) * 10 + ' 米' : Math.round(m / FT / 20) * 20 + ' ft';
const num = n => Math.round(n).toLocaleString('en-US');
const clock = h => { h = ((h % 24) + 24) % 24; const m = Math.round(h * 60) % 1440, hh = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0'); return lang === 'zh' ? hh + ':' + mm : `${hh % 12 || 12}:${mm} ${hh < 12 ? 'am' : 'pm'}`; };

// ---------- start
async function boot() {
  words(); $('#loadt').textContent = t.loading;
  if (!new URLSearchParams(location.search).has('flat')) { try { gl = cv.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false }); } catch { } }
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return flat();
  let got = 0; const total = 2100000, onp = n => { got += n; $('#loadb').style.width = Math.min(100, got / total * 100) + '%'; }, L = n => D.gz('data/' + n + '.gz', onp);
  let g, gr, b, th, z, nm, bs;
  try { [g, gr, b, th, z, nm, bs] = await Promise.all(['grid.bin', 'ground.bin', 'bld.bin', 'thr.bin', 'zone.bin', 'names.json', 'base.bin'].map(L)); } catch (e) { return e.message === 'nogzip' ? flat() : fail(t.loadErr); }
  const grid = D.parseGrid(g), bld = D.parseBld(b), names = JSON.parse(new TextDecoder().decode(nm));
  try { sim = new Sim(gl, { nx: NX, ny: NY, dx: DX, bed: grid.bed, sea: SEAT }); } catch (e) { if (e.message === 'nofloat') return flat(g, th); throw e; }
  world = new World(names, grid.bed, new Uint8Array(th), new Uint8Array(z), bld); world.z0 = sim.z0;
  S.base = new Uint8Array(bs); S.baseDoors = world.wetDoors(k => S.base[k] / 50); S.baseSub = subWet(k => S.base[k] / 50);
  view = new View(gl, sim, { ground: D.parseGround(gr), bld, small }); view.setZone(world.zone);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); fail(t.lost); });
  sim.initProbes([[0, 0]]); applyTheme(); resize();
  try { await Promise.race([document.fonts.load('500 40px Jost'), new Promise(r => setTimeout(r, 1500))]); } catch { }
  view.onSea = (x, y) => { const k = world.cell(x, y); return k < 0 || world.isSea(k); }; labels(); dots(); bind(); new ResizeObserver(() => staff()).observe($('#staff')); frameCam(true); readHash(); staff(); if (!S.free) go(S.ch, true); else free(true);
  step0(); requestAnimationFrame(loop); $('#load').classList.add('off'); setTimeout(() => $('#load').hidden = true, 700);
  loadMap();
  window.__flood = { setPin, setLevel, mapTo, playNight, setShift, tool, pourAt, endPour, commitWalls, ida, chalStart, story, S, sim, view, world, go, free, runNight, state, hashNow, doors: () => world.wetDoors(k => sim.read()[k * 4]), frame };
}
let mapP; const loadMap = () => mapP ||= (async () => { const im = new Image(); im.src = small ? 'data/viele.webp' : 'data/viele2.webp'; try { await im.decode(); view.image('map', im); need = true; } catch { } })();
function step0() { sim.sea = SEAT + S.level; sim.surface(); }
function fail(msg) { $('#load').hidden = false; $('#load').classList.remove('off'); $('#load').classList.add('err'); $('#load').firstElementChild.innerHTML = `<p>${msg}</p><p><button class="go" onclick="location.reload()">${t.reload}</button></p>`; }

// ---------- flat version without float textures
async function flat(g, th) {
  try { g ||= await D.gz('data/grid.bin.gz'); th ||= await D.gz('data/thr.bin.gz'); } catch (e) {
    $('#load').classList.add('err'); $('#load').firstElementChild.innerHTML = `<p>${t.errT}</p><img src="cover.jpg" alt="" style="width:100%;margin-top:14px">`; return; }
  const { bed, sea } = D.parseGrid(g), thr = new Uint8Array(th), box = $('#load'); box.classList.add('err'); box.hidden = false; box.style.zIndex = 4;
  box.firstElementChild.innerHTML = `<p>${t.errT} ${t.errP}</p><canvas id="flatc" width="${NX}" height="${NY}" role="img" aria-label="${t.desc}"></canvas><input id="flatr" type="range" min="0" max="${HI}" step="0.05" value="0" aria-label="${t.above}"><p id="flatt"></p>`;
  const c = $('#flatc').getContext('2d'), im = c.createImageData(NX, NY), dark = document.documentElement.dataset.theme === 'dark';
  const draw = v => { const L = (v + MHHW) / .03; let wet = 0; for (let k = 0; k < NX * NY; k++) { const j = NY - 1 - Math.floor(k / NX), o = (j * NX + k % NX) * 4, s = sea[k], w = !s && bed[k * 4 + 1] > .01 && thr[k] <= L; if (w) wet++; const f = bed[k * 4 + 1] < .5 && !s; const col = s ? [56, 112, 122] : w ? [126, 178, 178] : f ? (dark ? [70, 72, 74] : [246, 245, 241]) : (dark ? [44, 46, 48] : [214, 213, 209]); im.data.set([...col, 255], o); } c.putImageData(im, 0, 0); $('#flatt').innerHTML = `${lev(v)} ${t.above} · ${(wet * 64e-6).toFixed(1)} km² ${t.r_area}`; };
  $('#flatr').oninput = e => draw(+e.target.value); $('#flatr').value = SANDY; draw(SANDY); window.__flat = true;
}

// ---------- words
function words() {
  t = T[lang]; document.documentElement.lang = lang; document.title = t.title; $('meta[name=description]').content = t.desc;
  $('#title').textContent = t.title; $('#home').textContent = t.home; $('#lang').textContent = t.lang; $('#theme').setAttribute('aria-label', t.theme); $('#theme').title = t.theme;
  cv.setAttribute('aria-label', t.desc); $('#skip').textContent = t.skip; $('#prev').textContent = t.prev; $('#next').textContent = t.next; $('#find').placeholder = t.find; $('#find').setAttribute('aria-label', t.find);
  $('#share').textContent = t.share; $('#save').textContent = t.save; $('#aboutb').textContent = t.about; $('#startb').textContent = t.start; $('#aboutt').innerHTML = t.aboutHtml; $$('[data-x]').forEach(b => b.setAttribute('aria-label', t.close));
  for (const b of $$('#tools button')) { const k = b.dataset.tool || { map: 'map', night: 'nightT', undo: 'undo', reset: 'reset', more: 'more' }[b.dataset.act]; b.querySelector('span').textContent = t[k]; b.setAttribute('aria-label', t[k]); }
  $('#staff').setAttribute('aria-label', t.above); $('#wipe').setAttribute('aria-label', '1865'); $('#graph').setAttribute('aria-label', t.storm);
}
function setLang(l) { lang = l; ls.set('lang', l); words(); if (view) { labels(); staff(); story(); pin(); graph(); readout(); if ($('#end').open) endCard(); need = true; } }
function applyTheme() { const m = document.documentElement.dataset.theme, dark = m ? m === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches; if (view.dark !== dark || !view.themed) { view.setTheme(dark); view.themed = true; $('meta[name=theme-color]').content = dark ? '#111314' : '#e6e6e4'; staffW(); } need = true; }

// ---------- labels on the model
function labels() {
  const L = [], used = new Map(), zh = lang === 'zh';
  for (const [n, b, lines] of world.streets) { if (/Loop$|Aly$|Walk$/.test(n)) continue; const h = /Ave|Broadway|Bowery|Houston|Canal|Delancey|West St$|14th|FDR/.test(n) ? 19 : 14; const need_ = n.length * h * .56 + 14;
    for (const l of lines) for (let k = 0; k + 3 < l.length; k += 2) { const dx = l[k + 2] - l[k], dy = l[k + 3] - l[k + 1], s = Math.hypot(dx, dy); if (s < need_) continue; const c = Math.max(1, Math.floor(s / 620)); for (let i = 0; i < c; i++) { const x = l[k] + dx * (i + .5) / c, y = l[k + 1] + dy * (i + .5) / c, o = used.get(n) || []; if (o.some(p => Math.hypot(p[0] - x, p[1] - y) < 260)) continue; o.push([x, y]); used.set(n, o); L.push({ t: n, x, y, dx: dx / s, dy: dy / s, h, k: 0 }); } } }
  const a = .30, wt = (tx, x, y, dx, dy, h) => L.push({ t: tx, x, y, dx, dy, h, k: 1 });
  wt(zh ? '哈得孙河' : 'HUDSON RIVER', -1330, 1330, -.30, .954, 150); wt(zh ? '东河' : 'EAST RIVER', 1560, 1830, .81, .59, 130); wt(zh ? '东河' : 'EAST RIVER', 2330, 3900, -.33, .944, 130); wt(zh ? '上纽约湾' : 'UPPER BAY', 190, -400, .985, .17, 112);
  const mvd = { 'Financial District': [120, -190], 'Alphabet City': [90, -170], 'East Village': [-160, 60], 'Battery Park City': [-60, 60], 'West Village': [-40, -60] }; for (const [n, z, x0, y0] of world.hoods) { const [mx, my] = mvd[n] || [0, 0], x = x0 + mx, y = y0 + my; L.push({ t: zh ? z : n.toUpperCase(), x, y, dx: 1, dy: 0, h: zh ? 78 : 66, k: 2 }); }
  for (const [n, z, x, y] of world.marks) L.push({ t: zh ? z : n, x, y: y + 14, dx: 1, dy: 0, h: 21, k: 2 });
  view.dpr = dpr; view.setLabels(L);
}
function subWet(f) { const o = new Uint8Array(world.ent.length); let n = 0; world.ent.forEach(([x, y], i) => { const k = world.nearOpen(x, y, 2); if (k >= 0 && f(k) >= .15) { o[i] = 1; n++; } }); return { n, o }; }
function dots(o) { view.setDots(world.ent, o); }

// ---------- camera
const home = () => { const p = phone(); if (p) { const a = innerWidth / innerHeight; return { x: 430, y: 1980, d: Math.min(17500, 7700 / a * .95), az: 0, el: 60 }; } const k = Math.max(1, 1.6 / (innerWidth / innerHeight)); return { x: 760, y: 2090, d: 11000 * k ** .5, az: -10, el: 48 }; };
let fly = null;
function frameCam(now, to) { const c = to || home(); if (now || calm) Object.assign(view.cam, c), need = true; else fly = { a: { ...view.cam }, b: { ...view.cam, ...c }, t: 0 }; shift(); }
function shift() { document.body.classList.remove('ended'); view.shift = phone() ? [0, shY] : [.285, 0]; }
function resize() { const w = innerWidth, h = innerHeight; dpr = Math.min(devicePixelRatio || 1, S.maxDpr || (small ? 2 : 2)); if (w * h * dpr * dpr > 7.5e6) dpr = Math.sqrt(7.5e6 / w / h); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); if (view) { view.dpr = dpr; shift(); staff(); graph(); placeNight(); if (world) fit(); need = true; } }
function clampCam() { const c = view.cam; c.x = Math.max(U0, Math.min(U0 + W, c.x)); c.y = Math.max(V0, Math.min(V0 + H, c.y)); c.d = Math.max(500, Math.min(19000, c.d)); c.el = Math.max(18, Math.min(86, c.el)); need = true; moved(); }
const ndc = (x, y) => [x / innerWidth * 2 - 1, 1 - y / innerHeight * 2];
function plane(x, y, z = 8) { view.aspect = innerWidth / innerHeight; view.matrices(innerWidth, innerHeight); const d = view.ray(...ndc(x, y)), o = view.eye; if (d[2] > -.02) return null; const k = (z - o[2]) / d[2]; return [o[0] + d[0] * k, o[1] + d[1] * k]; }
function hit(x, y, b = true) { view.aspect = innerWidth / innerHeight; view.matrices(innerWidth, innerHeight); return view.pick(...ndc(x, y), b); }
function screenOf(x, y, z) { view.aspect = innerWidth / innerHeight; view.matrices(innerWidth, innerHeight); const p = view.project(x, y, z); return [(p[0] + 1) / 2 * innerWidth, (1 - p[1]) / 2 * innerHeight, p[2]]; }

// ---------- input on the model
const P = new Map(); let mode = null, g0 = null, stroke = null, tapAt = null;
function bind() {
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); P.set(e.pointerId, [e.clientX, e.clientY]); fly = null; closeMenu(); cv.focus({ preventScroll: true });
    if (P.size === 2) { endStroke(true); mode = 'two'; g0 = two(); return; } if (P.size > 2) return;
    tapAt = [e.clientX, e.clientY, performance.now(), false];
    if (e.button === 2 || e.altKey) { mode = 'orbit'; return; } if (e.button === 0 && !e.shiftKey && S.ch === 2 && !S.free && S.map) { mode = 'wipe'; tapAt = [e.clientX, e.clientY, 0, false]; return; } if (e.button === 1 || e.shiftKey || S.tool === 'tap') { mode = 'pan'; g0 = plane(e.clientX, e.clientY); return; }
    if (S.tool === 'rain') { mode = 'rain'; pour(e.clientX, e.clientY, true); } else if (S.tool === 'wall') { mode = 'wall'; startWall(e.clientX, e.clientY); } });
  cv.addEventListener('pointermove', e => { const p = P.get(e.pointerId); if (!p) { hover(e); return; } const dx = e.clientX - p[0], dy = e.clientY - p[1]; P.set(e.pointerId, [e.clientX, e.clientY]); if (tapAt && Math.hypot(e.clientX - tapAt[0], e.clientY - tapAt[1]) > (e.pointerType === 'touch' ? 10 : 5)) tapAt[3] = true;
    if (mode === 'two' && P.size >= 2) { const g = two(), c = view.cam; if (g0.p) { c.d *= g0.r / g.r; c.az += (g.a - g0.a) * 180 / Math.PI; const q = plane(g.x, g.y); if (q) { c.x += g0.p[0] - q[0]; c.y += g0.p[1] - q[1]; } clampCam(); g0 = two(); } return; }
    if (mode === 'orbit') { view.cam.az -= dx * .25; view.cam.el += dy * .2; clampCam(); }
    else if (mode === 'pan') { if (tapAt && !tapAt[3]) return; if (!g0) g0 = plane(e.clientX, e.clientY); const q = plane(e.clientX, e.clientY); if (q && g0) { view.cam.x += g0[0] - q[0]; view.cam.y += g0[1] - q[1]; clampCam(); } }
    else if (mode === 'wipe') { if (tapAt[3]) wipeSet(e.clientX); } else if (mode === 'rain') pour(e.clientX, e.clientY); else if (mode === 'wall') moveWall(e.clientX, e.clientY); });
  const up = e => { if (!P.has(e.pointerId)) return; P.delete(e.pointerId); if (mode === 'two') { if (P.size < 2) { mode = P.size ? 'none' : null; } return; }
    if (mode === 'pan' && tapAt && !tapAt[3] && e.type === 'pointerup') tap(e.clientX, e.clientY); if (mode === 'rain') endPour(); if (mode === 'wall') endStroke(); if (!P.size) mode = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', () => { if (!P.size) { view.ring[3] = 0; need = true; } });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { e.preventDefault(); fly = null; const c = view.cam; if (e.ctrlKey || !e.shiftKey) { const a = plane(e.clientX, e.clientY); c.d *= Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * (e.ctrlKey ? .008 : .0022)); c.d = Math.max(500, Math.min(19000, c.d)); const b = plane(e.clientX, e.clientY); if (a && b) { c.x += a[0] - b[0]; c.y += a[1] - b[1]; } } else { c.az += e.deltaY * .1; } clampCam(); }, { passive: false });
  addEventListener('resize', () => { resize(); if (!S.moved) frameCam(true); }); matchMedia('(prefers-color-scheme:dark)').addEventListener('change', applyTheme);
  $('#lang').onclick = () => setLang(lang === 'en' ? 'zh' : 'en'); $('#theme').onclick = () => { const d = !view.dark; document.documentElement.dataset.theme = d ? 'dark' : 'light'; ls.set('theme', d ? 'dark' : 'light'); applyTheme(); };
  $('#next').onclick = () => S.ch < 5 ? go(S.ch + 1) : free(); $('#prev').onclick = () => go(S.ch - 1); $('#skip').onclick = () => S.free ? go(S.from > 1 ? S.from : 1) : free(); $('#backb').onclick = () => { closeMenu(); go(S.from || 1); };
  $$('#tools button').forEach(b => b.onclick = () => b.dataset.tool ? tool(b.dataset.tool) : act(b.dataset.act));
  $('#share').onclick = share; $('#save').onclick = () => save(); $('#aboutb').onclick = () => { closeMenu(); $('#about').showModal(); $('#about').scrollTop = 0; }; $('#startb').onclick = () => { closeMenu(); restart(); };
  $$('[data-x]').forEach(b => b.onclick = () => { b.closest('dialog').close(); shift(); need = true; }); $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
  bindStaff(); bindWipe(); bindGraph(); bindFind(); document.addEventListener('keydown', keys); document.addEventListener('visibilitychange', () => { last = 0; if (document.hidden) endPour(); });
}
const two = () => { const [a, b] = [...P.values()], x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2; return { x, y, r: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, a: Math.atan2(b[1] - a[1], b[0] - a[0]), p: plane(x, y) }; };
function hover(e) { if (e.pointerType === 'touch') return; const p = (S.tool === 'rain' || S.tool === 'wall') && hit(e.clientX, e.clientY, false); if (p && S.tool === 'rain') { view.ring = [p[0], p[1], 110, 1]; need = true; } else if (view.ring[3]) { view.ring[3] = 0; need = true; } }
function keys(e) {
  if (e.target.closest('input')) return; if (e.key === 'Escape' && $('#end').open) { $('#end').close(); shift(); need = true; return; } if ($('#about').open) return; if (e.metaKey || e.ctrlKey) { if (e.key === 'z') { e.preventDefault(); act('undo'); } return; }
  const on = e.target.closest('#staff,#wipe,#graph'); if (on) return; const c = view.cam, s = c.d * .04, k = e.key, a = c.az * Math.PI / 180, mv = (x, y) => { c.x += (x * Math.cos(a) - y * Math.sin(a)) * s; c.y += (x * Math.sin(a) + y * Math.cos(a)) * s; clampCam(); };
  if (k === 'Escape') { closeMenu(); return; } if (e.target.closest('button,a') && (k === 'Enter' || k === ' ')) return;
  const M = { ArrowLeft: () => mv(-1, 0), ArrowRight: () => mv(1, 0), ArrowUp: () => mv(0, 1), ArrowDown: () => mv(0, -1), '+': () => { c.d *= .88; clampCam(); }, '=': () => { c.d *= .88; clampCam(); }, '-': () => { c.d *= 1.14; clampCam(); }, q: () => { c.az -= 6; clampCam(); }, e: () => { c.az += 6; clampCam(); }, l: () => tool('tap'), r: () => tool('rain'), w: () => tool('wall'), m: () => act('map'), n: () => act('night'), u: () => act('undo'), '/': () => { openMenu(); $('#find').focus(); }, Enter: () => { const p = S.tool === 'rain' ? null : [innerWidth * (phone() ? .5 : .58), innerHeight * (phone() ? .55 : .5)]; if (p) tap(...p); else { pourAt(view.cam.x, view.cam.y); setTimeout(endPour, 900); } }, ' ': () => S.night ? stopNight() : (S.nightPanel || S.ch === 3 || S.ch === 5) && playNight() };
  if (M[k]) { e.preventDefault(); M[k](); }
}

// ---------- tap a street
function tap(x, y) {
  const p = hit(x, y); if (!p) { toast(t.outside); return; } let k0 = world.cell(p[0], p[1]); if (k0 >= 0 && world.isSea(k0)) { toast(t.wetWater); return; }
  setPin(world.nearOpen(p[0], p[1]), p);
}
function setPin(k, fly_, name) {
  if (k < 0) { toast(t.outside); return; } const [x, y] = world.xy(k); S.pin = { k, x, y, name: name || world.place(x, y), at: world.wetAt(k), max: 0, d: 0 }; sim.setPoint(0, [k % NX, Math.floor(k / NX)]); S.did.tap = true;
  if (S.ch === 1 && !S.free) { const lim = 4.5, a = S.pin.at; S.target = a === null || a > lim ? lim : Math.max(0, a + .12); S.unsettled = 1; S.pin.rise = true; S.level = Math.min(S.level, S.target); }
  else S.unsettled = Math.max(S.unsettled, .3); story(); pin(); save_(); need = true;
}
const pname = n => !n ? t.build : n.length < 2 ? n[0] : n[2] ? n[0] + (lang === 'zh' ? ' 和 ' : ' & ') + n[1] : t.near(n[0], n[1]);
function pin() {
  const el = $('#pin'), l = $('#pinl'), c = $('#pinc'); if (!S.pin || $('dialog[open]') && 0) { el.hidden = true; l.style.display = c.style.display = 'none'; return; }
  const P_ = S.pin, z = Math.max(view.groundAt(P_.x, P_.y), 0) * EX + 4, [sx, sy, w] = screenOf(P_.x, P_.y, z), up = phone() ? 46 : 74, d = P_.d;
  const top = phone() ? Math.min(innerHeight * .33, 290) : 70; let bx = sx + 14, by = sy - up; l.style.display = c.style.display = ''; c.setAttribute('cx', sx); c.setAttribute('cy', sy);
  const ph = 34, sc = ph / 1.7, dh = Math.min(d, 2.4) * sc;
  const html = `<b>${pname(P_.name)}</b>` + (d > .02 ? `<div class="fig"><svg width="34" height="50" viewBox="0 0 34 50" aria-hidden="true"><g transform="translate(17 48)"><circle cx="0" cy="${-ph + 3.5}" r="3.5" fill="currentColor" stroke="none"/><path d="M0 ${-ph + 8}V-14M0-14L-4 0M0-14L4 0M-6-18L0 ${-ph + 10}L6-18"/><rect x="-17" y="${-dh}" width="34" height="${dh}" fill="var(--glass)" fill-opacity=".55" stroke="none"/><path d="M-17 ${-dh}h34" stroke="var(--glass)"/></g></svg><div><div class="big">${len(d)}</div><small>${d > 1.7 ? t.overhead : t.depth}</small></div></div>` : `<small>${P_.at !== null && S.level >= P_.at && !S.night ? t.coming : t.dry + (P_.at !== null ? ' · ' + t.wetat(lev(Math.max(0, P_.at))) : '')}</small>`);
  if (el._h !== html) { el.innerHTML = html; el._h = html; } el.hidden = false; const r = el.getBoundingClientRect(); if (bx + r.width > innerWidth - (phone() ? 72 + (Math.abs(by - $('#staff').getBoundingClientRect().top - $('#hand').offsetTop) < 120 ? 66 : 0) : 250)) bx = sx - r.width - 14; bx = Math.max(8, bx); by = Math.max(top, by - r.height / 2); by = Math.min(by, innerHeight - r.height - (phone() ? 100 : 60)); el.style.left = bx + 'px'; el.style.top = by + 'px';
  l.setAttribute('x1', sx); l.setAttribute('y1', sy); l.setAttribute('x2', bx > sx ? bx : bx + r.width); l.setAttribute('y2', by + r.height / 2);
  const off = w < 0 || sx < -40 || sx > innerWidth + 40 || sy < 0 || sy > innerHeight; el.style.visibility = off ? 'hidden' : ''; l.style.visibility = c.style.visibility = off ? 'hidden' : '';
}

// ---------- rain
let brushOn = false;
const ringR = () => Math.max(70, Math.min(200, view.cam.d * .012));
function pour(x, y) { const p = hit(x, y, false); if (!p) { endPour(); return; } pourAt(p[0], p[1]); }
function pourAt(x, y) { brushOn = [x, y]; const r = ringR(); sim.brush = [(x - U0) / DX, (y - V0) / DX, r / DX, .0026]; view.ring = [x, y, r, 1]; view.rainFx = [x, y, r, Math.max(520, view.cam.d * .12)]; view.rainAmt = 1; view.rainN = 150; S.unsettled = 4; S.did.pour = (S.did.pour || 0); need = true; }
function endPour() { if (!brushOn) return; brushOn = false; sim.brush = [0, 0, 1, 0]; view.ring[3] = 0; need = true; story(); save_(); }
function ida() { S.ida = 3600; S.did.ida = true; sim.rain = .080 / 3600 / PHI; view.rainFx = [U0 + W / 2 - 300, V0 + H / 2, 3200, 1500]; view.rainN = 420; view.rainAmt = .55; S.unsettled = 6; story(); }

// ---------- walls
const budgetLeft = () => Math.max(0, BUDGET - world.wallLength(S.walls));
function startWall(x, y) { S.auto = false; const p = hit(x, y, false); if (!p) return; if (S.chal && budgetLeft() < 8) { toast(t.left + ': 0'); return; } stroke = [p]; S.walls.push(stroke); }
function moveWall(x, y) { if (!stroke) return; const p = hit(x, y, false); if (!p) return; const q = stroke[stroke.length - 1], d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < Math.max(7, view.cam.d * .0016)) return; let e = p; if (S.chal) { const left = budgetLeft(); if (left <= 1) { endStroke(); toast(t.left + ': 0'); return; } if (d > left) e = [q[0] + (p[0] - q[0]) * left / d, q[1] + (p[1] - q[1]) * left / d]; } stroke.push(e); view.setWalls(S.walls, WALLH); story(true); need = true; }
function endStroke(drop) { if (!stroke) return; if (drop || stroke.length < 2) S.walls = S.walls.filter(l => l !== stroke); else { if (stroke.filter(p => view.onSea(p[0], p[1])).length > stroke.length * .5) toast(t.onland); simplify(stroke); S.did.wall = true; S.did.pourAtWall = S.poured; hist.push('w'); } stroke = null; commitWalls(); story(); save_(); }
function simplify(l) { const f = (a, b) => { let m = 0, j = -1; for (let i = a + 1; i < b; i++) { const [x, y] = l[i], vx = l[b][0] - l[a][0], vy = l[b][1] - l[a][1], d = Math.abs((x - l[a][0]) * vy - (y - l[a][1]) * vx) / (Math.hypot(vx, vy) || 1); if (d > m) { m = d; j = i; } } return m > 3 ? [...f(a, j), ...f(j, b).slice(1)] : [l[a], l[b]]; }; const r = f(0, l.length - 1); l.length = 0; l.push(...r); }
function commitWalls() { sim.setWalls(world.wallCells(S.walls, WALLH)); view.setWalls(S.walls, WALLH); S.unsettled = Math.max(S.unsettled, 2); need = true; }

// ---------- tools
function tool(k) { if (S.night) return; S.tool = k; document.body.classList.toggle('rain', k === 'rain'); document.body.classList.toggle('wall', k === 'wall'); toolsUI(); if (S.free) toast(hintOf(k)); view.ring[3] = 0; }
const hintOf = k => ({ tap: t.tapHint, rain: t.rainHint, wall: t.wallHint }[k] + (k === 'tap' ? '' : ' ' + (matchMedia('(pointer:coarse)').matches ? t.two : t.right)));
function toolsUI() { $$('#tools button').forEach(b => { const on = b.dataset.tool ? b.dataset.tool === S.tool : b.dataset.act === 'map' ? S.map > .5 : b.dataset.act === 'night' ? S.nightPanel : b.dataset.act === 'more' ? !$('#menu').hidden : false; b.classList.toggle('on', on); if (b.dataset.tool || ['map', 'night'].includes(b.dataset.act)) b.setAttribute('aria-pressed', on); }); $('#tools [data-act=undo]').disabled = !hist.length && !S.walls.length; }
function act(k) {
  if (k === 'map') { mapTo(S.map > .5 ? 0 : 1); } else if (k === 'night') { if (S.night) stopNight(); S.nightPanel = !S.nightPanel; if (!S.free && S.nightPanel) free(true); placeNight(); story(); } else if (k === 'undo') { if (S.walls.length) { S.auto = false; S.walls.pop(); hist.pop(); commitWalls(); story(); save_(); } } else if (k === 'reset') { mapTo(0, true); S.nightPanel = false; S.shift = 0; S.did.played = S.did.shift = false; if (S.free) { reset(); placeNight(); story(); } else { const n = S.ch; if (n === 2) S.did.map = false; reset(); go(n); } toast(t.resetDone); } else if (k === 'more') $('#menu').hidden ? openMenu() : closeMenu(); toolsUI();
}
function openMenu() { $('#menu').hidden = false; document.body.classList.add('menuopen'); $('#backb').hidden = !S.free || !(S.from > 1); $('#backb').textContent = t.backTo(S.from); hits(''); toolsUI(); } function closeMenu() { if ($('#menu').hidden) return; $('#menu').hidden = true; document.body.classList.remove('menuopen'); toolsUI(); }
function reset(keep) { if (S.night) stopNight(true); brushOn = false; sim.brush = [0, 0, 1, 0]; sim.rain = 0; S.ida = 0; view.rainAmt = 0; S.walls = []; hist = []; S.rain.clear(); S.poured = 0; S.pin = keep ? S.pin : null; S.level = S.target = 0; S.result = null; view.diffOn = 0; sim.seaFn = null; sim.sea = SEAT; sim.setWalls([]); view.setWalls([], WALLH); sim.reset(null); S.unsettled = .3; staffW(); story(); pin(); readout(); dots(); save_(); need = true; }
function restart() { S.did = {}; S.result = null; S.chal = false; mapTo(0, true); reset(); S.shift = 0; S.moved = false; frameCam(false); go(1); }

// ---------- 1865
let wipeAnim = null;
function mapTo(v, now) { loadMap(); S.map = v; view.zoneOn = v ? 1 : 0; sim.fill = v > 0; sim.dirty = true; view.mapOn = v > 0 ? 1 : view.mapOn; $('#wipe').hidden = v === 0; const to = v > 0 ? 1 : 0; if (now || calm) { S.wipe = to; wipeAnim = null; if (!v) view.mapOn = 0; } else wipeAnim = to; wipeUI(); toolsUI(); if (S.free) story(); save_(); need = true; }
function wipeX(f) { return U0 - 200 + f * (W + 400); }
function wipeUI() { view.wipeX = wipeX(S.wipe); const w = $('#wipe'); if (w.hidden) return; const y = view.cam.y, [sx] = screenOf(wipeX(S.wipe), y, 20); const lo = phone() ? 30 : 470, hi = innerWidth - (phone() ? 100 : 270); w.style.left = Math.max(lo, Math.min(hi, sx)) + 'px'; w.setAttribute('aria-valuenow', Math.round(S.wipe * 100)); w.setAttribute('aria-valuemin', 0); w.setAttribute('aria-valuemax', 100); }
let wipeSet; function bindWipe() { const w = $('#wipe'); let on = false; const set = wipeSet = x => { const lo = phone() ? 30 : 470, hi = innerWidth - (phone() ? 100 : 270); let f; if (x <= lo + 2) f = 0; else if (x >= hi - 2) f = 1; else { const q = plane(x, innerHeight * .5, 20); f = q ? (q[0] - U0 + 200) / (W + 400) : S.wipe; } S.wipe = Math.max(0, Math.min(1, f)); wipeAnim = null; view.mapOn = 1; S.map = 1; sim.fill = true; sim.dirty = true; if (S.wipe > .5 && !S.did.map) { S.did.map = true; story(); } wipeUI(); need = true; save_(); };
  w.addEventListener('pointerdown', e => { on = true; w.setPointerCapture(e.pointerId); set(e.clientX); }); w.addEventListener('pointermove', e => on && set(e.clientX)); w.addEventListener('pointerup', () => on = false); w.addEventListener('pointercancel', () => on = false);
  w.addEventListener('keydown', e => { const d = { ArrowLeft: -.04, ArrowRight: .04, Home: -1, End: 1 }[e.key]; if (d) { e.preventDefault(); S.wipe = Math.max(0, Math.min(1, S.wipe + d)); view.mapOn = 1; if (S.wipe > .5) { S.did.map = true; story(); } wipeUI(); need = true; } }); }

// ---------- tide staff
const SY = v => 1 - (v - LO) / (HI - LO);
function staff() {
  const el = $('#staff'), r = $('#rule'), w = el.clientWidth, h = el.clientHeight; if (!h) return; r.setAttribute('viewBox', `0 0 ${w} ${h}`); const bw = phone() ? 52 : 66; let s = `<rect class="bd" x="${w - bw}" y="-14" width="${bw + 8}" height="${h + 46}"/><rect class="w" id="rw" x="${w - 14}" width="14"/>`; const zh = lang === 'zh', st = zh ? .25 : FT, n0 = Math.ceil(LO / st), n1 = Math.floor(HI / st);
  for (let i = n0; i <= n1; i++) { const v = i * st, y = SY(v) * h, big = zh ? i % 4 === 0 : i % 5 === 0; s += `<path class="t" d="M${w - 14 - (big ? 15 : 7)} ${y}H${w - 14}" ${big ? '' : 'opacity=".45"'}/>`; if (big) s += `<text x="${w - 34}" y="${y + 4.5}" text-anchor="end">${zh ? v.toFixed(0) : i}</text>`; }
  s += `<path class="t" d="M${w - 14} 0V${h}M${w} 0V${h}"/><text class="u" x="${w}" y="${h + 22}" text-anchor="end">${zh ? '米' : 'ft'}</text>`;
  for (const [v, k] of [[.914, t.t2100], [SANDY, t.sandy]]) { const y = SY(v) * h; s += `<g class="m" data-y="${y}"><path d="M${w - 14} ${y}h14" stroke="var(--acc)" stroke-width="2"/><text x="${w - bw - 10}" y="${y + 4.5}" text-anchor="end">${phone() ? (v === SANDY ? t.nightT : '2100') : k}</text></g>`; }
  r.innerHTML = s; $$('#rule g.m text').forEach(x => { const b = x.getBBox(), q = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); q.setAttribute('class', 'bd'); q.setAttribute('x', b.x - 9); q.setAttribute('y', b.y - 4); q.setAttribute('width', b.width + 20); q.setAttribute('height', b.height + 8); x.before(q); }); staffW();
}
function staffW() { const el = $('#staff'), h = el.clientHeight, v = S.level, y = SY(Math.max(LO, Math.min(HI, v))) * h, rw = $('#rw'); if (!rw) return; rw.setAttribute('y', y); rw.setAttribute('height', Math.max(0, h - y)); $('#hand').style.top = y + 'px'; $('#hv').textContent = lev(Math.abs(v) < .02 ? 0 : v); el.setAttribute('aria-valuemin', LO); el.setAttribute('aria-valuemax', HI); el.setAttribute('aria-valuenow', v.toFixed(2)); el.setAttribute('aria-valuetext', `${lev(Math.abs(v))} ${v < -.02 ? t.below : t.above}`);
  $('#hl').textContent = Math.abs(v - SANDY) < .03 ? t.atSandy : Math.abs(v - .914) < .03 ? t.t2100 : Math.abs(v) < .02 ? t.at0 : v < 0 ? t.below : t.above;
  $$('#rule g.m text,#rule g.m rect').forEach(m => { m.style.opacity = Math.abs(+m.parentNode.dataset.y - y) < (phone() ? 26 : 44) ? 0 : 1; }); $$('#rule>text:not(.u)').forEach(m => { m.style.opacity = Math.abs(+m.getAttribute('y') - 4.5 - y) < 15 ? 0 : 1; }); }
function bindStaff() { const el = $('#staff'); let on = false; const set = e => { const r = el.getBoundingClientRect(); let v = LO + (1 - (e.clientY - r.top) / r.height) * (HI - LO); if (Math.abs(v - SANDY) < .06) v = SANDY; if (Math.abs(v) < .06) v = 0; setLevel(v); };
  el.addEventListener('pointerdown', e => { if (S.night) return; on = true; el.setPointerCapture(e.pointerId); set(e); }); el.addEventListener('pointermove', e => on && set(e)); const up = () => { on = false; }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('keydown', e => { const d = { ArrowUp: .1, ArrowDown: -.1, ArrowRight: .1, ArrowLeft: -.1, PageUp: .5, PageDown: -.5 }[e.key]; if (d) { e.preventDefault(); e.stopPropagation(); setLevel(S.target + d); } else if (e.key === 'Home') setLevel(0); else if (e.key === 'End') setLevel(HI); }); }
function setLevel(v) { if (S.night) return; S.target = Math.max(LO, Math.min(HI, v)); S.unsettled = Math.max(S.unsettled, 3); S.did.staff = true; if (S.pin) S.pin.rise = false; need = true; save_(); }

// ---------- the night
function placePager() { const p = $('#pager'); if (phone()) { if (p.parentElement !== $('#dock')) $('#dock').insertBefore(p, $('#tools')); } else if (p.parentElement !== $('#story')) $('#story').append(p); }
function placeNight() { placePager(); const n = $('#night'), on = S.nightPanel || (!S.free && S.ch === 3) || S.chal && !!S.night; n.hidden = !on; document.body.classList.toggle('nighton', on); if (phone()) { if (n.parentElement !== $('#dock')) $('#dock').prepend(n); } else if (n.parentElement !== $('#story')) $('#story').insertBefore(n, $('#act'));  if (on) graph(); }
function graph() {
  const g = $('#graph'); if ($('#night').hidden) return; const w = g.clientWidth || 360, h = g.clientHeight || 160, a = 30, b = 60, X = v => (v - a) / (b - a) * w, lo = -1.75, hi = 3.1, Y = v => 14 + (1 - (v - lo) / (hi - lo)) * (h - 34), sh = S.shift; g.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const line = f => { let s = ''; for (let q = a; q <= b + .01; q += .2) s += (s ? 'L' : 'M') + X(q).toFixed(1) + ' ' + Y(f(q)).toFixed(1); return s; }, L = line(q => world.level(q, sh)), Ti = line(q => world.tide(q)); let back = ''; for (let q = b; q >= a - .01; q -= .2) back += 'L' + X(q).toFixed(1) + ' ' + Y(world.tide(q)).toFixed(1); const [pm, pt] = world.peak(sh), now = S.night ? S.night.h : null, sx = X(Math.max(a, Math.min(b, 45.4 + sh)));
  let s = `<path class="ax" d="M0 ${Y(0)}H${w}"/><path class="fi" d="${L}${back}Z"/><path class="ti" d="${Ti}"/>` + (sh ? `<path class="real" d="${line(q => world.level(q, 0))}" opacity=".45"/>` : '') + `<path class="lv" d="${L}"/>`;
  for (const q of w < 330 ? [30, 42, 48, 60] : [30, 36, 42, 48, 54, 60]) s += `<text x="${Math.max(2, Math.min(w - 2, X(q)))}" y="${h - 2}" text-anchor="${q === 30 ? 'start' : q === 60 ? 'end' : 'middle'}">${q % 24 === 12 ? (lang === 'zh' ? '12:00' : 'noon') : q % 24 === 0 ? (lang === 'zh' ? '0:00' : 'midnight') : lang === 'zh' ? q % 24 + ':00' : (q % 24 === 18 ? '6 pm' : '6 am')}</text>`;
  if (now === null) { const py = Y(pm); s += `<circle class="grip" cx="${X(pt)}" cy="${py}" r="4"/><g transform="translate(${sx} ${Y(world.tide(45.4 + sh)) - 2})"><path d="M-7-12l-6 6 6 6M7-12l6 6-6 6" stroke="var(--acc)" stroke-width="1.6"/></g><text class="a" x="${Math.max(36, Math.min(w - 40, X(pt)))}" y="${py - 9}" text-anchor="middle">${lev(pm)}</text>`; }
  else s += `<path class="cur" d="M${X(now)} 6V${h - 20}"/><text class="a" x="${X(now) + (X(now) > w - 80 ? -6 : 6)}" y="14" text-anchor="${X(now) > w - 80 ? 'end' : 'start'}">${clock(now)}</text>`;
  s += `<text x="2" y="${Y(0) - 5}">${t.hightide}</text>`; g.innerHTML = s; g.setAttribute('aria-valuenow', sh.toFixed(1)); g.setAttribute('aria-valuemin', -12); g.setAttribute('aria-valuemax', 12); g.setAttribute('aria-valuetext', t.hrs(sh)); g.style.cursor = S.night || S.chal ? 'default' : 'ew-resize';
}
function setShift(v) { if (S.night || S.chal) return; v = Math.max(-12, Math.min(12, Math.round(v * 10) / 10)); if (Math.abs(v) < .15) v = 0; S.shift = v; if (v) S.did.shift = true; if (S.map) mapTo(0); S.target = world.peak(v)[0]; S.unsettled = 6; graph(); story(); save_(); }
function bindGraph() { const g = $('#graph'); let on = null; g.addEventListener('pointerdown', e => { if (S.night) return; on = [e.clientX, S.shift]; g.setPointerCapture(e.pointerId); }); g.addEventListener('pointermove', e => { if (on) setShift(on[1] + (e.clientX - on[0]) / g.clientWidth * 30); }); const up = () => on = null; g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up); g.addEventListener('keydown', e => { const d = { ArrowLeft: -.5, ArrowRight: .5 }[e.key]; if (d) { e.preventDefault(); e.stopPropagation(); setShift(S.shift + d); } }); }
const NDT = .33;
function playNight() {
  if (S.night) return; const sh = S.chal ? 0 : S.shift, [a, b] = world.window(sh); if (S.map) mapTo(0); view.diffOn = 0; S.result = null; sim.brush = [0, 0, 1, 0]; sim.rain = 0; view.rainAmt = 0; S.ida = 0; sim.seaFn = null; sim.sea = SEAT + world.level(a, sh); sim.setWalls(world.wallCells(S.walls, WALLH)); sim.reset(null); if (S.pin) S.pin.max = 0;
  sim.seaFn = s => SEAT + world.level(Math.min(a + s / 3600, b), sh); S.night = { a, b, sh, h: a, rate: (b - a) * 3600 / (calm ? 12 : 17) / 60 }; S.tool = 'tap'; document.body.classList.remove('rain', 'wall'); toolsUI(); placeNight(); duskAt(a); story(); need = true;
}
const duskAt = h => { const q = ((h % 24) + 24) % 24, v = q < 7 || q > 17.5 ? 1 : 0; if (v !== duskTo) dusk(v); };
let duskTo = 0; function dusk(v) { duskTo = v; if (v) view.lamp = [1, 1]; const d = document.documentElement; if (v) d.classList.add('dusk'); else d.classList.remove('dusk'); if (calm) { view.setDusk(v); need = true; } }
function stopNight(quiet) { if (!S.night) return; dusk(0); S.night = null; sim.seaFn = null; S.target = S.level = sim.sea - SEAT; S.unsettled = 1; placeNight(); if (!quiet) { story(); graph(); toolsUI(); } }
function endNight() { const n = S.night; sim.seaFn = null; const d = sim.read(), f = k => d[k * 4 + 3], w = world.wetDoors(f), sub = subWet(f); dusk(0); S.night = null; const hw = world.peak(n.sh)[0], st = new Float32Array(d.length); for (let k = 0; k < NX * NY; k++) { st[k * 4] = st[k * 4 + 3] = d[k * 4 + 3]; } sim.sea = SEAT + hw; sim.setState(st); S.level = S.target = hw; S.unsettled = 0; S.pendRead = true; S.hold = true; S.nightDoors = w.n; S.did.played = true; dots(sub.o);
  if (S.chal) { const B = S.baseDoors, rg = new Uint8Array(NX * NY * 2); let worse = 0, kept = 0; const paint = (b, c) => { const { X, Y, st } = world.bld, s0 = st[b], e0 = st[b + 1]; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let k = s0; k < e0; k++) { x0 = Math.min(x0, X[k]); x1 = Math.max(x1, X[k]); y0 = Math.min(y0, Y[k]); y1 = Math.max(y1, Y[k]); } for (let y = Math.floor((y0 - V0) / DX) * DX + V0; y <= y1; y += DX) for (let x = Math.floor((x0 - U0) / DX) * DX + U0; x <= x1; x += DX) { const cx = x + DX / 2, cy = y + DX / 2; let inn = false; for (let k = s0, j = e0 - 1; k < e0; j = k++) if ((Y[k] > cy) !== (Y[j] > cy) && cx < (X[j] - X[k]) * (cy - Y[k]) / (Y[j] - Y[k]) + X[k]) inn = !inn; const k = world.cell(cx, cy); if (inn && k >= 0) rg[k * 2 + c] = 255; } }; for (let b = 0; b < world.bld.nb; b++) { if (B.o[b] && !w.o[b]) { kept++; paint(b, 0); } else if (w.o[b]) { let m0 = 0, m1 = 0; for (let i = world.ds[b]; i < world.ds[b + 1]; i++) { m0 = Math.max(m0, S.base[world.dc[i]] / 50); m1 = Math.max(m1, f(world.dc[i])); } if (m1 > m0 + .1) { worse++; paint(b, 1); } } }
    for (let k = 0; k < NX * NY; k++) { if (!world.open(k)) continue; const b = S.base[k] / 50, y = f(k); if (b > .25 && y < .08) rg[k * 2] = 255; if (y > b + .1 && y > .25) rg[k * 2 + 1] = 255; } view.setDiff(rg); view.diffOn = 1; let ks = 0; S.baseSub.o.forEach((v, i) => { if (v && !sub.o[i]) ks++; });
    S.result = { kept, total: B.n, worse, sub: ks, subT: S.baseSub.n, len: world.wallLength(S.walls) }; S.tries = (S.tries || 0) + (S.auto ? 0 : 1); const best = +(ls.get('best') || 0); if (kept > best && !S.auto) { ls.set('best', kept); S.result.best = kept; } else S.result.best = best; endCard(true); }
  placeNight(); graph(); story(); toolsUI(); staffW(); save_(); need = true; }
async function runNight(sh = 0, walls = []) { // for tests and for baking the baseline: the whole night at once
  const [a, b] = world.window(sh); sim.seaFn = null; sim.sea = SEAT + world.level(a, sh); sim.setWalls(world.wallCells(walls, WALLH)); sim.reset(null); sim.seaFn = s => SEAT + world.level(Math.min(a + s / 3600, b), sh); const T1 = (b - a) * 3600; while (sim.time < T1) { sim.steps(Math.min(300, Math.ceil((T1 - sim.time) / NDT)), NDT); sim.probeSync(); } sim.seaFn = null; const d = sim.read(), m = new Float32Array(NX * NY); for (let k = 0; k < m.length; k++) m[k] = d[k * 4 + 3]; return m;
}
const PAR = 769, goal = k => { const g = [20, 75, 150, 300, 450, 600, PAR].find(x => x > k); return g ? t.goal(g) : k === PAR ? t.match : t.beat; };
function endCard(open) { const r = S.result; if (!r) return; const p = v => (v / r.total * 100).toFixed(1) + '%', u = lang === 'zh' ? '100 米' : '100 ft', per = r.len > 5 ? Math.round(r.kept / (r.len / (lang === 'zh' ? 100 : 30.48))) : 0;
  $('#endt').innerHTML = `<div class="num">${num(r.kept)}<small>/ ${num(r.total)}</small></div><div class="bar" aria-hidden="true"><i style="width:${p(r.kept)}"></i><s style="left:${p(PAR)}"></s></div><div class="mk" aria-hidden="true"><span style="left:${p(PAR)}">${PAR}</span></div><h2>${t.endCap}</h2><p>${t.endSub(r.sub, r.subT)} ${t.endWorse(r.worse)}</p><p>${t.endWall(dist(r.len))}${per > 0 ? ' · ' + t.endPer(per, u) : ''} · ${t.hwm(lev(SANDY))}${r.best ? ' · ' + t.endBest(num(r.best)) : ''}</p><p>${t.par}${S.auto ? '' : ' ' + goal(r.kept)}</p>${r.kept < 150 && !S.auto ? `<p>${t.hint}</p>` : ''}${S.tries > 1 && !S.auto ? `<p><button class="sub" id="e5">${t.showPar}</button></p>` : ''}<div class="row"><button class="go" id="e1">${t.retry}</button><button class="sub" id="e2">${t.save}</button><button class="sub" id="e3">${t.share}</button><button class="sub" id="e4">${t.free}</button></div><p style="color:var(--dim);margin-top:22px">${t.endHatch} ${t.endReal}</p>`;
  $('#e1').onclick = () => { $('#end').close(); chalStart(); }; if ($('#e5')) $('#e5').onclick = async () => { try { const L = await (await fetch('data/best.json')).json(); chalStart(); S.walls = L; S.auto = true; commitWalls(); tool('tap'); story(); save_(); } catch { toast(t.loadErr); } }; $('#e2').onclick = () => save(); $('#e3').onclick = share; $('#e4').onclick = () => { $('#end').close(); shift(); free(); }; if (open) setTimeout(openEnd, calm ? 0 : 700); }
function openEnd() { const e = $('#end'); document.body.classList.add('ended'); if (phone() && S.walls.length) { const P2 = S.walls.flat(), xs = P2.map(p => p[0]), ys = P2.map(p => p[1]), m = (a) => (Math.min(...a) + Math.max(...a)) / 2, sp = Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * 1.1, 420); frameCam(false, { x: m(xs), y: m(ys), d: Math.min(16000, Math.max(3200, sp * 4.6)), az: 0, el: 62 }); document.body.classList.add('ended'); } if (!e.open) { e.show(); e.scrollTop = 0; e.focus({ preventScroll: true }); } need = true; }
function chalStart() { $('#end').open && $('#end').close(); shift(); const w = S.walls; view.diffOn = 0; S.result = null; sim.seaFn = null; sim.sea = SEAT; S.level = S.target = 0; sim.reset(null); S.walls = w; commitWalls(); dots(); tool('wall'); story(); }

// ---------- chapters
function go(n, first) {
  if (S.night) stopNight(true); $('#end').open && $('#end').close(); shift(); endPour(); n = Math.max(1, Math.min(5, n)); const was = S.ch; S.ch = n; S.free = false; S.nightPanel = false; closeMenu(); document.body.classList.remove('play'); view.diffOn = 0; S.chal = n === 5; S.ida = 0; sim.rain = 0; view.rainAmt = 0; view.zoneOn = 0;
  if (!first) { if (n === 2) { S.pin = null; if (S.walls.length) { S.walls = []; commitWalls(); } S.target = SANDY; S.unsettled = 6; } else { mapTo(0, n !== 3); reset(true); if (n !== 1) S.pin = null; } if (n >= 4) S.did.pourCh = 0; }
  view.dots = n === 5; dots(); view.zoneOn = n === 2 ? 1 : 0; if (n === 2) { S.map = 1; view.mapOn = 1; S.wipe = first ? S.wipe : 0.001; S.did.map = false; $('#wipe').hidden = false; loadMap(); sim.fill = true; sim.dirty = true; if (!first) { wipeAnim = .40; } wipeUI(); }
  tool(n === 4 ? 'rain' : n === 5 ? 'wall' : 'tap'); S.poured0 = S.poured; S.did.wall4 = false;
  if (!first || n > 1) { const cams = phone() ? { 4: { x: 30, y: 1830, d: 4900, az: 0, el: 66 } } : { 4: { x: 60, y: 1830, d: 2900, az: -4, el: 62 }, 2: { ...home(), x: 520, y: 2000, d: 8600, az: 0, el: 56 }, 5: { ...home(), el: 53, x: 720 } }; frameCam(!!first, cams[n] || home()); }
  placeNight(); story(); pin(); toolsUI(); readout(); save_(); need = true; if (n >= 4) setTimeout(() => S.ch === n && !S.free && toast(hintOf(n === 4 ? 'rain' : 'wall')), 1300);
}
function free(keep) { if (S.night) stopNight(true); if ($('#end').open) { $('#end').close(); shift(); } view.zoneOn = S.map ? 1 : 0; if (!S.free && S.ch) S.from = S.ch; S.free = true; S.chal = false; view.diffOn = 0; document.body.classList.toggle('play', phone()); view.dots = true; if (!keep) { S.nightPanel = false; if (!S.map) $('#wipe').hidden = true; tool('tap'); } placeNight(); story(); toolsUI(); readout(); save_(); need = true; }
const keyHtml = () => `<div class="key"><span><i style="background:#e9a893"></i>${t.key1}</span><span><i style="background:#4f9c80"></i>${t.key2}</span><span><i style="background:#5d83bd"></i>${t.key3}</span><span><i style="height:0;border-top:2px solid var(--acc)"></i>${t.key4}</span></div>`, dotKey = () => `<div class="key"><span><i class="o" style="background:#2a5a44"></i>${t.dotDry}</span><span><i class="o" style="background:#1f4fb0"></i>${t.dotWet}</span></div>`;
let storyKey = '';
const nightLine = () => { const n = S.night; return n ? `<p><b>${n.sh ? t.hrs(n.sh) + (lang === 'zh' ? '。' : '.') : t.n29}</b> ${n.sh ? '' : n.ph === 2 ? t.nOut : n.ph === 1 ? t.nShore : t.nDusk}</p>` : ''; };
function story(light) {
  const q = $('#q'), say = $('#say'), A = $('#act'); let h = '', s = '', a = [], done = false; const n = S.ch;
  if (S.free) { h = phone() ? '' : t.free; s = phone() ? '' : `<p>${t.freep}</p>`; if (S.nightPanel) { const [m, tm] = world.peak(S.shift); s = `<p><b>${S.shift ? t.hrs(S.shift) : t.nowS}</b></p><p>${(S.shift ? t.c3peak : t.c3peak0)(lev(m), clock(tm))}</p>` + (S.nightDoors && S.did.played && !S.night ? `<p>${t.nightEnd(num(S.nightDoors))}${S.shift || S.walls.length ? ' ' + t.nightReal(num(S.baseDoors.n)) : ''}</p>` : ''); a = [S.night ? [t.stop, stopNight, 'go'] : [S.did.played ? t.again : t.play, playNight, 'go'], ...(S.shift && !S.night ? [[t.now, () => setShift(0), 'sub']] : [])]; if (S.night) s = nightLine(); } else if (S.tool === 'rain') a = [[t.ida, ida, 'sub']]; if (S.map && !S.night) s += keyHtml(); else if (S.pin && !S.nightPanel && !phone()) s += tapText(); else if (!phone() && !S.night) s += dotKey(); }
  else if (n === 1) { h = t.c1h; s = S.pin ? tapText() : `<p>${t.c1p}</p>`; done = !!S.pin; }
  else if (n === 2) { h = t.c2h; s = S.did.map ? `<p>${t.c2done}</p>` : `<p>${t.c2p}</p>`; s += keyHtml(); done = S.did.map; }
  else if (n === 3) { const [m, tm] = world.peak(S.shift); h = t.c3h; s = `<p>${S.did.shift || S.did.played ? '<b>' + (S.shift ? t.hrs(S.shift) : t.nowS) + (lang === 'zh' ? '。' : '.') + '</b> ' + (S.shift ? t.c3peak : t.c3peak0)(lev(m), clock(tm)) : t.c3p}</p>` + (S.did.shift && S.shift && !S.did.played ? `<p>${m < 1.7 ? t.c3low : m < 2.4 ? t.c3mid : t.c3high}</p>` : S.did.shift && !S.shift && !S.did.played ? `<p>${t.c3real}</p>` : ''); if (S.did.played && !S.night && S.nightDoors !== undefined) s += `<p>${t.nightEnd(num(S.nightDoors))}${S.shift ? ' ' + t.nightReal(num(S.baseDoors.n)) : ''}</p>`; a = [S.night ? [t.stop, stopNight, 'go'] : [S.did.played ? t.again : t.play, playNight, 'go'], ...(S.shift && !S.night ? [[t.now, () => setShift(0), 'sub']] : [])]; done = S.did.played || S.did.shift; if (S.night) s = nightLine(); }
  else if (n === 4) { h = t.c4h; const p1 = S.poured - (S.poured0 || 0) > 2500, w = S.walls.length > 0, p2 = w && S.sides && S.sides[0] - S.sides[1] > .15 && S.poured - (S.did.pourAtWall || 0) > 800, p3 = w && !p2 && S.poured - (S.did.pourAtWall || 0) > 12000; s = `<p>${S.did.ida ? t.idaDone : p2 ? t.c4c(len(S.sides[0]), len(S.sides[1])) : p3 ? t.c4d : p1 || w ? t.c4b : t.c4p}</p>` + (S.poured > 50 && !S.did.ida ? '' : '') + (S.poured > 50 ? `<p class="d">${t.poured} ${lang === 'zh' ? num(S.poured) + ' 立方米' : (S.poured * 264.172 / 1e6).toFixed(1) + ' million gallons'} · ${(S.poured / 2500).toFixed(1)} ${t.pools}</p>` : ''); a = [...(p1 || w ? [[S.tool === 'wall' ? t.rain : t.wall, () => { tool(S.tool === 'wall' ? 'rain' : 'wall'); story(); }, p2 ? 'sub' : 'go']] : []), [t.ida, ida, 'sub']]; done = p2 || S.did.ida; }
  else { h = t.c5h; const L = budgetLeft(); s = `<p>${t.c5p(dist(BUDGET), lang === 'zh' ? '2 米' : '6.6 ft')}</p><p><b>${dist(L)}</b> <span class="d">${t.left}</span></p>` + dotKey(); a = [S.night ? [t.stop, () => { stopNight(); chalStart(); }, 'go'] : S.result ? [t.retry, chalStart, 'go'] : [t.go, playNight, 'go'], ...(S.result && !S.night ? [[num(S.result.kept) + ' / ' + num(S.result.total), openEnd, 'sub']] : [])]; done = !!S.result; if (S.night) s = nightLine(); }
  $('#step').textContent = S.free ? '' : t.chapter(n); $('#prog').textContent = S.free ? '' : n + ' / 5'; const key = lang + h; if (key !== storyKey) { q.textContent = h; storyKey = key; } q.hidden = !h; if (say._h !== s) { say.innerHTML = s; say._h = s; }
  const ak = a.map(x => x[0] + x[2]).join('|'); if (A._k !== ak) { A._k = ak; A.innerHTML = ''; for (const [w, f, c] of a) { const b = document.createElement('button'); b.className = c; b.textContent = w; A.append(b); } } [...A.children].forEach((b, i) => b.onclick = () => a[i][1]()); A.hidden = !a.length;
  $('#prev').hidden = S.free || n === 1; $('#next').hidden = S.free; $('#next').textContent = n === 5 ? t.free : t.next; $('#next').classList.toggle('hot', !!done); $('#skip').hidden = !S.free && (n === 5 || phone() && n > 1); $('#skip').textContent = S.free ? (S.from > 1 ? t.backTo(S.from) : t.start) : t.skip; $('#pager').hidden = S.free && phone();
  fit(); scrim(); toolsUI();
}
function fit() { const b = document.body.classList; b.remove('tight', 'tighter'); if (phone()) return; const over = () => { const e = $('#act').hidden ? (document.body.classList.contains('nighton') ? $('#night') : $('#say')) : $('#act'); return e.getBoundingClientRect().bottom > $('#pager').getBoundingClientRect().top - 12; }; if (over()) { b.add('tighter'); if (over()) b.add('tight'); } }
function tapText() { const p = S.pin, a = p.at, nm = pname(p.name); let s = a === null || a > 4.5 ? `<p>${t.wetNever(nm, lev(4.5))}</p>` : `<p>${t.wetAt(nm, lev(Math.max(0, a)))}</p><p>${a <= .914 ? t.wet2100 + ' ' : ''}${a <= SANDY ? t.wetSandy(lev(SANDY - a)) : t.wetDry(lev(a - SANDY))}</p>`; if (a !== null && a <= 4.5 && a - (world.z0[p.k] - MHHW) > .3) s += `<p class="d">${t.ridge}</p>`; const sv = world.zone[p.k] > 127, m = a !== null && a <= SANDY; if (a !== null && sv !== m && Math.abs(a - SANDY) < 1.6) s += `<p class="d">${sv ? t.surveyYes : t.surveyNo}</p>`; return s; }
let shY = -.1; function scrim() { if (!phone()) { $('#scrim').style.height = ''; let m = 9e9; for (const [x, y] of [[U0, V0 + H * .25], [U0, V0 + H * .6], [U0, V0 + H]]) m = Math.min(m, screenOf(x, y, 0)[0]); $('#scrim').style.opacity = m < $('#story').getBoundingClientRect().right + 16 || $('#end').open ? 1 : 0; return; }
  const ended = document.body.classList.contains('ended'), r = $('#story').getBoundingClientRect(), top = S.free && !$('#say').textContent && $('#act').hidden || ended ? 62 : r.bottom + 10, bot = ended ? $('#end').getBoundingClientRect().top : $('#dock').getBoundingClientRect().top; $('#scrim').style.height = top + 'px'; const st = document.documentElement.style; st.setProperty('--dock', (innerHeight - bot) + 'px'); st.setProperty('--top', top + 'px'); shY = 1 - (top + bot) / innerHeight; }

// ---------- readout
function readout() { const r = $('#readout'); if (!S.area || S.area < 4e3 || !S.doors && S.area < 2.2e5) { r.innerHTML = ''; return; } const z = lang === 'zh', area = z ? (S.area / 1e6).toFixed(2) + ' 平方公里' : (S.area / 2.59e6).toFixed(2) + ' sq mi'; r.innerHTML = `<span><b>${area}</b> ${t.r_area}</span><span><b>${num(S.doors)}</b> ${t.r_doors}</span>` + (S.sub && (S.free || S.ch !== 4) ? `<span><b>${num(S.sub)}</b> ${t.r_sub}</span>` : ''); }
function wallSides(d) { let best = null; for (const l of S.walls) for (let i = 0; i + 1 < l.length; i++) { const [a, b] = [l[i], l[i + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 4) continue; const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L, n = Math.max(1, Math.round(L / 6)); for (let q = 0; q < n; q++) { const x = a[0] + (b[0] - a[0]) * (q + .5) / n, y = a[1] + (b[1] - a[1]) * (q + .5) / n, f = s => { let m = -1; for (const o of [14, 22]) { const k = world.cell(x + nx * o * s, y + ny * o * s); if (k >= 0 && world.open(k)) m = Math.max(m, d[k * 4]); } return m; }, A = f(1), B = f(-1); if (A < 0 || B < 0) continue; const hi = Math.max(A, B), lo = Math.min(A, B); if (!best || hi - lo > best[0] - best[1]) best = [hi, lo]; } } return best; }
function onRead(d) { S.sides = S.walls.length ? wallSides(d) : null; if (S.ch === 4 && !S.free) story(); let a = 0; for (let k = 0; k < NX * NY; k++) { const p = world.bed[k * 4 + 1]; if (p > .01 && p < 1.5 && d[k * 4] > .05) a += p; } S.area = a * 64; S.doors = world.wetDoors(k => d[k * 4]).n; const sw = subWet(k => d[k * 4]); S.sub = sw.n; if (view.dots && !view.diffOn) dots(sw.o); readout(); fit(); need = true; }

// ---------- find
let sel = -1, list = [];
function bindFind() { const f = $('#find'); f.oninput = () => hits(f.value); f.onkeydown = e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, Math.min(list.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1))); $$('#hits li').forEach((l, i) => l.classList.toggle('on', i === sel)); } else if (e.key === 'Enter') { e.preventDefault(); list[Math.max(0, sel)] && goTo(list[Math.max(0, sel)]); } else if (e.key === 'Escape') closeMenu(); }; }
function norm(s) { return s.toLowerCase().replace(/\b(street|st)\b\.?/g, 'st').replace(/\b(avenue|av|ave)\b\.?/g, 'ave').replace(/[.'’]/g, '').trim(); }
function hits(q) { q = norm(q); list = []; sel = -1; if (q) { const two_ = q.split(/\s*(?:&|\band\b|\bat\b|\/|和|与)\s*/).filter(Boolean); const sm = (x, lim) => world.streets.map((s, i) => [s, i, norm(s[0])]).filter(([s, i, n]) => n.includes(x)).sort((a, b) => (a[2].startsWith(x) ? 0 : 1) - (b[2].startsWith(x) ? 0 : 1) || a[0][1].localeCompare(b[0][1]) * -1 || a[2].length - b[2].length).slice(0, lim);
    if (two_.length === 2) { for (const A of sm(two_[0], 5)) for (const B of sm(two_[1], 5)) { const x = world.cross(A[0], B[0]); if (x && A[0][0] !== B[0][0] && !list.some(l => l.n === A[0][0] + ' & ' + B[0][0])) list.push({ n: A[0][0] + ' & ' + B[0][0], s: '', x: x[0], y: x[1] }); } }
    else { for (const [n, z, x, y] of world.hoods.concat(world.marks)) if (norm(n).includes(q) || z.includes(q)) list.push({ n: lang === 'zh' ? z : n, s: lang === 'zh' ? n : '', x, y }); const st = new Map(); world.ent.forEach(([x, y, i]) => { const s = world.stations[i]; if (norm(s[0]).includes(q)) { const o = st.get(i) || [0, 0, 0]; o[0] += x; o[1] += y; o[2]++; st.set(i, o); } }); for (const [i, o] of st) list.push({ n: world.stations[i][0], s: t.station + ' · ' + world.stations[i][1], x: o[0] / o[2], y: o[1] / o[2] }); for (const [s] of sm(q, 8)) { const l = s[2].reduce((a, b) => b.length > a.length ? b : a), mid = (() => { let L = 0; for (let k = 0; k + 3 < l.length; k += 2) L += Math.hypot(l[k + 2] - l[k], l[k + 3] - l[k + 1]); L /= 2; for (let k = 0; k + 3 < l.length; k += 2) { const d = Math.hypot(l[k + 2] - l[k], l[k + 3] - l[k + 1]); if (L <= d) return [l[k] + (l[k + 2] - l[k]) * L / d, l[k + 1] + (l[k + 3] - l[k + 1]) * L / d]; L -= d; } return [l[0], l[1]]; })(); list.push({ n: s[0], s: t.street + ' · ' + (s[1] === 'M' ? (lang === 'zh' ? '曼哈顿' : 'Manhattan') : (lang === 'zh' ? '布鲁克林' : 'Brooklyn')), x: mid[0], y: mid[1] }); } } }
  list = list.slice(0, 7); $('#hits').innerHTML = list.map(l => `<li tabindex="-1">${l.n}<small>${l.s}</small></li>`).join(''); $$('#hits li').forEach((e, i) => e.onclick = () => goTo(list[i])); }
function goTo(h) { closeMenu(); $('#find').blur(); const k = world.nearOpen(h.x, h.y, 12); if (k < 0) return; if (!S.free && S.ch !== 1) free(true); setPin(k, 0, [h.n]); const [x, y] = world.xy(k); S.moved = true; frameCam(false, { x, y, d: 2300, el: 50 }); }

// ---------- keep and send
function state() { const c = view.cam, o = {}; if (S.free) o.v = 'f'; else if (S.ch > 1) o.v = S.ch; if (Math.abs(S.target) > .005 && !S.chal && !S.night) o.l = Math.round(S.target * 100); if (S.moved) o.c = [c.x, c.y, c.d, c.az * 10, c.el * 10].map(v => Math.round(v)).join('_'); if (S.map) o.m = Math.round(S.wipe * 100); if (S.walls.length) o.w = enc(S.walls); if (S.pin) o.p = S.pin.k.toString(36); if (S.shift) o.s = Math.round(S.shift * 10); if (S.nightPanel) o.n = 1; if (S.rain.size) o.r = [...S.rain].sort((a, b) => b[1] - a[1]).slice(0, 80).map(([k, v]) => k.toString(36) + '.' + Math.max(1, Math.round(v / 20)).toString(36)).join('_'); if (S.result) o.k = S.result.kept; return o; }
const hashNow = () => { const o = state(), s = Object.entries(o).map(([k, v]) => k + '=' + v).join('&'); return s ? '#' + s : ''; };
let saveT; function save_() { clearTimeout(saveT); saveT = setTimeout(() => { try { history.replaceState(null, '', location.pathname + location.search + hashNow()); } catch { } }, 600); } function moved() { S.moved = true; save_(); wipeUI(); }
function readHash() { let o = {}; try { o = Object.fromEntries(location.hash.slice(1).split('&').filter(Boolean).map(p => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)]; })); } catch { } const n = (v, a, b, d = 0) => { v = parseFloat(v); return Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d; };
  if (o.v === 'f') S.free = true; else if (o.v) S.ch = Math.round(n(o.v, 1, 5, 1)); if (o.s) { S.shift = n(o.s, -120, 120) / 10; S.did.shift = true; } if (o.n) S.nightPanel = true;
  if (o.c) { const [x, y, d, az, el] = o.c.split('_').map(Number); if ([x, y, d, az, el].every(Number.isFinite)) { Object.assign(view.cam, { x, y, d, az: az / 10, el: el / 10 }); S.keepCam = { ...view.cam }; clampCam(); } }
  if (o.w) { try { S.walls = dec(o.w); commitWalls(); hist = S.walls.map(() => 'w'); } catch { S.walls = []; } }
  if (o.l) { S.target = n(o.l, LO * 100, HI * 100) / 100; S.level = S.target; sim.sea = SEAT + S.level; sim.reset(null); S.unsettled = 6; }
  if (o.r) { S.poured = 0; const h = new Float32Array(NX * NY); for (const p of o.r.split('_').slice(0, 80)) { const [a, b] = p.split('.').map(v => parseInt(v, 36)); if (!(a >= 0 && a < 64 * 80 && b > 0)) continue; const v = Math.min(b * 20, 4e6), I = a % 64 * 10, J = Math.floor(a / 64) * 10, cs = []; for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) { const k = (J + j) * NX + I + i; if (world.open(k)) cs.push(k); } for (const k of cs) h[k] += v / (cs.length * 64 * world.bed[k * 4 + 1]); S.rain.set(a, v); S.poured += v; } sim.reset(h); S.unsettled = 8; }
  if (o.m !== undefined) { S.map = 1; S.wipe = n(o.m, 0, 100) / 100; view.mapOn = 1; sim.fill = true; $('#wipe').hidden = false; if (S.wipe > .5) S.did.map = true; view.wipeX = wipeX(S.wipe); }
  if (o.p) { const k = parseInt(o.p, 36); if (k >= 0 && k < NX * NY && world.open(k)) { const [x, y] = world.xy(k); S.pin = { k, x, y, name: world.place(x, y), at: world.wetAt(k), max: 0, d: 0 }; sim.setPoint(0, [k % NX, Math.floor(k / NX)]); } }
  if (S.keepCam) setTimeout(() => { Object.assign(view.cam, S.keepCam); fly = null; S.moved = true; need = true; wipeUI(); }, 0);
  if (o.l || o.w || o.r || o.p) { const keep = { l: S.target, w: S.walls, p: S.pin }; S.restore = keep; } }
async function share() { closeMenu(); const u = location.origin + location.pathname + '?lang=' + lang + hashNow(); try { if (phone() && navigator.share) { await navigator.share({ title: t.title, url: u }); return; } await navigator.clipboard.writeText(u); toast(t.copied); } catch (e) { if (e.name !== 'AbortError') { try { history.replaceState(null, '', u); } catch { } toast(u.length < 90 ? u : t.share); } } window.__shared = u; }
async function save() {
  closeMenu(); const w = 2400, h = 2000, cw = cv.width, chh = cv.height, sh = view.shift, c0 = { ...view.cam }; cv.width = w; cv.height = h; view.shift = [0, 0]; view.dpr = 2; view.draw(w, h); const o = document.createElement('canvas'); o.width = w; o.height = 2800; const g = o.getContext('2d'); const css = getComputedStyle(document.documentElement), bg = css.getPropertyValue('--bg').trim(), ink = css.getPropertyValue('--ink').trim(), dim = css.getPropertyValue('--dim').trim(), acc = css.getPropertyValue('--acc').trim();
  g.fillStyle = bg; g.fillRect(0, 0, w, 2800); g.drawImage(cv, 0, 0); if (S.pin) { const p = view.project(S.pin.x, S.pin.y, Math.max(view.groundAt(S.pin.x, S.pin.y), 0) * EX + 4), px = (p[0] + 1) / 2 * w, py = (1 - p[1]) / 2 * h; if (p[2] > 0 && px > 0 && px < w && py > 0 && py < h) { g.strokeStyle = g.fillStyle = acc; g.lineWidth = 5; g.beginPath(); g.moveTo(px, py); g.lineTo(px, py - 190); g.stroke(); g.beginPath(); g.arc(px, py, 13, 0, 7); g.fill(); g.beginPath(); g.arc(px, py - 190, 20, 0, 7); g.fill(); } } cv.width = cw; cv.height = chh; view.shift = sh; view.dpr = dpr; Object.assign(view.cam, c0); need = true; frame(); const fam = 'Jost, "PingFang SC", "Noto Sans SC", sans-serif', x = 150; g.fillStyle = acc; g.fillRect(x, 2090, 120, 5); g.fillStyle = ink; g.font = `300 124px ${fam}`; g.textBaseline = 'alphabetic';
  const r = S.result, head = r ? t.endH(num(r.kept), num(r.total)) : S.pin && S.pin.at !== null ? pname(S.pin.name) : t.title; let fs = 124; while (g.measureText(head).width > w - 2 * x && fs > 60) { fs -= 4; g.font = `300 ${fs}px ${fam}`; } g.fillText(head, x, 2270); g.font = `400 56px ${fam}`; g.fillStyle = dim; const z = lang === 'zh';
  const l2 = r ? `${t.endWall(dist(r.len))} · ${t.endSub(r.sub, r.subT)}` : S.pin && S.pin.at !== null ? (z ? `海面高出平常高潮 ${lev(Math.max(0, S.pin.at))} 时进水` : `gets wet when the harbor stands ${lev(Math.max(0, S.pin.at))} above a normal high tide`) : S.map ? (z ? '桑迪淹到的地方，88% 在 1865 年的图上是填出来的地、沼泽或河面' : '88% of what Sandy flooded was made land, marsh or river on this 1865 map') : `${lev(Math.abs(S.level))} ${S.level < -.02 ? t.below : t.above}`; g.fillText(l2, x, 2370); if (S.doors && !r) g.fillText(`${num(S.doors)} ${t.r_doors}`, x, 2450); g.font = `400 40px ${fam}`; g.fillText((z ? '往纽约倒水' : 'Pour Water on New York') + '  ·  yizhouyu.dev/demo/flood', x, 2660); g.textAlign = 'right'; g.fillText(z ? '石膏模型与实时水流计算，不是预报' : 'plaster model, water computed live; not a forecast', w - x, 2660);
  const b = await new Promise(k => o.toBlob(k, 'image/png')); window.__saved = [o.width, o.height, b.size]; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'pour-water-on-new-york.png'; document.body.append(a); if (!window.__noDownload) a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000); window.__savedBlob = b;
}
let toastT; function toast(s) { const e = $('#toast'); e.textContent = s; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 2200); }

// ---------- the loop
function hint() { const h = $('#hint'); const on = !S.free && S.ch === 1 && !S.did.tap && !S.pin && !fly; h.style.display = on ? '' : 'none'; if (on) { const k = S.hintK ??= world.nearOpen(1432, 3910, 9), [x, y] = world.xy(k), [sx, sy] = screenOf(x, y, 12); h.setAttribute('transform', `translate(${sx} ${sy})`); } }
function frame() { hint(); scrim(); if (phone()) { const d = shY - view.shift[1]; if (Math.abs(d) > .002) { view.shift[1] += calm ? d : d * .16; need = true; } } wipeUI(); view.draw(cv.width, cv.height); pin(); }
let idle = 0, probeT = 0;
function loop(now) {
  requestAnimationFrame(loop); if (document.hidden) return; const raw = last ? now - last : 16; const dt = Math.min(50, raw); last = now; if (raw < 200) ema += (raw - ema) * .06;
  if (fly) { fly.t = Math.min(1, fly.t + dt / 1100); const e = fly.t < .5 ? 4 * fly.t ** 3 : 1 - (-2 * fly.t + 2) ** 3 / 2; for (const k of ['x', 'y', 'd', 'az', 'el']) view.cam[k] = fly.a[k] + (fly.b[k] - fly.a[k]) * e; if (fly.t >= 1) fly = null; need = true; }
  if (wipeAnim !== null) { const d = wipeAnim - S.wipe, s = Math.sign(d) * dt / 1400; if (Math.abs(d) <= Math.abs(s)) { S.wipe = wipeAnim; wipeAnim = null; if (S.wipe === 0) { view.mapOn = 0; S.map = 0; sim.fill = false; sim.dirty = true; $('#wipe').hidden = true; toolsUI(); } if (S.wipe > .5 && S.ch === 2) { S.did.map = true; story(); } } else S.wipe += s; need = true; }
  if (Math.abs(duskTo - view.dusk) > 1e-3) { view.setDusk(view.dusk + Math.sign(duskTo - view.dusk) * Math.min(Math.abs(duskTo - view.dusk), dt / 1600)); need = true; }
  sim.poll(); sim.pollRead(); let ran = false;
  if (S.night) { const n = S.night, want = Math.min(stepsN * 3, Math.ceil(n.rate * dt / 16.7 / NDT)); const left = Math.ceil(((n.b - n.a) * 3600 - sim.time) / NDT); sim.steps(Math.max(1, Math.min(want, left)), NDT); n.h = n.a + sim.time / 3600; S.level = S.target = sim.sea - SEAT; ran = true; staffW(); duskAt(n.h); const out = n.h - n.sh > 44.5; if (n.sh === 0) view.lamp[0] = out ? Math.max(0, view.lamp[0] - dt / 900 * (.6 + Math.random())) : 1; const ph = n.sh ? 0 : n.h > 44.5 ? 2 : n.h > 43.5 ? 1 : 0; if (ph !== n.ph) { n.ph = ph; story(); } if ((idle++ & 3) === 0) graph(); if (left <= want) endNight(); }
  else {
    if (Math.abs(S.target - S.level) > 1e-4) { const r = (S.pin && S.pin.rise ? .75 : 1.6) * dt / 1000; S.level += Math.max(-r, Math.min(r, S.target - S.level)); S.unsettled = Math.max(S.unsettled, 3); staffW(); sim.sea = SEAT + S.level; if (sim.sea > sim.maxSea) sim.pickTiles(); }
    if (S.ida > 0) { S.ida -= 3600 * dt / 7000; if (S.ida <= 0) { S.ida = 0; sim.rain = 0; view.rainAmt = 0; story(); } S.unsettled = Math.max(S.unsettled, 6); }
    if (brushOn) { const r = sim.brush[2] * DX, v = sim.brush[3] * Math.PI * r * r; S.unsettled = Math.max(S.unsettled, 6); const n = Math.max(2, Math.min(stepsN, 8)), T0 = sim.steps(n); S.poured += v * T0 * PHI; const I = Math.floor((brushOn[0] - U0) / 80), J = Math.floor((brushOn[1] - V0) / 80), k = J * 64 + I; S.rain.set(k, (S.rain.get(k) || 0) + v * T0 * PHI); ran = true; if ((idle++ & 15) === 0) story(); view.rainAmt = 1; }
    else { if (view.rainAmt > 0 && !S.ida) { view.rainAmt = Math.max(0, view.rainAmt - dt / 350); need = true; }
      if (S.unsettled > 0) { const n = S.ida > 0 ? Math.ceil(3600 * dt / 7000 / sim.dt()) : stepsN; if (S.ida > 0) { const want = 3600 * dt / 7000, d = Math.min(sim.dt(), .4); sim.steps(Math.min(stepsN * 2, Math.ceil(want / d)), d); } else sim.steps(n); ran = true; S.unsettled -= dt / 1000; } } }
  if (ran) { need = true; if (!calm) view.time += dt / 1000; if (now - probeT > 180 && sim.probeAsync(onProbe)) probeT = now; const slow = small ? 1100 : 600; if (now - lastRead > slow && sim.readAsync(onRead)) { lastRead = now; } S.pendRead = true; }
  else if (S.pendRead && !sim.rw) { S.pendRead = false; sim.readAsync(onRead); sim.probeAsync(onProbe); }
  if (view.rainAmt > 0 && !ran) { view.time += dt / 1000; need = true; }
  // adapt to the device
  if (ran) { if (ema < 19 && stepsN < (small ? 40 : 60)) stepsN = Math.min(stepsN * 1.02 + .05, small ? 40 : 60); else if (ema > 27 && stepsN > 3) stepsN = Math.max(3, stepsN * .94); } S.slow = need && ema > 36 ? (S.slow || 0) + 1 : 0; if (S.slow > 45 && dpr > 1) { S.maxDpr = Math.max(1, dpr - .5); S.slow = 0; ema = 20; resize(); }
  if (need) { need = false; frame(); S.frames = (S.frames || 0) + 1; }
}
function onProbe(d) { if (!S.pin) return; const P_ = S.pin, v = Math.max(0, d[0]); if (Math.abs(v - P_.d) > .004) { P_.d = v; need = true; } P_.max = Math.max(P_.max, v); if (P_.rise && S.unsettled > 0 && v < .03 && P_.at !== null && P_.at <= 4.5 && Math.abs(S.target - S.level) < .01) S.unsettled = Math.max(S.unsettled, .8); else if (!S.night && !brushOn && !S.ida && sim.umax < .12) S.unsettled = Math.min(S.unsettled, .4); }

boot().catch(e => { console.error(e); fail(t.loadErr); });
