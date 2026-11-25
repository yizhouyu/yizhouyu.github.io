// window + date -> everything the page says. Main thread (a skyline takes ~5 ms).
import * as C from './core.js'; import * as S from './sun.js'; import { kind } from './geom.js'; import { NAMES, STOREY, nice, niceZh } from './names.js';
export { C, S };
export const city = new C.City(), txt = [], bins = new Map(), kinds = [];
export let place = S.PLACE_NY, Y = S.nyNow().y, T = null;
export const setPlace = p => { place = p; T = null; }; export const setYear = y => { if (y !== Y) { Y = y; T = null; } };
export const table = () => T && T.y === Y && T.place === place ? T : (T = S.yearTable(Y, 5, place));
export function addBand(b, t) { const id0 = city.n; b.id0 = id0; city.add(b, b.name); for (let k = 0; k < b.n; k++) { const q = (t[k] || '').split('|'); txt[id0 + k] = q; if (!bins.has(b.bin[k])) bins.set(b.bin[k], id0 + k); const r = ((b.bin[k] * 2654435761) >>> 0) / 4294967296; kinds[id0 + k] = [kind(b.bb[k * 5 + 4] - b.base[k] / 10, +q[2] || 0, b.src[k], r), r]; } }
export const binOf = id => { const b = city.band(id); return b ? b.bin[id - b.id0] : 0; };
export const info = id => { const b = city.band(id); if (!b) return null; const k = id - b.id0, q = txt[id] || [], base = b.base[k] / 10, h = b.bb[k * 5 + 4] - base; return { addr: q[0] || '', floors: +q[1] || 0, year: +q[2] || 0, base, h, top: b.bb[k * 5 + 4], src: b.src[k], bb: b.bb.subarray(k * 5, k * 5 + 5) }; };
export const famous = id => NAMES[binOf(id)] || null;
export function nameOf(id, lang) { const f = famous(id); if (f) return f[lang === 'zh' ? 1 : 0]; const a = txt[id] && txt[id][0]; return a ? (lang === 'zh' ? niceZh(a) : nice(a)) : lang === 'zh' ? '一栋楼' : 'a building'; }
export const floorH = id => { const i = info(id); if (!i) return 3.4; const b = STOREY[binOf(id)]; if (b) return b; const f = i.floors > 1 ? i.h / i.floors : 3.5; return f > 2.9 && f < 5.2 ? f : 3.5; };
export const floorOf = (id, z) => { const i = info(id); return i ? Math.max(1, Math.floor((z - i.base) / floorH(id)) + 1) : Math.max(1, Math.floor(z / 3.2) + 1); };
export const zOf = (id, fl) => info(id).base + (fl - 1) * floorH(id) + 1.6;
const rad = Math.PI / 180;
export const nrm = az => [Math.sin(az * rad), Math.cos(az * rad)];
// snap to the wall: look back at the building from 'out' metres in front
export function wallAt(x, y, z, az, out = 1.5) { const [nx, ny] = nrm(az), r = city.ray([x + nx * out, y + ny * out, z], [-nx, -ny, 0], out + 6); if (!r || !r.wall) return null; return { p: [r.x, r.y, z], az: (Math.atan2(r.nx, r.ny) / rad + 360) % 360, id: r.id, top: r.top }; }
// is there room in front of the wall (not a party wall)?
export function clearOf(w, d = 1.2) { const [nx, ny] = nrm(w.az), r = city.ray([w.p[0] + nx * .05, w.p[1] + ny * .05, w.p[2]], [nx, ny, 0], d); return !r; }
// the same wall line on another floor: follow setbacks inwards
export function raise(w, z) { const [nx, ny] = nrm(w.az); for (let s = -1.2; s < 70; s += .6) { const x = w.p[0] - nx * s, y = w.p[1] - ny * s, a = city.at(x, y); if (a && a.z > z + .8 && (a.id === w.id || (txt[a.id] && txt[w.id] && txt[a.id][0] === txt[w.id][0] && txt[w.id][0]))) { const q = wallAt(x + nx * .7, y + ny * .7, z, w.az, 1.2); if (q && Math.abs(((q.az - w.az + 540) % 360) - 180) < 30 && (q.id === w.id || q.id === a.id)) { return { ...q, id: w.id }; } } } return null; }
export function range(w) { const i = info(w.id), n = Math.max(1, Math.round(i.h / floorH(w.id))); return { lo: 1, hi: Math.min(120, i.floors > 1 ? Math.min(n, Math.ceil(i.floors)) : n) }; }
// the four sides of the building at this height
export function sides(w) { const i = info(w.id), z = w.p[2], cx0 = (i.bb[0] + i.bb[2]) / 2, cy0 = (i.bb[1] + i.bb[3]) / 2; let cx = 0, cy = 0, n = 0; for (let a = 0; a < 14; a++) for (let b = 0; b < 14; b++) { const x = i.bb[0] + (i.bb[2] - i.bb[0]) * (a + .5) / 14, y = i.bb[1] + (i.bb[3] - i.bb[1]) * (b + .5) / 14, h = city.at(x, y, id => id === w.id); if (h && h.z > z) { cx += x; cy += y; n++; } } if (n) { cx /= n; cy /= n; } else { cx = cx0; cy = cy0; } const R = Math.hypot(i.bb[2] - i.bb[0], i.bb[3] - i.bb[1]);
  return [0, 90, 180, 270].map(d => { const az = (w.az + d) % 360; if (!d && w.p.length === 3 && !w.free) return { ...w }; const [nx, ny] = nrm(az); let best = null; for (const off of [0, -4, 4, -8, 8, -13, 13]) { const x = cx - ny * off, y = cy + nx * off; let t = R; for (let k = 0; k < 6; k++) { const r = city.ray([x + nx * t, y + ny * t, z], [-nx, -ny, 0], t + 1); if (!r || !r.wall) break; if (r.id === w.id) { const q = { p: [r.x, r.y, z], az: (Math.atan2(r.nx, r.ny) / rad + 360) % 360, id: w.id, top: r.top }; if (Math.abs(((q.az - az + 540) % 360) - 180) < 25) { best = q; } break; } t -= r.t + .5; if (t < 0) break; } if (best) break; } if (best && !clearOf(best, 2.5)) return null; return best; }); }
