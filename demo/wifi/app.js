import * as P from "./physics.js";
import { PLANS, clone, raster, findRooms, encodePlan, decodePlan, wallRect, gapRect, fill, fillMirror, crossings, mirrorEnds, rg } from "./plans.js";
import { Engine } from "./engine.js";
import { drawInk, toView, toPlan, circlePath, arrowPath, PAPER, INK } from "./ink.js";
import { SCENES, MATS, HAND, share, in1000, farther } from "./chapters.js";
import { findBest, findPair, quickBest, roomLevels, coarseRooms, weakestOf, standable, nearest, reached } from "./search.js";
import { picture, waves, whyPrint } from "./picture.js";
import { createEditor } from "./editor.js";
import { createBands, STEPS_N } from "./bands.js";
import { ORDER, OPENERS } from "./homes.js";
import { GOALS } from "./goals.js";
import { T } from "./i18n.js";

const $ = (id) => document.getElementById(id), el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const store = { get: (k) => { try { return localStorage.getItem("wifi-" + k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem("wifi-" + k, v); } catch { /* private mode */ } } };
const qs = new URLSearchParams(location.search), root = document.documentElement;
let lang = ["en", "zh"].includes(qs.get("lang")) ? qs.get("lang") : store.get("lang") || (/^zh/i.test(navigator.language) ? "zh" : "en"); if (!T[lang]) lang = "en"; let t = T[lang];
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches, mqP = matchMedia("(orientation: portrait) and (max-width: 900px)"), mqD = matchMedia("(prefers-color-scheme: dark)");
const css = (v) => getComputedStyle(root).getPropertyValue(v).trim();
const VIS_HZ = calm ? 0 : 1.0;

// ---------- state
const S = { stage: 0, planId: "concrete", plan: null, router: null, phone: null, band: "5", rooms: [], map: null, coarse: null, vals: [], phoneDb: null, areaDb: null, view: null, mode: "play", touched: false, settledAt: 0, stepsPF: 14, answer: null, pairInfo: null, bornAt: 0, held: [], searching: false, done: new Set((store.get("done") || "").split(",").filter(Boolean).map(Number)), keep: {}, sc: null, sent: 0, sel: null, dual: null, second: null, vals2: [], area2: null };
const FLOW = [0, 5, 1, 3, 4, 6]; const EXTRA = 2; // the mirror is an extra, reached from the metal step or its link
// // the order on the page; the ids stay as they were, so old links keep working
let drag = null, eng = null, eng2 = null, bands = null, V = { x: 0, y: 0, w: P.W, h: P.H, k: 100, p: false }, dpr = 1, box = { w: 0, h: 0 }, portrait = false, markScale = 1;
const free = () => S.stage === 0 || S.stage === 6, counted = () => S.rooms.filter((r) => r.counted);
const best = () => { try { return JSON.parse(store.get("best") || "{}"); } catch { return {}; } };

// ---------- text helpers
const roomName = (r) => { if (!r.key) return t.room(r.num); const same = S.rooms.filter((x) => x.key === r.key); return same.length > 1 ? t.rooms[r.key] + " " + (same.indexOf(r) + 1) : t.rooms[r.key]; };
const fmt = (m) => m >= 100 ? String(Math.round(m / 5) * 5) : m >= 10 ? String(Math.round(m)) : m >= .95 ? m.toFixed(0) : m > .05 ? "<1" : "0";
const speed = (d) => fmt(P.mbps(d, S.band)) + " " + t.mbps;
const rb = (i) => { const d = S.vals[i], n = P.bars(d); S.held ||= []; const o = S.held[i]; if (o == null || Math.abs(n - o) > 1 || P.bars(d - .6) > o || P.bars(d + .6) < o) S.held[i] = n; return S.held[i]; };
const both2 = () => S.dual && S.dual.mode === "x" && S.vals2.length === S.vals.length, mEff = (i) => both2() ? Math.max(P.mbps(S.vals[i], "5"), P.mbps(S.vals2[i], "2.4")) : P.mbps(S.vals[i], S.band), bEff = (i) => both2() ? Math.max(rb(i), P.bars(S.vals2[i])) : rb(i), weakNow = () => { if (!both2()) return weakestOf(S, S.vals); let k = -1; S.rooms.forEach((r, i) => { if (r.counted && (k < 0 || mEff(i) < mEff(k))) k = i; }); return k; };
const wordOf = (m) => t.words[P.grade(m)], word = (i, d, b) => { const w = (S.heldW ||= {}), k = b + i, g = P.grade(P.mbps(d, b)), o = w[k]; if (o == null || (P.grade(P.mbps(d - 1.3, b)) !== o && P.grade(P.mbps(d + 1.3, b)) !== o)) w[k] = g; return t.words[w[k]]; };
const ready = () => eng && eng.n - S.bornAt > 2900 && (!S.dual || !eng2 || eng2.n > 2300); // numbers are shown once the waves have filled the home
const barsSVG = (n) => `<svg class="b" viewBox="0 0 23 18" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<rect x="${i * 6}" y="${12 - i * 4}" width="4" height="${6 + i * 4}" class="${i < n ? "on" : ""}"/>`).join("")}</svg>`;
const join = (a) => a.length < 2 ? a.join("") : lang === "zh" ? a.join("、") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
const doorsAsBuilt = () => PLANS[S.planId] && S.plan.feats.every((f, i) => !!f.open === !!PLANS[S.planId].feats[i].open), known = (b = S.band) => ORDER.includes(S.planId) && doorsAsBuilt() ? (GOALS[S.planId] || {})[b] || null : null, goal = () => (GOALS[S.planId] || {})[S.band] || null, need = () => { const g = goal(); return g && g[0] - 1.2 > P.BAR_AT[3] ? 4 : 3; }, video = () => S.band === "5" && !S.dual && OPENERS.includes(S.planId), fine_ = (i) => video() ? P.grade(mEff(i)) >= 3 : bEff(i) >= need(), possible = () => { const g = goal(); return !g || P.bars(g[0] - .3) >= 3; }; // the goal fits the home: 4 bars where one router can do it, else 3
const mainOf = () => S.sc ? S.sc.main !== undefined ? S.sc.main : SCENES[S.stage].main : null, whole5 = () => S.sc && S.sc.stage5;
const planName = () => S.planId === "custom" ? t.plans.custom : t.plans[S.planId];

// ---------- links
function num(v, m) { const x = parseFloat(v); return Number.isFinite(x) ? Math.max(.3, Math.min(m - .3, x)) : null; }
const pair = (s) => { const [a, b] = (s || "").split(","), x = num(a, P.W), y = num(b, P.H); return x && y ? [x, y] : null; };
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1)), st = parseInt(h.get("s")); const stage = st >= 0 && st <= 6 ? st : h.get("h") ? 6 : 0; S.stage = stage;
  S.dual = S.second = null; if (stage >= 1 && stage <= 5) { enterScene(stage, h); return; }
  let id = h.get("h"), plan = null; if (id === "custom" && h.get("w")) { try { plan = decodePlan(h.get("w")); } catch { plan = null; } if (!plan) id = null; }
  if (!plan) { id = PLANS[id] && id !== "own" ? id : stage === 6 ? "onebed" : opener(); plan = clone(PLANS[id]); }
  if (h.get("d") && id !== "custom") { const ds = plan.feats.filter((f) => f.k === "door"); [...h.get("d")].forEach((c, i) => { if (ds[i]) ds[i].open = c === "1" ? 1 : 0; }); }
  P.setSize(plan.size || 1); S.sc = null; S.planId = id; S.mineId = null; S.plan = plan; S.band = P.BANDS[h.get("b")] ? h.get("b") : "5"; const def = PLANS[id] || PLANS.own;
  S.router = pair(h.get("r")) || [...def.router]; S.phone = pair(h.get("p")) || [...def.phone]; S.sent = h.get("f") ? 1 : 0; S.view = whole(); if (h.get("u")) { S.second = pair(h.get("u")); } else if (h.get("x")) { S.band = "5"; S.dual = { mode: "x", at: Math.max(0, Math.min(1, parseFloat(h.get("x")) || .5)) }; }
}
function opener() { const last = store.get("opener"), L = OPENERS.filter((x) => x !== last), id = L[Math.floor(Math.random() * L.length)]; store.set("opener", id); return id; }
function shareURL(forOther) {
  const h = new URLSearchParams(); h.set("s", S.stage); const f2 = (a) => a.map((v) => v.toFixed(2)).join(",");
  if (S.sc) { const m = mainOf(); if (m === "wall") h.set("m", S.plan.walls[0].m); if (m === "mirror") h.set("t", f2(S.plan.mirrors[0].slice(0, 2))); if (m === "box") h.set("t", f2(S.plan.boxes[0].slice(0, 2))); if (m === "phone") h.set("t", f2(S.phone)); if (whole5()) { h.set("k", S.sc.k); h.set("q", bands.state()); } }
  else { h.set("h", S.planId); if (S.planId === "custom") h.set("w", encodePlan(S.plan)); else h.set("d", S.plan.feats.filter((f) => f.k === "door").map((d) => d.open ? 1 : 0).join("")); h.set("r", f2(forOther && S.answer && !S.answer.won && S.answer.at === "best" ? S.answer.you : S.router)); h.set("p", f2(S.phone)); h.set("b", S.band); if (S.second) h.set("u", f2(S.second)); else if (S.dual) h.set("x", S.dual.at.toFixed(2)); if (forOther) h.set("f", "1"); }
  return location.href.split("#")[0] + "#" + h.toString().replace(/%2C/g, ",").replace(/%7E/g, "~");
}
let ownHash = "";
function saveHash(push) { const u = shareURL(); ownHash = "#" + u.split("#")[1]; try { push ? history.pushState(null, "", u) : history.replaceState(null, "", u); } catch { /* file: */ } if (S.stage === 6 && S.planId === "custom" && S.mineId) saveMine(); }
// homes drawn on this device (never one that came by link), newest first
const homes = () => { try { const a = JSON.parse(store.get("homes") || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };
function saveMine() { const a = homes(), i = a.findIndex((m) => m.id === S.mineId), o = { id: S.mineId, w: encodePlan(S.plan), r: S.router, p: S.phone }; if (!S.plan.walls.length) { if (i >= 0) a.splice(i, 1); S.mineId = null; } else if (i >= 0) a[i] = o; else a.unshift(o); store.set("homes", JSON.stringify(a.slice(0, 6))); }

// ---------- going from one place to another
const whole = () => ({ x: 0, y: 0, w: P.W, h: P.H });
function enterScene(n, h) {
  const sc = n === 5 ? bands.enter(Math.max(1, Math.min(STEPS_N, (h && parseInt(h.get("k"))) || S.bandK || 1)), h && h.get("q")) : SCENES[n].make(); P.setSize(1); S.sc = sc; if (n === 5) S.bandK = sc.k; S.dual = sc.dual || null; S.second = null; S.vals2 = []; S.area2 = null; S.planId = "scene"; S.plan = sc.plan; S.router = sc.router; S.phone = sc.phone; S.band = sc.band; S.view = sc.view ? { x: sc.view[0], y: sc.view[1], w: sc.view[2], h: sc.view[3] } : whole(); sc.base = null; sc.won = false; sc.trace = []; sc.pair = null; sc.held = 0; S.answer = null; S.sent = 0;
  if (h) { const m = SCENES[n].main, p = pair(h.get("t")); if (m === "wall" && MATS.includes(h.get("m"))) { S.plan.walls[0].m = h.get("m"); sc.tried = [h.get("m")]; } if (p && m === "mirror") [S.plan.mirrors[0][0], S.plan.mirrors[0][1]] = p; if (p && m === "box") S.plan.boxes[0] = [p[0], p[1], p[0] + .65, p[1] + .65, "fridge"]; if (p && m === "phone") S.phone = p;}
}
function goBand(k) { S.bandK = k; go(5); }
function snapshot() { return { planId: S.planId, mineId: S.mineId, plan: clone(S.plan), router: [...S.router], phone: [...S.phone], band: S.band }; }
function go(n, opt = {}) {
  stopAlso();
  if (S.searching) { S.cancel = true; S.goNext = n; return; } if (S.mode === "edit") editor.close(true);
  if (free() && S.plan) S.keep[S.stage] = snapshot();
  S.stage = n; S.answer = null; S.sent = 0; S.sel = null; S.did = false; S.moves = 0; S.dual = S.second = null;
  if (n >= 1 && n <= 5) enterScene(n);
  else { S.sc = null; const k = !opt.fresh && S.keep[n]; if (k) Object.assign(S, { planId: k.planId, mineId: k.mineId, plan: clone(k.plan), router: [...k.router], phone: [...k.phone], band: k.band }); else if (n === 6 && !opt.fresh && homes().length && loadMine(homes()[0].id)) { /* the home you drew last time */ } else { const id = n === 0 ? opener() : "onebed"; S.planId = id; S.mineId = null; S.plan = clone(PLANS[id]); S.router = [...PLANS[id].router]; S.phone = [...PLANS[id].phone]; S.band = "5"; } P.setSize(S.plan.size || 1); S.view = whole(); }
  quiet(n === 0 ? S.touched : n > 4); applyPlan(true); words(); layout(); saveHash(true); if (portrait) scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
}
function loadMine(id) { try { const m = homes().find((x) => x.id === id), p = m && decodePlan(m.w); if (!p) return false; S.planId = "custom"; S.mineId = id; S.plan = p; P.setSize(p.size); S.router = m.r; S.phone = m.p; S.band = "5"; S.answer = null; S.sent = 0; S.did = false; S.moves = 0; return true; } catch { return false; } }
function loadPlan(id) { stopAlso(); S.bandNote = ""; S.dual = S.second = null; const d = PLANS[id] || PLANS.own; S.planId = id; S.mineId = null; S.plan = clone(d); S.router = [...d.router]; S.phone = [...d.phone]; S.answer = null; S.sent = 0; S.did = false; S.moves = 0; P.setSize(S.plan.size || 1); S.view = whole(); applyPlan(true); words(); layout(); saveHash(); }
function applyPlan(reset) { // walls, band or home changed
  if (reset) { S.glide = null; drag = null; }
  eng && eng.setBand(S.band); roomsNow(); if (!eng) return; if (reset) { eng.reset(); S.bornAt = 0; S.held = []; S.heldW = {}; S.did = S.allOk = false; S.sawReady = 0; S.vals = []; S.phoneDb = S.areaDb = null; } eng.src = S.router; eng.sharp = S.sc && S.sc.sharp ? 1 : 0; if (S.sc && S.sc.lev) eng.lev = S.sc.lev; setWalls(); sync2(reset); wake();
}
// ---- the walls, and the second simulation (the other band, or a second router)
function setWalls(box) { if (!eng) return; const ids = raster(S.plan, eng.nx, eng.ny, eng.dx); box ? eng.patch(ids, box) : eng.setPlan(ids); if (eng2 && two()) { const i2 = raster(S.plan, eng2.nx, eng2.ny, eng2.dx); box ? eng2.patch(i2, box) : eng2.setPlan(i2); } wake(); }
const two = () => !!(S.dual || S.second);
function sync2(reset) { if (!eng) return; if (!two()) return; if (!eng2) { try { eng2 = new Engine($("gl"), eng.tier, { half: qs.get("half") === "1" }); } catch (e) { S.dual = S.second = null; console.warn(String(e)); return; } } eng2.setBand(S.dual ? "2.4" : S.band); eng2.reset(); eng2.search = 0; eng2.sharp = 0; eng2.src = S.second || S.router; eng2.setPlan(raster(S.plan, eng2.nx, eng2.ny, eng2.dx)); S.coarse2 = S.rooms.length ? coarseRooms(S, eng2.rx, eng2.ry) : new Int16Array(eng2.rx * eng2.ry).fill(-1); S.vals2 = []; S.area2 = null; S.born2 = 0; S.settled2 = SETTLE; eng2.portrait = portrait; eng2.view = S.view || whole(); eng2.px = dpr; eng2.paper = isDark() ? 0 : 1; eng2.labels = eng.labels; }
function roomsNow() { const f = S.sc && !S.sc.rooms ? { rooms: [], map: new Int16Array(1) } : findRooms(S.plan); S.rooms = f.rooms; S.map = f.map; S.coarse = S.rooms.length && eng ? coarseRooms(S, eng.rx, eng.ry) : new Int16Array(eng ? eng.rx * eng.ry : 1).fill(-1); if (S.vals.length !== S.rooms.length) S.vals = []; makeTags(); }

// ---------- words and panels
function words() {
  t = T[lang]; root.lang = lang === "zh" ? "zh-CN" : "en"; document.title = t.doc; $("home").textContent = mqP.matches ? t.homeS : t.home; $("home").setAttribute("aria-label", t.home); $("lang").textContent = t.lang; $("theme").textContent = isDark() ? t.light : t.dark; $("theme").setAttribute("aria-label", t.themeL); $("hint").textContent = S.stage === 1 || (whole5() && (S.sc.k === 5 || S.sc.k === 2)) ? t.tap : t.drag; $("unzoom").textContent = t.zoomOut;
  $("gl").setAttribute("aria-label", t.canvas); $("router").setAttribute("aria-label", t.router); $("phone").setAttribute("aria-label", t.phone);
  { const pos = FLOW.indexOf(S.stage); $("index").innerHTML = `<span class="dots">${FLOW.map((i, n) => `<button type="button" data-i="${i}" ${i === S.stage && i !== 5 ? 'aria-current="step"' : ""} class="${i === 5 && S.stage === 5 ? "open " : ""}${S.done.has(i) ? "done" : ""}" aria-label="${n + 1}. ${t.index[i]}" title="${t.index[i]}"><i></i></button>${i === 5 && S.stage === 5 ? t.bands.steps.map((x, k) => `<button type="button" class="sub${bandSet.has(k + 1) ? " done" : ""}" data-k="${k + 1}" ${S.sc.k === k + 1 ? "aria-current=step" : ""} aria-label="2-${k + 1} ${x.name}" title="${x.name}"><i></i></button>`).join("") : ""}`).join("")}</span><span class="where">${S.stage === 5 ? `2-${S.sc.k}` : pos < 0 ? "+" : pos + 1}${S.stage === 5 || pos < 0 ? "" : ` / ${FLOW.length}`}<em>${S.stage === 5 ? t.bands.steps[S.sc.k - 1].name : t.index[S.stage]}</em></span>`; }
  editor && editor.words(); panel(); picker(); strip(); makeTags(); ink(); things(); facts();
}
function say(text, after) { if ($("say").textContent !== text) $("say").textContent = text; $("say").classList.toggle("after", !!after); }
function btn(cls, text, fn, id) { const b = el("button", cls, text); b.type = "button"; b.onclick = fn; if (id) b.id = id; return b; }
function panel() {
  const A = $("acts"), X = $("extra"); A.innerHTML = X.innerHTML = $("more").innerHTML = ""; const ch = t.ch[S.stage]; document.body.classList.toggle("editing", S.mode === "edit"); $("tools").hidden = S.mode !== "edit";
  if (S.mode === "edit") { $("ask").textContent = t.eAsk; say(""); $("read").innerHTML = ""; return; }
  $("ask").textContent = S.did && free() && !S.answer ? t.didH : ch.ask;
  if (S.searching) { A.append(btn("line", t.stop, () => S.cancel = true, "stop")); say(S.sayNow || ""); return; }
  if (whole5()) { const st = t.bands.steps[S.sc.k - 1], v = S.sc.won; $("ask").textContent = S.sc.k === 6 && S.sc.i >= 5 ? t.bands.endAsk(S.sc.picks.filter((x, j) => x === ["5", "2.4", "2.4", "5", "2.4"][j]).length) : st.ask; { const ls = bands.lesson(); say(S.sc.k === 6 && S.sc.i >= 5 ? t.bands.endSay : v && S.sc.say ? st.aft(S.sc.say) : ls || st.say, v || ls); } $("read").innerHTML = ""; $("read")._h = ""; bands.panel(X, $("read")); const last = S.sc.k === STEPS_N, dn = v || bandIsDone(S.sc.k); if (last ? S.sc.i >= 5 : dn) A.append(btn("solid", t.next, () => last ? go(1) : goBand(S.sc.k + 1), "next")); else A.append(btn("text", t.later, () => last ? go(1) : goBand(S.sc.k + 1), "skip")); return; }
  if (S.sc) { // an experiment
    const v = S.sc.won, dn = v || S.done.has(S.stage); say(v ? t.aft[S.stage](S.sc.say || {}) : ch.say, v); scenePanel();
    const n = S.stage === EXTRA ? 4 : FLOW[FLOW.indexOf(S.stage) + 1]; if (S.stage === 3 && dn) A.append(btn("text", t.extra, () => go(EXTRA), "extra2")); if (dn) A.append(btn("solid", n === 6 ? t.toHome : t.next, () => go(n), "next")); else A.append(btn("text", t.later, () => go(n), "skip"));
    return;
  }
  if (S.second) { const k = S.vals.length ? weakestOf(S, S.vals) : -1, c = counted(), nd = need(), all = c.length && S.vals.length && c.every((r) => P.bars(S.vals[r.index]) >= nd); $("ask").textContent = t.twoH; say(all ? t.twoAll(c.length, nd) : k >= 0 ? t.twoT(roomName(S.rooms[k]), t.bars(P.bars(S.vals[k]))) : "", 1); X.append(el("p", "fine", t.twoP)); A.append(btn("solid", t.oneAgain, () => { S.second = null; S.vals2 = []; S.held = []; words(); layout(); saveHash(); }, "one"), btn("line", t.save, keep, "keep")); readout(); return; }
  const a = S.answer;
  if (a) { answerPanel(a); return; }
  const nC = counted().length; say(S.bandNote ? S.bandNote : S.sent ? t.sent : S.did ? (video() ? t.didV(nC) : t.did(nC, need())) : S.allOk && !S.moves ? t.already(nC, need()) : S.stage === 0 || S.planId !== "onebed" || S.moves ? (video() ? t.sayV(weakNow() >= 0 && ready() && P.grade(mEff(weakNow())) < 3 ? roomName(S.rooms[weakNow()]) : "") : possible() ? t.ch[0].say(nC, need()) : t.hard(nC)) : ch.say, S.did); if (S.stage === 6 && !S.did && (S.planId !== "onebed" || S.sent)) $("ask").textContent = planName();
  if (counted().length && (S.moves || S.did || S.sent || S.stage === 6)) A.append(btn(S.did ? "solid" : "line", S.did ? t.compare : t.best, search, "best"));
  if (S.stage === 0) { A.append(btn("text", t.why5, () => goBand(S.bandK || 1), "why5")); } else { A.append(btn("line", t.drawMine, () => { loadPlan("own"); S.planId = "custom"; S.mineId = null; editor.open(true); }, "drawmine"), btn("text", t.edit, () => editor.open(), "edit")); homesGrid($("more")); }
  readout();
}
function answerPanel(a) {
  const A = $("acts"), X = $("extra"), r1 = S.rooms[a.mine.k], n1 = roomName(r1), was = P.bars(a.mine.lo), nowLv = a.top.lv[a.mine.k], now = P.bars(nowLv), sp = lang === "zh" && /\d$/.test(n1) ? n1 + " " : n1;
  if (a.at === "free") freeLine();
  else if (a.byCount && !a.won) { $("ask").textContent = t.put; say(t.countT(a.mine.n, a.top.n, a.rooms), 1); }
  else if (a.byCount) { $("ask").textContent = t.won; say(t.countWon(a.mine.n, a.rooms), 1); }
  else if (a.won && a.mine.lo > P.BAR_AT[3] + 2) { $("ask").textContent = t.any; say(t.anyT, 1); }
  else if (a.won) { $("ask").textContent = t.won; say(t.wonT(sp, t.bars(was)), 1); }
  else if (a.at === "you") { $("ask").textContent = t.freeH; say(t.freeT(sp, t.bars(was), a.pct < 1 ? "<1" : a.pct), 1); }
  else { $("ask").textContent = t.put; const nd = need(), all = a.top.lv.every((v, i) => !S.rooms[i].counted || P.bars(v) >= nd) && !a.mine.lv.every((v, i) => !S.rooms[i].counted || P.bars(v) >= nd); say((now > was ? t.putT(sp, t.bars(was), t.bars(now)) : t.putT(sp, fmt(a.mY) + " " + t.mbps, fmt(P.mbps(nowLv, S.band)) + " " + t.mbps)) + (all ? (lang === "zh" ? "" : " ") + t.all3(counted().length, nd) : ""), 1); }
  { const th = el("div", "three"); th.id = "three"; X.append(th); threePanel(); }
  if (!a.won && a.mine.snap) { const f = el("div", "two"), G = [["before", a.mine], ["after", a.top]].map(([w, at]) => { const hits = crossings(eng.ids, eng.nx, eng.ny, eng.dx, at.at, r1.at).map((h) => ({ ...h, m: h.id === 6 ? "metal" : P.WALL_BY_ID[h.id] })), d = Math.max(.3, Math.hypot(at.at[0] - r1.at[0], at.at[1] - r1.at[1])); return { w, at, hits, d, loss: 20 * Math.log10(d) + hits.reduce((q, h) => q + (h.m === "metal" ? 60 : -10 * Math.log10(share(h.m, S.band))), 0) }; }), odd = G[1].loss > G[0].loss - 1;
    for (const o of G) { const g = el("figure"), straight = !(odd && o.w === "after"); g.append(whyPrint(api, o.at.snap, o.at.at, r1, straight ? o.hits : null, portrait ? 84 : 150)); const cap = el("figcaption"), cnt = {}; o.hits.forEach((h) => cnt[h.m] = (cnt[h.m] || 0) + 1); const list = ["metal", "concrete", "brick", "drywall", "glass", "door"].filter((m) => cnt[m]).map((m) => t.crosses(cnt[m], m)); cap.append(el("b", "", t[o.w]), document.createTextNode(straight ? t.dist(o.d.toFixed(1)) + (list.length ? t.inway(join(list)) : t.nothing) : t.dist(o.d.toFixed(1)) + (lang === "zh" ? t.bounce : t.bounce.toLowerCase()))); g.append(cap); f.append(g); } X.append(f); }
  if (!a.won) { const p = el("p", "fine", a.byCount ? "" : t.pct(a.pct)); X.append(p); }
  const also = el("div"); also.id = "also"; X.append(also); alsoPanel(); if (!S.second && (a.maps || known()) && P.bars(a.top.lo) < 3) A.append(btn("solid", t.second, addSecond, "second")); if (S.stage === 0) A.append(btn("line", t.why5, () => goBand(S.bandK || 1), "why5")); A.append(btn(S.stage === 0 ? "line" : "solid", t.save, keep, "keep"));
  const row = el("div", "row"); if (!a.won) row.append(btn("text", a.at === "best" ? t.backYou : t.toBest, () => { const to = a.at === "best" ? a.you : a.best; a.at = a.at === "best" ? "you" : "best"; glideTo(to); panel(); }, "swap")); row.append(btn("text", t.again, search, "best")); A.append(row); if (S.stage === 6) { A.append(btn("text", t.edit, () => editor.open(), "edit")); homesGrid($("more")); }
  readout();
}
function freeLine() { const a = S.answer; if (a && a.byCount) { const nn = reached(S, S.vals, 3); $("ask").textContent = nn > a.top.n ? t.won : t.freeH; say(t.countFree(nn, a.rooms, a.top.n), 1); return; } const k = S.vals.length ? weakestOf(S, S.vals) : -1; if (!a || k < 0) return; const m = P.mbps(S.vals[k], S.band), q = Math.round(100 * m / Math.max(a.mB, .1)), n = roomName(S.rooms[k]); if (q > 102 && !S.glide && standable(S, ...S.router)) { a.mB = m; a.best = [...S.router]; a.beaten = 1; pencil(); cheer(); } $("ask").textContent = a.beaten && q >= 99 ? t.beatH : q >= 100 ? t.won : t.freeH; say(t.freeT(lang === "zh" && /\d$/.test(n) ? n + " " : n, t.bars(rb(k)), q < 1 ? "<1" : Math.min(q, 100)), 1); }
// a red tick, drawn by hand over the print
function cheer() { const e = $("tick"); e.innerHTML = ""; const w = Math.min(box.w, box.h) * .42, x = box.w / 2, y = box.h / 2; e.setAttribute("viewBox", `0 0 ${box.w} ${box.h}`); const d = `M${x - w * .42} ${y + w * .02}Q${x - w * .24} ${y + w * .14} ${x - w * .12} ${y + w * .36}Q${x + w * .06} ${y - w * .16} ${x + w * .5} ${y - w * .42}`; e.innerHTML = `<path d="${d}" pathLength="1"/>`; e.classList.remove("go"); void e.getBoundingClientRect(); e.classList.add("go"); }
let pressing = false; // never swap the buttons under a finger
addEventListener("pointerdown", () => { pressing = true; }, true); for (const n of ["pointerup", "pointercancel"]) addEventListener(n, () => setTimeout(() => { pressing = false; }, 60), true);
function goalCheck() { // the small game: every room at 3 bars, by hand. The words always follow the live numbers, once things are at rest
  if (pressing || S.searching || S.mode !== "play" || !free() || drag || S.glide || !S.vals.length || !ready() || eng.n < S.settledAt - 2100) return; const c = counted(), all = c.length > 0 && c.every((r) => fine_(r.index)); if (ready() && !S.sawReady) { S.sawReady = 1; if (!S.answer && !S.moves) panel(); }
  if (S.answer) { if (S.answer.at === "free") freeLine(); return; } const did = all && !!S.moves && (!S.rooms.length || standable(S, ...S.router)); if (did && ORDER.includes(S.planId)) { const B = best(); if (!B[S.planId + "|g"]) { B[S.planId + "|g"] = 1; store.set("best", JSON.stringify(B)); } } if (did !== !!S.did || all !== !!S.allOk) { const fresh = did && !S.did; S.did = did; S.allOk = all; panel(); if (fresh) cheer(); }
}
function readout() { // one small square per room, and the weakest room
  const R = $("read"); if (!S.vals.length || S.searching || S.mode === "edit") { if (S.mode === "edit" || S.searching) R.innerHTML = ""; return; } const g = need(), vd = video(), c = counted(), put = (h) => { if (R._h !== h || !R.firstChild) { R.innerHTML = h; R._h = h; } };
  const pips = (f) => `<div class="pips" aria-hidden="true">${c.map((r) => `<i class="${f(r) ? "on" : ""}"></i>`).join("")}</div>`; if (!ready()) return put(`${pips(() => 0)}<div class="sub prog"><span>${t.arriving}</span></div><div class="big"><span>&nbsp;</span></div><div class="sub"><span>&nbsp;</span></div>`);
  const k = weakNow(); if (k < 0) return put(""); const n = bEff(k), m = mEff(k), ok = c.filter((r) => fine_(r.index)).length, a = S.answer, gr = P.grade(m), live = a && !a.won && a.at === "free" ? Math.round(100 * m / Math.max(a.mB, .1)) : 0, lt = (x) => x.replace("<", "&lt;"), by = both2() ? (P.mbps(S.vals[k], "5") >= P.mbps(S.vals2[k], "2.4") ? t.b5 : t.b24) : "";
  put(`${pips((r) => fine_(r.index))}<div class="sub prog"><span>${vd ? t.goalV(ok, c.length) : t.goal(ok, c.length, g)}</span></div><div class="big"><span>${roomName(S.rooms[k])}<small>${t.weakest}</small></span><em class="${gr < 2 ? "low" : ""}">${barsSVG(n)}${t.bars(n)}</em></div><div class="sub"><span>${t.grades[gr]}${by ? `, ${by}` : ""}</span><b>${lt(fmt(m))} ${t.mbps}${live ? ` (${live >= 97 ? t.found : t.live(live)})` : ""}</b></div>`);
}
function thumb(pl, w = 320) { // a small plan
  const c = el("canvas"), h = Math.round(w * P.H0 / P.W0); c.width = w; c.height = h; const q = c.getContext("2d"), u = w / 320; q.fillStyle = "#0b2a58"; q.fillRect(0, 0, w, h); if (!pl) { q.strokeStyle = PAPER; q.lineWidth = 4 * u; q.setLineDash([9 * u, 7 * u]); q.strokeRect(40 * u, 32 * u, 240 * u, 156 * u); q.setLineDash([]); q.beginPath(); q.moveTo(136 * u, 110 * u); q.lineTo(184 * u, 110 * u); q.moveTo(160 * u, 86 * u); q.lineTo(160 * u, 134 * u); q.stroke(); return c; }
  const z = w / (P.W0 * (pl.size || 1)); q.fillStyle = PAPER; for (const s of pl.walls) { const [a, e, d, f] = wallRect(s), g = s.m === "glass" ? 1.4 * u : 3 * u; q.globalAlpha = s.m === "glass" ? .65 : s.m === "drywall" ? .85 : 1; q.fillRect(a * z, e * z, Math.max(g, (d - a) * z), Math.max(g, (f - e) * z)); } q.globalAlpha = 1; q.fillStyle = "#0b2a58"; for (const f of pl.feats) { const [a, e, d, h2] = gapRect(f, .2); if (f.k !== "win") q.fillRect(a * z, e * z, (d - a) * z, (h2 - e) * z); } q.fillStyle = "rgba(243,245,243,.5)"; for (const f of pl.boxes || []) q.fillRect(f[0] * z, f[1] * z, (f[2] - f[0]) * z, (f[3] - f[1]) * z); return c;
}
function homesGrid(X) { // your own homes, and the way to draw one
  const g = el("div", "homes"), mine = homes(), cur = S.planId === "custom" && !S.mineId ? [{ id: null }] : [], up = () => { if (portrait) scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" }); };
  for (const id of ["own", ...mine.map((m) => "m:" + m.id), ...cur.map(() => "m:")]) { const my = id !== "own", on = my && S.planId === "custom" && (S.mineId || "") === id.slice(2), pos = mine.findIndex((m) => "m:" + m.id === id);
    const b = btn("", "", () => { if (!my) { loadPlan("own"); S.planId = "custom"; S.mineId = null; editor.open(true); } else if (!on && loadMine(id.slice(2))) { stopAlso(); S.dual = S.second = null; S.view = whole(); applyPlan(true); words(); layout(); saveHash(); } up(); }); b.dataset.h = my ? "custom" : id; b.setAttribute("aria-pressed", on); let pl = null; if (my) { try { pl = on ? S.plan : decodePlan(mine[pos].w); } catch { pl = clone({}); } } b.append(thumb(pl), document.createTextNode(my ? t.plans.custom + (mine.length + cur.length > 1 ? " " + (pos < 0 ? mine.length + 1 : pos + 1) : "") : t.plans[id])); g.append(b); }
  X.append(g);
}
const canPick = () => free() && S.mode !== "edit" && !S.searching;
function picker() { // the caption above the print: which home this is, and the others
  const X = $("picker"); X.innerHTML = ""; if (!free() || S.mode === "edit") return; const i = ORDER.indexOf(S.planId), step = (d) => pickHome(ORDER[(i + d + ORDER.length) % ORDER.length]);
  const prev = btn("arrow", "‹", () => step(-1), "prevHome"), next = btn("arrow", "›", () => step(1), "nextHome"); prev.setAttribute("aria-label", t.prevHome); next.setAttribute("aria-label", t.nextHome); const name = btn("name", "", catalogue, "homeName"); name.append(thumb(S.plan.walls.length ? S.plan : null, 96), el("span", "", planName())); if (i >= 0) name.append(el("i", "", `${i + 1} / ${ORDER.length}`)); const L = el("div", "row"), Q = el("div", "row"); L.append(prev, name, next); const sp = btn("", "", () => { const O = ORDER.filter((x) => x !== S.planId); pickHome(O[Math.floor(Math.random() * O.length)]); }, "surprise"); sp.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3"/></svg>`; sp.append(document.createTextNode(t.surprise)); sp.setAttribute("aria-label", t.surprise); Q.append(sp, btn("all", mqP.matches ? t.nHomes(ORDER.length) : t.allHomes, catalogue, "allHomes")); X.append(L, Q); if (S.searching) X.querySelectorAll("button").forEach((b) => { b.disabled = true; });
}
function pickHome(id) { if (!canPick()) return; const b = S.band; loadPlan(id); if (S.band !== b) { S.band = b; } if ($("homesDlg").open) $("homesDlg").close(); if (portrait) scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" }); }
function catalogue() {
  if (!canPick()) return; const D = $("homesG"), B = best(); D.innerHTML = ""; $("hdH").textContent = t.catalogue; $("hdClose").textContent = t.close; $("hdP").textContent = t.catalogueP; for (const id of ORDER) { const b = btn("", "", () => pickHome(id)); b.dataset.home = id; b.setAttribute("aria-pressed", id === S.planId); b.append(thumb(PLANS[id], 420)); const n = el("span", "nm", t.plans[id]); if (B[id + "|g"]) n.append(el("i", "dot")); b.append(n, el("small", "", t.homeNote[id])); const r5 = B[id + "|5"], r2 = B[id + "|2.4"]; if (r5 || r2) b.append(el("small", "rec", [r5 && `${t.b5} ${r5}%`, r2 && `${t.b24} ${r2}%`].filter(Boolean).join("  "))); D.append(b); } $("homesDlg").showModal(); $("homesDlg").firstElementChild.scrollTop = 0;
}
function strip() {
  const F = $("strip"), BR = $("bandrow"); F.innerHTML = BR.innerHTML = ""; const L = el("div", "row"), Q = el("div", "row"); if (S.mode !== "edit") {
    if (free()) { const s = el("span", "seg"); s.setAttribute("role", "group"); s.setAttribute("aria-label", t.band); const cur = S.dual ? "both" : S.band; for (const b of S.second ? ["5", "2.4"] : ["5", "2.4", "both"]) { const q = btn("", b === "5" ? t.b5 : b === "both" ? t.both : t.b24, () => setBand(b)); q.dataset.b = b; q.setAttribute("aria-pressed", cur === b); s.append(q); } L.append(s); if (S.stage === 0 || S.dual) L.append(btn("ask5", t.diff, () => goBand(S.bandK || 1), "diff")); }
    Q.append(btn("", t.reset, reset, "reset")); Q.append(btn("", t.link, copyLink, "link")); if (free()) Q.append(btn("", t.save, keep, "save")); }
  Q.append(btn("", t.how, about, "how")); if (mqP.matches) { BR.append(L); F.append(Q); } else F.append(L, Q);
}
function setBand(b) {
  if (S.searching || b === (S.dual ? "both" : S.band)) return; stopAlso(); const both = b === "both", nb = both ? "5" : b, same = nb === S.band; if (both) S.second = null; S.dual = both ? { mode: "x", at: portrait ? .12 : .88, goal: .5 } : null; S.band = nb; S.bandNote = free() ? (both ? t.noteBoth : nb === "5" ? t.note5 : t.note24) : ""; if (free() && !(same && S.answer)) S.answer = null; S.did = false; S.held = []; S.heldW = {};
  if (eng) { if (!same) { eng.setBand(nb); eng.reset(); S.bornAt = 0; eng.setPlan(eng.ids); } sync2(true); wake(); } words(); layout(); pencil(); saveHash();
}
function reset() { if (S.searching) return; stopAlso(); S.second = null; if (S.sc) { if (whole5()) { S.sc = null; enterScene(5, new URLSearchParams("k=" + S.bandK)); } else enterScene(S.stage); } else { const id = S.planId; if (id !== "custom") { S.plan = clone(PLANS[id]); S.router = [...PLANS[id].router]; S.phone = [...PLANS[id].phone]; } else { S.router = [...(middleOf() || PLANS.own.router)]; } S.answer = null; S.sent = 0; S.view = whole(); } S.did = false; S.moves = 0; applyPlan(true); words(); layout(); saveHash(); }
const middleOf = () => S.rooms.length ? S.rooms[0].at : null;
function facts() { const F = $("facts"); F.innerHTML = ""; if (!eng || !ready()) return; F.setAttribute("aria-label", t.stateL); if (!S.vals.length) return; S.rooms.forEach((r, i) => F.append(el("li", "", `${roomName(r)}: ${t.bars(P.bars(S.vals[i]))}, ${speed(S.vals[i])}`))); }

// ---------- the panels of the five experiments
function scenePanel() {
  const X = $("extra"), R = $("read"), s = S.sc; X.innerHTML = ""; R.innerHTML = ""; R._h = "";
  if (S.stage === 1) { const d = el("div", "mat"); d.append(el("small", "", t.through)); for (const m of MATS) { const on = s.tried.includes(m), row = el("div", s.plan.walls[0].m === m ? "on" : ""), sh = share(m, "5"); row.append(el("span", "", t.mats[m]), el("b", "", on ? t.of1000(in1000(sh)) : "")); const u = el("u"); u.style.backgroundSize = (on ? Math.max(.5, sh * 100) : 0) + "% 100%"; row.append(u); d.append(row); } X.append(d); }
  if (S.stage === 4) { const c = el("canvas"); c.id = "trace"; const l = el("div", "tl"); l.innerHTML = `<span>${t.within}</span><b id="ratio"></b>`; const bx = el("div", "tracebox"); bx.append(c, el("small", "hi", t.here), el("small", "lo", t.there)); X.append(bx, l); drawTrace(); }
  phoneLine();
}
function phoneLine() { if (!S.sc || S.stage === 5) return; const d = S.stage === 4 ? S.phoneDb : S.areaDb; if (d == null) return; const n = P.bars(d), html = `<small>${t.phoneGets}</small><div class="big"><em class="${n < 2 ? "low" : ""}">${barsSVG(n)}${t.bars(n)}</em><span>${speed(d).replace("<", "&lt;")}</span></div>`; const R = $("read"); if (R._h !== html) { R.innerHTML = html; R._h = html; } }
function drawTrace() {
  const c = $("trace"); if (!c) return; const w = Math.round(c.clientWidth * dpr) || 300, h = Math.round((c.clientHeight || 86) * dpr); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } const g = c.getContext("2d"), tr = S.sc.trace, col = css("--ink"), N = 150; g.clearRect(0, 0, w, h); const Y = (d) => h - 4 * dpr - Math.max(0, Math.min(1, (d + 90) / 30)) * (h - 10 * dpr);
  g.strokeStyle = css("--hair"); g.lineWidth = 1; g.beginPath(); for (let k = 0; k < 3; k++) { const y = Math.round(h * (k + .5) / 3) + .5; g.moveTo(0, y); g.lineTo(w, y); } g.stroke();
  const L = tr.slice(-N); if (L.length > 1) { g.strokeStyle = col; g.lineWidth = 1.5 * dpr; g.lineJoin = "round"; g.beginPath(); L.forEach((q, i) => { const x = (w - 8 * dpr) * i / (N - 1); i ? g.lineTo(x, Y(q.d)) : g.moveTo(x, Y(q.d)); }); g.stroke(); const e = L.length - 1; g.fillStyle = css("--red"); g.beginPath(); g.arc((w - 8 * dpr) * e / (N - 1), Y(L[e].d), 3.4 * dpr, 0, 7); g.fill(); }
  const r = $("ratio"), p = S.sc.pair; if (r) r.textContent = p && p.r > 3 ? `${(p.cm).toFixed(1)} cm · ${t.times(p.x)}` : "";
}
function win(v) { const s = S.sc; s.say = v; if (s.won) { const tx = t.aft[S.stage](v); if ($("say").textContent !== tx) say(tx, 1); return; } s.won = true; cheer(); S.done.add(S.stage); store.set("done", [...S.done].join(",")); words(); pencil(); }
var bandSet = new Set((store.get("bands") || "").split(",").filter(Boolean).map(Number)), bandIsDone = (k) => bandSet.has(k);
function bandDone(k) { cheer(); bandSet.add(k); store.set("bands", [...bandSet].join(",")); if (bandSet.size >= STEPS_N) { S.done.add(5); store.set("done", [...S.done].join(",")); words(); } }
function sceneTick(dt) { // called with every reading
  const s = S.sc; if (!s) return; if (s.stage5) return bands.tick(dt); const st = S.stage, settled = eng.n > 2600;
  if (st === 1 && s.tried.length === 3 && !drag) { s.held += dt; if (s.held > 900) win({ c: in1000(share("concrete", "5")), d: in1000(share("drywall", "5")), x: farther("concrete", "5") }); }
  if (st === 2 || st === 3) { if (s.base == null) { if (settled) s.base = S.areaDb; } else { const gain = (S.areaDb - s.base) * (st === 2 ? 1 : -1), n0 = P.bars(s.base), n1 = P.bars(S.areaDb); if (gain > 9 && (st === 2 ? n1 > n0 : n1 < n0)) { s.held += dt; if (s.held > 700 && !drag) win({ a: t.bars(n0), b: t.bars(n1), a0: n0, b0: n1 }); } else s.held = 0; } }
  if (st === 4 && settled && S.phoneDb != null) { const q = { x: S.readAt[0], y: S.readAt[1], d: S.phoneDb }, l = s.trace[s.trace.length - 1];
    if (!l || Math.hypot(l.x - q.x, l.y - q.y) > .0015) { s.trace.push(q); if (s.trace.length > 600) s.trace.shift(); let b = s.pair; for (const o of s.trace) { const D = Math.hypot(o.x - q.x, o.y - q.y); if (D < HAND && D > .02) { const r = Math.abs(o.d - q.d); if (!b || r > b.r + .2) { const hi = o.d > q.d ? o : q, lo = hi === o ? q : o; b = { r, hi, lo, cm: D * 100, x: Math.round(10 ** (r / 10)) }; } } } if (b !== s.pair) { s.pair = b; pencil(); } drawTrace(); }
    const D = Math.hypot(S.phone[0] - s.home[0], S.phone[1] - s.home[1]); if (D < HAND && P.bars(S.phoneDb) <= 1 && S.readAt && Math.hypot(S.readAt[0] - S.phone[0], S.readAt[1] - S.phone[1]) < .004) { s.held += dt; if (s.held > 250) win({ cm: (D * 100).toFixed(1), hi: t.bars(3), lo: t.bars(P.bars(S.phoneDb)) }); } else if (!s.won) s.held = 0; }
  phoneLine();
}

