import * as E from "./engine.js"; import "./lpi.js";
import { loadCity } from "./city.js"; import { Stage, PAINT, AVN } from "./stage.js"; import { Sim } from "./sim.js"; import { T as DICT } from "./i18n.js"; import { piles } from "./chart.js"; import { about } from "./about.js"; import { poster } from "./poster.js";
const $ = s => document.querySelector(s), Q = new URLSearchParams(location.search);
const store = { get(k) { try { return localStorage.getItem("walk-" + k); } catch { return null; } }, set(k, v) { try { localStorage.setItem("walk-" + k, v); } catch { } } };
let lang = Q.get("lang") || store.get("lang") || (/^zh/i.test(navigator.language) ? "zh" : "en"); if (lang !== "en") lang = "zh"; let t = DICT[lang];
let theme = Q.get("theme") || store.get("theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
const st = new Stage($("#cv")); st.theme = theme;
const node = (a, s, e = 0, n = 0) => ({ a: E.AVE.findIndex(v => v.id === a), s: s - 46, e, n });
export const TRIPS = { 1: { from: node("6", 53), to: node("5", 56, 1), seed: 536 }, 2: { from: node("Lex", 48), to: node("2", 56), seed: 453 }, 3: { from: node("5", 53), to: node("2", 59, 0, 1), seed: 137 } };
const phone = () => innerWidth <= 860 && innerHeight > innerWidth;
let cur = null, sim = null, last = 0, playing = false, fast = 1, token = 0;

// ---------- small helpers
const h = (tag, at = {}, ...kids) => { const e = document.createElement(tag); for (const k in at) k === "on" ? e.addEventListener("click", at[k]) : k === "html" ? e.innerHTML = at[k] : at[k] != null && e.setAttribute(k, at[k]); kids.flat().forEach(c => c != null && e.append(c)); return e; };
const btn = (txt, on, cls = "btn", id) => h("button", { class: cls, on, id }, txt);
function setBody(...k) { $("#body").replaceChildren(...k.flat().filter(Boolean)); }
function setAct(...k) { $("#act").replaceChildren(...k.flat().filter(Boolean)); }
const prog = n => h("div", { class: "prog", "aria-label": t.stepOf(n, 3) }, [1, 2, 3].map(i => h("i", { class: i <= n ? "on" : "" })));
function row(a, txt) { const n = h("span", { class: "n" }); const r = h("div", { class: "row" }, h("span", { class: "nm" }, h("b", { style: `background:${a.color}` }), a.name), h("span", { class: "tx" }, txt || ""), n); a.row = r; a.num = n; n.innerHTML = `<small>${t.stood}</small>0:00`; return r; }
function tick() { if (!sim) return; for (const a of sim.actors) if (a.num) a.num.innerHTML = `<small>${t.stood}</small>${t.mmss(sim.waited(a))}`; }
const read = E.saver();   // the rule: red ahead and the other way open? take it
function lettering(aves, streets, trip) {
  const L = []; const p = E.pos(trip.from), q = E.pos(trip.to), y0 = Math.min(p.y, q.y), x0 = Math.min(p.x, q.x);
  for (const id of aves) { const A = E.AVE.find(v => v.id === id); L.push({ x: A.x + (id === "Park" ? 8 : 0), y: trip.ly ?? y0 - 34, s: AVN[id], v: 1, h: 8, min: 12, max: 30 }); }
  for (const n of streets) { const S = E.ST.find(v => v.n === n); L.push({ x: trip.lx ?? x0 - 42, y: S.y, s: n + " ST", v: 0, h: 6, min: 12, max: 26 }); }
  return L;
}
function fitTrip(trip, snap) {
  const p = E.pos(trip.from), q = E.pos(trip.to), b = { x0: Math.min(p.x, q.x) - 22, x1: Math.max(p.x, q.x) + 22, y0: Math.min(p.y, q.y) - 20, y1: Math.max(p.y, q.y) + 22 };
  const pad = phone() ? { l: trip.padL || 34, r: 26, t: st.H < 380 ? 40 : 60, b: st.H < 380 ? 26 : trip.padB || 84 } : { l: 110, r: 80, t: 84, b: 110 }; pad.max = trip.max || 4.4; st.look(st.fit(b, pad), snap);
}
function focusOn(trip, m = 56) { const p = E.pos(trip.from), q = E.pos(trip.to); st.focus = { x0: Math.min(p.x, q.x) - m, x1: Math.max(p.x, q.x) + m, y0: Math.min(p.y, q.y) - m, y1: Math.max(p.y, q.y) + m }; }
function show(trip, snap) { focusOn(trip, trip.m); st.sim = sim; st.ask = null; st.goal = { ...E.pos(trip.to), ...(trip.goal || {}) }; st.names = trip.names; fitTrip(trip, snap); st.dirty = true; }
function stopAll() { token++; playing = false; fast = 1; hideAsk(); $("#skip").hidden = true; $("#toks").hidden = true; st.extra = null; st.onpick = null; $("#cv").style.cursor = ""; }
function play(done) { playing = true; st.rate = 0; const my = token; $("#skip").hidden = false; play.done = () => { if (my !== token) return; playing = false; st.rate = 0; $("#skip").hidden = true; tick(); st.dirty = true; done && done(); }; }
const hideAsk = () => { $("#ask").hidden = true; $("#ask").replaceChildren(); st.ask = null; st.hot = null; };

// ---------- the clock
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; st.size() && cur && cur.refit && cur.refit();
  if (playing && sim && !sim.asking) {
    let rate = cur.rate || 46; const me = sim.actors[0]; if (cur.lead && me.mode === "done") rate = 120; else { let m = 0; for (const a of sim.actors) if (a.mode === "wait" && (!cur.lead || a === me)) m = Math.max(m, (a.until - a.since) / 1.25); rate = Math.max(rate, cur.lead ? m : Math.min(m, 60)); }
    if (st.calm) rate *= 5; rate *= fast; st.rate = rate; sim.advance(dt * rate); tick(); cur.onFrame && cur.onFrame(); st.dirty = true;
    $("#skip").hidden = !!sim.asking; if (sim.asking) { st.rate = 0; cur.onAsk && cur.onAsk(sim.asking); } else if (sim.over) play.done && play.done();
  }
  if (st.ask || (st.goal && st.goal.friend) || (sim && st.goal)) st.dirty = st.dirty || !st.calm;
  st.frame(dt); requestAnimationFrame(loop);
}