export const eyeOf = w => { const [nx, ny] = nrm(w.az); return [w.p[0] + nx * .3, w.p[1] + ny * .3, w.p[2]]; };
export function skyline(w, gone = city.gone, parts = true) { return city.horizon(eyeOf(w), w.az, { parts, gone }); }
export const sunAt = (n, m) => S.sunAt(Y, n, m, place);
export const spans = (h, n) => C.daySpans(h, m => sunAt(n, m));
export const hours = sp => sp.reduce((a, s) => a + (s.s === C.SUN ? s.b - s.a : 0), 0);
export const fastHours = (h, n, removed) => { const t = table(); let c = 0; for (let k = 0; k < t.K; k++) { const i = n * t.K + k; if (t.al[i] > 0 && C.state(h, t.az[i], t.al[i], removed) === C.SUN) c++; } return c * t.step; };
// join spans that a person would call one, drop blinks
export function bands(sp, gap = 7, min = 5) { const o = []; for (const s of sp) if (s.s === C.SUN) { const l = o[o.length - 1]; if (l && s.a - l[1] <= gap) l[1] = s.b; else o.push([s.a, s.b]); } return o.filter(b => b[1] - b[0] >= min); }
// what each building takes on a day: minutes the window would gain if that building alone were gone
export function thieves(h, n) { const t = table(), g = new Map(), tk = new Map(); for (let k = 0; k < t.K; k++) { const i = n * t.K + k; if (t.al[i] <= 0) continue; const id = C.blocker(h, t.az[i], t.al[i]); if (id < 0) continue; tk.set(id, (tk.get(id) || 0) + t.step); if (C.state(h, t.az[i], t.al[i], id) === C.SUN) g.set(id, (g.get(id) || 0) + t.step); } return [...tk].map(([id, took]) => ({ id, took, gain: g.get(id) || 0 })).sort((a, b) => b.gain - a.gain || b.took - a.took); }
export const specials = () => { const t = S.dayOf(Y, 6, 21), d = S.dayOf(Y, 12, 21), m = S.dayOf(Y, 3, 20); return { jun: t, dec: d, mar: m }; };
export const localSun = p => { const a = C.toLoc(p.az) * rad, h = p.app * rad; return [Math.sin(a) * Math.cos(h), Math.cos(a) * Math.cos(h), Math.sin(h)]; };
// how far the beam reaches into the room (metres from the wall, on the floor), window top as in the drawing
export function reach(w, p, room) { const r = (p.az - C.toTrue(w.az) + 540) % 360 - 180; if (p.app <= 0 || Math.abs(r) >= 88) return 0; const d = room.top * Math.cos(r * rad) / Math.tan(p.app * rad); return d < room.d && Math.abs(d * Math.tan(r * rad)) < room.w / 2 ? d : 0; }
const D16 = { en: 'north|north, a little east|northeast|east, a little north|east|east, a little south|southeast|south, a little east|south|south, a little west|southwest|west, a little south|west|west, a little north|northwest|north, a little west'.split('|'), zh: '北|北偏东|东北|东偏北|东|东偏南|东南|南偏东|南|南偏西|西南|西偏南|西|西偏北|西北|北偏西'.split('|') };
export const dirName = (azT, lang) => D16[lang][Math.round(azT / 22.5) % 16];
export const dir4 = (azT, lang) => (lang === 'zh' ? ['北面', '东面', '南面', '西面'] : ['North', 'East', 'South', 'West'])[Math.round(azT / 90) % 4];
// what one building really costs on a day: the day recomputed without it
export const gainOf = (w, id, n, base) => hours(spans(skyline(w, new Set([...city.gone, id]), false), n)) - base;
// floors of a building this window could be on -> [{f, w}] (w found lazily)
export function floorList(w) { const r = range(w), o = []; for (let f = r.lo; f <= r.hi; f++) o.push({ f, h: null, w: null }); return o; }
