// All drawing. World units are metres, y up. Nothing here knows the rules of the game.
import { P, floorY } from "./sim.js";
export const C = { paper: "#f1e6cd", room: "#f7efdc", shaft: "#c3b392", shaft2: "#b3a27f", ink: "#1d1a17", soft: "#6b6052", wash: "rgba(70,55,35,.13)", brass: "#b5862f", brassHi: "#ecca7c", brassLo: "#7b5718", lamp: "#ffd98c", red: "#c5301f", steel: "#4a4641", wood: "#9a6a3c", woodLo: "#6d4726" };
export const X = { wl: -1.55, wr: 1.85, wt: 0.35, rail: 0.99, car: 0.9, gA: -1.14, gB: -1.42, cw: P.geo.xCw, cwHalf: 0.25, ropeGap: 0.085 };
export const MR = { floor: 45.5, top: 48.45, l: -2.75, r: 3.45 };
const TAU = Math.PI * 2;
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
export const ropeOff = i => (i - 2.5) * X.ropeGap;

// ---------- pens
function pen(ctx, s) {
  const k = 1 / s, o = {};
  o.k = k;
  o.line = (x1, y1, x2, y2, w = 1, c = C.ink, over = 0) => {
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L, e = over * k;
    ctx.beginPath(); ctx.moveTo(x1 - ux * e, y1 - uy * e); ctx.lineTo(x2 + ux * e, y2 + uy * e); ctx.lineWidth = w * k; ctx.strokeStyle = c; ctx.stroke();
  };
  o.box = (x, y, w, h, lw = 1, fill = null, c = C.ink, over = 2) => {
    if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
    if (lw) { o.line(x, y, x + w, y, lw, c, over); o.line(x, y + h, x + w, y + h, lw, c, over); o.line(x, y, x, y + h, lw, c, over); o.line(x + w, y, x + w, y + h, lw, c, over); }
  };
  o.path = (pts, lw = 1, fill = null, c = C.ink, close = false) => {
    ctx.beginPath(); pts.forEach((p, i) => p.length === 2 ? (i ? ctx.lineTo(...p) : ctx.moveTo(...p)) : ctx.bezierCurveTo(...p)); if (close) ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw * k; ctx.strokeStyle = c; ctx.stroke(); }
  };
  o.circ = (x, y, r, lw = 1, fill = null, c = C.ink, a0 = 0, a1 = TAU) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), a0, a1); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw * k; ctx.strokeStyle = c; ctx.stroke(); } };
  o.ell = (x, y, rx, ry, lw = 1, fill = null, c = C.ink, a0 = 0, a1 = TAU) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, a0, a1); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw * k; ctx.strokeStyle = c; ctx.stroke(); } };
  o.hatch = (x, y, w, h, gap = 0.12, c = "rgba(29,26,23,.25)", lw = 0.6, dir = 1) => {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.beginPath();
    for (let q = -h; q < w; q += gap) { if (dir > 0) { ctx.moveTo(x + q, y); ctx.lineTo(x + q + h, y + h); } else { ctx.moveTo(x + q, y + h); ctx.lineTo(x + q + h, y); } }
    ctx.lineWidth = lw * k; ctx.strokeStyle = c; ctx.stroke(); ctx.restore();
  };
  o.poche = (x, y, w, h) => { ctx.fillStyle = "#2a2520"; ctx.fillRect(x, y, w, h); o.hatch(x, y, w, h, 0.09, "rgba(241,230,205,.16)", 0.6); };
  o.text = (t, x, y, px, c = C.ink, align = "center", font = "'Sorts Mill Goudy',Songti SC,serif") => { ctx.save(); ctx.translate(x, y); ctx.scale(k, -k); ctx.font = px + "px " + font; ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillStyle = c; ctx.fillText(t, 0, 0); ctx.restore(); };
  return o;
}