// ---------- the question at a red light
function question(k, { wait, go, note }) {
  const box = $("#ask"); box.hidden = false; $("#skip").hidden = true; st.ask = k; st.dirty = true;
  const bw = btn("", () => answer(false), "bw", "bWait"), bg = btn("", () => answer(true), "bg", "bGo"); bw.innerHTML = wait; bg.innerHTML = go; box.replaceChildren(bw, bg); if (note) { const n = h("div", { class: "note" }, note); box.append(n); }
  cur.place = () => {
    const W = st.W, H = st.H, p = E.pos(k.a.p), x = st.X(p.x), y = st.Y(p.y), w1 = bw.offsetWidth, w2 = bg.offsetWidth, hh = bw.offsetHeight, n = box.querySelector(".note"), cl = (v, a, b) => Math.max(a, Math.min(b, v));
    if (W < 560) { const tot = w1 + w2 + 10, l = Math.max(8, (W - tot) / 2); bw.style.left = l + "px"; bg.style.left = l + w1 + 10 + "px"; bw.style.top = bg.style.top = H - hh - 12 + "px"; if (n) { n.style.left = "50%"; n.style.transform = "translateX(-50%)"; n.style.width = "max-content"; n.style.bottom = hh + 22 + "px"; } return; }
    const E_ = k.other === "E", sx = sim.w.sx; const L = x - w1 - 34, R = x + 64;
    const top = cl(y + 26, 60, H - hh - 60); bw.style.top = cl(y - hh - 70, 12, H - hh - 130) + "px"; bw.style.left = cl(E_ && sx < 0 ? x + 34 : L, 12, W - w1 - 12) + "px"; bg.style.top = cl(y + 30, 12, H - hh - 12) + "px"; bg.style.left = cl(E_ && sx < 0 ? x - w2 - 20 : x + 14, 12, W - w2 - 12) + "px";
    if (n) { n.style.left = cl(x + 14, 12, W - n.offsetWidth - 12) + "px"; n.style.top = cl(y + 30 + hh + 10, 12, H - n.offsetHeight - 8) + "px"; }
  }; requestAnimationFrame(() => { cur.place && cur.place(); }); cur.place(); cur.answer = answer;
  function answer(turn) { if (!sim || sim.asking !== k) return; hideAsk(); $("#skip").hidden = false; cur.place = cur.answer = null; cur.onAnswer(turn, k); }
}
const ic = { man: `<svg viewBox="0 0 24 30" width="15" height="19" style="vertical-align:-3px;margin-right:5px"><circle cx="13" cy="4" r="3" fill="#fff" stroke="#17191b" stroke-width="1.4"/><path d="M13 9 11 18l-5 9M11 18l5 4 1 6M13 10l5 5M12 10l-5 4" stroke="#17191b" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>` };

