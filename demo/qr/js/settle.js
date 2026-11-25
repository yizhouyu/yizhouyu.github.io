export const TOP = 12;
// any three of the four on one straight line decide
export function settle(v) { const all = [0, 1, 2, 3], fits = (a, b) => { const s = (v[b] - v[a]) / (b - a); return i => v[a] + s * (i - a); }; let best = null; for (const [a, b, c] of [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]]) { const f = fits(a, b); if (Math.abs(f(c) - v[c]) > 1e-9) continue; const odd = all.find(i => ![a, b, c].includes(i)), w = f(odd); if (Math.abs(w - v[odd]) < 1e-9) return { kind: "whole", f }; if (Number.isInteger(w) && w >= 0 && w <= TOP) { const fix = v.slice(); fix[odd] = w; best = { kind: "fixed", odd, w, f, fix }; } } return best || { kind: "lost" }; }

// seven points, three of them yours, on one curve with a single bend: any five that agree decide
export function settleCurve(v) {
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) for (let c = b + 1; c < 7; c++) {
    const f = x => v[a] * (x - b) * (x - c) / ((a - b) * (a - c)) + v[b] * (x - a) * (x - c) / ((b - a) * (b - c)) + v[c] * (x - a) * (x - b) / ((c - a) * (c - b)); let k = 0; for (let i = 0; i < 7; i++) if (Math.abs(f(i) - v[i]) < 1e-7) k++;
    if (k === 7) return { kind: "whole", f }; if (k >= 5) { const fix = v.map((_, i) => f(i)), odd = v.findIndex((y, i) => Math.abs(f(i) - y) > 1e-7); return { kind: "fixed", odd, f, fix: fix.map(x => Math.round(x * 1e6) / 1e6) }; }
  }
  return { kind: "lost" };
}
