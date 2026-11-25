import { $, el, clamp, lerp, store, still } from "./util.js";
import { T, pickLang, ABOUT } from "./i18n.js";
import { Paper } from "./paper.js";
import { PAPER, INK } from "./damage.js";
import { encode, mapOf } from "./core.js";
import { play } from "./sound.js";
import * as sound from "./sound.js";
import { Ruin } from "./ruin.js";
import { Find } from "./find.js";
import { Duel } from "./duel.js";
import { Quiz } from "./quiz.js";
import { Mend } from "./mend.js";
import { Own } from "./own.js";
import { End } from "./end.js";
import { Letter } from "./letter.js";
import { Flip } from "./flip.js";
import { Path } from "./path.js";
import { Spare } from "./spare.js";
import { Make } from "./make.js";

const glc = $("#gl"), over = $("#over"), sheet = $("#sheet"), plane = $("#plane");
export const S = {
  lang: pickLang(), lights: document.documentElement.dataset.lights || "on", size: 0, dpr: 1, look: document.createElement("canvas"), over, octx: over.getContext("2d"), sheet, plane, glc,
  paper: new Paper(glc), sound, t: null, mode: null, modes: {}, drawn: false,
  get T() { return T[this.lang]; }, get green() { return "#00a56a"; },
};
S.lookC = S.look.getContext("2d");
window.__qr = S;

let held = null;
/* ---- painting: the mode paints S.look (the print) and S.over (the reader's marks); this loop lights it ---- */
S.dirtyLook = S.dirtyOver = true;
S.paint = () => { S.dirtyLook = true; }; S.mark = () => { S.dirtyOver = true; };
let last = performance.now(), frames = 0;
S.fps = () => frames;
function loop(now) {
  const dt = Math.min(50, now - last); last = now; frames++;
  const m = S.mode; if (m?.tick?.(dt, now)) S.dirtyLook = S.dirtyOver = true;
  const p = S.paper; for (const k of [0, 1]) { const d = p.goal[k] - p.light[k]; if (Math.abs(d) > .002) { p.light[k] += d * (still.matches ? 1 : Math.min(1, dt / 260)); p.dirty = true; } }
  const dg = S.lights === "off" ? 1 : 0; if (Math.abs(dg - p.dark) > .004) { p.dark += (dg - p.dark) * (still.matches ? 1 : Math.min(1, dt / 140)); p.dirty = true; } else if (p.dark !== dg) { p.dark = dg; p.dirty = true; }
  if (S.dirtyLook) { S.dirtyLook = false; if (m?.draw) { const c = S.lookC, w = S.look.width; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; c.fillStyle = PAPER; c.fillRect(0, 0, w, w); c.setTransform(w, 0, 0, w, 0, 0); m.draw(c); } p.dirtyTex = p.dirty = true; }
  if (p.dirty && !document.hidden) p.render(S.look);
  S.ghosting = held === null && now - S.touched > (m?.wait ?? 1500) && !!m?.ghost?.(); if (seen(now, m)) S.dirtyOver = true;
  if (S.dirtyOver) { S.dirtyOver = false; const c = S.octx, w = over.width; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.clearRect(0, 0, w, w); c.setTransform(w, 0, 0, w, 0, 0); m?.marks?.(c); ghost(c, now, m); seal(c, now); }
  requestAnimationFrame(loop);
}
/* when nobody touches it for a moment, a ring shows the gesture; success gets a seal */
S.touched = performance.now(); S.sealAt = -1e9; S.tick = () => { S.sealAt = performance.now(); play.alive(); S.mark(); };
const seen = (now, m) => now - S.sealAt < 1300 || (held === null && now - S.touched > (m?.wait ?? 1500) && !!m?.ghost?.());
function ghost(c, now, m) {
  if (held !== null || now - S.touched < (m?.wait ?? 1500)) return; const g = m?.ghost?.(); if (!g) return; const T = 2300, t = still.matches ? .05 : (now % T) / T, k = clamp((t - .12) / .68), n = g.length - 1, f = k * n, i = Math.min(n - 1, Math.floor(f)), x = lerp(g[i][0], g[i + 1][0], f - i), y = lerp(g[i][1], g[i + 1][1], f - i), a = t < .12 ? t / .12 : t > .86 ? (1 - t) / .14 : 1;
  c.globalAlpha = a; c.fillStyle = "rgba(0,165,106,.28)"; c.strokeStyle = "#00a56a"; c.lineWidth = Math.max(.004, 2 / S.size); const tap = g.every(p => p[0] === g[0][0] && p[1] === g[0][1]), r = .034 * (tap ? 1 - .3 * Math.sin(k * Math.PI * 4) ** 2 : 1); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.stroke(); c.globalAlpha = 1;
}
function seal(c, now) {
  const t = (now - S.sealAt) / 1300; if (t < 0 || t >= 1) return; const a = t > .78 ? (1 - t) / .22 : 1, k = clamp(t / .3), r = .07 * (k < 1 ? 1 - (1 - k) ** 3 : 1); c.globalAlpha = a; c.fillStyle = "#007a4f"; c.beginPath(); c.arc(.9, .1, r, 0, 7); c.fill();
  const p = [[-.03, .002], [-.008, .024], [.033, -.024]], q = clamp((t - .12) / .25), L1 = .45; c.strokeStyle = "#fff"; c.lineWidth = .009; c.lineCap = "square"; c.beginPath(); c.moveTo(.9 + p[0][0], .1 + p[0][1]); const s1 = clamp(q / L1), s2 = clamp((q - L1) / (1 - L1)); c.lineTo(.9 + lerp(p[0][0], p[1][0], s1), .1 + lerp(p[0][1], p[1][1], s1)); if (s2 > 0) c.lineTo(.9 + lerp(p[1][0], p[2][0], s2), .1 + lerp(p[1][1], p[2][1], s2)); if (q > 0) c.stroke(); c.globalAlpha = 1; c.lineCap = "butt";
}
S.setLook = side => { if (S.look.width !== side) { S.look.width = S.look.height = side; } S.paint(); };
function layout() {
  const W = innerWidth, H = innerHeight, phone = matchMedia("(max-width:860px) and (max-aspect-ratio:1/1)").matches, low = !phone && H <= 560; let s;
  if (phone) s = Math.min(W - 64, Math.max(240, H * .43)); else if (low) s = Math.min((H - 84) * .88, W * .5 - 60); else s = Math.min((H - 52 - 64) * .86, (W - 372 - 112) * .86);
  s = Math.max(220, Math.floor(s)); S.size = s; S.dpr = Math.min(devicePixelRatio || 1, phone ? 2 : 2.5);
  document.documentElement.style.setProperty("--S", s + "px");
  const px = Math.min(1500, Math.round(s * S.dpr)); over.width = over.height = px; S.px = px; S.paper.resize(px);
  S.phone = phone; S.setLook(px); S.mode?.resize?.(); S.mark();
}
let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(layout, 60); });