// ---------- furniture. Local frame: x from the shaft wall outward (0..4.4), y 0..3.2
const V = [
  // piano + lamp
  (p) => { p.box(.7, .0, 1.35, 1.15, 1, "#8a6a48"); p.box(.6, .62, 1.55, .1, 1, "#f7efdc"); p.box(.82, .78, 1.1, .3, .7, "#75573a"); p.line(.8, 0, .8, .62, 1); p.box(2.45, 0, .4, .48, 1, "#75573a"); lamp(p, .9, 1.15, .42); frame(p, 2.6, 1.75, .6, .75); frame(p, 1.35, 1.85, .7, .5); },
  // arm chair + shelves
  (p) => { shelf(p, .45, 0, 1.3, 2.35, 5); p.path([[2.2, .1], [2.2, .95, 2.35, 1.1, 2.55, 1.05], [2.65, .55], [3.15, .5], [3.3, .75], [3.5, .7], [3.5, .1]], 1.2, "#8c7f62", C.ink, true); floorLamp(p, 2.05); rug(p, 1.9, 3.8); },
  // kitchen
  (p) => { p.box(.5, 0, .85, .9, 1, "#e9dfc8"); p.box(.55, .12, .75, .5, .8, "#d7cab0"); for (let i = 0; i < 3; i++) p.circ(.68 + i * .24, .76, .05, .7); p.box(.5, .9, .85, .55, .8, "#efe6d2"); p.path([[.7, .9], [.72, 1.18], [1.12, 1.18], [1.14, .9]], 1, "#b9ab8d", C.ink, true); p.line(1.14, 1.05, 1.4, 1.15, 1.2); p.box(1.35, 0, 1.6, .85, 1, "#f0e7d3"); p.line(1.9, 0, 1.9, .85, .7); p.line(2.4, 0, 2.4, .85, .7); p.box(1.5, 1.55, 1.3, .75, 1, "#f0e7d3"); p.line(2.15, 1.55, 2.15, 2.3, .7); pend(p, 2.2, .8); },
  // bath
  (p) => { tiles(p, .35, 0, 3.1, 1.4); p.path([[.75, .62], [.8, .15, .95, .12, 1.2, .12], [1.9, .12], [2.2, .14, 2.3, .3, 2.35, .75]], 1.3, "#fffaf0", C.ink); p.line(.65, .62, 2.45, .78, 2); p.circ(.98, .06, .06, 1); p.circ(2, .06, .06, 1); p.path([[.75, .7], [.75, 1.0], [.95, 1.0], [.95, .92]], 1.4, null, C.brassLo); p.box(2.75, .62, .5, .18, 1, "#fffaf0"); p.line(3, 0, 3, .62, 2); p.ell(3, 1.55, .27, .4, 1.2, "#e6dcc4"); },
  // dining
  (p) => { p.line(.9, .74, 2.7, .74, 3); p.line(1.8, 0, 1.8, .74, 2); p.line(1.4, 0, 2.2, 0, 2); chair(p, .62, 1); chair(p, 3, -1); p.path([[1.6, .78], [1.62, 1.0], [1.98, 1.0], [2, .78]], 1, "#cbb98f", C.ink, true); p.circ(1.72, 1.1, .1, .8, "#a9a27a"); p.circ(1.9, 1.12, .1, .8, "#8f9470"); pend(p, 1.8, 1.0); frame(p, .6, 1.6, .7, .9); },
  // bed
  (p) => { p.box(.55, 0, .1, 1.2, 1.2, C.wood); p.box(2.65, 0, .1, .75, 1.2, C.wood); p.path([[.65, .28], [.65, .62], [1.2, .68], [2.65, .58], [2.65, .28]], 1, "#e6dabd", C.ink, true); p.path([[.7, .62], [.75, .86], [1.15, .84], [1.2, .66]], 1, "#fffaf0", C.ink, true); p.box(3.0, 0, .5, .55, 1, C.wood); lamp(p, 3.25, .55, .36); frame(p, 1.3, 1.55, .95, .62); },
  // easel
  (p) => { p.line(1.1, 0, 1.55, 2.1, 1.5); p.line(2.0, 0, 1.6, 2.1, 1.5); p.line(1.55, 2.1, 1.55, 0, 1); p.box(1.05, .85, 1.0, .95, 1.2, "#fbf5e6"); p.path([[1.15, 1.0], [1.35, 1.3, 1.5, 1.1, 1.65, 1.35], [1.75, 1.5, 1.85, 1.2, 1.98, 1.25]], 1.6, null, "#8d7b55"); p.circ(1.78, 1.6, .08, .7, C.lamp); p.box(2.5, 0, .4, .62, 1, "#8a7a5c"); plant(p, 3.4, 0); frame(p, .45, 1.9, .5, .6); },
  // desk, typewriter, window cat
  (p) => { p.line(.6, .74, 2.2, .74, 3); p.box(.68, 0, .45, .72, 1, C.wood); p.line(2.1, 0, 2.1, .74, 1.6); p.path([[1.3, .77], [1.35, .97], [1.75, .97], [1.82, .77]], 1, "#3b352e", C.ink, true); p.box(1.42, .97, .28, .25, .8, "#fffaf0"); lamp(p, .85, .77, .4); chair(p, 2.5, -1); win(p, 2.9, 1.0, .9, 1.5); cat(p, 3.35, 1.0); },
  // gramophone
  (p) => { p.box(.7, 0, .8, .78, 1, C.wood); p.box(.8, .78, .6, .16, 1, C.woodLo); p.path([[1.1, .95], [1.15, 1.25, 1.2, 1.3, 1.0, 1.5], [1.0, 1.9], [1.65, 1.85], [1.75, 1.45], [1.35, 1.4, 1.25, 1.2, 1.2, .95]], 1.1, C.brass, C.ink, true); p.path([[2.2, 0], [2.2, .75, 2.3, .9, 2.6, .85], [3.9, .85], [4.1, .8, 4.1, .3, 4.1, 0]], 1.2, "#84775c", C.ink, true); p.line(2.35, .45, 4.0, .45, .8); frame(p, 2.7, 1.5, 1.0, .75); floorLamp(p, 1.85); },
  // laundry + sewing
  (p) => { p.line(.6, .74, 1.9, .74, 2.5); p.line(.75, 0, .75, .74, 1.5); p.line(1.75, 0, 1.75, .74, 1.5); p.path([[.9, .77], [.95, 1.12], [1.5, 1.12], [1.5, .95], [1.1, .95], [1.1, .77]], 1, "#2f2a25", C.ink, true); p.circ(1.6, 1.0, .12, 1); p.ell(1.25, .25, .25, .2, 1); p.path([[2.5, 0], [2.6, .9, 2.45, 1.0, 2.6, 1.35], [3.0, 1.35], [3.15, 1.0, 3.0, .9, 3.1, 0]], 1, "#cdbf9c", C.ink, true); p.line(2.8, 1.35, 2.8, 1.5, 1.6); p.line(.5, 2.55, 3.8, 2.4, .8); for (let i = 0; i < 4; i++) p.path([[.8 + i * .7, 2.53 - i * .03], [.82 + i * .7, 1.95], [1.2 + i * .7, 1.95], [1.22 + i * .7, 2.5 - i * .03]], .8, "#efe4cc", C.ink, true); },
  // dogs' breakfast: hall table, umbrella stand, dog
  (p) => { p.line(.6, .78, 1.6, .78, 2); p.line(.7, 0, .7, .78, 1.2); p.line(1.5, 0, 1.5, .78, 1.2); plant(p, 1.1, .78, .6); p.ell(1.1, 1.95, .3, .42, 1.2, "#e6dcc4"); p.path([[2.0, 0], [1.98, .55], [2.3, .55], [2.28, 0]], 1, C.brassLo, C.ink, true); p.line(2.08, .4, 2.0, 1.0, 1.4); p.line(2.2, .4, 2.32, .95, 1.4); dog(p, 3.1, 0); frame(p, 2.7, 1.6, .8, .6); },
  // telescope
  (p) => { win(p, 2.2, .9, 1.3, 1.8); p.line(1.1, 0, 1.4, 1.15, 1.2); p.line(1.7, 0, 1.4, 1.15, 1.2); p.line(1.4, 0, 1.4, 1.15, 1); p.path([[.95, 1.0], [.9, 1.12], [2.0, 1.62], [2.07, 1.46]], 1, C.brass, C.ink, true); shelf(p, .35, 1.7, .9, .9, 2); rug(p, .8, 3.2); },
];
function frame(p, x, y, w, h) { p.box(x, y, w, h, 1.1, "#efe3c6"); p.box(x + .07, y + .07, w - .14, h - .14, .5, "#ded0ad"); p.path([[x + .1, y + .12], [x + w * .4, y + h * .6], [x + w * .6, y + h * .35], [x + w - .1, y + h * .65]], .6); }
function lamp(p, x, y, h) { p.circ(x, y + h * .75, h * 1.5, 0, "rgba(255,217,140,.35)"); p.line(x, y, x, y + h * .6, 1.2); p.path([[x - h * .42, y + h * .55], [x - h * .22, y + h], [x + h * .22, y + h], [x + h * .42, y + h * .55]], .9, C.lamp, C.ink, true); }
function floorLamp(p, x) { p.circ(x, 1.5, .62, 0, "rgba(255,217,140,.35)"); p.line(x, 0, x, 1.45, 1.1); p.line(x - .15, .02, x + .15, .02, 1.6); p.path([[x - .25, 1.4], [x - .12, 1.72], [x + .12, 1.72], [x + .25, 1.4]], .9, C.lamp, C.ink, true); }
function pend(p, x, d) { p.circ(x, 3.1 - d, .6, 0, "rgba(255,217,140,.35)"); p.line(x, 3.2, x, 3.2 - d + .15, .8); p.path([[x - .28, 3.02 - d], [x, 3.3 - d], [x + .28, 3.02 - d]], .9, C.lamp, C.ink, true); }
function shelf(p, x, y, w, h, n) { p.box(x, y, w, h, 1.1, "#a98457"); const tone = ["#3f352b", "#7c6a4c", "#cdb98d", "#5d5040", "#93805a"]; for (let i = 0; i < n; i++) { const yy = y + h / n * i; p.line(x, yy, x + w, yy, 1); let q = x + .06; while (q < x + w - .14) { const bw = .05 + rnd() * .06, bh = h / n * (.5 + rnd() * .32); p.box(q, yy + .02, bw, bh, .4, tone[(rnd() * 5) | 0], C.ink, 0); q += bw + (rnd() < .15 ? .1 : .005); } } }
function chair(p, x, d) { p.line(x, 0, x, 1.05, 1.5); p.line(x, .46, x + d * .42, .46, 1.8); p.line(x + d * .42, 0, x + d * .42, .46, 1.4); p.line(x, .8, x + d * .02, .8, 1); }
function plant(p, x, y, k = 1) { p.path([[x - .14 * k, y], [x - .18 * k, y + .3 * k], [x + .18 * k, y + .3 * k], [x + .14 * k, y]], 1, "#b08a5c", C.ink, true); for (let i = -3; i <= 3; i++) p.path([[x, y + .3 * k], [x + i * .05 * k, y + .8 * k, x + i * .13 * k, y + 1.0 * k, x + i * .2 * k, y + (1.15 - Math.abs(i) * .12) * k]], 1.6, null, "#6d7350"); }
function rug(p, a, b) { p.line(a, .03, b, .03, 3.2, "#8f7650"); }
function tiles(p, x, y, w, h) { for (let i = 0; i <= w / .2; i++) p.line(x + i * .2, y, x + i * .2, y + h, .3, C.soft); for (let i = 0; i <= h / .2; i++) p.line(x, y + i * .2, x + w, y + i * .2, .3, C.soft); }
function win(p, x, y, w, h) { p.box(x, y, w, h, 1.3, "#aeb2a8"); p.line(x + w / 2, y, x + w / 2, y + h, 1); p.line(x, y + h / 2, x + w, y + h / 2, 1.4); p.box(x - .08, y - .08, w + .16, .08, 1, "#f7efdc"); }
function cat(p, x, y) { p.path([[x - .18, y], [x - .2, y + .3, x - .05, y + .34, x, y + .36], [x - .02, y + .5], [x + .06, y + .44], [x + .13, y + .5], [x + .16, y + .36], [x + .16, y + .2, x + .12, y + .1, x + .12, y]], 0, "#26211c", C.ink, true); p.path([[x - .18, y + .02], [x - .34, y + .02, x - .34, y - .25, x - .26, y - .3]], 2, null, "#26211c"); }
function dog(p, x, y) { p.path([[x - .3, y], [x - .28, y + .32], [x - .36, y + .46], [x - .24, y + .42], [x + .12, y + .42], [x + .2, y + .6], [x + .32, y + .58], [x + .42, y + .48], [x + .28, y + .44], [x + .22, y + .3], [x + .2, y], [x + .13, y], [x + .1, y + .24], [x - .18, y + .22], [x - .22, y]], 0, "#3a3128", C.ink, true); }

