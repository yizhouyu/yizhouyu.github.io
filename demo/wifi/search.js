// Where is the best spot? Every room calls out, then the short list is tried for real.
import * as P from "./physics.js";
import { RNX, RNY, rg } from "./plans.js";

export const STEPS = 2700;
export function coarseRooms(S, rx, ry) { // which room each square of the coarse power map belongs to
  const a = new Int16Array(rx * ry).fill(-1), G = rg(); for (let j = 0; j < ry; j++) for (let i = 0; i < rx; i++) { const x = (i + .5) / rx * P.W, y = (j + .5) / ry * P.H; a[j * rx + i] = S.map[Math.min(RNY - 1, Math.floor(y / G)) * RNX + Math.min(RNX - 1, Math.floor(x / G))]; } return a;
}
export function roomLevels(S, eng, p, router, coarse = S.coarse) { // average signal of every room in dBm
  const { rx, ry } = eng, n = S.rooms.length, sum = new Float64Array(n), cnt = new Float64Array(n);
  for (let j = 0; j < ry; j++) for (let i = 0; i < rx; i++) { const q = j * rx + i, k = coarse[q]; if (k < 0) continue; const x = (i + .5) / rx * P.W, y = (j + .5) / ry * P.H; if (Math.hypot(x - router[0], y - router[1]) < .3) continue;
    sum[k] += eng.p1 + 10 * Math.log10(Math.max(p[q], 1e-11)); cnt[k]++; }
  return S.rooms.map((_, i) => cnt[i] ? sum[i] / cnt[i] : -120);
}
export const weakestOf = (S, lv) => { let k = -1; S.rooms.forEach((r, i) => { if (r.counted && (k < 0 || lv[i] < lv[k])) k = i; }); return k; };
export function roomPoints(room) { const G = rg(), pts = [], st = Math.max(1, Math.floor(room.cells.length / 400)); let s = 11; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280; for (let k = 0; k < 2000 && pts.length < 48; k += st) { const c = room.cells[Math.floor(rnd() * room.cells.length)], x = (c % RNX + .5) * G, y = (Math.floor(c / RNX) + .5) * G; if (pts.every((p) => Math.hypot(p[0] - x, p[1] - y) > .28)) pts.push([x, y]); } return pts; }