/* ---- words ---- */
const label = { kick: $("#kick"), title: $("#title"), say: $("#say"), ctl: $("#ctl"), next: $("#next") };
S.say = (html, { title, kick, won, dead } = {}) => { $("#label").classList.toggle("won", !!won && !dead); $("#label").classList.toggle("killed", !!dead); if (label.say.innerHTML !== html) label.say.innerHTML = html; if (title != null) label.title.textContent = title; if (kick != null) label.kick.textContent = kick; };
S.ctl = (...nodes) => { label.ctl.replaceChildren(...nodes.flat().filter(Boolean)); };
let nextAt = 0; S.next = (text, fn0, ready = false) => { const fn = fn0 && (() => { if (performance.now() - nextAt > 450) fn0(); }); if (text && (label.next.hidden || label.next.firstChild.textContent !== text)) nextAt = performance.now(); label.next.hidden = !text; label.next.firstChild.textContent = text || ""; label.next.onclick = fn; label.next.classList.toggle("ready", ready); };
S.ready = (on = true) => label.next.classList.toggle("ready", on);
S.hint = text => { $("#touch").textContent = text || ""; $("#touch").style.opacity = text ? 1 : 0; };
let tt; S.toast = text => { const e = $("#toast"); e.textContent = text; e.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => e.classList.remove("on"), 2200); };
S.aria = text => over.setAttribute("aria-label", text);