// ---------- 1: one red light
const L1 = {
  n: 1, rate: 40, lead: true,
  enter(snap) {
    const tr = this.trip = { ...TRIPS[1], goal: { friend: true, label: lang === "zh" ? "朋友" : "friend", al: "right" }, max: 3.6, padL: 62 }; tr.names = lettering(["6", "5"], [53, 54, 55, 56], { ...tr, ly: E.pos(tr.from).y - 40, lx: E.pos(tr.from).x + 96 });
    sim = new Sim(E.world(tr.seed)); this.me = sim.add({ from: tr.from, to: tr.to, main: "N", color: PAINT.you, name: t.you, badge: t.you, z: 2, thick: 5, spotX: 0, lane: 2, doneAt: 24 }); this.nb = sim.add({ from: tr.from, to: tr.to, main: "N", color: PAINT.nb, name: t.nb, badge: t.nb, policy: () => "N", z: 1, lane: -4, stand: -34, doneAt: -26, hide: false, spotX: -1 });
    st.spot = phone() ? 2.4 : 3.2; show(tr, snap); this.panel(0); sim.node(this.me); question(sim.asking, { wait: t.l1.wait, go: `${ic.man}${t.l1.go}` });
  },
  refit() { fitTrip(this.trip, true); this.place && this.place(); },
  panel(s) {
    if (s === 0) { setBody(prog(1), h("h1", {}, t.l1.h), h("p", {}, t.l1.p), h("p", { class: "dim" }, t.l1.legend)); setAct(); }
    if (s === 1) { setBody(prog(1), h("h1", {}, t.l1.h), h("p", { class: "dim" }, t.l1.run), h("div", { class: "rows" }, row(this.me), row(this.nb))); setAct(); }
  },
  onAnswer(turn) { this.turn = turn; this.me.policy = turn ? read : () => "N"; this.nb.policy = turn ? () => "N" : read; sim.t = 0; sim.asking = null; this.me.mode = this.nb.mode = "node"; sim.node(this.nb); sim.node(this.me); this.panel(1); play(() => this.end()); },
  end() {
    st.goal.label = null; const d = this.nb.done - this.me.done, win = d > 3, tie = Math.abs(d) <= 3; (win ? this.me : this.nb).row.classList.add("win");
    const rows = h("div", { class: "rows" }, this.me.row, this.nb.row); const cv = h("canvas", { class: "ch", role: "img" });
    const data = []; for (let i = 1; i <= 10; i++) { const w = E.world(i); data.push([E.run(w, this.trip.from, this.trip.to, E.straightN).wait, E.run(w, this.trip.from, this.trip.to, read).wait]); }
    const w = data.filter(v => v[0] - v[1] > 3).length, l = data.filter(v => v[1] - v[0] > 3).length;
    setBody(prog(1), h("p", { class: "big" }, win ? t.l1.win(t.dur(d)) : tie ? t.l1.tie : t.l1.lose(t.dur(-d))), rows, h("p", {}, win ? t.l1.why : t.l1.whyLose), win ? [cv, h("p", { class: "dim" }, t.l1.ten(w, 10 - w - l, l))] : null);
    if (win) tenDots(cv, data, [t.l1.tenA, t.l1.tenB]);
    setAct(win ? btn(t.next, () => go("2"), "btn", "next") : btn(t.other, () => go("1"), "btn", "again"));
  }
};
function tenDots(cv, data, names) {
  const W = cv.clientWidth || 340, d = Math.min(2, devicePixelRatio || 1), H = 86; cv.width = W * d; cv.height = H * d; cv.style.height = H + "px"; const x = cv.getContext("2d"); x.scale(d, d); const cs = getComputedStyle(document.documentElement); const ink = cs.getPropertyValue("--ink"), dim = cs.getPropertyValue("--dim");
  x.font = `500 ${lang === "zh" ? 13 : 15}px Sofia, ZH, "PingFang SC", sans-serif`; x.textBaseline = "middle"; const lw = Math.max(...names.map(n => x.measureText(n).width)) + 14, step = (W - lw) / 10;
  names.forEach((n, r) => { const y = 22 + r * 42; x.fillStyle = dim; x.fillText(n, 0, y); x.strokeStyle = cs.getPropertyValue("--line"); x.beginPath(); x.moveTo(lw, y); x.lineTo(W, y); x.stroke(); data.forEach((v, i) => { const s = v[r], R = Math.max(2, Math.sqrt(s) * step * .48 / 11.8); x.beginPath(); x.arc(lw + step * (i + .5), y, R, 0, 7); x.fillStyle = PAINT.wait; x.fill(); if (R > 8) { x.fillStyle = "#1a0d05"; x.textAlign = "center"; x.font = "700 11px Sofia"; x.fillText(Math.round(s), lw + step * (i + .5), y + .5); x.textAlign = "left"; x.font = `500 ${lang === "zh" ? 13 : 15}px Sofia, ZH, "PingFang SC", sans-serif`; } }); });
}

// ---------- 2: three ways
const shape = k => `<svg viewBox="0 0 46 52" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><path d="${{ a: "M8 46V7H38", b: "M8 46V32H18V20H28V7H38", c: "M8 46H38V7" }[k]}"/></svg>`;
const L2 = {
  n: 2, rate: 62,
  enter(snap) {
    const tr = this.trip = { ...TRIPS[2], max: 2 }; tr.names = lettering(["Lex", "3", "2"], [48, 50, 52, 54, 56], tr);
    this.build(); show(tr, snap); this.pickd = null;
    setBody(prog(2), h("h1", {}, t.l2.h), h("p", {}, t.l2.p), ["a", "b", "c"].map(k => { const b = h("button", { class: "pick", on: () => this.pick(k), id: "p" + k }); b.innerHTML = `<b>${k.toUpperCase()}</b>${shape(k)}<span>${t.l2[k]}</span>`; return b; })); setAct();
  },
  build() { sim = new Sim(E.world(this.trip.seed)); const P = { a: E.straightN, b: read, c: E.straightE }; this.A = ["a", "b", "c"].map((k, i) => sim.add({ from: this.trip.from, to: this.trip.to, main: "N", policy: P[k], color: PAINT[k], name: k.toUpperCase(), badge: k.toUpperCase(), lane: (i - 1) * 5, spotX: i - 1, stand: (i - 1) * 18, doneAt: (i - 1) * 22, k })); st.spot = phone() ? 1.3 : 1.7; st.sim = sim; },
  refit() { fitTrip(this.trip, true); },
  pick(k) { if (this.pickd) return; this.pickd = k; setBody(prog(2), h("h1", {}, t.l2.h), h("p", { class: "dim" }, t.l2.run), h("div", { class: "rows" }, this.A.map(a => row(a, t.l2[a.k])))); this.A.forEach(a => { a.row.classList.add("narrow"); if (a.k === k) a.row.classList.add("mine"); }); sim.start(); play(() => this.end()); },
  end() {
    const [a, b, c] = this.A, hit = this.pickd === "b"; b.row.classList.add("win"); const rows = h("div", { class: "rows" }, this.A.map(x => x.row)), cv = h("canvas", { class: "ch", role: "img" }), cap = h("p", { class: "dim" });
    setBody(prog(2), h("p", { class: "big" }, hit ? t.l2.right : t.l2.wrong), rows, h("p", {}, t.l2.why()), cv, cap); setAct(btn(t.next, () => go("3"), "btn", "next"));
    const D = [[], [], []], my = token; let i = 1; const tr = this.trip; const work = () => { if (my !== token) return; const e = Math.min(1000, i + 99); for (; i <= e; i++) { const w = E.world(i); D[0].push(E.run(w, tr.from, tr.to, E.straightN).wait); D[1].push(E.run(w, tr.from, tr.to, read).wait); D[2].push(E.run(w, tr.from, tr.to, E.straightE).wait); } if (i <= 1000) return setTimeout(work, 0); const best = D[0].filter((v, j) => D[1][j] < v - 1 && D[1][j] < D[2][j] - 1).length, sv = D[0].map((v, j) => v - D[1][j]).sort((p, q) => p - q)[500]; piles(cv, D.map((v, j) => ({ v, label: "ABC"[j], color: PAINT.wait })), { lang, t }); cap.textContent = t.l2.chart(best, t.dur(sv)); }; setTimeout(work, 60);
  }
};

