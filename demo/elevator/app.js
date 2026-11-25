import { P, floorY } from "./sim.js";
import { Game, verdict, MIN, PART, CODE, isBreak } from "./core.js";
import { T, pickLang } from "./i18n.js";
import { Sound } from "./sound.js";
import { aboutHTML } from "./about.js";

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const ls = { get(k) { try { return localStorage.getItem("elevator." + k); } catch { return null; } }, set(k, v) { try { localStorage.setItem("elevator." + k, v); } catch { } } };
const mq = q => matchMedia(q), calm = mq("(prefers-reduced-motion:reduce)").matches, phone = () => innerWidth <= 760, land = () => innerWidth > 540 && innerHeight <= 540 && !phone(), touchy = mq("(hover:none)").matches;
const KEYS = ["cables", "clamps", "watcher", "brake", "motor", "weight", "grip", "cushion"], ROUTES = ["cables", "up", "nocable"];
const BAL = 4, END = 5, STUCK = 6, GAME = 7;
const START = { cables: { floor: 5, people: 1 }, up: { floor: 2, people: 0 }, nocable: { floor: 11, people: 12 } };
let lang = pickLang(), t = T[lang], view, flat = false;
const snd = new Sound(), cv = $("#gl");
const S = { ch: 1, stage: 0, g: null, found: new Set(), best: {}, pending: null, say: [], act: null, lit: {}, litT: {}, halos: [], tag: null, now: 0, slow: 1, jump: true, over: null, knife: null, orbit: null, hand: null, handV: 0, tries: 0, hints: 0, ended: null, ghost: 0, hot: false, guess: 0, up: false, down: false, goal: "cables", done: new Set(), kick: 0, zoom: null, peak: 0 };


// ---------- numbers
const tidy = s => lang === "zh" ? s.replace(/(公里\/小时|米\/秒|厘米|米) (?=[\u4e00-\u9fff])/g, "$1") : s;
const fill = (s, o) => tidy(s.replace(/\{(\w+)\}/g, (_, k) => o[k]));
const dist = m => lang === "zh" ? (m < .995 ? Math.max(1, Math.round(m * 100)) + " 厘米" : m.toFixed(1) + " 米") : (m / .3048 < .95 ? Math.round(m / .0254) + " inches" : (m / .3048).toFixed(1) + " feet");
const spd = v => lang === "zh" ? Math.round(v * 3.6) + " 公里/小时" : Math.round(v * 2.23694) + " mph";
const spd1 = v => lang === "zh" ? (v * 3.6).toFixed(1) + " 公里/小时" : (v * 2.23694).toFixed(1) + " mph";

// ---------- chapters
const setup = { 1: () => new Game({ floor: 6, people: 1 }), 2: () => { const g = new Game({ floor: 8, people: 1 }), s = g.sim; for (let i = 0; i < 6; i++) g.apply("r" + i + "a" + Math.round((s.y + 4.2 + i * .02) * 10), -10, false); s.hand = 0; for (let i = 0; i < 12000; i++) s.step(); s.events.length = 0; s.k = 0; return g; }, 3: () => new Game({ floor: 5, people: 1 }), 4: () => { const g = new Game({ floor: 4, people: 1 }); g.sim.settle(4); g.apply("b", -10, false); g.sim.k = 0; g.sim.events.length = 0; return g; }, 5: () => new Game({ floor: 10, people: 1 }), 6: () => { const g = new Game({ floor: 6, people: 1 }); g.sim.go(8); for (let i = 0; i < 5900; i++) g.sim.step(); g.sim.run = null; for (let i = 0; i < 6000; i++) g.sim.step(); g.sim.k = 0; g.sim.events.length = 0; return g; }, 7: () => new Game(START[S.goal]) };
function go(ch, { game, push = true } = {}) {
  ch = Math.max(1, Math.min(GAME, ch)); S.ch = ch; S.stage = 0; S.pending = null; S.ended = null; S.tag = null; S.lit = {}; S.hot = false; S.hand = null; S.handV = 0; S.slow = 1; S.kick = 0; S.zoom = null; S.up = S.down = false; S.stageDir = 0; S.lock = null; S.lock2 = null; S.miss = 0; S.alarm = null; S.force = null; S.reply = 0; S.guess = 0; S.tries = 0; S.hints = 0; S.moved = 0; S.slowDone = false; S.pk = 0; S.creep = false; S.live = null; S.guest = false; S.idle = S.now; S.target = null; S.k4 = null;
  if (ch === GAME && !game) S.goal = S.goalNext || ROUTES.find(r => !S.best[r]) || "cables"; S.goalNext = null; if (ch === GAME && game) S.goal = S.goal || "cables"; use(game || setup[ch]());   document.body.classList.toggle("hand", ch === 2); document.body.classList.remove("ending");
  S.head = null; S.say = [["s" + ch]]; words(); if (push) hash(true); if (snd.on) snd.hush();
}
const BRK = ["brake", "motor", "gov", "govRope", "jawL", "jawR", "buf", "cwBuf"];
function glow() { S.halos = []; for (const k of [...BRK, "ropes"]) S.lit[k] = S.now - 1.2; }
function use(g) { view?.setTall?.(S.ch === 3 || S.ch === BAL); if (view) view.co = S.ch === STUCK ? .92 : 1.36; S.g = g; g.now = S.now; S.jump = true; S.acc = 0; S.aRest = 0; S.dirty = true; view?.setRiders(g.sim.people); }
function hash(step) { let h = "#" + S.ch; if (S.ch === GAME && S.g.log.length) h += "~" + S.g.hash(); try { const u = location.pathname + location.search + h; if (step && h.slice(0, 2) !== location.hash.slice(0, 2) && location.hash) history.pushState(null, "", u); else history.replaceState(null, "", u); sessionStorage.setItem("elevator.mine", h); } catch { } }
function readHash() {
  S.auto = null;
  const h = decodeURIComponent(location.hash.slice(1)); if (!h) return go(1, { push: false });
  const m = /^([1-7])(?:~(.+))?$/.exec(h); if (!m) return go(1);
  if (m[2]) { try { const d = Game.parse(m[2]), live = d.log.length > 0, g = Game.replay(d.floor, d.people, d.log, { last: !live }); go(GAME, { game: g, push: false }); let mine = false; try { mine = sessionStorage.getItem("elevator.mine") === "#" + h; } catch { } S.guest = live && !mine; if (live) { S.say = mine ? [] : [["replay"]]; S.auto = { at: S.now + 1.2, code: d.log.at(-1)[1] }; words(); } } catch { go(GAME); S.say = [["badLink"]]; words(); } }
  else go(+m[1], { push: false });
}

