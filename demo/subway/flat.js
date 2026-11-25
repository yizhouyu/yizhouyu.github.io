// The same map without WebGL: flat, plain, still tappable.
export function makeFlat(canvas, net, city) {
  const g = canvas.getContext("2d"); if (!g) return null; const D = net.D, K = 2 * city.ext / 65535, un = v => v * K - city.ext, css = c => `rgb(${c.map(v => Math.round(v * 255)).join(",")})`;
  let W = 1, H = 1, dpr = 1; const cam = { x: 0, y: 0, mpp: 40, yaw: 0, ox: 0, oy: 0, slot: 0 }, hops = new Float32Array(net.nH * 4).fill(1e9); let lit = null, warp = null;
  const rgb = D.colors.map(h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)));
  const packer = () => { const a = []; return { ab: a, get n() { return a.length; }, reset() { a.length = 0; }, push(...v) { a.push(v); } }; };
  const project = (x, y) => { const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw), dx = x - cam.x, dy = y - cam.y; return [(dx * c + dy * s) / cam.mpp + W / 2 + cam.ox, -(-dx * s + dy * c) / cam.mpp + H / 2 + cam.oy]; };
  const unproject = (px, py) => { const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw), a = (px - W / 2 - cam.ox) * cam.mpp, b = -(py - H / 2 - cam.oy) * cam.mpp; return [cam.x + a * c - b * s, cam.y + a * s + b * c]; };
  const line = (o, pts) => { for (let i = 0; i < pts.length; i += 4) { const a = project(pts[i], pts[i + 1]), b = project(pts[i + 2], pts[i + 3]); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } };
  function frame(S) {
    const P = S.pal, w = S.warp || 0, geo = 1 - w; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalAlpha = 1; g.fillStyle = css(P.bg); g.fillRect(0, 0, W, H); g.lineCap = "round";
    if (geo > .01) { g.globalAlpha = geo * .7; g.lineWidth = 1; g.strokeStyle = css(P.shore); g.beginPath(); const o = city.outl; for (let i = 0; i < o.length; i += 4) { const a = project(un(o[i]), un(o[i + 1])), b = project(un(o[i + 2]), un(o[i + 3])); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke();
      if (lit && S.reachA > .02) { const n = lit.length, T = 1 + Math.min(S.lim, S.reveal) / 3600 * 250; g.globalAlpha = geo * .8; g.fillStyle = css(P.lit); for (let i = 0; i < n; i++) if (lit[i] && lit[i] <= T) { const a = project(un(city.cellX[i]), un(city.cellY[i])); g.fillRect(a[0] - .5, a[1] - 2, 1.2, 3); } } }
    const T = Math.min(S.lim, S.reveal); for (let h = 0; h < net.nH; h++) { let t = Math.min(hops[4 * h], hops[4 * h + 2]); const on = S.reachA > .02 && Math.min(hops[4 * h + 1], hops[4 * h + 3]) <= T; const c = rgb[D.hopCol[h]]; g.strokeStyle = on ? `rgb(${c})` : css(P.baseTint); g.globalAlpha = on ? 1 : .45; g.lineWidth = on ? 3 : 1; g.beginPath();
      if (w > .5) { if (warp[4 * h] > 9e6 || warp[4 * h + 2] > 9e6) continue; line(g, [warp[4 * h], warp[4 * h + 1], warp[4 * h + 2], warp[4 * h + 3]]); } else for (let i = D.hopOff[h]; i < D.hopOff[h + 1]; i++) { const p = D.hopPts[i] * 2, a = project(D.ptXY[p], D.ptXY[p + 1]); i === D.hopOff[h] ? g.moveTo(a[0], a[1]) : g.lineTo(a[0], a[1]); } g.stroke(); }
    for (const [n, P2, lw] of [[S.routeN, rtP, 5], [S.trainN, trP, 4]]) for (let i = 0; i < n; i++) { const v = P2.ab[i], a = project(v[0], v[1]), b = project(v[2], v[3]); g.globalAlpha = v[13] ?? 1; g.strokeStyle = `rgb(${v[8]},${v[9]},${v[10]})`; g.lineWidth = lw * (v[12] || 1); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    for (let s = 0; s < net.nS; s++) { const j = 4 * s, r = dotA[j + 2]; if (!r) continue; const a = project(dotA[j], dotA[j + 1]); g.globalAlpha = dotA[j + 3] ? 1 : .4; g.beginPath(); g.arc(a[0], a[1], r, 0, 7); g.fillStyle = css(dotA[j + 3] ? P.dotFill : P.ink); g.fill(); if (dotA[j + 3]) { g.lineWidth = 1.3; g.strokeStyle = css(P.dotInk); g.stroke(); } }
  }
  const dotA = new Float32Array(net.nS * 4), discA = new Float32Array(net.nS * 3), trP = packer(), rtP = packer();
  return { gl: { canvas, finish() { } }, flat: true, cam, setCam: c => Object.assign(cam, c, { slot: 0 }), project, unproject, resize(w, h, d) { W = w; H = h; dpr = d; canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); }, frame, uploadHops: a => hops.set(a.subarray(0, hops.length)), uploadLit: l => { lit = l; }, uploadWarp: a => { warp = a; }, discA, dotA, trP, rtP, rgb, get W() { return W; }, get H() { return H; }, get dpr() { return dpr; } };
}