// ---------- everything that never moves
const bricks = (p, x, y, w, h) => { p.poche(x, y, w, h); };
export function drawStatic(ctx, s, ya, yb, detail = 1) {
  const p = pen(ctx, s), vis = (a, b) => b > ya && a < yb; seed = 11;
  ctx.lineCap = "butt"; ctx.lineJoin = "round";
  // sky + ground behind the building
  if (vis(43.9, 52)) { const g = ctx.createLinearGradient(0, 43.9, 0, 51); g.addColorStop(0, "#e9d6ae"); g.addColorStop(1, "#f1e6cd"); ctx.fillStyle = g; ctx.fillRect(-30, 43.9, 60, 9); skyline(p); }
  if (vis(-3, 1.9)) { ctx.fillStyle = "#d8c7a2"; ctx.fillRect(-30, -3, 60, 4.9); p.hatch(-30, -3, 60, 4.9, .22, "rgba(29,26,23,.28)", .7); p.line(-30, 1.9, 30, 1.9, 2); }
  // rooms
  for (let f = 1; f <= 12; f++) {
    const y = floorY(f), seedF = f * 97; if (!vis(y - .4, y + 3.6)) continue;
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? X.wl - X.wt : X.wr + X.wt;
      ctx.save(); ctx.translate(x0, y); ctx.scale(side, 1); seed = seedF + (side > 0 ? 13 : 0);
      ctx.fillStyle = C.room; ctx.fillRect(0, 0, 9, 3.2);
      const g = ctx.createLinearGradient(0, 0, 0, 3.2); g.addColorStop(0, "rgba(150,120,70,.16)"); g.addColorStop(.5, "rgba(150,120,70,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, 9, 3.2);
      if (detail > .4) { p.line(0, .12, 4.4, .12, .5, C.soft); p.line(0, 2.95, 4.4, 2.95, .5, C.soft); if (f % 3 === 0) { p.line(0, .95, 4.4, .95, .5, C.soft); for (let q = .15; q < 4.3; q += .42) p.box(q, .2, .34, .64, .3, null, C.soft, 0); } else if (f % 3 === 1) for (let q = .1; q < 4.4; q += .22) p.line(q, .12, q, 2.95, .25, "rgba(107,96,82,.5)"); }
      const idx = f === 1 ? -1 : ((f - 2) * 2 + (side > 0 ? 1 : 0) * 1 + (f > 7 ? 0 : 0)) % V.length;
      if (f === 1) lobby(p, side); else V[(idx + (f >= 8 ? 5 : 0)) % V.length](p);
      // far wall
      p.poche(4.4, 0, .3, 3.2); ctx.fillStyle = C.paper; ctx.fillRect(4.7, -.4, 30, 4);
      if (f > 1) { ctx.fillStyle = C.room; ctx.fillRect(4.4, .9, .3, 1.5); p.box(4.5, .9, .1, 1.5, .8, "#cfcbb8"); }
      ctx.restore();
    }
    // slab with joists
    p.poche(-6.7, y - .3, -X.wl * -1 - X.wt + 6.7 - 0, .3); p.poche(X.wr, y - .3, 5.15, .3);
  }
  // roof of the block
  if (vis(43.3, 45.2)) { p.poche(-6.9, 43.6, 6.9 + X.wl, .34); p.poche(X.wr, 43.6, 5.4, .34); p.poche(-6.9, 43.6, .3, 1.1); p.poche(6.95, 43.6, .3, 1.1); p.box(-7.0, 44.7, .5, .1, 1, C.paper); p.box(6.85, 44.7, .5, .1, 1, C.paper); tank(p, -4.9, 43.94); chimney(p, 5.4, 43.94); }
  // basement
  if (vis(-1, 1.9)) {
    for (const side of [-1, 1]) { const x0 = side < 0 ? X.wl - X.wt : X.wr + X.wt; ctx.save(); ctx.translate(x0, -.55); ctx.scale(side, 1); ctx.fillStyle = "#e5d8ba"; ctx.fillRect(0, 0, 4.4, 2.15); p.poche(0, -.3, 4.7, .3); p.poche(4.4, 0, .3, 2.2); side < 0 ? boiler(p) : trunks(p); ctx.restore(); }
    p.poche(X.wl - X.wt, -.3, X.wr - X.wl + 2 * X.wt, .3);
  }
  // shaft
  const sa = Math.max(0, ya), sb = Math.min(P.ceil, yb);
  if (sb > sa) {
    const g = ctx.createLinearGradient(X.wl, 0, X.wr, 0); g.addColorStop(0, "#a89672"); g.addColorStop(.16, C.shaft); g.addColorStop(.8, C.shaft); g.addColorStop(1, "#a08e6b"); ctx.fillStyle = g; ctx.fillRect(X.wl, sa, X.wr - X.wl, sb - sa);
    // back wall courses
    if (detail > .4) { for (let y = Math.floor(sa / .14) * .14; y < sb; y += .14) { if (y < 0) continue; p.line(X.wl, y, X.wr, y, .35, "rgba(60,45,25,.2)"); const o = Math.round(y / .14) % 2 ? .15 : 0; for (let x = X.wl + o; x < X.wr; x += .3) p.line(x, y, x, Math.min(sb, y + .14), .3, "rgba(60,45,25,.17)"); } }
    for (let f = 1; f <= 12; f++) { const y = floorY(f); if (vis(y - .4, y + 2.6)) door(p, f, y, detail); }
    // walls
    bricks(p, X.wl - X.wt, Math.max(-.3, ya), X.wt, sb - Math.max(-.3, ya)); bricks(p, X.wr, Math.max(-.3, ya), X.wt, sb - Math.max(-.3, ya));
    p.line(X.wl, sa, X.wl, sb, 1.6); p.line(X.wr, sa, X.wr, sb, 1.6);
    // rails and brackets
    for (const x of [-X.rail, X.rail]) { p.line(x - .035, sa, x - .035, sb, 1); p.line(x + .035, sa, x + .035, sb, 1); ctx.fillStyle = "#8d877b"; ctx.fillRect(x - .03, sa, .06, sb - sa); p.line(x - .01, sa, x - .01, sb, .7, "#d9d2c0"); }
    for (const x of [X.cw - .31, X.cw + .31]) { ctx.fillStyle = "#8d877b"; ctx.fillRect(x - .02, sa, .04, sb - sa); p.line(x - .02, sa, x - .02, sb, .7); p.line(x + .02, sa, x + .02, sb, .7); }
    if (detail > .4) for (let y = 1.2; y < 45; y += 1.75) if (vis(y - .2, y + .2)) { p.box(X.wl, y - .04, .51, .08, .7, "#6d675c", C.ink, 0); p.box(X.rail + .05, y - .04, .1, .08, .7, "#6d675c", C.ink, 0); p.box(X.cw + .33, y - .04, .07, .08, .7, "#6d675c", C.ink, 0); }
  }
  if (vis(45, 52)) machineRoom(ctx, p);
}
function door(p, f, y, d) {
  // landing doors seen on the back wall
  p.box(-.62, y, 1.24, 2.15, 1, "#a48d63", C.ink, 0); p.box(-.55, y, .54, 2.08, .6, "#b59d71", C.ink, 0); p.box(.01, y, .54, 2.08, .6, "#b59d71", C.ink, 0);
  if (d > .4) { p.box(-.47, y + 1.15, .38, .75, .5, "#c8b184", C.ink, 0); p.box(.09, y + 1.15, .38, .75, .5, "#c8b184", C.ink, 0); p.box(-.47, y + .2, .38, .75, .5, null, C.ink, 0); p.box(.09, y + .2, .38, .75, .5, null, C.ink, 0); }
  p.box(-.75, y - .1, 1.5, .1, .8, "#5c5347", C.ink, 0);
  if (d > .4) p.text(String(f), 0, y + 2.42, Math.max(9, .34 / p.k), "#2a2520");
}
function lobby(p, side) {
  for (let i = 0; i < 4; i++) { p.box(.15 + i * 1.08, 0, .16, 2.9, .8, "#d9c79c"); p.box(.08 + i * 1.08, 2.75, .3, .18, .8, "#e9dcb9"); }
  for (let i = 0; i < 14; i++) p.box(i * .32, -.0, .16, .05, 0, i % 2 ? C.ink : "#c9b78f");
  if (side < 0) { p.box(1.5, 0, 1.2, 1.05, 1.2, C.wood); p.box(1.42, 1.05, 1.36, .08, 1, C.woodLo); lamp(p, 2.4, 1.13, .34); p.box(3.4, 0, .75, 2.35, 1.2, "#b9c0b4"); p.line(3.78, 0, 3.78, 2.35, 1); } else { p.circ(1.9, 2.1, .34, 1.4, "#fbf5e6"); p.line(1.9, 2.1, 1.9, 2.34, 1.4); p.line(1.9, 2.1, 2.05, 2.03, 1.4); p.path([[1.2, 0], [1.2, .42], [2.7, .42], [2.7, 0]], 1.2, "#84775c"); p.line(1.2, .42, 1.2, .95, 1.4); p.line(1.2, .95, 2.7, .95, 1.6); plant(p, 3.4, 0, 1.4); }
  pend(p, 2.2, .55);
}
function boiler(p) { p.box(.7, .1, 1.5, 1.35, 1.2, "#6d655a"); for (let i = 1; i < 6; i++) p.line(.7 + i * .25, .1, .7 + i * .25, 1.45, .6); p.circ(1.45, .6, .22, 1.2, "#e7a45a"); p.path([[1.45, 1.45], [1.45, 1.9], [4.4, 1.9]], 4, null, "#4a4641"); p.line(2.6, 0, 2.9, .9, 1.6); p.path([[3, 0], [3.2, .4, 3.5, .5, 3.7, .35], [4, .2, 4.1, 0, 4.2, 0]], 1, "#2a2520", C.ink, true); }
function trunks(p) { p.box(.6, 0, 1.1, .6, 1, C.wood); p.line(.6, .4, 1.7, .4, .8); p.box(.8, .6, .8, .42, 1, "#84775c"); p.box(2.1, 0, .9, .85, 1, "#9b7b4f"); p.line(2.1, .55, 3, .55, .8); p.circ(3.7, .33, .33, 1.4); p.circ(3.7, .33, .05, 1); p.line(3.7, .33, 3.45, .8, 1.4); p.line(3.3, .8, 3.6, .8, 1.6); }
function tank(p, x, y) { for (const q of [-.7, -.25, .25, .7]) p.line(x + q, y, x + q * .9, y + 1.1, 1.8); p.line(x - .7, y + .1, x + .7, y + 1, .7); p.line(x + .7, y + .1, x - .7, y + 1, .7); p.box(x - .85, y + 1.1, 1.7, 1.7, 1.2, "#9d7a4e"); for (let i = 1; i < 9; i++) p.line(x - .85 + i * .19, y + 1.1, x - .85 + i * .19, y + 2.8, .4); for (let i = 0; i < 4; i++) p.line(x - .87, y + 1.3 + i * .42, x + .87, y + 1.3 + i * .42, 1, "#4a3a22"); p.path([[x - .95, y + 2.8], [x, y + 3.5], [x + .95, y + 2.8]], 1.2, "#6b543a", C.ink, true); }
function chimney(p, x, y) { p.box(x - .4, y, .8, 1.5, 1, "#a98457"); p.hatch(x - .4, y, .8, 1.5, .12); p.box(x - .46, y + 1.5, .92, .12, 1, C.paper); p.box(x - 1.6, y, .9, .6, 1, "#cbbd9a"); p.line(x - 1.6, y + .6, x - .7, y + .9, 1); }
function skyline(p) { const c = "rgba(120,95,55,.20)"; seed = 5; let x = -16; while (x < 18) { const w = 1 + rnd() * 1.6, h = .8 + rnd() * 3.4; p.box(x, 43.9, w, h, .6, c, "rgba(60,45,25,.28)", 0); if (rnd() < .35) p.box(x + w * .3, 43.9 + h, w * .4, .7, .6, c, "rgba(60,45,25,.28)", 0); x += w + rnd() * .5; } }
function machineRoom(ctx, p) {
  const { floor: y, top, l, r } = MR;
  ctx.fillStyle = "#efe3c8"; ctx.fillRect(l, y, r - l, top - y);
  const g = ctx.createRadialGradient(.5, 47.6, .2, .5, 47.2, 3.4); g.addColorStop(0, "rgba(255,225,160,.65)"); g.addColorStop(1, "rgba(255,225,160,0)"); ctx.fillStyle = g; ctx.fillRect(l, y, r - l, top - y);
  for (let q = l + .3; q < r; q += .3) p.line(q, y + 1.1, q, top, .25, "rgba(107,96,82,.4)"); p.line(l, y + 1.1, r, y + 1.1, .6, C.soft);
  p.poche(l - .3, y - .3, X.wl - l + .3 + 0, .3); p.poche(X.wr, y - .3, r - X.wr + .3, .3); // slab, open over the shaft
  p.poche(X.wl, y - .3, .03, .3); p.poche(-.84, y - .3, .44, .3); p.poche(.42, y - .3, .6, .3); p.poche(1.8, y - .3, .05, .3);
  p.poche(l - .3, y - .3, .3, top - y + .3); p.poche(r, y - .3, .3, top - y + .3); p.poche(l - .5, top, r - l + 1, .3);
  p.box(l - .6, top + .3, r - l + 1.2, .1, 1, C.paper);
  // window
  p.box(l - .22, y + 1.2, .14, 1.0, .8, "#cfcbb8");
  // control slate on the right
  p.box(2.5, y + .2, .72, 1.75, 1.3, "#3d3a38"); p.box(2.45, y, .82, .2, 1, "#6b543a");
  for (let i = 0; i < 2; i++) { p.circ(2.69 + i * .35, y + 1.66, .13, 1, "#f7efdc"); p.line(2.69 + i * .35, y + 1.62, 2.74 + i * .35, y + 1.72, 1); }
  for (let i = 0; i < 3; i++) { p.box(2.6 + i * .22, y + .95, .1, .3, .8, C.brass, C.ink, 0); p.line(2.65 + i * .22, y + 1.2, 2.65 + i * .22, y + 1.38, 1.6, C.brassHi); }
  for (let i = 0; i < 4; i++) p.circ(2.62 + i * .16, y + .72, .035, .6, C.brassHi); p.line(2.58, y + .5, 3.14, y + .5, .5, "#9b9488"); p.line(2.58, y + .38, 3.14, y + .38, .5, "#9b9488");
  // bed plate
  p.box(-.62, y, 2.4, .12, 1.2, "#6b655b"); p.box(-.5, y + .12, .3, .16, 1, "#7a746a"); p.box(1.2, y + .12, .3, .16, 1, "#7a746a");
  // lamp + ladder + oil can
  p.line(-1.9, top, -1.9, top - .45, 1); p.path([[-2.15, top - .62], [-1.9, top - .42], [-1.65, top - .62]], 1, C.lamp, C.ink, true);
  p.line(-2.45, y, -2.45, y + 2.2, 1.4); p.line(-2.15, y, -2.15, y + 2.2, 1.4); for (let i = 1; i < 8; i++) p.line(-2.45, y + i * .28, -2.15, y + i * .28, 1.1);
  p.path([[2.02, y], [2.02, y + .18], [2.18, y + .18], [2.18, y]], 1, C.brass, C.ink, true); p.path([[2.1, y + .18], [2.12, y + .28], [2.28, y + .34]], 1.2);
}

