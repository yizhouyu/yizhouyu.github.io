// QR Code Model 2, versions 1–10 (ISO/IEC 18004). Shared tables + encoder. No dependencies.
export const LEVELS = "LMQH";
const EC = { // error-correction codewords per block, versions 1..10
  L: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18], M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
  Q: [13, 22, 18, 26, 18, 24, 18, 22, 20, 24], H: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28] };
const NB = { // number of blocks
  L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4], M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
  Q: [1, 1, 2, 2, 4, 4, 6, 6, 8, 8], H: [1, 1, 2, 4, 4, 4, 5, 6, 8, 8] };
export const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
export const FORMAT_BITS = { L: 1, M: 0, Q: 3, H: 2 };
export const MAX_VERSION = 10;

// GF(256), x^8+x^4+x^3+x^2+1
export const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
export const mul = (a, b) => a && b ? EXP[LOG[a] + LOG[b]] : 0;
export const inv = a => EXP[255 - LOG[a]];

export function generator(deg) { // coefficients, highest first, monic
  let g = [1];
  for (let i = 0; i < deg; i++) { const r = new Array(g.length + 1).fill(0);
    g.forEach((c, j) => { r[j] ^= c; r[j + 1] ^= mul(c, EXP[i]); }); g = r; }
  return g;
}
export function rsParity(data, deg) {
  const g = generator(deg), r = new Uint8Array(deg);
  for (const b of data) { const f = b ^ r[0]; r.copyWithin(0, 1); r[deg - 1] = 0; for (let i = 0; i < deg; i++) r[i] ^= mul(g[i + 1], f); }
  return r;
}
export function layout(version, level) { // block structure
  const n = version * 4 + 17, total = rawCodewords(version), nb = NB[level][version - 1], ec = EC[level][version - 1];
  const short = Math.floor(total / nb), long = total % nb, blocks = [];
  for (let i = 0; i < nb; i++) { const len = short + (i >= nb - long ? 1 : 0); blocks.push({ len, data: len - ec, ec }); }
  // transmission order: list of [block, index]
  const order = [], maxData = Math.max(...blocks.map(b => b.data));
  for (let i = 0; i < maxData; i++) blocks.forEach((b, k) => { if (i < b.data) order.push([k, i]); });
  for (let i = 0; i < ec; i++) blocks.forEach((b, k) => order.push([k, b.data + i]));
  return { n, total, nb, ec, t: ec >> 1, blocks, order, dataBytes: total - nb * ec };
}
export function rawCodewords(v) {
  let bits = (16 * v + 128) * v + 64;
  if (v >= 2) { const a = Math.floor(v / 7) + 2; bits -= (25 * a - 10) * a - 55; if (v >= 7) bits -= 36; }
  return bits >> 3;
}
export const maskBit = (m, x, y) => [
  (x + y) % 2, y % 2, x % 3, (x + y) % 3, (Math.floor(x / 3) + Math.floor(y / 2)) % 2,
  x * y % 2 + x * y % 3, (x * y % 2 + x * y % 3) % 2, ((x + y) % 2 + x * y % 3) % 2][m] === 0;

