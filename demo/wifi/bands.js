// 2.4 or 5 GHz? Six small things to do. Both bands are computed at the same time: the 5 GHz one by A.eng, the 2.4 GHz one by A.eng2.
import * as P from "./physics.js";
import { clone, PLANS, raster } from "./plans.js";
import { toView, PAPER, INK } from "./ink.js";
import { share, in1000 } from "./chapters.js";

export const STEPS_N = 6, WALL_SET = ["drywall", "glass", "brick", "concrete", "door"], WIDTHS = [20, 40, 80, 160];
export const LANES = { 20: 234, 40: 468, 80: 980, 160: 1960 };                   // Wi-Fi 6 data sub-carriers
export const rate2 = (w) => 2 * LANES[w] * 10 * (5 / 6) / 13.6;                  // Mbit/s on the radio: 2 antennas, 1024-QAM 5/6, 13.6 us
export const BAND24 = [2400, 2483.5], BAND5 = [[5150, 5350], [5470, 5850]];      // MHz, United States, as open to Wi-Fi
export const CH24 = [1, 6, 11], CH5 = [42, 58, 106, 122, 138, 155];
export const ROW = 5, COL = 6, MINE = 14, OVEN = 0.5;                 // the apartment house; an oven is on the air half of the time (measured)
export const chOf = (i) => i === MINE ? 1 : (i * 2 + Math.floor(i / COL)) % 3, ch5Of = (i) => i === MINE ? 0 : (i * 5 + 1) % CH5.length; // which road each window's router uses
// every network on your channel is busy all the time and takes an equal turn
export function crowd(on, oven) {
  const of = { [MINE]: [chOf(MINE), 0] }; for (const i of on) of[i] = [chOf(i), ch5Of(i)]; const n24 = Object.values(of).filter((c) => c[0] === 1).length, n5 = Object.values(of).filter((c) => c[1] === 0).length; return { of, n24, n5, s24: P.EFFICIENCY * rate2(20) / n24 * (1 - (oven ? OVEN : 0)), s5: P.EFFICIENCY * rate2(80) / n5 };
}
// five situations in the concrete home: where the device is, what it needs (Mbit/s), and which band suits it
export const PLACES = [{ at: [1.4, 5.2], need: 15, right: "5" }, { at: [9.6, 6.3], need: 3.8, right: "2.4" }, { at: [3.72, 0.45], need: 2, right: "2.4", only: "2.4" }, { at: [3.5, 6.2], need: 3, right: "5" }, { at: [10.8, 6.6], need: 2, right: "2.4" }];
export const PLACES_HOME = "concrete";
export const BOX = [4.4, 1.42]; // the router in its metal box by the door, as in the first question

