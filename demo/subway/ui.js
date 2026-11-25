// Words and controls: the question, the five chapters, the panels.
import { initMore } from "./more.js";
export function initUI(A, core) {
  const { $, S, E, D, net } = A, side = $("#side"), z = () => A.t(), esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const ui = A.ui = {}; const L = {}; ui.L = L;                   // L = what has been done in the lesson
  const name = k => A.tag(k);
  // ---------- the question
  ui.ask = () => {
    const q = S.pick ? z().askHome("\u0001") : z().ask("\u0001", "\u0002"), n = z().mins(S.lim); document.title = z().title;
    $("#ask").innerHTML = esc(q).replace("\u0001", `<span role="button" tabindex="0" class="nw" data-a="lim" aria-label="${z().askMins(S.lim)}">${n}</span>`).replace("\u0002", `<span role="button" tabindex="0" data-a="find" aria-label="${esc(z().askSt(A.cxName[S.cx]))}">${A.tag(S.cx)}</span>`);
    document.body.classList.toggle("nohead", S.step === 2 && S.dest >= 0 || S.step > 3 || (S.tool === "sta" && S.step === 0 && !S.game && !S.follow) || !!S.follow?.legs || (S.route && !S.step)); document.body.classList.toggle("nostrip", S.step > 0 && S.step < 6); document.body.classList.toggle("pick", !!S.pick); document.body.classList.toggle("topside", (S.pick || S.step === 2 && S.dest >= 0 || S.step >= 5) && !S.game);; $("#ask").hidden = S.hide; document.body.classList.toggle("long", A.cxName[S.cx].length > 20);
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
    let ly = $("#layers"); if (!ly) { ly = document.createElement("div"); ly.id = "layers"; ly.setAttribute("role", "group"); document.body.append(ly); } ly.hidden = !!S.follow || S.hide || !!S.game || S.step === 6; const lt = z().layers; ly.setAttribute("aria-label", lt.name); ly.hidden = ly.hidden || S.route || S.pick; ly.innerHTML = (S.view === "map" && !S.hide && !S.homes ? `<span id="cap">${lt.cap(S.lim)}</span>` : "") + `<button type="button" data-a="lay" data-v="open" aria-expanded="${!!L.lay}">${lt.name}</button>` + [["homes", lt.homes], ["trains", lt.trains], ["all", lt.all]].map(([k, x]) => `<button type="button" data-a="lay" data-v="${k}" aria-pressed="${S[k]}" class="${S[k] ? "on" : ""}" ${L.lay || S[k] ? "" : "hidden"}>${x}</button>`).join("");
    let r = $("#recentre"); if (!r) { r = document.createElement("button"); r.id = "recentre"; r.type = "button"; r.dataset.a = "recentre"; document.body.append(r); } r.textContent = t.recentre; r.hidden = !A.moved || !!S.follow || S.step === 6;
    document.body.classList.toggle("free", freeP); document.body.classList.toggle("busy", !!S.follow || S.hide); document.body.classList.toggle("lesson", S.step > 0 && S.step < 6); document.body.classList.toggle("ending", S.step === 6);
  };
  // ---------- side: one thing at a time
  let lastSide = "";
  const put = html => {
    html = html.replace(/([ap]\.m)\.\./g, "$1.");
    if (html !== lastSide) { const f = document.activeElement, was = side.contains(f) ? f.dataset.a + "|" + (f.dataset.v || "") : "", oldN = lastSide; lastSide = html; side.innerHTML = html ? `<div class="slip" tabindex="-1">${html}</div>` : ""; if (was) { const [a, v] = was.split("|"); (side.querySelector(`[data-a="${a}"]${v ? `[data-v="${v}"]` : ""}:not(:disabled)`) || side.firstElementChild)?.focus({ preventScroll: true }); } if (!S.follow?.legs) { const b = side.querySelector(".big,.bd"); $("#live").textContent = b ? b.textContent : ""; } }
    ui.tools(); A.fitLeft(); A.poke(); if (!A.moved && !S.follow && !S.game) { const f = core.frameFor(); A.look(S.view === "min" ? f : { ox: f.ox, oy: f.oy, mpp: f.mpp, x: f.x, y: f.y }); }
  };
  // the question and the panel share one column: when the window is low, the question gives way
  A.fitLeft = () => { const c = document.body.classList; side.style.top = c.contains("pick") && !A.phone() ? $("#ask").getBoundingClientRect().bottom + 34 + "px" : ""; c.remove("t1", "t2", "t3"); if (c.contains("nohead") || c.contains("topside") || A.phone()) return; const slip = side.firstElementChild; if (!slip) return; for (const k of ["t1", "t2", "t3"]) { const a = $("#ans").offsetParent && !$("#ans").hidden ? $("#ans") : $("#ask"); if (slip.getBoundingClientRect().top - a.getBoundingClientRect().bottom >= 14) return; c.add(k); } };
  ui.put = put;
  // Next exists only once something has happened
  const bar = (n, next) => `<div class="nav5"><span class="of">${z().of5(n)}</span><button type="button" data-a="skip">${z().skip}</button>${next ? `<button type="button" data-a="next" class="main">${n === 5 ? z().done : z().next}</button>` : ""}</div>`;
  ui.render = () => {
    ui.scene(); ui.ask(); if (S.follow?.panel) return put(S.follow.panel()); if (S.game) return put(ui.gamePanel()); if (S.step === 6) return put(ui.endPanel()); if (S.step) return put(steps[S.step]()); if (S.tool === "sta") return put(ui.station()); if (S.tool === "to") return put(ui.goTo()); if (S.tool === "chg") return put(ui.changes()); if (S.view === "min") return put(`<p class="bd">${z().minok}</p><div class="row"><button type="button" data-a="min">${z().minback}</button></div>`); if (A.cxName[S.cx] && A.count <= 21 && net.D.routes[A.cxRoutes[S.cx][0]][0] === "SI") return put(`<p class="sm">${z().sir}</p>`); put(A.G?.flat ? `<p class="sm">${z().nogl}</p>` : "");
  };
  // ---------- helpers on the timetable
  const departures = (cx, m, n = 30) => { const C = net.C, o = [], t0 = Math.floor(m) * 60; let k = net.first[Math.floor(m) % 1440], add = 0; for (let i = 0; i < C.n; i++, k++) { if (k >= C.n) { k = 0; add += 86400; } const d = C.dep[k] + add - t0; if (d >= n * 60) break; if (net.cof[C.from[k]] === cx) o.push([d, D.patRoute[D.tripPat[C.trip[k]]]]); } return o; };
  ui.departures = departures;
  const ticks = (label, d) => `<div class="tk"><span>${label}</span><svg viewBox="0 0 300 22" preserveAspectRatio="none" aria-hidden="true"><path d="M0 21.5H300" stroke="currentColor" stroke-opacity=".4" vector-effect="non-scaling-stroke"/>${d.map(([s, r]) => `<path d="M${(s / 6 + .5).toFixed(1)} 2V21" stroke="${A.isDark || !/FCCC0A|F6BC26|A7A9AC|7C858C|FFCC/i.test(D.routes[r][2]) ? "#" + D.routes[r][2] : "#" + D.routes[r][2]}" stroke-width="2" vector-effect="non-scaling-stroke"/>`).join("")}</svg><b>${d.length}</b></div>`;
  const toDay = (m = 510) => animTime(m);
  function animTime(to) { if (A.calm) { A.setTime(to); return; } const from = S.m, d = ((to - from + 720 + 1440) % 1440) - 720, t0 = performance.now(); L.anim = now => { const u = Math.min(1, (now - t0) / 1100), q = u < .5 ? 2 * u * u : 1 - (2 - 2 * u) ** 2 / 2; S.m = (from + d * q + 1440) % 1440; A.pokeStrip(); if (u >= 1) { S.m = to; L.anim = null; A.setTime(to); } return true; }; }
  ui.animTime = animTime;
  const tick0 = A.tick; A.tick = (dt, now) => { let r = false; if (L.anim) r = L.anim(now) || r; if (S.follow?.tick) r = S.follow.tick(dt, now) || r; return r || tick0?.(dt, now); };
  // ---------- five chapters
  const PLACES = [["127", "times"], ["125", "park"], ["631", "grand"], ["419", "wall"], ["Q01", "china"], ["L08", "will"], ["D24", "barc"], ["414", "yank"], ["117", "colu"], ["701", "flus"], ["D43", "coney"], ["G06", "jfk"]].map(([id, k]) => [A.byId(id), k]).filter(x => x[0] >= 0);
  // of twelve places everyone knows: how many within the limit, and the nearest that is not
  ui.PLACES = PLACES; ui.places = () => { const far = E.INF, r = PLACES.map(([k, w]) => ({ k, name: z().places[w], a: A.arrCx(k) })), yes = r.filter(x => x.a <= S.lim * 60), no = r.filter(x => x.a > S.lim * 60).sort((p, q) => p.a - q.a); return { n: yes.length, of: r.length, yes, no, all: r }; };
  // type a name: a real box on the desktop, a full page on the phone
  const box = () => A.phone() ? `<button type="button" class="fbox" data-a="find">${z().typeName}</button>` : `<input class="fbox" type="search" autocomplete="off" spellcheck="false" aria-label="${z().typeName}" placeholder="${z().typeName}"><ul class="list flist"></ul>`;
  side.addEventListener("input", e => { if (!e.target.classList.contains("fbox")) return; const q = e.target.value.trim(), l = side.querySelector(".flist"); l.innerHTML = q ? items(q, 4) : ""; A.fitLeft(); A.poke(); });
  side.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing && e.target.classList.contains("fbox") && e.target.tagName === "INPUT") { e.preventDefault(); e.stopPropagation(); side.querySelector(".flist button")?.click(); } });
  const opt = (a, list) => `<div class="choice">${list.map(([v, t]) => `<button type="button" data-a="${a}" data-v="${v}">${t}</button>`).join("")}</div>`;
  const legsBar = l => { let wait = 0, chg = 0, ride = 0, t = 0; const segs = []; l.forEach((q, i) => { let w = q.dep - t; if (i) { const c = Math.min(w, changeTime(l[i - 1].to, q.from)); if (c) segs.push(["c", c]); chg += c; w -= c; } if (w) segs.push(["w", w]); wait += w; segs.push(["r", q.arr - q.dep, q.route]); ride += q.arr - q.dep; t = q.arr; }); return { wait, chg, ride, t, html: `<div class="segs" role="img" aria-label="${z().legMin(mm(wait), mm(chg), mm(ride))}">${segs.map(([k, s, r]) => `<span class="${k}" style="flex:${s};${r !== undefined ? `--c:#${D.routes[r][2]};--k:${/FCCC0A|F6BC26|A7A9AC|7C858C|6CBE45|799534/i.test(D.routes[r][2]) ? "#14151c" : "#fff"}` : ""}">${k === "r" && s / t > .08 ? `<i>${A.routeName(r)}</i>` : k === "w" && s / t > .22 ? `<i>${z().toWait}</i>` : ""}</span>`).join("")}</div>` }; };
  const mm = s => { const v = s > 600 ? Math.round(s / 60) : Math.round(s / 30) / 2; return A.lang === "zh" ? v + "" : v % 1 ? (v > 1 ? Math.floor(v) : "") + "½" : v + ""; };
  const tripMin = (a, b, m) => { E.reach(net, Rx, a, Math.floor(m) * 60, 3 * 3600); return A.arrCx(b, Rx.arr); }, Rx = E.newReach(net);
  ui.tripMin = tripMin; const work = () => S.dest >= 0 ? S.dest : S.cx === A.byId("631") ? A.byId("R20") : A.byId("631");
  const clk = m => z().time(m);
  // step 3: the sharpest minute of this station's night, and which train is missed
  ui.sharp = () => { const v = A.countsFor(S.cx); let x = -1, at = 0; for (let m = 0; m < 300; m++) if (v[m] - v[m + 1] > x) { x = v[m] - v[m + 1]; at = m; } const miss = E.missed(net, S.cx, at); return { at, a: v[at], b: v[at + 1], miss }; };
  // step 5: mean minutes from a to b over an hour
  const meanTrip = (a, b, h) => { let t = 0; for (let m = h * 60; m < h * 60 + 60; m += 5) t += tripMin(a, b, m) / 12; return t / 60; };
  ui.homes2 = () => { const key = [S.cx, S.alt, work()].join(); if (L.h2key !== key) { L.h2key = key; const w = work(); L.h2 = { A: [meanTrip(S.cx, w, 8), meanTrip(w, S.cx, 0)], B: [meanTrip(S.alt, w, 8), meanTrip(w, S.alt, 0)] }; } return L.h2; };
  const n0 = x => Math.round(x);
  const steps = {
    1: () => { if (!L.s1) return `<p class="big">${z().s1}</p>${box()}${bar(1, false)}`; const p = ui.places(), first = p.no[0]; return `<p class="big s">${first ? z().s1no(first.name, first.a < E.INF ? Math.ceil(first.a / 60) : 0) : z().s1all}</p><p class="sm">${z().s1key}</p>${bar(1, true)}`; },
    2: () => {
      if (S.dest < 0) return `<p class="big">${z().w1}</p>${box()}${bar(2, false)}`;
      const l = A.legs; if (!l || !l.length) return `<p class="big s">${z().toNone}</p><p class="sm">${z().sir}</p><div class="row"><button type="button" data-a="again2">${z().other1}</button></div>${bar(2, false)}`;
      const b = legsBar(l), t = Math.ceil(b.t / 60), rd = Math.min(t, n0(b.ride / 60)); if (!L.g2) { const o = [[1, 1.4, 1.9], [.65, 1, 1.45], [.45, .7, 1]][(S.cx + S.dest) % 3].map(f => Math.max(2, Math.round(t * f))); return `<p class="sm">${z().toFrom(name(S.cx), name(S.dest))}</p><p class="big s">${z().w2(clk(510))}</p>${opt("g2", o.map(x => [x, z().inMin(x)]))}${bar(2, false)}`; }
      return `<p class="sm">${z().toFrom(name(S.cx), name(S.dest))}</p><p class="res"><b>${t}</b><span>${z().w3(L.g2 - t, clk(510 + t))}</span></p>${b.html}<p class="bd">${z().w4(rd, t - rd, t - rd > t * .22)}</p>${bar(2, true)}`;
    },
    3: () => {
      const x = L.sh; if (!x) return ""; const o = x.a - x.b; if (!L.g3) { const mid = Math.round((x.a + x.b) / 2), op = [...new Set([x.a, mid, x.b])].sort((p, q) => S.cx % 2 ? p - q : q - p); return `<p class="big s">${z().m1(clk(x.at), x.a)}</p><p class="bd">${z().m2}</p>${opt("g3", op.map(v => [v, v]))}${bar(3, false)}`; }
      const w = work(), t0 = tripMin(S.cx, w, x.at), t1 = tripMin(S.cx, w, x.at + 1), mn = v => Math.ceil(v / 60); return `<p class="big">${z().m4(x.a, x.b)}</p>${w !== S.cx && t1 < 3 * 3600 && mn(t1) > mn(t0) ? `<p class="res"><b>${mn(t0)} → ${mn(t1)}</b><span>${z().m6(name(w))}</span></p>` : ""}<p class="bd">${x.miss ? z().m5(A.letters([x.miss.r]), clk(x.at), clk(x.miss.next / 60)) : ""}</p><div class="choice"><button type="button" data-a="late" data-v="0" aria-pressed="${S.m === x.at}" class="${S.m === x.at ? "on" : ""}">${clk(x.at)}</button><button type="button" data-a="late" data-v="1" aria-pressed="${S.m !== x.at}" class="${S.m === x.at + 1 ? "on" : ""}">${clk(x.at + 1)}</button></div>${bar(3, true)}`;
    },
    4: () => ui.racePanel() + bar(4, !!L.s4),
    5: () => {
      if (S.alt < 0) return `<p class="big">${z().h1}</p><p class="sm">${z().h1b(name(S.cx), name(work()))}</p>${box()}${bar(5, false)}`;
      const h = ui.homes2(), big = x => x < 180 ? n0(x) : "—"; if (!isFinite(h.A[1] + h.B[1]) || h.B[1] > 180 || h.A[1] > 180) return `<p class="big s">${z().toNone}</p><p class="sm">${z().sir}</p><div class="row"><button type="button" data-a="again5">${z().other1}</button></div>${bar(5, true)}`;
      if (!L.g5) return `<p class="big s">${z().h2(name(work()))}</p>${opt("g5", [["A", name(S.cx)], ["B", name(S.alt)]])}${bar(5, false)}`;
      return `<p class="big s">${z().h3(h, name(S.cx), name(S.alt), L.g5)}</p><table class="two"><tr><th></th><th>${z().hDay}</th><th>${z().hNight}</th></tr><tr><td>${name(S.cx)}</td><td>${big(h.A[0])}</td><td>${big(h.A[1])}</td></tr><tr><td>${name(S.alt)}</td><td>${big(h.B[0])}</td><td>${big(h.B[1])}</td></tr></table><p class="bd">${z().h4(Math.abs(n0(h.A[0]) - n0(h.B[0])), Math.abs(n0(h.A[1]) - n0(h.B[1])))}</p><div class="row"><button type="button" data-a="again5">${z().other1}</button></div>${bar(5, true)}`;
    },
  };
  ui.chgRow = () => `<div class="choice" role="group">${[0, 1, 2, 9].map((k, i) => `<button type="button" data-a="ch" data-v="${k}" aria-pressed="${S.ch === k}" class="${S.ch === k ? "on" : ""}">${z().chg[i]}</button>`).join("")}</div>`;
  ui.changes = () => `<p class="big s">${z().s3res({ 0: 0, 1: 1, 2: 2, 9: 3 }[S.ch], A.countAt(S.cx, S.m))}</p>${ui.chgRow()}<p class="sm">${(() => { const c = [0, 1].map(k => A.countAt(S.cx, S.m, S.lim, k)); return z().s3sum(c[0], c[1], A.countAt(S.cx, S.m, S.lim, 9) - c[1]); })()}</p>`;
  // which of the three pictures: the reach, one route, or the race
  ui.scene = () => { const pk = S.step === 1 && !L.s1; if (S.pick !== pk) { S.pick = pk; A.moved = false; A.poke(); } const r = (S.step === 2 && S.dest >= 0) || S.step === 5 || (S.step === 0 && !S.game && S.tool === "to" && S.dest >= 0) || (!!S.game && S.game.phase === "show" && false); S.route = r; S.focus = r ? [...new Set([S.step === 5 ? work() : S.dest, S.step === 5 ? S.alt : -1, ...(A.legs || []).slice(1).map(l => net.cof[l.from])].filter(k => k >= 0 && k !== S.cx))] : S.game?.phase === "show" ? [...new Set([S.game.pick, S.game.b])].filter(k => k >= 0 && k !== S.cx) : null; A.ghostAt = S.step === 3 && L.g3 && L.sh && S.m === L.sh.at + 1 ? L.sh.at : null; };
  const routes5 = () => { const w = work(), night = S.alt >= 0, m = night ? 30 : 510; S.m = m; A.legs = A.legs2 = null; E.reachRounds(net, A.Q, night ? w : S.cx, m * 60, 3 * 3600); if (w !== S.cx) A.legs = E.pathTo(net, A.Q, night ? S.cx : w); if (night) A.legs2 = E.pathTo(net, A.Q, S.alt); for (const l of A.legs || []) l.side = .85; for (const l of A.legs2 || []) l.side = -.85; A.pokeStrip(); };
  ui.goStep = n => {
    stopFollow(); S.tool = ""; A.legs2 = null; S.playing = false; S.hide = false; S.game = null; S.step = n; S.ch = 9; S.view = "map"; L.anim = null; if (n && n < 6) { S.lim = 30; S.homes = S.trains = S.all = false; } if (n === 6) A.store.set("done", "1"); if (n === 0 || n === 1) { S.dest = -1; S.alt = -1; A.legs = null; }
    if (n === 1 || n === 2) S.m = 510; if (n === 2) { L.g2 = 0; ui.route(); } if (n === 3) { L.g3 = 0; L.sh = ui.sharp(); S.m = L.sh.at; } if (n === 4) { L.night = false; ui.raceSetup(8 * 60 + 31); } if (n === 5) { L.g5 = 0; S.m = 510; routes5(); } if (n === 6) { L.sh = ui.sharp(); S.m = L.sh.at + 1; A.legs = null; }
    A.moved = false; core.solve(); ui.render(); if (n !== 4) A.recentre(); A.numbers(); ui.render(); if (n !== 4) A.recentre(); A.saveURL(); A.pokeStrip();
  };
  ui.startChanged = () => { if (S.step === 1 && !L.s1) { L.s1 = true; A.startReveal(); } L.sh = null; if (S.step === 3) { L.g3 = 0; L.sh = ui.sharp(); S.m = L.sh.at; A.pokeStrip(); } if (S.step === 2) { L.g2 = 0; ui.route(); } if (S.step === 5) routes5(); core.solve(); core.numbers(); if (S.step !== 5) ui.route(); ui.render(); };
  ui.timeChanged = end => { if (S.step === 0) { if (S.tool === "to") ui.route(); if (S.tool && (end || S.tool !== "sta")) ui.render(); } else if (S.step === 3 && L.g3 && end) ui.render(); };
  // a station was named (tapped or typed): what does that mean here?  true = handled
  ui.named = k => {
    if (S.step === 2 && S.dest < 0) { if (k !== S.cx) { S.dest = k; L.g2 = 0; ui.route(); ui.render(); A.moved = false; A.recentre(); A.saveURL(); } return true; }
    if (S.step === 5) { if (S.alt < 0 && k !== S.cx) { S.alt = k; L.g5 = 0; routes5(); ui.render(); A.moved = false; A.recentre(); A.saveURL(); } return true; }
    if (S.step === 0 && !S.game && S.tool === "to") { if (k !== S.cx) { S.dest = k; ui.route(); ui.render(); A.moved = false; A.recentre(); A.saveURL(); } return true; }
    return S.step === 2 || S.step === 3;
  };
  ui.tapStation = k => { if (S.follow && !S.follow.race) return true; if (S.game) { ui.gameTap(k); return true; } if (S.step === 4 || S.step === 6) return true; return ui.named(k); };
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
  const raceCam = () => { const f = A.free(), w = f[2] - f[0], h = f[3] - f[1], XY = D.stopXY, r = L.rc, x = (XY[2 * r.loc.from] + XY[2 * r.loc.to]) / 2, y = (XY[2 * r.loc.from + 1] + XY[2 * r.loc.to + 1]) / 2; A.look({ x, y, mpp: Math.max(8, 6700 / Math.min(h * .9, w * 1.6)), yaw: -.506, pitch: 0, ox: (f[0] + f[2]) / 2 - innerWidth / 2, oy: (f[1] + f[3]) / 2 - innerHeight / 2 }); };
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
  ui.goTo = () => {
    if (S.dest < 0) return `<p class="big">${z().toPick}</p><button type="button" class="x" data-a="to" aria-label="${z().close}">×</button>`; const l = A.legs; if (!l || !l.length) return `<p class="big s">${z().toFrom(name(S.cx), name(S.dest))}</p><p class="bd">${z().toNone}</p>${[S.cx, S.dest].some(k => D.routes[A.cxRoutes[k][0]][0] === "SI") ? `<p class="sm">${z().sir}</p>` : ""}<button type="button" class="x" data-a="to" aria-label="${z().close}">×</button>`;
    const { wait, chg, ride, t, html } = legsBar(l);
    const tm = Math.ceil(t / 60), rd = n0(ride / 60), ch = Math.min(tm - rd, n0(chg / 60)); return `<button type="button" class="x" data-a="to" aria-label="${z().close}">×</button><p class="big s">${z().toFrom(name(S.cx), name(S.dest))}</p><p class="bd">${z().toMin(tm, z().time((S.m | 0) + tm))}</p>${html}<p class="sm">${z().legMin(tm - rd - ch + "", ch + "", rd + "")}</p><ol class="legs">${l.map(q => `<li>${A.letters([q.route])}<span>${esc(D.stops[q.from][1])} → ${esc(D.stops[q.to][1])}</span><em>${z().time((S.m | 0) + q.dep / 60)}</em></li>`).join("")}</ol><div class="row"><button type="button" class="main" data-a="ridealong">${z().ridealong}</button><button type="button" data-a="swap">${z().swap}</button></div>`;
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
  ui.close = () => { $("#modal").hidden = true; $("#modal").innerHTML = ""; ui.reopen = null; if (ui.back?.isConnected) ui.back.focus({ preventScroll: true }); ui.back = null; };
  const order = [...Array(net.nC).keys()].sort((a, b) => A.weight[b] - A.weight[a]); const items = (q, n = 60) => { const s = q.trim().toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean); const r = order.filter(k => { const n = (A.cxName[k] + " " + D.complexes[k][1].map(x => D.stops[x][1]).join(" ")).toLowerCase().replace(/[^a-z0-9 ]/g, " "); return s.every(w => n.split(/\s+/).some(p => p.startsWith(w))); }); return r.slice(0, n).map(k => `<li><button type="button" data-a="pick" data-v="${k}"><span>${name(k)}</span><span>${A.letters(A.cxRoutes[k])}</span></button></li>`).join("") || `<li class="sm">${z().none}</li>`; };
  ui.find = () => {
    ui.modal(`<h2>${S.step === 2 ? z().w1 : S.step === 5 ? z().h1 : S.step === 1 ? z().s1 : z().find}</h2><input type="search" autocomplete="off" spellcheck="false" aria-label="${z().typeName}" placeholder="${z().typeName}"><ul class="list">${items("")}</ul>`, "find", ui.find); const i = $("#modal input"); i.addEventListener("input", () => { $("#modal .list").innerHTML = items(i.value); }); i.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); e.stopPropagation(); $("#modal .list button")?.click(); } });
  };
  ui.about = () => ui.modal(`<h2>${z().aboutH}</h2>${z().aboutP.map(p => `<p>${p}</p>`).join("")}<h3>${z().aboutQ}</h3><p>${z().aboutA}</p><div class="row"><button type="button" data-a="lesson">${z().tools.lesson}</button></div><div class="src">${z().src}</div>`, "about", ui.about);
  // ---------- clicks
  const act = {
    lay: v => { if (v === 'open') L.lay = !L.lay; else { S[v] = !S[v]; if (v === 'homes') { A.refit(); if (A.moved) A.look({ pitch: S.homes ? .62 : 0 }); } } ui.tools(); document.querySelector(`#layers [data-v="${v}"]`)?.focus({ preventScroll: true }); A.saveURL(); A.poke(); },
    best: v => A.setTime(+v, true),
    lim: () => { if (S.game || (S.step && S.step < 6)) return; S.lim = LIMS[(LIMS.indexOf(S.lim) + 1) % LIMS.length] || 30; A.startReveal(); A.pokeStrip(); core.solve(); ui.ask(); A.numbers(); ui.render(); if (!A.moved) A.recentre(); A.saveURL(); },
    find: () => { if (!S.game && !(S.follow)) ui.find(); }, close: () => ui.close(), recentre: () => { if (S.follow?.race) return raceCam(); A.recentre(); },
    pick: v => { ui.close(); const k = +v; if (!ui.named(k)) { A.moved = false; A.setStart(k, false, true); } },
    next: () => ui.goStep(S.step >= 5 ? 6 : S.step + 1), g2: v => { L.g2 = +v; ui.render(); }, g3: v => { L.g3 = +v || 1; S.playing = false; A.setTime(L.sh.at + 1, true); ui.render(); core.solve(); A.numbers(); }, late: v => { A.setTime(L.sh.at + +v, true); ui.scene(); core.solve(); A.numbers(); }, g5: v => { L.g5 = v; ui.render(); }, again2: () => { S.dest = -1; L.g2 = 0; A.legs = null; ui.render(); A.recentre(); }, again5: () => { S.alt = -1; L.g5 = 0; routes5(); ui.render(); A.recentre(); }, prev: () => ui.goStep(S.step - 1), skip: () => ui.goStep(0), lesson: () => { ui.close(); for (const k of ["s1", "s4", "night", "g2", "g3", "g5"]) L[k] = 0; ui.goStep(1); }, free: () => ui.goStep(0),
    ch: v => { S.ch = +v; L.s3 = true; L.seen = (L.seen || new Set()).add(v); L.s3n = L.seen.size; A.pokeStrip(); core.solve(); A.numbers(); ui.route(); ui.render(); A.saveURL(); },
    min: () => { S.view = S.view === "min" ? "map" : "min"; A.moved = false; A.recentre(); ui.render(); A.recentre(); A.saveURL(); },
    chg: () => { S.tool = S.tool === "chg" ? "" : "chg"; if (!S.tool && S.ch < 9) { S.ch = 9; A.pokeStrip(); } S.dest = -1; A.legs = null; ui.render(); A.saveURL(); }, sta: () => { S.tool = S.tool === "sta" ? "" : "sta"; S.dest = -1; A.legs = null; ui.render(); },
    to: () => { S.tool = S.tool === "to" ? "" : "to"; if (!S.tool) { S.dest = -1; A.legs = null; } ui.render(); A.saveURL(); }, play: () => { S.playing = !S.playing; ui.tools(); A.poke(); }, game: () => ui.gameOpen(), keep: () => ui.keep(),
    race: v => raceGo(+v), raceAgain: () => { L.night = false; ui.raceSetup(511); ui.render(); raceCam(); }, raceNight: () => { const { four, six } = ui.raceNightData(); L.night = true; const trips = [four, six].filter(Boolean).sort((a, b) => a.dep - b.dep); const f = S.follow; const sd = t => t === four ? -1.15 : 1.15; f.race.trips = trips.map(t => ({ trip: t.trip, x0: t.x, clock0: t.dep, x1: t.x + t.ride, side: sd(t) })); f.race.legs = trips.map(t => ({ ...t, w: .8, side: sd(t) })); S.m = trips[0].dep / 60; const end = trips[0].dep / 60 + trips[0].ride / 60 + .5; f.tick = dt => { S.m += dt / 1000 * 1.55; if (S.m >= end || A.calm) { S.m = end; f.tick = null; } A.pokeStrip(); return true; }; ui.render(); },
    ridealong: () => { ui.ride(A.legs.map(l => ({ ...l })), Math.floor(S.m)); }, swap: () => { const a = S.cx; const d = S.dest; S.cx = d; S.dest = a; core.solve(); ui.route(); ui.ask(); A.moved = false; A.recentre(); ui.render(); A.saveURL(); A.pokeStrip(); },
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
    if (S.follow?.race && A.legStops) { const sl = A.G.cam.slot; for (const l of S.follow.race.legs) for (const q of A.legStops(l)) { const c = A.G.project(q[0] + q[2] * sl, q[1] + q[3] * sl); g.beginPath(); g.arc(c[0], c[1], 3.6, 0, 7); g.fillStyle = `rgb(${pal.dotFill.map(v => v * 255 | 0)})`; g.fill(); g.lineWidth = 1.6; g.strokeStyle = ink; g.stroke(); } for (const r of S.follow.race.trips) { const p = A.trainSeg(r.trip, A.raceX(r, S.m * 60), null, 170, 1, 1, r.side); if (!p) continue; const sl = A.G.cam.slot, q = A.G.project(p[0] + p[2] * sl, p[1] + p[3] * sl), n = A.routeName(D.patRoute[D.tripPat[r.trip]]); g.font = `bold 21px ${FONT()}`; g.textAlign = "center"; g.lineJoin = "round"; g.strokeStyle = `rgb(${pal.land.map(v => v * 255 | 0)})`; g.lineWidth = 5; g.fillStyle = ink; const x = q[0] + (r.side > 0 ? 18 : -18); g.strokeText(n, x, q[1] + 6); g.fillText(n, x, q[1] + 6); g.fillStyle = "#" + D.routes[D.patRoute[D.tripPat[r.trip]]][2]; g.fillRect(x - 7, q[1] + 10, 14, 3); } g.textAlign = "left"; }
    if (S.follow?.legs) { const s = S.follow.state, q = A.G.project(s.x, s.y); g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.arc(q[0], q[1], 13, 0, 7); g.stroke(); }
    ui.moreOver?.(g, ink, pal, FONT);
  };
  ui.start = (restored) => { ui.words(); if (S.seed) { ui.gameOpen(S.seed); return; } if (S.step) { const n = S.step, d = S.dest, e = S.alt, m = S.m; if (n > 1) L.s1 = true; ui.goStep(n); if (n > 1 && d >= 0) { S.dest = d; S.alt = e; if (n === 2) ui.route(); if (n === 5) routes5(); ui.render(); A.recentre(true); } else if (n === 1 && restored) { L.s1 = false; S.m = m; ui.render(); } return; } if (S.dest >= 0) { S.tool = "to"; core.solve(); ui.route(); } ui.render(); A.recentre(true); };
  initMore(A, core, ui);
}