// what each square is for: 0 data, 1 finder(+separator), 2 timing, 3 alignment, 4 format, 5 version, 6 always-dark
const roleCache = {};
export function roles(v) {
  if (roleCache[v]) return roleCache[v];
  const n = v * 4 + 17, r = new Uint8Array(n * n), set = (x, y, k) => { if (x >= 0 && y >= 0 && x < n && y < n) r[y * n + x] = k; };
  for (let i = 0; i < n; i++) { set(6, i, 2); set(i, 6, 2); }
  const A = ALIGN[v], L = A.length;
  for (let i = 0; i < L; i++) for (let j = 0; j < L; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === L - 1) || (i === L - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(A[i] + dx, A[j] + dy, 3);
  }
  for (let i = 0; i < 9; i++) { if (i !== 6) { set(8, i, 4); set(i, 8, 4); } }
  for (let i = 0; i < 8; i++) { set(n - 1 - i, 8, 4); set(8, n - 1 - i, 4); }
  set(8, n - 8, 6);
  for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) set(cx + dx, cy + dy, 1);
  if (v >= 7) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { set(n - 11 + j, i, 5); set(i, n - 11 + j, 5); }
  return roleCache[v] = r;
}
export function dataPath(v) { // index of every data square in reading order
  const n = v * 4 + 17, r = roles(v), p = [];
  for (let right = n - 1; right >= 1; right -= 2) { if (right === 6) right = 5;
    for (let k = 0; k < n; k++) for (let j = 0; j < 2; j++) { const x = right - j, up = ((right + 1) & 2) === 0, y = up ? n - 1 - k : k; if (!r[y * n + x]) p.push(y * n + x); } }
  return p;
}
export function formatCode(level, mask) { const d = FORMAT_BITS[level] << 3 | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); return (d << 10 | r) ^ 0x5412; }
export function versionCode(v) { let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25); return v << 12 | r; }
export function formatCells(n) { // two copies, bit i (0 = least significant) -> [x,y]
  const a = [], b = [];
  for (let i = 0; i <= 5; i++) a[i] = [8, i]; a[6] = [8, 7]; a[7] = [8, 8]; a[8] = [7, 8];
  for (let i = 9; i < 15; i++) a[i] = [14 - i, 8];
  for (let i = 0; i < 8; i++) b[i] = [n - 1 - i, 8];
  for (let i = 8; i < 15; i++) b[i] = [8, n - 15 + i];
  return [a, b];
}
export const ALNUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
function segment(text, byte) {
  if (!byte && /^\d+$/.test(text)) return { mode: 1, count: text.length, cc: v => v < 10 ? 10 : 12, bits: push => { for (let i = 0; i < text.length; i += 3) { const s = text.slice(i, i + 3); push(+s, s.length * 3 + 1); } }, len: text.length / 3 * 10 };
  if (!byte && [...text].every(c => ALNUM.includes(c))) return { mode: 2, count: text.length, cc: v => v < 10 ? 9 : 11, bits: push => { for (let i = 0; i < text.length; i += 2) { const a = ALNUM.indexOf(text[i]); if (i + 1 < text.length) push(a * 45 + ALNUM.indexOf(text[i + 1]), 11); else push(a, 6); } } };
  const b = new TextEncoder().encode(text);
  return { mode: 4, count: b.length, cc: v => v < 10 ? 8 : 16, bits: push => b.forEach(x => push(x, 8)) };
}
export function pickVersion(text, level, byte = false) {
  const s = segment(text, byte); let len = 0; s.bits((_, n) => len += n);
  for (let v = 1; v <= MAX_VERSION; v++) if (4 + s.cc(v) + len <= layout(v, level).dataBytes * 8) return v;
  return 0;
}
export function encode(text, level = "H", { version = 0, mask = -1, byte = false } = {}) {
  version = version || pickVersion(text, level, byte); if (!version) return null;
  const lay = layout(version, level), s = segment(text, byte), bits = [], push = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push(v >>> i & 1); };
  push(s.mode, 4); push(s.count, s.cc(version)); s.bits(push);
  const cap = lay.dataBytes * 8; if (bits.length > cap) return null;
  const used = bits.length; push(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
  for (let p = 0xec; bits.length < cap; p ^= 0xec ^ 0x11) push(p, 8);
  const bytes = new Uint8Array(lay.dataBytes); bits.forEach((b, i) => bytes[i >> 3] |= b << (7 - (i & 7)));
  let o = 0; const blocks = lay.blocks.map(b => { const d = bytes.slice(o, o += b.data), all = new Uint8Array(b.len); all.set(d); all.set(rsParity(d, b.ec), b.data); return all; });
  const codewords = lay.order.map(([k, i]) => blocks[k][i]);
  const build = m => draw(version, level, m, codewords);
  let best = null; const scores = [];
  if (mask >= 0) best = { mask, m: build(mask) };
  else for (let k = 0, lo = 1e9; k < 8; k++) { const m = build(k), p = penalty(m, lay.n); scores[k] = p; if (p < lo) { lo = p; best = { mask: k, m }; } }
  return { text, level, version, n: lay.n, mask: best.mask, modules: best.m, codewords, blocks, lay, usedBits: used, mode: s.mode, scores };
}
function draw(v, level, mask, codewords) {
  const n = v * 4 + 17, m = new Uint8Array(n * n), r = roles(v), set = (x, y, d) => { if (x >= 0 && y >= 0 && x < n && y < n) m[y * n + x] = d; };
  for (let i = 0; i < n; i++) { set(6, i, i % 2 === 0 ? 1 : 0); set(i, 6, i % 2 === 0 ? 1 : 0); }
  for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, d !== 2 && d !== 4 ? 1 : 0); }
  const A = ALIGN[v], L = A.length;
  for (let i = 0; i < L; i++) for (let j = 0; j < L; j++) { if ((i === 0 && j === 0) || (i === 0 && j === L - 1) || (i === L - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(A[i] + dx, A[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1 ? 1 : 0); }
  const f = formatCode(level, mask);
  for (const copy of formatCells(n)) copy.forEach(([x, y], i) => set(x, y, f >>> i & 1));
  set(8, n - 8, 1);
  if (v >= 7) { const c = versionCode(v); for (let i = 0; i < 18; i++) { const a = n - 11 + i % 3, b = Math.floor(i / 3), d = c >>> i & 1; set(a, b, d); set(b, a, d); } }
  const path = dataPath(v);
  path.forEach((p, i) => { const bit = i >> 3 < codewords.length ? codewords[i >> 3] >>> (7 - (i & 7)) & 1 : 0; m[p] = bit ^ (maskBit(mask, p % n, Math.floor(p / n)) ? 1 : 0); });
  return m;
}
export function penalty(m, n) {
  let s = 0; const g = (x, y) => m[y * n + x];
  for (const at of [(i, j) => g(j, i), (i, j) => g(i, j)]) for (let i = 0; i < n; i++) {
    let run = 1; const line = []; for (let j = 0; j < n; j++) line.push(at(i, j));
    for (let j = 1; j <= n; j++) { if (j < n && line[j] === line[j - 1]) run++; else { if (run >= 5) s += run - 2; run = 1; } }
    const str = line.join(""); for (let k = 0; k + 11 <= n; k++) { const w = str.slice(k, k + 11); if (w === "10111010000" || w === "00001011101") s += 40; }
  }
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = g(x, y); if (c === g(x + 1, y) && c === g(x, y + 1) && c === g(x + 1, y + 1)) s += 3; }
  let dark = 0; for (const b of m) dark += b;
  return s + Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
}

// where everything lives (byte mode): which squares hold which letter, which piece
export function mapOf(e) {
  const n = e.n, path = dataPath(e.version), lay = e.lay, pos = new Map(); lay.order.forEach(([k, i], j) => pos.set(k + "," + i, j));
  const at = []; lay.blocks.forEach((b, k) => { for (let i = 0; i < b.data; i++) at.push(pos.get(k + "," + i)); }); // data byte -> place in the stream
  const cellOf = bit => path[at[bit >> 3] * 8 + (bit & 7)], head = 4 + (e.version < 10 ? 8 : 16), letters = []; let b = head;
  for (const ch of e.text) { const len = new TextEncoder().encode(ch).length * 8, cells = []; for (let i = 0; i < len; i++) cells.push(cellOf(b++)); letters.push({ ch, cells }); }
  const pieceAt = new Int32Array(n * n).fill(-1), pieces = []; lay.order.forEach(([k, i], j) => { const cells = path.slice(j * 8, j * 8 + 8); cells.forEach(c => pieceAt[c] = j); pieces.push({ j, block: k, index: i, spare: i >= lay.blocks[k].data, cells }); });
  const headCells = []; for (let i = 0; i < head; i++) headCells.push(cellOf(i));
  return { path, letters, pieces, pieceAt, headCells, roles: roles(e.version) };
}
