// Where is the best spot? Every room calls out, then the short list is tried for real.
import * as P from "./physics.js";
import { RNX, RNY, rg } from "./plans.js";

export const STEPS = 3000;
export function coarseRooms(S, rx, ry) { // which room each square of the coarse power map belongs to
  const a = new Int16Array(rx * ry).fill(-1), G = rg(); for (let j = 0; j < ry; j++) for (let i = 0; i < rx; i++) { const x = (i + .5) / rx * P.W, y = (j + .5) / ry * P.H; a[j * rx + i] = S.map[Math.min(RNY - 1, Math.floor(y / G)) * RNX + Math.min(RNX - 1, Math.floor(x / G))]; } return a;
}
export function roomLevels(S, eng, p, router) { // average signal of every room in dBm
  const { rx, ry } = eng, n = S.rooms.length, sum = new Float64Array(n), cnt = new Float64Array(n);
  for (let j = 0; j < ry; j++) for (let i = 0; i < rx; i++) { const q = j * rx + i, k = S.coarse[q]; if (k < 0) continue; const x = (i + .5) / rx * P.W, y = (j + .5) / ry * P.H; if (Math.hypot(x - router[0], y - router[1]) < .3) continue;
    sum[k] += eng.p1 + 10 * Math.log10(Math.max(p[q], 1e-11)); cnt[k]++; }
  return S.rooms.map((_, i) => cnt[i] ? sum[i] / cnt[i] : -120);
}
export const weakestOf = (S, lv) => { let k = -1; S.rooms.forEach((r, i) => { if (r.counted && (k < 0 || lv[i] < lv[k])) k = i; }); return k; };
export function roomPoints(room) { const G = rg(), pts = [], st = Math.max(1, Math.floor(room.cells.length / 400)); let s = 11; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280; for (let k = 0; k < 2000 && pts.length < 48; k += st) { const c = room.cells[Math.floor(rnd() * room.cells.length)], x = (c % RNX + .5) * G, y = (Math.floor(c / RNX) + .5) * G; if (pts.every((p) => Math.hypot(p[0] - x, p[1] - y) > .28)) pts.push([x, y]); } return pts; }

// where a router could really stand: in a room, along a wall, not in a doorway and not where a door swings
export function standable(S, x, y) {
  const G = rg(), at = (a, b) => { const i = Math.floor(a / G), j = Math.floor(b / G); return i < 0 || j < 0 || i >= RNX || j >= RNY ? -1 : S.map[j * RNX + i]; }, k = at(x, y); if (k < 0 || !S.rooms[k].routerOk) return false;
  let near = false; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (at(x + a * .16, y + b * .16) !== k) return false; for (let d = .2; d <= .33; d += .06) if (at(x + a * d, y + b * d) !== k) near = true; } if (!near) return false;
  for (const f of S.plan.feats) { if (f.k === "win") continue; const al = f.o === "h" ? x - f.x : y - f.y, ac = f.o === "h" ? y - f.y : x - f.x, w = f.w / 2 + .12; if (Math.abs(al) > w) continue; if (Math.abs(ac) < .45) return false; if (f.k === "door" && ac * (f.s || 1) > 0 && Math.abs(ac) < f.w + .1) return false; } return true;
}
// A: { S, eng, settle(steps), onRoom(room), onCheck(), showRouter(at) }. Throws "stop" when cancelled.
export async function findBest(A) {
  const { S, eng } = A, counted = S.rooms.filter((r) => r.counted), you = [...S.router], { rx, ry } = eng, maps = []; if (!counted.length) throw new Error("no rooms");
  const measure = async (at) => { eng.search = 0; eng.reset(); eng.src = at; A.showRouter(at); await A.settle(STEPS); const r = await eng.readNow(); return roomLevels(S, eng, r.p, at); };
  for (const room of counted) {
    A.onRoom(room); const pts = roomPoints(room); eng.search = 1; eng.setRoomSource(pts, room.index + 3); eng.reset(); await A.settle(Math.round(STEPS * .8));
    const r = await eng.readNow(), m = new Float32Array(rx * ry);
    for (let j = 0; j < ry; j++) for (let i = 0; i < rx; i++) { const q = j * rx + i, x = (i + .5) / rx * P.W, y = (j + .5) / ry * P.H; let s = 0, n = 0; for (let b = -1; b < 2; b++) for (let a = -1; a < 2; a++) { const I = i + a, J = j + b; if (I < 0 || J < 0 || I >= rx || J >= ry) continue; s += r.p[J * rx + I]; n++; }
      let inv = 0; for (const [X, Y] of pts) inv += 1 / Math.max(.6, Math.hypot(x - X, y - Y)); m[q] = eng.p1 + 10 * Math.log10(Math.max(1e-12, s / n * inv / pts.length)); }
    maps.push(m);
  }
  // places a router may stand: inside a room, off the walls
  const score = new Float32Array(rx * ry).fill(-1e9);
  for (let j = 1; j < ry - 1; j++) for (let i = 1; i < rx - 1; i++) { const q = j * rx + i; if (!standable(S, (i + .5) / rx * P.W, (j + .5) / ry * P.H)) continue;
    const lv = maps.map((m) => m[q]), lo = Math.min(...lv); score[q] = lo + .06 * lv.reduce((a, b) => a + b) / lv.length; }
  if (!score.some((v) => v > -1e8)) for (let j = 1; j < ry - 1; j++) for (let i = 1; i < rx - 1; i++) { const q = j * rx + i, k = S.coarse[q]; if (k >= 0 && S.rooms[k].routerOk) score[q] = Math.min(...maps.map((m) => m[q])); } // a tiny home: anywhere inside
  const cand = []; for (let n = 0; n < 5; n++) { let b = -1; for (let q = 0; q < score.length; q++) if (score[q] > -1e8 && (b < 0 || score[q] > score[b]) && cand.every((c) => Math.hypot((q % rx) - c.i, (q / rx | 0) - c.j) > 4.5)) b = q; if (b < 0) break; cand.push({ i: b % rx, j: b / rx | 0 }); }
  A.onCheck(); const tries = [];
  const tryAt = async (at) => { const lv = await measure(at), k = weakestOf(S, lv); const o = { at: [...at], lv, k, lo: lv[k], snap: A.snap ? A.snap() : null }; tries.push(o); };
  await tryAt(you); for (const c of cand) await tryAt([(c.i + .5) / rx * P.W, (c.j + .5) / ry * P.H]);
  const mine = tries[0], top = tries.slice(1).sort((a, b) => b.lo - a.lo)[0] || mine, best = top.lo > mine.lo ? top : mine, mY = P.mbps(mine.lo, S.band), mB = P.mbps(best.lo, S.band);
  const won = best === mine || mY > mB * .97 || mine.lo > best.lo - .5;
  return { you, best: won ? you : best.at, mine, top: best, mY, mB, pct: won ? 100 : mB > 0 ? Math.min(99, Math.round(100 * mY / mB)) : 100, won, tries, scoreMap: score };
}