// ---------- layout
const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : mqD.matches;
const sideView = () => !!(S.plan && S.plan.side); // a home cut open from the side stays upright on a phone
function layout() {
  const was = portrait; portrait = mqP.matches && !sideView(); document.body.classList.toggle("flat", mqP.matches && sideView()); const r = $("print").getBoundingClientRect(); box = { w: r.width, h: r.height }; dpr = Math.min(devicePixelRatio || 1, portrait ? 2.5 : 2); const v = S.view || whole();
  V = { ...v, k: box.w / (portrait ? v.h : v.w), p: portrait }; markScale = 1; const w = Math.round(box.w * dpr), h = Math.round(box.h * dpr);
  for (const c of [$("gl"), $("ink")]) if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  $("pencil").setAttribute("viewBox", `0 0 ${box.w} ${box.h}`); if (eng) { eng.portrait = portrait; eng.view = v; eng.px = dpr; eng.paper = isDark() ? 0 : 1; } if (eng2) { eng2.portrait = portrait; eng2.view = v; eng2.px = dpr; eng2.paper = eng.paper; eng2.labels = eng.labels; }
  if (was !== portrait) words(); $("unzoom").hidden = !(S.view && !S.sc && S.view.w < P.W * .98); ink(); place(true); pencil(); if (S.stage === 4) drawTrace(); if (whole5() && S.sc.k === 3) bands.drawWalk();
}
function ink(preview) {
  if (whole5() && S.sc.still) return bands.redraw();
  const c = $("ink"), g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); if (!S.plan) return; const v = { ...V, k: V.k * dpr }; let plan = S.plan; if (preview) plan = preview;
  if (S.mode === "edit") { g.fillStyle = "rgba(243,245,243,.3)"; const st = .5; for (let x = st; x < P.W; x += st) for (let y = st; y < P.H; y += st) { const [X, Y] = toView(x, y, v); g.fillRect(X - .75 * dpr, Y - .75 * dpr, 1.5 * dpr, 1.5 * dpr); } }
  if (S.sc && !S.sc.rooms) { const q = box.w * dpr * .012; g.save(); g.beginPath(); g.rect(q, q, c.width - 2 * q, c.height - 2 * q); g.clip(); }
  if (S.mode === "edit" && editor) editor.ghost(g, v, dpr);
  drawInk(g, plan, v, { t, band: S.dual ? null : S.band, font: css("--f"), sizes: S.mode === "edit" && editor ? editor.sizes() : null, scale: !(whole5() && S.sc.k < 4 && S.sc.k > 1 && portrait) && (S.stage !== 4 || (!portrait && box.h > 340)), dpr, small: portrait || box.h < 340, zoomed: portrait || (!!S.sc && S.stage < 5 && box.w < 700) || box.h < 340, low: box.h < 340, sel: S.sel, px: Math.max(.85, Math.min(2.6, V.k / 95)) * dpr });
  if (S.sc && !S.sc.rooms) g.restore(); if (S.dual && S.mode !== "edit") drawDual(g, v);
}
// the two halves: where each band is drawn, the line between them, and their names
function cuts() { const d = S.dual, W = box.w, H = box.h; if (d.mode === "x") { const l = [0, 0, d.at * W, H], r = [d.at * W, 0, W - d.at * W, H]; return portrait ? [l, r] : [r, l]; } if (portrait) { const x = (1 - d.at) * W; return [[0, 0, x, H], [x, 0, W - x, H]]; } const y = d.at * H; return [[0, 0, W, y], [0, y, W, H - y]]; }
function drawDual(g, v) {
  const c = cuts(), q = dpr, W = box.w * q, H = box.h * q, fs = (portrait ? 15 : 18) * q; g.save(); g.strokeStyle = PAPER; g.fillStyle = PAPER; g.lineWidth = 1.3 * q; g.shadowColor = "#04122c"; g.shadowBlur = 5 * q; g.beginPath(); if (S.dual.mode === "x") { const X = S.dual.at * W; g.moveTo(X, 8 * q); g.lineTo(X, H - 8 * q); } else if (portrait) { const X = (1 - S.dual.at) * W; g.moveTo(X, 8 * q); g.lineTo(X, H - 8 * q); } else { g.moveTo(8 * q, S.dual.at * H); g.lineTo(W - 8 * q, S.dual.at * H); } g.stroke();
  if (S.dual.mode === "x") { const X = S.dual.at * W, Y = H * .5, r = 15 * q; g.beginPath(); g.arc(X, Y, r, 0, 7); g.fillStyle = PAPER; g.fill(); g.shadowBlur = 0; g.strokeStyle = INK; g.lineWidth = 1.6 * q; g.beginPath(); g.moveTo(X - 4 * q, Y - 5 * q); g.lineTo(X - 9 * q, Y); g.lineTo(X - 4 * q, Y + 5 * q); g.moveTo(X + 4 * q, Y - 5 * q); g.lineTo(X + 9 * q, Y); g.lineTo(X + 4 * q, Y + 5 * q); g.stroke(); }
  g.shadowBlur = 0; g.font = `${fs}px ${css("--f")}`; g.textBaseline = "middle"; c.forEach(([x, y, w, h], i) => { // name and one ripple of true length, on a dark plate
    const lam = (i ? .123 : .0571) * v.k, n = Math.max(1, Math.round(34 * q / lam)), tx = (i ? t.b24 : t.b5), cm = (i ? "12.3" : "5.7") + t.cm, tw = g.measureText(tx).width, ww = n * lam, cw = g.measureText(cm).width, full = tw + ww + cw + 44 * q, pw = w * q > full ? full : tw + 18 * q; if (w * q < pw + 12 * q) return; const pad = 12 * q, right = S.dual.mode === "x" ? x === 0 : false, X = right ? (x + w) * q - pw - pad : x * q + pad + (S.dual.mode === "x" ? 0 : portrait ? 4 * q : 14 * q), Y = S.dual.mode !== "x" && !portrait && i ? (y + h) * q - fs - 34 * q : y * q + (portrait ? 14 : 18) * q, hh = fs + 12 * q; g.fillStyle = "rgba(4,18,44,.86)"; g.fillRect(X, Y, pw, hh); g.fillStyle = g.strokeStyle = PAPER; g.textAlign = "left"; g.fillText(tx, X + 9 * q, Y + hh / 2 + q); if (pw === full) { const x0 = X + 9 * q + tw + 12 * q; g.lineWidth = 1.3 * q; g.beginPath(); for (let u = 0; u <= 60; u++) { const a = x0 + u / 60 * ww, e = Y + hh / 2 - Math.sin(u / 60 * n * 2 * Math.PI) * 4.5 * q; u ? g.lineTo(a, e) : g.moveTo(a, e); } g.stroke(); g.fillText(cm, x0 + ww + 10 * q, Y + hh / 2 + q); } });
  if (whole5() && S.sc.k === 1) bands.loupeInk(g, q); g.restore();
}
let tags = [];
function makeTags() {
  const L = $("labels"); L.innerHTML = ""; tags = S.rooms.map((r) => { const e = el("div", "tag" + (r.counted ? "" : " dim")); e.append(el("span", "", roomName(r)), el("b")); L.append(e); return e; });
  tags.extra = null; if (S.planId === "concrete" && S.mode !== "edit" && !S.sc) { const e = el("div", "tag small", t.cabinet); e.dataset.at = "3.72,1.42"; L.append(e); tags.extra = e; }
  if (S.vals.length) tagNumbers(); place(true);
}
function tagNumbers() { const k = weakNow(), rd = ready(), du = both2(); S.rooms.forEach((r, i) => { const e = tags[i]; if (!e || S.vals[i] == null) return; const n = rb(i), row = (bars, d, b, pre) => `<em>${pre ? `<i>${pre}</i>` : ""}${barsSVG(bars)}<span>${word(i, d, b)}</span></em>`, v = !rd ? "-" : du ? row(n, S.vals[i], "5", "5") + row(P.bars(S.vals2[i]), S.vals2[i], "2.4", "2.4") : row(n, S.vals[i], S.band); if (e._v !== v) { e.lastChild.innerHTML = rd ? v : `<em>${barsSVG(0)}<span>&nbsp;</span></em>`; e._v = v; } e.classList.toggle("weak", rd && i === k && free()); }); }
// where a room's name goes: near the middle, clear of walls, door swings, the phone and the router
function spotFor(r, i, w, h) {
  const G = rg(), k = V.k, hw = (portrait ? h : w) / 2 / k + .05, hh = (portrait ? w : h) / 2 / k + .04, in_ = (x, y) => S.map[Math.floor(y / G) * Math.round(P.W / G) + Math.floor(x / G)] === i; let best = null, bd = 1e9;
  for (let ox = 0; ox <= 2.2; ox += .2) for (const sx of ox ? [1, -1] : [1]) for (let oy = 0; oy <= 1.8; oy += .2) for (const sy of oy ? [1, -1] : [1]) { const x = r.at[0] + ox * sx, y = r.at[1] + oy * sy, d = Math.hypot(ox, oy); if (d >= bd) continue; if (![[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]].every(([a, b]) => in_(x + a * hw, y + b * hh))) continue;
    const hitR = ([X, Y], rx, ry) => Math.abs(X - x) < hw + rx && Math.abs(Y - y) < hh + ry; if (hitR(S.phone, (portrait ? 24 : 18) / k, (portrait ? 18 : 24) / k) || hitR(S.router, 27 / k, 27 / k)) continue; const [a, b] = toView(...S.phone, V), sgn = a > box.w * .72 ? -1 : 1, mid = toPlan(a + sgn * 54, b, V); if (hitR(mid, (portrait ? 12 : 42) / k, (portrait ? 42 : 12) / k)) continue;
    if (whole5() && S.sc.k === 1) { const [lx, ly] = toView(x, y, V), L = bands.loupeBox(); if (lx + w / 2 > L.x - 6 && lx - w / 2 < L.x + L.w * 2 + 6 && ly + h / 2 > L.y - 6 && ly - h / 2 < L.y + L.h + 16) continue; }
    if (S.plan.feats.some((f) => f.k === "door" && (() => { const s = f.s || 1, cx = f.o === "h" ? f.x : f.x + s * f.w / 2, cy = f.o === "h" ? f.y + s * f.w / 2 : f.y; return hitR([cx, cy], f.w / 2, f.w / 2); })())) continue; bd = d; best = [x, y]; }
  return best;
}
function place(all) {
  if (!S.router || !box.w) return; const at = (e, x, y, w, h) => { e.style.transform = `translate(${(x - w / 2).toFixed(1)}px,${(y - h / 2).toFixed(1)}px)`; }, rs = $("router").offsetWidth || (portrait ? 42 : 46);
  const [x, y] = toView(...S.router, V); at($("router"), x, y, rs, rs * 1.32); $("router").classList.toggle("flip", x > box.w * .62);
  { const m = $("router2"); if (S.second && free()) { const [X2, Y2] = toView(...S.second, V); m.hidden = false; at(m, X2, Y2, rs, rs * 1.32); } else m.hidden = true; }
  const ht = S.sc && S.stage < 5 && mainOf() !== "router" ? (S.stage === 4 ? S.phone : thingAt(mainOf() + "0")) : S.router; let [hx, hy] = toView(...ht, V); if (whole5()) { const k = S.sc.k; if (k === 1) { hx = S.dual.at * box.w; hy = box.h * .5; } else if (k === 2) [hx, hy] = toView(S.plan.walls[0].x1, 3.84, V); else if (k === 3) [hx, hy] = toView(...S.phone, V); else { hx = k === 5 ? bands.cellCentre(8)[0] : -200; hy = k === 5 ? bands.cellCentre(8)[1] : -200; } } $("cue").style.transform = `translate(${hx.toFixed(1)}px,${hy.toFixed(1)}px)`; $("cue").classList.toggle("flip", hx > box.w * .62); $("cue").classList.toggle("low", (S.stage === 1 || (whole5() && S.sc.k === 2)) && portrait);
  const [a, b] = toView(...S.phone, V), shown = (X, Y) => X > -4 && Y > -4 && X < box.w + 4 && Y < box.h + 4 ? "" : "none"; $("router").style.display = shown(x, y); $("phone").style.display = shown(a, b); at($("phone"), a, b - (S.stage === 4 ? 40 : 0), $("phone").offsetWidth || 28, $("phone").offsetHeight || 44); $("phone").classList.toggle("flip", a > box.w * .72);
  const Lb = eng ? eng.labels : new Float32Array(48); if (all) Lb.fill(0);
  S.rooms.forEach((r, i) => { const e = tags[i]; if (!e) return; if (all) { e._w = e.offsetWidth; e._h = e.offsetHeight; if (!drag && !S.glide && S.mode === "play") e._at = e._w ? spotFor(r, i, e._w, e._h) : null; if (S.mode !== "play") e._at = null; } const [X, Y] = toView(...(e._at || r.at), V); if (all) { e.style.transform = `translate(${X.toFixed(1)}px,${Y.toFixed(1)}px) translate(-50%,-50%)`; }
    const near = (px, py, w, h) => Math.abs(px - X) < e._w / 2 + w && Math.abs(py - Y) < e._h / 2 + h, hush = S.mode !== "edit" && !S.searching && (near(x, y, 22, 24) || near(a, b, 16, 22)); e.classList.toggle("hush", hush); if (S.mode !== "edit") e.style.visibility = (!r.counted || (whole5() && S.sc.k === 1)) && e._w && !e._at && !S.searching ? "hidden" : ""; else e.style.visibility = ""; if (i < 12) Lb.set(hush || !e._w || e.style.visibility ? [0, 0, 0, 0] : [X * dpr, Y * dpr, e._w / 2 * dpr, e._h / 2 * dpr], i * 4); });
  if (tags.extra) { const [X, Y] = toView(...tags.extra.dataset.at.split(",").map(Number), V); tags.extra.style.transform = `translate(${X}px,${Y}px) translate(-50%,-50%)`; tags.extra.classList.toggle("hush", Math.hypot(X - x, Y - y) < 40); if (S.rooms.length < 12) Lb.set(tags.extra.classList.contains("hush") ? [0, 0, 0, 0] : [X * dpr, Y * dpr, tags.extra.offsetWidth / 2 * dpr, 5 * dpr], 11 * 4); }
  document.querySelectorAll(".thing").forEach((e) => { const q = thingAt(e.dataset.k); if (q) { const [X, Y] = toView(...q, V); e.style.transform = `translate(${X}px,${Y}px)`; } });
  editor && editor.place();
}
function pencil(animate) { // the red pencil: the answer's circle, the way there; the two spots of experiment 4
  const v = $("pencil"); v.innerHTML = ""; if (S.mode === "edit") return; const a = S.answer;
  if (a && free()) { const c = circlePath(toView(...a.best, V), portrait ? 36 : 42), ln = a.won ? "" : arrowPath(toView(...a.you, V), toView(...a.best, V)); v.innerHTML = `<path d="${c}" stroke-width="3" pathLength="1"/>` + (ln ? `<path d="${ln}" stroke-width="2.2" pathLength="1"/>` : ""); if (a.other && !a.other.same) { const [ox, oy] = toView(...a.other.at, V), R = portrait ? 30 : 34; v.innerHTML += `<path class="oth" d="${circlePath([ox, oy], R)}" stroke-width="2" stroke-dasharray="6 6"/><text x="${ox}" y="${oy + 4}" text-anchor="middle" fill="#fff" style="font:${portrait ? 12 : 14}px var(--f);text-shadow:0 0 3px #04122c,0 0 6px #04122c,0 0 9px #04122c">${a.other.band === "5" ? t.b5 : t.b24}</text>`; } if (animate && !calm) [...v.children].forEach((p, i) => p.animate([{ strokeDasharray: "1 1", strokeDashoffset: 1 }, { strokeDasharray: "1 1", strokeDashoffset: 0 }], { duration: i ? 700 : 900, delay: i ? 0 : 600, fill: "backwards", easing: "ease-in-out" })); }
  if (S.stage === 4 && S.sc) { const k = V.k, [hx, hy] = toView(...S.sc.home, V), w = HAND * k; v.innerHTML += `<circle cx="${hx}" cy="${hy}" r="${w}" fill="none" stroke="#f0483c" stroke-width="2" stroke-dasharray="7 6"/><text x="${hx}" y="${hy + w + 18}" text-anchor="middle" fill="#f3f5f3" style="font:${portrait ? 11 : 13}px var(--f);text-shadow:0 0 3px #04122c,0 0 6px #04122c,0 0 9px #04122c">${S.sc.won ? "" : t.hand}</text>`;
    const p = S.sc.pair; { const [x, y] = toView(...S.phone, V); v.innerHTML += `<path id="cross" d="M${x - 7} ${y}h14M${x} ${y - 7}v14" stroke-width="1.8" style="stroke:#fff"/><circle cx="${x}" cy="${y}" r="3.2" fill="#f0483c"/>`; } if (0) for (const [q, f] of [[p.hi, "#f0483c"], [p.lo, "none"]]) { const [x, y] = toView(q.x, q.y, V); v.innerHTML += `<circle cx="${x}" cy="${y}" r="6" fill="${f}" stroke="#f0483c" stroke-width="2"/>`; } }
}