// ---------- doing things
const allow = k => S.auto ? false : S.ended ? false : S.ch === 1 ? k === "rope" && S.g.sim.n > 0 : S.ch === GAME ? k !== "car" : false;
function act(code, { live } = {}) {
  const g = S.g, s = g.sim; if (S.ended || (S.auto && !live)) return false; S.idle = S.now; if (!live && S.guest) S.guest = false; if (g.log.length > 390) return false;
  const before = { y: s.y, n: s.n, ev: s.events.length, hits: s.hits.length, run: !!s.run, t: s.t };
  if (!g.apply(code, S.now)) return false; s.quiet = 0; S.dirty = true;
  if (code[0] === "p") view.setRiders(s.people);
  S.pending = { code, before, t: S.now }; S.ghost = 1; $("#sc").classList.remove("idle"); snd.play(code[0] === "r" || code[0] === "w" || code[0] === "m" ? "snip" : isBreak(code) ? "break" : "tick");
  if (code[0] === "m" && before.run || code[0] === "f" || /[UD]/.test(code)) snd.play("brake");
  if (s.n === 0) { S.lit = {}; S.halos = []; S.tag = null; } if (code[0] === "r") S.kick = Math.max(S.kick, .5); buzz(isBreak(code) ? 12 : 0); snipAnim(); hash(); tools(); ledger(); if (S.ch === GAME && (isBreak(code) || /[fUDp]/.test(code[0]))) { S.say = []; S.creep = false; S.live = null; story(); }
  if (S.ch === 1 && s.n > 0) { S.say = [["s1n", s.n]]; story(); } return true;
}
const buzz = n => { if (n && navigator.vibrate && navigator.userActivation?.hasBeenActive) try { navigator.vibrate(n); } catch { } };
function find(list, lit = [], tag = true) {
  let fresh = false; for (const k of list) if (!S.found.has(k) && !S.guest) { S.found.add(k); fresh = true; }
  if (fresh) { ls.set("found", JSON.stringify([...S.found])); snd.play("found"); }
  S.lit = {}; for (const k of lit) S.lit[k] = S.now; S.halos = lit.filter(k => k !== "ropes" && k !== "wheel" && k !== "cw").slice(0, 3).map(k => ({ key: k, a: 0, r: k === "brake" || k === "motor" ? 3 : 1.9 }));
  if (tag && list.length && lit.length) S.tag = { name: list[0], key: lit[0] === "jawL" ? "jawR" : lit[0], t: S.now }; ledger(list);
}
function judge(p) {
  p.before.peak = S.peak; const g = S.g, v = verdict(g, p.code, p.before); S.pending = null; if (!v || v.k === "out") return;
  if (S.ch === 1) { if (v.k === "clamps") { S.drop = v.a; win("q1end", [["w1"], ["take1"]], ["clamps"], ["jawL", "jawR"]); } return; }
  if (S.ch === 3 || S.ch === BAL) return;
  if (S.ch === END) { if (v.k === "gripUp") { if (!S.up) { S.up = true; S.head = "a5"; S.say = [["w5"]]; find(["grip"], ["wheel", "cwBuf"]); } words(); } else if (v.k === "cushion" || v.k === "soft") { S.down = true; win("a5b", [["w5b", P.bufS, g.sim.landV]], ["cushion"], ["buf"]); } return; }
  S.creep = /^motor/.test(v.k) ? p : false; S.say = [["v", v.k, v.a]]; const nd = nudge(v); if (nd) S.say.push([nd]); find(v.found, v.lit); words();
}
function win(head, say, found, lit) { S.head = head; S.say = say; S.hot = true; S.done.add(S.ch); snd.play("found"); if (found.length) find(found, lit); words(); }
// in the game: after a try that did not work, one line about what to try next
function nudge(v) {
  const s = S.g.sim, o = s.ok, watch = o.gov && o.govRope, go = S.goal;
  if (go === "cables") return /^(clamp|still)/.test(v.k) ? "n_again" : s.n === 6 && !watch ? "n_cutall" : s.n === 6 && (!o.brake || !o.motor || !o.buf || !o.cwBuf) && o.jawL && o.jawR ? "n_extra" : s.n === 6 && o.jawL && o.jawR ? "n_who" : s.n < 6 && watch && o.jawL && o.jawR ? "n_rest" : !watch ? "n_cutall" : null;
  if (go === "up") return !o.brake && o.motor ? "n_motor" : o.brake && !o.motor ? "n_brake" : /^(softUp|cushionTop|rest)/.test(v.k) ? "n_low" : o.brake ? "n_wheel" : null;
  return /^(clamp|still)/.test(v.k) || s.set ? "n_noticed" : !o.brake && o.motor ? "n_motor" : o.brake && !o.motor ? "n_brake" : o.brake ? "n_wheel" : /^(soft|rest)/.test(v.k) ? "n_high" : null;
}
function finish() {
  const g = S.g, way = g.way(), n = g.count(); S.ended = { way, n, v: g.sim.out.v, dir: g.sim.out.dir }; S.pending = null; if (!S.guest && !(S.best[way] <= n)) { S.best[way] = n; ls.set("best", JSON.stringify(S.best)); }
  if (g.sim.out.dir === "up") find(["weight"], ["cw"], false); document.body.classList.add("ending"); document.body.classList.remove("over"); words(); hash();
}
function undo() { const g = S.g; if (!g.log.length) return; let cut = g.log.length - 1; const kind = c => /^[fUD]/.test(c) ? "f" : c[0] === "p" ? "p" : ""; while (cut > 0 && kind(g.log[cut][1]) && kind(g.log[cut - 1][1]) === kind(g.log[cut][1])) cut--; const log = g.log.slice(0, cut); S.ended = null; S.pending = null; S.auto = null; document.body.classList.remove("ending"); const n = Game.replay(g.floor, g.people, log); n.settle(); use(n); S.lit = {}; S.tag = null; S.say = [["goal"]]; words(); hash(); }
function nextGoal() { S.goalNext = ROUTES.find(r => !S.best[r]) || "cables"; S.auto = null; go(GAME); }
function reset() { S.auto = null; if (S.ch !== GAME) return go(S.ch); if (S.ended || S.guest) return go(GAME, { game: new Game(START[S.goal]) }); const g = S.g, f = { floor: g.floor, people: S.guest ? 1 : g.sim.people }; for (const [, c] of g.log) if (c[0] === "f") f.floor = +c.slice(1); go(GAME, { game: new Game(f) }); glow(); }
function floorStep(d) { const s = S.g.sim, cur = S.target ?? Math.round((s.y - P.y1) / P.floorH) + 1, f = cur + d; if (f > 12) return act("U") && (S.target = 13, tools()); if (f < 1) return act("D") && (S.target = 0, tools()); if (act("f" + f)) { S.target = f; tools(); } }
function sendTo(f) { if (S.ch === GAME && act("f" + f)) { S.target = f; tools(); } }
async function share() { const u = location.href; try { if (navigator.share && touchy) { await navigator.share({ title: t.title, url: u }); return; } } catch (e) { if (e.name === "AbortError") return; } try { await navigator.clipboard.writeText(u); toast(t.copied); } catch { prompt(t.copyFail, u); } }
async function save() { const { poster } = await import("./poster.js"); const c = await poster({ view, S, t, lang, dist, spd, frame: draw1 }); c.toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "elevator.png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4e3); S.savedBytes = b.size; toast(t.saved); }, "image/png"); }
let toastT; function toast(m) { const e = $("#toast"); e.textContent = m; e.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove("on"), 2400); }