export function createBands(A) {
  const { S } = A, el = A.el, empty = () => clone({ walls: [], feats: [], boxes: [], labels: [] }); let dots = null, lastK4 = 0;
  const sc = () => S.sc, b = () => A.t.bands;
  function scene(k) {
    if (k === 1) return { plan: clone(PLANS.concrete), view: null, router: [...BOX], phone: [9.95, 6.4], main: "divider", dual: { mode: "x", at: .55 }, rooms: 1 };
    if (k === 2) { const plan = empty(); plan.walls.push({ m: "drywall", x1: 5.6, y1: .1, x2: 5.6, y2: 7.58 }); return { plan, view: [2.8, 1.92, 5.6, 3.84], router: [3.9, 3.84], phone: [-5, -5], main: "wall", dual: { mode: "py", at: .5 }, tried: ["drywall"] }; }
    if (k === 3) { const plan = empty(); for (const [x, m] of [[3.3, "drywall"], [5.4, "brick"], [7.6, "concrete"]]) plan.walls.push({ m, x1: x, y1: .1, x2: x, y2: 7.58 }); return { plan, view: [.9, .86, 9.8, 5.96 * 9.8 / 8.69], router: [1.9, 3.84], phone: [2.8, 3.84], main: "phone", dual: { mode: "py", at: .5 }, curve: [], rail: 3.84 }; }
    if (k === 4) return { plan: empty(), view: null, router: [-9, -9], phone: [-5, -5], main: "road", still: 1, width: 20, tried: [20] };
    if (k === 5) return { plan: empty(), view: null, router: [-9, -9], phone: [-5, -5], main: "windows", still: 1, on: [], oven: 0 };
    return { plan: clone(PLANS.concrete), view: null, router: [...BOX], phone: [...PLACES[0].at], main: "divider", dual: { mode: "x", at: .5 }, i: 0, picks: [], rooms: 1 };
  }
  function enter(k, q) {
    const s = { k, stage5: 1, band: "5", won: false, held: 0, ...scene(k) }; if (s.view && k === 3) { s.view = [.9, 3.84 - 9.8 * P.H0 / P.W0 / 2, 9.8, 9.8 * P.H0 / P.W0]; }
    if (q) { if (k === 1 || k === 6) { const v = parseFloat(q); if (v >= 0 && v <= 1 && k === 1) s.dual.at = v; } if (k === 2 && WALL_SET.includes(q)) { s.plan.walls[0].m = q; s.tried = [q]; } if (k === 3) { const v = parseFloat(q); if (v > 2 && v < 10.6) s.phone = [v, 3.84]; } if (k === 4 && WIDTHS.includes(+q)) { s.width = +q; s.tried = [+q]; } if (k === 5) { const m = parseInt(q, 36); if (Number.isFinite(m)) s.on = [...Array(ROW * COL).keys()].filter((i) => i !== MINE && Math.floor(m / 2 ** i) % 2); } if (k === 6) { const i = parseInt(q); if (i >= 0 && i < 5) { s.i = i; s.phone = [...PLACES[i].at]; } } }
    return s;
  }
  function state() { const s = sc(); return s.k === 1 ? s.dual.at.toFixed(2) : s.k === 2 ? s.plan.walls[0].m : s.k === 3 ? s.phone[0].toFixed(2) : s.k === 4 ? String(s.width) : s.k === 5 ? s.on.reduce((m, i) => m + 2 ** i, 0).toString(36) : String(Math.min(4, s.i)); }
  const win = (v) => { const s = sc(); s.say = v || {}; const first = !s.won; s.won = true; const t = b().steps[s.k - 1].aft(s.say); if (first) { A.bandDone(s.k); A.panel(); } A.say(t, 1); };

  // ---------- text column
  function bars2(rows, max, unit) { // rows: [name, v5, v24]
    const d = el("div", "mat two5"); d.append(el("small", "", unit)); for (const [name, a, c, on] of rows) { const r = el("div", on ? "on" : ""); if (name) r.append(el("span", "", name)); else r.classList.add("solo"); const bx = el("div", "pair"); for (const [cls, v, tx] of [["f5", a, b().b5], ["f24", c, b().b24]]) { const l = el("div", cls), u = el("u"); u.style.backgroundSize = (v == null ? 0 : Math.max(.6, 100 * v / max)) + "% 100%"; l.append(el("i", "", tx), u, el("b", "", v == null ? "" : unit === b().per ? in1000(v / 1000) : A.fmt(v))); bx.append(l); } r.append(bx); d.append(r); } return d;
  }
  function panel(X, R) {
    const s = sc(), B = b(), st = B.steps[s.k - 1]; if (!s.won && st.goal) { const gl = el("p", "goal", st.goal(s)); gl.id = "goal"; X.append(gl); }
    if (s.k === 2) { X.append(bars2(WALL_SET.map((m) => [A.t.mats[m], s.tried.includes(m) ? share(m, "5") * 1000 : null, s.tried.includes(m) ? share(m, "2.4") * 1000 : null, s.plan.walls[0].m === m]), 1000, B.per)); X.querySelectorAll(".two5 > div").forEach((r, i) => { r.tabIndex = 0; r.setAttribute("role", "button"); r.onclick = () => setWall(WALL_SET[i]); r.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setWall(WALL_SET[i]); } }; }); }
    if (s.k === 3) { const c = el("canvas"); c.id = "walk"; X.append(c); const l = el("div", "tl"); l.innerHTML = `<span class="k5">${B.b5} <b id="w5"></b></span><span class="k24">${B.b24} <b id="w24"></b></span>`; X.append(l); drawWalk(); }
    if (s.k === 4) { const g = el("div", "seg four"); for (const [n, w] of [20, 40, 80].entries()) { const q = A.btn("", B.wide[n], () => setWidth(w)); q.dataset.w = w; q.setAttribute("aria-pressed", s.width === w); g.append(q); } X.append(g, bars2([["", rate2(s.width) * P.EFFICIENCY, rate2(20) * P.EFFICIENCY, 1]], rate2(80) * P.EFFICIENCY, B.lanes)); }
    if (s.k === 5) { const c = crowd(s.on, s.oven); X.append(bars2([["", c.s5, c.s24, 1]], rate2(80) * P.EFFICIENCY, B.left)); X.append(el("p", "fine", s.last != null && s.on.includes(s.last) && chOf(s.last) !== 1 ? B.other(CH24[chOf(s.last)]) : B.share(c.n24, c.n5))); const ch = el("div", "chips"); for (const [k, tx] of [["oven", B.oven]]) { const q = A.btn("", tx, () => { s[k] = s[k] ? 0 : 1; redraw(); checkCrowd(); A.panel(); }); q.setAttribute("aria-pressed", !!s[k]); q.dataset.k = k; ch.append(q); } const all = A.btn("", s.on.length ? B.none : B.all, () => { s.on = s.on.length ? [] : [...Array(ROW * COL).keys()].filter((i) => i !== MINE); checkCrowd(); redraw(); A.panel(); }); all.dataset.k = "all"; ch.append(all); X.append(ch); X.append(el("p", "fine", B.model)); }
    if (s.k === 6) choosePanel(X);
  }
  function choosePanel(X) {
    const s = sc(), B = b(), i = s.i; if (i >= 5) { const u = el("ul", "take"); for (const tx of B.end) u.append(el("li", "", tx)); X.append(u, el("p", "fine", B.endFine)); return; }
    const p = PLACES[i], pick = s.picks[i], q = B.places[i]; X.append(el("p", "situ", `${i + 1} / 5  ${q.q}`)); const g = el("div", "seg wide"); for (const bd of ["5", "2.4"]) { const c = A.btn("", bd === "5" ? B.net5 : B.net24, () => choose(bd)); c.append(el("small", "", bd === "5" ? B.b5 : B.b24)); c.dataset.pick = bd; c.setAttribute("aria-pressed", pick === bd); if (pick) c.disabled = true; g.append(c); } X.append(g);
    if (pick) { const ok = pick === p.right, v = el("p", "verdict" + (ok ? " ok" : "")); v.append(el("b", "", ok ? B.yes : B.no(p.right === "5" ? B.net5 : B.net24)), document.createTextNode(q.why)); X.append(v); if (!p.only) X.append(bars2([["", s.m5, s.m24, 1]], 720, B.there)); X.append(A.btn("solid", A.t.next, () => { s.i++; if (s.i < 5) { s.phone = [...PLACES[s.i].at]; S.phone = s.phone; } s.dual.goal = .5; s.m5 = s.m24 = null; if (s.i >= 5) { win({ n: s.picks.filter((x, j) => x === PLACES[j].right).length }); } A.panel(); A.place(true); A.saveHash(); }, "nextq")); }
  }
  function choose(bd) { const s = sc(), p = PLACES[s.i]; if (s.picks[s.i]) return; s.picks[s.i] = bd; s.m5 = P.mbps(S.areaDb ?? -120, "5"); s.m24 = P.mbps(S.area2 ?? -120, "2.4"); s.dual.goal = (bd === "5") === A.portrait ? .985 : .015; A.touched(); A.panel(); }
  function setWall(m) { const s = sc(); s.plan.walls[0].m = m; if (!s.tried.includes(m)) s.tried.push(m); s.slide = { from: s.plan.walls[0].x1 + 1.9, t: performance.now() }; s.held = 0; A.touched(); A.walls(); A.panel(); A.saveHash(); }
  const nextWall = () => setWall(WALL_SET[(WALL_SET.indexOf(sc().plan.walls[0].m) + 1) % WALL_SET.length]);
  function moveWall(x) { const w = sc().plan.walls[0]; x = Math.max(4.7, Math.min(7.6, x)); w.x1 = w.x2 = x; A.walls(); }
  function setWidth(w) { const s = sc(); s.width = w; if (!s.tried.includes(w)) s.tried.push(w); dots = null; A.touched(); if (w >= 80) s.won || win({}); A.panel(); A.saveHash(); }
  function checkCrowd() { const s = sc(), c = crowd(s.on, s.oven), v = { n: s.on.length, a: c.n24 - 1, x: A.fmt(c.s24), y: A.fmt(c.s5) }; if (c.s24 <= 40 && !s.won) win(v); else if (s.last != null && s.on.includes(s.last) && chOf(s.last) !== 1) A.say(b().other(CH24[chOf(s.last)]), 1); else if (s.on.length) { s.say = v; A.say(b().steps[4].aft(v), 1); } else A.say(s.won ? b().steps[4].aft({ n: 0, a: 0, x: A.fmt(c.s24), y: A.fmt(c.s5) }) : b().steps[4].say, 0); }
  function toggle(i) { const s = sc(); if (i === MINE) return; s.last = i; s.on = s.on.includes(i) ? s.on.filter((x) => x !== i) : [...s.on, i]; A.touched(); A.panel(); checkCrowd(); A.saveHash(); }

  // ---------- what happens over time
  function tick(dt) {
    const s = sc(); if (!s || !s.stage5) return;
    if (s.k === 1) { const k = S.rooms.findIndex((r) => r.key === "bed1"), r = S.rooms[k]; if (r && A.eng.n > 1500 && S.vals2.length && s.moved) { const [x] = toView(...r.at, A.V); if (A.portrait ? s.dual.at * A.box.w < x - 34 : s.dual.at * A.box.w > x + 34) { s.held += dt; if (s.held > 350) win({ a: A.fmt(P.mbps(S.vals[k], "5")), b: A.fmt(P.mbps(S.vals2[k], "2.4")) }); } else s.held = 0; } }
    if (s.k === 2 && s.plan.walls[0].m === "concrete" && !s.slide && !A.dragging()) { s.held += dt; if (s.held > 700) win({ x: Math.round(share("concrete", "2.4") / share("concrete", "5")) }); }
    if (s.k === 3 && A.eng.n > 2200 && S.areaDb != null && S.area2 != null) { const x = Math.round((S.phone[0] - 1.9) / .14); const m5 = P.mbps(S.areaDb, "5"), m24 = P.mbps(S.area2, "2.4"); s.curve[x] = [m5, m24]; s.now = [m5, m24]; drawWalk(); if (m24 > 1.15 * m5 && A.eng.n > 2400) { s.held += dt; if (!s.flip) s.flip = S.phone[0]; if (s.held > 500 && !s.won) win({ x: Math.round(P.mbps(-30, "5") / P.mbps(-30, "2.4")), a: A.fmt(m24), b: A.fmt(m5) }); } else s.held = 0; }
    if (s.k === 6 && s.i < 5 && s.picks[s.i] && A.ready()) { const m5 = P.mbps(S.areaDb, "5"), m24 = P.mbps(S.area2, "2.4"); if (s.m5 == null || Math.abs(m5 - s.m5) > .12 * (m5 + 3) || Math.abs(m24 - s.m24) > .12 * (m24 + 3)) { s.m5 = m5; s.m24 = m24; A.panel(); } }
  }
  function frame(now, dt) { // moving things
    const s = sc(); if (S.dual && S.dual.goal != null) { const d = S.dual.goal - S.dual.at, e = 1 - Math.exp(-dt / 160); if (Math.abs(d) < .002) { S.dual.at = S.dual.goal; S.dual.goal = null; } else S.dual.at += d * e; A.ink(); }
    if (!s || !s.stage5) return; if (s.slide) { const k = Math.min(1, (now - s.slide.t) / 420), e = 1 - (1 - k) ** 3; moveWall(s.slide.from + (5.6 - s.slide.from) * (A.calm ? 1 : e)); if (k >= 1 || A.calm) s.slide = null; A.ink(); }
    if ((s.k === 4 || s.k === 5) && (!A.calm || s.dirty !== false)) { if (now - lastK4 > 30) { lastK4 = now; s.dirty = false; redraw(now); } }
  }
  function redraw(now = performance.now()) { if (!A.box.w || A.box.w < 60) return; const c = A.inkCanvas(), g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(A.dpr, 0, 0, A.dpr, 0, 0); (sc().k === 4 ? road : house)(g, A.box.w, A.box.h, A.calm ? 0 : now / 1000); }

  // ---------- 4: the roads, one line for every lane
  function road(g, W, H, time) {
    const s = sc(), B = b(), m = Math.max(26, W * .05), f = A.font, small = W < 500, fs = small ? 12.5 : 15; g.textBaseline = "middle";
const lab = (tx, x, y, al = "left", c = "#f3f5f3") => { g.font = `${fs}px ${f}`; g.textAlign = al; g.fillStyle = c; g.fillText(tx, x, y); }, sel = s.width;
    // the two roads in use
    const top = H * .1, bot = H - m * .8, mid = (top + bot) / 2, maxH = bot - top - (small ? 46 : 54), unit = maxH / (80 + 20); const h24 = Math.max(6, 20 * unit), h5 = sel * unit; const yA = top + (small ? 16 : 20), yB = yA + h24 + (small ? 30 : 36);
    lab(`${B.b24}: ${A.fmt(rate2(20) * P.EFFICIENCY)} Mbps`, m, yA - 12); lab(`${B.b5}: ${A.fmt(rate2(sel) * P.EFFICIENCY)} Mbps`, m, yB - 12); for (const [y, h, n, seed] of [[yA, h24, LANES[20], 1], [yB, h5, LANES[sel], 2]]) lanes(g, m, y, W - 2 * m, h, n, time, seed);
  }
  function lanes(g, x, y, w, h, n, time, seed) { // one thin line per lane, packets of light running along each
    g.fillStyle = "rgba(9,34,74,.95)"; g.fillRect(x, y, w, h); const lh = h / n, show = Math.min(n, Math.round(h * A.dpr * .9)), step = n / show, lw = Math.max(.5, Math.min(1.3, h / show * .7)); g.lineWidth = lw; g.strokeStyle = "rgba(120,180,220,.16)"; g.beginPath(); for (let i = 0; i < show; i++) { const yy = y + (i * step + .5) * lh; g.moveTo(x, yy); g.lineTo(x + w, yy); } g.stroke();
    const rnd = (k) => { const v = Math.sin(k * 12.9898 + seed * 7.1) * 43758.5453; return v - Math.floor(v); }, parts = [[1, .30], [.62, .5], [.3, .95]];
    for (const [f, al] of parts) { g.strokeStyle = `rgba(226,243,252,${al})`; g.beginPath(); for (let i = 0; i < show; i++) { const k = Math.round(i * step), yy = y + (i * step + .5) * lh, L = 26 + 46 * rnd(k + 3), gap = 130 + 190 * rnd(k + 7), p = (time * (95 + 50 * rnd(k + 1)) + rnd(k) * gap) % gap; for (let xx = x - gap + p; xx < x + w; xx += gap) { const v = Math.min(x + w, xx + L), u = Math.max(x, xx + L * (1 - f)); if (v > u) { g.moveTo(u, yy); g.lineTo(v, yy); } } } g.stroke(); }
    g.strokeStyle = "rgba(243,245,243,.8)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.moveTo(x, y + h); g.lineTo(x + w, y + h); g.stroke();
  }
  // ---------- 5: an apartment house, every lit window a router
  function grid(W, H) { const m = Math.max(24, W * .05), top = m + (W < 500 ? 34 : 30), bot = H - m - 14, cols = W < H ? ROW : COL, rows = W < H ? COL : ROW; return { m, top, cw: (W - 2 * m) / cols, ch: (bot - top) / rows, cols, rows, bot }; }
  const cell = (i, G) => G.cols === COL ? [i % COL, Math.floor(i / COL)] : [Math.floor(i / COL), COL - 1 - i % COL];
  function house(g, W, H, time) {
    const s = sc(), B = b(), G = grid(W, H), c = crowd(s.on, s.oven), f = A.font, small = W < 500; g.strokeStyle = "rgba(243,245,243,.85)"; g.lineWidth = 1.4; g.strokeRect(G.m, G.top, W - 2 * G.m, G.bot - G.top); g.lineWidth = .7; for (let r = 1; r < G.rows; r++) { g.beginPath(); g.moveTo(G.m, G.top + r * G.ch); g.lineTo(W - G.m, G.top + r * G.ch); g.stroke(); } g.lineWidth = 2.4; g.beginPath(); g.moveTo(G.m - 8, G.top); g.lineTo(W - G.m + 8, G.top); g.stroke(); g.font = `${small ? 13 : 15}px ${f}`; g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = PAPER; g.fillText(B.houseT, G.m, G.top - 16, W - 2 * G.m);
    const turn = [0, 1, 2].map((ch) => { const L = Object.keys(c.of).map(Number).filter((i) => c.of[i][0] === ch).sort((p, q) => p - q); return L.length ? L[Math.floor(time * 2.2 + ch * .37) % L.length] : -1; });
    for (let i = 0; i < ROW * COL; i++) { const [cx, cy] = cell(i, G), x = G.m + (cx + .5) * G.cw, y = G.top + (cy + .5) * G.ch, w = G.cw * .52, h = G.ch * .58, lit = c.of[i], talk = lit && turn[lit[0]] === i; g.fillStyle = lit ? (talk ? "#eaf6fc" : lit[0] === 1 ? "#4f9bd0" : "#3a5d80") : "rgba(8,30,66,.85)"; g.fillRect(x - w / 2, y - h / 2, w, h); if (lit && talk) { g.save(); g.globalAlpha = .3; g.strokeStyle = "#eaf6fc"; for (let r = 1; r < 4; r++) { const q = ((time * 1.4 + r / 3) % 1); g.globalAlpha = .4 * (1 - q); g.beginPath(); g.arc(x, y, Math.min(w, h) * (.5 + q * .8), 0, 7); g.stroke(); } g.restore(); }
      g.strokeStyle = i === MINE ? "#ff5f52" : "rgba(243,245,243,.75)"; g.lineWidth = i === MINE ? 3 : 1; g.strokeRect(x - w / 2, y - h / 2, w, h); g.beginPath(); g.lineWidth = .8; g.strokeStyle = lit ? "rgba(6,26,56,.35)" : "rgba(243,245,243,.35)"; g.moveTo(x, y - h / 2); g.lineTo(x, y + h / 2); g.stroke();
      if (!lit) { g.fillStyle = chOf(i) === 1 ? "rgba(243,245,243,.95)" : "rgba(243,245,243,.32)"; g.textAlign = "center"; g.font = `${Math.max(11, Math.min(20, h * .3))}px ${f}`; g.fillText(String(CH24[chOf(i)]), x, y + 1); if (chOf(i) === 1) { g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 2; g.strokeRect(x - w / 2, y - h / 2, w, h); } }
      if (lit) { g.fillStyle = INK; g.textAlign = "center"; g.font = `${Math.max(12, Math.min(22, h * .34))}px ${f}`; g.fillText(String(CH24[lit[0]]), x, y + 1); } if (i === MINE) { g.fillStyle = "#ff8075"; g.font = `${small ? 11.5 : 13}px ${f}`; g.textAlign = "center"; g.fillText(B.you, x, y + h / 2 + 9); } }
    g.textAlign = "left"; g.font = `${small ? 11.5 : 13}px ${f}`; g.fillStyle = PAPER; if (s.oven) g.fillStyle = "#ff8075"; g.fillText(s.oven && small ? B.ovenOn : B.chan + (s.oven ? ".  " + B.ovenOn : ""), G.m, G.bot + 15);
  }
  function windowAt(X, Y) { const G = grid(A.box.w, A.box.h), cx = Math.floor((X - G.m) / G.cw), cy = Math.floor((Y - G.top) / G.ch); if (cx < 0 || cy < 0 || cx >= G.cols || cy >= G.rows) return -1; return G.cols === COL ? cy * COL + cx : cx * COL + (COL - 1 - cy); }
  // ---------- 3: the two speeds along the way
  function drawWalk() {
    const c = document.getElementById("walk"); if (!c) return; const s = sc(), d = A.dpr, w = Math.round(c.clientWidth * d) || 300, h = Math.round((c.clientHeight || 130) * d); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } const g = c.getContext("2d"), N = 62, x0 = 34 * d, X = (i) => x0 + i / N * (w - x0 - 6 * d), Y = (v) => h - 17 * d - Math.max(0, v) / 760 * (h - 24 * d), ink = A.css("--ink"), blue = A.css("--blue"); g.clearRect(0, 0, w, h); g.font = `${11 * d}px ${A.css("--b")}`; g.lineWidth = d; g.textBaseline = "middle"; for (const v of [0, 170, 720]) { g.strokeStyle = A.css("--hair"); g.beginPath(); g.moveTo(x0, Math.round(Y(v)) + .5); g.lineTo(w, Math.round(Y(v)) + .5); g.stroke(); g.fillStyle = A.css("--ink2"); g.textAlign = "right"; g.fillText(String(v), x0 - 6 * d, Y(v)); }
    g.textBaseline = "top"; g.setLineDash([2 * d, 3 * d]); g.strokeStyle = A.css("--hair"); for (const p of s.plan.walls) { const x = X((p.x1 - 1.9) / .14); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Y(0)); g.stroke(); g.textAlign = "center"; g.fillText(A.t.mats[p.m], x, Y(0) + 4 * d); } g.setLineDash([]);
    for (const [j, col, lw] of [[1, blue, 2.2], [0, ink, 2.2]]) { g.strokeStyle = col; g.lineWidth = lw * d; g.lineJoin = "round"; g.beginPath(); let pen = false, lastI = -9; for (let i = 0; i <= N; i++) { const q = s.curve[i]; if (!q) continue; const x = X(i), y = Y(q[j]); pen && i - lastI < 9 ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; lastI = i; } g.stroke(); }
    if (s.now) { const x = X((S.phone[0] - 1.9) / .14); for (const [v, col] of [[s.now[1], blue], [s.now[0], ink]]) { g.fillStyle = col; g.beginPath(); g.arc(x, Y(v), 4 * d, 0, 7); g.fill(); } const a = document.getElementById("w5"), q = document.getElementById("w24"); if (a) a.textContent = A.fmt(s.now[0]) + " " + A.t.mbps; if (q) q.textContent = A.fmt(s.now[1]) + " " + A.t.mbps; }
    if (s.flip) { const x = X((s.flip - 1.9) / .14); g.strokeStyle = A.css("--red"); g.lineWidth = 2 * d; g.beginPath(); g.arc(x, Y(130), 11 * d, 0, 7); g.stroke(); }
  }
  const lesson = () => { const s = sc(); if (s.won || !A.bandIsDone(s.k)) return null; const v = s.k === 2 ? { x: Math.round(share("concrete", "2.4") / share("concrete", "5")) } : s.k === 4 ? {} : null; return v ? b().steps[s.k - 1].aft(v) : null; };
  // the loupe: half a metre beside the router, 5 GHz on its left, 2.4 GHz on its right, with a phone and a hand at the same scale
  const LP = () => { const W = A.box.w, p = A.portrait, s = p ? Math.max(70, W * .235) : Math.min(190, Math.max(104, W * .15)); return p ? { x: W * .14, y: A.box.h * .135, w: s, h: s } : { x: 34, y: A.box.h - s - 44, w: s, h: s }; }, LM = .44, LC = [3.55, 2.35];
  function loupe(w, h, k) { const L = LP(), px = Math.round(L.w * k), py = Math.round(L.h * k), y0 = Math.round(h - (L.y + L.h) * k), view = (i) => ({ x: LC[0] - LM / 2, y: LC[1] - LM / 2, w: LM, h: LM }); A.eng.draw(px, py, { at: [Math.round(L.x * k), y0], keep: 1, view: view(0), upright: 1 }); A.eng2.draw(px, py, { at: [Math.round((L.x + L.w) * k), y0], keep: 1, view: view(1), upright: 1 }); }
  function loupeInk(g, q) { const L = LP(), x = L.x * q, y = L.y * q, w = L.w * q, h = L.h * q, k = w / LM, fs = 12.5 * q; g.shadowBlur = 0; g.strokeStyle = PAPER; g.lineWidth = 2 * q; g.strokeRect(x, y, w * 2, h); g.lineWidth = 1.2 * q; g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w, y + h); g.stroke(); for (let i = 0; i < 2; i++) { const X = x + w * (i + .5); g.strokeStyle = "rgba(4,18,44,.95)"; for (const [lw, col] of [[4.4, "rgba(4,18,44,.9)"], [1.7, PAPER]]) { g.lineWidth = lw * q; g.strokeStyle = col; if (i) hand(g, X, y + h * .86, k); else { const pw = .072 * k, ph = .15 * k; g.beginPath(); g.roundRect(X - pw / 2, y + h * .86 - ph, pw, ph, .009 * k); g.stroke(); } } } g.font = `${fs}px ${A.font}`; g.textBaseline = "middle"; const lab = (tx, cx, cy) => { const tw = g.measureText(tx).width + 12 * q; g.fillStyle = "rgba(4,18,44,.88)"; g.fillRect(cx - tw / 2, cy - fs * .8, tw, fs * 1.6); g.fillStyle = PAPER; g.textAlign = "center"; g.fillText(tx, cx, cy); }; const sm = L.w < 110; lab(sm ? `5.7${A.t.cm}` : `${b().b5}  5.7${A.t.cm}`, x + w / 2, y + fs * .9); lab(sm ? `12.3${A.t.cm}` : `${b().b24}  12.3${A.t.cm}`, x + w * 1.5, y + fs * .9); if (!sm) { lab(b().phone15, x + w / 2, y + h + fs * .2); lab(b().hand9, x + w * 1.5, y + h + fs * .2); } }
  function hand(g, xh, y, k) { const u = .01 * k; g.beginPath(); g.moveTo(xh - 4.2 * u, y); g.lineTo(xh - 4.5 * u, y - 6 * u); for (const [fx, len] of [[-3.5, 14.6], [-1.35, 17.2], [.85, 18], [3, 16.6]]) { const a = xh + (fx - .92) * u, c = xh + (fx + .92) * u, ty = y - (len - .9) * u, by = y - 9.6 * u; g.lineTo(a, by); g.lineTo(a, ty); g.arc(xh + fx * u, ty, .92 * u, Math.PI, 0); g.lineTo(c, by); } g.lineTo(xh + 4.4 * u, y - 7.4 * u); g.lineTo(xh + 6.6 * u, y - 10.4 * u); g.arc(xh + 7.3 * u, y - 9.8 * u, .95 * u, Math.PI * 1.2, Math.PI * .25); g.lineTo(xh + 4.6 * u, y - 2.4 * u); g.lineTo(xh + 3.6 * u, y); g.closePath(); g.stroke(); }
  return { loupeBox: LP, loupe, loupeInk, lesson, enter, state, panel, tick, frame, redraw, nextWall, setWall, moveWall, toggle, windowAt, setWidth, choose, drawWalk, cellCentre: (i) => { const G = grid(A.box.w, A.box.h), [x, y] = cell(i, G); return [G.m + (x + .5) * G.cw, G.top + (y + .5) * G.ch]; } };
}