// ---------- things one can drag besides the router and the phone
const thingList = () => S.mode === "edit" || (whole5() && S.sc.main !== "wall") ? [] : S.sc ? (mainOf() === "box" ? ["box0"] : mainOf() === "mirror" ? ["mirror0"] : mainOf() === "wall" ? ["wall0"] : []) : S.stage === 6 ? [...S.plan.boxes.map((_, i) => "box" + i), ...S.plan.mirrors.map((_, i) => "mirror" + i)] : S.plan.boxes.map((_, i) => "box" + i);
function thingAt(k) { const i = +k.slice(-1); if (k.startsWith("box")) { const b = S.plan.boxes[i]; return b && [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; } if (k.startsWith("mirror")) { const m = S.plan.mirrors[i]; return m && [m[0], m[1]]; } return whole5() && S.plan.walls[0] ? [S.plan.walls[0].x1, 3.84] : [5.6, 3.84]; }
function things() { const L = $("things"); L.innerHTML = ""; for (const k of thingList()) { const b = btn("thing", "", () => { }); b.dataset.k = k; b.setAttribute("aria-label", t.things[k.replace(/\d/, "")]); b.onkeydown = (e) => { if (k === "wall0" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); return whole5() ? bands.nextWall() : tapWall(); } const d = arrow(e); if (!d) return; e.preventDefault(); const q = thingAt(k); moveThing(k, [q[0] + d[0], q[1] + d[1]]); saveHash(); }; L.append(b); } place(false); }
const arrow = (e) => { const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d || S.searching) return null; const st = (S.stage === 4 ? .006 : .12) * (e.shiftKey ? .25 : 1), v = portrait ? [d[1], -d[0]] : d; return [v[0] * st, v[1] * st]; };
function hitThing(p, tol) { for (const k of thingList()) { if (k.startsWith("box")) { const b = S.plan.boxes[+k.slice(-1)]; if (p[0] > b[0] - tol && p[0] < b[2] + tol && p[1] > b[1] - tol && p[1] < b[3] + tol) return k; } if (k.startsWith("mirror")) { const [a, b] = mirrorEnds(S.plan.mirrors[+k.slice(-1)]), L = Math.hypot(b[0] - a[0], b[1] - a[1]), u = Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / L / L)); if (Math.hypot(p[0] - a[0] - u * (b[0] - a[0]), p[1] - a[1] - u * (b[1] - a[1])) < tol * 1.2) return k; } } return null; }
let baseIds = null;
function moveThing(k, [x, y]) { // only a small rectangle of the wall map changes
  const i = +k.slice(-1), v = S.view; x = Math.max(v.x + .2, Math.min(v.x + v.w - .2, x)); y = Math.max(v.y + .2, Math.min(v.y + v.h - .2, y)); let r0, r1; const bb = (m) => { const R = m[2] / 2 + .1; return [m[0] - R, m[1] - R, m[0] + R, m[1] + R]; };
  if (k.startsWith("box")) { const b = S.plan.boxes[i], w = (b[2] - b[0]) / 2, h = (b[3] - b[1]) / 2, on = (q) => Math.abs(q[0] - x) < w + .14 && Math.abs(q[1] - y) < h + .14; if (on(S.router) || on(S.phone)) return; r0 = [...b]; S.plan.boxes[i] = [x - w, y - h, x + w, y + h, b[4]]; r1 = S.plan.boxes[i]; } else { const m = S.plan.mirrors[i]; r0 = bb(m); m[0] = x; m[1] = y; r1 = bb(m); }
  if (!S.sc && S.planId !== "custom") { S.planId = "custom"; S.answer = null; pencil(); panel(); } else if (S.answer) { S.answer = null; pencil(); panel(); }
  if (!eng) return; setWalls([Math.min(r0[0], r1[0]), Math.min(r0[1], r1[1]), Math.max(r0[2], r1[2]), Math.max(r0[3], r1[3])]); ink(); place(false); S.moved = k;
}
function tapWall() { const w = S.plan.walls[0], s = S.sc; w.m = MATS[(MATS.indexOf(w.m) + 1) % MATS.length]; if (!s.tried.includes(w.m)) s.tried.push(w.m); s.held = 0; touched(); setWalls(); ink(); scenePanel(); saveHash(); }