// where a router could really stand: in a room, along a wall (in a home seen from the side: on furniture above a floor), not in a doorway and not where a door swings
export function standable(S, x, y) {
  const G = rg(), at = (a, b) => { const i = Math.floor(a / G), j = Math.floor(b / G); return i < 0 || j < 0 || i >= RNX || j >= RNY ? -1 : S.map[j * RNX + i]; }, k = at(x, y); if (k < 0 || !S.rooms[k].routerOk) return false;
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(x + a * .16, y + b * .16) !== k) return false;
  if (S.plan.side) { let f = 0; for (let d = .2; d < 2.6; d += .06) if (at(x, y + d) !== k) { f = d; break; } if (!(f > .3 && f < 1.15)) return false; } else { let near = false; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let d = .2; d <= .33; d += .06) if (at(x + a * d, y + b * d) !== k) near = true; if (!near) return false; }
  for (const b of S.plan.boxes) if (x > b[0] - .3 && x < b[2] + .3 && y > b[1] - .3 && y < b[3] + .3) return false;
  for (const f of S.plan.feats) { if (f.k === "win") continue; const al = f.o === "h" ? x - f.x : y - f.y, ac = f.o === "h" ? y - f.y : x - f.x, w = f.w / 2 + .12; if (Math.abs(al) > w) continue; if (Math.abs(ac) < .45) return false; if (f.k === "door" && ac * (f.s || 1) > 0 && Math.abs(ac) < f.w + .1) return false; } return true;
}
// the nearest place a router can stand
export function nearest(S, x, y) { if (standable(S, x, y)) return [x, y]; let best = null, bd = 1e9; for (let r = .06; r < 3 && !(best && r > bd + .1); r += .06) for (let a = 0; a < 36; a++) { const X = x + r * Math.cos(a * Math.PI / 18), Y = y + r * Math.sin(a * Math.PI / 18); if (r < bd && standable(S, X, Y)) { bd = r; best = [X, Y]; } } return best; }
export const reached = (S, lv, g) => S.rooms.filter((r) => r.counted && P.bars(lv[r.index]) >= g).length;
// A: { S, eng, settle(steps), onRoom(room), onCheck(), showRouter(at) }. Throws "stop" when cancelled.
export async function findBest(A) {
  const { S, eng } = A, counted = S.rooms.filter((r) => r.counted), you = [...S.router], { rx, ry } = eng, maps = []; if (!counted.length) throw new Error("no rooms");
  const measure = A.measure = async (at) => { eng.search = 0; eng.reset(); eng.src = at; A.showRouter(at); await A.settle(Math.round(STEPS * (A.scale || 1))); const r = await eng.readNow(); return roomLevels(S, eng, r.p, at); };
  for (const room of counted) {
    A.onRoom(room); const pts = roomPoints(room); eng.search = 1; eng.setRoomSource(pts, room.index + 3); eng.reset(); await A.settle(Math.round(STEPS * .8 * (A.scale || 1)));
    const r = await eng.readNow(), m = new Float32Array(rx * ry);
    for (let j = 0; j < ry; j++) for (let i = 0; i < rx; i++) { const q = j * rx + i, x = (i + .5) / rx * P.W, y = (j + .5) / ry * P.H; let s = 0, n = 0; for (let b = -1; b < 2; b++) for (let a = -1; a < 2; a++) { const I = i + a, J = j + b; if (I < 0 || J < 0 || I >= rx || J >= ry || S.coarse[J * rx + I] !== S.coarse[q]) continue; s += r.p[J * rx + I]; n++; } // only its own side of the wall
      let inv = 0; for (const [X, Y] of pts) inv += 1 / Math.max(.6, Math.hypot(x - X, y - Y)); m[q] = eng.p1 + 10 * Math.log10(Math.max(1e-12, s / n * inv / pts.length)); }
    maps.push(m);
  }
  // places a router may stand: inside a room, off the walls
  const score = new Float32Array(rx * ry).fill(-1e9);
  for (let j = 1; j < ry - 1; j++) for (let i = 1; i < rx - 1; i++) { const q = j * rx + i; if (!standable(S, (i + .5) / rx * P.W, (j + .5) / ry * P.H)) continue;
    const lv = maps.map((m) => m[q]), lo = Math.min(...lv); score[q] = lo + .06 * lv.reduce((a, b) => a + b) / lv.length + (A.byCount ? 100 * lv.filter((v) => P.bars(v) >= 3).length : 0); }
  if (!score.some((v) => v > -1e8)) for (let j = 1; j < ry - 1; j++) for (let i = 1; i < rx - 1; i++) { const q = j * rx + i, k = S.coarse[q]; if (k >= 0 && S.rooms[k].routerOk) score[q] = Math.min(...maps.map((m) => m[q])); } // a tiny home: anywhere inside
  const cand = []; for (let n = 0; n < 10; n++) { let b = -1; for (let q = 0; q < score.length; q++) if (score[q] > -1e8 && (b < 0 || score[q] > score[b]) && cand.every((c) => Math.hypot((q % rx) - c.i, (q / rx | 0) - c.j) > 5)) b = q; if (b < 0) break; cand.push({ i: b % rx, j: b / rx | 0 }); }
  // and some far from all of those, so no corner of the home is left out
  for (let n = 0; n < 10; n++) { let b = -1, bd = 3; for (let q = 0; q < score.length; q++) if (score[q] > -1e8) { const d = Math.min(...cand.map((c) => Math.hypot((q % rx) - c.i, (q / rx | 0) - c.j))); if (d > bd) { bd = d; b = q; } } if (b < 0) break; cand.push({ i: b % rx, j: b / rx | 0 }); }
  A.onCheck(); const tries = [];
  const tryAt = async (at) => { const lv = await measure(at), k = weakestOf(S, lv); A.onTry && A.onTry(tries.length); const o = { at: [...at], lv, k, lo: lv[k], n: reached(S, lv, 3), snap: A.snap ? A.snap() : null }; tries.push(o); };
  await tryAt(you); for (const c of cand) await tryAt([(c.i + .5) / rx * P.W, (c.j + .5) / ry * P.H]);
  // a step to each side of the best ones so far
  const around = async (b, st = .32) => { let better = false; for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const at = [b.at[0] + a * st, b.at[1] + c * st]; if (!standable(S, ...at) || tries.some((t) => Math.hypot(t.at[0] - at[0], t.at[1] - at[1]) < st * .7)) continue; await tryAt(at); if (tries[tries.length - 1].lo > b.lo + .3) better = true; } return better; };
  const val = (t) => t.lo + (A.byCount ? 100 * t.n : 0), ranked = () => tries.slice(1).sort((p, q) => val(q) - val(p)); { const R = ranked(); for (const b of R.slice(0, 4)) if (b.lo > R[0].lo - 2) await around(b); } for (let round = 0; round < 2; round++) if (!ranked()[0] || !(await around(ranked()[0], .2))) break;
  for (const b of ranked().slice(0, 6)) await around(b, .1); // a hand's width matters
  return verdict(S, you, tries, A.byCount, { scoreMap: score, maps });
}
export function verdict(S, you, tries, byCount, more = {}) {
  const val = (t) => t.lo + (byCount ? 100 * t.n : 0), mine = tries[0], top = tries.slice(1).sort((p, q) => val(q) - val(p))[0] || mine, best = val(top) > val(mine) ? top : mine, mY = P.mbps(mine.lo, S.band), mB = P.mbps(best.lo, S.band), c = S.rooms.filter((r) => r.counted).length;
  const won = best === mine || (byCount ? mine.n === top.n && mine.lo > top.lo - 1 : mY > mB * .97 || mine.lo > best.lo - .5), pct = won ? 100 : byCount ? Math.min(99, Math.round(100 * mine.n / Math.max(1, top.n))) : Math.min(99, Math.round(100 * mY / Math.max(mB, .01)));
  return { you, best: won ? you : best.at, mine, top: best, mY, mB, pct, won, tries, byCount: !!byCount, rooms: c, ...more };
}
// A home whose best place is already known: only your place and that place are run.
export async function quickBest(A, at) {
  const { S, eng } = A, you = [...S.router], tries = []; for (const q of [you, at]) { eng.search = 0; eng.reset(); eng.src = q; A.showRouter(q); await A.settle(Math.round(STEPS * (A.scale || 1))); const r = await eng.readNow(), lv = roomLevels(S, eng, r.p, q), k = weakestOf(S, lv); tries.push({ at: [...q], lv, k, lo: lv[k], n: reached(S, lv, 3), snap: A.snap ? A.snap() : null }); } return verdict(S, you, tries, A.byCount);
}
// Two routers: each on its own channel, joined by a cable, and the phone uses the stronger one. No interference between them, so a room simply gets the better of two separate simulations.
export async function findPair(A, res) {
  const { S, eng } = A, { rx, ry } = eng, cells = []; for (let j = 1; j < ry - 1; j++) for (let i = 1; i < rx - 1; i++) if ((i + j) % 2 === 0 && standable(S, (i + .5) / rx * P.W, (j + .5) / ry * P.H)) cells.push(j * rx + i);
  const pairs = []; for (let a = 0; a < cells.length; a++) for (let b = a + 1; b < cells.length; b++) { let lo = 1e9, sum = 0; for (const m of res.maps) { const v = Math.max(m[cells[a]], m[cells[b]]); if (v < lo) lo = v; sum += v; } pairs.push([lo + .04 * sum / res.maps.length, cells[a], cells[b]]); }
  pairs.sort((p, q) => q[0] - p[0]); const xy = (q) => [(q % rx + .5) / rx * P.W, ((q / rx | 0) + .5) / ry * P.H], tried = []; let best = null;
  for (const [, a, b] of pairs) { if (tried.length >= 3) break; const p = xy(a), q = xy(b); if (tried.some(([u, v]) => (Math.hypot(u[0] - p[0], u[1] - p[1]) + Math.hypot(v[0] - q[0], v[1] - q[1])) < .8)) continue; tried.push([p, q]); const la = await A.measure(p), lb = await A.measure(q), lv = la.map((v, i) => Math.max(v, lb[i])), k = weakestOf(S, lv); if (!best || lv[k] > best.lo) best = { a: p, b: q, la, lb, lv, k, lo: lv[k] }; }
  return best;
}
