// The page: state, camera, drawing, input. Chapters, panels, game and poster live in ui.js / more.js.
import * as E from "./engine.js";
import { makeGL } from "./gl.js";
import { makeFlat } from "./flat.js";
import { T } from "./i18n.js";
import * as sky from "./sky.js";
import { initUI } from "./ui.js";

const $ = s => document.querySelector(s);
const store = { get: k => { try { return localStorage.getItem("subway." + k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem("subway." + k, v); } catch { } } };
const qs = new URLSearchParams(location.search);
const A = window.__app = { $, store, E, sky, T };
A.lang = ["en", "zh"].includes(qs.get("lang")) ? qs.get("lang") : ["en", "zh"].includes(store.get("lang")) ? store.get("lang") : (navigator.language || "en").toLowerCase().startsWith("zh") ? "zh" : "en";
A.t = () => T[A.lang];
A.calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
A.phone = () => innerWidth < 1000 && !(innerHeight < 520);
const S = A.S = { cx: 0, m: 8.5 * 60, lim: 30, ch: 9, view: "map", dest: -1, step: 1, theme: "auto", tool: "", playing: false, follow: null, game: null, hide: false };

// ---------- load
async function bin(u) { const r = await fetch(u); if (!r.ok) throw Error(u + " " + r.status); const b = await r.arrayBuffer(), h = new Uint8Array(b, 0, 2); if (h[0] !== 31 || h[1] !== 139) return b; return new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer(); }
const load = document.createElement("div"); load.id = "load"; load.textContent = A.t().loading; document.body.append(load);
document.documentElement.lang = A.lang === "zh" ? "zh-Hans" : "en";
let D, net, city, HM, R, G = null;
try {
  const img = new Image(); img.src = "data/shore.png";
  const [a, b] = await Promise.all([bin("data/day.bin.gz"), bin("data/city.bin.gz"), img.decode()]);
  D = E.unpack(a); net = E.buildNet(D); city = E.unpack(b); HM = E.buildHomes(net, city); R = E.newReach(net);
  Object.assign(A, { D, net, city, HM, R });
  try { const bm = await createImageBitmap(img, { colorSpaceConversion: "none", premultiplyAlpha: "none" }); if (!qs.has("nogl")) G = A.G = makeGL($("#map"), net, city, bm); } catch (e) { console.info("webgl: " + e.message); G = null; }
  if (!G) { const c = document.createElement("canvas"), o = document.querySelector("#map"); for (const a of o.attributes) c.setAttribute(a.name, a.value); o.replaceWith(c); G = A.G = makeFlat(c, net, city); }
} catch (e) { load.textContent = A.t().failed; throw e; }
A.Q = E.newRounds(net, 5);

// ---------- stations
const XY = D.stopXY, nC = net.nC;
const cxXY = A.cxXY = new Float32Array(nC * 2); A.cxRoutes = []; A.cxName = D.complexes.map(c => c[0]);
{
  const rs = Array.from({ length: nC }, () => new Map());
  for (let i = 0; i < net.nT; i++) { const p = D.tripPat[i], r = D.patRoute[p]; for (let k = D.patOff[p]; k < D.patOff[p + 1]; k++) { const c = net.cof[D.patStops[k]]; rs[c].set(r, (rs[c].get(r) || 0) + 1); } }
  for (let k = 0; k < nC; k++) {
    let x = 0, y = 0; const m = D.complexes[k][1]; for (const s of m) { x += XY[2 * s]; y += XY[2 * s + 1]; } cxXY[2 * k] = x / m.length; cxXY[2 * k + 1] = y / m.length;
    A.cxRoutes.push([...rs[k]].filter(([, n]) => n >= 4).map(([r]) => r).sort((a, b) => a - b));
  }
  A.weight = rs.map(m => { let n = 0; for (const v of m.values()) n += v; return n; });
}
A.routeName = r => D.routes[r][1].replace("SIR", "SIR").replace(/^6X$/, "6").replace(/^7X$/, "7").replace(/^FX$/, "F");
A.letters = list => { const seen = new Set(); const up = c => A.isDark && c.toUpperCase() === "08179C" ? "5B74FF" : c; return list.map(r => [A.routeName(r), D.routes[r][2]]).filter(([n, c]) => !seen.has(n + c) && seen.add(n + c)).map(([n, c]) => `<i class="ln" style="--c:#${up(c)}">${n}</i>`).join(""); };
{ const n = {}; for (const c of A.cxName) n[c] = (n[c] || 0) + 1; A.twin = k => n[A.cxName[k]] > 1; }   // 125 St is four stations: then the lines say which
A.tag = (k, big) => A.cxName[k].replace(/&/g, "&amp;") + (A.twin(k) ? ` <small class="tw">${[...new Set(A.cxRoutes[k].map(A.routeName))].join(" ")}</small>` : "");
A.byId = id => { const s = D.stops.findIndex(x => x[0] === id); return s < 0 ? -1 : net.cof[s]; };
A.idOf = cx => D.stops[D.complexes[cx][1][0]][0];
A.dist = (a, b) => Math.hypot(cxXY[2 * a] - cxXY[2 * b], cxXY[2 * a + 1] - cxXY[2 * b + 1]);
S.cx = A.byId("631");                                             // Grand Central-42 St

// ---------- URL
A.fromURL = () => {
  const h = new URLSearchParams(location.hash.slice(1)), n = (k, d, lo, hi) => { const v = parseInt(h.get(k), 10); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
  if (h.has("s")) { const c = A.byId(h.get("s")); if (c >= 0) S.cx = c; }
  if (h.has("t")) { const x = /^(\d{1,2})(\d{2})$/.exec(h.get("t")); if (x) S.m = Math.min(1439, +x[1] * 60 + +x[2]); }
  S.lim = n("n", 30, 10, 60); S.ch = n("c", 9, 0, 9); if (S.ch > 2) S.ch = 9; S.view = h.get("v") === "min" ? "min" : "map";
  S.dest = h.has("d") ? A.byId(h.get("d")) : -1; if (S.dest === S.cx) S.dest = -1;
  if (["auto", "light", "dark"].includes(h.get("l"))) S.theme = h.get("l");
  S.step = n("p", [...h.keys()].length ? 0 : 1, 0, 6); S.seed = h.get("g") || null; return [...h.keys()].length > 0;
};
let urlT = 0;
A.hash = () => { const m = Math.floor(S.m), h = [["s", A.idOf(S.cx)], ["t", String(Math.floor(m / 60)).padStart(2, "0") + String(m % 60).padStart(2, "0")]]; if (S.lim !== 30) h.push(["n", S.lim]); if (S.ch !== 9) h.push(["c", S.ch]); if (S.view === "min") h.push(["v", "min"]); if (S.dest >= 0) h.push(["d", A.idOf(S.dest)]); if (S.theme !== "auto") h.push(["l", S.theme]); if (S.step) h.push(["p", S.step]); if (S.game) h.push(["g", S.game.seed]); return "#" + h.map(x => x.join("=")).join("&"); };
A.saveURL = () => { clearTimeout(urlT); urlT = setTimeout(() => { try { history.replaceState(null, "", location.pathname + location.search + A.hash()); } catch { } }, 250); };

// ---------- answer
const cache = { key: "" };
export function solve() {
  const m = Math.floor(S.m) % 1440, far = S.view === "min" || A.warp > 0, lim = Math.max(far ? 7200 : 3600, S.lim * 60), key = [S.cx, m, S.ch, lim].join();
  if (key !== cache.key) {
    cache.key = key;
    if (S.ch > 4) { E.reach(net, R, S.cx, m * 60, lim); A.arr = R.arr; A.hops = R.hops; }
    else { const Q = A.QC ??= E.newRounds(net, 3), q = { ...Q, K: S.ch + 1 }; E.reachRounds(net, q, S.cx, m * 60, lim, true); Q.gen = q.gen; A.arr = Q.arr[S.ch]; A.hops = Q.hops; }
    A.homes = E.litHomes(net, HM, { arr: A.arr }, S.lim * 60);
    if (G) { G.uploadHops(A.hops); G.uploadLit(HM.lit); }
    warpDirty = true; dirty = true;
  } else if (cache.lim !== S.lim) { A.homes = E.litHomes(net, HM, { arr: A.arr }, S.lim * 60); dirty = true; }
  cache.lim = S.lim; A.count = A.countOf(A.arr, S.lim * 60);
}
A.countOf = (arr, lim) => { let n = 0; for (const [, mem] of D.complexes) for (const s of mem) if (arr[s] <= lim) { n++; break; } return n; };
A.arrCx = (k, arr = A.arr) => { let b = E.INF; for (const s of D.complexes[k][1]) if (arr[s] < b) b = arr[s]; return b; };
var Rt = E.newReach(net); let Qt = null;
A.countAt = (cx, m, lim = S.lim, ch = S.ch) => { if (ch > 4) { E.reach(net, Rt, cx, m * 60, lim * 60, { countOnly: true }); return Rt.count; } Qt ??= E.newRounds(net, 3); const q = { ...Qt, K: ch + 1 }; E.reachRounds(net, q, cx, m * 60, lim * 60); Qt.gen = q.gen; return E.roundsCount(net, q, ch, lim * 60); };
// 1440 counts, filled a little each frame, coarse first
export const day = A.day = { key: "", v: new Int16Array(1440).fill(-1), i: 0, order: (() => { const o = [], s = new Set(); for (const st of [32, 8, 4, 2, 1]) for (let i = 0; i < 1440; i += st) if (!s.has(i)) { s.add(i); o.push(i); } return o; })() };
function dayWork(ms) {
  const key = [S.cx, S.lim, S.ch].join(); if (day.key !== key) { day.key = key; day.v.fill(-1); day.i = 0; }
  if (day.i >= 1440) return; const t = performance.now(); while (day.i < 1440 && performance.now() - t < ms) { const m = day.order[day.i++]; day.v[m] = A.countAt(S.cx, m); } dirty = true; stripDirty = true;
}
A.dayAll = () => { while (day.i < 1440 || day.key !== [S.cx, S.lim, S.ch].join()) dayWork(50); return day.v; };

// ---------- camera
const YAW = -0.42;
const cam = A.cam = { x: 0, y: 2500, mpp: 46, yaw: 0, pitch: .62, ox: 0, oy: 0 }, goal = { ...cam };
let W = innerWidth, H = innerHeight, dpr = 1; A.warp = 0; let warpGoal = 0, F = 1, dirty = true, stripDirty = true, warpDirty = true;
A.poke = () => { dirty = true; }; A.pokeStrip = () => { stripDirty = dirty = true; };
export const free = A.free = () => {                              // the part of the window the map may use
  const r = e => e.getBoundingClientRect(); const dock = r($("#dock")); const side = $("#side"), sr = r(side), has = side.childElementCount && sr.height > 4;
  if (A.phone()) return [0, Math.max(54, r($("header")).bottom), W, has ? Math.min(sr.top, dock.top) : dock.top];
  return [Math.min(460, W * .4), 0, W, dock.top + 26];
};
let boxKey = "", box = null;
function reachBox(yaw) {                                          // everything within reach at 8:30 a.m. and the start itself, in camera axes: centre and half sizes
  const k = [S.cx, S.lim, yaw, A.phone()].join(); if (k === boxKey) return box; boxKey = k; E.reach(net, Rt, S.cx, 510 * 60, S.lim * 60, { countOnly: true }); const c = Math.cos(yaw), s = Math.sin(yaw); let a, b, d, e; const xs = [], ys = [];
  for (let i = 0; i < net.nS; i++) if (Rt.arr[i] <= S.lim * 60) { xs.push(XY[2 * i] * c + XY[2 * i + 1] * s); ys.push(-XY[2 * i] * s + XY[2 * i + 1] * c); }
  xs.sort((p, q) => p - q); ys.sort((p, q) => p - q); const ph = A.phone(), n = xs.length - 1, lo = Math.round(n * (ph ? .06 : .01)), hi = Math.round(n * (ph ? .9 : .97)); a = xs[lo]; b = xs[hi]; d = ys[Math.round(n * .03)]; e = ys[Math.round(n * .97)]; { const X = cxXY[2 * S.cx] * c + cxXY[2 * S.cx + 1] * s, Y = -cxXY[2 * S.cx] * s + cxXY[2 * S.cx + 1] * c; a = Math.min(a, X); b = Math.max(b, X); d = Math.min(d, Y); e = Math.max(e, Y); }
  const mx = (a + b) / 2, my = (d + e) / 2; return box = [mx * c - my * s, mx * s + my * c, Math.max(2600, (b - a) / 2), Math.max(2600, (e - d) / 2)];
}
A.reachBox = yaw => reachBox(yaw);
function frameFor() {                                             // where the camera wants to be for the current view
  const [x0, y0, x1, y1] = free(), w = Math.max(120, x1 - x0), h = Math.max(120, y1 - y0), o = { ox: (x0 + x1) / 2 - W / 2, oy: (y0 + y1) / 2 - H / 2 };
  if (S.view === "min") { const r = 60 * MIN; return { ...o, x: cxXY[2 * S.cx], y: cxXY[2 * S.cx + 1], mpp: r / (Math.min(w, h) * .5 * (A.phone() ? 1.6 : 1.12)), yaw: 0, pitch: 0 }; }
  const yaw = A.phone() ? YAW : YAW * .55, b = reachBox(yaw), pitch = .66, mpp = Math.max(13, Math.min(80, (b[2] + 1300) * 2 / w, (b[3] + 1300) * 2 * Math.cos(pitch) / (h * .94))), need = Math.max((b[2] + 900) * 2 / w, (b[3] + 900) * 2 * Math.cos(pitch) / (h * .84));
  return { ...o, x: b[0], y: b[1] - need * h * .035, mpp: Math.max(13, Math.min(72, need)), yaw, pitch };
}
A.recentre = (instant) => { Object.assign(goal, frameFor()); A.moved = false; if (instant) Object.assign(cam, goal); dirty = true; A.ui?.tools(); };
A.look = o => { Object.assign(goal, o); dirty = true; };
const clampCam = () => { goal.mpp = Math.max(2.5, Math.min(120, goal.mpp)); goal.x = Math.max(-26000, Math.min(24000, goal.x)); goal.y = Math.max(-30000, Math.min(26000, goal.y)); };
function resize() {
  W = innerWidth; H = innerHeight; dpr = Math.min(devicePixelRatio || 1, A.lowRes ? 1.25 : 2); if (G) G.resize(W, H, dpr);
  const o = $("#over"); o.width = W * dpr; o.height = H * dpr; stripDirty = true; A.fitLeft?.(); if (!S.follow) A.recentre(true); dirty = true;
}
A.resize = resize;

// ---------- distance as minutes
const MIN = 300;                                                  // metres of paper per minute in the "minutes" drawing
const wp = new Float32Array(net.nS * 2).fill(1e7), wg = new Float32Array(net.nS * 2).fill(1e7), wtex = new Float32Array(64 * Math.ceil(net.nH / 64) * 4);
const hopEnds = new Uint16Array(net.nH * 2); { const C = net.C; for (let k = 0; k < C.n; k++) { const h = C.hop[k] >> 1; if (C.hop[k] & 1) { hopEnds[2 * h] = C.to[k]; hopEnds[2 * h + 1] = C.from[k]; } else { hopEnds[2 * h] = C.from[k]; hopEnds[2 * h + 1] = C.to[k]; } } }
function warpGoals() {
  const ox = cxXY[2 * S.cx], oy = cxXY[2 * S.cx + 1];
  for (let k = 0; k < nC; k++) {                                  // a whole complex sits at its earliest arrival
    const a = A.arrCx(k), dx = cxXY[2 * k] - ox, dy = cxXY[2 * k + 1] - oy, d = Math.hypot(dx, dy) || 1, ok = a <= 7200, r = a / 60 * MIN;
    for (const s of D.complexes[k][1]) { if (!ok) { wg[2 * s] = 1e7; continue; } const x = ox + dx / d * r, y = oy + dy / d * r; if (wg[2 * s] > 9e6 || wp[2 * s] > 9e6) { wp[2 * s] = x; wp[2 * s + 1] = y; } wg[2 * s] = x; wg[2 * s + 1] = y; }
  }
}
function warpStep(dt) {
  const k = A.calm ? 1 : 1 - Math.exp(-dt / 110); let mv = false;
  for (let i = 0; i < wp.length; i += 2) { if (wg[i] > 9e6) { wp[i] = 1e7; continue; } const dx = wg[i] - wp[i], dy = wg[i + 1] - wp[i + 1]; if (Math.abs(dx) + Math.abs(dy) > 4) { wp[i] += dx * k; wp[i + 1] += dy * k; mv = true; } }
  for (let h = 0; h < net.nH; h++) { const a = hopEnds[2 * h], b = hopEnds[2 * h + 1]; wtex[4 * h] = wp[2 * a]; wtex[4 * h + 1] = wp[2 * a + 1]; wtex[4 * h + 2] = wp[2 * b]; wtex[4 * h + 3] = wp[2 * b + 1]; }
  if (G) G.uploadWarp(wtex); return mv;
}
export const stopPos = A.stopPos = (s, out = []) => { const w = A.warp; if (w <= 0 || wp[2 * s] > 9e6) { out[0] = XY[2 * s]; out[1] = XY[2 * s + 1]; out[2] = w > .5 && wp[2 * s] > 9e6; return out; } out[0] = XY[2 * s] + (wp[2 * s] - XY[2 * s]) * w; out[1] = XY[2 * s + 1] + (wp[2 * s + 1] - XY[2 * s + 1]) * w; out[2] = false; return out; };
export const cxPos = A.cxPos = k => { const w = A.warp, s = D.complexes[k][1][0]; if (w <= 0) return [cxXY[2 * k], cxXY[2 * k + 1], false]; if (k === S.cx) return [cxXY[2 * k], cxXY[2 * k + 1], false]; if (wp[2 * s] > 9e6) return [cxXY[2 * k], cxXY[2 * k + 1], w > .5]; return [cxXY[2 * k] + (wp[2 * s] - cxXY[2 * k]) * w, cxXY[2 * k + 1] + (wp[2 * s + 1] - cxXY[2 * k + 1]) * w, false]; };
// where a train is drawn
const _p = [0, 0, 0, 0], _q = [0, 0, 0, 0], _o = {};
function trainSeg(i, x, push, len, alpha, width, side = 0, colour = null) {
  const s = E.tripState(net, i, x, _o); if (!s) return null; const h = s.hop >> 1, L = net.hopLen[D.hopOff[h + 1] - 1] || 1, u = s.at ? s.u : .45 * s.u + .55 * s.u * s.u * (3 - 2 * s.u); let d = Math.min(.5, len / L / 2);
  if (A.warp > .3) { const p = hopEnds[2 * h], q = hopEnds[2 * h + 1], l = Math.hypot(wp[2 * p] - wp[2 * q], wp[2 * p + 1] - wp[2 * q + 1]); d = Math.min(.5, 6 * cam.mpp / Math.max(1, l) / 2); }
  const a = Math.max(0, Math.min(1 - 2 * d, u - d)), b = a + 2 * d; pt(s.hop, a, _p); pt(s.hop, b, _q);
  const ddx = _q[0] - _p[0], ddy = _q[1] - _p[1], dl = Math.hypot(ddx, ddy) || 1, sd = [ddy / dl * side, -ddx / dl * side];
  if (push && _p[0] < 9e6) { const c = colour || G.rgb[D.hopCol[h]]; push.push(_p[0], _p[1], _q[0], _q[1], (_p[2] + sd[0]) * 40, (_p[3] + sd[1]) * 40, (_q[2] + sd[0]) * 40, (_q[3] + sd[1]) * 40, c[0], c[1], c[2], 255, width, alpha, 0); }
  return [(_p[0] + _q[0]) / 2, (_p[1] + _q[1]) / 2, (_p[2] + _q[2]) / 2 + sd[0], (_p[3] + _q[3]) / 2 + sd[1], s];
}
function pt(hop, u, out) {
  E.hopPoint(net, hop, u, out); if (A.warp > 0) { const h = hop >> 1, f = hop & 1 ? 1 - u : u, a = hopEnds[2 * h], b = hopEnds[2 * h + 1]; if (wp[2 * a] > 9e6 || wp[2 * b] > 9e6) { out[0] = 1e7; return out; } const x = wp[2 * a] + (wp[2 * b] - wp[2 * a]) * f, y = wp[2 * a + 1] + (wp[2 * b + 1] - wp[2 * a + 1]) * f; out[0] += (x - out[0]) * A.warp; out[1] += (y - out[1]) * A.warp; } return out;
}
A.trainSeg = trainSeg;

// ---------- drawing
const GS = { pal: sky.DAYP, night: 0, lim: 1800, reveal: 1e9, reachA: 1, warp: 0, trainN: 0, discN: 0, routeN: 0, ride: false };
let reveal = 1e9, revealT = 0, revealFrom = 0; A.startReveal = () => { if (A.calm) { reveal = 1e9; return; } revealT = performance.now(); reveal = 0; dirty = true; };
let reachA = 1;
A.palette = () => { const m = S.theme === "light" ? 720 : S.theme === "dark" ? 180 : ((S.m % 1440) + 1440) % 1440, L = sky.light(m), K = sky.dark(m); return [sky.mixPal(L, K, F), sky.isDark(m) ? K : L, sky.isDark(m)]; };
let lastCss = "";
function paint(pal) { const [bg, ink, shore] = [sky.css(pal.bg), sky.css(pal.ink), sky.css(sky.mixPal({ a: pal.ink }, { a: pal.bg }, .34).a)]; const k = bg + ink; if (k === lastCss) return; lastCss = k; const st = document.documentElement.style; st.setProperty("--bg", bg); st.setProperty("--ink", ink); st.setProperty("--soft", shore); st.setProperty("--rule", bg.replace("rgb", "rgba").replace(")", ",0)")); document.querySelector("meta[name=theme-color]").content = bg; st.colorScheme = A.isDark ? "dark" : "light"; stripDirty = true; }
const _s = [], INKC = [25, 27, 38];
function drawGL() {
  const lim = S.lim * 60; GS.lim = lim; GS.reveal = reveal; GS.night = F; GS.warp = A.warp; GS.reachA = reachA; GS.ride = !!S.follow && !S.follow.race;
  // dots
  const ds = A.phone() ? .8 : .92, dz = Math.max(.75, Math.min(1.5, 46 / cam.mpp)), shown = Math.min(lim, reveal);
  for (let s = 0; s < net.nS; s++) {
    const p = stopPos(s, _s), j = 4 * s, a = A.arr[s], on = a <= shown && reachA > .4; G.dotA[j] = p[0]; G.dotA[j + 1] = p[1];
    const hid = p[2]; G.dotA[j + 2] = hid ? 0 : net.cof[s] === S.cx ? (S.follow ? 4 : 0) : net.cof[s] === S.dest ? 6.5 : on ? (2.35 * dz + .35) * ds : 1.2 * dz; G.dotA[j + 3] = on || net.cof[s] === S.dest ? 1 : 0;
  }
  let n = 0; if (A.warp < .7) for (let s = 0; s < net.nS; s++) { const a = A.arr[s]; if (a <= shown) { const j = 3 * n++; G.discA[j] = XY[2 * s]; G.discA[j + 1] = XY[2 * s + 1]; G.discA[j + 2] = Math.min(E.WALK_R, (lim - a) * E.WALK); } } GS.discN = n;
  // trains
  G.trP.reset(); const sec = S.m * 60, len = Math.max(170, 5 * cam.mpp); let only = S.follow?.race;
  const INKP = F > .5 ? [244, 236, 219] : INKC;
  if (only) for (const r of only.trips) trainSeg(r.trip, A.raceX(r, sec), G.trP, len * 1.6, 1, 1.35, r.side, INKP);
  else if (A.warp < .6 && !A.noTrains) E.eachTrain(net, sec % 86400, (i, x) => { const f = S.follow && S.follow.trip === i; trainSeg(i, x, G.trP, f ? len * 1.4 : len, (S.hide ? .5 : 1) * (1 - A.warp / .6), f ? 1.6 : 1, 0, f ? INKP : null); });
  GS.trainN = G.trP.n;
  // the way to the chosen station
  G.rtP.reset(); const legs = S.follow?.race ? S.follow.race.legs : S.tool === "to" || S.dest >= 0 ? A.legs : null;
  if (legs) for (const pass of [0, 1]) for (const l of legs) A.legPts(l, (a, b, c) => { const x = b[0] - a[0], y = b[1] - a[1], L = Math.hypot(x, y) || 1, k = l.side || 0, u = y / L * k, v = -x / L * k, w = l.w || 1; if (!pass) c = INKP; G.rtP.push(a[0], a[1], b[0], b[1], (a[2] + u) * 40, (a[3] + v) * 40, (b[2] + u) * 40, (b[3] + v) * 40, c[0], c[1], c[2], 255, pass ? w : w * 1.45, 1, 0); }); GS.routeN = G.rtP.n;
  G.setCam(cam); const [pal] = A.palette(); GS.pal = pal; G.frame(GS);
}
A.legPts = (l, f) => {                                            // every little piece of track a leg runs over
  const p = D.tripPat[l.trip], s0 = D.patOff[p], s1 = D.patOff[p + 1]; let i = -1, j = -1; for (let k = s0; k < s1; k++) { if (i < 0 && D.patStops[k] === l.from) i = k; else if (i >= 0 && D.patStops[k] === l.to) { j = k; break; } }
  if (i < 0 || j < 0) return; for (let k = i; k < j; k++) { const hop = D.patHops[k], h = hop >> 1, c = G.rgb[D.hopCol[h]], n = A.warp > .01 ? 4 : D.hopOff[h + 1] - D.hopOff[h]; let a = pt(hop, 0, [0, 0, 0, 0]); for (let q = 1; q <= n; q++) { const b = pt(hop, q / n, [0, 0, 0, 0]); if (a[0] < 9e6 && b[0] < 9e6) f(a, b, c); a = b; } }
};
A.raceX = (r, sec) => Math.min(r.x1, r.x0 + (sec - r.clock0));
A.legStops = l => {                                               // where a leg's stops are drawn when it runs on one side of its track
  const p = D.tripPat[l.trip], s0 = D.patOff[p], s1 = D.patOff[p + 1], o = []; let i = -1; for (let k = s0; k < s1; k++) { const st = D.patStops[k]; if (i < 0 && st === l.from) i = k; if (i < 0) continue; const end = st === l.to, hop = end ? D.patHops[k - 1] : D.patHops[k], a = pt(hop, end ? .97 : 0, [0, 0, 0, 0]), b = pt(hop, end ? 1 : .03, [0, 0, 0, 0]), x = b[0] - a[0], y = b[1] - a[1], L = Math.hypot(x, y) || 1, q = end ? b : a; o.push([q[0], q[1], q[2] + y / L * l.side, q[3] - x / L * l.side]); if (end) break; } return o;
};
// labels
const oc = $("#over").getContext("2d");
const GEO = [["man", -1500, 5900, 11, 1], ["bk", 1500, -9200, 15, 0], ["qn", 12500, 1500, 15, 0], ["bx", 8200, 13200, 14, 0], ["si", -16500, -15500, 14, 0], ["nj", -13500, 2500, 14, 0], ["hud", -5900, 5200, 14, 2], ["bay", -7300, -8300, 14, 2], ["jam", 9500, -13300, 13, 2], ["sea", 4500, -20500, 15, 2], ["lb", -5500, -19000, 14, 2], ["snd", 15500, 11000, 13, 2]];
const pref = [...Array(nC).keys()].sort((a, b) => A.weight[b] - A.weight[a]);
const FONT = () => A.lang === "zh" ? `OST,"OSTZ","Songti SC",serif` : `OST,Georgia,serif`;
function drawOver() {
  const g = oc, z = A.t(); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); if (!G) return;
  const [, pal] = A.palette(), ink = sky.css(pal.ink), [x0, y0, x1, y1] = free(), phone = A.phone(), taken = [];
  for (const id of ["#ask", "#ans", "#side > *", "nav", "#you", "#dock"]) document.querySelectorAll(id).forEach(e => { const r = e.getBoundingClientRect(); if (r.width && !e.hidden) taken.push([r.left - 6, r.top - 4, r.right + 6, r.bottom + 4]); });
  const hits = b => taken.some(t => b[0] < t[2] && b[2] > t[0] && b[1] < t[3] && b[3] > t[1]);
  const w = A.warp;
  if (w > .02) {                                                  // rings of 10 minutes
    const c = G.project(cxXY[2 * S.cx], cxXY[2 * S.cx + 1]); g.save(); g.globalAlpha = w; const gr = g.createLinearGradient(x0 - 40, 0, x0 + 160, 0); gr.addColorStop(0, ink.replace('rgb', 'rgba').replace(')', ',0)')); gr.addColorStop(1, ink); g.strokeStyle = phone ? ink : gr; g.fillStyle = ink; g.lineWidth = 1;
    for (let k = 10; k <= 120; k += 10) { const r = k * MIN / cam.mpp; if (r > Math.hypot(W, H)) break; g.globalAlpha = w * (k === S.lim ? .95 : k % 30 ? .17 : .34); g.lineWidth = k === S.lim ? 1.4 : 1; g.beginPath(); g.arc(c[0], c[1], r, 0, 7); g.stroke(); }
    g.font = `15px ${FONT()}`; g.textAlign = "center"; g.lineJoin = "round"; g.strokeStyle = sky.css(pal.bg); g.lineWidth = 6;
    for (const k of [10, 20, 30, 40, 60, 90]) { const r = k * MIN / cam.mpp, x = c[0] + r * Math.sin(.0), y = c[1] + r; if (y > y1 - 4 || y < y0 + 12) continue; const tx = z.ring(k), tw = g.measureText(tx).width, b = [x - tw / 2 - 3, y - 9, x + tw / 2 + 3, y + 9]; if (hits(b)) continue; taken.push(b); g.globalAlpha = w; g.strokeText(tx, x, y + 5); g.fillText(tx, x, y + 5); }
    g.restore();
  } else if (cam.mpp > 14) {
    g.save(); g.fillStyle = ink; g.textAlign = "center";
    for (const [k, x, y, sz, kind] of GEO) { const p = G.project(x, y); const tx = z.geo[k]; g.globalAlpha = (kind === 2 ? .62 : .4) * (1 - w * 4); if (g.globalAlpha < .05) continue; g.font = `${kind === 2 && A.lang === "en" ? "italic " : ""}${sz}px ${FONT()}`; if ("letterSpacing" in g) g.letterSpacing = kind === 2 ? "1px" : "4px"; const tw = g.measureText(tx).width, b = [p[0] - tw / 2, p[1] - 12, p[0] + tw / 2, p[1] + 4]; if (kind !== 1 && !hits(b) && b[0] > x0 - 20 && b[2] < x1 - 4 && b[1] > y0 && b[3] < y1) { g.fillText(tx, p[0], p[1]); taken.push(b); } }
    if ("letterSpacing" in g) g.letterSpacing = "0px"; g.restore();
  }
  // station names
  g.save(); g.lineJoin = "round"; const fs = phone ? 13 : 14.5; const lim = Math.min(S.lim * 60, reveal); let left = phone ? 11 : 24; if (cam.mpp < 15) left *= 1.6; if (cam.mpp < 9) left *= 2;
  const bgc = sky.css(w > .5 ? pal.bg : pal.land);
  const label = (k, force, own) => {
    const p0 = cxPos(k); if (p0[2]) return false; const p = G.project(p0[0], p0[1]); if (p[0] < x0 + 4 || p[0] > x1 - 4 || p[1] < y0 + 8 || p[1] > y1 - 6) return false;
    const tx = own || A.cxName[k]; g.font = `${force ? "bold " : ""}${fs + (force ? 2 : 0)}px ${FONT()}`; const tw = g.measureText(tx).width; const gap = S.follow?.race ? 46 : 8; for (const [dx, al] of S.follow?.race ? [[gap, 0]] : [[gap, 0], [-gap - tw, 0]]) { const b = [p[0] + dx - 3, p[1] - 10, p[0] + dx + tw + 3, p[1] + 9]; if (b[2] > W - 4 || b[0] < x0 || (hits(b) && !force)) continue; taken.push(b); g.globalAlpha = 1; g.strokeStyle = bgc; g.lineWidth = 4.5; g.strokeText(tx, p[0] + dx, p[1] + 5); g.fillStyle = ink; g.fillText(tx, p[0] + dx, p[1] + 5); return true; } return false;
  };
  const you = G.project(...cxPos(S.cx)); if (!S.follow) taken.push([you[0] - 14, you[1] - 34, you[0] + 14, you[1] + 8]);
  if (S.dest >= 0) label(S.dest, true);
  if (S.follow?.names) { for (const [k, n] of S.follow.names) label(k, false, n); }
  else if (!S.follow || S.follow.race) { for (const k of pref) { if (left <= 0) break; if (k === S.cx || k === S.dest || S.hide && !A.showAllNames) { if (S.hide && left > 0 && k !== S.cx && label(k)) left--; continue; } if (A.arrCx(k) <= lim && label(k)) left--; } }
  g.restore();
  // marker
  const y = $("#you"); if (S.follow && !S.follow.race) y.hidden = true; else { const off = you[0] < x0 - 40 || you[0] > W + 40 || you[1] < y0 - 10 || you[1] > y1 + 30; y.hidden = off || !!S.follow; const hw = (y.offsetWidth || 120) / 2, yx = Math.max(hw + 4, Math.min(W - hw - 4, you[0])); y.style.setProperty('--dx', (you[0] - yx).toFixed(1) + 'px'); y.style.transform = `translate(${yx.toFixed(1)}px,${you[1].toFixed(1)}px) translate(-50%,-100%) translateY(-22px)`; if (y.dataset.k !== S.cx + "") { y.dataset.k = S.cx; y.innerHTML = A.tag(S.cx); } }
  A.ui?.over?.(g, ink, pal, FONT);
}
// ---------- the strip of the day
function drawStrip() {
  const c = $("#strip"), w = c.clientWidth, h = c.clientHeight; if (!w) return; if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const g = c.getContext("2d"), [, pal] = A.palette(), ink = sky.css(pal.ink), z = A.t(), top = h < 74 ? 6 : 26, bot = h - 25, v = day.v; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  let mx = 10; for (const a of v) if (a > mx) mx = a; mx *= 1.06; const X = m => m / 1440 * w, cur = X(S.m % 1440);
  // the light of each hour, a thin ribbon under the graph
  for (let x = 0; x < w; x += 3) { const m = (x + 1) / w * 1440, q = sky.isDark(m) ? sky.dark(m) : sky.light(m); g.fillStyle = sky.css(sky.isDark(m) ? q.land : q.bg); g.fillRect(x, bot + 1, 3.5, 4); }
  g.strokeStyle = ink; g.globalAlpha = .5; g.lineWidth = 1; g.strokeRect(-1, bot + .5, w + 2, 5);
  // one hairline per minute (per pixel column on small screens): its height is the number of stations
  g.globalAlpha = 1; const step = Math.max(1, Math.ceil(1440 / w * 2.2)), px = w / 1440 * step, lw = 1; let last = -1;
  g.fillStyle = ink; if (!S.hide) for (let m = 0; m < 1440; m += step) { let lo = 1e9, hi = -1; for (let q = m; q < m + step && q < 1440; q++) if (v[q] >= 0) { lo = Math.min(lo, v[q]); hi = Math.max(hi, v[q]); } if (hi < 0) { if (last < 0) continue; lo = hi = last; } last = hi; const x = Math.round(X(m) + px / 2) + .5, Y = a => bot - a / mx * (bot - top); g.globalAlpha = .85; g.fillRect(x - .5, Y(lo), 1, bot - Y(lo)); if (hi > lo) { g.globalAlpha = .38; g.fillRect(x - .5, Y(hi), 1, Y(lo) - Y(hi)); } }
  g.font = `${w < 700 ? 14 : 15}px ${FONT()}`; g.globalAlpha = .85; g.textAlign = "left"; g.fillStyle = ink; if (!S.hide && top > 10) g.fillText(z.cap, w < 700 ? 18 : 48, 14);
  // cursor
  g.globalAlpha = 1; g.fillStyle = ink; const cv = v[Math.floor(S.m) % 1440], cy = cv >= 0 && !S.hide ? bot - cv / mx * (bot - top) : top; g.fillRect(cur - .75, top - 6, 1.5, bot - top + 12); g.beginPath(); g.arc(cur, cy, 5.5, 0, 7); g.fillStyle = sky.css(pal.bg); g.fill(); g.lineWidth = 2; g.strokeStyle = ink; g.stroke(); g.beginPath(); g.arc(cur, cy, 2, 0, 7); g.fillStyle = ink; g.fill();
  // hours
  g.font = `15px ${FONT()}`; g.textAlign = "center"; g.globalAlpha = .92; const lab = w < 700 ? z.hoursS : z.hours; for (const k in lab) g.fillText(lab[k], X(k * 60), h - 4); g.globalAlpha = .55; for (let k = 0; k <= 24; k++) g.fillRect(X(k * 60) - .5, bot + 5.5, 1, k % 3 ? 2 : 4);
  A.stripGeom = { X, bot, top, mx };
}
A.redrawStrip = drawStrip;
// ---------- numbers
let shownN = -1, lastMin = -1;
export function numbers() {
  const z = A.t(), m = Math.floor(S.m) % 1440; const key = [A.lang, m, A.count, S.lim, S.cx, S.hide, S.step, S.tool, S.ch, !!S.game, !!S.follow, S.playing, drag.strip].join(); if (key === shownN) return; shownN = key;
  $("#clock").innerHTML = z.clock(m); const st = $("#strip"); st.setAttribute("aria-valuenow", m); st.setAttribute("aria-valuetext", z.slider(z.time(m), A.count, A.cxName[S.cx]));
  const p = A.homes / HM.total * 100, ptxt = p >= 9.95 ? Math.round(p) : p.toFixed(1); $("#ans").hidden = S.hide || S.step === 6; $("#ans b").textContent = A.count; $("#ans .u").textContent = z.ans(A.count); $("#ans .h").textContent = A.phone() ? z.homesShort(ptxt) : z.homes(ptxt);
  let bm = -1; if (S.step === 0 && !S.game && !S.follow && !S.tool && !S.playing && !drag.strip) { const base = A.count; let bv = Math.max(base * 1.15, base + 5); for (let q = 1; q <= 15; q++) { const c = A.countAt(S.cx, (m + q) % 1440); if (c > bv) { bv = c; bm = (m + q) % 1440; } } if (bm >= 0) { $("#ans .w").dataset.v = bm; $("#ans .w").textContent = z.again1(z.time(bm), bv); } } $("#ans .w").hidden = bm < 0;
}
A.numbers = () => { shownN = -1; numbers(); };
// ---------- loop
let lastT = performance.now(); A.fps = [];
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(80, now - lastT); lastT = now; if (document.hidden) return;
  if (S.playing) { S.m = (S.m + dt / 1000 * 24) % 1440; dirty = stripDirty = true; A.saveURL(); }
  if (A.tick?.(dt, now)) dirty = true;
  const dk = A.palette()[2]; A.isDark = dk; const Ft = dk ? 1 : 0; if (F !== Ft) { F = A.calm ? Ft : F + Math.sign(Ft - F) * Math.min(Math.abs(Ft - F), dt / 420); dirty = stripDirty = true; }
  if (reveal < 1e8) { const u = (now - revealT) / 1000; reveal = u > 1.25 ? 1e9 : S.lim * 60 * 1.06 * (1 - (1 - Math.min(1, u / 1.2)) ** 2.2); dirty = true; }
  const ra = S.hide || (S.follow && !S.follow.keepReach) ? 0 : 1; if (reachA !== ra) { reachA = A.calm ? ra : reachA + Math.sign(ra - reachA) * Math.min(Math.abs(ra - reachA), dt / 300); dirty = true; }
  warpGoal = S.view === "min" ? 1 : 0; if (A.warp !== warpGoal) { A.warpT = (A.warpT ?? (1 - warpGoal)); A.warpT += Math.sign(warpGoal - A.warpT) * Math.min(Math.abs(warpGoal - A.warpT), dt / 1500); if (A.calm) A.warpT = warpGoal; const u = A.warpT; A.warp = u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2; dirty = true; }
  if (dirty || warpDirty) { solve(); numbers(); }
  if (A.warp > 0 || warpGoal) { if (warpDirty) { warpGoals(); if (A.warp < .02) wp.set(wg); } if (warpStep(dt) || warpDirty) dirty = true; } warpDirty = false;
  const k = A.calm || drag.on ? (drag.on ? .55 : 1) : 1 - Math.exp(-dt / (S.follow ? 160 : 170)); let mv = false; for (const q of ["x", "y", "mpp", "yaw", "pitch", "ox", "oy"]) { const d = goal[q] - cam[q], eps = q === "yaw" || q === "pitch" ? 1e-4 : q === "mpp" ? .01 : .4; if (Math.abs(d) > eps) { cam[q] += d * k; mv = true; } else cam[q] = goal[q]; } if (mv) dirty = true;
  dayWork(S.playing || drag.strip ? 2 : 7);
  const pal = A.palette()[1]; paint(pal);
  if (dirty) { dirty = false; if (G) { drawGL(); } drawOver(); }
  if (stripDirty) { stripDirty = false; drawStrip(); }
  A.frames = (A.frames || 0) + 1;
}
A.drawNow = () => { solve(); if (G) drawGL(); drawOver(); };
A.renderTo = (w, h, over, fn) => {                                // one still at another size (poster)
  const keep = [W, H, dpr, { ...cam }, F, A.warp, S.m, reveal, reachA]; W = w / 1.6; H = h / 1.6; dpr = 1.6; reveal = 1e9; reachA = 1; Object.assign(S, over); F = sky.isDark(over.m) ? 1 : 0; G.resize(W, H, dpr); cache.key = ""; solve(); A.warp = over.view === "min" ? 1 : 0; if (A.warp) { warpGoals(); wp.set(wg); warpStep(1e9); } Object.assign(cam, over.cam); drawGL(); G.gl.finish(); const out = fn(G.gl.canvas, G.project); [W, H, dpr] = keep; Object.assign(cam, keep[3]); F = keep[4]; A.warp = keep[5]; S.m = keep[6]; reveal = keep[7]; reachA = keep[8]; G.resize(W, H, dpr); cache.key = ""; dirty = true; return out;
};