// ---------- 3: your own walk
const L3 = {
  n: 3, rate: 52, lead: true,
  enter(snap, o = {}) {
    const tr = this.trip = { ...TRIPS[3], goal: { label: lang === "zh" ? "缆车站" : "Tram", al: "right" }, max: 1.6, padL: 24 }; if (!o.keep) this.prev = null; this.seed = o.seed || tr.seed; tr.names = lettering(["5", "Mad", "Park", "Lex", "3", "2"], [53, 55, 57, 59], { ...tr, lx: E.pos(tr.from).x + 78 });
    this.ch = o.choices || []; this.build(); show(tr, snap); this.follow(true); this.toks();
    setBody(prog(3), h("h1", {}, t.l3.h), h("p", {}, t.l3.p)); setAct(btn(t.l3.start, () => this.begin(), "btn", "start")); if (o.auto) this.begin();
  },
  build() { sim = new Sim(E.world(this.seed)); const tr = this.trip; this.me = sim.add({ from: tr.from, to: tr.to, main: "N", color: PAINT.you, name: t.you, z: 2, thick: 5, lane: 2 }); this.nb = sim.add({ from: tr.from, to: tr.to, main: "N", color: PAINT.nb, name: t.nb, policy: E.straightN, z: 1, lane: -3, spotX: -1, stand: -14 }); st.spot = phone() ? 1.5 : 1.8; st.sim = sim; this.hist = []; },
  refit() { this.trip && fitTrip(this.trip, true); this.follow(true); this.place && this.place(); },
  follow(snap) { if (!sim || sim.over) return; const a = sim.at(this.me), g = E.pos(this.trip.to); if (!phone()) { const b = { x0: a.x - 30, x1: Math.max(a.x + 210, Math.min(g.x + 24, a.x + 400)), y0: a.y - 30, y1: Math.max(a.y + 170, Math.min(g.y + 24, a.y + 290)) }; return st.look(st.fit(b, { l: 130, r: 70, t: 80, b: 130, max: 2.4 }), snap); } const b = { x0: a.x - 40, x1: Math.max(a.x + 170, Math.min(g.x + 20, a.x + 330)), y0: a.y - 45, y1: Math.max(a.y + 120, Math.min(g.y + 20, a.y + 260)) }; st.look(st.fit(b, { l: 14, r: 14, t: 56, b: 92, max: 2.2 }), snap); },
  toks() { const n = E.crossings(this.me.p, this.trip.to).E, tot = E.crossings(this.trip.from, this.trip.to).E, box = $("#toks"); box.hidden = false; if (box.dataset.n === n + lang) return; box.dataset.n = n + lang; box.innerHTML = `<span>${t.l3.tok(n)}</span>` + Array.from({ length: tot }, (_, i) => `<svg viewBox="0 0 22 18" class="${i < n ? "" : "off"}"><path d="M2 9h15M11 3l7 6-7 6" stroke="#ffcf1f" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`).join(""); },
  begin() { setBody(prog(3), h("h1", {}, t.l3.h), h("div", { class: "rows" }, row(this.me), row(this.nb)), h("p", { class: "dim" }, t.l3.tip)); setAct(); sim.start(); play(() => this.end()); if (sim.asking) { st.rate = 0; this.onAsk(sim.asking); } },
  onFrame() { this.toks(); this.follow(); },
  onAsk(k) {
    const i = this.hist.length; k.st = FREE.name(k.a.p); if (i < this.ch.length) return this.onAnswer(this.ch[i], k, true);
    this.follow(); const L = E.light(sim.w, k.a.p.a, k.a.p.s, k.other, sim.t), q = E.windows(sim.w, k.a.p.a, k.a.p.s), clr = q[k.other][2] - q[k.other][1] + 5, n = E.crossings(k.a.p, this.trip.to).E - (k.cross ? 0 : 0);
    // what a person can tell from the light at the right: figure on = at least the whole countdown and 5 s; counting = the number and 5 s
    const sec = L.st === "walk" ? t.l3.atleast(Math.ceil(clr)) : L.st === "flash" ? t.l3.about_(Math.ceil(L.left) + 5) : k.wait < 8 ? t.l3.soon : t.l3.long, side = L.st === "walk" ? t.l3.s_walk : L.st === "flash" ? t.l3.s_flash(Math.max(1, Math.ceil(L.left))) : t.l3.s_stop;
    question(k, { wait: t.l3.wait + `<small>${t.l3.side}${side}<br>${sec}</small>`, go: (L.st === "walk" && k.cross ? ic.man : "") + (k.cross ? t.l3.goX : t.l3.goF) + `<small>${t.l3.cost(k.cross ? n : n + 1, k.cross)}</small>` });
  },
  onAnswer(turn, k) { this.hist.push({ turn, st: k.st, wait: k.wait, cross: k.cross }); sim.choose(turn); st.dirty = true; if (sim.asking) this.onAsk(sim.asking); },
  end() {
    const a = sim.waited(this.me), b = sim.waited(this.nb), d = b - a, ok = d >= 60; st.goal.label = null; $("#toks").hidden = true; if (Math.abs(d) > 3) (d > 0 ? this.me : this.nb).row.classList.add("win"); this.ch = this.hist.map(x => x.turn); store.set("walk", JSON.stringify({ seed: this.seed, ch: this.ch }));
    const waste = this.hist.findIndex(q => q.turn && q.wait <= 12), stood = this.hist.findIndex(q => !q.turn && q.wait >= 15), T = this.hist.filter(q => q.turn).length;
    const why = waste >= 0 ? t.l3.wWaste(waste + 1, this.hist[waste].st, Math.round(this.hist[waste].wait)) : stood >= 0 ? t.l3.wStood(stood + 1, this.hist[stood].st, Math.round(this.hist[stood].wait)) : ok && T && T < this.hist.length ? t.l3.wGood : ok ? "" : t.l3.wMeh;
    const chips = h("div", { class: "chips" }, this.hist.map((q, i) => { const c = h("button", { class: "chip" + (i === waste || (waste < 0 && i === stood) ? " hot" : ""), on: () => this.rewind(i) }); c.textContent = `${i + 1}. ${q.turn ? t.l3.rT(q.st, Math.round(q.wait)) : t.l3.rW(q.st, Math.round(q.wait))}`; return c; }));
    const prev = this.prev != null && Math.abs(this.prev - a) > 1 ? h("p", { class: "cmp" }, t.l3.cmp(t.mmss(this.prev), t.mmss(a), t.dur(Math.abs(a - this.prev)), a < this.prev)) : null; this.prev = a;
    setBody(prog(3), h("p", { class: "big" }, ok ? t.l3.win(t.dur(d)) : d > 3 ? t.l3.more(t.dur(d)) : t.l3.bad), prev, h("div", { class: "rows" }, this.me.row, this.nb.row), h("p", {}, t.l3.did(T, this.hist.length - T) + why), this.hist.length ? h("p", { class: "dim" }, t.l3.review) : null, chips, ok ? h("div", { class: "pair" }, btn(t.l3.god, () => this.god(), "link", "god"), btn(t.l3.newm, () => { this.prev = null; go("3", { seed: 1 + Math.floor(Math.random() * 99999) }); }, "link")) : null, ok && this.seed === TRIPS[3].seed ? h("p", { class: "dim sm" }, t.l3.hard) : null);
    this.tries = (this.tries || 0) + 1; setAct(ok ? btn(t.next, () => go("end"), "btn", "next") : btn(t.again, () => go("3", { seed: this.seed, auto: 1, keep: 1 }), "btn", "again")); if (!ok && this.tries >= 3) $("#act").append(btn(t.next, () => go("end"), "btn2", "next")); this.result = { a, b }; fitTrip(this.trip); history.replaceState(null, "", this.link()); if (this.shared) $("#body").append(btn(t.end.restart, () => go("1"), "link"));
  },
  link() { return "#3&seed=" + this.seed + "&c=" + this.ch.map(x => x ? "r" : "w").join(""); },
  rewind(i) { const ch = this.ch.slice(0, i); stopAll(); this.ch = ch; this.build(); st.goal = { ...E.pos(this.trip.to), ...this.trip.goal }; $("#toks").hidden = false; sim.start(); this.hist = []; let g = 0; while (!sim.over && g++ < 999) { if (sim.asking) { const k = sim.asking; k.st = FREE.name(k.a.p); if (this.hist.length < ch.length) { this.hist.push({ turn: ch[this.hist.length], st: k.st, wait: k.wait, cross: k.cross }); sim.choose(this.hist[this.hist.length - 1].turn); continue; } break; } sim.advance(5); } this.ch = ch; setBody(prog(3), h("h1", {}, t.l3.h), h("div", { class: "rows" }, row(this.me), row(this.nb)), h("p", { class: "dim" }, t.l3.tip)); setAct(); tick(); this.toks(); this.follow(true); play(() => this.end()); if (sim.asking) this.onAsk(sim.asking); },
  god() { stopAll(); const tr = this.trip, w = E.world(this.seed), B = E.best(w, tr.from, tr.to), seq = B.log.map(l => l.d); sim = new Sim(w); let i = 0; const G = sim.add({ from: tr.from, to: tr.to, main: "N", color: PAINT.c, name: t.gods, z: 2, thick: 5, lane: 2, policy: () => null }); G.policy = (w2, p) => B.log.find(l => E.same(l.p, p)).d; this.nb = sim.add({ from: tr.from, to: tr.to, main: "N", color: PAINT.nb, name: t.nb, policy: E.straightN, z: 1, lane: -3, spotX: -1, stand: -14 }); st.sim = sim; const body = [...$("#body").children]; const act = [...$("#act").children]; setBody(prog(3), h("h1", {}, t.gods), h("p", {}, t.l3.godP), h("div", { class: "rows" }, row(G), row(this.nb))); setAct(); sim.start(); cur = { ...L3G, back: () => { go("3r", { body, act }); } }; play(() => setAct(...act.filter(b => b.id === "next" || b.id === "again"))); fitTrip(tr); }
};
const L3G = { n: 3, rate: 70, lead: false, refit() { fitTrip(TRIPS[3], true); } };

