// The picture you keep: the model as you left it, what you broke, the curve of the fall.
import { MIN } from "./core.js";
import { P } from "./sim.js";
import { Game } from "./core.js";
export async function poster({ view, S, t, lang, dist, spd }) {
  const W = 1800, H = 2250, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"), cs = getComputedStyle(document.documentElement), v = k => cs.getPropertyValue(k).trim(), zh = lang === "zh";
  const head = zh ? "SongHead,'Songti SC','Noto Serif SC',serif" : "Goudy,serif", body = zh ? "'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" : "Goudy,serif";
  x.fillStyle = v("--bg"); x.fillRect(0, 0, W, H);
  const g = S.g, e = S.ended, HH = view.H, big = view.still(W, H, { x: 740, y: 70, w: 1030, h: 2110 }, { x0: -2.3, x1: 3.45, y0: -.5, y1: HH + .1 }); x.drawImage(big, 0, 0);
  const X = 110, text = (s, y, size, col, font = head, w = 640, lh = 1.2) => { x.font = `${size}px ${font}`; x.fillStyle = col; x.textBaseline = "alphabetic"; const out = []; let cur = ""; for (const p of zh ? [...s] : s.split(/(?<= )/)) { if (x.measureText(cur + p).width > w && cur) { if (zh && /[，。：、）]/.test(p)) { out.push(cur + p); cur = ""; continue; } out.push(cur); cur = p; } else cur += p; } if (cur.trim()) out.push(cur); out.forEach((q, i) => x.fillText(q.trim(), X, y + i * size * lh)); return y + out.length * size * lh; };
  let y = text(e ? (e.dir === "up" ? t.eUp : t.eDown) : t.q1, 270, zh ? 88 : 104, v("--ink"), head, 640, 1.12);
  if (e) y = text(fill(e.dir === "up" ? t.eUpP : t.eDownS, { v: spd(e.v) }), y + 6, 40, v("--ink"), body, 560, zh ? 1.5 : 1.3);
  const n = g.count(), bk = g.broken(); y += 70; x.font = `${zh ? 200 : 260}px Goudy,serif`; x.fillStyle = v("--red"); x.fillText(String(n), X - 8, y + 180); const nw = x.measureText(String(n)).width; x.font = `40px ${body}`; x.fillStyle = v("--dim"); x.fillText(zh ? "样东西被拆了" : n === 1 ? "thing broken" : "things broken", X + nw + 24, y + 180); y += 310;
  const list = []; if (bk.rope) list.push(zh ? `${bk.rope} 根钢缆` : bk.rope === 1 ? "1 cable" : bk.rope + " cables"); for (const k of ["brake", "motor", "gov", "govRope", "jawL", "jawR", "buf", "cwBuf"]) if (bk[k]) list.push(t.parts[k]);
  x.strokeStyle = v("--line"); x.lineWidth = 2; for (const q of list) { x.beginPath(); x.moveTo(X, y + 14); x.lineTo(X + 470, y + 14); x.stroke(); y = text(q, y, 40, v("--ink"), body, 600) + 18; }
  if (e) y = text(n <= MIN[e.way] ? (e.way === "up" ? t.eBest : t.eBestW) : fill(t.eMin, { m: MIN[e.way] }), y + 20, 36, v("--dim"), body, 560);
  // height over time, from the same run
  const pts = trace(g); if (pts) { const bx = X, bw = 470, bh = 300, by = 1520, y1 = P.y1 + 11 * P.floorH, T = pts.at(-1)[0]; x.strokeStyle = v("--ink"); x.lineWidth = 2; x.beginPath(); x.moveTo(bx, by); x.lineTo(bx, by + bh); x.lineTo(bx + bw, by + bh); x.stroke(); x.strokeStyle = v("--red"); x.lineWidth = 4; x.beginPath(); pts.forEach(([a, b], i) => { const px = bx + a / T * bw, py = by + bh - Math.max(0, b) / y1 * bh; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); x.font = `32px ${body}`; x.fillStyle = v("--dim"); x.fillText(zh ? "12 楼" : "floor 12", bx + 14, by + 26); x.textAlign = "right"; x.fillText(zh ? T.toFixed(1) + " 秒" : T.toFixed(1) + " seconds", bx + bw, by + bh + 42); x.textAlign = "left"; }
  text(e ? t.take2 : t.take, 1980, 33, v("--ink"), body, 620, zh ? 1.5 : 1.3); x.font = `28px ${body}`; x.fillStyle = v("--dim"); x.fillText(t.pFoot, X, H - 62); return c;
}
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]).replace(/(公里\/小时|厘米|米) (?=[\u4e00-\u9fff])/g, "$1");
function trace(g) {
  if (!g.log.length) return null; const r = new Game({ floor: g.floor, people: g.people }), end = g.sim.k, pts = [], last = g.log.at(-1)[0]; let i = 0, tRun = 0, start = null;
  // skip the long still parts: begin half a second before the car first moves after the last action that matters
  const all = []; while (r.sim.k < end && r.sim.k < 4e6) { while (i < g.log.length && g.log[i][0] === r.sim.k) r.apply(g.log[i++][1]); r.step(); if (r.sim.k % 40 === 0) all.push([r.sim.t, r.sim.y, r.sim.v]); }
  let a = all.length - 1; const o = r.sim.out, tEnd = o ? o.t + .4 : r.sim.t; const tFrom = o ? o.t - .02 : tEnd; while (a > 0 && (all[a][0] > tFrom || Math.abs(all[a][2]) > .04)) a--; a = Math.max(0, a - 12); for (let k = a; k < all.length && all[k][0] <= tEnd; k++) pts.push([all[k][0] - all[a][0], all[k][1]]); return pts.length > 5 ? pts : null;
}