/* ---- chapters ---- */
const ORDER = ["duel", "quiz", "letter", "path", "mend", "own", "end"], RAIL = ["duel", "quiz", "letter", "mend", "own", "end"], EXTRA = ["ruin", "find", "flip", "guess", "spare", "make"];
S.modes = { duel: new Duel(S), quiz: new Quiz(S), mend: new Mend(S), own: new Own(S), ruin: new Ruin(S), letter: new Letter(S), path: new Path(S), flip: new Flip(S), make: new Make(S), end: new End(S), find: new Find(S), guess: new Flip(S, "guess", ["score", "strip"]), spare: new Spare(S) };
const done = new Set(); let reached = 0;
S.finish = id => { if (!done.has(id)) { done.add(id); rail(); } };
S.after = id => EXTRA.includes(id) ? "end" : ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(id) + 1)];
function rail() {
  $("#rail").setAttribute("aria-label", S.T.chapters);
  $("#rail").replaceChildren(...RAIL.map((id, i) => { const here = S.mode?.id === id || id === "letter" && S.mode?.id === "path"; return el("button", { type: "button", class: (id === "letter" ? done.has("path") : done.has(id)) ? "done" : "", disabled: ORDER.indexOf(id) > reached, "aria-current": here ? "step" : null, "aria-label": `${i + 1}. ${S.T.rail[id]}`, onclick: () => S.go(id) }, el("span", {}, S.T.rail[id])); }));
}
S.go = (id, state = null, { push = true } = {}) => {
  S.mode?.leave?.(); S.hint(""); plane.style.transform = ""; over.style.cursor = ""; S.ctl(); S.next("");
  reached = Math.max(reached, ORDER.indexOf(id)); S.mode = S.modes[id]; document.body.dataset.mode = id; S.touched = performance.now() - 700; S.sealAt = -1e9; S.setLook(S.px); S.mode.enter(state); rail(); S.paint(); S.mark(); if (!still.matches) S.paper.light = [1.05, -.45];
  if (push) { try { history.pushState(null, "", "#" + S.mode.hash()); } catch {} }
  if (S.phone && push) scrollTo({ top: 0 });
};
let ht; S.save = () => { clearTimeout(ht); ht = setTimeout(() => { try { history.replaceState(null, "", "#" + S.mode.hash()); } catch {} }, 300); };
S.link = () => location.origin + location.pathname + (S.lang === "zh" ? "?lang=zh" : "?lang=en") + "#" + S.mode.hash() + "&from=1";
function route() { const q = new URLSearchParams(location.hash.slice(1)), id = ORDER.includes(q.get("m")) || EXTRA.includes(q.get("m")) ? q.get("m") : "duel"; S.go(id, q, { push: false }); }
addEventListener("popstate", route);