// ---------- moving things
export class Art {
  constructor() { this.parts = []; this.cut = []; }
  pen(ctx, s) { return pen(ctx, s); }

  sheave(ctx, s, sim, st) {
    const p = pen(ctx, s), G = P.geo, cx = G.R, cy = P.sheaveY, dx = X.ropeGap, ddy = .034;
    const o = i => [ropeOff(i), ropeOff(i) / dx * ddy];
    // motor body: big ring behind
    const mx = cx + .5, my = cy + .2, hot = st.lit.motor;
    if (hot) this.halo(ctx, mx, my + .2, 1.5, hot);
    // feet
    p.path([[mx - .75, MR.floor + .12], [mx - .6, my - .3], [mx + .6, my - .3], [mx + .78, MR.floor + .12]], 1.2, "#57524a", C.ink, true);
    p.circ(mx, my, .86, 1.4, "#4f4a43"); p.circ(mx - .12, my - .05, .86, 1.2, "#69635a"); p.circ(mx - .12, my - .05, .72, .8, "#5a544b");
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + .3; p.circ(mx - .12 + Math.cos(a) * .79, my - .05 + Math.sin(a) * .79, .035, .7, C.brassHi); }
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16; p.line(mx - .12 + Math.cos(a) * .66, my - .05 + Math.sin(a) * .66, mx - .12 + Math.cos(a) * .7, my - .05 + Math.sin(a) * .7, 2, "#8d8577"); }
    // motor cables to the slate
    this.cables(ctx, p, st, mx, my);
    // brake drum
    const bx = cx + .22, by = cy + .09, br = .63;
    if (st.lit.brake) this.halo(ctx, bx, by + .35, 1.15, st.lit.brake);
    const bg = ctx.createRadialGradient(bx - .2, by + .25, .05, bx, by, br); bg.addColorStop(0, "#d9b45e"); bg.addColorStop(1, "#8d6722"); p.circ(bx + .08, by + .03, br, 1, "#6b4d17"); p.circ(bx, by, br, 1.3, bg);
    for (let i = 0; i < 12; i++) { const a = -sim.th / G.R + i * TAU / 12; p.circ(bx + Math.cos(a) * .55, by + Math.sin(a) * .55, .02, .6, C.brassLo); }
    this.brake(ctx, p, sim, st, bx, by, br);
    // drive wheel, oblique stack of 6 grooves
    for (let i = 5; i >= 0; i--) {
      const [ox, oy] = o(i), x = cx + ox, y = cy + oy;
      p.circ(x + .03, y + .012, G.R + .035, .8, C.brassLo); p.circ(x, y, G.R + .01, .7, "#a5782a");
    }
    const [fx, fy] = o(0), x = cx + fx - .03, y = cy + fy - .012;
    const g = ctx.createRadialGradient(x - .18, y + .2, .03, x, y, G.R + .05); g.addColorStop(0, "#f2d891"); g.addColorStop(.6, "#c4953a"); g.addColorStop(1, "#8a6420");
    p.circ(x, y, G.R + .045, 1.4, g);
    if (st.lit.wheel) { ctx.globalAlpha = st.lit.wheel * .6; p.circ(x, y, G.R + .12, 4, null, C.lamp); ctx.globalAlpha = 1; }
    // spokes rotate with the wheel: rope moving car up => car side goes up => clockwise seen from the front
    const a0 = sim.th / G.R * -1 + Math.PI / 2;
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < 5; i++) { const a = a0 + i * TAU / 5, q = .26; ctx.beginPath(); const r0 = .13, r1 = G.R - .07, w0 = .42, w1 = .42; ctx.arc(x, y, r1, a + q, a + TAU / 5 - q); ctx.arc(x, y, r0 + .03, a + TAU / 5 - w0, a + w0, true); ctx.closePath(); ctx.fillStyle = "#5c4216"; ctx.fill(); ctx.lineWidth = .8 * p.k; ctx.strokeStyle = C.ink; ctx.stroke(); }
    p.circ(x, y, .1, 1, "#e5c271"); p.circ(x, y, .045, .8, "#5c4216");
    // deflector
    const ex = G.xCw - G.r, ey = cy - G.dy;
    for (let i = 5; i >= 0; i -= 1) { const [ox, oy] = o(i); p.circ(ex + ox, ey + oy, G.r, .6, "#8d867a"); }
    p.circ(ex + fx - .02, ey + fy, G.r + .02, 1.1, "#a8a193"); const da = -sim.th / G.r; for (let i = 0; i < 4; i++) { const a = da + i * Math.PI / 2; p.circ(ex + fx - .02 + Math.cos(a) * .15, ey + fy + Math.sin(a) * .15, .045, .6, "#5f594f"); } p.circ(ex + fx - .02, ey + fy, .05, 1, "#4a4641");
  }
  cables(ctx, p, st, mx, my) {
    const y = MR.floor, dead = st.b.motor;
    for (let i = 0; i < 2; i++) {
      const a = [mx + .55, my - .52 + i * .1], z = [2.5, y + .42 + i * .16];
      if (!dead) p.path([a, [mx + 1.0, a[1] - .1, 2.1, y + .75 + i * .12 - .5, z[0], z[1]]], 4.4, null, "#26211c"), p.path([a, [mx + 1.0, a[1] - .1, 2.1, y + .75 + i * .12 - .5, z[0], z[1]]], 1.2, null, C.brass);
      else { p.path([a, [a[0] + .25, a[1], a[0] + .32, a[1] - .25, a[0] + .34, a[1] - .34 - i * .08]], 4.4, null, "#26211c"); p.path([z, [z[0] - .2, z[1], z[0] - .28, z[1] - .08, z[0] - .3, z[1] - .22]], 4.4, null, "#26211c"); p.circ(a[0] + .34, a[1] - .36 - i * .08, .04, 0, C.red); p.circ(z[0] - .3, z[1] - .24, .04, 0, C.red); }
    }
  }
  brake(ctx, p, sim, st, bx, by, br) {
    const open = st.b.brake ? Math.min(1, (st.now - st.b.brake) / .25) : st.brakeOpen, d = .015 + open * (st.b.brake ? .2 : .035);
    for (const q of [-1, 1]) {
      ctx.save(); const px = bx + q * (br - .05), py = by - br - .02; ctx.translate(px, py); ctx.rotate(-q * d * .8); ctx.translate(-px, -py);
      p.path([[px, py - .06], [bx + q * (br + .12 + d * .2), by - .3], [bx + q * (br + .14 + d * .2), by + .25], [bx + q * .34, by + br + .2], [bx + q * .26, by + br + .12], [bx + q * (br + .0), by + .2], [bx + q * (br + .0), by - .28]], 1.2, "#5a544b", C.ink, true);
      ctx.beginPath(); ctx.arc(bx, by, br + .025, q > 0 ? -.55 : Math.PI - .55, q > 0 ? .55 : Math.PI + .55); ctx.lineWidth = .05; ctx.strokeStyle = "#2f2a25"; ctx.stroke();
      ctx.restore();
    }
    // spring on top
    const y = by + br + .17;
    if (!st.b.brake) {
      p.box(bx - .16, y - .12, .32, .24, 1.1, C.brass); p.line(bx - .55, y, bx + .55, y, 1.6, "#3a352e");
      for (const q of [-1, 1]) { ctx.beginPath(); for (let i = 0; i <= 10; i++) { const xx = bx + q * (.18 + i * .028), yy = y + (i % 2 ? .1 : -.1); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.lineWidth = 2 * p.k; ctx.strokeStyle = C.brassHi; ctx.stroke(); ctx.lineWidth = .7 * p.k; ctx.strokeStyle = C.ink; ctx.stroke(); }
    } else { const t = Math.min(1, (st.now - st.b.brake) / .7), sx = bx - .3 - t * 1.0, sy = Math.max(MR.floor + .14, y + 1.2 * t - 4 * t * t); ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 7); ctx.beginPath(); for (let i = 0; i <= 10; i++) { const xx = -.16 + i * .032, yy = i % 2 ? .08 : -.08; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.lineWidth = 2.2 * p.k; ctx.strokeStyle = C.red; ctx.stroke(); ctx.restore(); }
  }
  // 6 hoist ropes. st.cuts[i] = null | {y, side, t, th}
  ropes(ctx, s, sim, st, ya, yb) {
    const p = pen(ctx, s), G = P.geo, cx = G.R, cy = P.sheaveY, ex = G.xCw - G.r, ey = cy - G.dy;
    const DX = ex - cx, DY = ey - cy, D = Math.hypot(DX, DY), base = Math.atan2(DY, DX), th = base + Math.acos((G.R - G.r) / D);
    const dash = [.05, .05], hitch = sim.y + P.hitch + .12, cwTop = sim.w + P.cwH - .05;
    if (st.lit.ropes) { const a = st.lit.ropes; ctx.globalAlpha = a * .75; const xg = G.xCar; const gr = ctx.createLinearGradient(xg - .6, 0, xg + .6, 0); gr.addColorStop(0, "rgba(255,217,140,0)"); gr.addColorStop(.5, "rgba(255,217,140,1)"); gr.addColorStop(1, "rgba(255,217,140,0)"); ctx.fillStyle = gr; ctx.fillRect(xg - .6, Math.max(ya, hitch), 1.2, Math.min(yb, cy) - Math.max(ya, hitch)); ctx.globalAlpha = 1; }
    const draw = (pts, off) => { for (const [w, c, dsh] of [[2.1, "#25211d", 0], [.9, "#a39b8b", 1]]) { ctx.beginPath(); pts(); ctx.lineWidth = w * p.k * st.lw; ctx.strokeStyle = c; if (dsh) { ctx.setLineDash(dash); ctx.lineDashOffset = off; } ctx.stroke(); ctx.setLineDash([]); } };
    for (let i = 0; i < 6; i++) {
      const ox = ropeOff(i), oy = ox / X.ropeGap * .034, c = st.cuts[i], off = -sim.th, xc = G.xCar + ox, xw = G.xCw + ox;
      const over = () => { ctx.arc(cx + ox, cy + oy, G.R + .012, Math.PI, th, true); ctx.arc(ex + ox, ey + oy, G.r + .012, th, 0, true); };
      const trem = st.trem && !c ? Math.sin(st.now * 90 + i) * st.trem * .02 : 0;
      if (!c) {
        // slack on the car side shows as a bow
        const slack = Math.max(0, Math.min(.5, sim.l1 - (P.sheaveY - (sim.y + P.hitch)))), sl2 = Math.max(0, Math.min(.5, sim.l2 - (P.sheaveY - cwTop)));
        draw(() => { ctx.moveTo(xc, hitch); slack > .01 ? ctx.bezierCurveTo(xc + slack * .6, hitch + 1, xc - slack * .6, hitch + 2, xc, cy + oy) : ctx.quadraticCurveTo(xc + trem, (Math.max(ya, hitch) + Math.min(yb, cy)) / 2, xc, cy + oy); over(); sl2 > .01 ? ctx.bezierCurveTo(xw - sl2 * .5, (ey + cwTop) / 2 + 1, xw + sl2 * .5, (ey + cwTop) / 2, xw, cwTop) : ctx.lineTo(xw, cwTop); }, off);
        continue;
      }
      const dt = st.now - c.t, onCar = c.side === "car", moved = sim.th - c.th, n0 = sim.n === 0, fall = n0 ? Math.max(0, st.cwAll - sim.w) : 0;
      if (onCar) {
        // loose end hanging from the wheel
        const rec = .5 * (1 - Math.exp(-dt * 9)), end = c.y + rec + moved + fall, wig = Math.exp(-dt * 1.6) * .22 * Math.sin(dt * 14 + i);
        if (end < cy + .2) draw(() => { ctx.moveTo(xc + wig + ox * .8 * Math.min(1, dt * 3), end); ctx.quadraticCurveTo(xc - wig, (end + cy) / 2, xc, cy + oy); over(); ctx.lineTo(xw, cwTop); }, off - fall);
        else { const left = end - cy; const tail = Math.max(0, 1.6 - left * .3); draw(() => { ctx.moveTo(xw + Math.sin(st.now * 20 + i) * .12, Math.min(ey, cwTop + tail + .4)); ctx.lineTo(xw, cwTop); }, off); }
        if (end < cy) p.circ(xc + wig + ox * .8 * Math.min(1, dt * 3), end, .032, 0, C.red);
        // stub on the car roof
        const len = Math.min(1.5, Math.max(.15, c.y - c.hy)), q = Math.min(1, dt / .45), side = i % 2 ? 1 : -1, hx = xc;
        const tipX = hx + side * q * (.28 + .08 * i), tipY = hitch + len * (1 - q) + q * (-.12 - .03 * i);
        draw(() => { ctx.moveTo(hx, hitch); ctx.bezierCurveTo(hx, hitch + len * .6 * (1 - q * .55), hx + side * .25 * q, hitch + len * .7 * (1 - q * .4), tipX, tipY); }, 0); p.circ(tipX, tipY, .032, 0, C.red);
      } else {
        const rec = .5 * (1 - Math.exp(-dt * 9)), end = c.y + rec - moved + (n0 ? 0 : 0), wig = Math.exp(-dt * 1.6) * .15 * Math.sin(dt * 14 + i);
        const carFall = n0 ? Math.max(0, st.carAll - sim.y) : 0;
        if (end + carFall < ey) draw(() => { ctx.moveTo(xc, hitch); ctx.lineTo(xc, cy + oy); over(); ctx.lineTo(xw + wig, end + carFall); }, off + carFall); else draw(() => { ctx.moveTo(xc, hitch); ctx.lineTo(xc + Math.sin(st.now * 18 + i) * .1, Math.min(cy, hitch + 1.4)); }, 0);
        if (end + carFall < ey) p.circ(xw + wig, end + carFall, .032, 0, C.red);
        const q = Math.min(1, dt / .45), side = i % 2 ? 1 : -1; draw(() => { ctx.moveTo(xw, cwTop); ctx.quadraticCurveTo(xw + side * .1, cwTop + .6 * (1 - q) + .15, xw + side * q * .22, cwTop + .7 * (1 - q) - .1 * q); }, 0);
      }
    }
  }
  halo(ctx, x, y, r, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,206,110,${.95 * a})`); g.addColorStop(.45, `rgba(255,214,130,${.55 * a})`); g.addColorStop(1, "rgba(255,214,130,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

  governor(ctx, s, sim, st) {
    const p = pen(ctx, s), y0 = MR.floor, x = (X.gA + X.gB) / 2, r = (X.gA - X.gB) / 2, wy = y0 + .42, b = st.b.gov;
    if (st.lit.gov) this.halo(ctx, x, y0 + .95, 1.15, st.lit.gov);
    // stand
    p.path([[x - .28, y0], [x - .12, wy - .05], [x + .12, wy - .05], [x + .28, y0]], 1.1, "#57524a", C.ink, true);
    p.circ(x, wy, r + .04, 1.2, C.brass); p.circ(x, wy, r - .02, .8, "#8a6420"); const a = -sim.gth / r || 0; for (let i = 0; i < 4; i++) p.line(x, wy, x + Math.cos(a + i * TAU / 4) * r, wy + Math.sin(a + i * TAU / 4) * r, 1.4, C.brassHi); p.circ(x, wy, .035, .8, C.ink);
    // jaw that grips the rope
    const g = sim.tripped ? .0 : .07; p.box(X.gA + .025 + g, wy - .32, .14, .13, 1, sim.tripped ? C.lamp : "#6b655b", C.ink, 0); p.box(X.gA - .13, wy - .3, .1, .1, 1, "#6b655b", C.ink, 0);
    // spindle + fly balls
    const top = wy + .95, v = st.govV, spread = b ? 0 : Math.min(1, (v / P.vTrip) ** 2);
    ctx.save(); if (b) { ctx.translate(x, wy + .2); ctx.rotate(Math.min(1, (st.now - b) / .25) * .55); ctx.translate(-x, -wy - .2); }
    p.box(x - .07, wy + .12, .14, .14, 1, "#57524a"); p.line(x, wy + .2, x, top, 3, "#3a352e"); p.line(x, wy + .2, x, top, 1.2, C.brassHi); p.circ(x, top, .045, 1, C.brass);
    const ph = st.govPh, phi = .35 + spread * .85, L = .42, hx = Math.sin(phi) * L, hy = Math.cos(phi) * L, sl = top - 2 * hy * .72;
    p.box(x - .08, sl - .03, .16, .07, 1, C.brass, C.ink, 0);
    for (const q of [0, Math.PI]) { const cs = Math.cos(ph + q), bx = x + hx * cs, by = top - hy, rr = .088 + .012 * Math.sin(ph + q); if (b && q) continue; p.line(x, top, bx, by, 1.8, "#3a352e"); p.line(x + (bx - x) * .72, top - hy * .72, x + cs * .05, sl, 1.3, "#3a352e"); const gr = ctx.createRadialGradient(bx - .03, by + .03, .01, bx, by, rr); gr.addColorStop(0, "#fff0c0"); gr.addColorStop(.4, "#d6a848"); gr.addColorStop(1, "#7b5718"); p.circ(bx, by, rr, 1, gr); }
    ctx.restore();
    if (b) { const t = Math.min(1, (st.now - b) / .8), bx = x - .2 - t * .7, by = Math.max(y0 + .09, wy + .6 + t * .4 - 4 * t * t); p.circ(bx, by, .09, 1, C.red); }
  }
  govRope(ctx, s, sim, st, ya, yb) {
    const p = pen(ctx, s), wy = MR.floor + .42, py = .62, r = (X.gA - X.gB) / 2, xm = (X.gA + X.gB) / 2, c = st.b.govRope, off = -sim.gth;
    const str = f => { for (const [w, cc, d] of [[1.8, "#25211d", 0], [.7, "#b5a98f", 1]]) { ctx.beginPath(); f(); ctx.lineWidth = w * p.k * st.lw; ctx.strokeStyle = cc; if (d) { ctx.setLineDash([.06, .06]); ctx.lineDashOffset = off; } ctx.stroke(); ctx.setLineDash([]); } };
    if (st.lit.govRope) { ctx.globalAlpha = st.lit.govRope * .8; ctx.fillStyle = C.lamp; ctx.fillRect(X.gA - .07, Math.max(ya, py), .14, Math.min(yb, wy) - Math.max(ya, py)); ctx.globalAlpha = 1; }
    if (!c) { str(() => { ctx.moveTo(X.gA, py); ctx.lineTo(X.gA, wy); }); ctx.save(); off; str(() => { ctx.moveTo(X.gB, wy); ctx.lineTo(X.gB, py); }); ctx.restore(); }
    else {
      const dt = st.now - c, y0 = st.govCutY, fall = 4.9 * dt * dt, wig = Math.exp(-dt * 1.3) * .12;
      const carY = sim.y + 1.2;
      if (y0 > carY) { str(() => { ctx.moveTo(X.gA, wy); ctx.lineTo(X.gA + wig * Math.sin(dt * 13), y0); }); p.circ(X.gA + wig * Math.sin(dt * 13), y0, .03, 0, C.red); const e = Math.max(carY - .6, y0 - fall * 2); str(() => { ctx.moveTo(X.gA, py); ctx.lineTo(X.gA, Math.min(carY, e)); if (e > carY) ctx.lineTo(X.gA - wig, e); }); }
      else { str(() => { ctx.moveTo(X.gA, wy); ctx.lineTo(X.gA, carY); const e = Math.max(y0, carY - 2); ctx.lineTo(X.gA + wig * Math.sin(dt * 13), e); }); p.circ(X.gA + wig * Math.sin(dt * 13), Math.max(y0, carY - 2), .03, 0, C.red); const e = Math.max(py, y0 - fall); if (e > py + .05) str(() => { ctx.moveTo(X.gA, py); ctx.lineTo(X.gA, e); }); }
      str(() => { ctx.moveTo(X.gB, wy); ctx.lineTo(X.gB, py); });
    }
    // pit tension wheel
    if (ya < 1.4) { const a = -sim.gth / r || 0; p.box(xm - .05, .12, .1, .45, .9, "#57524a", C.ink, 0); p.box(xm - .17, 0.02, .34, .2, 1, "#3d3a38"); p.circ(xm, py, r + .03, 1.1, "#8d867a"); for (let i = 0; i < 4; i++) p.line(xm, py, xm + Math.cos(a + i * TAU / 4) * r, py + Math.sin(a + i * TAU / 4) * r, 1.1); }
  }
  cw(ctx, s, sim, st) {
    const p = pen(ctx, s), y = sim.w, x = X.cw - X.cwHalf, w = X.cwHalf * 2, h = P.cwH;
    if (st.lit.cw) this.halo(ctx, X.cw, y + 1.6, 1.9, st.lit.cw);
    ctx.save(); if (st.cwTilt) { ctx.translate(X.cw, y); ctx.rotate(st.cwTilt); ctx.translate(-X.cw, -y); }
    p.box(x, y, w, h, 1.5, "#4a4641"); for (let i = 0; i < 11; i++) { p.box(x + .05, y + .16 + i * .235, w - .1, .215, .7, i % 2 ? "#6a645b" : "#625c53", C.ink, 0); }
    p.box(x - .03, y + h - .3, w + .06, .16, 1, "#3a352e"); p.box(x - .03, y, w + .06, .12, 1, "#3a352e"); for (const q of [x - .06, x + w]) for (const yy of [y + .05, y + h - .25]) p.box(q, yy, .06, .14, .8, C.brass, C.ink, 0);
    for (let i = 0; i < 6; i++) p.line(X.cw + ropeOff(i), y + h - .14, X.cw + ropeOff(i), y + h - .02, 2, "#8d867a");
    ctx.restore();
  }
  buffer(ctx, s, x, stroke, broken, lit, now, w = .24) {
    const p = pen(ctx, s); if (lit) this.halo(ctx, x, .8, 1.15, lit);
    p.box(x - w - .08, 0, 2 * w + .16, .1, 1.1, "#4a4641");
    if (broken) { const t = Math.min(1, (now - broken) / .4); ctx.save(); ctx.translate(x + w, .1); ctx.rotate(-t * 1.25); ctx.translate(-x - w, -.1); this._buf(p, x, 0, w); ctx.restore(); return; }
    this._buf(p, x, stroke, w);
  }
  _buf(p, x, stroke, w) {
    const top = P.bufTop - stroke; p.box(x - .07, .4, .14, top - .4, 1, "#d8d0bd", C.ink, 0); p.box(x - w * .55, .1, w * 1.1, .62, 1.2, C.brass); p.box(x - w * .66, .62, w * 1.32, .1, 1, C.brassLo);
    const n = 7, y0 = .74, y1 = top - .04; for (let i = 0; i < n; i++) { const ya = y0 + (y1 - y0) * i / n, yb = y0 + (y1 - y0) * (i + 1) / n; p.line(x - w * .7, ya, x + w * .7, yb, 2.2, "#6a645b"); p.line(x - w * .7, ya, x + w * .7, yb, .6, "#d8d0bd"); }
    p.box(x - w * .85, top - .06, w * 1.7, .08, 1.1, "#3a352e", C.ink, 0);
  }
  jaw(ctx, p, side, y, sim, st) {
    const key = side < 0 ? "jawL" : "jawR", b = st.b[key], x = side * X.rail, set = sim.set && !b;
    if (st.lit[key]) this.halo(ctx, x, y - .2, .72, st.lit[key]);
    if (b) { const t = st.now - b; const yy = y - .26 - Math.min(40, 4.9 * t * t); ctx.save(); ctx.translate(x, yy); ctx.rotate(side * t * 5); p.box(-.12, -.1, .24, .2, 1, C.red); ctx.restore(); p.line(x - side * .1, y - .12, x - side * .02, y - .3, 1.6, C.red); return; }
    p.box(x - .17, y - .38, .34, .3, 1.2, "#4a4641", C.ink, 0);
    const d = set ? 0 : .045;
    for (const q of [-1, 1]) p.path([[x + q * (.035 + d), y - .36 - (set ? -.04 : .04)], [x + q * (.035 + d), y - .1 - (set ? -.04 : .04)], [x + q * (.1 + d * .5), y - .1 - (set ? -.04 : .04)], [x + q * (.13 + d * .5), y - .36 - (set ? -.04 : .04)]], 1, set ? C.brassHi : C.brass, C.ink, true);
  }
  car(ctx, s, sim, st) {
    const p = pen(ctx, s), y = sim.y, w = X.car, H = 2.35;
    // glow on the shaft
    if (st.light > 0) { const g = ctx.createRadialGradient(0, y + 1.3, .6, 0, y + 1.2, 2.6); g.addColorStop(0, `rgba(255,214,130,${.55 * st.light})`); g.addColorStop(1, "rgba(255,214,130,0)"); ctx.save(); ctx.beginPath(); ctx.rect(X.wl, 0, X.wr - X.wl, P.ceil); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(-3, y - 2, 6, 6); ctx.restore(); }
    // frame
    p.box(-w - .06, y - .12, .08, 2.95, 1.1, "#5a544b", C.ink, 0); p.box(w - .02, y - .12, .08, 2.95, 1.1, "#5a544b", C.ink, 0);
    // cab
    ctx.fillStyle = st.light > .5 ? "#ffe9b4" : "#b7a67f"; ctx.fillRect(-w + .02, y, 2 * w - .04, H);
    const g = ctx.createRadialGradient(0, y + 2.0, .1, 0, y + 1.5, 1.7); g.addColorStop(0, `rgba(255,250,225,${st.light})`); g.addColorStop(.6, `rgba(255,214,130,${.5 * st.light})`); g.addColorStop(1, "rgba(160,105,40,.35)"); ctx.fillStyle = g; ctx.fillRect(-w + .02, y, 2 * w - .04, H);
    for (let i = 0; i < 5; i++) { p.box(-w + .08 + i * .336, y + .1, .29, .72, .6, "rgba(154,106,60,.55)", C.woodLo, 0); p.box(-w + .08 + i * .336, y + 1.0, .29, 1.0, .5, "rgba(154,106,60,.16)", C.woodLo, 0); }
    p.line(-w + .04, y + .92, w - .04, y + .92, 2, C.brass); p.line(-w + .04, y + .92, w - .04, y + .92, .6, C.brassHi);
    p.box(w - .22, y + 1.12, .1, .34, .7, C.brass, C.ink, 0); for (let i = 0; i < 5; i++) p.circ(w - .17, y + 1.17 + i * .06, .014, 0, "#fffaf0");
    // lamp
    const la = st.lampA, lx = Math.sin(la) * .34, ly = y + H - Math.cos(la) * .34; p.line(0, y + H, lx, ly, 1.2); p.path([[lx - .14, ly - .06], [lx - .07, ly + .06], [lx + .07, ly + .06], [lx + .14, ly - .06]], 1, st.light > .5 ? "#fff6d8" : "#8d7c5c", C.ink, true); if (st.light > .5) this.halo(ctx, lx, ly - .06, .4, .9);
    // dummies, back row first
    ctx.save(); ctx.beginPath(); ctx.rect(-w + .02, y, 2 * w - .04, H); ctx.clip();
    const ds = st.dummies; for (let i = 0; i < ds.length; i++) dummy(ctx, p, ds[i], y); ctx.restore();
    p.box(-w, y, 2 * w, H, 1.4, null, C.ink, 0);
    // roof, platform
    p.box(-w - .04, y + H, 2 * w + .08, .12, 1.2, "#57524a"); p.box(-w - .06, y - .12, 2 * w + .12, .12, 1.3, "#3a352e"); p.box(-w + .05, y - .22, 2 * w - .1, .1, 1, "#57524a", C.ink, 0);
    // crosshead + hitch springs
    p.box(-w - .06, y + 2.66, 2 * w + .12, .16, 1.2, "#4a4641"); p.line(-w, y + H + .1, -.3, y + 2.66, 1); p.line(w, y + H + .1, .3, y + 2.66, 1);
    for (let i = 0; i < 6; i++) { const x = ropeOff(i); p.line(x, y + 2.82, x, y + 3.02, 1.4, "#2a2520"); p.box(x - .025, y + 2.84, .05, .12, .6, C.brassHi, C.ink, 0); }
    for (const q of [-1, 1]) for (const yy of [y - .06, y + 2.74]) p.box(q * X.rail - .07, yy - .06, .14, .16, .9, C.brass, C.ink, 0);
    // lever from the governor rope to the jaws
    const lift = sim.set ? .1 : 0, jy = y + 1.2; if (!st.b.govRope) p.circ(X.gA, jy, .05, 1, C.brass); p.line(X.gA, jy, -w - .02, jy - .1 + lift, 2, st.lit.govRope ? C.brassHi : "#3a352e"); p.line(-w - .1, jy - .1 + lift, -w - .1, y - .2, 1.6, "#3a352e"); p.line(-w - .1, y - .2, w + .1, y - .2, 1.2, "#2a2520");
    this.jaw(ctx, p, -1, y, sim, st); this.jaw(ctx, p, 1, y, sim, st);
    p.box(-.14, y - P.carLow, .28, .18, 1, "#57524a", C.ink, 0);
    if (!st.b.jawR && sim.set || st.sparks) { }
  }
}
const COATS = ["#3b352e", "#7a6748", "#5a5c55", "#a08a5e", "#4b3a2a", "#8b8573", "#2f3338"];
export function makeDummies(n) {
  const r = []; seed = 21;
  for (let i = 0; i < n; i++) { const rows = n > 7 ? 3 : n > 4 ? 2 : 1, row = i % rows, per = Math.ceil(n / rows), k = Math.floor(i / rows); r.push({ x: per === 1 ? (n === 1 ? -.05 : 0) : -.66 + 1.32 * (k + (row === 1 ? .5 : row === 2 ? .25 : 0) * (per > 1 ? 1 : 0)) / Math.max(1, per - .2), row, z: (rows - 1 - row) * .06, coat: COATS[(i * 3 + 1) % 7], hat: i % 4, skirt: i % 3 === 1, h: 1.56 + rnd() * .18, off: 0, vo: 0, rot: 0, vr: 0, sq: 0, seed: rnd() }); }
  return r.sort((a, b) => b.row - a.row).reverse();
}
export function dummy(ctx, p, d, y) {
  const h = d.h; ctx.save(); ctx.translate(d.x, y + d.off + d.z); ctx.rotate(d.rot); ctx.scale(1 + d.sq * .25, 1 - d.sq);
  if (d.row > 0) ctx.globalAlpha = 1;
  // stand
  p.ell(0, .03, .17, .03, .9, "#6b543a"); p.line(0, .03, 0, .5, 2, "#6b543a");
  const wood = "#d9b98a", sh = h - .36;
  // legs or skirt
  if (d.skirt) { p.path([[-.14, .78], [-.22, .36], [.22, .36], [.14, .78]], .9, d.coat, C.ink, true); p.line(-.07, .08, -.07, .36, 3, wood); p.line(.07, .08, .07, .36, 3, wood); }
  else { p.path([[-.13, .8], [-.12, .1], [-.02, .1], [0, .6], [.02, .1], [.12, .1], [.13, .8]], .9, "#332d26", C.ink, true); }
  // arms
  p.path([[-.2, sh - .06], [-.28, sh - .3, -.26, sh - .45, -.24, .68]], 4.5, null, d.coat); p.path([[.2, sh - .06], [.28, sh - .3, .27, sh - .45, .24, .68]], 4.5, null, d.coat); p.circ(-.24, .66, .035, .6, wood); p.circ(.24, .66, .035, .6, wood);
  // coat
  p.path([[-.19, sh], [-.22, sh - .02, -.22, sh - .12, -.2, sh - .3], [-.17, .62], [.17, .62], [.2, sh - .3], [.22, sh - .12, .22, sh - .02, .19, sh], [.06, sh + .05], [0, sh - .12], [-.06, sh + .05]], 1, d.coat, C.ink, true); p.line(0, sh - .12, 0, .64, .6, "#f1e6cd"); p.circ(.0, sh - .3, .012, 0, "#f1e6cd"); p.circ(.0, sh - .45, .012, 0, "#f1e6cd");
  // neck + head: smooth wooden egg
  p.box(-.035, sh, .07, .1, .7, wood, C.ink, 0); p.ell(0, sh + .2, .095, .13, 1, wood); p.line(-.0, sh + .09, 0, sh + .31, .4, "#a8855a"); p.path([[-.095, sh + .22], [-.03, sh + .19, .03, sh + .19, .095, sh + .22]], .4, null, "#a8855a");
  const hy = sh + .27 + (d.hatUp || 0); ctx.save(); ctx.translate(0, hy); ctx.rotate((d.hatUp || 0) * 1.5);
  if (d.hat === 0) { p.path([[-.17, 0], [.17, 0]], 2.4, null, "#26211c"); p.path([[-.1, 0], [-.09, .13], [-.02, .1], [.09, .13], [.1, 0]], .8, "#3b352e", C.ink, true); }
  else if (d.hat === 1) p.path([[-.12, -.05], [-.13, .1, .13, .1, .12, -.05]], .9, "#8b6f45", C.ink, true);
  else if (d.hat === 2) { p.path([[-.1, 0], [-.1, .06, .1, .06, .1, 0]], .8, "#5a5c55", C.ink, true); p.line(.06, 0, .17, -.01, 2.2, "#5a5c55"); }
  else { p.path([[-.18, 0], [.18, 0]], 1.8, null, "#8b6f45"); p.path([[-.09, 0], [-.09, .07, .09, .07, .09, 0]], .8, "#c9ab74", C.ink, true); }
  ctx.restore(); ctx.restore();
}