// ---------- words on the page
const el = (tag, txt, cls, fn) => { const e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; if (fn) e.onclick = fn; return e; };
function line(x) {
  const [k, a, b] = x;
  if (k === "s1n") return [t.s1n[a]]; if (k === "q1end") return [fill(t.s1end, { t: b.toFixed(1) })]; if (k === "v") { const w = t.v[k2(a)]; return [typeof w === "function" ? w(a === "clamps" || a === "clamp1" ? dist(b) : /cushion$|soft|motor/.test(a) ? (/motor/.test(a) ? spd1(b) : spd(b)) : b) : w].map(tidy); }
  if (k === "s4down") return [fill(t.s4down, { v: spd(a), d: dist(b) })]; if (k === "s3done") return [fill(t.s3done, { n: a })]; if (k === "s4f") return [fill(t.s4f, { f: a })]; if (k === "w5b") return [fill(t.w5b, { d: dist(a), v: spd(b) })]; if (k === "w4") return [fill(t.w4, { d: kg(Math.abs(P.Mcar + S.g.sim.people * P.person - S.g.sim.Mw)) })]; if (k === "goal" || k === "s7") return [allFound() ? t.goalFree : t.goals[S.goal]]; return [t[k]];
  function k2(q) { return q; }
}
function story() {
  const e = S.ended, say = $("#say"), act = $("#act"); $("#step").textContent = e ? "" : fill(t.step, { n: S.ch });
  let q = t["q" + S.ch]; if (S.ch === END && S.stageDir < 0) q = t.q5b; if (S.ch === GAME && allFound()) q = t.q7free; if (S.head) q = fill(t[S.head], { d: dist(S.drop || 1), n: S.g.sim.people }); if (e) q = e.dir === "up" ? t.eUp : t.eDown; if (e && allFound() && !S.guest) q = t.eAll; $("#q").classList.toggle("ans", !!S.head || !!e); $("#q").textContent = q;
  say.replaceChildren(); act.replaceChildren(); $("#coda").replaceChildren();
  if (e) {
    const got = ROUTES.filter(r => S.best[r]), sp = lang === "zh" ? "" : " ", bk = S.g.broken();
    const list = []; if (bk.rope) list.push(lang === "zh" ? `${bk.rope} 根钢缆` : bk.rope === 1 ? "1 cable" : bk.rope + " cables"); for (const k of Object.keys(CODE)) if (bk[k]) list.push(t.parts[k]); const all = got.length === 3 && !S.guest;
    const buf = e.dir === "down" && S.g.sim.ok.buf && S.g.sim.landV > 0; say.append(el("p", [fill(S.guest ? t.eDidG : t.eDid, { n: t.things(e.n) + (lang === "zh" ? "：" : ": ") + list.join(lang === "zh" ? "、" : ", ") }), e.n <= MIN[e.way] ? (e.way === "up" ? t.eBest : t.eBestW) : fill(t.eMin, { m: MIN[e.way] })].join(sp), "new"), el("p", buf ? fill(t.eBuf, { l: spd(S.g.sim.landV), b: lang === "zh" ? "20 公里/小时" : "12 mph" }) : fill(e.dir === "up" ? t.eUpS : t.eDownS, { v: spd(e.v), l: spd(S.g.sim.events.find(q => q.k === "cwbuf")?.v || e.v) }), "new"), el("p", all ? t.fin : t.take2, "take new"));
    const ul = goals(e);
    act.append(el("button", S.guest ? t.yourTurn : all ? t.freeGo : t.another, "big", S.guest ? reset : nextGoal), el("button", t.savep, "sub", save), el("button", t.share, "sub", share)); const exact = bk.rope === 6 && bk.govRope && e.n === 7; say.append(ul); $("#coda").append(el("p", e.way === "cables" ? t.coda + (exact ? t.coda7 : "") + t.coda2 : bk.rope ? t.ahaCut : (got.includes("up") && got.includes("nocable") ? t.aha : t.aha1) + (e.way === "up" ? sp + t.ahaCode : ""), "new")); return;
  }
  S.say.forEach(x => { for (const p of line(x)) if (p) say.append(el("p", p, "new" + (x[0] === "s1hist" ? " d" : x[0] === "take" ? " take" : ""))); });
  if (S.ch === 1 && !S.head) { const d = el("div"); d.id = "dots"; for (let i = 0; i < 6; i++) d.append(el("i", null, i < 6 - S.g.sim.n ? "cut" : "")); act.append(d); if (!snd.on && !S.sndAsked) act.append(el("button", t.soundOn, "sub", () => { S.sndAsked = 1; $("#sound").click(); })); }
  if (S.ch === 2) { const m = bar(fill(t.s2trip, { v: spd1(P.vTrip) })); const nm = el("small", fill(t.s2norm, { v: spd1(P.vRated) })); nm.style.left = P.vRated / 5 * 100 + "%"; m.append(nm); act.append(m); if (S.hot) act.append(el("button", t.again2, "sub", replay2)); }
  if (S.ch === 3 && S.stage === 0) act.append(el("button", t.up, "big", () => guess(1)), el("button", t.down, "big", () => guess(-1)));
  if (S.ch === BAL) { const m = bar(t.iron + " " + kg(S.g.sim.Mw)); m.classList.add("bal"); act.append(m); act.append(stepper("p")); }
  if (S.ch === END && !S.hot) { const b = S.up ? el("button", t.runDown, "big", () => run(-1)) : el("button", t.runUp, "big", () => run(1)); if (S.busy4()) b.disabled = true; act.append(b); }
  if (S.ch === STUCK && !S.hot) act.append(el("button", t.wait6, "big", () => stuck(1)), el("button", t.climb6, "big", () => stuck(0)));
  if (S.ch === GAME) { if (S.g.sim.set && S.g.sim.n === 0 && !S.pending) act.append(el("button", t.reset, "big", reset)); act.append(goals(null)); }
}
S.busy4 = () => S.ch === END && !!(S.pending || S.g.sim.run) && !(S.up && S.stageDir > 0);
const allFound = () => ROUTES.every(r => S.best[r]);
const kg = m => lang === "zh" ? Math.round(m / 10) * 10 + " 公斤" : Math.round(m * 2.2046 / 10) * 10 + " lb";
function bar(label) { const m = el("div"); m.id = "meter"; m.innerHTML = `<i></i><b></b><u></u><span></span><em>${label}</em>`; return m; }
function goals(e) { const ul = el("ul"); ul.id = "ways"; for (const r of ROUTES) { const you = S.best[r], now = e ? r === e.way : r === S.goal, li = el("li", null, (you ? "on" : "") + (now ? " now" : "")); li.append(el("span", (you ? "✓ " : "") + t.way[r]), el("span", (you ? fill(t.wayYou, { n: you }) + " · " : e && now && S.guest ? fill(t.wayThey, { n: e.n }) + " · " : "") + fill(t.wayMin, { n: MIN[r] }))); if (!e) { li.tabIndex = 0; li.role = "button"; li.onclick = () => { S.goalNext = r; go(GAME); }; li.onkeydown = q => { if (q.key === "Enter") li.onclick(); }; } ul.append(li); } return ul; }
function stuck(ok) { if (ok) { S.alarm = S.now; S.force = null; snd.play("alarm"); buzz(40); S.say = [["ring6"]]; story(); $$("#act .big").forEach(b => b.disabled = true); setTimeout(() => { if (S.ch === STUCK && S.alarm != null) { S.reply = 1; win("a6", [["w6"]], [], []); } }, 2200); } else { S.force = S.now; S.say = [["no6"]]; buzz(30); story(); snd.play("break"); } }
function replay2() { S.hot = true; S.head = null; S.lock = S.lock2 = null; S.stage = 0; use(setup[2]()); S.tag = null; S.lit = {}; S.hand = { key: -4.6, auto: 1, y: 0, t: 0 }; S.say = [["re2"]]; story(); }
function stepper(kind) { const d = el("div", null, "st"); d.append(el("span", t.riders), el("button", "−"), el("b", S.g.sim.people), el("button", "+")); const [m, p] = d.querySelectorAll("button"); m.setAttribute("aria-label", t.less); p.setAttribute("aria-label", t.more); m.onclick = () => { act("p" + (S.g.sim.people - 1)); d.querySelector("b").textContent = S.g.sim.people; }; p.onclick = () => { act("p" + (S.g.sim.people + 1)); d.querySelector("b").textContent = S.g.sim.people; }; p.className = "plus"; return d; }
function guess(d) { if (S.stage) return; S.guess = d; S.stage = 1; S.say = [["s3go"]]; S.lit = { brake: S.now + 1e6 }; S.halos = [{ key: "brake", a: 0, r: 3 }]; S.t3 = S.now; words(); }
function run(d) { if (S.busy4()) return; S.head = null; S.tag = null; S.lit = {}; use(new Game({ floor: d > 0 ? 11 : 3, people: 1 })); S.say = [["s4f", d > 0 ? 11 : 3]]; S.slipT = 0; S.f4 = 0; act(d > 0 ? "U" : "D"); S.stageDir = d; words(); }
function words() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en"; document.title = t.title; $("#title").textContent = t.title; $("#home").textContent = t.home; $("#lang").textContent = t.other; $("#lang").setAttribute("aria-label", t.otherL); $("#aboutb").textContent = t.about; $("#sound").textContent = t.sound[snd.on ? 1 : 0]; $("#sound").setAttribute("aria-pressed", snd.on); $("#theme").textContent = t.theme[isDark() ? 1 : 0]; cv.setAttribute("aria-label", t.canvas + " " + t.nobody + " " + t.keys);
  document.body.dataset.ch = S.ch; $("#prev").textContent = t.prev; $("#prev").hidden = S.ch === 1; $("#next").textContent = t.next; $("#next").hidden = S.ch === GAME || !(S.hot || S.done.has(S.ch)); $("#next").classList.toggle("hot", S.hot); $("#skip").textContent = S.ch === GAME ? t.toStart : t.skip; $("#skip").hidden = S.hot;
  story(); tools(); ledger(); kb(); layout();
}
function tools() {
  const on = S.ch === GAME && !S.ended && !S.auto, b = $("#tools"), s = S.g.sim; b.hidden = !on; document.body.classList.toggle("tools", on); $("#broke").hidden = true; if (S.ch !== GAME) return;
  $("#stP span").textContent = t.riders; $("#stP b").textContent = s.people; $("#stF span").textContent = t.floor; const f = S.target ?? Math.round((s.y - P.y1) / P.floorH) + 1; $("#stF b").textContent = f > 12 || S.target == null && s.y > 41 ? t.roof : f < 1 || S.target == null && s.y < 1.6 ? t.pit : f;
  const [pm, pp] = $$("#stP button"), [fm, fp] = $$("#stF button"); pm.disabled = s.people <= 0; pp.disabled = s.people >= 12; fm.disabled = fp.disabled = !s.canRun(); pm.setAttribute("aria-label", t.less); pp.setAttribute("aria-label", t.more); fm.setAttribute("aria-label", t.goDown); fp.setAttribute("aria-label", t.goUp);
  const free = allFound(); $("#stP").hidden = $("#stF").hidden = $("#tools i").hidden = $("#tools [data-a=share]").hidden = !free; document.body.classList.toggle("free", free); for (const k of ["undo", "reset", "share"]) $(`#tools [data-a=${k}]`).textContent = t[k]; $("#tools [data-a=undo]").disabled = !S.g.log.length;
}
const PARTS6 = ["rope", "brake", "motor", "gov", "govRope", "jawL", "jawR", "buf", "cwBuf"];
// the list on the right in the game: every part that can be broken. Click a name, or the part itself.
function ledger() {
  const on = S.ch === GAME, ol = $("#ll"), g = S.g; $("#ledger").hidden = !on; if (!on || !g) return; const n = g.count();
  $("#ledgerh span").textContent = t.partsH; $("#ledgerh em").textContent = n ? fill(t.partsN, { n }) : "";
  if (!ol.children.length) for (const k of PARTS6) { const li = el("li"), b = el("button"); b.dataset.k = k; b.append(el("span"), el("i")); b.onclick = () => { if (phone()) $("#ledger").classList.remove("open"); hitKey(k); }; b.onmouseenter = b.onfocus = () => { if (!S.ended) { S.lit = { [k === "rope" ? "ropes" : k]: S.now + 1e6 }; S.hov = k; } }; b.onmouseleave = b.onblur = () => { if (S.hov === k) { S.lit = {}; S.hov = null; } }; li.append(b); ol.append(li); }
  for (const li of ol.children) { const b = li.firstChild, k = b.dataset.k, cutN = g.cuts.filter(Boolean).length, gone = k === "rope" ? cutN === 6 && !g.cuts.some(c => c.self) : g.b[k] != null; b.firstChild.textContent = k === "rope" ? t.ropes : t.parts[k]; const self = g.cuts.filter(c => c?.self).length; b.lastChild.textContent = k === "rope" ? (self ? fill(t.snapped, { n: self }) : (6 - cutN) + " / 6") : ""; li.classList.toggle("gone", gone); b.disabled = gone || !!S.ended; }
}
function kb() { const d = $("#kb"); d.replaceChildren(); if (S.ch === 1) for (const k of Object.keys(t.key)) if (allow(k)) d.append(el("button", t.key[k], "", () => hitKey(k))); }