// ---------- the wave loop
const SETTLE = 3400; let also = null, read2 = 0, last = 0, slow = 0, frames = 0, readAt = 0, tickAt = 0, numAt = 0, factAt = 0, stuck = 0; export const stats = { frames: 0, t0: performance.now() };
function wake() { if (eng) S.settledAt = eng.n + SETTLE; if (eng2) S.settled2 = eng2.n + SETTLE; }
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(100, now - last || 16); last = now; frames++; stats.frames++; if (document.hidden || !eng || eng.lost) return;
  if (!S.searching) {
    slow = slow * .9 + dt * .1; const cap = Math.max(4, Math.round(Math.min(40, dt) * (calm ? 2 : ready() ? .92 : 2))); // as many wave steps per frame as this device can afford
    if (slow > 26) S.stepsPF = Math.max(4, S.stepsPF - 1); else if (frames % 6 === 0 && S.stepsPF < cap) S.stepsPF++; if (S.stepsPF > cap + 2) S.stepsPF = cap;
    stuck = S.stepsPF <= 4 && slow > 34 ? stuck + 1 : 0; if (stuck > 90 && eng.tier === 0) { stuck = 0; lighter(); }
    const still = whole5() && S.sc.still, pair2 = two() && eng2 && !still; eng.src = S.router; if (!still && eng.n < S.settledAt) eng.step(pair2 ? Math.max(3, Math.round(S.stepsPF * .7)) : S.stepsPF); eng.vis = (eng.vis + dt / 1000 * VIS_HZ * 2 * Math.PI) % (2 * Math.PI); eng.flash *= Math.pow(.02, dt / 1000); eng.observe();
    if (pair2) { eng2.src = S.second || S.router; if (eng2.n < S.settled2) eng2.step(Math.max(2, Math.round(S.stepsPF * .7))); eng2.vis = eng.vis; eng2.flash = S.second ? 0 : eng.flash; eng2.observe(); } if (also && !still) also.frame();
    bands && bands.frame(now, dt); paint($("gl").width, $("gl").height);
    if (pair2 && now - read2 > 90 && eng2.requestRead(...S.phone, 2)) read2 = now; { const q = pair2 && eng2.pollRead(); if (q) got2(q); }
    if (now - readAt > (S.stage === 4 ? 24 : 90)) { if (eng.requestRead(...S.phone, S.stage === 4 ? 0 : 2)) { readAt = now; } }
    const r = eng.pollRead(); if (r) got(r, now);
  }
  if (S.glide) glide(now);
}
// the picture: one simulation, two halves, or the stronger of two routers
function paint(w, h) { if (two() && eng2 && !S.searching) { if (S.second) return eng.draw(w, h, { second: eng2 }); const k = w / box.w, c = cuts(); eng.draw(w, h, { cut: c[0].map((v) => v * k) }); eng2.draw(w, h, { cut: c[1].map((v) => v * k), keep: 1 }); if (whole5() && S.sc.k === 1) bands.loupe(w, h, k); } else eng.draw(w, h); }
const around = (e, p) => { const i = Math.floor(S.phone[0] / P.W * e.rx), j = Math.floor(S.phone[1] / P.H * e.ry); let s = 0, n = 0; for (let b = -1; b < 2; b++) for (let a = -1; a < 2; a++) { const I = i + a, J = j + b; if (I < 0 || J < 0 || I >= e.rx || J >= e.ry) continue; s += Math.max(p[J * e.rx + I], 1e-12); n++; } return e.p1 + 10 * Math.log10(s / Math.max(1, n)); };
function got2(r) { if (S.rooms.length) { const lv = roomLevels(S, eng2, r.p, S.second || S.router, S.coarse2); S.vals2 = S.vals2.length === lv.length ? S.vals2.map((v, i) => v + (lv[i] - v) * .5) : lv; } const ad = around(eng2, r.p); S.area2 = S.area2 == null ? ad : S.area2 + (ad - S.area2) * .5; }
function got(r, now) {
  if (S.rooms.length) { const lv = roomLevels(S, eng, r.p, S.router); if (S.second && S.vals2.length === lv.length) lv.forEach((v, i) => lv[i] = Math.max(v, S.vals2[i])); S.vals = S.vals.length === lv.length ? S.vals.map((v, i) => v + (lv[i] - v) * .5) : lv; }
  S.readAt = r.at; const pd = eng.p1 + 10 * Math.log10(Math.max(r.phone, 1e-12)); S.phoneDb = S.phoneDb == null || S.stage === 4 ? pd : S.phoneDb + (pd - S.phoneDb) * .6;
  let ad = around(eng, r.p); if (S.second && S.area2 != null) ad = Math.max(ad, S.area2); S.areaDb = S.areaDb == null ? ad : S.areaDb + (ad - S.areaDb) * .5;
  sceneTick(Math.min(200, now - tickAt)); tickAt = now; if (now - numAt > 130) { numAt = now; numbers(); } if (now - factAt > 2500) { factAt = now; facts(); place(true); }
}
function numbers() { const right = S.dual && S.dual.mode === "x" && S.area2 != null && (toView(...S.phone, V)[0] > S.dual.at * box.w) === portrait, d = right ? S.area2 : (S.sc && S.stage !== 4) || S.second || S.dual ? S.areaDb : S.phoneDb; if (d != null) { $("pv").textContent = S.dual ? (S.dual.mode === "py" ? "" : fmt(P.mbps(d, right ? "2.4" : "5")) + " " + t.mbps) : (S.stage === 4 && document.body.classList.contains("quiet")) || !S.sc ? speed(d) : ""; $("bars").setAttribute("class", "s" + P.bars(d)); } if (S.vals.length) { tagNumbers(); if (free() && S.mode === "play") { readout(); goalCheck(); } } }
function makeEngine(tier) { const e = new Engine($("gl"), tier, { half: qs.get("half") === "1" }); return e; }
function lighter() { try { const old = eng; if (eng2) { eng2.dispose(); eng2 = null; } eng = makeEngine(1); old.dispose && old.dispose(); applyPlan(true); layout(); } catch (e) { console.warn(String(e)); } }

