// The ending, the challenge, the print.
export function initMore(A, core, ui) {
  const { $, S, E, D, net } = A, z = () => A.t(), esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const meanOf = (v, h) => { let t = 0; for (let m = h * 60; m < h * 60 + 60; m++) t += v[m]; return t / 60; };
  // the minute of an hour whose number is nearest to that hour's average, so that map and average agree
  const typical = (v, h) => { const a = meanOf(v, h); let b = h * 60 + 30; for (let m = h * 60; m < h * 60 + 60; m++) if (Math.abs(v[m] - a) < Math.abs(v[b] - a) - 1e-9) b = m; return b; };
  const ends = () => { const v = A.countsFor(S.cx); return { v, a: Math.round(meanOf(v, 8)), b: Math.round(meanOf(v, 3)), dm: typical(v, 8), nm: typical(v, 3) }; };
  A.ends = ends;
  // ---------- the ending
  let rk = { key: "" };
  const rank = () => {                                            // mean of the 12 five-minute moments between 8 and 9 a.m., for every station
    if (!A.rankAll) { const v = A.rankAll = new Float32Array(net.nC); for (let k = 0; k < net.nC; k++) for (let m = 480; m < 540; m += 5) v[k] += A.countAt(k, m, 30, 9) / 12; }
    const v = A.rankAll, me = v[S.cx]; let r = 1, best = 0; for (let k = 0; k < net.nC; k++) { if (v[k] > me + 1e-6) r++; if (v[k] > v[best]) best = k; } return { r, best, n: Math.round(v[best]) };
  };
  A.rank = rank;
  ui.endPanel = () => {
    const T = z(), x = ui.L.sh || (ui.L.sh = ui.sharp()), w = S.dest, h = S.alt >= 0 && w >= 0 ? ui.homes2() : null, r = (a, b) => `<li><b>${a}</b><span>${b}</span></li>`, ok = h && h.A[1] < 180 && h.B[1] < 180;
    return `<ul class="rules">${r(T.r1, T.r1b(A.tag(S.cx), T.time(x.at), x.a, x.b))}${r(T.r2, T.r2b)}${r(T.r3, ok ? T.r3b(A.tag(S.cx), A.tag(S.alt), h.A.map(Math.round), h.B.map(Math.round)) : T.r3c)}</ul><div class="row"><button type="button" class="main" data-a="keep">${T.tools.keep}</button><button type="button" data-a="game">${T.tools.game}</button><button type="button" data-a="free">${T.free}</button></div>`;
  };
  const swing = (v = A.countsFor(S.cx)) => [[420, 1380], [0, 300]].map(([a, b]) => { let x = 0, at = a; for (let m = a; m < b; m++) if (v[m] - v[m + 1] > x) { x = v[m] - v[m + 1]; at = m; } return [at, v[at], v[at + 1]]; });   // the sharpest minute between 7 a.m. and 11 p.m., and between midnight and 5
  A.swing = swing;
  ui.act.endT = v => ui.animTime(+v);
  const tc = ui.timeChanged; ui.timeChanged = e => { tc(e); if (S.step === 6) ui.render(); };
  // ---------- the print
  const W = 1800, H = 2400;
  async function print() {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"), T = z(), F = A.lang === "zh" ? `OST,OSTZ,"Songti SC",serif` : "OST,Georgia,serif", half = 1500;
    try { await Promise.all([document.fonts.load("40px OST"), document.fonts.load("40px OSTZ", "分钟站")]); } catch { }
    const keep = { pick: S.pick, route: S.route, view: S.view, ch: S.ch, dest: S.dest, tool: S.tool, hide: S.hide, theme: S.theme, legs: A.legs, follow: S.follow };
    const mw = W / 2, box = A.reachBox(-.506), x = A.cxXY[2 * S.cx], y = A.cxXY[2 * S.cx + 1], cam = { x, x: (box[0] + x) / 2, y: (box[1] + y) / 2 - 200, mpp: 1.6 * Math.max(9, Math.min(22, 12.4 * (S.lim / 30) ** .8, Math.max(box[2] * 2.1 / mw, box[3] * 2.1 / half))), yaw: -.506, pitch: 0, ox: 0, oy: 0 };
    const draw = m => A.renderTo(mw, half, { m, view: "map", cam, ch: 9, dest: -1, tool: "", hide: false, theme: "auto", follow: null, pick: false, route: false }, (cv, proj) => { const o = document.createElement("canvas"); o.width = mw; o.height = half; o.getContext("2d").drawImage(cv, 0, 0); return [o, A.count, proj(x, y).map(q => q * 1.6)]; });
    A.noTrains = true; const en = ends(), [a, , pa] = draw(en.dm), [b] = draw(en.nm), na = en.a, nb = en.b; A.noTrains = false; Object.assign(S, keep); A.legs = keep.legs; core.solve(); A.poke();
    const pd = A.sky.DAYP, pn = A.sky.NIGHTP, css = A.sky.css; g.fillStyle = css(pd.bg); g.fillRect(0, 0, mw, H); g.fillStyle = css(pn.bg); g.fillRect(mw, 0, mw, H); g.drawImage(a, 0, 420); g.drawImage(b, mw, 420);
    const fade = (x, y, w, h, c, up) => { const q = g.createLinearGradient(0, y, 0, y + h), k = css(c).replace("rgb", "rgba").replace(")", ",0)"); q.addColorStop(up ? 0 : 1, css(c)); q.addColorStop(up ? 1 : 0, k); g.fillStyle = q; g.fillRect(x, y, w, h); };
    for (const [x0, p] of [[0, pd], [mw, pn]]) { fade(x0, 419, mw, 120, p.bg, true); fade(x0, 420 + half - 120, mw, 121, p.bg, false); }
    const ci = css(pd.ink), cn = css(pn.ink);
    // type straddles the two halves, so it is drawn twice with clipping
    const both = f => { for (const [x0, col] of [[0, ci], [mw, cn]]) { g.save(); g.beginPath(); g.rect(x0, 0, mw, H); g.clip(); g.fillStyle = g.strokeStyle = col; f(x0); g.restore(); } };
    const nm = A.cxName[S.cx]; both(() => { g.textAlign = "center"; g.font = `${A.lang === "en" ? "italic " : ""}54px ${F}`; g.fillText(T.poster(S.lim), W / 2, 150); let fs = 148; do { g.font = `${fs}px ${F}`; fs -= 4; } while (g.measureText(nm).width > W - 160); g.fillText(nm, W / 2, 310); });
    // marker
    for (const [x0, col, bg] of [[0, pd.ink, pd.bg], [mw, pn.ink, pn.bg]]) { g.fillStyle = css(bg); g.beginPath(); g.arc(x0 + pa[0], 420 + pa[1], 13, 0, 7); g.fill(); g.lineWidth = 5; g.strokeStyle = css(col); g.stroke(); }
    both(x0 => { const n = x0 ? nb : na, cx = x0 + mw / 2; g.textAlign = "center"; g.font = `190px ${F}`; g.fillText(n, cx, 2056); g.font = `44px ${F}`; g.fillText(T.avg, cx, 2122); g.fillText(x0 ? T.endNight : T.endDay, cx, 2176); });
    // the whole day
    const v = A.countsFor(S.cx); let mx = 10; for (const q of v) mx = Math.max(mx, q); const x0 = 100, w = W - 200, base = 2300, hh = 96; both(() => { for (let m = 0; m < 1440; m += 4) { const h = Math.min(v[m], v[m + 1], v[m + 2], v[m + 3]) / mx * hh; g.globalAlpha = .9; g.fillRect(Math.round(x0 + m / 1440 * w), base - h, 2, h); } g.globalAlpha = 1; g.fillRect(x0, base, w, 1.5); g.font = `32px ${F}`; g.textAlign = "center"; for (const k in T.hours) g.fillText(T.hours[k], x0 + k / 24 * w, base + 42); g.font = `32px ${F}`; g.textAlign = "left"; });
    g.globalAlpha = .5; g.lineWidth = 3; g.strokeStyle = ci; g.strokeRect(1.5, 1.5, mw, H - 3); g.strokeStyle = cn; g.strokeRect(mw, 1.5, mw - 1.5, H - 3); g.globalAlpha = 1;
    g.font = `28px ${F}`; g.fillStyle = ci; g.globalAlpha = .8; g.textAlign = "left"; g.fillText("yizhouyu.dev/demo/subway", 100, H - 22); g.fillStyle = cn; g.textAlign = "right"; g.fillText(T.posterBy, W - 100, H - 22); return c;
  }
  A.countsFor = cx => { const o = new Int16Array(1440); for (let m = 0; m < 1440; m++) o[m] = A.countAt(cx, m, S.lim, 9); return o; };
  A.print = print;
  const link = () => { const h = new URL(location.href); h.hash = A.hash(); return h.href; };
  async function copy(s) { try { await navigator.clipboard.writeText(s); } catch { const i = document.createElement("textarea"); i.value = s; document.body.append(i); i.select(); try { document.execCommand("copy"); } catch { } i.remove(); } ui.toast(z().copied); }
  let blob = null;
  ui.keep = async () => {
    const { a, b } = ends(), T = z(); ui.modal(`<p class="mk">${T.making}</p><div class="row"><button type="button" class="main" data-a="savePng" disabled>${T.save}</button><button type="button" data-a="copy">${T.copy}</button>${navigator.share ? `<button type="button" data-a="share">${T.share}</button>` : ""}</div>`, "keep", ui.keep);
    if (!A.G || A.G.flat) { $("#modal .mk").textContent = T.nogl; return; } await new Promise(r => setTimeout(r, 60)); const c = await print(); blob = await new Promise(r => c.toBlob(r, "image/png")); if ($("#modal").hidden || !$("#modal").classList.contains("keep")) return; const i = new Image(); i.alt = T.posterAlt(A.cxName[S.cx], a, b); i.src = URL.createObjectURL(blob); await i.decode(); $("#modal .mk")?.replaceWith(i); $("#modal .main").disabled = false;
  };
  ui.act.savePng = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `30-minutes-${A.cxName[S.cx].replace(/[^a-z0-9]+/gi, "-")}.png`; document.body.append(a); a.click(); a.remove(); };
  ui.act.copy = () => copy(link());
  ui.act.share = async () => { const f = blob && new File([blob], "30-minutes.png", { type: "image/png" }); try { await navigator.share({ title: document.title, url: link(), ...(f && navigator.canShare?.({ files: [f] }) ? { files: [f] } : {}) }); } catch { } };

  // ---------- the challenge: five stations, five times, tap as far as you dare
  const rng = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const TIMES = [510, 750, 1080, 1410, 200];
  ui.deal = seed => { const r = rng("subway" + seed), used = new Set(), o = []; const hubs = [...Array(net.nC).keys()].filter(k => A.weight[k] > 900), all = [...Array(net.nC).keys()].filter(k => A.weight[k] > 350); for (let i = 0; i < 5; i++) { const pool = i % 2 ? all : hubs; let k, n = 0; do { k = pool[r() * pool.length | 0]; n++; } while (n < 60 && (used.has(k) || net.D.routes[A.cxRoutes[k][0]][0] === "SI")); used.add(k); o.push({ cx: k, m: TIMES[i] + (r() * 40 | 0) }); } return o; };
  const today = () => new Date().toISOString().slice(0, 10);
  ui.gameOpen = seed => { ui.stopFollow(); S.step = 0; S.tool = ""; S.dest = -1; A.legs = null; S.view = "map"; S.ch = 9; S.lim = 30; S.playing = false; S.game = { seed: seed || today(), phase: "intro", i: 0, pts: [], link: !!seed && seed !== today() }; S.seed = null; S.hide = false; A.moved = false; ui.render(); A.recentre(); A.saveURL(); };
  const begin = () => { const G = S.game; G.deck = ui.deal(G.seed); G.i = 0; G.pts = []; round(); };
  const round = () => { const G = S.game, q = G.deck[G.i]; G.phase = "ask"; G.pick = -1; S.lim = 30; S.hide = true; S.cx = q.cx; S.m = q.m; S.dest = -1; A.legs = null; core.solve(); A.moved = false; A.numbers(); ui.render(); A.look({ ...core.frameFor(), mpp: core.frameFor().mpp * 1.15 }); A.saveURL(); A.pokeStrip(); };
  const best = G => { const q = G.deck[G.i]; let b = -1, bd = 0; for (let k = 0; k < net.nC; k++) if (k !== q.cx && A.arrCx(k) <= 1800) { const d = A.dist(k, q.cx); if (d > bd) { bd = d; b = k; } } return [b, bd]; };
  ui.gameTap = k => { const G = S.game; if (G.phase !== "ask") return; if (k === S.cx) { ui.toast(z().gSelf); return; } core.solve(); const a = A.arrCx(k), [b, bd] = best(G), ok = a <= 1800, p = ok ? Math.round(A.dist(k, S.cx) / bd * 100) : 0; Object.assign(G, { pick: k, a, b, bd, p, phase: "show" }); if (a >= E.INF) { E.reachRounds(net, A.Q, S.cx, Math.floor(S.m) * 60, 3 * 3600); G.a = A.arrCx(k, A.Q.arr[4]); } G.pts.push(p); S.dest = -1; S.hide = false; A.startReveal(); ui.route(); A.numbers(); ui.render(); A.pokeStrip(); const fr = A.free(), f = core.frameFor(), P = [S.cx, k, b].map(q => [A.cxXY[2 * q], A.cxXY[2 * q + 1]]), x0 = Math.min(...P.map(q => q[0])), x1 = Math.max(...P.map(q => q[0])), y0 = Math.min(...P.map(q => q[1])), y1 = Math.max(...P.map(q => q[1])); A.look({ ...f, x: (x0 + x1) / 2, y: (y0 + y1) / 2, mpp: Math.max(f.mpp * .8, (x1 - x0) * 1.35 / (fr[2] - fr[0]), (y1 - y0) * 1.15 / (fr[3] - fr[1])) }); };
  ui.gamePanel = () => {
    const G = S.game, T = z(), x = `<button type="button" class="x" data-a="gx" aria-label="${T.close}">×</button>`, sum = G.pts.reduce((a, b) => a + b, 0);
    if (G.phase === "intro") return `${x}<p class="sm">${G.link ? T.gLink : G.seed === today() ? T.gDaily : T.gRandom}</p><p class="big">${T.gTitle}</p><p class="bd">${T.gIntro}</p><div class="row"><button type="button" class="main" data-a="gGo">${T.gStart}</button>${G.link ? `<button type="button" data-a="gToday">${T.gDaily}</button>` : ""}</div>`;
    if (G.phase === "ask") return `${x}<p class="sm">${T.gRound(G.i + 1)}</p><p class="big s">${T.gAsk(A.tag(S.cx), T.time(S.m))}</p>`;
    if (G.phase === "show") { const mins = Math.ceil(G.a / 60), nm = A.tag(G.pick), d = T.dist(A.dist(G.pick, S.cx)); return `${x}<p class="sm">${T.gRound(G.i + 1)}</p><p class="big s">${G.a >= E.INF ? T.gNever(nm) : G.a <= 1800 ? T.gHit(nm, mins, d) : T.gMiss(nm, mins)}</p><p class="bd">${T.gBest(A.tag(G.b), T.dist(G.bd))}</p><div class="pts"><b>${T.gPts(G.p)}</b><span>${T.gTotal(sum)}</span></div><div class="row"><button type="button" class="main" data-a="gNext">${G.i < 4 ? T.gNextR : T.gSeeEnd}</button></div>`; }
    return `${x}<p class="sm">${T.gTitle}</p><p class="big">${T.gTotal(sum)}</p><p class="bd">${T.gEnd(sum)}</p><ol class="gl">${G.deck.map((q, i) => `<li><span>${A.tag(q.cx)}, ${T.time(q.m)}</span><em>${G.pts[i]}</em></li>`).join("")}</ol><div class="row"><button type="button" class="main" data-a="gShare">${T.gShare}</button><button type="button" data-a="gNew">${T.gAgain}</button><button type="button" data-a="gx">${T.free}</button></div>`;
  };
  ui.act.gGo = begin; ui.act.gToday = () => ui.gameOpen(); ui.act.gNext = () => { const G = S.game; if (G.i < 4) { G.i++; round(); } else { G.phase = "end"; S.dest = -1; A.legs = null; const n = G.pts.reduce((a, b) => a + b, 0); const bst = Math.max(n, +A.store.get("best") || 0); A.store.set("best", bst); ui.render(); } };
  ui.act.gNew = () => { ui.gameOpen(Math.random().toString(36).slice(2, 8)); S.game.link = false; begin(); };
  ui.act.gShare = () => { const u = new URL(location.href); u.hash = "g=" + S.game.seed; const tx = z().gShareText(S.game.pts.reduce((a, b) => a + b, 0)); if (navigator.share && matchMedia("(pointer:coarse)").matches) navigator.share({ text: tx, url: u.href }).catch(() => { }); else copy(tx + " " + u.href); };
  ui.act.gx = () => { S.game = null; S.hide = false; S.dest = -1; A.legs = null; A.moved = false; ui.render(); A.numbers(); A.recentre(); A.saveURL(); A.pokeStrip(); };
  ui.moreOver = (g, ink, pal, FONT) => {                          // best answer, marked
    const G = S.game; if (!G || G.phase !== "show" || G.b === G.pick) return; const p = A.cxPos(G.b), q = A.G.project(p[0], p[1]); g.strokeStyle = ink; g.lineWidth = 1.6; g.setLineDash([3, 3]); g.beginPath(); g.arc(q[0], q[1], 11, 0, 7); g.stroke(); g.setLineDash([]); return; g.font = `bold 15px ${FONT()}`; g.lineJoin = "round"; g.strokeStyle = `rgb(${pal.land.map(v => v * 255 | 0)})`; g.lineWidth = 5; const tx = A.cxName[G.b], w = g.measureText(tx).width, x = q[0] + 16 + w > innerWidth - 8 ? q[0] - 16 - w : q[0] + 16; g.strokeText(tx, x, q[1] + 5); g.fillStyle = ink; g.fillText(tx, x, q[1] + 5);
  };
}