// ---------- time
const isDark = () => { const d = document.documentElement.dataset.theme; return d ? d === "dark" : mq("(prefers-color-scheme:dark)").matches; };
function pace() {
  const s = S.g.sim; let k = 1; if (S.ch === 3 && S.stage === 2) return 0; if (S.ch === 3 && S.stage === 1.5) return 1.5; if (S.ch === 2 && S.lock && !S.lock2) return performance.now() - S.lock < 2600 ? .004 : .3; if (S.ch === 2 && S.lock2) return .12; if (calm) return 1; if (S.ch === END && S.stageDir < 0 && s.y - P.carLow < P.bufTop && s.v < -.1) return .22; const falling = s.n === 0 && s.v < -.4 && s.hand === null;
  if (S.ch === 1 && falling) k = .22; else if (S.ch === GAME && falling && s.set) k = .3; else if (S.ch === GAME && falling && s.y > P.bufTop + 3 && -s.v < 4) k = .5; if (s.out) k = S.now - S.outAt < .16 ? .18 : 1; return k;
}
function tick(dt) {
  const g = S.g, s = g.sim; { const q = pace(); if (S.ch === 2 && q < .2) S.slow = q; else S.slow += (q - S.slow) * (1 - Math.exp(-dt * 16)); } const d = dt * S.slow; S.now += d; g.now = S.now;
  if (S.auto && S.now > S.auto.at) { const c = S.auto.code; S.auto = null; const gst = S.guest; act(c, { live: true }); S.guest = gst; tools(); }
  if (S.hand) { const age = performance.now() - S.hand.t; if (S.hand.key) S.handV = S.hand.key; else if (S.hand.flick) { if (age > 190) { S.hand = null; S.handV = 0; } } else if (age > 90) S.handV *= Math.exp(-dt * 18); s.hand = S.handV; if (S.handV > .8 && s.set) s.release(); } else if (S.ch === 2) s.hand = 0;
  let v0 = s.v, steps = 0, ev = s.events.length; if (!g.frozen()) { S.acc = (S.acc || 0) + d; while (S.acc >= s.dt) { g.step(); S.acc -= s.dt; steps++; if (S.ch === 2 && s.y < 1.95 && s.hand < 0) s.hand = 0; } }
  const T = steps * s.dt; S.aRest = T > 0 ? Math.max(-12, Math.min(45, (s.v - v0) / T)) : 0; if (Math.abs(s.v) > Math.abs(S.peak)) S.peak = s.v; if (!s.run) { if (S.target != null && Math.abs(s.v) < .05) { S.target = null; tools(); } }
  for (const e of s.events.slice(ev)) event(e);
  const gv = s.ok.govRope && !s.tripped ? Math.abs(s.v) : 0; if (s.ok.govRope && !s.set) g.gth -= s.v * T; S.govV = gv; g.govPh += gv * 5.2 * Math.min(T || 0, .05);
  if (s.set && s.v < -.15) { const y = view.Yc; if (view.spark) { view.spark(-P_RAIL, y - .44, .16, 2); view.spark(P_RAIL, y - .44, .16, 2); } }
  // what happened?
  if (s.out && S.outAt == null) { S.outAt = S.now; S.kick = 2.2; snd.play("crash"); buzz(60); } if (!s.out) S.outAt = null;
  if (s.out && !S.ended && S.now - S.outAt > 1.5) finish();
  if (S.pending && !s.out) { const p = S.pending, age = S.now - p.t, slow = !s.run && Math.abs(s.v) > .05 && Math.abs(S.aRest) < .6 && age > 2.2 && s.n > 0 && !s.ok.brake && s.ok.motor && S.ch === GAME; if ((g.frozen() || slow) && age > .55) judge(p); }
  if (S.ch === 2) { const m = $("#meter"), v = Math.max(0, -s.v); S.pk = Math.max(v, (S.pk || 0) * Math.exp(-dt * .7)); if (m) { m.children[1].style.transform = `scaleX(${Math.min(1, v / 5)})`; m.children[2].style.left = Math.min(100, S.pk / 5 * 100) + "%"; m.children[3].textContent = spd1(v); m.classList.toggle("hot", s.set); } }
  if (S.ch === 3) three(); if (S.ch === BAL) four(); if (S.ch === 2) two();
  if (S.ch === END && s.run && !S.up && s.y > 40.6 && Math.abs(s.v) < .25) { S.slipT = (S.slipT || 0) + d; if (S.slipT > 1.1) { S.up = true; S.pending = null; S.head = "a5"; S.say = [["w5"]]; find(["grip"], ["wheel", "cwBuf"]); words(); } }
  if (S.ch === END && s.run && (!S.up || S.stageDir < 0)) { const f = Math.round((s.y - P.y1) / P.floorH) + 1, past = s.y > 40.6 ? "s4r1" : s.y < 1.7 ? "s4r2" : null, key = past || f; if (key !== S.f4) { S.f4 = key; S.say = past ? [[past]] : [["s4f", f]]; story(); } }
  if ((S.ch === 1 || S.ch === GAME) && !S.ended && !S.auto) { let l = null; const av = Math.abs(s.v); if (s.n === 0 && s.v < -.8 && !s.set) l = "lFall"; else if (S.ch === GAME && s.n > 0 && !s.run && av > .2 && !s.ok.brake && !S.creep) l = (s.ok.motor ? (s.v > 0 ? "lUpS" : "lDownS") : s.v > 0 ? "lUp" : "lDown"); if (l && l !== S.live) { S.live = l; S.say = [[l]]; story(); } if (!l) S.live = null; }
  if (S.creep && g.frozen() && !s.out) { const v = verdict(g, "b", S.creep.before), q = v && /^(rest|balance|cushion)/.test(v.k) ? v : null; S.creep = false; if (q) { const on = s.w <= P.bufTop + .02 ? "restTop" : s.y - P.carLow <= P.bufTop + .02 ? "restBottom" : "balance"; S.say = [["v", on]]; find(on === "balance" ? ["weight"] : ["cushion"], on === "restTop" ? ["cwBuf"] : on === "restBottom" ? ["buf"] : ["cw"]); words(); } }
  
  S.kick *= Math.exp(-dt * 6); view.shake = calm ? 0 : S.kick; snd.frame(s.v, s.vs, gv, s.set && s.v < -.1);
}
const P_RAIL = .99;
function event(e) {
  if (e.k === "trip") { snd.play("brake"); if (S.ch === 2) { S.lock = performance.now(); S.hand = { key: -3.4, auto: 1, y: 0, t: 0 }; S.lit = { gov: S.now }; S.halos = [{ key: "gov", a: 0, r: 2.2 }]; S.tag = { name: "flyout", key: "gov", t: S.now, keep: 1 }; S.say = [["lock1"]]; story(); } } else if (e.k === "set") { snd.play("clamp"); S.kick = 1; buzz(30); if (S.ch === 2) { S.stage = 2; S.hand = null; S.lock2 = performance.now(); S.lit = { jawL: S.now, jawR: S.now }; S.halos = [{ key: "jawL", a: 0, r: 1.9 }, { key: "jawR", a: 0, r: 1.9 }]; S.tag = { name: "bite", key: "jawR", t: S.now, keep: 1 }; S.say = [["lock2"]]; story(); } else if (S.ch === 1) S.drop0 = S.g.carAll; if (S.ch !== 2) { S.zoom = S.now; } }
  else if (e.k === "buf" || e.k === "cwbuf") { if (e.v > .6) { snd.play("thud"); S.kick = Math.max(S.kick, Math.min(1, e.v / 3)); } } else if (e.k === "cwhit") { snd.play("thud"); S.kick = Math.max(S.kick, .8); } else if (e.k === "arrive") snd.play("brake"); else if (e.k === "hit" && e.v > .5) snd.play("thud"); else if (e.k === "ropeBreak") { snd.play("snip"); }
}
function three() {
  const s = S.g.sim; if (S.stage === 1 && S.now - S.t3 > .9) { S.stage = 1.5; S.t3 = S.now; act("b"); S.pending = null; S.halos = []; S.lit = {}; S.say = [["s3cut"]]; story(); }
  if (S.stage === 1.5 && s.y > s.w - .15) { S.stage = 2; S.pending = null; win(S.guess > 0 ? "a3right" : "a3wrong", [["w3"]], ["weight"], ["cw"]); }
}
function four() {
  const s = S.g.sim, m = $("#meter"), M = P.Mcar + s.people * P.person, top = P.Mcar + 12 * P.person, f = x => Math.max(0, Math.min(1, (x - P.Mcar * .8) / (top - P.Mcar * .8)));
  if (m) { const band = (2 * P.guideF + P.bearF) / P.g; m.children[1].style.transform = `scaleX(${f(M)})`; m.children[2].style.left = f(s.Mw - band) * 100 + "%"; m.children[2].style.width = (f(s.Mw + band) - f(s.Mw - band)) * 100 + "%"; m.children[4].style.left = f(s.Mw - band) * 100 + "%"; m.children[3].textContent = t.car + " " + kg(M); m.classList.toggle("hot", S.hot); }
  S.pending = null; if (!S.hot && Math.abs(s.v) < .015 && s.quiet > .4 && (s.people === 5 || s.people === 6)) win("a4", [["w4"]], ["weight"], ["cw"]);
  else if (!S.hot) { const k = s.people > 6 ? "s4much" : s.people > 1 && s.people < 5 ? "s4few" : "s4"; if (S.k4 !== k) { S.k4 = k; S.say = [[k]]; story(); } } else if (s.people < 5 || s.people > 6) { S.hot = false; S.head = null; S.k4 = null; }
}
function two() { const s = S.g.sim; if (S.lock2 && performance.now() - S.lock2 > 2300) { S.lock = S.lock2 = null; win("a2", [["w2"]], ["watcher", "clamps"], ["gov", "jawL", "jawR"]); S.tag = null; } if (!S.hot && S.moved > .5 && !s.set && !S.hand && !S.slowDone) { S.slowDone = true; S.say = [["s2slow"]]; story(); } }