// ---------- fingers
const ptrs = new Map(); let pinch = null;
const pos = (e) => { const r = $("print").getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }, local = (e) => toPlan(...pos(e), V);
const inView = ([x, y]) => { const v = S.view, m = Math.min(.35, v.w * .04); return [Math.max(v.x + m, Math.min(v.x + v.w - m, x)), Math.max(v.y + m, Math.min(v.y + v.h - m, y))]; };
function doorAt(p, tol) { let b = null, bd = tol; for (const d of S.plan.feats) { if (d.k !== "door") continue; const dd = Math.max(Math.abs(p[0] - d.x) - (d.o === "h" ? d.w / 2 : 0), Math.abs(p[1] - d.y) - (d.o === "v" ? d.w / 2 : 0), 0); if (dd < bd) { bd = dd; b = d; } } return b; }
// is the finger on something that can be dragged?
const dividerX = () => S.dual && S.dual.mode === "x" ? S.dual.at * box.w : -999, knob = (p) => { if (dividerX() < 0) return false; const [X, Y] = toView(...p, V); return Math.abs(X - dividerX()) < 26 && (whole5() || Math.abs(Y - box.h * .5) < 34); };
function grip(p) { if (knob(p)) return true; if (whole5()) { const k = S.sc.k; if (k === 2) return Math.abs(p[0] - S.plan.walls[0].x1) * V.k < 34; if (k === 3) return Math.hypot(p[0] - S.phone[0], p[1] - S.phone[1]) * V.k < 70; return false; } const px = (q) => Math.hypot(p[0] - q[0], p[1] - q[1]) * V.k; if (S.mode === "edit") return true; if (S.sc) { const m = mainOf(); if (m === "phone") return px(S.phone) < 90; if (px(S.phone) < 36 && m !== "wall") return true; if (m === "router") return px(S.router) < 48; return m === "box" || m === "mirror" ? px(thingAt(m + "0")) < 64 || !!hitThing(p, 22 / V.k) : false; } return px(S.router) < 44 || (S.second && px(S.second) < 44) || px(S.phone) < 34 || !!hitThing(p, 14 / V.k); }
const canZoom = () => !S.sc && !S.searching && !S.dual;
function startPinch() { const [a, b] = [...ptrs.values()]; if (drag && performance.now() - drag.t < 400 && drag.what === "router" && drag.from) { S.router = drag.from; wake(); } drag = null; editor.cancel(); const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), w: S.view.w, at: toPlan(...mid, V), photo: editor.photoPinch() }; }
function zoomTo(w, at, X, Y) { const nw = Math.max(P.W / 5, Math.min(P.W, w)), nh = nw * P.H / P.W, k = box.w / (portrait ? nh : nw), v = { w: nw, h: nh }; if (portrait) { v.x = at[0] - Y / k; v.y = at[1] - (nh - X / k); } else { v.x = at[0] - X / k; v.y = at[1] - Y / k; } v.x = Math.max(0, Math.min(P.W - nw, v.x)); v.y = Math.max(0, Math.min(P.H - nh, v.y)); S.view = v; layout(); }
function bind() {
  const E = $("print");
  E.addEventListener("pointerdown", (e) => {
    if (S.searching || e.target.closest("#unzoom")) return; e.preventDefault(); try { E.setPointerCapture(e.pointerId); } catch { /* synthetic */ } ptrs.set(e.pointerId, pos(e)); const p = local(e);
    if (ptrs.size === 2 && canZoom()) return startPinch(); if (ptrs.size > 1) return; if (S.mode === "edit") return editor.down(e, p); if (drag) return;
    S.glide = null; const near = (q, px) => Math.hypot(p[0] - q[0], p[1] - q[1]) * V.k < px, dr = Math.hypot(p[0] - S.router[0], p[1] - S.router[1]), dp = Math.hypot(p[0] - S.phone[0], p[1] - S.phone[1]); let what, door = null, off = [0, 0];
    if (knob(p)) { what = "divider"; off = [0, 0]; } else if (whole5()) { const k = S.sc.k; what = k === 5 ? "windows" : k === 1 || k === 6 ? (k === 1 ? "divider" : null) : k === 2 ? "bwall" : k === 3 ? "phone" : null; if (k === 3) off = [S.phone[0] - p[0], 0]; if (k === 2) off = [S.plan.walls[0].x1 - p[0], 0]; } else if (S.sc) { what = mainOf(); if (S.stage === 5) what = near(S.phone, 34) && dp < dr ? "phone" : near(S.router, 48) ? "router" : null; else if (near(S.phone, 30) && (S.stage === 2 || S.stage === 3) && !hitThing(p, .1)) what = "phone"; const q = what === "phone" ? S.phone : what === "router" ? S.router : what === "mirror" || what === "box" ? thingAt(what + "0") : p; off = [q[0] - p[0], q[1] - p[1]]; }
    else { const onR = near(S.router, 32), th = !onR && !(near(S.phone, 26)) ? hitThing(p, 12 / V.k) : null; what = S.second && near(S.second, 32) && !onR ? "second" : near(S.phone, 30) && dp < dr ? "phone" : th ? th : "router"; door = what === "router" && !onR ? doorAt(p, Math.min(.24, 16 / V.k)) : null; const q = what === "second" ? S.second : what === "phone" ? S.phone : th ? thingAt(th) : onR ? S.router : p; off = [q[0] - p[0], q[1] - p[1]]; }
    const tch = e.pointerType !== "mouse", held = grip(p); if (tch && !held) { if (S.sc && what !== "wall" && what !== "windows" && what !== "bwall") return; drag = { id: e.pointerId, what: S.sc ? (what === "windows" ? "windows" : "wall") : "tap", t: performance.now(), x: e.clientX, y: e.clientY, off: [0, 0], door, moved: false, from: [...S.router] }; return; }
    drag = { id: e.pointerId, what, t: performance.now(), x: e.clientX, y: e.clientY, off, door: held ? null : door, moved: false, from: [...S.router] }; if (what === "router" && !door) moveTo(p); E.classList.add("grabbing"); E.classList.toggle("r", what === "router");
  });
  E.addEventListener("pointermove", (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, pos(e)); if (pinch) { const [a, b] = [...ptrs.values()]; if (a && b) { const d = Math.hypot(a[0] - b[0], a[1] - b[1]), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if (pinch.photo) editor.photoZoom(pinch.photo, d / pinch.d, toPlan(...mid, V)); else zoomTo(pinch.w * pinch.d / d, pinch.at, ...mid); } return; }
    if (S.mode === "edit") return editor.move(e, local(e)); if (!drag || e.pointerId !== drag.id) { if (e.pointerType === "mouse" && !drag) hover(e); return; } if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true; if (drag.what === "tap") return; if (drag.what === "windows") { const i = bands.windowAt(...pos(e)); if (i >= 0 && i !== drag.lastW && e.pointerType === "mouse") { drag.lastW = i; if (!S.sc.on.includes(i)) bands.toggle(i); } return; } if (drag.door && !drag.moved) return; drag.door = null; if (drag.moved) moveTo(local(e));
  });
  const tl = (c) => { const r = E.getBoundingClientRect(); return toPlan(c.clientX - r.left, c.clientY - r.top, V); };
  for (const n of ["touchstart", "touchmove"]) E.addEventListener(n, (e) => { if (e.target.closest("#unzoom") || !e.cancelable) return; if (e.touches.length > 1 || pinch || (n === "touchmove" ? drag && drag.what !== "tap" && drag.what !== "wall" || S.mode === "edit" : grip(tl(e.touches[0])))) e.preventDefault(); }, { passive: false }); // the page scrolls under a finger that holds nothing
  E.addEventListener("gesturestart", (e) => e.preventDefault());
  const up = (e) => { ptrs.delete(e.pointerId); if (e.type === "pointercancel" && pinch && !ptrs.size) pinch = null; if (pinch) { if (ptrs.size < 2) pinch = null; return; } if (S.mode === "edit") return editor.up(e, local(e)); if (!drag || e.pointerId !== drag.id) return; const D = drag; drag = null; E.classList.remove("grabbing", "r"); if (e.type === "pointerup" && (D.what === "wall" || D.what === "bwall") && !D.moved) whole5() ? S.sc.k === 2 && bands.nextWall() : tapWall(); if (e.type === "pointerup" && D.what === "windows" && !D.moved) { const i = bands.windowAt(...pos(e)); if (i >= 0) bands.toggle(i); } if (D.what === "divider" && S.sc) S.sc.moved = 1; if (D.what === "tap" && !D.door && !D.moved && e.type === "pointerup" && performance.now() - D.t < 600) { const z = inView(local(e)); if (eng) { eng.ramp0 = eng.n; eng.flash = .8; } S.router = z; if (eng) eng.src = z; touched(); wake(); place(false); settleRouter(); }
    if ((D.what === "router" || D.what === "second") && (D.moved || !D.door) && e.type === "pointerup") settleRouter();
    if (D.door && !D.moved && e.type === "pointerup") { D.door.open = D.door.open ? 0 : 1; if (S.answer) { S.answer = null; panel(); pencil(); } setWalls(); stopAlso(); ink(); } if (S.moved && !S.sc) { S.moved = null; roomsNow(); words(); } place(true); saveHash(); };
  E.addEventListener("pointerup", up); E.addEventListener("pointercancel", up);
  E.addEventListener("wheel", (e) => { if (!canZoom() || !(e.ctrlKey || e.metaKey)) return; e.preventDefault(); zoomTo(S.view.w * Math.exp(e.deltaY * .006), local(e), ...pos(e)); }, { passive: false });
  const key = (what) => (e) => { const d = arrow(e); if (!d || (S.sc && what === "router")) return; e.preventDefault(); S.glide = null; if (what === "phone") { S.phone = inView([S.phone[0] + d[0], S.phone[1] + d[1]]); if (whole5() && S.sc.k === 3) S.phone[1] = S.sc.rail; if (S.stage === 4) pencil(); } else { S.router = inView([S.router[0] + d[0], S.router[1] + d[1]]); touched(); wake(); clearTimeout(S.keyT); S.keyT = setTimeout(settleRouter, 900); } place(false); saveHash(); };
  $("router").addEventListener("keydown", key("router")); $("phone").addEventListener("keydown", key("phone"));
  $("unzoom").onclick = () => { S.view = whole(); layout(); };
  $("lang").onclick = () => { lang = lang === "en" ? "zh" : "en"; store.set("lang", lang); words(); layout(); };
  $("theme").onclick = () => { root.dataset.theme = isDark() ? "light" : "dark"; store.set("theme", root.dataset.theme); themed(); };
  mqD.addEventListener("change", themed);
  $("index").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; b.dataset.k ? goBand(+b.dataset.k) : go(+b.dataset.i); };
  for (const id of ["end", "about"]) $(id).addEventListener("click", (e) => { if (e.target === $(id)) $(id).close(); });
  $("hdClose").onclick = () => $("homesDlg").close(); $("homesDlg").addEventListener("click", (e) => { if (e.target === $("homesDlg")) $("homesDlg").close(); }); $("dlClose").onclick = () => $("end").close(); $("abClose").onclick = () => $("about").close(); $("dlLink").onclick = () => copyLink(); $("dlSave").onclick = () => { const a = el("a"); a.href = $("endimg").src; a.download = "wifi-print.png"; document.body.append(a); a.click(); a.remove(); };
  $("dlShare").onclick = async () => { try { const f = new File([S.blob], "wifi-print.png", { type: "image/png" }); await navigator.share({ files: [f], title: t.imgT, url: shareURL(true) }); } catch { /* closed */ } };
  addEventListener("resize", layout); mqP.addEventListener("change", layout); addEventListener("hashchange", () => { if (location.hash === ownHash || S.searching) return; readHash(); applyPlan(true); words(); layout(); });
  addEventListener("keydown", (e) => { if (e.target.closest("input,dialog")) return; if (S.mode === "edit") return editor.key(e); if (S.dual && S.dual.mode === "x" && e.target === document.body && /^Arrow(Left|Right)$/.test(e.key)) { S.dual.goal = null; S.dual.at = Math.max(.015, Math.min(.985, S.dual.at + (e.key === "ArrowLeft" ? -.04 : .04))); if (S.sc) S.sc.moved = 1; touched(); ink(); } });
  document.addEventListener("visibilitychange", () => { last = performance.now(); slow = 16; });
}
function hover(e) { const p = local(e), c = $("print").classList; c.toggle("tap", S.sc ? mainOf() === "wall" && Math.abs(p[0] - 5.6) < .4 : Math.hypot(p[0] - S.router[0], p[1] - S.router[1]) * V.k > 32 && !!doorAt(p, Math.min(.24, 16 / V.k))); }
function themed() { $("theme").textContent = isDark() ? t.light : t.dark; $("tc").content = css("--paper"); layout(); if (S.stage === 4) drawTrace(); if (whole5()) { S.sc.k === 3 && bands.drawWalk(); ink(); } }
const quiet = (on) => document.body.classList.toggle("quiet", on);
function touched() { if (S.bandNote) { S.bandNote = ""; if (free() && !S.answer) panel(); } S.moves = (S.moves || 0) + 1; S.touched = true; quiet(true); if (S.sent) { S.sent = 0; panel(); } if (S.answer && S.answer.at !== "free") { S.answer.at = "free"; const b = $("swap"); if (b) b.textContent = t.toBest; freeLine(); } }
function moveTo(p) {
  const w = drag.what, q = [p[0] + drag.off[0], p[1] + drag.off[1]]; if (!w || w === "wall" || w === "windows") return; if (w === "second") { S.second = inView(q); if (eng2) eng2.src = S.second; wake(); place(false); panel(); return; } if (w === "divider") { const [X] = toView(...p, V); S.dual.goal = null; S.dual.at = Math.max(.015, Math.min(.985, X / box.w)); if (whole5()) { S.sc.moved = 1; touched(); } ink(); place(false); return; } if (w === "bwall") { S.sc.slide = null; bands.moveWall(q[0]); touched(); ink(); place(false); return; }
  if (w === "phone") { S.phone = inView(q); if (whole5() && S.sc.k === 3) { S.phone[1] = S.sc.rail; S.phone[0] = Math.max(2.3, S.phone[0]); touched(); } if (S.stage === 4) { const hm = S.sc.home, D = Math.hypot(S.phone[0] - hm[0], S.phone[1] - hm[1]), m = HAND * .97; if (D > m) S.phone = [hm[0] + (S.phone[0] - hm[0]) * m / D, hm[1] + (S.phone[1] - hm[1]) * m / D]; touched(); pencil(); } place(false); } else if (w === "router") { const z = inView(q); if (Math.hypot(z[0] - S.router[0], z[1] - S.router[1]) > .6 && eng) { eng.ramp0 = eng.n; eng.flash = .8; } S.router = z; if (eng) eng.src = z; touched(); wake(); place(false); }
  else { moveThing(/\d$/.test(w) ? w : w + "0", q); touched(); }
}
// a router stands along a wall: on letting go it slides to the nearest place where it can
function settleRouter() { if (free() && !S.answer && !S.second && S.moves && S.mode === "play" && !$("best")) panel(); if (!free() || !S.rooms.length || S.mode !== "play" || S.searching) return; const n = nearest(S, ...S.router); if (n && Math.hypot(n[0] - S.router[0], n[1] - S.router[1]) > .05) { glideTo(n, 380); snapNote(); } if (S.second) { const q = nearest(S, ...S.second); if (q) { S.second = q; if (eng2) eng2.src = q; wake(); } } }
let snapT = 0; function snapNote() { if (S.snapped > 1) return; S.snapped = (S.snapped || 0) + 1; const e = $("note"); e.textContent = t.snap; e.classList.add("on"); clearTimeout(snapT); snapT = setTimeout(() => e.classList.remove("on"), 2600); }
function glideTo(to, dur = 900) { S.glide = { from: [...S.router], to: [...to], t0: performance.now(), dur: calm ? 1 : dur }; }
function glide(now) { const G = S.glide, k = Math.min(1, (now - G.t0) / G.dur), e = k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2; S.router = [G.from[0] + (G.to[0] - G.from[0]) * e, G.from[1] + (G.to[1] - G.from[1]) * e]; wake(); place(false); if (k >= 1) { S.glide = null; saveHash(); } }

