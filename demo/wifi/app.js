import * as P from "./physics.js";
import { PLANS, clone, raster, findRooms, encodePlan, decodePlan, wallRect, gapRect, fill, fillMirror, crossings, mirrorEnds, rg } from "./plans.js";
import { Engine } from "./engine.js";
import { drawInk, toView, toPlan, circlePath, arrowPath, PAPER, INK } from "./ink.js";
import { SCENES, MATS, HAND, share, in1000, farther } from "./chapters.js";
import { findBest, roomLevels, coarseRooms, weakestOf, standable } from "./search.js";
import { picture, waves, whyPrint } from "./picture.js";
import { createEditor } from "./editor.js";
import { T } from "./i18n.js";

const $ = (id) => document.getElementById(id), el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const store = { get: (k) => { try { return localStorage.getItem("wifi-" + k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem("wifi-" + k, v); } catch { /* private mode */ } } };
const qs = new URLSearchParams(location.search), root = document.documentElement;
let lang = ["en", "zh"].includes(qs.get("lang")) ? qs.get("lang") : store.get("lang") || (/^zh/i.test(navigator.language) ? "zh" : "en"); if (!T[lang]) lang = "en"; let t = T[lang];
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches, mqP = matchMedia("(orientation: portrait) and (max-width: 900px)"), mqD = matchMedia("(prefers-color-scheme: dark)");
const css = (v) => getComputedStyle(root).getPropertyValue(v).trim();
const VIS_HZ = calm ? 0 : 1.0;

// ---------- state
const S = { stage: 0, planId: "concrete", plan: null, router: null, phone: null, band: "5", rooms: [], map: null, coarse: null, vals: [], phoneDb: null, areaDb: null, view: null, mode: "play", touched: false, settledAt: 0, stepsPF: 14, answer: null, bornAt: 0, held: [], searching: false, done: new Set((store.get("done") || "").split(",").filter(Boolean).map(Number)), keep: {}, sc: null, sent: 0, sel: null };
let eng = null, V = { x: 0, y: 0, w: P.W, h: P.H, k: 100, p: false }, dpr = 1, box = { w: 0, h: 0 }, portrait = false, markScale = 1;
const free = () => S.stage === 0 || S.stage === 6, counted = () => S.rooms.filter((r) => r.counted);
const best = () => { try { return JSON.parse(store.get("best") || "{}"); } catch { return {}; } };

// ---------- text helpers
const roomName = (r) => { if (!r.key) return t.room(r.num); const same = S.rooms.filter((x) => x.key === r.key); return same.length > 1 ? t.rooms[r.key] + " " + (same.indexOf(r) + 1) : t.rooms[r.key]; };
const fmt = (m) => m >= 100 ? String(Math.round(m / 5) * 5) : m >= 10 ? String(Math.round(m)) : m >= .95 ? m.toFixed(0) : m > .05 ? "<1" : "0";
const speed = (d) => fmt(P.mbps(d, S.band)) + " " + t.mbps;
const rb = (i) => { const d = S.vals[i], n = P.bars(d); S.held ||= []; const o = S.held[i]; if (o == null || Math.abs(n - o) > 1 || P.bars(d - .6) > o || P.bars(d + .6) < o) S.held[i] = n; return S.held[i]; };
const ready = () => eng && eng.n - S.bornAt > 1600; // numbers are shown once the waves have filled the home
const barsSVG = (n) => `<svg class="b" viewBox="0 0 23 18" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<rect x="${i * 6}" y="${12 - i * 4}" width="4" height="${6 + i * 4}" class="${i < n ? "on" : ""}"/>`).join("")}</svg>`;
const join = (a) => a.length < 2 ? a.join("") : lang === "zh" ? a.join("、") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
const planName = () => S.planId === "custom" ? t.plans.custom : t.plans[S.planId];

// ---------- links
function num(v, m) { const x = parseFloat(v); return Number.isFinite(x) ? Math.max(.3, Math.min(m - .3, x)) : null; }
const pair = (s) => { const [a, b] = (s || "").split(","), x = num(a, P.W), y = num(b, P.H); return x && y ? [x, y] : null; };
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1)), st = parseInt(h.get("s")); const stage = st >= 0 && st <= 6 ? st : h.get("h") ? 6 : 0; S.stage = stage;
  if (stage >= 1 && stage <= 5) { enterScene(stage, h); return; }
  let id = h.get("h"), plan = null; if (id === "custom" && h.get("w")) { try { plan = decodePlan(h.get("w")); } catch { plan = null; } if (!plan) id = null; }
  if (!plan) { id = PLANS[id] && id !== "own" ? id : stage === 6 ? "onebed" : "concrete"; plan = clone(PLANS[id]); }
  if (h.get("d") && id !== "custom") { const ds = plan.feats.filter((f) => f.k === "door"); [...h.get("d")].forEach((c, i) => { if (ds[i]) ds[i].open = c === "1" ? 1 : 0; }); }
  P.setSize(plan.size || 1); S.sc = null; S.planId = id; S.mineId = null; S.plan = plan; S.band = P.BANDS[h.get("b")] ? h.get("b") : "5"; const def = PLANS[id] || PLANS.own;
  S.router = pair(h.get("r")) || [...def.router]; S.phone = pair(h.get("p")) || [...def.phone]; S.sent = h.get("f") ? 1 : 0; S.view = whole();
}
function shareURL(forOther) {
  const h = new URLSearchParams(); h.set("s", S.stage); const f2 = (a) => a.map((v) => v.toFixed(2)).join(",");
  if (S.sc) { const m = SCENES[S.stage].main; if (m === "wall") h.set("m", S.plan.walls[0].m); if (m === "mirror") h.set("t", f2(S.plan.mirrors[0].slice(0, 2))); if (m === "box") h.set("t", f2(S.plan.boxes[0].slice(0, 2))); if (m === "phone") h.set("t", f2(S.phone)); if (S.stage === 5) h.set("b", S.band); }
  else { h.set("h", S.planId); if (S.planId === "custom") h.set("w", encodePlan(S.plan)); else h.set("d", S.plan.feats.filter((f) => f.k === "door").map((d) => d.open ? 1 : 0).join("")); h.set("r", f2(forOther && S.answer && !S.answer.won && S.answer.at === "best" ? S.answer.you : S.router)); h.set("p", f2(S.phone)); h.set("b", S.band); if (forOther) h.set("f", "1"); }
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
  const sc = SCENES[n].make(); P.setSize(1); S.sc = sc; S.planId = n === 5 ? "concrete" : "scene"; S.plan = sc.plan; S.router = sc.router; S.phone = sc.phone; S.band = sc.band; S.view = sc.view ? { x: sc.view[0], y: sc.view[1], w: sc.view[2], h: sc.view[3] } : whole(); sc.base = null; sc.won = false; sc.trace = []; sc.pair = null; sc.held = 0; S.answer = null; S.sent = 0;
  if (h) { const m = SCENES[n].main, p = pair(h.get("t")); if (m === "wall" && MATS.includes(h.get("m"))) { S.plan.walls[0].m = h.get("m"); sc.tried = [h.get("m")]; } if (p && m === "mirror") [S.plan.mirrors[0][0], S.plan.mirrors[0][1]] = p; if (p && m === "box") S.plan.boxes[0] = [p[0], p[1], p[0] + .65, p[1] + .65, "fridge"]; if (p && m === "phone") S.phone = p; if (n === 5 && P.BANDS[h.get("b")]) S.band = h.get("b"); }
}
function snapshot() { return { planId: S.planId, mineId: S.mineId, plan: clone(S.plan), router: [...S.router], phone: [...S.phone], band: S.band }; }
function go(n, opt = {}) {
  if (S.searching) { S.cancel = true; S.goNext = n; return; } if (S.mode === "edit") editor.close(true);
  if (free() && S.plan) S.keep[S.stage] = snapshot();
  S.stage = n; S.answer = null; S.sent = 0; S.sel = null; S.did = false; S.moves = 0;
  if (n >= 1 && n <= 5) enterScene(n);
  else { S.sc = null; const k = !opt.fresh && S.keep[n]; if (k) Object.assign(S, { planId: k.planId, mineId: k.mineId, plan: clone(k.plan), router: [...k.router], phone: [...k.phone], band: k.band }); else if (n === 6 && !opt.fresh && homes().length && loadMine(homes()[0].id)) { /* the home you drew last time */ } else { const id = n === 0 ? "concrete" : "onebed"; S.planId = id; S.mineId = null; S.plan = clone(PLANS[id]); S.router = [...PLANS[id].router]; S.phone = [...PLANS[id].phone]; S.band = "5"; } P.setSize(S.plan.size || 1); S.view = whole(); }
  quiet(n === 0 ? S.touched : n > 4); applyPlan(true); words(); layout(); saveHash(true); if (portrait) scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
}
function loadMine(id) { try { const m = homes().find((x) => x.id === id), p = m && decodePlan(m.w); if (!p) return false; S.planId = "custom"; S.mineId = id; S.plan = p; P.setSize(p.size); S.router = m.r; S.phone = m.p; S.band = "5"; S.answer = null; S.sent = 0; S.did = false; S.moves = 0; return true; } catch { return false; } }
function loadPlan(id) { const d = PLANS[id] || PLANS.own; S.planId = id; S.mineId = null; S.plan = clone(d); S.router = [...d.router]; S.phone = [...d.phone]; S.answer = null; S.sent = 0; S.did = false; S.moves = 0; P.setSize(S.plan.size || 1); S.view = whole(); applyPlan(true); words(); layout(); saveHash(); }
function applyPlan(reset) { // walls, band or home changed
  eng && eng.setBand(S.band); roomsNow(); if (!eng) return; if (reset) { eng.reset(); S.bornAt = 0; S.held = []; S.did = S.allOk = false; S.vals = []; S.phoneDb = S.areaDb = null; } eng.src = S.router; eng.sharp = S.sc && S.sc.sharp ? 1 : 0; if (S.sc && S.sc.lev) eng.lev = S.sc.lev; eng.setPlan(raster(S.plan, eng.nx, eng.ny, eng.dx)); wake();
}
function roomsNow() { const f = S.sc && S.stage !== 5 ? { rooms: [], map: new Int16Array(1) } : findRooms(S.plan); S.rooms = f.rooms; S.map = f.map; S.coarse = S.rooms.length && eng ? coarseRooms(S, eng.rx, eng.ry) : new Int16Array(eng ? eng.rx * eng.ry : 1).fill(-1); if (S.vals.length !== S.rooms.length) S.vals = []; makeTags(); }

// ---------- words and panels
function words() {
  t = T[lang]; root.lang = lang === "zh" ? "zh-CN" : "en"; document.title = t.doc; $("home").textContent = portrait ? t.homeS : t.home; $("home").setAttribute("aria-label", t.home); $("lang").textContent = t.lang; $("theme").textContent = isDark() ? t.light : t.dark; $("theme").setAttribute("aria-label", t.themeL); $("hint").textContent = S.stage === 1 ? t.tap : t.drag; $("unzoom").textContent = t.zoomOut;
  $("gl").setAttribute("aria-label", t.canvas); $("router").setAttribute("aria-label", t.router); $("phone").setAttribute("aria-label", t.phone);
  $("index").innerHTML = t.index.map((x, i) => `<button type="button" data-i="${i}" ${i === S.stage ? 'aria-current="step"' : ""} class="${S.done.has(i) ? "done" : ""}" aria-label="${x}"><i>${i}</i><span>${x}</span></button>`).join("");
  editor && editor.words(); panel(); strip(); makeTags(); ink(); things(); facts();
}
function say(text, after) { if ($("say").textContent !== text) $("say").textContent = text; $("say").classList.toggle("after", !!after); }
function btn(cls, text, fn, id) { const b = el("button", cls, text); b.type = "button"; b.onclick = fn; if (id) b.id = id; return b; }
function panel() {
  const A = $("acts"), X = $("extra"); A.innerHTML = X.innerHTML = $("more").innerHTML = ""; const ch = t.ch[S.stage]; document.body.classList.toggle("editing", S.mode === "edit"); $("tools").hidden = S.mode !== "edit";
  if (S.mode === "edit") { $("ask").textContent = t.eAsk; say(""); $("read").innerHTML = ""; return; }
  $("ask").textContent = ch.ask;
  if (S.searching) { A.append(btn("line", t.stop, () => S.cancel = true, "stop")); say(S.sayNow || ""); return; }
  if (S.sc) { // an experiment
    const v = S.sc.won, dn = v || S.done.has(S.stage); say(v ? t.aft[S.stage](S.sc.say || {}) : ch.say, v); scenePanel();
    const n = S.stage === 5 ? 6 : S.stage + 1; A.append(btn(dn ? "solid" : "line", n === 6 ? t.toHome : t.next, () => go(n), "next")); if (!dn && S.stage < 5) A.append(btn("text", t.skip, () => go(6)));
    return;
  }
  const a = S.answer;
  if (a) { answerPanel(a); return; }
  const nC = counted().length; say(S.sent ? t.sent : S.did ? t.did(nC) : S.allOk && !S.moves ? t.already(nC) : S.stage === 0 || S.planId !== "onebed" || S.moves ? t.ch[0].say(nC) : ch.say, S.did); if (S.stage === 6 && (S.planId !== "onebed" || S.sent)) $("ask").textContent = planName();
  if (counted().length) A.append(btn("solid", S.did ? t.compare : t.best, search, "best"));
  if (S.stage === 0) A.append(btn("text", t.why, () => go(1), "why")); else { A.append(btn("line", t.edit, () => editor.open(), "edit")); homesGrid($("more")); }
  readout();
}
function answerPanel(a) {
  const A = $("acts"), X = $("extra"), r1 = S.rooms[a.mine.k], n1 = roomName(r1), was = P.bars(a.mine.lo), nowLv = a.top.lv[a.mine.k], now = P.bars(nowLv), sp = lang === "zh" && /\d$/.test(n1) ? n1 + " " : n1;
  if (a.at === "free") freeLine();
  else if (a.won && a.mine.lo > P.BAR_AT[3] + 2) { $("ask").textContent = t.any; say(t.anyT, 1); }
  else if (a.won) { $("ask").textContent = t.won; say(t.wonT(sp, t.bars(was)), 1); }
  else if (a.at === "you") { $("ask").textContent = t.freeH; say(t.freeT(sp, t.bars(was), a.pct < 1 ? "<1" : a.pct), 1); }
  else { $("ask").textContent = t.put; const all = a.top.lv.every((v, i) => !S.rooms[i].counted || P.bars(v) >= 3) && !a.mine.lv.every((v, i) => !S.rooms[i].counted || P.bars(v) >= 3); say((now > was ? t.putT(sp, t.bars(was), t.bars(now)) : t.putT(sp, fmt(a.mY) + " " + t.mbps, fmt(P.mbps(nowLv, S.band)) + " " + t.mbps)) + (all ? (lang === "zh" ? "" : " ") + t.all3(counted().length) : ""), 1); }
  if (!a.won && a.mine.snap) { const f = el("div", "two"), G = [["before", a.mine], ["after", a.top]].map(([w, at]) => { const hits = crossings(eng.ids, eng.nx, eng.ny, eng.dx, at.at, r1.at).map((h) => ({ ...h, m: h.id === 6 ? "metal" : P.WALL_BY_ID[h.id] })), d = Math.max(.3, Math.hypot(at.at[0] - r1.at[0], at.at[1] - r1.at[1])); return { w, at, hits, d, loss: 20 * Math.log10(d) + hits.reduce((q, h) => q + (h.m === "metal" ? 60 : -10 * Math.log10(share(h.m, S.band))), 0) }; }), odd = G[1].loss > G[0].loss - 1;
    for (const o of G) { const g = el("figure"), straight = !(odd && o.w === "after"); g.append(whyPrint(api, o.at.snap, o.at.at, r1, straight ? o.hits : null, portrait ? 84 : 150)); const cap = el("figcaption"), cnt = {}; o.hits.forEach((h) => cnt[h.m] = (cnt[h.m] || 0) + 1); const list = ["metal", "concrete", "brick", "drywall", "glass", "door"].filter((m) => cnt[m]).map((m) => t.crosses(cnt[m], m)); cap.append(el("b", "", t[o.w]), document.createTextNode(straight ? t.dist(o.d.toFixed(1)) + (list.length ? t.inway(join(list)) : t.nothing) : t.dist(o.d.toFixed(1)) + (lang === "zh" ? t.bounce : t.bounce.toLowerCase()))); g.append(cap); f.append(g); } X.append(f); }
  if (!a.won) { const p = el("p", "fine", t.pct(a.pct)); X.append(p); }
  if (S.stage === 0) A.append(btn("solid", t.why, () => go(1), "why")); A.append(btn(S.stage === 0 ? "line" : "solid", t.save, keep, "keep"));
  const row = el("div", "row"); if (!a.won) row.append(btn("text", a.at === "best" ? t.backYou : t.toBest, () => { const to = a.at === "best" ? a.you : a.best; a.at = a.at === "best" ? "you" : "best"; glideTo(to); panel(); }, "swap")); row.append(btn("text", t.again, search, "best")); A.append(row); if (S.stage === 6) { A.append(btn("text", t.edit, () => editor.open(), "edit")); homesGrid($("more")); }
  readout();
}
function freeLine() { const a = S.answer, k = S.vals.length ? weakestOf(S, S.vals) : -1; if (!a || k < 0) return; const m = P.mbps(S.vals[k], S.band), q = Math.round(100 * m / Math.max(a.mB, .1)), n = roomName(S.rooms[k]); $("ask").textContent = q >= 100 ? t.won : t.freeH; say(t.freeT(lang === "zh" && /\d$/.test(n) ? n + " " : n, t.bars(rb(k)), q < 1 ? "<1" : Math.min(q, 120)), 1); }
function goalCheck() { // the small game: every room at 3 bars, by hand. The words always follow the live numbers, once things are at rest
  if (S.searching || S.mode !== "play" || !free() || drag || S.glide || !S.vals.length || !ready() || eng.n < S.settledAt - 900) return; const c = counted(), all = c.length > 0 && c.every((r) => rb(r.index) >= 3);
  if (S.answer) { if (S.answer.at === "free") freeLine(); return; } const did = all && !!S.moves; if (did !== !!S.did || all !== !!S.allOk) { S.did = did; S.allOk = all; panel(); }
}
function readout() { // the live line: the weakest room
  const R = $("read"); if (!S.vals.length || S.searching || S.mode === "edit") { if (S.mode === "edit" || S.searching) R.innerHTML = ""; return; } if (!ready()) { const h = `<small>${t.weakest}</small><div class="big"><span class="wait">${t.arriving}</span></div><div class="sub"><span>&nbsp;</span></div><div class="sub prog"><span>&nbsp;</span></div>`; if (R._h !== h || !R.firstChild) { R.innerHTML = h; R._h = h; } return; }
  const k = weakestOf(S, S.vals); if (k < 0) { R.innerHTML = ""; return; } const n = rb(k), m = P.mbps(S.vals[k], S.band), c = counted(), ok = c.filter((r) => rb(r.index) >= 3).length, a = S.answer, gr = P.grade(m);
  const live = a && !a.won && a.at === "free" ? Math.round(100 * m / Math.max(a.mB, .1)) : 0, lt = (x) => x.replace("<", "&lt;");
  const html = `<small>${t.weakest}</small><div class="big"><span>${roomName(S.rooms[k])}</span><em class="${gr < 2 ? "low" : ""}">${barsSVG(n)}${t.bars(n)}</em></div><div class="sub"><span>${t.grades[gr]}</span><b>${lt(fmt(m))} ${t.mbps}</b></div><div class="sub prog"><span>${t.goal(ok, c.length)}</span>${live ? `<b>${live >= 97 ? t.found : t.live(live)}</b>` : ""}</div>`;
  if (R._h !== html || !R.firstChild) { R.innerHTML = html; R._h = html; }
}
function homesGrid(X) {
  const g = el("div", "homes"), B = best(), mine = homes(), cur = S.planId === "custom" && !S.mineId ? [{ id: null }] : [];
  const list = ["concrete", "railroad", "drywall", "onebed", ...mine.map((m) => "m:" + m.id), ...cur.map(() => "m:"), "own"], up = () => { if (portrait) scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" }); };
  for (const id of list) { const my = id.startsWith("m:"), on = my ? S.planId === "custom" && (S.mineId || "") === id.slice(2) : id === S.planId, pos = mine.findIndex((m) => "m:" + m.id === id);
    const b = btn("", "", () => { if (id === "own") { loadPlan("own"); S.planId = "custom"; S.mineId = null; editor.open(true); } else if (my) { if (!on && loadMine(id.slice(2))) { S.view = whole(); applyPlan(true); words(); layout(); saveHash(); } } else loadPlan(id); up(); }); b.dataset.h = my ? "custom" : id; b.setAttribute("aria-pressed", on);
    const c = el("canvas"); c.width = 320; c.height = 220; const q = c.getContext("2d"); q.fillStyle = "#0b2a58"; q.fillRect(0, 0, 320, 220); let pl = on ? S.plan : PLANS[id]; if (my && !on) { try { pl = decodePlan(mine[pos].w); } catch { pl = null; } }
    if (id === "own") { q.strokeStyle = PAPER; q.lineWidth = 4; q.setLineDash([9, 7]); q.strokeRect(40, 32, 240, 156); q.setLineDash([]); q.beginPath(); q.moveTo(136, 110); q.lineTo(184, 110); q.moveTo(160, 86); q.lineTo(160, 134); q.stroke(); }
    else if (pl) { const z = 320 / (P.W0 * (pl.size || 1)); q.fillStyle = PAPER; for (const s of pl.walls) { const [a, e, d, f] = wallRect(s); q.fillRect(a * z, e * z, Math.max(3, (d - a) * z), Math.max(3, (f - e) * z)); } q.fillStyle = "#0b2a58"; for (const f of pl.feats) { const [a, e, d, h] = gapRect(f, .2); if (f.k !== "win") q.fillRect(a * z, e * z, (d - a) * z, (h - e) * z); } }
    const rec = B[id + "|" + S.band]; b.append(c); if (rec && !my && id !== "own") b.append(el("i", "", rec + "%")); b.append(document.createTextNode(my ? t.plans.custom + (mine.length + cur.length > 1 ? " " + (pos < 0 ? mine.length + 1 : pos + 1) : "") : t.plans[id])); g.append(b); }
  X.append(g);
}
function strip() {
  const F = $("strip"); F.innerHTML = ""; const L = el("div", "row"), R = el("div", "row"); if (S.mode !== "edit") {
    if (free()) { const s = el("span", "seg"); s.setAttribute("role", "group"); s.setAttribute("aria-label", t.band); for (const b of ["5", "2.4"]) { const q = btn("", b === "5" ? t.b5 : t.b24, () => setBand(b)); q.dataset.b = b; q.setAttribute("aria-pressed", S.band === b); s.append(q); } L.append(s); }
    R.append(btn("", t.reset, reset, "reset")); R.append(btn("", t.link, copyLink, "link")); if (free()) R.append(btn("", t.save, keep, "save")); }
  R.append(btn("", t.how, about, "how")); F.append(L, R);
}
function setBand(b) { if (S.searching || b === S.band) return; S.band = b; S.did = false; S.bornAt = 0; S.held = []; if (free()) S.answer = null; if (eng) { eng.setBand(b); eng.reset(); eng.setPlan(eng.ids); wake(); } if (S.sc) S.sc.held = 0; words(); pencil(); saveHash(); }
function reset() { if (S.searching) return; if (S.sc) { enterScene(S.stage); } else { const id = S.planId; if (id !== "custom") { S.plan = clone(PLANS[id]); S.router = [...PLANS[id].router]; S.phone = [...PLANS[id].phone]; } else { S.router = [...(middleOf() || PLANS.own.router)]; } S.answer = null; S.sent = 0; S.view = whole(); } S.did = false; S.moves = 0; applyPlan(true); words(); layout(); saveHash(); }
const middleOf = () => S.rooms.length ? S.rooms[0].at : null;
function facts() { const F = $("facts"); F.innerHTML = ""; if (!eng || !ready()) return; F.setAttribute("aria-label", t.stateL); if (!S.vals.length) return; S.rooms.forEach((r, i) => F.append(el("li", "", `${roomName(r)}: ${t.bars(P.bars(S.vals[i]))}, ${speed(S.vals[i])}`))); }

// ---------- the panels of the five experiments
function scenePanel() {
  const X = $("extra"), R = $("read"), s = S.sc; X.innerHTML = ""; R.innerHTML = ""; R._h = "";
  if (S.stage === 1) { const d = el("div", "mat"); d.append(el("small", "", t.through)); for (const m of MATS) { const on = s.tried.includes(m), row = el("div", s.plan.walls[0].m === m ? "on" : ""), sh = share(m, "5"); row.append(el("span", "", t.mats[m]), el("b", "", on ? t.of1000(in1000(sh)) : "")); const u = el("u"); u.style.backgroundSize = (on ? Math.max(.5, sh * 100) : 0) + "% 100%"; row.append(u); d.append(row); } X.append(d); }
  if (S.stage === 4) { const c = el("canvas"); c.id = "trace"; const l = el("div", "tl"); l.innerHTML = `<span>${t.within}</span><b id="ratio"></b>`; const bx = el("div", "tracebox"); bx.append(c, el("small", "hi", t.here), el("small", "lo", t.there)); X.append(bx, l); drawTrace(); }
  if (S.stage === 5) { const g = el("div", "seg wide"); for (const b of ["5", "2.4"]) { const q = btn("", b === "5" ? t.b5 : t.b24, () => setBand(b)); q.dataset.b = b; q.setAttribute("aria-pressed", S.band === b); g.append(q); } X.append(g); const d = el("div", "mat"); d.id = "cmp"; d.style.marginTop = "18px"; X.append(d); compare(); }
  phoneLine();
}
function phoneLine() { if (!S.sc || S.stage === 5) return; const d = S.stage === 4 ? S.phoneDb : S.areaDb; if (d == null) return; const n = P.bars(d), html = `<small>${t.phoneGets}</small><div class="big"><em class="${n < 2 ? "low" : ""}">${barsSVG(n)}${t.bars(n)}</em><span>${speed(d).replace("<", "&lt;")}</span></div>`; const R = $("read"); if (R._h !== html) { R.innerHTML = html; R._h = html; } }
function compare() { const d = $("cmp"); if (!d) return; d.innerHTML = ""; const s = S.sc; for (const key of ["living", "bed1"]) { const i = S.rooms.findIndex((r) => r.key === key); if (i < 0) continue; const head = el("small", "", t.rooms[key]); head.style.marginTop = "4px"; d.append(head); for (const b of ["5", "2.4"]) { const v = s.seen[b] && s.seen[b][i], row = el("div", S.band === b ? "on" : ""); row.append(el("span", "", b === "5" ? t.b5 : t.b24), el("b", "", v != null ? fmt(P.mbps(v, b)) + " " + t.mbps : "")); const u = el("u"); u.style.backgroundSize = (v != null ? Math.max(.6, P.mbps(v, b) / 7.2) : 0) + "% 100%"; row.append(u); d.append(row); } } }
function drawTrace() {
  const c = $("trace"); if (!c) return; const w = Math.round(c.clientWidth * dpr) || 300, h = Math.round((c.clientHeight || 86) * dpr); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } const g = c.getContext("2d"), tr = S.sc.trace, col = css("--ink"), N = 150; g.clearRect(0, 0, w, h); const Y = (d) => h - 4 * dpr - Math.max(0, Math.min(1, (d + 90) / 30)) * (h - 10 * dpr);
  g.strokeStyle = css("--hair"); g.lineWidth = 1; g.beginPath(); for (let k = 0; k < 3; k++) { const y = Math.round(h * (k + .5) / 3) + .5; g.moveTo(0, y); g.lineTo(w, y); } g.stroke();
  const L = tr.slice(-N); if (L.length > 1) { g.strokeStyle = col; g.lineWidth = 1.5 * dpr; g.lineJoin = "round"; g.beginPath(); L.forEach((q, i) => { const x = (w - 8 * dpr) * i / (N - 1); i ? g.lineTo(x, Y(q.d)) : g.moveTo(x, Y(q.d)); }); g.stroke(); const e = L.length - 1; g.fillStyle = css("--red"); g.beginPath(); g.arc((w - 8 * dpr) * e / (N - 1), Y(L[e].d), 3.4 * dpr, 0, 7); g.fill(); }
  const r = $("ratio"), p = S.sc.pair; if (r) r.textContent = p && p.r > 3 ? `${(p.cm).toFixed(1)} cm · ${t.times(p.x)}` : "";
}
function win(v) { const s = S.sc; s.say = v; if (s.won) { const tx = t.aft[S.stage](v); if ($("say").textContent !== tx) say(tx, 1); return; } s.won = true; S.done.add(S.stage); store.set("done", [...S.done].join(",")); words(); pencil(); }
function sceneTick(dt) { // called with every reading
  const s = S.sc; if (!s) return; const st = S.stage, settled = eng.n > 2600;
  if (st === 1 && s.tried.length === 3 && !drag) { s.held += dt; if (s.held > 900) win({ c: in1000(share("concrete", "5")), d: in1000(share("drywall", "5")), x: farther("concrete", "5") }); }
  if (st === 2 || st === 3) { if (s.base == null) { if (settled) s.base = S.areaDb; } else { const gain = (S.areaDb - s.base) * (st === 2 ? 1 : -1), n0 = P.bars(s.base), n1 = P.bars(S.areaDb); if (gain > 9 && (st === 2 ? n1 > n0 : n1 < n0)) { s.held += dt; if (s.held > 700 && !drag) win({ a: t.bars(n0), b: t.bars(n1), a0: n0, b0: n1 }); } else s.held = 0; } }
  if (st === 4 && settled && S.phoneDb != null) { const q = { x: S.readAt[0], y: S.readAt[1], d: S.phoneDb }, l = s.trace[s.trace.length - 1];
    if (!l || Math.hypot(l.x - q.x, l.y - q.y) > .0015) { s.trace.push(q); if (s.trace.length > 600) s.trace.shift(); let b = s.pair; for (const o of s.trace) { const D = Math.hypot(o.x - q.x, o.y - q.y); if (D < HAND && D > .02) { const r = Math.abs(o.d - q.d); if (!b || r > b.r + .2) { const hi = o.d > q.d ? o : q, lo = hi === o ? q : o; b = { r, hi, lo, cm: D * 100, x: Math.round(10 ** (r / 10)) }; } } } if (b !== s.pair) { s.pair = b; pencil(); } drawTrace(); }
    if (s.pair && s.pair.r > 10 && P.bars(s.pair.lo.d) < P.bars(s.pair.hi.d) && P.bars(s.pair.lo.d) <= 1 && !drag) win({ cm: s.pair.cm.toFixed(1), hi: t.bars(P.bars(s.pair.hi.d)), lo: t.bars(P.bars(s.pair.lo.d)) }); }
  if (st === 5 && S.vals.length) { s.held += dt; if (eng.n > 3000 && s.held > 600) { const first = !s.seen[S.band]; s.seen[S.band] = [...S.vals]; if (first) compare(); if (s.seen["5"] && s.seen["2.4"]) { const i = S.rooms.findIndex((r) => r.key === "bed1"); win({ x: Math.round(P.mbps(-30, "5") / P.mbps(-30, "2.4")), b5: fmt(P.mbps(s.seen["5"][i], "5")) + " " + t.mbps, b24: fmt(P.mbps(s.seen["2.4"][i], "2.4")) + " " + t.mbps }); } } }
  phoneLine();
}

// ---------- layout
const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : mqD.matches;
function layout() {
  const was = portrait; portrait = mqP.matches; const r = $("print").getBoundingClientRect(); box = { w: r.width, h: r.height }; dpr = Math.min(devicePixelRatio || 1, portrait ? 2.5 : 2); const v = S.view || whole();
  V = { ...v, k: box.w / (portrait ? v.h : v.w), p: portrait }; markScale = 1; const w = Math.round(box.w * dpr), h = Math.round(box.h * dpr);
  for (const c of [$("gl"), $("ink")]) if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  $("pencil").setAttribute("viewBox", `0 0 ${box.w} ${box.h}`); if (eng) { eng.portrait = portrait; eng.view = v; eng.px = dpr; eng.paper = isDark() ? 0 : 1; }
  if (was !== portrait) words(); $("unzoom").hidden = !(S.view && !S.sc && S.view.w < P.W * .98); ink(); place(true); pencil(); if (S.stage === 4) drawTrace();
}
function ink(preview) {
  const c = $("ink"), g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); if (!S.plan) return; const v = { ...V, k: V.k * dpr }; let plan = S.plan; if (preview) plan = preview;
  if (S.mode === "edit") { g.fillStyle = "rgba(243,245,243,.3)"; const st = .5; for (let x = st; x < P.W; x += st) for (let y = st; y < P.H; y += st) { const [X, Y] = toView(x, y, v); g.fillRect(X - .75 * dpr, Y - .75 * dpr, 1.5 * dpr, 1.5 * dpr); } }
  if (S.sc && S.stage !== 5) { const q = box.w * dpr * .012; g.save(); g.beginPath(); g.rect(q, q, c.width - 2 * q, c.height - 2 * q); g.clip(); }
  if (S.mode === "edit" && editor) editor.ghost(g, v, dpr);
  drawInk(g, plan, v, { t, band: S.band, font: css("--f"), sizes: S.mode === "edit" && editor ? editor.sizes() : null, scale: (S.stage !== 4 || (!portrait && box.h > 340)), dpr, small: portrait || box.h < 340, zoomed: portrait || (!!S.sc && S.stage < 5 && box.w < 700) || box.h < 340, low: box.h < 340, sel: S.sel, px: Math.max(.85, Math.min(2.6, V.k / 95)) * dpr });
  if (S.sc && S.stage !== 5) g.restore();
}
let tags = [];
function makeTags() {
  const L = $("labels"); L.innerHTML = ""; tags = S.rooms.map((r) => { const e = el("div", "tag" + (r.counted ? "" : " dim")); e.append(el("span", "", roomName(r)), el("b")); L.append(e); return e; });
  tags.extra = null; if (S.planId === "concrete" && S.mode !== "edit") { const e = el("div", "tag small", t.cabinet); e.dataset.at = "3.72,1.42"; L.append(e); tags.extra = e; }
  if (S.vals.length) tagNumbers(); place(true);
}
function tagNumbers() { const k = weakestOf(S, S.vals), rd = ready(); S.rooms.forEach((r, i) => { const e = tags[i]; if (!e || S.vals[i] == null) return; const n = rb(i), v = rd ? n + "|" + fmt(P.mbps(S.vals[i], S.band)) : "-"; if (e._v !== v) { e.lastChild.innerHTML = rd ? `${barsSVG(n)}<span>${fmt(P.mbps(S.vals[i], S.band)).replace("<", "&lt;")}</span>` : `${barsSVG(0)}<span>&nbsp;</span>`; e._v = v; } e.classList.toggle("weak", rd && i === k && free()); }); }
// where a room's name goes: near the middle, clear of walls, door swings, the phone and the router
function spotFor(r, i, w, h) {
  const G = rg(), k = V.k, hw = (portrait ? h : w) / 2 / k + .05, hh = (portrait ? w : h) / 2 / k + .04, in_ = (x, y) => S.map[Math.floor(y / G) * Math.round(P.W / G) + Math.floor(x / G)] === i; let best = null, bd = 1e9;
  for (let ox = 0; ox <= 2.2; ox += .2) for (const sx of ox ? [1, -1] : [1]) for (let oy = 0; oy <= 1.8; oy += .2) for (const sy of oy ? [1, -1] : [1]) { const x = r.at[0] + ox * sx, y = r.at[1] + oy * sy, d = Math.hypot(ox, oy); if (d >= bd) continue; if (![[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]].every(([a, b]) => in_(x + a * hw, y + b * hh))) continue;
    const hitR = ([X, Y], rx, ry) => Math.abs(X - x) < hw + rx && Math.abs(Y - y) < hh + ry; if (hitR(S.phone, (portrait ? 24 : 18) / k, (portrait ? 18 : 24) / k) || hitR(S.router, 27 / k, 27 / k)) continue; const [a, b] = toView(...S.phone, V), sgn = a > box.w * .72 ? -1 : 1, mid = toPlan(a + sgn * 54, b, V); if (hitR(mid, (portrait ? 12 : 42) / k, (portrait ? 42 : 12) / k)) continue;
    if (S.plan.feats.some((f) => f.k === "door" && (() => { const s = f.s || 1, cx = f.o === "h" ? f.x : f.x + s * f.w / 2, cy = f.o === "h" ? f.y + s * f.w / 2 : f.y; return hitR([cx, cy], f.w / 2, f.w / 2); })())) continue; bd = d; best = [x, y]; }
  return best;
}
function place(all) {
  if (!S.router || !box.w) return; const at = (e, x, y, w, h) => { e.style.transform = `translate(${(x - w / 2).toFixed(1)}px,${(y - h / 2).toFixed(1)}px)`; }, rs = $("router").offsetWidth || (portrait ? 42 : 46);
  const [x, y] = toView(...S.router, V); at($("router"), x, y, rs, rs * 1.32); $("router").classList.toggle("flip", x > box.w * .62);
  const ht = S.sc && S.stage < 5 && SCENES[S.stage].main !== "router" ? (S.stage === 4 ? S.phone : thingAt(SCENES[S.stage].main + "0")) : S.router, [hx, hy] = toView(...ht, V); $("cue").style.transform = `translate(${hx.toFixed(1)}px,${hy.toFixed(1)}px)`; $("cue").classList.toggle("flip", hx > box.w * .62); $("cue").classList.toggle("low", S.stage === 1 && portrait);
  const [a, b] = toView(...S.phone, V), shown = (X, Y) => X > -4 && Y > -4 && X < box.w + 4 && Y < box.h + 4 ? "" : "none"; $("router").style.display = shown(x, y); $("phone").style.display = shown(a, b); at($("phone"), a, b - (S.stage === 4 ? 40 : 0), $("phone").offsetWidth || 28, $("phone").offsetHeight || 44); $("phone").classList.toggle("flip", a > box.w * .72);
  const Lb = eng ? eng.labels : new Float32Array(48); if (all) Lb.fill(0);
  S.rooms.forEach((r, i) => { const e = tags[i]; if (!e) return; if (all) { e._w = e.offsetWidth; e._h = e.offsetHeight; if (!drag && !S.glide && S.mode === "play") e._at = e._w ? spotFor(r, i, e._w, e._h) : null; if (S.mode !== "play") e._at = null; } const [X, Y] = toView(...(e._at || r.at), V); if (all) { e.style.transform = `translate(${X.toFixed(1)}px,${Y.toFixed(1)}px) translate(-50%,-50%)`; }
    const near = (px, py, w, h) => Math.abs(px - X) < e._w / 2 + w && Math.abs(py - Y) < e._h / 2 + h, hush = S.mode !== "edit" && !S.searching && (near(x, y, 22, 24) || near(a, b, 16, 22)); e.classList.toggle("hush", hush); if (S.mode !== "edit") e.style.visibility = !r.counted && e._w && !e._at && !S.searching ? "hidden" : ""; else e.style.visibility = ""; if (i < 12) Lb.set(hush || !e._w || e.style.visibility ? [0, 0, 0, 0] : [X * dpr, Y * dpr, e._w / 2 * dpr, e._h / 2 * dpr], i * 4); });
  if (tags.extra) { const [X, Y] = toView(...tags.extra.dataset.at.split(",").map(Number), V); tags.extra.style.transform = `translate(${X}px,${Y}px) translate(-50%,-50%)`; tags.extra.classList.toggle("hush", Math.hypot(X - x, Y - y) < 40); if (S.rooms.length < 12) Lb.set(tags.extra.classList.contains("hush") ? [0, 0, 0, 0] : [X * dpr, Y * dpr, tags.extra.offsetWidth / 2 * dpr, 5 * dpr], 11 * 4); }
  document.querySelectorAll(".thing").forEach((e) => { const q = thingAt(e.dataset.k); if (q) { const [X, Y] = toView(...q, V); e.style.transform = `translate(${X}px,${Y}px)`; } });
  editor && editor.place();
}
function pencil(animate) { // the red pencil: the answer's circle, the way there; the two spots of experiment 4
  const v = $("pencil"); v.innerHTML = ""; if (S.mode === "edit") return; const a = S.answer;
  if (a && free()) { const c = circlePath(toView(...a.best, V), portrait ? 36 : 42), ln = a.won ? "" : arrowPath(toView(...a.you, V), toView(...a.best, V)); v.innerHTML = `<path d="${c}" stroke-width="3" pathLength="1"/>` + (ln ? `<path d="${ln}" stroke-width="2.2" pathLength="1"/>` : ""); if (animate && !calm) [...v.children].forEach((p, i) => p.animate([{ strokeDasharray: "1 1", strokeDashoffset: 1 }, { strokeDasharray: "1 1", strokeDashoffset: 0 }], { duration: i ? 700 : 900, delay: i ? 0 : 600, fill: "backwards", easing: "ease-in-out" })); }
  if (S.stage === 4 && S.sc) { const k = V.k, w = HAND * k, X = (portrait ? box.w * .4 : box.w / 2) - w / 2, Y = portrait ? box.h * .86 : box.h - 30; v.innerHTML += `<path d="M${X} ${Y}h${w}M${X} ${Y - 5}v10M${X + w} ${Y - 5}v10" stroke-width="1.4" style="stroke:#f3f5f3"/><text x="${X + w / 2}" y="${Y - 9}" text-anchor="middle" fill="#f3f5f3" style="font:${portrait ? 11 : 13}px var(--f);text-shadow:0 0 3px #04122c,0 0 6px #04122c,0 0 9px #04122c">${t.hand}</text>`;
    const p = S.sc.pair; { const [x, y] = toView(...S.phone, V); v.innerHTML += `<path id="cross" d="M${x - 7} ${y}h14M${x} ${y - 7}v14" stroke-width="1.8" style="stroke:#fff"/><circle cx="${x}" cy="${y}" r="3.2" fill="#f0483c"/>`; } if (p && p.r > 6 && S.sc.trace.length > 3) for (const [q, f] of [[p.hi, "#f0483c"], [p.lo, "none"]]) { const [x, y] = toView(q.x, q.y, V); v.innerHTML += `<circle cx="${x}" cy="${y}" r="6" fill="${f}" stroke="#f0483c" stroke-width="2"/>`; } }
}

// ---------- things one can drag besides the router and the phone
const thingList = () => S.mode === "edit" ? [] : S.sc ? (SCENES[S.stage].main === "box" ? ["box0"] : SCENES[S.stage].main === "mirror" ? ["mirror0"] : SCENES[S.stage].main === "wall" ? ["wall0"] : []) : S.stage === 6 ? [...S.plan.boxes.map((_, i) => "box" + i), ...S.plan.mirrors.map((_, i) => "mirror" + i)] : S.plan.boxes.map((_, i) => "box" + i);
function thingAt(k) { const i = +k.slice(-1); if (k.startsWith("box")) { const b = S.plan.boxes[i]; return b && [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; } if (k.startsWith("mirror")) { const m = S.plan.mirrors[i]; return m && [m[0], m[1]]; } return [5.6, 3.84]; }
function things() { const L = $("things"); L.innerHTML = ""; for (const k of thingList()) { const b = btn("thing", "", () => { }); b.dataset.k = k; b.setAttribute("aria-label", t.things[k.replace(/\d/, "")]); b.onkeydown = (e) => { if (k === "wall0" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); return tapWall(); } const d = arrow(e); if (!d) return; e.preventDefault(); const q = thingAt(k); moveThing(k, [q[0] + d[0], q[1] + d[1]]); saveHash(); }; L.append(b); } place(false); }
const arrow = (e) => { const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d || S.searching) return null; const st = (S.stage === 4 ? .006 : .12) * (e.shiftKey ? .25 : 1), v = portrait ? [d[1], -d[0]] : d; return [v[0] * st, v[1] * st]; };
function hitThing(p, tol) { for (const k of thingList()) { if (k.startsWith("box")) { const b = S.plan.boxes[+k.slice(-1)]; if (p[0] > b[0] - tol && p[0] < b[2] + tol && p[1] > b[1] - tol && p[1] < b[3] + tol) return k; } if (k.startsWith("mirror")) { const [a, b] = mirrorEnds(S.plan.mirrors[+k.slice(-1)]), L = Math.hypot(b[0] - a[0], b[1] - a[1]), u = Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / L / L)); if (Math.hypot(p[0] - a[0] - u * (b[0] - a[0]), p[1] - a[1] - u * (b[1] - a[1])) < tol * 1.2) return k; } } return null; }
let baseIds = null;
function moveThing(k, [x, y]) { // only a small rectangle of the wall map changes
  const i = +k.slice(-1), v = S.view; x = Math.max(v.x + .2, Math.min(v.x + v.w - .2, x)); y = Math.max(v.y + .2, Math.min(v.y + v.h - .2, y)); let r0, r1; const bb = (m) => { const R = m[2] / 2 + .1; return [m[0] - R, m[1] - R, m[0] + R, m[1] + R]; };
  if (k.startsWith("box")) { const b = S.plan.boxes[i], w = (b[2] - b[0]) / 2, h = (b[3] - b[1]) / 2, on = (q) => Math.abs(q[0] - x) < w + .14 && Math.abs(q[1] - y) < h + .14; if (on(S.router) || on(S.phone)) return; r0 = [...b]; S.plan.boxes[i] = [x - w, y - h, x + w, y + h, b[4]]; r1 = S.plan.boxes[i]; } else { const m = S.plan.mirrors[i]; r0 = bb(m); m[0] = x; m[1] = y; r1 = bb(m); }
  if (!S.sc && S.planId !== "custom") { S.planId = "custom"; S.answer = null; pencil(); panel(); } else if (S.answer) { S.answer = null; pencil(); panel(); }
  if (!eng) return; const ids = raster(S.plan, eng.nx, eng.ny, eng.dx); eng.patch(ids, [Math.min(r0[0], r1[0]), Math.min(r0[1], r1[1]), Math.max(r0[2], r1[2]), Math.max(r0[3], r1[3])]); wake(); ink(); place(false); S.moved = k;
}
function tapWall() { const w = S.plan.walls[0], s = S.sc; w.m = MATS[(MATS.indexOf(w.m) + 1) % MATS.length]; if (!s.tried.includes(w.m)) s.tried.push(w.m); s.held = 0; touched(); eng && eng.setPlan(raster(S.plan, eng.nx, eng.ny, eng.dx)); wake(); ink(); scenePanel(); saveHash(); }

// ---------- the wave loop
const SETTLE = 3400; let last = 0, slow = 0, frames = 0, readAt = 0, tickAt = 0, numAt = 0, factAt = 0, stuck = 0; export const stats = { frames: 0, t0: performance.now() };
function wake() { if (eng) S.settledAt = eng.n + SETTLE; }
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(100, now - last || 16); last = now; frames++; stats.frames++; if (document.hidden || !eng || eng.lost) return;
  if (!S.searching) {
    slow = slow * .9 + dt * .1; const cap = Math.max(4, Math.round(Math.min(40, dt) * (calm ? 2 : .92))); // as many wave steps per frame as this device can afford
    if (slow > 26) S.stepsPF = Math.max(4, S.stepsPF - 1); else if (frames % 6 === 0 && S.stepsPF < cap) S.stepsPF++; if (S.stepsPF > cap + 2) S.stepsPF = cap;
    stuck = S.stepsPF <= 4 && slow > 34 ? stuck + 1 : 0; if (stuck > 90 && eng.tier === 0) { stuck = 0; lighter(); }
    eng.src = S.router; if (eng.n < S.settledAt) eng.step(S.stepsPF); eng.vis = (eng.vis + dt / 1000 * VIS_HZ * 2 * Math.PI) % (2 * Math.PI); eng.flash *= Math.pow(.02, dt / 1000); eng.observe(); eng.draw($("gl").width, $("gl").height);
    if (now - readAt > (S.stage === 4 ? 24 : 90)) { if (eng.requestRead(...S.phone, S.stage === 4 ? 0 : 2)) { readAt = now; } }
    const r = eng.pollRead(); if (r) got(r, now);
  }
  if (S.glide) glide(now);
}
function got(r, now) {
  if (S.rooms.length) { const lv = roomLevels(S, eng, r.p, S.router); S.vals = S.vals.length === lv.length ? S.vals.map((v, i) => v + (lv[i] - v) * .5) : lv; }
  S.readAt = r.at; const pd = eng.p1 + 10 * Math.log10(Math.max(r.phone, 1e-12)); S.phoneDb = S.phoneDb == null || S.stage === 4 ? pd : S.phoneDb + (pd - S.phoneDb) * .6;
  const i = Math.floor(S.phone[0] / P.W * eng.rx), j = Math.floor(S.phone[1] / P.H * eng.ry); let s = 0, n = 0; for (let b = -1; b < 2; b++) for (let a = -1; a < 2; a++) { const I = i + a, J = j + b; if (I < 0 || J < 0 || I >= eng.rx || J >= eng.ry) continue; s += Math.max(r.p[J * eng.rx + I], 1e-12); n++; } const ad = eng.p1 + 10 * Math.log10(s / n); S.areaDb = S.areaDb == null ? ad : S.areaDb + (ad - S.areaDb) * .5;
  sceneTick(Math.min(200, now - tickAt)); tickAt = now; if (now - numAt > 130) { numAt = now; numbers(); } if (now - factAt > 2500) { factAt = now; facts(); place(true); }
}
function numbers() { const d = S.sc && S.stage !== 4 ? S.areaDb : S.phoneDb; if (d != null) { $("pv").textContent = (S.stage === 4 && document.body.classList.contains("quiet")) || !S.sc ? speed(d) : ""; $("bars").setAttribute("class", "s" + P.bars(d)); } if (S.vals.length) { tagNumbers(); if (free() && S.mode === "play") { readout(); goalCheck(); } } }
function makeEngine(tier) { const e = new Engine($("gl"), tier, { half: qs.get("half") === "1" }); return e; }
function lighter() { try { const old = eng; eng = makeEngine(1); old.dispose && old.dispose(); applyPlan(true); layout(); } catch (e) { console.warn(String(e)); } }

// ---------- fingers
let drag = null; const ptrs = new Map(); let pinch = null;
const pos = (e) => { const r = $("print").getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }, local = (e) => toPlan(...pos(e), V);
const inView = ([x, y]) => { const v = S.view, m = Math.min(.35, v.w * .04); return [Math.max(v.x + m, Math.min(v.x + v.w - m, x)), Math.max(v.y + m, Math.min(v.y + v.h - m, y))]; };
function doorAt(p, tol) { let b = null, bd = tol; for (const d of S.plan.feats) { if (d.k !== "door") continue; const dd = Math.max(Math.abs(p[0] - d.x) - (d.o === "h" ? d.w / 2 : 0), Math.abs(p[1] - d.y) - (d.o === "v" ? d.w / 2 : 0), 0); if (dd < bd) { bd = dd; b = d; } } return b; }
// is the finger on something that can be dragged?
function grip(p) { const px = (q) => Math.hypot(p[0] - q[0], p[1] - q[1]) * V.k; if (S.mode === "edit") return true; if (S.sc) { const m = SCENES[S.stage].main; if (m === "phone") return px(S.phone) < 90; if (px(S.phone) < 36 && m !== "wall") return true; if (m === "router") return px(S.router) < 48; return m === "box" || m === "mirror" ? px(thingAt(m + "0")) < 64 || !!hitThing(p, 22 / V.k) : false; } return px(S.router) < 44 || px(S.phone) < 34 || !!hitThing(p, 14 / V.k); }
const canZoom = () => !S.sc && !S.searching;
function startPinch() { const [a, b] = [...ptrs.values()]; if (drag && performance.now() - drag.t < 400 && drag.what === "router" && drag.from) { S.router = drag.from; wake(); } drag = null; editor.cancel(); const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), w: S.view.w, at: toPlan(...mid, V), photo: editor.photoPinch() }; }
function zoomTo(w, at, X, Y) { const nw = Math.max(P.W / 5, Math.min(P.W, w)), nh = nw * P.H / P.W, k = box.w / (portrait ? nh : nw), v = { w: nw, h: nh }; if (portrait) { v.x = at[0] - Y / k; v.y = at[1] - (nh - X / k); } else { v.x = at[0] - X / k; v.y = at[1] - Y / k; } v.x = Math.max(0, Math.min(P.W - nw, v.x)); v.y = Math.max(0, Math.min(P.H - nh, v.y)); S.view = v; layout(); }
function bind() {
  const E = $("print");
  E.addEventListener("pointerdown", (e) => {
    if (S.searching || e.target.closest("#unzoom")) return; e.preventDefault(); try { E.setPointerCapture(e.pointerId); } catch { /* synthetic */ } ptrs.set(e.pointerId, pos(e)); const p = local(e);
    if (ptrs.size === 2 && canZoom()) return startPinch(); if (ptrs.size > 1) return; if (S.mode === "edit") return editor.down(e, p); if (drag) return;
    S.glide = null; const near = (q, px) => Math.hypot(p[0] - q[0], p[1] - q[1]) * V.k < px, dr = Math.hypot(p[0] - S.router[0], p[1] - S.router[1]), dp = Math.hypot(p[0] - S.phone[0], p[1] - S.phone[1]); let what, door = null, off = [0, 0];
    if (S.sc) { what = SCENES[S.stage].main; if (S.stage === 5) what = near(S.phone, 34) && dp < dr ? "phone" : near(S.router, 48) ? "router" : null; else if (near(S.phone, 30) && (S.stage === 2 || S.stage === 3) && !hitThing(p, .1)) what = "phone"; const q = what === "phone" ? S.phone : what === "router" ? S.router : what === "mirror" || what === "box" ? thingAt(what + "0") : p; off = [q[0] - p[0], q[1] - p[1]]; }
    else { const onR = near(S.router, 32), th = !onR && !(near(S.phone, 26)) ? hitThing(p, 12 / V.k) : null; what = near(S.phone, 30) && dp < dr ? "phone" : th ? th : "router"; door = what === "router" && !onR ? doorAt(p, Math.min(.24, 16 / V.k)) : null; const q = what === "phone" ? S.phone : th ? thingAt(th) : onR ? S.router : p; off = [q[0] - p[0], q[1] - p[1]]; }
    const tch = e.pointerType !== "mouse", held = grip(p); if (tch && !held) { if (S.sc && what !== "wall") return; drag = { id: e.pointerId, what: S.sc ? "wall" : "tap", t: performance.now(), x: e.clientX, y: e.clientY, off: [0, 0], door, moved: false, from: [...S.router] }; return; }
    drag = { id: e.pointerId, what, t: performance.now(), x: e.clientX, y: e.clientY, off, door: held ? null : door, moved: false, from: [...S.router] }; if (what === "router" && !door) moveTo(p); E.classList.add("grabbing"); E.classList.toggle("r", what === "router");
  });
  E.addEventListener("pointermove", (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, pos(e)); if (pinch) { const [a, b] = [...ptrs.values()]; if (a && b) { const d = Math.hypot(a[0] - b[0], a[1] - b[1]), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if (pinch.photo) editor.photoZoom(pinch.photo, d / pinch.d, toPlan(...mid, V)); else zoomTo(pinch.w * pinch.d / d, pinch.at, ...mid); } return; }
    if (S.mode === "edit") return editor.move(e, local(e)); if (!drag || e.pointerId !== drag.id) { if (e.pointerType === "mouse" && !drag) hover(e); return; } if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true; if (drag.what === "tap") return; if (drag.door && !drag.moved) return; drag.door = null; if (drag.moved) moveTo(local(e));
  });
  const tl = (c) => { const r = E.getBoundingClientRect(); return toPlan(c.clientX - r.left, c.clientY - r.top, V); };
  for (const n of ["touchstart", "touchmove"]) E.addEventListener(n, (e) => { if (e.target.closest("#unzoom") || !e.cancelable) return; if (e.touches.length > 1 || pinch || (n === "touchmove" ? drag && drag.what !== "tap" && drag.what !== "wall" || S.mode === "edit" : grip(tl(e.touches[0])))) e.preventDefault(); }, { passive: false }); // the page scrolls under a finger that holds nothing
  E.addEventListener("gesturestart", (e) => e.preventDefault());
  const up = (e) => { ptrs.delete(e.pointerId); if (e.type === "pointercancel" && pinch && !ptrs.size) pinch = null; if (pinch) { if (ptrs.size < 2) pinch = null; return; } if (S.mode === "edit") return editor.up(e, local(e)); if (!drag || e.pointerId !== drag.id) return; const D = drag; drag = null; E.classList.remove("grabbing", "r"); if (e.type === "pointerup" && D.what === "wall" && !D.moved) tapWall(); if (D.what === "tap" && !D.door && !D.moved && e.type === "pointerup" && performance.now() - D.t < 600) { const z = inView(local(e)); if (eng) { eng.ramp0 = eng.n; eng.flash = .8; } S.router = z; if (eng) eng.src = z; touched(); wake(); place(false); }
    if (D.door && !D.moved && e.type === "pointerup") { D.door.open = D.door.open ? 0 : 1; if (S.answer) { S.answer = null; panel(); pencil(); } eng && eng.setPlan(raster(S.plan, eng.nx, eng.ny, eng.dx)); wake(); ink(); } if (S.moved && !S.sc) { S.moved = null; roomsNow(); words(); } place(true); saveHash(); };
  E.addEventListener("pointerup", up); E.addEventListener("pointercancel", up);
  E.addEventListener("wheel", (e) => { if (!canZoom() || !(e.ctrlKey || e.metaKey)) return; e.preventDefault(); zoomTo(S.view.w * Math.exp(e.deltaY * .006), local(e), ...pos(e)); }, { passive: false });
  const key = (what) => (e) => { const d = arrow(e); if (!d || (S.sc && S.stage !== 5 && what === "router")) return; e.preventDefault(); S.glide = null; if (what === "phone") { S.phone = inView([S.phone[0] + d[0], S.phone[1] + d[1]]); if (S.stage === 4) pencil(); } else { S.router = inView([S.router[0] + d[0], S.router[1] + d[1]]); touched(); wake(); } place(false); saveHash(); };
  $("router").addEventListener("keydown", key("router")); $("phone").addEventListener("keydown", key("phone"));
  $("unzoom").onclick = () => { S.view = whole(); layout(); };
  $("lang").onclick = () => { lang = lang === "en" ? "zh" : "en"; store.set("lang", lang); words(); layout(); };
  $("theme").onclick = () => { root.dataset.theme = isDark() ? "light" : "dark"; store.set("theme", root.dataset.theme); themed(); };
  mqD.addEventListener("change", themed);
  $("index").onclick = (e) => { const b = e.target.closest("button"); if (b) go(+b.dataset.i); };
  for (const id of ["end", "about"]) $(id).addEventListener("click", (e) => { if (e.target === $(id)) $(id).close(); });
  $("dlClose").onclick = () => $("end").close(); $("abClose").onclick = () => $("about").close(); $("dlLink").onclick = () => copyLink(); $("dlSave").onclick = () => { const a = el("a"); a.href = $("endimg").src; a.download = "wifi-print.png"; document.body.append(a); a.click(); a.remove(); };
  $("dlShare").onclick = async () => { try { const f = new File([S.blob], "wifi-print.png", { type: "image/png" }); await navigator.share({ files: [f], title: t.imgT, url: shareURL(true) }); } catch { /* closed */ } };
  addEventListener("resize", layout); mqP.addEventListener("change", layout); addEventListener("hashchange", () => { if (location.hash === ownHash || S.searching) return; readHash(); applyPlan(true); words(); layout(); });
  addEventListener("keydown", (e) => { if (e.target.closest("input,dialog")) return; if (S.mode === "edit") editor.key(e); });
  document.addEventListener("visibilitychange", () => { last = performance.now(); slow = 16; });
}
function hover(e) { const p = local(e), c = $("print").classList; c.toggle("tap", S.sc ? SCENES[S.stage].main === "wall" && Math.abs(p[0] - 5.6) < .4 : Math.hypot(p[0] - S.router[0], p[1] - S.router[1]) * V.k > 32 && !!doorAt(p, Math.min(.24, 16 / V.k))); }
function themed() { $("theme").textContent = isDark() ? t.light : t.dark; $("tc").content = css("--paper"); layout(); if (S.stage === 4) drawTrace(); }
const quiet = (on) => document.body.classList.toggle("quiet", on);
function touched() { S.moves = (S.moves || 0) + 1; S.touched = true; quiet(true); if (S.sent) { S.sent = 0; panel(); } if (S.answer && S.answer.at !== "free") { S.answer.at = "free"; const b = $("swap"); if (b) b.textContent = t.toBest; freeLine(); } }
function moveTo(p) {
  const w = drag.what, q = [p[0] + drag.off[0], p[1] + drag.off[1]]; if (!w || w === "wall") return;
  if (w === "phone") { S.phone = inView(q); if (S.stage === 4) { touched(); pencil(); } place(false); } else if (w === "router") { const z = inView(q); if (Math.hypot(z[0] - S.router[0], z[1] - S.router[1]) > .6 && eng) { eng.ramp0 = eng.n; eng.flash = .8; } S.router = z; if (eng) eng.src = z; touched(); wake(); place(false); if (S.stage === 5 && S.sc.held >= 0) { S.sc.seen = {}; S.sc.held = 0; S.bornAt = eng.n - 1000; } }
  else { moveThing(/\d$/.test(w) ? w : w + "0", q); touched(); }
}
function glideTo(to) { S.glide = { from: [...S.router], to: [...to], t0: performance.now(), dur: calm ? 1 : 900 }; }
function glide(now) { const G = S.glide, k = Math.min(1, (now - G.t0) / G.dur), e = k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2; S.router = [G.from[0] + (G.to[0] - G.from[0]) * e, G.from[1] + (G.to[1] - G.from[1]) * e]; wake(); place(false); if (k >= 1) { S.glide = null; saveHash(); } }

// ---------- the search
const sleep = () => new Promise((r) => requestAnimationFrame(r)); let per = 30;
async function settle(steps) { // run the waves while still drawing them
  let left = steps, lastT = performance.now(); while (left > 0) { if (S.cancel) throw new Error("stop"); if (document.hidden) { await new Promise((r) => setTimeout(r, 200)); lastT = performance.now(); continue; } const n = Math.min(per, left); eng.step(n); left -= n; eng.vis = (eng.vis + VIS_HZ * .1) % (2 * Math.PI); eng.observe(); eng.draw($("gl").width, $("gl").height); await sleep(); const now = performance.now(), dt = now - lastT; lastT = now; per = dt > 34 ? Math.max(12, per * .8 | 0) : Math.min(160, per * 1.15 + 1 | 0); }
}
export async function search() {
  if (S.searching || !eng || !counted().length) return; S.glide = null; drag = null; S.answer = null; pencil(); const you = [...S.router], view = S.view; S.view = whole(); layout(); S.searching = true; S.cancel = false; quiet(true); S.touched = true; S.sent = 0; $("read").innerHTML = ""; S.sayNow = t.askingP; panel(); strip(); let res = null;
  if (portrait) scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  tags.forEach((e) => e.classList.add("dim")); place(true); $("router").style.visibility = $("phone").style.visibility = "hidden";
  try {
    res = await findBest({ S, eng, settle, onRoom: (room) => { tags.forEach((e) => e.classList.remove("call")); tags[room.index] && tags[room.index].classList.add("call"); $("ask").textContent = t.asking(roomName(room)); }, onCheck: () => { tags.forEach((e) => e.classList.remove("call")); $("router").style.visibility = ""; $("ask").textContent = t.checking; say(""); }, showRouter: (at) => { S.router = at; place(false); }, snap: () => waves(eng, portrait ? 384 : 560, portrait ? 560 : 384, { view: whole(), labels: new Float32Array(48) }) });
  } catch (e) { if (e.message !== "stop" && e.message !== "no rooms") console.error(e); }
  eng.search = 0; S.searching = false; $("router").style.visibility = $("phone").style.visibility = ""; S.router = [...you]; eng.src = S.router; eng.reset(); S.bornAt = 0; wake(); S.view = view;
  if (res) { S.held = []; S.answer = res; res.at = res.won ? "you" : "best"; S.vals = [...res.mine.lv]; const B = best(), id = S.planId + "|" + S.band; if (!(B[id] >= res.pct) && S.planId !== "custom") { B[id] = res.pct; store.set("best", JSON.stringify(B)); } if (S.stage === 0 || S.stage === 6) { S.done.add(S.stage); store.set("done", [...S.done].join(",")); } if (!res.won) { S.view = whole(); glideTo(res.best); } }
  makeTags(); words(); layout(); pencil(true); if (S.goNext != null) { const n = S.goNext; S.goNext = null; go(n); } return res;
}

// ---------- keep and share
const api = { get phoneBars() { return S.phoneDb == null ? 0 : P.bars(S.phoneDb); }, saveMine, S, get eng() { return eng; }, get t() { return t; }, get portrait() { return portrait; }, get dpr() { return dpr; }, get V() { return V; }, get v() { return V; }, get markScale() { return markScale; }, get font() { return css("--f"); }, get head() { return css("--h"); }, get title() { return S.sc ? t.index[S.stage] : planName(); }, roomName, fmt, weakest: () => S.vals.length ? weakestOf(S, S.vals) : -1, whole, layout, words, ink, place, panel, strip, saveHash, applyPlan, roomsNow, pencil, btn, el, toView, $, css, loadPlan, get box() { return box; }, calm, store, touched, wake };
async function keep() { if (!eng || S.searching) return; saveHash(); S.stageIsChapter = !!S.sc; await document.fonts.load(`300 40px "Print Head"`).catch(() => { }); await document.fonts.load(`20px "Routed Gothic"`).catch(() => { }); const c = picture(api), blob = await new Promise((r) => c.toBlob(r, "image/png")); if (S.blobURL) URL.revokeObjectURL(S.blobURL); S.blob = blob; $("endimg").src = S.blobURL = URL.createObjectURL(blob); $("endimg").alt = t.canvas; $("endT").textContent = t.beat; $("dlSave").textContent = t.save; $("dlLink").textContent = t.link; $("dlClose").textContent = t.close; $("dlShare").textContent = t.share; let can = false; try { can = !!navigator.canShare && navigator.canShare({ files: [new File([new Blob(["a"])], "a.png", { type: "image/png" })] }); } catch { /* old */ } $("dlShare").hidden = !can; $("end").showModal(); }
async function copyLink() { const u = shareURL(true); try { await navigator.clipboard.writeText(u); } catch { const i = el("textarea"); i.value = u; ($("end").open ? $("end") : document.body).append(i); i.select(); try { document.execCommand("copy"); } catch { /* nothing more to try */ } i.remove(); } S.lastLink = u; for (const id of ["link", "dlLink"]) { const b = $(id); if (b) { b.textContent = t.copied; setTimeout(() => { b.textContent = t.link; }, 1600); } } }
function about() { $("abH").textContent = t.how; $("abClose").textContent = t.close; $("abB").innerHTML = t.howT.map(([h, p]) => `<h3>${h}</h3><p>${p}</p>`).join("") + `<h3>${t.src}</h3><p>${t.srcs.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${n}</a>`).join("<br>")}</p><p>${t.lic}: <a href="LICENSE-routed-gothic.md">Routed Gothic</a>, <a href="fonts/OFL-source-serif-4.txt">Source Serif 4</a>, <a href="fonts/OFL-noto-serif-sc.txt">Noto Serif SC</a></p>`; $("about").showModal(); $("about").firstElementChild.scrollTop = 0; }

// ---------- go
let editor = null; readHash();
try { eng = makeEngine(qs.get("tier") === "1" ? 1 : 0); } catch (e) { eng = null; console.info("no waves: " + String(e.message || e)); }
editor = createEditor(api);
portrait = mqP.matches; applyPlan(true); bind(); words(); layout(); $("tc").content = css("--paper");
if (!eng) { document.body.classList.add("noglb"); $("print").classList.add("nogl"); say(t.noGL); $("acts").innerHTML = ""; } else requestAnimationFrame(frame);
document.fonts && document.fonts.ready.then(() => { ink(); place(true); });
$("gl").addEventListener("webglcontextlost", (e) => { e.preventDefault(); if (eng) eng.lost = true; say(t.lostGL); });
window.__wifi = { standable: (x, y) => standable(S, x, y), ready, S, get eng() { return eng; }, P, search, stats, picture: () => picture(api), get portrait() { return portrait; }, toView: (x, y) => toView(x, y, V), go, get V() { return V; }, weakestOf: (lv) => weakestOf(S, lv), shareURL, editor, crossings, T, settle, roomLevels: (p, r) => roomLevels(S, eng, p, r), applyPlan };
