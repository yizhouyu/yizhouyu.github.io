export const $ = s => document.querySelector(s);
export const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
export const out = t => 1 - (1 - t) ** 3;
export const still = matchMedia("(prefers-reduced-motion: reduce)");
export function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) { if (k === "class") e.className = v; else if (k === "html") e.innerHTML = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else if (v === true) e.setAttribute(k, ""); else if (v !== false && v != null) e.setAttribute(k, v); }
  kids.flat().forEach(k => k != null && e.append(k)); return e;
}
export const store = { get(k, d) { try { const v = localStorage.getItem("qr." + k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem("qr." + k, JSON.stringify(v)); } catch {} } };
export const vib = p => { try { navigator.vibrate?.(p); } catch {} };