// ---------- the search
const sleep = () => new Promise((r) => requestAnimationFrame(r)); let per = 30;
async function settle(steps) { // run the waves while still drawing them
  let left = steps, lastT = performance.now(); while (left > 0) { if (S.cancel) throw new Error("stop"); if (document.hidden) { await new Promise((r) => setTimeout(r, 200)); lastT = performance.now(); continue; } const n = Math.min(per, left); eng.step(n); left -= n; eng.vis = (eng.vis + VIS_HZ * .1) % (2 * Math.PI); eng.observe(); eng.draw($("gl").width, $("gl").height); await sleep(); const now = performance.now(), dt = now - lastT; lastT = now; per = dt > 34 ? Math.max(12, per * .8 | 0) : Math.min(160, per * 1.15 + 1 | 0); }
}
const askAll = () => !possible(); // where one router cannot do it, the number of rooms counts first
export async function search() {
  if (S.searching || !eng || !counted().length) return; stopAlso(); S.second = null; const wasDual = S.dual; S.dual = null; S.glide = null; drag = null; S.answer = null; S.bandNote = ""; pencil(); const you = [...S.router], view = S.view; S.view = whole(); layout(); S.searching = true; S.cancel = false; quiet(true); S.touched = true; S.sent = 0; $("read").innerHTML = ""; const k0 = known(); S.sayNow = k0 ? "" : t.askingP; panel(); strip(); picker(); $("ask").textContent = t.checking; let res = null;
  if (portrait) scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" }); const nR = counted().length, total = k0 ? 2 : nR + 24; let done = 0; const bar = el("div", "bar"); bar.append(el("i")); $("extra").append(bar); const step = () => { done++; bar.firstChild.style.width = Math.min(98, 100 * done / total) + "%"; };
  tags.forEach((e) => e.classList.add("dim")); place(true); $("phone").style.visibility = "hidden";
  try {
    const A = { S, eng, settle, byCount: askAll(), onRoom: () => { $("router").style.visibility = "hidden"; step(); }, onCheck: () => { $("router").style.visibility = ""; }, onTry: step, showRouter: (at) => { S.router = at; place(false); }, snap: () => waves(eng, portrait ? 384 : 560, portrait ? 560 : 384, { view: whole(), labels: new Float32Array(48) }) };
    res = k0 ? await quickBest(A, A.byCount ? k0.slice(9, 11) : k0.slice(1, 3)) : await findBest(A);
  } catch (e) { if (e.message !== "stop" && e.message !== "no rooms") console.error(e); }
  eng.search = 0; S.searching = false; S.dual = wasDual; $("router").style.visibility = $("phone").style.visibility = ""; S.router = [...you]; eng.src = S.router; eng.reset(); S.bornAt = 0; wake(); S.view = view;
  if (res) { S.held = []; S.answer = res; res.at = res.won ? "you" : "best"; S.vals = [...res.mine.lv]; const B = best(), id = S.planId + "|" + S.band; if (!(B[id] >= res.pct) && ORDER.includes(S.planId)) { B[id] = res.pct; store.set("best", JSON.stringify(B)); } if (S.stage === 0 || S.stage === 6) { S.done.add(S.stage); store.set("done", [...S.done].join(",")); } if (!res.won) { S.view = whole(); glideTo(res.best); } }
  if (S.dual) sync2(true); if (res && S.goNext == null) startAlso(); makeTags(); words(); layout(); pencil(true); if (res && res.won) cheer(); if (S.goNext != null) { const n = S.goNext; S.goNext = null; go(n); } return res;
}

