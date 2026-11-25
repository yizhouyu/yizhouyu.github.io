// Which names to write, and where. Useful anchors keep one place for a start and a camera, whatever the clock says; at most three names say how far you get now.
// No name ever lies on a track (ridden or not), a dot, the start plate or another name.
const ANCHORS = ["127", "R20", "D24", "719", "G14", "A15", "414", "229", "L08", "125", "631", "701", "D43", "A51", "A41", "G05", "G08", "R01", "A02", "L29", "R45", "601", "401", "247", "H11", "M18", "250", "A32", "120", "626", "H03", "A09", "D40", "G22", "142", "225", "A24"];
export function makeLabels(A) {
  const { net, D, E } = A, C = 3, ids = [...new Set(ANCHORS.map(A.byId).filter(k => k >= 0))], rank = new Map(ids.map((k, i) => [k, i])); let W = 0, H = 0, occ = null, base = null, key = "", plateAt = null, spots = new Map(), front = [], frontKey = "", dirs = new Map();
  const mark = (x0, y0, x1, y1) => { const a = Math.max(0, Math.floor(x0 / C)), b = Math.min(W - 1, Math.floor(x1 / C)), c = Math.max(0, Math.floor(y0 / C)), d = Math.min(H - 1, Math.floor(y1 / C)); if (b < a) return; for (let y = c; y <= d; y++) occ.fill(1, y * W + a, y * W + b + 1); };
  const free = (x0, y0, x1, y1) => { const a = Math.floor(x0 / C), b = Math.floor(x1 / C), c = Math.floor(y0 / C), d = Math.floor(y1 / C); if (a < 0 || c < 0 || b >= W || d >= H) return false; for (let y = c; y <= d; y++) for (let x = y * W + a, e = y * W + b; x <= e; x++) if (occ[x]) return false; return true; };
  // every piece of track in view, in pixels (in the minutes drawing: the ones within reach)
  const segs = [], prev = [0, 0];
  function lines(view, ridden) {
    segs.length = 0; const G = A.G, sl = G.cam.slot || 0, w = A.warp > .5, [X0, Y0, X1, Y1] = view, lim = A.S.lim * 60;
    const add = (q, p) => { if (Math.max(q[0], p[0]) > X0 && Math.min(q[0], p[0]) < X1 && Math.max(q[1], p[1]) > Y0 && Math.min(q[1], p[1]) < Y1) segs.push(p[0], p[1], q[0], q[1]); };
    for (let h = 0; h < net.nH; h++) {
      if (w) { const o = 4 * h; if (Math.min(A.hops[o + 1], A.hops[o + 3]) > lim) continue; const e = A.hopEndsPx(h); if (e) add([e[2], e[3]], [e[0], e[1]]); continue; }
      for (let i = D.hopOff[h]; i < D.hopOff[h + 1]; i++) { if (ridden && Math.min(A.hops[4 * h + 1], A.hops[4 * h + 3]) > lim) break; const p = D.hopPts[i] * 2, q = G.project(D.ptXY[p] + D.hopOx[2 * i] / 40 * sl, D.ptXY[p + 1] + D.hopOx[2 * i + 1] / 40 * sl); if (i > D.hopOff[h]) add(q, prev); prev[0] = q[0]; prev[1] = q[1]; }
    }
    return segs;
  }
  const legs = () => { segs.length = 0; const G = A.G, sl = G.cam.slot || 0; for (const l of [...(A.legs || []), ...(A.legs2 || [])]) A.legPts(l, (a, b) => { const k = l.side || 0, x = b[0] - a[0], y = b[1] - a[1], L = Math.hypot(x, y) || 1, u = y / L * k, v = -x / L * k, p = G.project(a[0] + (a[2] + u) * sl, a[1] + (a[3] + v) * sl), q = G.project(b[0] + (b[2] + u) * sl, b[1] + (b[3] + v) * sl); segs.push(p[0], p[1], q[0], q[1]); }); return segs; };
  const P = k => { const p = A.cxPos(k); return p[2] ? null : A.G.project(p[0], p[1]); };
  const inV = (p, v) => p && p[0] > v[0] + 10 && p[0] < v[2] - 10 && p[1] > v[1] + 10 && p[1] < v[3] - 10;
  const RN = [9, 14, 20, 28, 38, 50, 66, 84], RP = [15, 20, 26, 34, 44, 56, 70, 86, 104, 124, 150, 180, 215];
  function find(p, w, h, plate, old, must) {
    let best = null, bc = 1e9;
    const at = (d, a, bonus) => { const c = Math.cos(a), s = Math.sin(a), px = p[0] + c * d, py = p[1] + s * d, x = c > .35 ? px : c < -.35 ? px - w : px - w / 2, y = s > .75 ? py : s < -.75 ? py - h : py - h / 2; if (!free(x - 3, y - 2, x + w + 3, y + h + 2)) return; let hits = 0; if (d > 11) for (let q = plate ? 13 : 7; q < d; q += 3) if (occ[Math.floor((p[1] + s * q) / C) * W + Math.floor((p[0] + c * q) / C)]) hits++; const cost = d + hits * (plate || must ? 1.5 : 9) - bonus + (Math.abs(c) < .35 ? 5 : 0) + (c < -.35 ? -2 : 0); if (cost < bc) { bc = cost; best = { x, y, d, a }; } };
    if (old) at(old.d, old.a, plate ? 60 : 24); for (const d of plate || must ? RP : RN) { for (let i = 0; i < 16; i++) at(d, i * Math.PI / 8, 0); if (best && bc < d * .9) break; }
    if (!best && (plate || must)) { let m = 1e9; for (let y = C * 2; y + h < H * C; y += 6) for (let x = C * 2; x + w < W * C; x += 6) { const qx = Math.max(x, Math.min(x + w, p[0])), qy = Math.max(y, Math.min(y + h, p[1])), d = Math.hypot(qx - p[0], qy - p[1]); if (d < m && d > 12 && free(x - 3, y - 2, x + w + 3, y + h + 2)) { m = d; best = { x, y, d, a: Math.atan2(qy - p[1], qx - p[0]) }; } } }
    return best;
  }
  const take = (p, b, w, h) => { mark(b.x - 4, b.y - 3, b.x + w + 4, b.y + h + 3); for (let q = 5; q < b.d; q += 2) { const x = p[0] + Math.cos(b.a) * q, y = p[1] + Math.sin(b.a) * q; mark(x - 1, y - 1, x + 1, y + 1); } };
  const out = (k, text, p, b, w, h, plate) => ({ k, text, w, plate, box: [b.x, b.y, b.x + w, b.y + h], dot: p, lead: b.d > 11 ? [p[0] + Math.cos(b.a) * (plate ? 9 : 4.5), p[1] + Math.sin(b.a) * (plate ? 9 : 4.5), p[0] + Math.cos(b.a) * (b.d - 2), p[1] + Math.sin(b.a) * (b.d - 2)] : null });
  const text = k => A.cxName[k] + (A.twin(k) ? ` (${[...new Set(A.cxRoutes[k].map(A.routeName))].slice(0, 4).join(" ")})` : "");
  // o: view, n (most names), must [k…], only (just the musts), all (names whatever is reached), frozen (do not choose new frontier names)
  function place(g, o) {
    const { view, n, lim, font, lh, plate, boxes, space } = o, cx = A.S.cx, cam = A.G.cam, [X0, Y0, X1, Y1] = view; g.font = font;
    const nw = Math.ceil((X1 + 4) / C), nh = Math.ceil((Y1 + 4) / C), start = P(cx), okey = [cx, A.lang, A.phone(), cam.x.toFixed(0), cam.y.toFixed(0), cam.mpp.toFixed(2), cam.yaw.toFixed(3), cam.pitch.toFixed(2), cam.ox | 0, cam.oy | 0, A.warp > .5 ? A.S.m | 0 : A.warp, nw, nh, plate + "", o.only, !!o.names, o.must + "", boxes.map(b => b.map(v => v | 0)).join(";"), o.all].join();
    if (okey !== key) {
      const sameStart = key.split(",")[0] === cx + ""; if (!sameStart) dirs.clear(); key = okey; frontKey = ""; if (nw !== W || nh !== H || !occ) { W = nw; H = nh; occ = new Uint8Array(W * H); } else occ.fill(0);
      mark(0, 0, X0, Y1 + 9); mark(0, 0, X1 + 9, Y0); for (const b of boxes) mark(...b); const pad = (cam.lw || 3) / 2 + 2.5, ink = s => { for (let i = 0; i < s.length; i += 4) { const dx = s[i + 2] - s[i], dy = s[i + 3] - s[i + 1], m = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2)); for (let q = 0; q <= m; q++) { const x = s[i] + dx * q / m, y = s[i + 1] + dy * q / m; mark(x - pad, y - pad, x + pad, y + pad); } } }; ink(o.only && !o.names ? legs() : lines(view));
      spots.clear(); plateAt = null; mark(start[0] - 11, start[1] - 11, start[0] + 11, start[1] + 11);
      for (const k of o.must) { const p = P(k); if (p) mark(p[0] - 8, p[1] - 8, p[0] + 8, p[1] + 8); }
      if (plate) {                                                  // the full name if there is room close by, else a short word (the question above names the station)
        let [w, h, w2] = plate, b = find(start, w, h, true, dirs.get("start")), short = false; if (!b || b.d > 64) { const c = find(start, w2, h, true, dirs.get("start2")); if (c && (!b || c.d < b.d * .8)) { b = c; short = true; w = w2; } }
        if (!b) { const keep = occ; occ = new Uint8Array(W * H); mark(0, 0, X0, Y1 + 9); mark(0, 0, X1 + 9, Y0); for (const q of boxes) mark(...q); ink(lines(view, true)); mark(start[0] - 11, start[1] - 11, start[0] + 11, start[1] + 11); w = w2; short = true; b = find(start, w2, h, true, null); occ = keep; }
        if (b) { plateAt = { ...out(cx, "", start, b, w, h, true), short }; dirs.set(short ? "start2" : "start", b); take(start, b, w, h); }
      }
      const put = (k, must) => { const p = P(k); if (!inV(p, view) || k === cx && !o.names || spots.has(k)) return false; if (k === cx) return false; const t = o.names?.get(k) ?? text(k), w = g.measureText(t).width, b = find(p, w, lh, false, dirs.get(k), must); if (!b) return false; mark(p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5); take(p, b, w, lh); dirs.set(k, b); spots.set(k, { ...out(k, t, p, b, w, lh, false), must }); return true; };
      for (const k of o.must) put(k, !o.soft);
      if (!o.only) { const cap = o.all ? n : n + 5, apart = k => { const p = P(k); return inV(p, view) && Math.hypot(p[0] - start[0], p[1] - start[1]) > space * .5 && [...spots.keys()].every(q => { const r = P(q); return Math.hypot(p[0] - r[0], p[1] - r[1]) > space; }) && !covered(p); }; const covered = p => [plateAt, ...spots.values()].some(r => r && p[0] > r.box[0] - 7 && p[0] < r.box[2] + 7 && p[1] > r.box[1] - 7 && p[1] < r.box[3] + 7);
        const order = [...Array(net.nC).keys()].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99) || A.weight[b] - A.weight[a]); let c = 0; for (const k of order) { if (c >= cap) break; if (apart(k) && put(k, false)) c++; } }
      base = occ.slice();
    }
    const res = []; if (plateAt) res.push(plateAt); const musts = [...spots.values()].filter(r => r.must || o.names); res.push(...musts); if (o.only) return res;
    const reached = k => o.all || A.arrCx(k) <= lim, anchors = [...spots.values()].filter(r => !r.must && reached(r.k)), nf = o.all ? 0 : Math.min(3, Math.max(0, n - musts.length)); const main = anchors.slice(0, Math.max(0, n - musts.length - nf)), fk = okey + "|" + (A.S.m | 0) + "|" + lim;
    if (fk !== frontKey && !o.frozen) {                            // the farthest you get now, in each direction
      frontKey = fk; occ.set(base); const far = [], shownK = new Set([...musts, ...anchors].map(r => r.k)), best = new Array(8).fill(-1), bd = new Array(8).fill(0); let max = 0;
      for (let k = 0; k < net.nC; k++) { if (k === cx || !reached(k)) continue; const p = P(k); if (!inV(p, view)) continue; const d = Math.hypot(p[0] - start[0], p[1] - start[1]) * (shownK.has(k) ? 1.08 : 1) * (front.some(r => r.k === k) ? 1.06 : 1), s = Math.round(Math.atan2(p[1] - start[1], p[0] - start[0]) / Math.PI * 4 + 8) % 8; max = Math.max(max, d); if (d > bd[s]) { bd[s] = d; best[s] = k; } }
      for (const [k, d] of best.map((k, s) => [k, bd[s]]).filter(x => x[0] >= 0 && x[1] > max * .42).sort((a, b) => b[1] - a[1])) { if (far.length >= nf) break; if (shownK.has(k)) continue; const p = P(k); if ([...musts, ...main, ...far].some(r => Math.hypot(p[0] - r.dot[0], p[1] - r.dot[1]) < space * .8) || [plateAt, ...spots.values()].some(r => r && p[0] > r.box[0] - 7 && p[0] < r.box[2] + 7 && p[1] > r.box[1] - 7 && p[1] < r.box[3] + 7)) continue; const t = text(k), w = g.measureText(t).width, b = find(p, w, lh, false, dirs.get(k)); if (!b) continue; mark(p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5); take(p, b, w, lh); dirs.set(k, b); far.push(out(k, t, p, b, w, lh, false)); }
      front = far;
    }
    const fr = front.filter(r => reached(r.k) && !main.some(q => q.k === r.k)), rest = anchors.slice(main.length, Math.max(main.length, n - musts.length - fr.length)); res.push(...main, ...rest, ...fr);
    occ.set(base); return res.slice(0, n + 1);
  }
  return { place, lines, free: (...b) => !!occ && free(...b), mark: (...b) => occ && mark(...b), segs };
}