// ---------- input: the map
const drag = { on: false, strip: false, pts: new Map(), moved: 0, pin: false };
const near = (x, y, r) => { let best = r, bk = -1; for (let k = 0; k < nC; k++) { const p0 = cxPos(k); if (p0[2]) continue; const p = G.project(p0[0], p0[1]), d = Math.hypot(p[0] - x, p[1] - y); if (d < best) { best = d; bk = k; } } return bk; };
A.near = near;
const map = $("#map"); let last = null, pinch = 0, tapT = 0, tapXY = [0, 0];
map.addEventListener("pointerdown", e => {
  if (!G) return; map.setPointerCapture(e.pointerId); drag.pts.set(e.pointerId, [e.clientX, e.clientY]); if (drag.pts.size === 1) { drag.moved = 0; last = [e.clientX, e.clientY]; const y = G.project(...cxPos(S.cx)); drag.pin = !S.follow && !S.hide && Math.hypot(y[0] - e.clientX, y[1] - 18 - e.clientY) < (e.pointerType === "touch" ? 30 : 20); } else { drag.pin = false; const [a, b] = [...drag.pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); last = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; drag.moved = 99; } hideTip();
});
const zoomAt = (x, y, f) => { const p = G.unproject(x, y); const old = goal.mpp; goal.mpp *= f; clampCam(); if (!p) return; const q = goal.mpp / old; if (S.view === "min") return; goal.x = p[0] + (goal.x - p[0]) * q; goal.y = p[1] + (goal.y - p[1]) * q; clampCam(); A.setMoved(); dirty = true; };
A.setMoved = () => { if (!A.moved) { A.moved = true; A.ui?.tools(); } };
map.addEventListener("pointermove", e => {
  if (!G) return; if (!drag.pts.has(e.pointerId)) { hover(e); return; } drag.pts.set(e.pointerId, [e.clientX, e.clientY]);
  let x = e.clientX, y = e.clientY; if (drag.pts.size >= 2) { const [a, b] = [...drag.pts.values()]; x = (a[0] + b[0]) / 2; y = (a[1] + b[1]) / 2; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch > 10 && d > 10) { zoomAt(x, y, pinch / d); Object.assign(cam, { mpp: goal.mpp, x: goal.x, y: goal.y }); } pinch = d; }
  drag.moved += Math.abs(x - last[0]) + Math.abs(y - last[1]);
  if (drag.pin && drag.moved > 5) { map.classList.add("drag"); const k = near(x, y, 60); if (k >= 0 && k !== S.cx) A.setStart(k, true); last = [x, y]; return; }
  if (drag.moved > 7 && !S.follow) { const a = G.unproject(last[0], last[1]), b = G.unproject(x, y); if (a && b) { goal.x += a[0] - b[0]; goal.y += a[1] - b[1]; clampCam(); cam.x = goal.x; cam.y = goal.y; G.setCam(cam); A.setMoved(); dirty = true; } map.classList.add("drag"); }
  last = [x, y];
});
const up = e => {
  if (!drag.pts.has(e.pointerId)) return; drag.pts.delete(e.pointerId); map.classList.remove("drag"); if (drag.pts.size) { last = [...drag.pts.values()][0]; return; }
  if (drag.pin && drag.moved > 5) { drag.pin = false; A.setStart(S.cx, false, true); return; } drag.pin = false;
  if (e.type === "pointerup" && drag.moved <= 7) A.tap(e.clientX, e.clientY, e.pointerType);
};
map.addEventListener("pointerup", up); map.addEventListener("pointercancel", up);
map.addEventListener("wheel", e => { if (!G) return; e.preventDefault(); if (S.follow && !S.follow.race) return; zoomAt(e.clientX, e.clientY, Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * .0032)); }, { passive: false });
map.addEventListener("pointerleave", () => hideTip());
map.addEventListener("touchend", e => { if (e.cancelable) e.preventDefault(); }, { passive: false });   // no second, ghost click on whatever appears under the finger
const tip = $("#tip"); const hideTip = () => { tip.hidden = true; A.hover = -1; };
function hover(e) { if (e.pointerType === "touch" || S.follow) return; const k = near(e.clientX, e.clientY, 16); map.classList.toggle("hit", k >= 0); if (k < 0) return hideTip(); const z = A.t(), a = A.arrCx(k); tip.hidden = false; tip.innerHTML = `<b>${A.cxName[k]}</b><span>${A.letters(A.cxRoutes[k])}</span>${S.hide ? "" : `<em>${k === S.cx ? z.tipStart : a <= 3600 ? z.tipMin(Math.ceil(a / 60)) : z.tipNo(60)}</em>`}`; const w = tip.offsetWidth, h = tip.offsetHeight; tip.style.transform = `translate(${Math.min(W - w - 8, e.clientX + 16)}px,${Math.max(8, e.clientY - h - 12)}px)`; A.hover = k; }
A.tap = (x, y, type) => { const k = near(x, y, type === "touch" ? 34 : 24); if (k < 0) return; if (A.ui.tapStation(k)) return; A.setStart(k, false, true); };
A.setStart = (k, live, done) => {
  const was = S.cx; S.cx = k; if (S.dest === k) S.dest = -1; if (!live && was !== k) A.startReveal(); dirty = true; stripDirty = true; A.saveURL(); $("#you").innerHTML = A.tag(k); $("#you").dataset.k = k; if (S.view === "min") { Object.assign(goal, frameFor()); wp.set(wg); } A.ui.ask(); if (!live) { const p = G ? G.project(...cxPos(k)) : null, [x0, y0, x1, y1] = free(); if (p && S.view === "map" && (p[0] < x0 + 30 || p[0] > x1 - 30 || p[1] < y0 + 40 || p[1] > y1 - 30 || !A.moved)) { const f = frameFor(); if (A.moved) f.mpp = goal.mpp; Object.assign(goal, f); } } if (done || !live) A.ui.startChanged();
};
A.setTime = (m, end) => { if (A.ui.L) A.ui.L.anim = null; S.m = ((m % 1440) + 1440) % 1440; dirty = stripDirty = true; A.saveURL(); A.ui.timeChanged(end); };
map.addEventListener("keydown", e => { const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]; if (d) { const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw), u = goal.mpp * 70; goal.x += (c * d[0] - s * d[1]) * u; goal.y += (s * d[0] + c * d[1]) * u; clampCam(); A.setMoved(); dirty = true; e.preventDefault(); } else if (e.key === "+" || e.key === "=") { goal.mpp /= 1.25; clampCam(); A.setMoved(); dirty = true; } else if (e.key === "-") { goal.mpp *= 1.25; clampCam(); A.setMoved(); dirty = true; } else if (e.key === "Enter") A.ui.find("s"); });
// ---------- input: the strip
const strip = $("#strip"); const sx = e => { const r = strip.getBoundingClientRect(); return Math.max(0, Math.min(1439, (e.clientX - r.left) / r.width * 1440)); };
let fine = null;
strip.addEventListener("pointerdown", e => { if (S.game && S.hide || S.follow) return; strip.setPointerCapture(e.pointerId); drag.strip = true; S.playing = false; A.ui.tools(); A.setTime(Math.round(sx(e))); });
strip.addEventListener("pointermove", e => { if (drag.strip) A.setTime(Math.round(sx(e))); });
const su = () => { if (drag.strip) { drag.strip = false; dirty = true; A.setTime(S.m, true); } }; strip.addEventListener("pointerup", su); strip.addEventListener("pointercancel", su);
const key = (e, d) => { if (S.hide || S.follow) return; S.playing = false; A.setTime(Math.floor(S.m) + d, true); e.preventDefault(); };
strip.addEventListener("keydown", e => { const k = e.key, f = e.shiftKey ? 10 : 1; if (k === "ArrowLeft" || k === "ArrowDown") key(e, -f); else if (k === "ArrowRight" || k === "ArrowUp") key(e, f); else if (k === "PageUp") key(e, 60); else if (k === "PageDown") key(e, -60); else if (k === "Home") key(e, -Math.floor(S.m)); else if (k === "End") key(e, 1439 - Math.floor(S.m)); });
for (const [id, d] of [["#back1", -1], ["#fwd1", 1]]) { let t = 0, n = 0; const b = $(id), go = () => { S.playing = false; A.setTime(Math.floor(S.m) + d, true); }, stop = () => { clearTimeout(t); t = 0; }; b.addEventListener("pointerdown", e => { if (S.hide) return; n = 0; const rep = () => { n++; go(); t = setTimeout(rep, n < 2 ? 380 : 90); }; rep(); }); for (const q of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(q, stop); b.addEventListener("click", e => { if (e.detail === 0) go(); }); }

// ---------- go
addEventListener("resize", () => { clearTimeout(A.rz); A.rz = setTimeout(resize, 60); }); addEventListener("orientationchange", () => setTimeout(resize, 120));
document.addEventListener("visibilitychange", () => { lastT = performance.now(); });
map.addEventListener("webglcontextlost", e => { e.preventDefault(); A.lost = true; G = A.G = null; document.body.classList.add("nogl"); }); map.addEventListener("webglcontextrestored", () => location.reload());
const restored = A.fromURL(); F = A.palette()[2] ? 1 : 0; A.isDark = !!F;
initUI(A, { solve, numbers, frameFor });
try { await document.fonts.load("16px OST"); } catch { }
solve(); resize(); load.remove(); document.body.classList.add("ready"); if (S.view === "min") { A.warpT = 1; A.warp = 1; warpGoals(); wp.set(wg); A.recentre(true); }
A.startReveal(); A.ui.start(restored); requestAnimationFrame(frame); A.ready = true;
// a slow device gets fewer pixels
{ let n0 = 0, t0 = 0; setTimeout(() => { n0 = A.frames; t0 = performance.now(); dirty = true; setTimeout(() => { const f = (A.frames - n0) / (performance.now() - t0) * 1000; if (f < 24 && !document.hidden) { A.lowRes = true; resize(); } }, 2500); }, 1500); }
addEventListener("hashchange", () => { A.fromURL(); solve(); dirty = stripDirty = true; A.ui.start(true); });
{ const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--dock", $("#dock").getBoundingClientRect().height + "px")); ro.observe($("#dock")); }