// ---------- the other band, worked out quietly behind the answer on a third, lighter simulation
let eng3 = null;
function stopAlso() { if (also) { also.stop = 1; if (also.no) also.no(new Error("stop")); also = null; } }
async function startAlso() {
  stopAlso(); const a = S.answer; if (!a || !eng || a.mine.k < 0) return; const me = also = { left: 0, stop: 0, ok: null, no: null, frame() { if (this.left <= 0 || !eng3) return; const n = Math.min(this.left, eng.n >= S.settledAt ? Math.max(12, Math.min(150, S.stepsPF * 8)) : Math.max(6, Math.min(50, S.stepsPF * 2))); eng3.step(n); this.left -= n; if (this.left <= 0) this.ok(); } }; const ob = S.band === "5" ? "2.4" : "5";
  try {
    if (!eng3) eng3 = new Engine($("gl"), eng.tier, { half: qs.get("half") === "1" }); const e = eng3, setup = (b) => { e.setBand(b); e.search = 0; e.setPlan(raster(S.plan, e.nx, e.ny, e.dx)); }; setup(ob); const S3 = { rooms: S.rooms, map: S.map, plan: S.plan, band: ob, router: [...a.you], coarse: coarseRooms(S, e.rx, e.ry) };
    const A3 = { S: S3, eng: e, byCount: a.byCount, settle: (n) => new Promise((ok, no) => { if (me.stop) return no(new Error("stop")); me.left = n; me.ok = ok; me.no = no; }), onRoom() { }, onCheck() { }, showRouter() { } }, k1 = known(ob), run = async (q) => { e.search = 0; e.reset(); e.src = q; await A3.settle(2700); const r = await e.readNow(); return roomLevels(S3, e, r.p, q); };
    const res = k1 ? await quickBest(A3, a.byCount ? k1.slice(9, 11) : k1.slice(1, 3)) : await findBest(A3); const atTop = await run(a.best); let mainAt = null; if (Math.hypot(res.top.at[0] - a.best[0], res.top.at[1] - a.best[1]) > .3) { setup(S.band); mainAt = await run(res.top.at); }
    if (me.stop || S.answer !== a) return; const lo = (lv) => lv[weakestOf(S, lv)], mTop = P.mbps(lo(res.top.lv), ob), mHere = P.mbps(lo(atTop), ob), d = Math.hypot(res.top.at[0] - a.best[0], res.top.at[1] - a.best[1]); a.other = { band: ob, at: res.top.at, mine: res.mine.lv, atTop, top: res.top.lv, mTop, mHere, mainAt, d, same: d < .7 || fmt(mHere) === fmt(mTop) || mHere > mTop * .97 }; also = null; alsoPanel(); pencil();
  } catch (e) { if (e.message !== "stop") console.warn(String(e)); if (also === me) also = null; }
}
function alsoPanel() {
  const X = $("also"), a = S.answer; if (!X || !a) return; X.innerHTML = ""; const o = a.other, nm = (b) => b === "5" ? t.b5 : t.b24; if (!o) { X.append(el("p", "fine", also ? t.alsoWait(nm(S.band === "5" ? "2.4" : "5")) : "")); return; }
  const k = a.mine.k, f = (lv, b) => fmt(P.mbps(lv[k], b)), cap = document.querySelectorAll(".two figcaption"); cap.forEach((c, i) => { if (c.querySelector(".bv")) return; const mL = i ? a.top.lv : a.mine.lv, oL = i ? (a.won ? o.mine : o.atTop) : o.mine, v = { [S.band]: f(mL, S.band), [o.band]: f(oL, o.band) }; c.append(el("i", "bv", `${t.b5}: ${v["5"]}`), el("i", "bv", `${t.b24}: ${v["2.4"]} ${t.mbps}`)); });
  if (!o.same) X.append(el("p", "fine also", t.alsoDiff(nm(o.band), o.d.toFixed(1), fmt(o.mTop), fmt(o.mHere))));
  threePanel();
}
function threePanel() { // what to take home; the first and the last are known at once, the middle one when both bands are in
  const box = $("three"), a = S.answer; if (!box || !a) return; box.innerHTML = ""; const o = a.other, here = a.won ? a.mine.lv : a.top.lv, c = counted(), G = rg(), room = S.rooms[S.map[Math.floor(a.best[1] / G) * Math.round(P.W / G) + Math.floor(a.best[0] / G)]], near = S.plan.boxes.some((b) => Math.hypot(Math.max(b[0] - a.best[0], 0, a.best[0] - b[2]), Math.max(b[1] - a.best[1], 0, a.best[1] - b[3])) < 1); let mid = t.threeWait; if (o) { const L5 = S.band === "5" ? here : o.atTop, L2 = S.band === "5" ? o.atTop : here, two4 = c.filter((r) => P.mbps(L2[r.index], "2.4") > P.mbps(L5[r.index], "5")); mid = two4.length === 0 ? t.three2all : two4.length === c.length ? t.three2none : t.three2(join(two4.map(roomName))); }
  box.append(el("b", "", t.threeH)); const ul = el("ol"); for (const tx of [t.three1(room ? roomName(room) : ""), mid, S.plan.walls.some((w) => w.m === "metal" && Math.hypot(w.x2 - w.x1, w.y2 - w.y1) < 1) ? t.three3box : S.plan.boxes.length && !near ? t.three3(t.boxes[S.plan.boxes[0][4]] || t.fridge) : t.three3wall]) ul.append(el("li", "", tx)); box.append(ul);
}
async function addSecond() {
  const a = S.answer; if (!a || S.searching || (!a.maps && !known())) return; stopAlso(); S.glide = null; drag = null; S.searching = true; S.cancel = false; S.sayNow = t.secondWait; S.dual = S.second = null; panel(); strip(); $("ask").textContent = t.second; tags.forEach((e) => e.classList.add("dim")); let pr = null; const you = [...S.router];
  const k2 = known(); try { const A2 = { S, eng, measure: async (at) => { eng.search = 0; eng.reset(); eng.src = at; S.router = at; place(false); await settle(2700); const r = await eng.readNow(); return roomLevels(S, eng, r.p, at); } }; if (k2) { const p1 = k2.slice(4, 6), p2 = k2.slice(6, 8), la = await A2.measure(p1), lb = await A2.measure(p2), lv = la.map((v, i) => Math.max(v, lb[i])); pr = { a: p1, b: p2, la, lb, lv }; } else pr = await findPair(A2, a); } catch (e) { if (e.message !== "stop") console.error(e); }
  S.glide = null; S.searching = false; S.router = pr ? [...pr.a] : you; eng.src = S.router; eng.reset(); S.bornAt = 0; S.held = []; if (pr) { S.second = [...pr.b]; S.answer = null; S.pairInfo = pr; S.vals = [...pr.lv]; sync2(true); S.vals2 = [...pr.lb]; } wake(); makeTags(); words(); layout(); pencil(); saveHash(); if (S.goNext != null) { const n = S.goNext; S.goNext = null; go(n); }
}