// ---------- picture
function state() {
  const g = S.g, s = g.sim, lit = {}; for (const k in S.lit) { const a = S.now - S.lit[k]; lit[k] = a < 0 ? .55 + .35 * Math.sin(S.now * 4) : Math.max(0, Math.min(1, ((S.ch < GAME && S.hot ? 1e9 : 4.5) - a) / 1.2)); }
  for (const h of S.halos) h.a += ((lit[h.key] || 0) - h.a) * .15;
  return { now: S.now, cuts: g.cuts, b: g.b, lit, halos: S.halos, brakeOpen: s.run ? 1 : 0, govV: s.tripped && s.ok.gov && s.ok.govRope ? P.vTrip * 1.06 : S.govV || 0, govPh: g.govPh, gth: g.gth, gap: S.force != null ? Math.min(1, (S.now - S.force) / .7) : 0, jolt: S.force != null && S.now - S.force > 1 ? -.16 * Math.exp(-(S.now - S.force - 1) * 1.2) * Math.cos((S.now - S.force - 1) * 9) : 0, wreck: s.out && S.outAt != null ? Math.min(1, (S.now - S.outAt) * 5) : 0, light: S.alarm != null && S.now - S.alarm < 6 ? .55 + .65 * (Math.sin((S.now - S.alarm) * 7) > 0) : s.out && S.now - (S.outAt ?? S.now) > .05 ? (Math.random() < .12 ? .7 : .3) : 1, acc: S.aRest || 0, trem: S.kick, cwAll: g.cwAll, carAll: g.carAll, govCutY: g.govCutY, jump: S.jump };
}
let st;
function draw1(dt = 0) { st = state(); view.update(S.g.sim, st, dt); S.jump = false; }
let last = 0, ema = 16, dpr = 1, slowN = 0;
function loop(ts) {
  requestAnimationFrame(loop); if (document.hidden) { last = ts; return; } const raw = ts - last; last = ts; const dt = Math.min(.05, Math.max(0, raw / 1000)); if (raw < 200) ema += (raw - ema) * .05;
  if (!flat && ema > 26 && ++slowN > 45) { slowN = 0; if (dpr > 1.01) { dpr = Math.max(1, dpr * .75); layout(); } else if (view.r.shadowMap.enabled && !S.noShadow && ema > 34) { S.noShadow = true; view.cheap(); } } else if (ema < 22) slowN = 0;
  tick(dt); frame(); draw1(dt * Math.min(1, S.slow + .05)); view.look(dt, S.jumpCam); S.jumpCam = false; view.render(); dial(); tag(); cursor();
}
// camera frames
function frame() {
  const H = view.H || 12, m = view.m0 || 2, Hm = 4.7, s = S.g.sim; let b = { x0: -2.35, x1: 3.15, y0: -.5, y1: H + .1 };
  const narrow = phone() || land(); if (!narrow && (S.ch <= BAL || S.ch === STUCK)) b.y0 = m - .45; if (narrow) { b = { x0: -2.2, x1: 2.95, y0: -.5, y1: H + .1 }; if (S.ch === 1 || S.ch === 2) b.y0 = m - .25; if (S.ch === 3 || S.ch === BAL || S.ch === STUCK) b.y0 = m - .25; if (S.ch === END && S.stageDir < 0) b.y1 = m + Hm + .1; }
  if (S.ch === 2 && S.lock) { const yc = view.Yc ?? 5; b = S.lock2 ? (narrow ? { x0: -1.8, x1: 2.1, y0: yc - 1.1, y1: yc + 2.4 } : { x0: -2.6, x1: 2.9, y0: yc - 1.3, y1: yc + 2.4 }) : (narrow ? { x0: -2.3, x1: 1.2, y0: view.t0 + 1.2, y1: view.t0 + 4.1 } : { x0: -2.35, x1: 1.75, y0: view.t0 + .7, y1: view.t0 + 4.6 }); }
  document.body.classList.toggle("close2", S.ch === 2 && !!S.lock);
  if (S.ch === END && S.stageDir < 0 && s.y < 4.2) b = narrow ? { x0: -1.8, x1: 2.2, y0: -.4, y1: 3.4 } : { x0: -2.0, x1: 2.6, y0: -.5, y1: 5.6 };
  if (S.zoom != null && s.n === 0 && !s.out) { const a = S.now - S.zoom, yc = view.Yc ?? 5; document.body.classList.toggle("close", S.ch === 1 && a < .34); if (S.ch === 1 && a < .34) b = narrow ? { x0: -.1, x1: 2.1, y0: yc - 1.15, y1: yc + .95 } : { x0: -.6, x1: 2.6, y0: yc - 1.25, y1: yc + .95 }; else if (a < (S.ch === 1 ? 1.7 : 1.4)) { b = narrow ? { x0: -1.95, x1: 2.3, y0: (view.Yc ?? 5) - 1.5, y1: (view.Yc ?? 5) + 3.2 } : { x0: -2.7, x1: 3.1, y0: (view.Yc ?? 5) - 2.6, y1: (view.Yc ?? 5) + 4 }; } else S.zoom = null; } else document.body.classList.remove("close");
  if (s.out && S.outAt != null && S.now - S.outAt < 1.4) { const up = s.out.dir === "up", y = view.Yc ?? 2; b = { x0: narrow ? -2.3 : -3, x1: narrow ? 2.6 : 3.7, y0: up ? y - 1 : -.5, y1: up ? y + 6.5 : 5.2 }; }
  view.boxT = b;
}
function layout() {
  document.body.style.setProperty("--th", ($("#tools").hidden ? 0 : $("#tools").offsetHeight) + "px"); if (!view) return; const W = innerWidth, H = innerHeight; let r; const top = phone() ? (S.ledHid ? 52 : 88) : 0;
  if (phone()) { const st = $("#story").getBoundingClientRect(); r = { x: 6, y: top, w: W - 12, h: Math.max(160, st.top - top - 6) }; } else if (land()) r = S.ended ? { x: W * .52, y: 40, w: W * .46, h: H - 46 } : { x: W * .38, y: 40, w: W * .36, h: H - 46 }; else { const sw = $("#story").getBoundingClientRect().right + 24, rw = W - $("#side").getBoundingClientRect().left + 24; r = { x: sw, y: 50, w: W - sw - rw, h: H - 66 }; }
  view.resize(W, H, dpr, r); S.rect = r;
}
// the floor dial over the list
const ang = y => Math.PI * (1 - Math.max(-.09, Math.min(1.09, (y - P.y1) / (11 * P.floorH))));
function makeDial() { const d = $("#dial"); let h = `<path d="M-84 0A84 84 0 0 1 84 0"/><path d="M-100 0H100"/>`; for (let f = 1; f <= 12; f++) { const a = ang(floorY(f)), c = Math.cos(a), s = -Math.sin(a); h += `<path d="M${c * 84} ${s * 84}L${c * 78} ${s * 78}"/><text class="n" data-f="${f}" x="${c * 94}" y="${s * 94 - (f === 1 || f === 12 ? 5 : 0)}">${f}</text>`; } h += `<path class="hand" d="M0 0L0-74"/><circle class="hub" r="4"/>`; d.innerHTML = h; d.querySelectorAll(".n").forEach(n => n.onclick = () => sendTo(+n.dataset.f)); }
function dial() { const a = ang(S.g.sim.y); $("#dial .hand").setAttribute("transform", `rotate(${90 - a * 180 / Math.PI})`); }
// name of what saved you, with a leader line
function tag() {
  const e = $("#tag"), g = S.tag; if (!g || !g.keep && S.now - g.t > (S.hot ? 1e9 : 6) || S.ended) { e.classList.remove("on"); return; }
  const v = view.anchor(g.key, S.g.sim, st), p = view.project(v), r = S.rect, w = Math.min(innerWidth - 90, r.x + r.w - 10); const right = p.x < r.x + r.w * .5 || !phone(); const tx = phone() ? Math.max(12, Math.min(innerWidth - 150, p.x + 40)) : p.x + 90, ty = Math.max(r.y + 14, Math.min(r.y + r.h - 20, p.y - 46)), dx = tx - p.x, dy = ty - p.y, L = Math.hypot(dx, dy);
  e.querySelector("span").textContent = t.names[g.name] || t[g.name]; e.querySelector("span").style.transform = `translate(${tx}px,${ty - 14}px)`; e.querySelector("i").style.cssText = `width:${L}px;transform:translate(${p.x}px,${p.y}px) rotate(${Math.atan2(dy, dx)}rad)`; e.classList.add("on");
}