// ---------- the end
const END = {
  n: 4, rate: 60,
  enter(snap) {
    const s = JSON.parse(store.get("walk") || "null"), tr = { ...TRIPS[3], max: 1.6 }; this.trip = tr; let w = L3.result; sim = new Sim(E.world((s && s.seed) || tr.seed)); this.me = sim.add({ from: tr.from, to: tr.to, main: "N", color: PAINT.you, thick: 6, lane: 0, ...(s ? {} : { policy: read }) }); sim.start(); let i = 0, g = 0; while (!sim.over && g++ < 2000) { if (sim.asking) { sim.choose(s && s.ch[i] != null ? s.ch[i++] : true); continue; } sim.advance(5); }
    st.spot = 1.8; show(tr, snap); st.names = lettering(["5", "Mad", "Park", "Lex", "3", "2"], [53, 55, 57, 59], { ...tr, lx: E.pos(tr.from).x + 78 });
    let A = 0, B = 0; for (let k = 1; k <= 1000; k++) { const q = E.world(k); A += E.run(q, tr.from, tr.to, E.straightN).wait / 1000; B += E.run(q, tr.from, tr.to, E.saver(10)).wait / 1000; }
    const c2 = t.end.c2.replace("{a}", t.dur(A)).replace("{b}", t.dur(B)).replace("{c}", Math.round((A - B) * 500 / 3600));
    setBody(h("h1", { style: "margin-top:22px" }, t.end.h), h("p", { class: "lead" }, t.end.p), h("p", { class: "dim" }, c2), btn(t.end.free, () => go("free"), "link", "toFree"), btn(t.end.ave, () => go("ave"), "link", "toAve"), btn(t.about.open, openAbout, "link"), btn(t.end.restart, () => go("1"), "link"));
    setAct(btn(t.end.save, () => poster(st, sim, t, lang, { A, B }), "btn", "save"), btn(t.end.share, async e => { const u = location.href.split("#")[0].replace(/\?.*/, "") + (L3.ch && L3.ch.length ? L3.link() : ""); try { await navigator.clipboard.writeText(u); } catch { const i = h("input", { readonly: "", value: u, style: "width:100%;padding:10px;font:inherit" }); $("#act").append(i); i.select(); } e.target.textContent = t.end.copied; }, "btn2", "share"));
  }, refit() { fitTrip(this.trip, true); }
};

