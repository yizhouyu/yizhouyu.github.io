// The glaze scale: colour = temperature. Cool = not safe yet, warm = safe, a small jump exactly at the safe line.
export const SAFE = 73.9; // 165 F
const S = [[-20, "#0b1834"], [-4, "#16305f"], [5, "#1f4382"], [25, "#3a78a8"], [45, "#6fa9ad"], [60, "#a5c9b2"], [73.8, "#d2e0c4"], [74, "#f4d88e"], [82, "#eeb25a"], [91, "#d9702f"], [100, "#a92b16"], [108, "#5a150b"], [122, "#1d0a06"]];
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), lin = (c) => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }, srgb = (c) => Math.round(255 * (c <= .0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - .055));
export function glaze(T) { let i = 0; while (i < S.length - 2 && T >= S[i + 1][0]) i++; const u = Math.min(1, Math.max(0, (T - S[i][0]) / (S[i + 1][0] - S[i][0]))), a = rgb(S[i][1]), b = rgb(S[i + 1][1]); return a.map((v, k) => srgb(lin(v) + (lin(b[k]) - lin(v)) * u)); }
export const css = (T) => { const c = glaze(T); return `rgb(${c[0]},${c[1]},${c[2]})`; };
export const T0 = -20, T1 = 122; export function lut(n = 568) { const d = new Uint8Array(n * 4); for (let i = 0; i < n; i++) { const c = glaze(T0 + (T1 - T0) * (i + .5) / n); d.set([c[0], c[1], c[2], 255], i * 4); } return d; }
export const inkOn = (T) => { const [r, g, b] = glaze(T).map(lin); return .2126 * r + .7152 * g + .0722 * b > .2 ? "#1d1714" : "#fbf8f2"; };