// ---------- scissors and hands
let mouse = null, snapT = 0;
const inTower = (x, y) => { const r = S.rect, a = view.project3(-1.9, 0, .4).x, b = view.project3(2.25, 0, .4).x, b2 = view.project3(3, 0, -1).x; return x > a - 14 && x < (y < view.project3(0, view.t0 + 1.2, 0).y ? b2 : b) + 14; };
function segD(p, a, b) { const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy, q = l ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)) : 0; return [Math.hypot(p.x - a.x - dx * q, p.y - a.y - dy * q), q]; }
function near(x, y, pad = 0) { let best = null; for (const q of view.targets(S.g.sim, st)) { if (!allow(q.key)) continue; let d = 1e9, u = 0; if (q.pts.length === 1) d = Math.hypot(x - q.pts[0].x, y - q.pts[0].y); for (let i = 1; i < q.pts.length; i++) { const [e, w] = segD({ x, y }, q.pts[i - 1], q.pts[i]); if (e < d) { d = e; u = w; } } const s = d + (q.weak || 0) * 8; if (d < q.r + pad && (!best || s < best.s)) best = { ...q, d, u, s }; } return best; }
const codeOf = q => q.key === "rope" ? "r" + q.i + (q.side === "cw" ? "b" : "a") + Math.round((q.ya + (q.yb - q.ya) * q.u) * 10) : q.key === "govRope" ? "w" + Math.round((S.g.sim.y + 2.6) * 10) : CODE[q.key];
function cutAt(x, y) { const q = near(x, y, touchy ? 8 : 0); if (q) { act(codeOf(q)); return true; } return false; }
function hitKey(k) { if (!allow(k)) return; if (k === "rope") { const i = S.g.cuts.findIndex(q => !q); if (i >= 0) act("r" + i + "a" + Math.round((S.g.sim.y + 4.1) * 10)); } else act(k === "govRope" ? "w" + Math.round((S.g.sim.y + 2.6) * 10) : CODE[k]); }
function swipe(a, b) { const X = (p, q, r, s) => { const d = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x); if (!d) return null; const u = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / d, w = ((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / d; return u >= 0 && u <= 1 && w >= 0 && w <= 1 ? w : null; };
  for (const q of view.targets(S.g.sim, st)) { if ((q.key !== "rope" && q.key !== "govRope" && q.key !== "motor") || q.weak || !allow(q.key)) continue; for (let i = 1; i < q.pts.length; i++) { const w = X(a, b, q.pts[i - 1], q.pts[i]); if (w != null) { if (act(codeOf({ ...q, u: w }))) { S.knife.n++; if (S.ch === 1) { S.knife.done = true; return; } } break; } } } }
function bind() {
  cv.addEventListener("pointerdown", e => { if (e.button) return; cv.setPointerCapture(e.pointerId); const x = e.clientX, y = e.clientY; mouse = { x, y, touch: e.pointerType !== "mouse" }; document.body.classList.add("down"); if (S.auto) { S.auto.at = 0; return; }
    if (S.ch === 2 && inTower(x, y) && !S.lock) { S.hand = { y, t: performance.now() }; S.handV = 0; return; }
    if (inTower(x, y) && !S.ended) { S.knife = { x, y, x0: x, y0: y, n: 0, hit: near(x, y, touchy ? 8 : 0) }; } else S.orbit = { x, y, yaw: view.yawT, pitch: view.pitchT }; });
  cv.addEventListener("pointermove", e => { const x = e.clientX, y = e.clientY; mouse = { x, y, touch: e.pointerType !== "mouse" };
    if (S.hand) { const now = performance.now(), dt = Math.max(8, now - S.hand.t) / 1000, dy = -(y - S.hand.y) / view.scale; S.hand.y = y; S.hand.t = now; let v = dy / dt; S.handV = S.handV * .25 + Math.max(-9, Math.min(9, v)) * .75; S.hand.peak = Math.max(S.hand.peak || 0, -S.handV); S.moved = (S.moved || 0) + Math.max(0, -dy); if (S.g.sim.set && v > .8) { S.g.sim.release(); } }
    else if (S.knife && !S.knife.done) { const k = S.knife; if (k.moved || Math.hypot(x - k.x0, y - k.y0) > 7) { const L = Math.hypot(x - k.x, y - k.y) || 1, bx = (x - k.x) / L * 5, by = (y - k.y) / L * 5; swipe({ x: k.x - bx, y: k.y - by }, { x, y }); k.moved = true; k.x = x; k.y = y; } }
    else if (S.orbit) { view.yawT = Math.max(-.5, Math.min(.95, S.orbit.yaw - (x - S.orbit.x) * .004)); view.pitchT = Math.max(-.05, Math.min(.5, S.orbit.pitch + (y - S.orbit.y) * .003)); } });
  const upf = e => { const k = S.knife; if (k && S.ch === 1 && !k.done && !k.n && !k.moved && S.g.sim.n > 0 && !near(e.clientX, e.clientY, touchy ? 8 : 0)) { S.say = [["s1miss"]]; story(); } if (k && !k.done && !k.n && (!k.moved || Math.hypot(e.clientX - k.x0, e.clientY - k.y0) < 14)) cutAt(e.clientX, e.clientY); S.knife = S.orbit = null; if (S.hand && !S.hand.key) { if (S.handV < -1.5 && performance.now() - S.hand.t < 120) { S.hand = { flick: 1, t: performance.now(), y: 0 }; } else { S.hand = null; S.handV = 0; } } document.body.classList.remove("down"); if (e.pointerType !== "mouse") mouse = null; };
  cv.addEventListener("pointerup", upf); cv.addEventListener("pointercancel", () => { S.knife = S.orbit = S.hand = null; S.handV = 0; mouse = null; document.body.classList.remove("down"); }); cv.addEventListener("pointerleave", e => { if (e.pointerType === "mouse" && !e.buttons) mouse = null; });
  cv.addEventListener("dblclick", e => { if (!inTower(e.clientX, e.clientY)) { view.yawT = .4; view.pitchT = .105; } });
  $("#next").onclick = () => go(S.ch + 1); $("#prev").onclick = () => go(S.ch - 1); $("#skip").onclick = () => go(S.ch === GAME ? 1 : GAME);
  $("#tools").onclick = e => { const a = e.target.closest("button")?.dataset.a; if (!a) return; if (a === "p-") act("p" + (S.g.sim.people - 1)); else if (a === "p+") act("p" + (S.g.sim.people + 1)); else if (a === "f-") floorStep(-1); else if (a === "f+") floorStep(1); else if (a === "undo") undo(); else if (a === "reset") reset(); else if (a === "share") share(); };
  let rp; $("#tools").addEventListener("pointerdown", e => { const q = e.target.closest(".st button"); if (!q) return; clearTimeout(rp); const again = () => { if (q.disabled) return; q.click(); rp = setTimeout(again, 110); }; rp = setTimeout(again, 420); }); for (const k of ["pointerup", "pointercancel", "pointerleave"]) addEventListener(k, () => clearTimeout(rp));
  $("#lang").onclick = () => { lang = lang === "en" ? "zh" : "en"; t = T[lang]; ls.set("lang", lang); const u = new URL(location.href); if (u.searchParams.has("lang")) { u.searchParams.set("lang", lang); try { history.replaceState(null, "", u); } catch { } } words(); if ($("#about").open) about(); };
  $("#theme").onclick = () => { document.documentElement.dataset.theme = isDark() ? "light" : "dark"; ls.set("theme", document.documentElement.dataset.theme); theme(); words(); }; mq("(prefers-color-scheme:dark)").addEventListener?.("change", () => { theme(); words(); });
  $("#sound").onclick = () => { snd.toggle(!snd.on); words(); if (snd.on) snd.play("tick"); }; $("#aboutb").onclick = about; $("#ledgerh").onclick = () => { { const o = $("#ledger").classList.toggle("open"); $("#ledgerh").setAttribute("aria-expanded", o); } };
  $$("dialog").forEach(d => d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-x]")) d.close(); }));
  addEventListener("resize", () => { layout(); S.jumpCam = true; }); addEventListener("orientationchange", () => setTimeout(layout, 200)); addEventListener("hashchange", readHash); document.addEventListener("visibilitychange", () => { if (document.hidden) snd.hush(); });
  new ResizeObserver(() => layout()).observe($("#story"));
  addEventListener("keydown", e => { if (e.metaKey || e.ctrlKey || e.altKey || $("dialog[open]") || /INPUT|TEXTAREA/.test(e.target.tagName)) return; const k = e.key, s = S.g.sim;
    if (/^[1-6]$/.test(k)) { const i = +k - 1; if (allow("rope") && !S.g.cuts[i]) act("r" + i + "a" + Math.round((s.y + 4.1) * 10)); } else { const m = { b: "brake", m: "motor", g: "gov", t: "govRope", l: "jawL", r: "jawR", c: "buf", v: "cwBuf" }[k.toLowerCase()];
      if (m) hitKey(m); else if (k === "u" || k === "U") undo(); else if (k === "n" || k === "N") $("#next").hidden || go(S.ch + 1); else if (k === "ArrowUp" || k === "ArrowDown") { const d = k === "ArrowUp" ? 1 : -1; e.preventDefault(); if (S.ch === GAME) floorStep(d); else if (S.ch === END) run(d); else if (S.ch === 2) { S.hand = { y: 0, t: 0, key: d > 0 ? 2 : e.repeat ? Math.max(-4.5, Math.min(-1, S.hand?.key || 0) - .45) : -1 }; if (d > 0 && s.set) s.release(); S.moved = (S.moved || 0) + .2; } else if (S.ch === 3 && S.stage === 0) guess(d); }
      else if (k === "ArrowLeft" || k === "ArrowRight") { if (e.target === cv || e.target === document.body) view.yawT = Math.max(-.5, Math.min(.95, view.yawT + (k === "ArrowLeft" ? .1 : -.1))); } else if ((k === "+" || k === "=" || k === "-") && (S.ch === GAME || S.ch === BAL)) { act("p" + (s.people + (k === "-" ? -1 : 1))); words(); } } });
  addEventListener("keyup", () => { if (S.hand?.key) { S.hand = null; S.handV = 0; } });
  cv.addEventListener("webglcontextlost", e => { e.preventDefault(); $("#q").textContent = t.lost; $("#say").replaceChildren(); $("#act").replaceChildren(el("button", t.reload, "go", () => location.reload())); });
}
function snipAnim() { const s = $("#sc"); s.classList.add("snap"); clearTimeout(snapT); snapT = setTimeout(() => s.classList.remove("snap"), 170); }
function six() {
  const on = S.ch === STUCK, lv = $("#lv"); lv.hidden = !on; $("#bell").hidden = !(on && S.alarm != null); $("#bub").hidden = !(on && S.reply); if (!on) return; const s = S.g.sim, f = Math.floor((s.y - P.y1) / P.floorH) + 1;
  [f, f + 1].forEach((q, i) => { const p = view.project3(-2.2, view.Y(floorY(q)) + .02, .3); lv.children[i].textContent = fill(t.held, { f: q }); lv.children[i].style.transform = `translate(${p.x}px,${p.y}px) translate(-100%,-100%)`; });
  const p = view.project3(.62, (view.Yc || 5) + 1.4, .7); $("#bell").style.left = p.x + "px"; $("#bell").style.top = p.y + "px"; const b = view.project3(2.3, view.Y(floorY(f + 1)) + .1, .3); $("#bub").textContent = t.bub6; $("#bub").style.transform = `translate(${Math.min(b.x, innerWidth - ($("#bub").offsetWidth || 150) - 12)}px,${b.y - 46}px)`;
  if (S.force != null && !S.jolted && S.now - S.force > 1) { S.jolted = 1; S.kick = 1.4; snd.play("thud"); } if (S.force == null) S.jolted = 0;
}
function marks() { six();
  const box = $("#rings"), on = S.ch === GAME && !S.ended && !S.auto && !S.g.sim.run; box.hidden = !on; $("#grab").hidden = !(S.ch === 2 && !S.hot && !S.lock && !(S.moved > .35));
  if (!$("#grab").hidden) { const q = view.project3(0, (view.Yc || 5) + 1.1, .7); $("#grab").style.transform = `translate(${q.x}px,${q.y}px)`; }
  const h = $("#halo1"), idle = S.ch === 1 && S.g.sim.n > 0 && (S.g.sim.n === 6 || S.g.sim.n === 1); h.hidden = !idle; if (idle) { const j = S.g.cuts.findIndex(c => !c), y = (view.hitchY(S.g.sim) + view.hi) / 2, rx = view.ropeX(j < 0 ? 0 : j, y, S.g.sim), q = S.g.sim.n === 1 ? view.project3(rx[0], view.Y(y), rx[1]) : view.project3(0, (view.m0 || 2) + 4.05, 0); h.style.left = q.x - 52 + "px"; h.style.top = q.y - 52 + "px"; }
  if (!on) return; const seen = new Set(), list = []; for (const q of view.targets(S.g.sim, st)) { if (q.weak || q.key === "car" || seen.has(q.key) && q.key !== "rope") continue; if (q.key === "rope" && (seen.has("rope") || q.side !== "car")) continue; seen.add(q.key); const a = q.pts[0], b = q.pts[q.pts.length - 1], mid = q.pts.length === 3 ? q.pts[1] : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; list.push([q.key, q.key === "rope" ? view.project3(0, view.Y(view.hitchY ? view.hitchY(S.g.sim) : S.g.sim.y + 3.1) + .45, 0) : mid]); }
  while (box.children.length < list.length) box.append(el("i")); [...box.children].forEach((c, i) => { const q = list[i]; c.hidden = !q; if (q) { c.style.transform = `translate(${q[1].x}px,${q[1].y}px)`; c.className = S.hov === q[0] ? "on" : ""; } });
  const hv = $("#hov"), q = mouse && !mouse.touch && !S.knife && near(mouse.x, mouse.y); hv.hidden = !q; if (q) { hv.textContent = q.key === "rope" ? t.ropes1 : t.parts[q.key]; hv.style.transform = `translate(${mouse.x + 44}px,${mouse.y - 12}px)`; }
}
function cursor() { marks();
  const s = $("#sc"), idle = S.ch === 1 && (!S.ghost && S.g.sim.n === 6 || S.g.sim.n === 1 && S.now - S.idle > .9); let x, y, on = false, hit = false, over = false;
  if (idle && (!mouse || mouse.touch)) { const j1 = S.g.cuts.findIndex(c => !c), yy = (view.hitchY(S.g.sim) + view.hi) / 2, q = S.g.sim.n === 1 ? view.project3(view.ropeX(j1, yy, S.g.sim)[0], view.Y(yy), 0) : view.project3(.1, (view.m0 || 2) + 4.25, .1); x = q.x + 46; y = q.y; on = true; s.classList.add("idle"); }
  else { s.classList.remove("idle"); if (mouse && S.ch !== 2 && !S.ended && (!mouse.touch || S.knife)) { const cut = (S.ch === 1 && S.g.sim.n > 0) || S.ch === GAME ; if (cut && inTower(mouse.x, mouse.y) && !S.orbit) { on = over = true; x = mouse.x + 17; y = mouse.y + (mouse.touch ? -46 : 0); hit = !!near(mouse.x, mouse.y, mouse.touch ? 8 : 0); } } }
  s.classList.toggle("on", on); s.classList.toggle("hit", hit); document.body.classList.toggle("over", over && !mouse.touch); document.body.classList.toggle("orbit", !!mouse && !over && !S.hand && S.ch !== 2); if (on) s.style.transform = `translate(${x}px,${y}px)`;
}
function about() { $("#aboutt").innerHTML = aboutHTML(lang, t); const d = $("#about"); if (!d.open) d.showModal(); d.scrollTop = 0; }
function theme() { const dk = isDark(); view?.setTheme(dk); $("meta[name=theme-color]").content = dk ? "#0d1411" : "#d3dacb"; S.dirty = true; }

// ---------- start
async function boot() {
  makeDial(); const force = new URLSearchParams(location.search).has("flat"); let gl = false; if (!force) try { const c = document.createElement("canvas"); gl = !!c.getContext("webgl2"); } catch { }
  try { await Promise.race([document.fonts.load("40px Goudy"), new Promise(r => setTimeout(r, 1200))]); } catch { }
  const small = Math.min(screen.width, screen.height) < 600; dpr = Math.min(devicePixelRatio || 1, small ? 2 : 2);
  if (gl) try { const { View } = await import("./scene.js"); view = new View(cv, { small, calm }); } catch (e) { console.info("3D off:", e.message); view = null; }
  if (!view) { const { Flat } = await import("./flat.js"); view = new Flat(cv, { calm }); flat = true; S.flat = true; }
  theme(); readHash(); bind(); layout(); draw1(0); frame(); draw1(0); frame(); view.look(0, true); view.render(); document.body.classList.remove("boot"); if (flat) toast(t.noGL); requestAnimationFrame(ts => { last = ts; loop(ts); });
  window.__el = { S, view, act, go, undo, reset, hitKey, guess, run, save, share, near, allow, flat, stats: () => ({ ema, dpr, calls: view.r?.info.render.calls, tri: view.r?.info.render.triangles }) };
}
boot();