// ---------- any two corners
const PLACES = [["5|53|0|0", "2|59|0|1", { zh: "MoMA → 缆车站", en: "MoMA → Tram" }], ["6|50|1|1", "Park|51|1|1", { zh: "无线电城 → 圣巴多罗买教堂", en: "Radio City → St. Bartholomew's" }], ["2|47|0|0", "5|59|0|0", { zh: "第二大道 47 街 → 中央公园东南角", en: "2 Av & 47 St → Central Park SE corner" }], ["Lex|51|1|1", "Lex|59|0|0", { zh: "列克星敦大道 51 → 59 街", en: "Lexington 51 → 59 St" }]];
const P = s => { const [a, b, c, d] = s.split("|"), q = node(a, +b, +c ? 1 : 0, +d ? 1 : 0); return q.a >= 0 && q.s >= 0 && q.s < E.ST.length ? q : null; }, S = p => [E.AVE[p.a].id, E.ST[p.s].n, p.e, p.n].join("|");
const FREE = {
  n: 5, rate: 62, lead: false,
  enter(snap, o = {}) { this.o = o; this.from = o.from ? P(o.from) : null; this.to = o.to ? P(o.to) : null; if (this.from && this.to && E.same(this.from, this.to)) this.to = null; if (!this.from) this.to = null; this.clamp(); this.seed = o.seed || 7; st.sim = sim = null; st.goal = null; st.focus = null; st.idle = E.world(this.seed); this.trip = { from: node("6", 47), to: node("2", 60), max: 1.3 }; st.names = lettering(["6", "5", "Mad", "Park", "Lex", "3", "2"], [47, 50, 53, 56, 59], { ...this.trip, lx: E.AVE[0].x + 120 }); fitTrip(this.trip, snap); st.onpick = p => this.tap(p); $("#cv").style.cursor = "crosshair"; this.mark(); this.panel(); },
  refit() { fitTrip(this.trip, true); },
  tap(q) { if (playing || (sim && sim.asking)) return; let b = null, bd = 1e9; for (let a = 0; a < E.AVE.length; a++) for (let s = 0; s < E.ST.length; s++) for (const e of [0, 1]) for (const n of [0, 1]) { const p = { a, s, e, n }, c = E.pos(p), d = (c.x - q.x) ** 2 + (c.y - q.y) ** 2; if (d < bd) { bd = d; b = p; } } if (!this.from || this.to) { this.from = b; this.to = null; } else if (!E.same(b, this.from)) this.to = b; this.clamp(); st.sim = sim = null; st.goal = null; this.mark(); this.panel(); this.url(); },
  clamp() { const f = this.from, g = this.to; for (const p of [f, g]) if (p && p.s === 14 && (p.a === 0 || f && g && (f.a === 0 || g.a === 0))) { p.s = 13; p.n = 1; } if (f && g && E.same(f, g)) this.to = null; },   // no 60th Street through Central Park
  url() { history.replaceState(null, "", "#free" + (this.from ? "&from=" + S(this.from) : "") + (this.to ? "&to=" + S(this.to) : "")); },
  name(p) { return lang === "zh" ? `${{ 6: "第六大道", 5: "第五大道", Mad: "麦迪逊大道", Park: "公园大道", Lex: "列克星敦大道", 3: "第三大道", 2: "第二大道" }[E.AVE[p.a].id]} ${E.ST[p.s].n} 街` : `${{ 6: "6 Av", 5: "5 Av", Mad: "Madison", Park: "Park", Lex: "Lexington", 3: "3 Av", 2: "2 Av" }[E.AVE[p.a].id]} & ${E.ST[p.s].n} St`; },
  mark() { st.extra = (c, s) => { if (s.sim) return; const pin = (p, col, txt) => { const q = E.pos(p), x = s.X(q.x), y = s.Y(q.y); c.beginPath(); c.arc(x, y, 9, 0, 7); c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = "#101214"; c.stroke(); c.font = `700 14px Sofia, "PingFang SC", sans-serif`; const w = c.measureText(txt).width + 14; c.fillStyle = "rgba(12,14,16,.92)"; c.beginPath(); c.roundRect(x - w / 2, y - 40, w, 24, 3); c.fill(); c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, x, y - 27); }; if (this.from) pin(this.from, PAINT.you, t.free.from); if (this.to) pin(this.to, "#fff", t.free.to); }; st.dirty = true; },
  panel(extra) {
    const kids = [h("h1", { style: "margin-top:16px" }, t.free.h)];
    if (this.from && this.to) {
      const w0 = E.aim(E.world(1), this.from, this.to), c = E.crossings(this.from, this.to), main = this.main = c.N >= c.E ? "N" : "E"; let A = 0, B = 0; for (let k = 1; k <= 1000; k++) { const w = E.world(k); A += E.run(w, this.from, this.to, main === "N" ? E.straightN : E.straightE).wait / 1000; B += E.run(w, this.from, this.to, E.saver(0, main)).wait / 1000; }
      const both = E.left(this.from, this.to).E && E.left(this.from, this.to).N;
      kids.push(h("p", {}, `${this.name(this.from)} → ${this.name(this.to)}`), h("p", { class: "big" }, both ? t.free.res(1, t.dur(A), t.dur(B), B < A - 2) : t.free.res(0, t.dur(A))), extra); setAct(btn(t.free.play, () => this.watch(), "btn", "watch"), both ? btn(t.free.me, () => this.mine(), "btn2", "mine") : null);
    } else { kids.push(h("p", {}, t.free.p), h("p", { class: "big" }, this.from ? t.free.tapTo : t.free.tapFrom), h("p", { class: "dim" }, t.free.presets)); kids.push(h("div", { class: "chips" }, PLACES.map(([a, b, n]) => h("button", { class: "chip", on: () => { this.from = P(a); this.to = P(b); st.sim = sim = null; this.mark(); this.panel(); this.url(); } }, n[lang]))), h("p", { class: "dim" }, t.free.only)); setAct(); }
    kids.push(this.from ? btn(t.free.reset, () => go("free"), "link") : null, btn(t.free.back, () => go("end"), "link", "back")); setBody(...kids);
  },
  run(mine) { hideAsk(); sim = new Sim(E.world(this.seed = 1 + Math.floor(Math.random() * 9999))); const o = { from: this.from, to: this.to, main: this.main }; this.me = sim.add({ ...o, color: PAINT.you, name: mine ? t.you : t.l1.tenB, z: 2, thick: 5, lane: 2, policy: mine ? null : E.saver(0, this.main) }); this.nb = sim.add({ ...o, color: PAINT.nb, name: t.nb, policy: this.main === "N" ? E.straightN : E.straightE, z: 1, lane: -3, spotX: -1, stand: -14 }); st.sim = sim; st.spot = 1.8; st.goal = { ...E.pos(this.to), label: t.free.to }; this.trip = { from: this.from, to: this.to, max: 2 }; fitTrip(this.trip); focusOn(this.trip); const rows = h("div", { class: "rows" }, row(this.me), row(this.nb)); rows.style.order = 9; $("#body").append(rows); rows.scrollIntoView({ block: "nearest" }); setAct(); sim.start(); play(() => { this.panel(h("div", { class: "rows" }, this.me.row, this.nb.row)); }); this.lead = mine; if (sim.asking) this.onAsk(sim.asking); },
  watch() { this.panel(); this.run(false); }, mine() { this.panel(); this.run(true); },
  onAsk(k) { const L = E.light(sim.w, k.a.p.a, k.a.p.s, k.other, sim.t), s = L.st === "walk" ? t.l3.s_walk : L.st === "flash" ? t.l3.s_flash(Math.max(1, Math.ceil(L.left))) : t.l3.s_stop, zh = lang === "zh", av = k.other === "E"; question(k, { wait: t.l3.wait, go: (zh ? (k.cross ? "拐弯，先过这条" : "拐弯，不用过灯") : (k.cross ? "Turn: cross here" : "Turn: no light")) + `<small>${zh ? (av ? "过大道的灯：" : "过街的灯：") : (av ? "Avenue light: " : "Street light: ")}${s}</small>` }); },
  onAnswer(turn) { sim.choose(turn); if (sim.asking) this.onAsk(sim.asking); }
};

