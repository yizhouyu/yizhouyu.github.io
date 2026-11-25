// The print to keep: waves, drawing, lettering and a title block, at print resolution.
import * as P from "./physics.js";
import { drawInk, toView, circlePath, arrowPath, scalePath, PAPER, INK } from "./ink.js";

export function drawBars(g, x, y, h, n, color) { for (let i = 0; i < 4; i++) { const H = h * (.4 + .2 * i); g.globalAlpha = i < n ? 1 : .28; g.fillStyle = color; g.fillRect(x + i * h * .34, y - H, h * .22, H); } g.globalAlpha = 1; }
export function router2D(g, x, y, s) { g.save(); g.translate(x - 26 * s, y - 34 * s); g.scale(s, s); g.lineCap = "round"; g.lineJoin = "round"; const ant = (w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(14, 31); g.lineTo(8, 10); g.moveTo(38, 31); g.lineTo(44, 10); g.stroke(); }; ant(6, PAPER); g.fillStyle = "#e0352b"; g.strokeStyle = PAPER; g.lineWidth = 2.4; g.beginPath(); g.roundRect(4, 28, 44, 17, 3); g.fill(); g.stroke(); ant(3, "#e0352b"); g.fillRect(6, 30, 40, 13); g.fillStyle = PAPER; for (const c of [13, 20, 27]) { g.beginPath(); g.arc(c, 36.5, 1.9, 0, 7); g.fill(); } g.restore(); }

// the waves alone, any size, straight from the graphics chip
export function waves(eng, w, h, opt = {}) {
  const gl = eng.canvas, w0 = gl.width, h0 = gl.height, old = [eng.labels, eng.px, eng.view, eng.portrait, eng.paper];
  if (opt.labels) eng.labels = opt.labels; if (opt.view) eng.view = opt.view; if ("portrait" in opt) eng.portrait = opt.portrait; eng.px = opt.px || 1; eng.paper = 1;
  gl.width = w; gl.height = h; const e2 = opt.second; let o2; if (e2) { o2 = [e2.labels, e2.px, e2.view, e2.portrait, e2.paper]; e2.labels = eng.labels; e2.px = eng.px; e2.view = eng.view; e2.portrait = eng.portrait; e2.paper = 1; } opt.paint ? opt.paint(w, h) : eng.draw(w, h); const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(gl, 0, 0);
  [eng.labels, eng.px, eng.view, eng.portrait, eng.paper] = old; if (e2) [e2.labels, e2.px, e2.view, e2.portrait, e2.paper] = o2; gl.width = w0; gl.height = h0; eng.draw(w0, h0); return c;
}

