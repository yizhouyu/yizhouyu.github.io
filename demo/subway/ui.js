// Words and controls: the question, the five chapters, the panels.
import { initMore } from "./more.js";
export function initUI(A, core) {
  const { $, S, E, D, net } = A, side = $("#side"), z = () => A.t(), esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const ui = A.ui = {}; const L = {}; ui.L = L;                   // L = what has been done in the lesson
  const name = k => A.tag(k);
  // ---------- the question
  ui.ask = () => {
    const q = z().ask("\u0001", "\u0002"), n = z().mins(S.lim); document.title = z().title;
    $("#ask").innerHTML = esc(q).replace("\u0001", `<span role="button" tabindex="0" class="nw" data-a="lim" aria-label="${z().askMins(S.lim)}">${n}</span>`).replace("\u0002", `<span role="button" tabindex="0" data-a="find" aria-label="${esc(z().askSt(A.cxName[S.cx]))}">${A.tag(S.cx)}</span>`);
    document.body.classList.toggle("nohead", S.step === 4 || S.step === 6 || (S.tool === "sta" && S.step === 0 && !S.game && !S.follow) || !!S.follow?.legs); $("#ask").hidden = S.hide; document.body.classList.toggle("long", A.cxName[S.cx].length > 20);
  };
  const LIMS = [15, 30, 45, 60];
  // ---------- fixed words
  ui.words = () => {
    document.documentElement.lang = A.lang === "zh" ? "zh-Hans" : "en"; $("#lang").textContent = z().other; $("#lang").lang = A.lang === "zh" ? "en" : "zh-Hans"; $("#home").textContent = z().home; $("#aboutB").textContent = z().about; $("#map").setAttribute("aria-label", z().map); $("#strip").setAttribute("aria-label", z().strip); $("#back1").setAttribute("aria-label", z().back1); $("#fwd1").setAttribute("aria-label", z().fwd1); theme(); ui.ask(); A.numbers(); ui.render(); A.pokeStrip();
  };
  const theme = () => { const b = $("#theme"); b.title = z().theme[S.theme]; b.setAttribute("aria-label", z().theme[S.theme]); b.dataset.m = S.theme; };
  $("#lang").onclick = () => { A.lang = A.lang === "en" ? "zh" : "en"; A.store.set("lang", A.lang); const u = new URL(location.href); if (u.searchParams.has("lang")) { u.searchParams.set("lang", A.lang); try { history.replaceState(null, "", u); } catch { } } ui.words(); if (!$("#modal").hidden) ui.reopen?.(); };
  $("#theme").onclick = () => { S.theme = { auto: A.isDark ? "light" : "dark", light: A.isDark ? "light" : "auto", dark: "auto" }[S.theme]; if (S.theme === "auto") A.store.set("theme", ""); theme(); ui.toast(z().theme[S.theme]); A.saveURL(); A.pokeStrip(); };
  $("#aboutB").onclick = () => ui.about();
  let tt = 0; ui.toast = s => { const t = $("#toast"); t.textContent = s; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 1800); };
  // ---------- tools
  ui.tools = () => {
    const t = z().tools, b = (a, x, on) => `<button type="button" data-a="${a}" class="${on ? "on" : ""}" ${on !== undefined ? `aria-pressed="${!!on}"` : ""}>${x}</button>`, freeP = S.step === 0 && !S.game && !S.follow;
    $("#tools").innerHTML = freeP ? b("min", t.min, S.view === "min") + b("chg", t.chg, S.tool === "chg" || S.ch < 9) + b("to", t.to, S.tool === "to") + b("sta", t.sta, S.tool === "sta") + b("game", t.game) + b("keep", t.keep) + `<button type="button" data-a="play" class="playb" aria-label="${S.playing ? t.pause : t.play}" title="${S.playing ? t.pause : t.play}"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">${S.playing ? '<path d="M4 2.5v11M12 2.5v11" stroke="currentColor" stroke-width="2"/>' : '<path d="M3.5 2v12l10-6z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'}</svg></button>` : "";
    let r = $("#recentre"); if (!r) { r = document.createElement("button"); r.id = "recentre"; r.type = "button"; r.dataset.a = "recentre"; document.body.append(r); } r.textContent = t.recentre; r.hidden = !A.moved || !!S.follow || S.step === 6;
    document.body.classList.toggle("free", freeP); document.body.classList.toggle("busy", !!S.follow || S.hide); document.body.classList.toggle("lesson", S.step > 0 && S.step < 6); document.body.classList.toggle("ending", S.step === 6);
  };
  // ---------- side: one thing at a time
  let lastSide = "";
  const put = html => {
    if (html !== lastSide) { const f = document.activeElement, was = side.contains(f) ? f.dataset.a + "|" + (f.dataset.v || "") : "", oldN = lastSide; lastSide = html; side.innerHTML = html ? `<div class="slip">${html}</div>` : ""; if (was) { const [a, v] = was.split("|"); (side.querySelector(`[data-a="${a}"]${v ? `[data-v="${v}"]` : ""}:not(:disabled)`) || side.querySelector(".main,button:not(:disabled)"))?.focus({ preventScroll: true }); } if (!S.follow?.legs) { const b = side.querySelector(".big,.bd"); $("#live").textContent = b ? b.textContent : ""; } }
    ui.tools(); A.fitLeft(); A.poke(); if (!A.moved && !S.follow && !S.game) { const f = core.frameFor(); A.look(S.view === "min" ? f : { ox: f.ox, oy: f.oy, mpp: f.mpp, x: f.x, y: f.y }); }
  };
  // the question and the panel share one column: when the window is low, the question gives way
  A.fitLeft = () => { const c = document.body.classList; c.remove("t1", "t2", "t3"); if (c.contains("nohead") || A.phone()) return; const slip = side.firstElementChild; if (!slip) return; for (const k of ["t1", "t2", "t3"]) { const a = $("#ans").offsetParent && !$("#ans").hidden ? $("#ans") : $("#ask"); if (slip.getBoundingClientRect().top - a.getBoundingClientRect().bottom >= 14) return; c.add(k); } };
  ui.put = put;
  const bar = (n, next, o = {}) => `<div class="nav5"><span class="of">${z().of5(n)}</span>${n > 1 ? `<button type="button" data-a="prev" aria-label="‹">‹</button>` : ""}<button type="button" data-a="skip">${z().skip}</button><button type="button" data-a="next" class="${next ? "main" : ""}">${n === 5 ? z().done : z().next}</button></div>`;
  ui.render = () => {
    ui.ask(); if (S.follow?.panel) return put(S.follow.panel()); if (S.game) return put(ui.gamePanel()); if (S.step === 6) return put(ui.endPanel()); if (S.step) return put(steps[S.step]()); if (S.tool === "sta") return put(ui.station()); if (S.tool === "to") return put(ui.goTo()); if (S.tool === "chg") return put(ui.changes()); if (S.view === "min") return put(`<p class="bd">${z().s5ok}</p><div class="row"><button type="button" data-a="min">${z().s5back}</button></div>`); if (A.cxName[S.cx] && A.count <= 21 && net.D.routes[A.cxRoutes[S.cx][0]][0] === "SI") return put(`<p class="sm">${z().sir}</p>`); put(A.G?.flat ? `<p class="sm">${z().nogl}</p>` : "");
  };
  // ---------- helpers on the timetable
  const departures = (cx, m, n = 30) => { const C = net.C, o = [], t0 = Math.floor(m) * 60; let k = net.first[Math.floor(m) % 1440], add = 0; for (let i = 0; i < C.n; i++, k++) { if (k >= C.n) { k = 0; add += 86400; } const d = C.dep[k] + add - t0; if (d >= n * 60) break; if (net.cof[C.from[k]] === cx) o.push([d, D.patRoute[D.tripPat[C.trip[k]]]]); } return o; };
  ui.departures = departures;
  const ticks = (label, d) => `<div class="tk"><span>${label}</span><svg viewBox="0 0 300 22" preserveAspectRatio="none" aria-hidden="true"><path d="M0 21.5H300" stroke="currentColor" stroke-opacity=".4" vector-effect="non-scaling-stroke"/>${d.map(([s, r]) => `<path d="M${(s / 6 + .5).toFixed(1)} 2V21" stroke="${A.isDark || !/FCCC0A|F6BC26|A7A9AC|7C858C|FFCC/i.test(D.routes[r][2]) ? "#" + D.routes[r][2] : "#" + D.routes[r][2]}" stroke-width="2" vector-effect="non-scaling-stroke"/>`).join("")}</svg><b>${d.length}</b></div>`;
  const range = (h) => { const v = A.dayAll(); let a = 1e9, b = 0, t = 0; for (let i = h * 60; i < h * 60 + 60; i++) { a = Math.min(a, v[i]); b = Math.max(b, v[i]); t += v[i]; } return [a, b, Math.round(t / 60)]; };
  const toDay = (m = 510) => animTime(m);
  function animTime(to) { if (A.calm) { A.setTime(to); return; } const from = S.m, d = ((to - from + 720 + 1440) % 1440) - 720, t0 = performance.now(); L.anim = now => { const u = Math.min(1, (now - t0) / 1100), q = u < .5 ? 2 * u * u : 1 - (2 - 2 * u) ** 2 / 2; S.m = (from + d * q + 1440) % 1440; A.pokeStrip(); if (u >= 1) { S.m = to; L.anim = null; A.setTime(to); } return true; }; }
  ui.animTime = animTime;
  const tick0 = A.tick; A.tick = (dt, now) => { let r = false; if (L.anim) r = L.anim(now) || r; if (S.follow?.tick) r = S.follow.tick(dt, now) || r; return r || tick0?.(dt, now); };
  // ---------- five chapters
  const steps = {
    1: () => `<p class="big">${L.s1 ? z().s1ok(name(S.cx), A.count) : z().s1}</p>${L.s1 ? "" : `<p class="sm">${z().s1b(w => `<button type="button" class="lk" data-a="find">${w}</button>`)}</p>`}${bar(1, L.s1)}`,
    2: () => {
      if (!L.s2) return `<p class="big">${z().s2}</p>${bar(2, false)}`;
      const m = Math.floor(L.s2m), a = range(3), c = range(8), d0 = departures(S.cx, 510), d1 = departures(S.cx, m);
      return `<p class="big">${z().s2ok(c[2], a[2], d1.length > d0.length * .6)}</p>${c[2] - a[2] > c[2] * .1 ? `<p class="bd">${z().s2why}</p>` : ""}<p class="sm">${z().s2rows}</p>${ticks(z().time(510), d0)}${ticks(z().time(m), d1)}<p class="sm rng">${z().s2rng(a[2], a[0], a[1], c[2], c[0], c[1])}</p>${bar(2, true)}`;
    },
    3: () => `<p class="big">${z().s3}</p>${ui.chgRow()}${L.s3 ? (() => { const c = [0, 1].map(k => A.countAt(S.cx, S.m, S.lim, k)), all = A.countAt(S.cx, S.m, S.lim, 9); return `<p class="bd">${z().s3res({ 0: 0, 1: 1, 2: 2, 9: 3 }[S.ch], A.countAt(S.cx, S.m))}</p>${L.s3n > 1 ? `<p class="sm">${z().s3sum(c[0], c[1], all - c[1])}</p>` : ""}`; })() : ""}${bar(3, L.s3n > 1)}`,
    4: () => ui.racePanel() + bar(4, !!L.s4),
    5: () => S.view === "min" ? `<p class="big s">${z().s5ok}</p>${bar(5, L.s5)}` : `<p class="big">${z().s5}</p><div class="row"><button type="button" class="main" data-a="min">${z().s5btn}</button></div>${bar(5, false)}`,
  };
  ui.chgRow = () => `<div class="choice" role="group">${[0, 1, 2, 9].map((k, i) => `<button type="button" data-a="ch" data-v="${k}" aria-pressed="${S.ch === k}" class="${S.ch === k ? "on" : ""}">${z().chg[i]}</button>`).join("")}</div>`;
  ui.changes = () => `<p class="big s">${z().s3res({ 0: 0, 1: 1, 2: 2, 9: 3 }[S.ch], A.countAt(S.cx, S.m))}</p>${ui.chgRow()}`;
  ui.goStep = n => {
    stopFollow(); S.tool = ""; S.dest = -1; A.legs = null; S.playing = false; S.hide = false; S.game = null; S.step = n; if (n !== 3) S.ch = 9; if (n !== 5) S.view = "map"; if (n && n < 6) S.lim = 30; if (n === 6) { A.store.set("done", "1"); }
    if (n === 2 && !L.s2) toDay(); if (n === 3) { toDay(); } if (n === 4) { L.night = false; ui.raceSetup(8 * 60 + 31); } if (n === 5) { L.s5 = false; toDay(); } if (n === 6) { core.solve(); animTime(A.ends().nm); }
    A.moved = false; if (n !== 4) A.recentre(); ui.ask(); A.numbers(); ui.render(); if (n !== 4) A.recentre(); A.saveURL(); A.pokeStrip();
  };
  ui.startChanged = () => { if (S.step === 2 && L.s2) { core.solve(); L.s2 = S.m >= 120 && S.m <= 300; } if (S.step === 1) L.s1 = true;  if (S.step === 3) { L.s3n = Math.min(L.s3n || 0, 4); } core.solve(); core.numbers(); ui.route(); ui.render(); };
  ui.timeChanged = end => {
    if (S.step === 2 && end && S.m >= 120 && S.m <= 300) { L.s2 = true; L.s2m = S.m; ui.render(); }
    if (S.step === 5 && S.view === "min" && end) { L.s5 = true; ui.render(); }
    if (S.step === 0) { if (S.tool === "to") ui.route(); if (S.tool && (end || S.tool !== "sta")) ui.render(); }
  };
  ui.tapStation = k => {
    if (S.follow && !S.follow.race) return true; if (S.game) { ui.gameTap(k); return true; } if (S.step === 4 || S.step === 6) return S.step === 4;
    if (S.step === 0 && S.tool === "to") { if (k === S.cx) return true; S.dest = k; ui.route(); ui.render(); ui.seeBoth([S.cx, k]); A.saveURL(); A.poke(); return true; }
    return false;
  };
  // ---------- the race
  const stop = id => D.stops.findIndex(s => s[0] === id);
  function raceData(m) {
    const a = stop("635"), b = stop("626"), o = []; for (let i = 0; i < net.nT; i++) { const st = E.tripStops(net, i), x = st.findIndex(s => s.stop === a), y = st.findIndex(s => s.stop === b); if (x < 0 || y <= x) continue; let d = st[x].dep; if (d >= 86400 && m < 600) d -= 86400; o.push({ trip: i, dep: d, x: st[x].dep, ride: st[y].arr - st[x].dep, stops: y - x, r: D.patRoute[D.tripPat[i]], from: a, to: b }); } o.sort((p, q) => p.dep - q.dep);
    return o.filter(t => t.dep >= m * 60);
  }
  ui.raceData = raceData;
  ui.raceSetup = m => {
    const all = raceData(m), loc = all.find(t => t.stops > 6), exp = all.find(t => t.dep >= loc.dep && t.stops < 6); L.rc = { m, loc, exp, pick: 0, done: false }; S.m = m; A.moved = false;
    const names = E.tripStops(net, loc.trip).map(s => s.stop); const i = names.indexOf(loc.from), j = names.indexOf(loc.to);
    S.follow = { race: { trips: [loc, exp].map((t, i) => ({ trip: t.trip, x0: t.x, clock0: t.dep, x1: t.x + t.ride, side: i ? -1.15 : 1.15 })), legs: [{ ...loc, w: .8, side: 1.15 }, { ...exp, w: .8, side: -1.15 }] }, names: names.slice(i, j + 1).map(s => [net.cof[s], D.stops[s][1]]), panel: null, tick: null };
    S.follow.panel = () => steps[4](); raceCam(); A.pokeStrip();
  };
  const raceCam = () => { const f = A.free(), w = f[2] - f[0], h = f[3] - f[1], XY = D.stopXY, r = L.rc, x = (XY[2 * r.loc.from] + XY[2 * r.loc.to]) / 2, y = (XY[2 * r.loc.from + 1] + XY[2 * r.loc.to + 1]) / 2; A.look({ x, y, mpp: Math.max(8, 6100 / Math.min(h * .92, w * 1.6)), yaw: -.5, pitch: .5, ox: (f[0] + f[2]) / 2 - innerWidth / 2, oy: (f[1] + f[3]) / 2 - innerHeight / 2 }); };
  ui.racePanel = () => {
    const r = L.rc, n = t => A.routeName(t.r); if (!r) return ""; const btn = (t, k) => `<button type="button" data-a="race" data-v="${k}" class="${r.pick === k ? "on" : ""}" ${r.pick ? "disabled" : ""}>${A.letters([t.r])} ${k === 1 ? z().s4local : z().s4exp}</button>`;
    let h = `<p class="sm">${z().s4(z().time(L.night ? 210 : r.m))}</p>`;
    if (L.night) { const four = ui.raceNightData().four; return h + `<p class="bd">${z().s4nresB({ n: four.stops, ride: four.ride, day: r.exp.ride })}</p><div class="row"><button type="button" data-a="raceAgain">${z().again}</button></div>`; }
    if (r.done) { const a = r.loc, b = r.exp, win = (a.dep + a.ride) - (b.dep + b.ride), o = { loc: n(a), exp: n(b), wait: b.dep - a.dep, win, ne: b.stops, nl: a.stops, per: Math.round((a.ride - b.ride) / (a.stops - b.stops) / 5) * 5 }; return h + `<p class="bd">${z().s4you(r.pick === 2)}${z().s4res(o)}</p><div class="row"><button type="button" data-a="raceNight">${z().s4night}</button><button type="button" data-a="raceAgain">${z().again}</button></div>`; }
    return h + (r.pick ? `<p class="big s">${z().s4go}</p>` : `<p class="big s">${z().s4q(n(r.loc), n(r.exp), r.exp.dep - r.loc.dep)}</p>`) + `<div class="choice">${btn(r.loc, 1)}${btn(r.exp, 2)}</div>`;
  };
  const raceGo = k => { const r = L.rc; r.pick = k; S.m = r.loc.dep / 60; const end = Math.max(r.loc.dep + r.loc.ride, r.exp.dep + r.exp.ride) / 60; S.follow.tick = dt => { S.m += dt / 1000 * 1.55; if (S.m >= end || A.calm) { S.m = end; S.follow.tick = null; r.done = true; L.s4 = true; ui.render(); } A.pokeStrip(); return true; }; ui.render(); };
  ui.raceNightData = () => { const all = raceData(210), four = all.find(t => A.routeName(t.r) === "4"), six = all.find(t => A.routeName(t.r) === "6"); return { four, six }; };
  // ---------- go to
  ui.route = () => { if (S.dest < 0) { A.legs = null; return; } const m = Math.floor(S.m); E.reachRounds(net, A.Q, S.cx, m * 60, 3 * 3600); const cap = S.ch > 4 ? A.Q.K - 1 : S.ch; A.legs = E.pathTo(net, A.Q, S.dest, cap); if (A.legs) for (const l of A.legs) l.m0 = m; };
  // if the goal is outside the window, show both ends
  ui.seeBoth = ks => { const fr = A.free(), P = ks.map(q => [A.cxXY[2 * q], A.cxXY[2 * q + 1]]); if (S.view !== "map" || !A.G) return; if (ks.every(k => { const q = A.G.project(...A.cxPos(k)); return q[0] > fr[0] + 20 && q[0] < fr[2] - 20 && q[1] > fr[1] + 30 && q[1] < fr[3] - 20; })) return; const f = core.frameFor(), c = Math.cos(f.yaw), s = Math.sin(f.yaw), U = P.map(([x, y]) => [x * c + y * s, -x * s + y * c]), a = Math.min(...U.map(u => u[0])), b = Math.max(...U.map(u => u[0])), d = Math.min(...U.map(u => u[1])), e = Math.max(...U.map(u => u[1])), mx = (a + b) / 2, my = (d + e) / 2, w = fr[2] - fr[0], h = fr[3] - fr[1]; A.look({ ...f, x: mx * c - my * s, y: mx * s + my * c, mpp: Math.max(14, (b - a + 1800) * 1.25 / w, (e - d + 1800) * 1.1 / h) }); A.setMoved(); };
  ui.goTo = () => {
    if (S.dest < 0) return `<p class="big">${z().toPick}</p><button type="button" class="x" data-a="to" aria-label="${z().close}">×</button>`; const l = A.legs; if (!l || !l.length) return `<p class="big s">${z().toFrom(name(S.cx), name(S.dest))}</p><p class="bd">${z().toNone}</p>${[S.cx, S.dest].some(k => D.routes[A.cxRoutes[k][0]][0] === "SI") ? `<p class="sm">${z().sir}</p>` : ""}<button type="button" class="x" data-a="to" aria-label="${z().close}">×</button>`;
    let wait = 0, chg = 0, ride = 0, t = 0; const segs = []; l.forEach((q, i) => { let w = q.dep - t; if (i) { const c = Math.min(w, changeTime(l[i - 1].to, q.from)); if (c) segs.push(["c", c]); chg += c; w -= c; } if (w) segs.push(["w", w]); wait += w; segs.push(["r", q.arr - q.dep, q.route]); ride += q.arr - q.dep; t = q.arr; });
    const mm = s => { const v = s > 600 ? Math.round(s / 60) : Math.round(s / 30) / 2; return A.lang === "zh" ? v + "" : v % 1 ? (v > 1 ? Math.floor(v) : "") + "½" : v + ""; };
    return `<button type="button" class="x" data-a="to" aria-label="${z().close}">×</button><p class="big s">${z().toFrom(name(S.cx), name(S.dest))}</p><p class="bd">${z().toMin(mm(t), z().time(S.m + t / 60))}</p><div class="segs" role="img" aria-label="${z().legMin(mm(wait), mm(chg), mm(ride))}">${segs.map(([k, s, r]) => `<span class="${k}" style="flex:${s};${r !== undefined ? `--c:#${D.routes[r][2]};--k:${/FCCC0A|F6BC26|A7A9AC|7C858C|6CBE45|799534/i.test(D.routes[r][2]) ? "#14151c" : "#fff"}` : ""}">${k === "r" && s / t > .08 ? `<i>${A.routeName(r)}</i>` : k === "w" && s / t > .22 ? `<i>${z().toWait}</i>` : ""}</span>`).join("")}</div><p class="sm">${z().legMin(mm(wait), mm(chg), mm(ride))}</p><ol class="legs">${l.map(q => `<li>${A.letters([q.route])}<span>${esc(D.stops[q.from][1])} → ${esc(D.stops[q.to][1])}</span><em>${z().time((S.m | 0) + q.dep / 60)}</em></li>`).join("")}</ol><div class="row"><button type="button" class="main" data-a="ridealong">${z().ridealong}</button><button type="button" data-a="swap">${z().swap}</button></div>`;
  };
  const changeTime = (a, b) => { if (a === b) return D.self[a]; for (const [x, s] of net.tx[a]) if (x === b) return s; return 180; };
  // ---------- riding
  function stopFollow() { if (!S.follow) return; S.follow = null; A.recentre(); A.poke(); ui.tools(); }
  ui.stopFollow = stopFollow;
  ui.ride = (legs, m0, to) => {
    const f = S.follow = { legs, trip: -1, tau: 0, m0, end: legs[legs.length - 1].arr, keepReach: false, txt: "", state: {} };
    for (const l of legs) { const c = (m0 * 60 + l.dep) % 86400; l.x = net.t0[l.trip] <= c && c <= net.t1[l.trip] ? c : c + 86400; l.st = E.tripStops(net, l.trip); l.i = l.st.findIndex(s => s.stop === l.from && Math.abs(s.dep - l.x) < 40); if (l.i < 0) l.i = l.st.findIndex(s => s.stop === l.from); l.j = l.st.findIndex((s, q) => q > l.i && s.stop === l.to); }
    f.names = [...new Map(legs.flatMap(l => l.st.slice(l.i, l.j + 1).map(s => [net.cof[s.stop], D.stops[s.stop][1]])))];
    const upd = () => {
      const l = f.legs.find(q => f.tau < q.arr) || f.legs[f.legs.length - 1], s = f.state; s.leg = l;
      if (f.tau >= f.end) { s.mode = "end"; s.stop = l.to; f.trip = -1; const XY = D.stopXY; s.x = XY[2 * l.to]; s.y = XY[2 * l.to + 1]; }
      else if (f.tau < l.dep) { s.mode = l === f.legs[0] ? "wait" : "change"; s.stop = l.from; s.in = l.dep - f.tau; f.trip = -1; s.x = D.stopXY[2 * l.from]; s.y = D.stopXY[2 * l.from + 1]; }
      else { const x = l.x + f.tau - l.dep; f.trip = l.trip; const p = A.trainSeg(l.trip, x, null, 170, 1, 1); if (p) { s.x = p[0]; s.y = p[1]; const st = p[4]; if (st.at) { s.mode = "at"; s.stop = l.st[st.k].stop; s.next = l.st[Math.min(st.k + 1, l.j)]; } else { s.mode = "run"; s.next = l.st[st.k + 1]; s.stop = s.next.stop; s.in = st.next - x; } s.k = st.k; } }
    };
    f.tick = dt => { if (f.pause) return false; const s = f.state, sp = A.calm ? 60 : s.mode === "wait" || s.mode === "change" ? 60 : s.mode === "at" ? 20 : 20; f.tau = Math.min(f.end, f.tau + dt / 1000 * sp); S.m = (m0 + f.tau / 60) % 1440; upd(); A.look({ x: s.x, y: s.y }); A.pokeStrip(); const p = f.panel(); if (p !== f.txt) { f.txt = p; put(p); } return f.tau < f.end; };
    f.panel = () => { const s = f.state, l = s.leg, h = esc(D.heads[D.patHead[D.tripPat[l.trip]]]), st = l.st, from = Math.max(l.i, (s.mode === "run" || s.mode === "at" ? s.k : l.i)); const T = z(); const word = s.mode === "wait" ? T.waiting : s.mode === "change" ? T.changing : s.mode === "at" ? T.at : s.mode === "end" ? T.arrived : s.stop === l.to ? T.last : T.nextStop; const list = s.mode === "end" ? "" : `<ol class="stops">${st.slice(from + (s.mode === "run" ? 1 : 0), l.j + 1).slice(0, A.phone() ? 2 : 7).map(q => `<li><span>${esc(D.stops[q.stop][1])}</span><em>${T.time(Math.floor((q.arr % 86400) / 60))}</em></li>`).join("")}</ol>`; return `<p class="bd">${A.letters([l.route])} ${T.to(h)}</p><p class="sm">${word === T.last && s.mode === "run" ? T.nextStop : word}${s.in && s.mode !== "end" ? ` · ${T.inMin(Math.round(s.in / 60))}` : ""}</p><p class="big">${esc(D.stops[s.stop][1])}</p>${list}<div class="row">${s.mode === "end" ? `<button type="button" class="main" data-a="off">${T.startHere}</button>` : s.mode === "wait" ? "" : `<button type="button" class="main" data-a="off">${T.off}</button>`}<button type="button" data-a="rideEnd">${T.toMap}</button></div>`; };
    S.playing = false; upd(); const [x0, y0, x1, y1] = A.free(); A.look({ x: f.state.x, y: f.state.y, mpp: 11, pitch: .95, yaw: A.cam.yaw, ox: (x0 + x1) / 2 - innerWidth / 2, oy: (y0 + y1) / 2 - innerHeight / 2 }); $("#you").hidden = true; ui.render(); const fr = A.free(); A.look({ ox: (fr[0] + fr[2]) / 2 - innerWidth / 2, oy: (fr[1] + fr[3]) / 2 - innerHeight / 2 });
  };
  // ---------- one station's day
  const pcache = {}; const pulse = cx => pcache[cx] ||= E.pulse(net, cx);
  ui.station = () => {
    const p = pulse(S.cx), T = z(), mx = Math.max(...p.hours), bh = p.hours.indexOf(mx), nx = E.nextDepartures(net, S.cx, Math.floor(S.m) * 60, A.phone() ? 6 : 4), h0 = Math.floor(S.m / 60) % 24; const byName = new Map(); for (const l of p.lines) { const n = A.routeName(l.r); if (!byName.has(n) || byName.get(n).n < l.n) byName.set(n, l); }
    const lines = [...byName.values()].filter(l => l.n >= 4).sort((a, b) => a.r - b.r), nt = lines.filter(l => l.allNight), dy = lines.filter(l => !l.allNight);
    return `<button type="button" class="x" data-a="sta" aria-label="${T.close}">×</button><p class="big">${name(S.cx)}</p><p class="bd">${T.pulse(p.total)}</p><svg class="hrs" viewBox="0 0 240 64" preserveAspectRatio="none" role="img" aria-label="${T.byHour}: ${[...p.hours].join(", ")}">${[...p.hours].map((n, i) => `<rect x="${i * 10 + 1.5}" y="${62 - n / mx * 58}" width="7" height="${Math.max(.8, n / mx * 58)}" fill="currentColor" fill-opacity="${i === h0 ? 1 : .38}"/>`).join("")}<path d="M0 62.5H240" stroke="currentColor" stroke-opacity=".5" vector-effect="non-scaling-stroke"/></svg><div class="hl"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div><p class="sm">${T.busiest(T.time(bh * 60), T.time(bh * 60 + 60), mx)}<br>${p.worst ? T.gap(A.letters([p.worst.r]), T.dur(p.worst.gap), T.time(p.worst.at / 60)) : ""}</p><p class="sm">${nt.length ? `${T.night} ${A.letters(nt.map(l => l.r))}<br>` : ""}${dy.length ? T.dayOnly : ""}</p>${dy.length ? `<ul class="dy">${dy.map(l => `<li>${A.letters([l.r])}<em>${T.firstLast(T.time(l.first / 60), T.time(l.last / 60))}</em></li>`).join("")}</ul>` : ""}<h3>${T.nextT}</h3><ul class="deps">${nx.map((d, i) => `<li><button type="button" data-a="dep" data-v="${i}">${A.letters([d.route])}<span>${T.to(esc(d.head))}</span><em>${T.inMin(Math.round(d.in / 60))}</em></button></li>`).join("")}</ul>`;
  };
  // ---------- find
  ui.modal = (html, cls, re) => { const m = $("#modal"); m.className = cls || ""; m.innerHTML = `<div class="in"><button type="button" class="x" data-a="close" aria-label="${z().close}">${z().close}</button>${html}</div>`; m.hidden = false; ui.reopen = re; ui.back ??= document.activeElement; (m.querySelector("input") || m.querySelector("button.main:not(:disabled)") || m.querySelector(".x"))?.focus({ preventScroll: true }); m.scrollTop = 0; };
  ui.close = () => { $("#modal").hidden = true; $("#modal").innerHTML = ""; ui.reopen = null; ui.back?.focus?.({ preventScroll: true }); ui.back = null; };
  ui.find = () => {
    const order = [...Array(net.nC).keys()].sort((a, b) => A.weight[b] - A.weight[a]); const items = q => { const s = q.trim().toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean); const r = order.filter(k => { const n = (A.cxName[k] + " " + D.complexes[k][1].map(x => D.stops[x][1]).join(" ")).toLowerCase().replace(/[^a-z0-9 ]/g, " "); return s.every(w => n.split(/\s+/).some(p => p.startsWith(w))); }); return r.slice(0, 60).map(k => `<li><button type="button" data-a="pick" data-v="${k}"><span>${name(k)}</span><span>${A.letters(A.cxRoutes[k])}</span></button></li>`).join("") || `<li class="sm">${z().none}</li>`; };
    ui.modal(`<h2>${z().find}</h2><input type="search" autocomplete="off" spellcheck="false" aria-label="${z().typeName}" placeholder="${z().typeName}"><ul class="list">${items("")}</ul>`, "find", ui.find); const i = $("#modal input"); i.addEventListener("input", () => { $("#modal .list").innerHTML = items(i.value); }); i.addEventListener("keydown", e => { if (e.key === "Enter") $("#modal .list button")?.click(); });
  };
  ui.about = () => ui.modal(`<h2>${z().aboutH}</h2>${z().aboutP.map(p => `<p>${p}</p>`).join("")}<h3>${z().aboutQ}</h3><p>${z().aboutA}</p><div class="row"><button type="button" data-a="lesson">${z().tools.lesson}</button></div><div class="src">${z().src}</div>`, "about", ui.about);
  // ---------- clicks
  const act = {
    best: v => A.setTime(+v, true),
    lim: () => { if (S.game || (S.step && S.step < 6)) return; S.lim = LIMS[(LIMS.indexOf(S.lim) + 1) % LIMS.length] || 30; A.startReveal(); A.pokeStrip(); core.solve(); ui.ask(); A.numbers(); ui.render(); if (!A.moved) A.recentre(); A.saveURL(); },
    find: () => { if (!S.game) ui.find(); }, close: () => ui.close(), recentre: () => { if (S.follow?.race) return raceCam(); A.recentre(); },
    pick: v => { ui.close(); const k = +v; if (S.tool === "to" && S.step === 0 && L.pickDest) { S.dest = k; ui.route(); ui.render(); } else { A.moved = false; A.setStart(k, false, true); } },
    next: () => ui.goStep(S.step >= 5 ? 6 : S.step + 1), prev: () => ui.goStep(S.step - 1), skip: () => ui.goStep(0), lesson: () => { ui.close(); for (const k of ["s1", "s2", "s3", "s3n", "s4", "s5", "night"]) L[k] = 0; ui.goStep(1); }, free: () => ui.goStep(0),
    ch: v => { S.ch = +v; L.s3 = true; L.seen = (L.seen || new Set()).add(v); L.s3n = L.seen.size; A.pokeStrip(); core.solve(); A.numbers(); ui.route(); ui.render(); A.saveURL(); },
    min: () => { S.view = S.view === "min" ? "map" : "min"; A.moved = false; A.recentre(); ui.render(); A.recentre(); A.saveURL(); },
    chg: () => { S.tool = S.tool === "chg" ? "" : "chg"; if (!S.tool && S.ch < 9) { S.ch = 9; A.pokeStrip(); } S.dest = -1; A.legs = null; ui.render(); A.saveURL(); }, sta: () => { S.tool = S.tool === "sta" ? "" : "sta"; S.dest = -1; A.legs = null; ui.render(); },
    to: () => { S.tool = S.tool === "to" ? "" : "to"; if (!S.tool) { S.dest = -1; A.legs = null; } ui.render(); A.saveURL(); }, play: () => { S.playing = !S.playing; ui.tools(); A.poke(); }, game: () => ui.gameOpen(), keep: () => ui.keep(),
    race: v => raceGo(+v), raceAgain: () => { L.night = false; ui.raceSetup(511); ui.render(); raceCam(); }, raceNight: () => { const { four, six } = ui.raceNightData(); L.night = true; const trips = [four, six].filter(Boolean).sort((a, b) => a.dep - b.dep); const f = S.follow; const sd = t => t === four ? -1.15 : 1.15; f.race.trips = trips.map(t => ({ trip: t.trip, x0: t.x, clock0: t.dep, x1: t.x + t.ride, side: sd(t) })); f.race.legs = trips.map(t => ({ ...t, w: .8, side: sd(t) })); S.m = trips[0].dep / 60; const end = trips[0].dep / 60 + trips[0].ride / 60 + .5; f.tick = dt => { S.m += dt / 1000 * 1.55; if (S.m >= end || A.calm) { S.m = end; f.tick = null; } A.pokeStrip(); return true; }; ui.render(); },
    ridealong: () => { ui.ride(A.legs.map(l => ({ ...l })), Math.floor(S.m)); }, swap: () => { const a = S.cx; const d = S.dest; S.cx = d; S.dest = a; core.solve(); ui.route(); ui.ask(); A.moved = false; A.recentre(); ui.render(); ui.seeBoth([S.cx, S.dest]); A.saveURL(); A.pokeStrip(); },
    dep: v => { const d = E.nextDepartures(net, S.cx, Math.floor(S.m) * 60, 6)[+v]; const p = D.tripPat[d.trip], last = D.patStops[D.patOff[p + 1] - 1]; const st = E.tripStops(net, d.trip), i = d.pos; ui.ride([{ trip: d.trip, from: d.stop, to: last, dep: d.in, arr: d.in + st[st.length - 1].arr - st[i].dep, route: d.route }], Math.floor(S.m)); },
    off: () => { const f = S.follow, s = f.state, st = s.mode === "run" ? s.next : null, m = f.m0 + (f.tau + (st ? s.in : 0)) / 60; S.follow = null; S.tool = ""; S.dest = -1; A.legs = null; S.m = Math.ceil(m) % 1440; A.moved = false; A.setStart(net.cof[s.stop], false, true); A.recentre(); ui.render(); },
    rideEnd: () => { const f = S.follow; S.m = Math.floor(f.m0); stopFollow(); ui.render(); A.recentre(); A.pokeStrip(); },
  };
  ui.act = act;
  document.addEventListener("click", e => { const b = e.target.closest?.("[data-a]"); if (!b) return; act[b.dataset.a]?.(b.dataset.v, b); });
  document.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.getAttribute?.("role") === "button") { e.preventDefault(); e.target.click(); return; }
    if (e.key === "Escape") { if (!$("#modal").hidden) return ui.close(); if (S.follow && !S.follow.race) return act.rideEnd(); if (S.tool) { S.tool = ""; S.dest = -1; A.legs = null; ui.render(); A.saveURL(); } return; }
    if (/INPUT|TEXTAREA/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return; if (e.key === "Tab" && !$("#modal").hidden) { const f = [...$("#modal").querySelectorAll("button,input,a")], i = f.indexOf(document.activeElement); if (e.shiftKey ? i <= 0 : i === f.length - 1) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); } return; } if (!$("#modal").hidden) return;
    if (e.key === "/") { e.preventDefault(); ui.find(); } else if (e.key === " " && S.step === 0 && !S.game && !S.follow && e.target.tagName !== "BUTTON") { e.preventDefault(); act.play(); } else if (e.key === "m" && (S.step === 0 || S.step === 5) && !S.game && !S.follow) act.min(); else if (e.key === "0") { A.moved = false; A.recentre(); }
  });
  // ---------- small things drawn over the map
  ui.over = (g, ink, pal, FONT) => {
    if (S.follow?.race) { const sl = A.G.cam.slot; for (const l of S.follow.race.legs) for (const q of A.legStops(l)) { const c = A.G.project(q[0] + q[2] * sl, q[1] + q[3] * sl); g.beginPath(); g.arc(c[0], c[1], 3.6, 0, 7); g.fillStyle = `rgb(${pal.dotFill.map(v => v * 255 | 0)})`; g.fill(); g.lineWidth = 1.6; g.strokeStyle = ink; g.stroke(); } for (const r of S.follow.race.trips) { const p = A.trainSeg(r.trip, A.raceX(r, S.m * 60), null, 170, 1, 1, r.side); if (!p) continue; const sl = A.G.cam.slot, q = A.G.project(p[0] + p[2] * sl, p[1] + p[3] * sl), n = A.routeName(D.patRoute[D.tripPat[r.trip]]); g.font = `bold 21px ${FONT()}`; g.textAlign = "center"; g.lineJoin = "round"; g.strokeStyle = `rgb(${pal.land.map(v => v * 255 | 0)})`; g.lineWidth = 5; g.fillStyle = ink; const x = q[0] + (r.side > 0 ? 18 : -18); g.strokeText(n, x, q[1] + 6); g.fillText(n, x, q[1] + 6); g.fillStyle = "#" + D.routes[D.patRoute[D.tripPat[r.trip]]][2]; g.fillRect(x - 7, q[1] + 10, 14, 3); } g.textAlign = "left"; }
    if (S.follow?.legs) { const s = S.follow.state, q = A.G.project(s.x, s.y); g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.arc(q[0], q[1], 13, 0, 7); g.stroke(); }
    ui.moreOver?.(g, ink, pal, FONT);
  };
  ui.start = (restored) => { ui.words(); if (S.seed) { ui.gameOpen(S.seed); return; } if (S.step) { const n = S.step, m = S.m; ui.goStep(n); if (n !== 4) { L.anim = null; S.m = m; A.pokeStrip(); } if (n === 2 && m >= 120 && m <= 300) { L.s2 = true; L.s2m = m; ui.render(); } return; } if (S.dest >= 0) { S.tool = "to"; core.solve(); ui.route(); } ui.render(); A.recentre(true); if (S.dest >= 0) { A.drawNow(); ui.seeBoth([S.cx, S.dest]); } };
  initMore(A, core, ui);
}
