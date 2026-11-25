import { decodeImage } from "./decode.js";
export const R = 3.6; // sticker radius in squares
export const photo = (e, at, px = 8) => { const N = e.n + 8, W = N * px, g = new Uint8Array(W * W).fill(245); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const X = (x + .5) / px, Y = (y + .5) / px; if (at && Math.hypot(X - at[0], Y - at[1]) < R) continue; const i = Math.floor(X) - 4, j = Math.floor(Y) - 4; if (i >= 0 && j >= 0 && i < e.n && j < e.n && e.modules[j * e.n + i]) g[y * W + x] = 22; } return [g, W]; };
export const reads = (e, at, px = 4) => { const [g, W] = photo(e, at, px), r = decodeImage(g, W, W); return r.stage === "ok" && r.text === e.text; };
// lay the sticker everywhere, one row per frame: where does it kill?
export function deadly(e, done, live = () => true) { const list = []; let y = 2; const row = () => { if (!live()) return; for (let x = 2; x < 31; x++) if (!reads(e, [x + .5, y + .5])) list.push([x, y]); if (++y < 31) setTimeout(row, 0); else done(list); }; row(); }