export function picture(A) {
  const { S, eng, t, font, head } = A, p = A.portrait, v0 = A.V, pw = p ? 1500 : 2400, k = pw / (p ? v0.h : v0.w), ph = Math.round(k * (p ? v0.w : v0.h)), m = Math.round(pw * .05), u = pw / (p ? 760 : 1500), tb = Math.round((p ? 180 : 120) * u);
  const c = document.createElement("canvas"); c.width = pw + 2 * m; c.height = ph + m + tb + Math.round(m * 1.2); const g = c.getContext("2d"); g.fillStyle = PAPER; g.fillRect(0, 0, c.width, c.height);
  const v = { ...v0, k, p }, fs = (p ? 15 : 18) * u, kz = A.weakest(), L = new Float32Array(48), lab = [];
  S.rooms.forEach((r, n) => { if (S.vals[n] == null || n > 11) return; const [x, y] = toView(...r.at, v), a = A.roomName(r), b = A.fmt(P.mbps(S.vals[n], S.band)) + " " + t.mbps; g.font = `${fs}px ${font}`; const w = Math.max(g.measureText(a).width, g.measureText(b).width * .85 + fs * 1.6), h = r.counted ? fs * 2.5 : fs * 1.2; lab.push({ x, y, a, b, w, h, r, n }); L.set([x, y, w / 2, h / 2], n * 4); });
  g.drawImage(waves(eng, pw, ph, { labels: L, px: u, paint: A.paint, second: A.eng2 }), m, m); const i = document.createElement("canvas"); i.width = pw; i.height = ph; drawInk(i.getContext("2d"), S.plan, v, { t, band: S.band, font, scale: true, dpr: u, px: Math.max(1, k / 100) }); g.drawImage(i, m, m);
  g.save(); g.translate(m, m);
  for (const o of lab) { g.font = `${fs}px ${font}`; g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(o.a, o.x, o.y - (o.r.counted ? fs * .55 : 0)); if (o.n === kz) { g.fillStyle = "#ff5f52"; g.fillRect(o.x - o.w * .42, o.y + fs * .05, o.w * .84, 1.6 * u); }
    if (o.r.counted) { g.font = `${fs * .85}px ${font}`; const w = g.measureText(o.b).width, X = o.x - (w + fs * 1.6) / 2; drawBars(g, X, o.y + fs * 1.0, fs * .82, P.bars(S.vals[o.n]), "#fff"); g.fillStyle = "#fff"; g.textAlign = "left"; g.fillText(o.b, X + fs * 1.6, o.y + fs * .66); } }
  const s = k / v0.k * .9; g.lineCap = g.lineJoin = "round"; g.strokeStyle = "#f0483c"; const ans = S.answer;
  if (ans && !S.stageIsChapter) { const K = k / v0.k; g.lineWidth = 3 * K; g.stroke(new Path2D(scalePath(circlePath(toView(...ans.best, v0), 40), K))); const ar = ans.won ? "" : arrowPath(toView(...ans.you, v0), toView(...ans.best, v0)); if (ar) { g.lineWidth = 2.4 * K; g.stroke(new Path2D(scalePath(ar, K))); } }
  if (S.dual && S.dual.mode === "x") { const X = S.dual.at * pw; g.strokeStyle = PAPER; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(X, 14 * u); g.lineTo(X, ph - 14 * u); g.stroke(); g.font = `${20 * u}px ${font}`; g.fillStyle = PAPER; g.textBaseline = "top"; g.textAlign = "right"; g.fillText(p ? t.b5 : t.b24, X - 16 * u, 24 * u); g.textAlign = "left"; g.fillText(p ? t.b24 : t.b5, X + 16 * u, 24 * u); g.textBaseline = "middle"; } if (S.second) router2D(g, ...toView(...S.second, v), s);
  const [rx, ry] = toView(...S.router, v); router2D(g, rx, ry, s); { const [X, Y] = toView(...S.phone, v), q = s; g.fillStyle = PAPER; g.strokeStyle = INK; g.lineWidth = 2 * q; g.beginPath(); g.roundRect(X - 12 * q, Y - 20 * q, 24 * q, 40 * q, 4.5 * q); g.fill(); g.stroke(); drawBars(g, X - 7.6 * q, Y + 7 * q, 17 * q, A.phoneBars, INK); } g.restore();
  // title block
  const y0 = m + ph + Math.round(34 * u), x0 = m, x1 = m + pw; g.fillStyle = INK; g.textBaseline = "alphabetic"; g.textAlign = "left"; g.font = `300 ${36 * u}px ${head}`; g.fillText(t.imgT, x0, y0 + 36 * u);
  g.font = `${16 * u}px ${font}`; g.fillStyle = "#4a5f7c"; g.fillText(`${A.title} · Wi-Fi ${S.dual ? t.b5 + " | " + t.b24 : S.band === "5" ? t.b5 : t.b24}`, x0, y0 + 70 * u); g.font = `${13.5 * u}px ${font}`; g.fillText(t.imgBy, x0, y0 + (p ? 152 : 98) * u);
  if (kz >= 0 && !S.stageIsChapter) { g.textAlign = p ? "left" : "right"; const X = p ? x0 : x1, Y = y0 + (p ? 102 : 34) * u; g.font = `${20 * u}px ${font}`; g.fillStyle = INK; g.fillText(`${t.weakest}: ${A.roomName(S.rooms[kz])}`, X, Y); g.fillText(`${t.bars(P.bars(S.vals[kz]))}, ${A.fmt(P.mbps(S.vals[kz], S.band))} ${t.mbps}`, X, Y + 27 * u); }
  return c;
}
// two small prints for the answer: the straight way from the router to the room, and what stands in it
export function whyPrint(A, snap, at, room, hits, cw) {
  const { S } = A, c = document.createElement("canvas"), d = A.dpr, p = A.portrait, v0 = { x: 0, y: 0, w: P.W, h: P.H }; c.width = Math.round(cw * d); c.height = Math.round(c.width * (p ? P.W / P.H : P.H / P.W)); const v = { ...v0, k: c.width / (p ? P.H : P.W), p }, g = c.getContext("2d");
  g.drawImage(snap, 0, 0, c.width, c.height); drawInk(g, S.plan, v, { px: Math.max(.7, d * .55) });
  const a = toView(...at, v), b = toView(...room.at, v); if (hits) { g.strokeStyle = "rgba(4,18,44,.8)"; g.lineWidth = 4.4 * d; g.lineCap = "round"; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); g.strokeStyle = "#ff5f52"; g.lineWidth = 1.8 * d; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
  for (const h of hits || []) { const [x, y] = toView(h.x, h.y, v), r = 4.2 * d; for (const [col, w] of [["rgba(4,18,44,.9)", 5 * d], ["#ff5f52", 2 * d]]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r); g.stroke(); } }
  router2D(g, a[0], a[1], .42 * d); g.fillStyle = PAPER; g.strokeStyle = INK; g.lineWidth = d; g.beginPath(); g.roundRect(b[0] - 4 * d, b[1] - 6.5 * d, 8 * d, 13 * d, 1.6 * d); g.fill(); g.stroke(); return c;
}