// ---------- keep and share
const api = { get eng2() { return eng2; }, setWalls, walls: () => { setWalls(); ink(); }, goBand, bandDone, bandIsDone, say, ready, inkCanvas: () => $("ink"), dragging: () => !!drag, paint, get phoneBars() { return S.phoneDb == null ? 0 : P.bars(S.phoneDb); }, saveMine, S, get eng() { return eng; }, get t() { return t; }, get portrait() { return portrait; }, get dpr() { return dpr; }, get V() { return V; }, get v() { return V; }, get markScale() { return markScale; }, get font() { return css("--f"); }, get head() { return css("--h"); }, get title() { return S.sc ? t.index[S.stage] : planName(); }, roomName, fmt, weakest: () => S.vals.length ? weakestOf(S, S.vals) : -1, whole, layout, words, ink, place, panel, strip, saveHash, applyPlan, roomsNow, pencil, btn, el, toView, $, css, loadPlan, get box() { return box; }, calm, store, touched, wake };
async function keep() { if (!eng || S.searching) return; saveHash(); S.stageIsChapter = !!S.sc; await document.fonts.load(`300 40px "Print Head"`).catch(() => { }); await document.fonts.load(`20px "Routed Gothic"`).catch(() => { }); const c = picture(api), blob = await new Promise((r) => c.toBlob(r, "image/png")); if (S.blobURL) URL.revokeObjectURL(S.blobURL); S.blob = blob; $("endimg").src = S.blobURL = URL.createObjectURL(blob); $("endimg").alt = t.canvas; $("endT").textContent = t.beat; $("dlSave").textContent = t.save; $("dlLink").textContent = t.link; $("dlClose").textContent = t.close; $("dlShare").textContent = t.share; let can = false; try { can = !!navigator.canShare && navigator.canShare({ files: [new File([new Blob(["a"])], "a.png", { type: "image/png" })] }); } catch { /* old */ } $("dlShare").hidden = !can; $("end").showModal(); }
async function copyLink() { const u = shareURL(true); try { await navigator.clipboard.writeText(u); } catch { const i = el("textarea"); i.value = u; ($("end").open ? $("end") : document.body).append(i); i.select(); try { document.execCommand("copy"); } catch { /* nothing more to try */ } i.remove(); } S.lastLink = u; for (const id of ["link", "dlLink"]) { const b = $(id); if (b) { b.textContent = t.copied; setTimeout(() => { b.textContent = t.link; }, 1600); } } }
function about() { $("abH").textContent = t.how; $("abClose").textContent = t.close; $("abB").innerHTML = t.howT.map(([h, p]) => `<h3>${h}</h3><p>${p}</p>`).join("") + `<h3>${t.src}</h3><p>${t.srcs.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${n}</a>`).join("<br>")}</p><p>${t.lic}: <a href="LICENSE-routed-gothic.md">Routed Gothic</a>, <a href="fonts/OFL-source-serif-4.txt">Source Serif 4</a>, <a href="fonts/OFL-noto-serif-sc.txt">Noto Serif SC</a></p>`; $("about").showModal(); $("about").firstElementChild.scrollTop = 0; }

// ---------- go
bands = createBands(api); let editor = null; readHash();
try { eng = makeEngine(qs.get("tier") === "1" ? 1 : 0); } catch (e) { eng = null; console.info("no waves: " + String(e.message || e)); }
editor = createEditor(api);
portrait = mqP.matches && !sideView(); if (!location.hash) setTimeout(() => saveHash(), 0); applyPlan(true); bind(); words(); layout(); $("tc").content = css("--paper");
if (!eng) { document.body.classList.add("noglb"); $("print").classList.add("nogl"); say(t.noGL); $("acts").innerHTML = ""; } else requestAnimationFrame(frame);
document.fonts && document.fonts.ready.then(() => { ink(); place(true); });
$("gl").addEventListener("webglcontextlost", (e) => { e.preventDefault(); if (eng) eng.lost = true; say(t.lostGL); });
window.__wifi = { bands, goBand, GOALS, ORDER, addSecond, pickHome, get eng2() { return eng2; }, get also() { return also; },  findBest, findPair, standable: (x, y) => standable(S, x, y), ready, S, get eng() { return eng; }, P, search, stats, picture: () => picture(api), get portrait() { return portrait; }, toView: (x, y) => toView(x, y, V), go, get V() { return V; }, weakestOf: (lv) => weakestOf(S, lv), shareURL, editor, crossings, T, settle, roomLevels: (p, r) => roomLevels(S, eng, p, r), applyPlan };