// ---------- which avenue, and does hurrying help
const AV = {
  n: 6, rate: 80, v: 1,
  enter(snap) { this.trip = { from: node("5", 48), to: node("Mad", 56, 1), max: 2 }; this.trip.names = lettering(["5", "Mad"], [48, 50, 52, 54, 56], { ...this.trip, lx: 256 }); this.seed = 11; this.build(); show(this.trip, snap); st.goal = null; this.wins = [0, 0]; this.panel(); },
  refit() { fitTrip(this.trip, true); },
  build() { const w = E.world(this.seed, { v: this.v }); sim = new Sim(w); const mk = (id, e, c, name) => sim.add({ from: node(id, 48, e), to: node(id, 56, e), main: "N", policy: () => "N", color: c, name, thick: 5 }); this.a = mk("5", 1, PAINT.you, t.ave.a); this.b = mk("Mad", 0, PAINT.c, t.ave.b); st.sim = sim; st.spot = 1.9; },
  panel(res) {
    const out = h("output", {}, t.ave.speed(this.v)), inp = h("input", { type: "range", min: .8, max: 1.5, step: .1, value: this.v, "aria-label": "speed" }); inp.oninput = () => { if (playing) return; this.v = +(+inp.value).toFixed(1); out.textContent = t.ave.speed(this.v); }; inp.onchange = () => { if (playing) return; this.build(); this.panel(); $("#panel input").focus(); };
    setBody(h("h1", { style: "margin-top:16px" }, t.ave.h), h("p", {}, t.ave.p), h("div", { class: "speed" }, inp, out), h("div", { class: "rows" }, row(this.a), row(this.b)), res || [], btn(t.free.back, () => go("end"), "link", "back")); setAct(btn(t.ave.go, () => this.go(), "btn", "run")); tick();
  },
  go() { if (playing) return; this.seed = 1 + Math.floor(Math.random() * 9999); this.build(); this.panel(); setAct(); sim.start(); play(() => { let n = 0, d = [0, 0]; for (let i = 1; i <= 100; i++) { const f = (id, e, v) => E.run(E.world(i, { v }), node(id, 48, e), node(id, 56, e), E.straightN).t; if (f("5", 1, this.v) < f("Mad", 0, this.v)) n++; d[0] += (f("5", 1, 1) - f("5", 1, 1.3)) / 100; d[1] += (f("Mad", 0, 1) - f("Mad", 0, 1.3)) / 100; } this.panel([h("p", { class: "big" }, t.ave.res(t.dur(this.a.done), t.dur(this.b.done))), h("p", {}, t.ave.ten(n, 100)), h("p", {}, t.ave.why), h("p", { class: "dim" }, t.ave.spd(t.dur(d[0]), t.dur(d[1])))]); (this.a.done < this.b.done ? this.a : this.b).row.classList.add("win"); }); }
};

