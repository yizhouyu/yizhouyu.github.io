// piles of dots: every dot is one simulated walk, placed by how long it stood
export function piles(cv, rows, { lang, t }) {
  const W = cv.clientWidth || 340, d = Math.min(2, devicePixelRatio || 1), RH = 62, H = rows.length * RH + 24; cv.width = W * d; cv.height = H * d; cv.style.height = H + "px";
  const x = cv.getContext("2d"), cs = getComputedStyle(document.documentElement), dim = cs.getPropertyValue("--dim"), line = cs.getPropertyValue("--line"), ink = cs.getPropertyValue("--ink"); x.scale(d, d);
  const L = 26, max = 420, bin = 10, n = max / bin, bw = (W - L - 4) / n, r = Math.max(.9, Math.min(1.5, bw / 4.4)); x.font = `500 13px Sofia, ZH, "PingFang SC", sans-serif`;
  let top = 0; const B = rows.map(q => { const b = new Array(n + 1).fill(0); q.v.forEach(v => { b[Math.min(n, Math.floor(v / bin))]++; }); top = Math.max(top, ...b); return b; }); const per = Math.max(1, Math.floor(bw / (2 * r))), rowsN = Math.ceil(top / per), dy = Math.min(2 * r, (RH - 16) / rowsN);
  rows.forEach((q, i) => {
    const y = (i + 1) * RH - 4; x.strokeStyle = line; x.lineWidth = 1; x.beginPath(); x.moveTo(L, y + .5); x.lineTo(W, y + .5); x.stroke(); x.fillStyle = ink; x.font = "800 20px Sofia, sans-serif"; x.textBaseline = "alphabetic"; x.fillText(q.label, 2, y);
    x.fillStyle = q.color; B[i].forEach((c, j) => { for (let k = 0; k < c; k++) { x.beginPath(); x.arc(L + j * bw + (k % per + .5) * (bw / per), y - 2 - r - Math.floor(k / per) * dy, r, 0, 7); x.fill(); } });
    const m = q.v.reduce((a, b) => a + b, 0) / q.v.length; x.strokeStyle = ink; x.lineWidth = 2; x.beginPath(); x.moveTo(L + m / bin * bw, y); x.lineTo(L + m / bin * bw, y - RH + 18); x.stroke(); x.font = `700 14px Sofia, sans-serif`; x.fillStyle = ink; x.textAlign = "left"; x.fillText(t.mmss(m), L + m / bin * bw + 4, y - RH + 26);
  });
  x.fillStyle = dim; x.font = `500 13px Sofia, ZH, "PingFang SC", sans-serif`; x.textAlign = "center"; for (let m = 0; m <= 6; m += 2) x.fillText(lang === "zh" ? `${m} 分` : `${m} min`, L + m * 60 / bin * bw + (m ? 0 : 14), H - 4);
}
