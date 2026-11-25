// The light of the hour. Two families (dark ink on paper, light ink on night); inside each the colour drifts with the clock.
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const P = (o) => { for (const k in o) if (typeof o[k] === "string") o[k] = rgb(o[k]); return o; };
const DAY = P({ bg: "#f2ecde", water: "#dde0da", land: "#f5efe1", other: "#f2ecde", park: "#dde2c6", ink: "#191b26", shore: "#33405a", lit: "#23211f", litTop: "#4a4136", dim: "#b5ab97", wash: "#f6dfa2", casing: "#fbf6ea", trainCase: "#191b26", dotInk: "#191b26", dotFill: "#fffaf0", baseTint: "#6d675c", routeCase: "#191b26", reach: "#ecd9ae", reachF: .85, reachEdge: "#7a5a1e", edgeA: .7, ghostA: .22, parkA: .55, washA: .85, shoreA: .3, lineA: .1, baseA: .55, baseBoost: 0, baseTintA: .62, dimA: .62, farA: .4, caseW: 1.1, glow: 0 });
const DAWN = { ...DAY, ...P({ bg: "#f3ddcb", water: "#e3cfc6", land: "#f7e5d4", other: "#f3ddcb", park: "#e0dabf", wash: "#f8d594" }) };
const GOLD = { ...DAY, ...P({ bg: "#f3dfba", water: "#e2d2b6", land: "#f7e6c6", other: "#f3dfba", park: "#e0dab0", wash: "#f7cf7f" }) };
const NIGHT = P({ bg: "#090d1b", water: "#090d1b", land: "#10162a", other: "#090d1b", park: "#0f1b29", ink: "#f4ecdb", shore: "#6f7cab", lit: "#ffc76b", litTop: "#fff1cf", dim: "#42507c", wash: "#3b2c1f", casing: "#090d1b", trainCase: "#090d1b", dotInk: "#f4ecdb", dotFill: "#090d1b", baseTint: "#55608a", routeCase: "#f4ecdb", reach: "#3f2f1a", reachF: .95, reachEdge: "#ffc76b", edgeA: .8, ghostA: .26, parkA: .6, washA: .9, shoreA: .26, lineA: .09, baseA: .6, baseBoost: 0, baseTintA: .72, dimA: .6, farA: .45, caseW: 0, glow: 1 });
const DUSK = { ...NIGHT, ...P({ bg: "#1d1730", water: "#1d1730", land: "#282040", other: "#1d1730", park: "#25283f", dim: "#5d5488", baseTint: "#6f6796", wash: "#54382a", casing: "#1d1730", dotFill: "#1d1730", trainCase: "#1d1730", shore: "#8f84b8" }) };
const PRE = { ...NIGHT, ...P({ bg: "#1a1c3a", water: "#1a1c3a", land: "#242749", other: "#1a1c3a", park: "#222c47", dim: "#545c92", baseTint: "#6870a0", wash: "#4a3530", casing: "#1a1c3a", dotFill: "#1a1c3a", trainCase: "#1a1c3a", shore: "#858fc4" }) };
for (const p of [DAY, DAWN, GOLD, NIGHT, DUSK, PRE]) p.reachMix = mix(p.land, p.reach, p.reachF);
export const mixPal = (a, b, t) => { if (t <= 0) return a; if (t >= 1) return b; const o = {}; for (const k in a) o[k] = typeof a[k] === "number" ? a[k] + (b[k] - a[k]) * t : mix(a[k], b[k], t); return o; };
export const SUNUP = 6.75 * 60, SUNDOWN = 17 * 60;
const ramp = (m, a, b) => Math.max(0, Math.min(1, (m - a) / (b - a)));
export const isDark = m => m < SUNUP || m >= SUNDOWN;
export const light = m => m < 12 * 60 ? mixPal(DAWN, DAY, ramp(m, SUNUP + 20, SUNUP + 85)) : mixPal(DAY, GOLD, ramp(m, SUNDOWN - 100, SUNDOWN - 15));
export const dark = m => m < 12 * 60 ? mixPal(NIGHT, PRE, ramp(m, SUNUP - 85, SUNUP - 10)) : mixPal(DUSK, NIGHT, ramp(m, SUNDOWN + 25, SUNDOWN + 130));
export const DAYP = DAY, NIGHTP = NIGHT;
export const css = c => `rgb(${c.map(v => Math.round(v * 255)).join(",")})`;