// ---------- routing
const PAGES = { 1: L1, 2: L2, 3: L3, end: END, free: FREE, ave: AV };
function go(id, o = {}, snap) { stopAll(); cur = PAGES[id]; st.idle = null; cur.enter(snap, o); if (id === "free") FREE.url(); else history.replaceState(null, "", "#" + id); $("#body").scrollTop = 0; st.dirty = true; }
function openAbout() { const d = $("#about"); d.innerHTML = about(lang, t); d.querySelector(".x").onclick = () => d.close(); d.onclick = e => { if (e.target === d) d.close(); }; d.showModal(); }
function setLang() { t = DICT[lang]; document.documentElement.lang = lang; document.title = t.title; $("#home").textContent = t.home; $("#lang").textContent = t.lang; $("#theme").textContent = t.theme[theme === "dark" ? 1 : 0]; $("#cv").setAttribute("aria-label", t.aria); $("#skip").textContent = t.skip; }
function setTheme() { document.documentElement.dataset.theme = theme; st.theme = theme; st.detail = null; st.dirty = true; document.querySelector("meta[name=theme-color]").content = theme === "dark" ? "#0e1011" : "#e3e6e4"; $("#theme").textContent = t.theme[theme === "dark" ? 1 : 0]; }
$("#lang").onclick = () => { lang = lang === "zh" ? "en" : "zh"; store.set("lang", lang); setLang(); const id = Object.keys(PAGES).find(k => PAGES[k] === cur) || "3"; const keep = id === "3" ? { seed: L3.seed, choices: L3.hist ? L3.hist.map(x => x.turn) : [] } : id === "free" ? { from: FREE.from && S(FREE.from), to: FREE.to && S(FREE.to) } : {}; if (id === "3") keep.auto = !!(L3.hist && L3.hist.length); go(id, keep); if (id === "3" && keep.auto) { L3.rewind2(keep.choices); } };
L3.rewind2 = function (ch) { this.ch = ch; this.rewind(ch.length); };
$("#theme").onclick = () => { theme = theme === "dark" ? "light" : "dark"; store.set("theme", theme); setTheme(); };
$("#skip").onclick = () => { fast = fast > 1 ? 40 : 8; };
$("#cv").addEventListener("pointerup", e => { const r = $("#cv").getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, b = st.hot; if (st.ask && b) { if (Math.abs(x - b.x) < b.rx && Math.abs(y - b.y) < b.ry) cur.answer && cur.answer(true); return; } if (st.onpick) st.onpick(st.inv(x, y)); });
addEventListener("keydown", e => { if ($("#about").open || e.metaKey || e.ctrlKey || e.altKey) return; const k = e.key; if (st.ask && cur.answer) { const o = st.ask.other, sx = sim.w.sx; const turnKey = o === "E" ? (sx > 0 ? "ArrowRight" : "ArrowLeft") : (sim.w.sy > 0 ? "ArrowUp" : "ArrowDown"); if (k === turnKey) { e.preventDefault(); return cur.answer(true); } if (k === "ArrowUp" || k === "ArrowRight" || k === "w") { e.preventDefault(); return cur.answer(false); } } if (cur === L2 && /^[abc]$/i.test(k)) L2.pick(k.toLowerCase()); if (k === "Enter" && document.activeElement === document.body) { const b = $("#act .btn"); b && b.click(); } });
addEventListener("resize", () => { st.size(); cur && cur.refit && cur.refit(); });
document.addEventListener("visibilitychange", () => { last = performance.now(); });
setLang(); setTheme(); st.size();
const H = decodeURIComponent(location.hash.slice(1)), [pid, ...rest] = H.split("&"), po = Object.fromEntries(rest.map(x => x.split("=")));
if (pid === "3" && /^[rw]*$/.test(po.c || "x") && +po.seed > 0) { go("3", { seed: Math.floor(+po.seed), auto: 1 }, true); L3.shared = true; L3.rewind2([...po.c].map(x => x === "r")); } else go(PAGES[pid] ? pid : "1", pid === "3" ? {} : po, true); requestAnimationFrame(loop);
window.__walk = { E, get sim() { return sim; }, get cur() { return cur; }, st, go, L3, TRIPS, get playing() { return playing; }, t: () => t };
loadCity("city.bin").then(() => { st.detail = null; st.dirty = true; window.__ready = (window.__ready || 0) + 1; }).catch(() => { });
st.loadMap("map.webp").then(() => { window.__ready = (window.__ready || 0) + 1; }).catch(() => { });
document.fonts && document.fonts.ready.then(() => { st.dirty = true; cur && cur.place && cur.place(); });