/* ---- language, lights, sound, about ---- */
function words() {
  const t = S.T; document.documentElement.lang = S.lang === "zh" ? "zh-CN" : "en"; document.title = t.title;
  $("#home").textContent = t.home; $("#lang").textContent = t.other; $("#lang").setAttribute("aria-label", t.otherLong); chrome(); rail();
}
function chrome() { const t = S.T; $("#mute").textContent = sound.snd.on ? t.mute : t.unmute; $("#mute").setAttribute("aria-pressed", String(!sound.snd.on)); }
$("#lang").onclick = () => { S.lang = S.lang === "zh" ? "en" : "zh"; try { localStorage.setItem("demo.lang", S.lang); } catch {} const u = new URL(location.href); if (u.searchParams.has("lang")) { u.searchParams.set("lang", S.lang); history.replaceState(null, "", u); } words(); S.mode.words(); S.save(); };
S.light = () => { S.lights = S.lights === "off" ? "on" : "off"; document.documentElement.dataset.lights = S.lights; store.set("lights", S.lights); chrome(); S.mark(); S.mode.words?.(); };
$("#mute").onclick = () => { sound.wake(); sound.mute(!sound.snd.on); chrome(); };
addEventListener("pointerdown", () => sound.wake(), { capture: true });
const box = $("#aboutBox"); S.about = () => {
  const a = ABOUT[S.lang], own = S.modes.ruin.code, e = own && own.n >= 25 && own.n <= 45 ? own : encode(S.T.ruin.def, "H", { byte: true }), map = mapOf(e), n = e.n, piece = k => map.pieceAt[k] >= 0 ? map.pieces[map.pieceAt[k]] : null;
  const is = [k => map.roles[k] === 1, k => map.roles[k] === 2, k => map.roles[k] === 3, k => map.roles[k] === 4 || map.roles[k] === 6, k => !!piece(k) && !piece(k).spare, k => !!piece(k)?.spare];
  const fig = el("div", { class: "parts" }, ...a.parts.map(([h, p], i) => { const c = el("canvas", { width: n * 8, height: n * 8, "aria-hidden": "true" }), x = c.getContext("2d"); for (let k = 0; k < n * n; k++) if (e.modules[k]) { x.fillStyle = is[i](k) ? "#161817" : "#dcdedb"; x.fillRect(k % n * 8, Math.floor(k / n) * 8, 8, 8); } return el("figure", {}, el("div", { class: "pp" }, c), el("figcaption", {}, el("b", {}, h), p)); }));
  $("#aboutPage").replaceChildren(el("button", { class: "close", type: "button", onclick: () => box.close() }, S.T.close), el("button", { class: "close swap", type: "button", onclick: () => { $("#lang").click(); box.close(); S.about(); } }, S.T.other), el("button", { class: "close lamp", type: "button", onclick: () => S.light() }, S.lights === "off" ? S.T.lightsOn : S.T.lightsOff), el("h2", {}, a.title), fig, el("div", { html: a.html })); box.showModal(); box.scrollTop = 0;
};
S.flicker = () => { if (still.matches) return; glc.classList.remove("die"); void glc.offsetWidth; glc.classList.add("die"); };
S.poster = (url, name, acts) => {
  const p = $("#poster"), old = $("#posterImg").src; if (old.startsWith("blob:")) URL.revokeObjectURL(old); $("#posterImg").src = url; $("#posterImg").alt = name;
  $("#posterActs").replaceChildren(...acts.map(([tx, fn]) => el("button", { class: "btn", type: "button", onclick: e => fn(e.currentTarget) }, tx)), el("button", { class: "btn", type: "button", onclick: () => p.close() }, S.T.close)); if (!p.open) p.showModal();
};
S.copy = async text => { try { await navigator.clipboard.writeText(text); S.toast(S.T.copied); } catch { const a = el("textarea", {}); a.value = text; document.body.append(a); a.select(); try { document.execCommand("copy"); S.toast(S.T.copied); } catch { prompt("", text); } a.remove(); } };
S.download = (url, name) => { const a = el("a", { href: url, download: name }); document.body.append(a); a.click(); a.remove(); };

/* ---- fingers and keys ---- */
const at = e => { const r = over.getBoundingClientRect(); return S.mode.point ? S.mode.point(e, r) : [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
over.addEventListener("pointerdown", e => { if (e.button) return; if (held !== null) return; held = e.pointerId; S.touched = performance.now(); try { over.setPointerCapture(held); } catch {} e.preventDefault(); S.hint(""); S.mode.down?.(at(e), e); });
over.addEventListener("pointermove", e => {
  if (held === null) { S.mode.hover?.(at(e), e); return; }
  if (e.pointerId !== held) return; const list = e.getCoalescedEvents?.() || []; if (S.mode.fine && list.length > 1) list.forEach(x => S.mode.move?.(at(x), e)); else S.mode.move?.(at(e), e);
});
const up = e => { if (e.pointerId !== held) return; held = null; S.touched = performance.now(); S.mode.up?.(at(e), e); }; over.addEventListener("pointerup", up); over.addEventListener("pointercancel", up);
over.addEventListener("pointerleave", e => { if (held === null) S.mode.hover?.(null, e); });
over.addEventListener("contextmenu", e => e.preventDefault());
addEventListener("pointermove", e => { if (e.pointerType === "touch") return; const x = e.clientX / innerWidth, y = e.clientY / innerHeight; S.paper.goal = [lerp(-.05, 1.05, x) * .9 + .05, lerp(-.3, .5, y)]; }, { passive: true });
addEventListener("keydown", e => { S.touched = performance.now();
  if (e.target.closest?.("input,textarea,dialog")) return; if (e.metaKey || e.ctrlKey) { if (e.key === "z" && S.mode.undo) { e.preventDefault(); S.mode.undo(); } return; }
  if (S.mode.key?.(e.key, e)) { e.preventDefault(); return; }
  if (e.key === "[" || e.key === "PageUp") { const i = ORDER.indexOf(S.mode.id); if (i > 0) S.go(ORDER[i - 1]); e.preventDefault(); }
  if (e.key === "]" || e.key === "PageDown") { const i = ORDER.indexOf(S.mode.id); if (i < ORDER.length - 1) S.go(ORDER[i + 1]); e.preventDefault(); }
});
words(); layout(); route(); requestAnimationFrame(loop);
document.fonts?.ready.then(() => { S.paint(); S.mark(); });
