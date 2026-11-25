// Draw your own home: boxes become rooms, lines become walls, taps add doors and windows; a photo can lie underneath.
import * as P from "./physics.js";
import { clone, wallRect, gapRect, mirrorEnds, addRoom, NAMES, RNX, rg } from "./plans.js";
import { toView, toPlan } from "./ink.js";

const ICON = {
  room: '<rect x="4" y="5" width="16" height="14"/>', wall: '<path d="M3 12h18M3 9.5h18M3 14.5h18"/>', door: '<path d="M5 20V5M5 5a15 15 0 0 1 14 15M5 20h14" />', win: '<path d="M3 9h18v6H3zM3 12h18"/>',
  box: '<rect x="7" y="3" width="10" height="18"/><path d="M7 10h10M10 6v2M10 13v3"/>', mirror: '<path d="M4 20 20 4M7 20l2-2M11 16l2-2M15 12l2-2"/><path d="M4 20 20 4" stroke-width="2.6"/>', photo: '<rect x="3" y="5" width="18" height="14"/><path d="m3 16 5-5 5 5 3-3 5 5"/><circle cx="16" cy="9" r="1.5"/>',
};
export function createEditor(A) {
  const { S, $, el, btn } = A, print = $("print"), box = $("tools"), file = $("file"), img = $("photo");
  let tool = "room", mat = "brick", undo = [], redo = [], ed = null, ph = null, dirty = false;
  const K = () => A.V.k, snapG = (v) => Math.round(v * 4) / 4;
  function snap([x, y]) { // to a wall that is already there, else to the 25 cm grid
    const tol = Math.max(.3, 12 / K()); let sx = null, sy = null, bx = tol, by = tol;
    for (const s of S.plan.walls) { if (s.x1 === s.x2) { const d = Math.abs(s.x1 - x); if (d < bx) { bx = d; sx = s.x1; } } else { const d = Math.abs(s.y1 - y); if (d < by) { by = d; sy = s.y1; } for (const e of [s.x1, s.x2]) if (Math.abs(e - x) < bx * .8) { bx = Math.abs(e - x); sx = e; } } if (s.x1 === s.x2) for (const e of [s.y1, s.y2]) if (Math.abs(e - y) < by * .8) { by = Math.abs(e - y); sy = e; } }
    const c = (v, m) => Math.max(.5, Math.min(m - .5, v)); return [c(sx ?? snapG(x), P.W), c(sy ?? snapG(y), P.H)];
  }
  const push = () => { undo.push(clone(S.plan)); redo = []; if (undo.length > 60) undo.shift(); };
  function changed(light) { dirty = true; S.planId = "custom"; S.answer = null; if (!light) { A.applyPlan(); } A.ink(); ui(); A.saveHash(); }
  function restore(a, b) { if (!a.length) return; b.push(clone(S.plan)); S.plan = a.pop(); S.sel = null; P.setSize(S.plan.size || 1); changed(); A.layout(); }

  // ---- what is under the finger
  function hit(p) {
    const tol = Math.max(.1, 15 / K()), inR = ([a, b, c, d], m) => p[0] > a - m && p[0] < c + m && p[1] > b - m && p[1] < d + m;
    for (const m of S.plan.mirrors) { const [a, b] = mirrorEnds(m), L = Math.hypot(b[0] - a[0], b[1] - a[1]), u = Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / L / L)); if (Math.hypot(p[0] - a[0] - u * (b[0] - a[0]), p[1] - a[1] - u * (b[1] - a[1])) < tol) return { kind: "mirror", it: m }; }
    for (const b of S.plan.boxes) if (inR(b, 4 / K())) return { kind: "box", it: b };
    let best = null, bd = 1e9; for (const f of S.plan.feats) { const g = gapRect(f, .05), d = Math.hypot(Math.max(g[0] - p[0], 0, p[0] - g[2]), Math.max(g[1] - p[1], 0, p[1] - g[3])); if (d < tol && d < bd) { bd = d; best = { kind: "feat", it: f }; } } if (best) return best;
    for (const s of S.plan.walls) { const g = wallRect(s), d = Math.hypot(Math.max(g[0] - p[0], 0, p[0] - g[2]), Math.max(g[1] - p[1], 0, p[1] - g[3])); if (d < tol && d < bd) { bd = d; best = { kind: "wall", it: s }; } } return best;
  }
  const wallAt = (p) => { const tol = Math.max(.16, 20 / K()); let b = null, bd = tol; for (const s of S.plan.walls) { const g = wallRect(s), d = Math.hypot(Math.max(g[0] - p[0], 0, p[0] - g[2]), Math.max(g[1] - p[1], 0, p[1] - g[3])); if (d < bd) { bd = d; b = s; } } return b; };
  const onWall = (d, s) => { const [a, b, c, e] = wallRect(s), h = s.y1 === s.y2; return (d.o === "h") === h && d.x > a - .05 && d.x < c + .05 && d.y > b - .05 && d.y < e + .05; };
  const roomAt = (p) => { const G = rg(), i = S.map && S.map[Math.floor(p[1] / G) * RNX + Math.floor(p[0] / G)]; return i >= 0 ? S.rooms[i] : null; };

  // ---- gestures
  function down(e, p) {
    if (tool === "photo" && ph) { ed = { id: e.pointerId, what: "photo", p, o: [ph.x, ph.y] }; return; }
    const h = hit(p), s = S.sel, same = h && s && h.it === s.it; ed = { id: e.pointerId, p, q: p, x: e.clientX, y: e.clientY, moved: false, hit: h, what: null };
    if (h && (h.kind === "box" || h.kind === "mirror" || same)) ed.what = h.kind; // things can be dragged at once, walls and doors once selected
  }
  function move(e, p) {
    if (!ed || e.pointerId !== ed.id) return; ed.q = p; if (ed.what === "photo") { ph.x = ed.o[0] + p[0] - ed.p[0]; ph.y = ed.o[1] + p[1] - ed.p[1]; return place(); }
    if (!ed.moved && Math.hypot(e.clientX - ed.x, e.clientY - ed.y) > 8) { ed.moved = true; if (ed.what) { push(); ed.o = JSON.parse(JSON.stringify(ed.hit.it)); ed.f = ed.what === "wall" ? S.plan.feats.filter((f) => onWall(f, ed.hit.it)).map((f) => ({ f, x: f.x, y: f.y })) : []; S.sel = ed.hit; } else S.sel = null; }
    if (!ed.moved) return; const dx = p[0] - ed.p[0], dy = p[1] - ed.p[1], it = ed.hit && ed.hit.it, o = ed.o;
    if (ed.what === "box") { const w = o[2] - o[0], hh = o[3] - o[1], x = Math.max(.3, Math.min(P.W - .3 - w, o[0] + dx)), y = Math.max(.3, Math.min(P.H - .3 - hh, o[1] + dy)); it[0] = x; it[1] = y; it[2] = x + w; it[3] = y + hh; A.ink(); }
    else if (ed.what === "mirror") { it[0] = Math.max(.3, Math.min(P.W - .3, o[0] + dx)); it[1] = Math.max(.3, Math.min(P.H - .3, o[1] + dy)); A.ink(); }
    else if (ed.what === "wall") { const hz = o.y1 === o.y2, c = snap(hz ? [p[0], o.y1 + dy] : [o.x1 + dx, p[1]]); if (hz) it.y1 = it.y2 = snapG(c[1]); else it.x1 = it.x2 = snapG(c[0]); for (const g of ed.f) { if (hz) g.f.y = it.y1; else g.f.x = it.x1; } A.ink(); }
    else if (ed.what === "feat") { const s = S.plan.walls.find((w) => onWall({ ...it, x: o.x, y: o.y }, w)); if (s) { const hz = it.o === "h", a = hz ? Math.min(s.x1, s.x2) : Math.min(s.y1, s.y2), b = hz ? Math.max(s.x1, s.x2) : Math.max(s.y1, s.y2), c = Math.max(a + it.w / 2 + .05, Math.min(b - it.w / 2 - .05, (hz ? o.x + dx : o.y + dy))); if (hz) it.x = Math.round(c * 20) / 20; else it.y = Math.round(c * 20) / 20; A.ink(); } }
    else if (tool === "room" || tool === "wall") A.ink(preview());
  }
  function preview() { const pl = clone(S.plan), a = snap(ed.p), b = snap(ed.q); if (tool === "room") addRoom(pl, mat, ...a, ...b); else { const w = line(); pl.walls.push(w); } return pl; }
  function line() { const a = snap(ed.p), b = snap(ed.q), hz = Math.abs(ed.q[0] - ed.p[0]) >= Math.abs(ed.q[1] - ed.p[1]); return { m: mat, x1: a[0], y1: a[1], x2: hz ? b[0] : a[0], y2: hz ? a[1] : b[1] }; }
  function up(e, p) {
    if (!ed || e.pointerId !== ed.id) return; const E = ed; E.q = p; if (E.what === "photo") { ed = null; return; } if (e.type === "pointercancel") { ed = null; A.ink(); return; }
    if (E.moved && E.what) { ed = null; tidy(); return changed(); }
    if (E.moved) { if (tool === "room") { const a = snap(E.p), b = snap(E.q); ed = null; if (Math.abs(a[0] - b[0]) < .7 || Math.abs(a[1] - b[1]) < .7) return A.ink(); push(); if (!addRoom(S.plan, mat, ...a, ...b)) undo.pop(); return changed(); }
      if (tool === "wall") { const w = line(); ed = null; if (Math.hypot(w.x2 - w.x1, w.y2 - w.y1) < .3) return A.ink(); push(); S.plan.walls.push(w); return changed(); } ed = null; return; }
    ed = null; tap(p, E.hit);
  }
  function tap(p, h) {
    if ((tool === "door" || tool === "win") && (!h || h.kind === "wall")) { const s = wallAt(p); if (s) { const hz = s.y1 === s.y2, a = hz ? Math.min(s.x1, s.x2) : Math.min(s.y1, s.y2), b = hz ? Math.max(s.x1, s.x2) : Math.max(s.y1, s.y2), w = tool === "door" ? Math.min(.85, b - a - .2) : Math.min(1.4, b - a - .3); if (w > .4) { push(); const c = Math.max(a + w / 2 + .08, Math.min(b - w / 2 - .08, hz ? p[0] : p[1])), r = Math.round(c * 20) / 20, f = { k: tool, o: hz ? "h" : "v", x: hz ? r : s.x1, y: hz ? s.y1 : r, w, open: tool === "door" ? 1 : 0, h: 1, s: 1 }; S.plan.feats.push(f); S.sel = { kind: "feat", it: f }; return changed(); } } }
    if (tool === "box" && (!h || h.kind === "wall")) { push(); const x = Math.max(.4, Math.min(P.W - 1.05, p[0] - .32)), y = Math.max(.4, Math.min(P.H - 1.05, p[1] - .32)), b = [x, y, x + .65, y + .65, "fridge"]; S.plan.boxes.push(b); S.sel = { kind: "box", it: b }; return changed(); }
    if (tool === "mirror" && (!h || h.kind === "wall")) { push(); const s = wallAt(p), m = [Math.round(p[0] * 20) / 20, Math.round(p[1] * 20) / 20, 1.2, s ? (s.y1 === s.y2 ? 0 : 90) : 0]; if (s) { const t = P.WALLS[s.m].t / 2 + .03; if (s.y1 === s.y2) m[1] = s.y1 + (p[1] < s.y1 ? -t : t); else m[0] = s.x1 + (p[0] < s.x1 ? -t : t); } S.plan.mirrors.push(m); S.sel = { kind: "mirror", it: m }; return changed(); }
    if (h) S.sel = h; else { const r = roomAt(p); S.sel = r ? { kind: "room", it: r, at: p } : null; } A.ink(); ui();
  }
  function tidy() { S.plan.feats = S.plan.feats.filter((f) => S.plan.walls.some((w) => onWall(f, w))); }
  function remove() { const s = S.sel; if (!s) return; push(); if (s.kind === "wall") { S.plan.walls = S.plan.walls.filter((x) => x !== s.it); tidy(); } if (s.kind === "feat") S.plan.feats = S.plan.feats.filter((x) => x !== s.it); if (s.kind === "box") S.plan.boxes = S.plan.boxes.filter((x) => x !== s.it); if (s.kind === "mirror") S.plan.mirrors = S.plan.mirrors.filter((x) => x !== s.it); S.sel = null; changed(); }

  // ---- the tray
  function chip(label, on, fn, cls) { const b = btn(cls || "", label, fn); if (on != null) b.setAttribute("aria-pressed", on); return b; }
  function ui() {
    if (S.mode !== "edit") return; const t = A.t; box.innerHTML = ""; const tabs = el("div", "tabs");
    for (const k of Object.keys(ICON)) { const b = btn("", "", () => { tool = k; S.sel = null; if (k === "photo" && !ph) file.click(); print.classList.toggle("tracing", !!ph); A.ink(); ui(); place(); }); b.dataset.t = k; b.setAttribute("aria-pressed", tool === k); b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg><span>${t.tools[k]}</span>`; tabs.append(b); } tabs.append(el("span", "void")); box.append(tabs);
    const s = S.sel, hint = el("p", "hint"), chips = el("div", "chips"); hint.id = "ehint";
    if (s) {
      hint.textContent = t.eSel[s.kind === "feat" && s.it.k === "win" ? "win" : s.kind];
      if (s.kind === "wall") for (const m of ["drywall", "brick", "concrete", "glass", "metal"]) chips.append(chip(t.mats[m], s.it.m === m, () => { push(); s.it.m = m; mat = m; changed(); }));
      if (s.kind === "feat" && s.it.k === "door") { chips.append(chip(s.it.open ? t.shut : t.open, null, () => { push(); s.it.open = s.it.open ? 0 : 1; changed(); }), chip(t.flip, null, () => { push(); const n = (s.it.h > 0 ? 0 : 1) + (s.it.s > 0 ? 0 : 2), m = (n + 1) % 4; s.it.h = m & 1 ? -1 : 1; s.it.s = m & 2 ? -1 : 1; changed(); }), chip(t.mats.metal, s.it.m === "metal", () => { push(); s.it.m = s.it.m === "metal" ? undefined : "metal"; changed(); })); }
      if (s.kind === "mirror") chips.append(chip(t.turn, null, () => { push(); s.it[3] = (s.it[3] + 45) % 180; changed(); }));
      if (s.kind === "room") { for (const n of NAMES) if (n !== "bath2") chips.append(chip(t.rooms[n], s.it.key === n, () => { push(); const at = s.it.at; S.plan.labels = S.plan.labels.filter((l) => { const r = roomAt([l[1], l[2]]); return !(r && r.index === s.it.index); }); S.plan.labels.push([n, Math.round(at[0] * 20) / 20, Math.round(at[1] * 20) / 20]); changed(); const r = roomAt(at); S.sel = r ? { kind: "room", it: r } : null; ui(); })); }
      else chips.append(chip(t.del, null, remove, "del"));
    } else if (tool === "photo") {
      hint.textContent = ph ? t.photoFit : t.photoPick + ". " + t.photoNote; if (A.t === undefined) return;
      if (ph) { const l = el("label", "", t.photoSize), r = el("input"); r.type = "range"; r.min = 0; r.max = 1000; r.value = 1000 * Math.log(ph.w / 2) / Math.log(30); r.oninput = () => { zoomPhoto(2 * 30 ** (r.value / 1000)); }; l.append(r); box.append(hint, l); chips.append(chip(t.photoTurn, null, () => { ph.rot += 90; place(); }), chip(t.photoOff, null, () => { dropPhoto(); ui(); }, "del")); } else { chips.append(chip(t.photoPick, null, () => file.click())); }
    } else { hint.textContent = t.eHint[tool]; if (tool === "room" || tool === "wall") for (const m of ["drywall", "brick", "concrete", "glass"]) chips.append(chip(t.mats[m], mat === m, () => { mat = m; ui(); })); if (tool === "room") chips.append(chip(S.plan.size > 1 ? t.larger("14 × 9.6") : t.larger("11.2 × 7.7"), null, () => { push(); S.plan.size = S.plan.size > 1 ? 1 : P.LARGE; P.setSize(S.plan.size); S.view = A.whole(); clampAll(); changed(); A.layout(); }), chip(t.clear, null, () => { push(); S.plan = clone({ walls: [], feats: [], boxes: [], mirrors: [], labels: [], size: S.plan.size }); S.sel = null; changed(); }, "del")); }
    if (!hint.parentNode) box.append(hint); box.append(chips); const row = el("div", "row"), U = btn("line", t.undo, () => restore(undo, redo), "undo"), Q = btn("line", t.redo, () => restore(redo, undo), "redo"), D = btn("solid", t.done, () => close()); U.disabled = !undo.length; U.style.opacity = undo.length ? 1 : .45; D.id = "done"; D.style.flex = 1; Q.hidden = !redo.length; row.append(U, Q, D); box.append(row);
  }
  function clampAll() { const c = (v, m) => Math.max(.4, Math.min(m - .4, v)); for (const s of S.plan.walls) { s.x1 = c(s.x1, P.W); s.x2 = c(s.x2, P.W); s.y1 = c(s.y1, P.H); s.y2 = c(s.y2, P.H); } S.plan.walls = S.plan.walls.filter((s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > .2); tidy(); S.router = [c(S.router[0], P.W), c(S.router[1], P.H)]; S.phone = [c(S.phone[0], P.W), c(S.phone[1], P.H)]; }
  function open(blank) { if (S.searching) return; S.mode = "edit"; undo = []; redo = []; dirty = false; S.sel = null; S.answer = null; tool = "room"; if (blank) { S.plan = clone({ walls: [], feats: [], boxes: [], mirrors: [], labels: [], size: 1 }); P.setSize(1); S.planId = "custom"; A.applyPlan(true); } print.classList.add("drawing"); document.body.classList.add("editing", "quiet"); S.touched = true; A.words(); A.layout(); ui(); scrollTo({ top: 0 }); }
  function close(silent) {
    S.mode = "play"; S.sel = null; ed = null; print.classList.remove("drawing", "tracing"); img.hidden = true; document.body.classList.remove("editing"); box.hidden = true; S.view = A.whole(); if (silent) return;
    if (!S.plan.walls.length) { if (S.mineId) A.saveMine(); A.loadPlan("onebed"); return; } if (dirty && !S.mineId) S.mineId = Date.now().toString(36); S.moves = 0; S.did = S.allOk = false; A.applyPlan(true); // the router and the phone must stand inside
    const inside = (p) => { const r = roomAt(p); return r; }; if (S.rooms.length) { if (!inside(S.router)) S.router = [...S.rooms[0].at]; const far = [...S.rooms].sort((a, b) => Math.hypot(b.at[0] - S.router[0], b.at[1] - S.router[1]) - Math.hypot(a.at[0] - S.router[0], a.at[1] - S.router[1]))[0]; if (!inside(S.phone)) S.phone = [far.at[0] + .5, far.at[1] + .4]; if (!inside(S.phone)) S.phone = [...far.at]; }
    A.applyPlan(true); A.words(); A.layout(); A.saveHash(); if (A.portrait) scrollTo({ top: 0 });
  }
  function key(e) { if (e.key === "Escape") { S.sel ? (S.sel = null, A.ink(), ui()) : close(); } else if ((e.key === "Delete" || e.key === "Backspace") && S.sel) { e.preventDefault(); remove(); } else if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); e.shiftKey ? restore(redo, undo) : restore(undo, redo); }
    else if (S.sel && /^Arrow/.test(e.key) && (S.sel.kind === "box" || S.sel.kind === "mirror")) { e.preventDefault(); push(); const d = { ArrowLeft: [-.05, 0], ArrowRight: [.05, 0], ArrowUp: [0, -.05], ArrowDown: [0, .05] }[e.key], v = A.portrait ? [d[1], -d[0]] : d, it = S.sel.it; it[0] += v[0]; it[1] += v[1]; if (S.sel.kind === "box") { it[2] += v[0]; it[3] += v[1]; } changed(); } }

  // ---- the photo underneath (stays in this page's memory, nowhere else)
  file.addEventListener("change", () => { const f = file.files[0]; file.value = ""; if (!f || !/^image\//.test(f.type)) return; usePhoto(URL.createObjectURL(f)); });
  function usePhoto(url) { dropPhoto(); img.onload = () => { const wide = A.portrait ? P.H : P.W; ph = { url, nw: img.naturalWidth, nh: img.naturalHeight, x: P.W / 2, y: P.H / 2, rot: A.portrait ? -90 : 0, w: 0 }; ph.w = Math.min(wide * .92, (A.portrait ? P.W : P.H) * .92 * ph.nw / ph.nh); tool = "photo"; S.sel = null; A.ink(); img.hidden = false; print.classList.add("tracing"); place(); ui(); }; img.onerror = () => { ph = null; img.hidden = true; ui(); }; img.src = url; }
  function dropPhoto() { if (ph) URL.revokeObjectURL(ph.url); ph = null; img.hidden = true; img.removeAttribute("src"); print.classList.remove("tracing"); $("pencil").innerHTML = ""; }
  function zoomPhoto(w, at) { const nw = Math.max(2, Math.min(60, w)); if (at) { ph.x = at[0] + (ph.x - at[0]) * nw / ph.w; ph.y = at[1] + (ph.y - at[1]) * nw / ph.w; } ph.w = nw; place(); }
  const photoPinch = () => S.mode === "edit" && tool === "photo" && ph ? { w: ph.w } : null;
  const photoZoom = (s, k, at) => zoomPhoto(s.w * k, at);
  function place() {
    if (S.mode !== "edit") return; img.hidden = !ph; print.classList.toggle("tracing", !!ph); const V = A.V;
    if (ph) { const [x, y] = toView(ph.x, ph.y, V), s = ph.w * V.k / ph.nw; img.style.transform = `translate(${x}px,${y}px) rotate(${ph.rot + (A.portrait ? 90 : 0)}deg) scale(${s}) translate(-50%,-50%)`; }
    const v = $("pencil"); if (ph && tool === "photo") { const w = .9 * V.k, X = A.box.w / 2 - w / 2, Y = A.box.h * .5; v.innerHTML = `<path d="M${X} ${Y}h${w}M${X} ${Y - 8}v16M${X + w} ${Y - 8}v16" stroke-width="3"/><text x="${X + w / 2}" y="${Y - 14}" text-anchor="middle" fill="#f0483c" style="font:15px var(--f);paint-order:stroke;stroke:#fff;stroke-width:5px">90 cm</text>`; } else v.innerHTML = "";
  }
  const m1 = (v) => v.toFixed(1), unit = () => (document.documentElement.lang.startsWith("zh") ? " 米" : " m");
  function sizes() { // what is being drawn, and what is selected, in metres
    const L = []; if (ed && ed.moved && !ed.what && (tool === "room" || tool === "wall")) { const a = snap(ed.p), b = snap(ed.q); if (tool === "room") L.push({ x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, text: A.portrait ? `${m1(Math.abs(a[1] - b[1]))} × ${m1(Math.abs(a[0] - b[0]))}${unit()}` : `${m1(Math.abs(a[0] - b[0]))} × ${m1(Math.abs(a[1] - b[1]))}${unit()}` }); else { const w = line(); L.push({ x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2, text: m1(Math.hypot(w.x2 - w.x1, w.y2 - w.y1)) + unit() }); } }
    else if (S.sel && S.sel.kind === "wall") { const w = S.sel.it; L.push({ x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2, red: 1, text: m1(Math.hypot(w.x2 - w.x1, w.y2 - w.y1)) + unit() }); }
    else if (S.sel && S.sel.kind === "room") { const r = S.sel.it, xs = r.cells.map((c) => c % RNX), ys = r.cells.map((c) => Math.floor(c / RNX)), w = (Math.max(...xs) - Math.min(...xs) + 1) * rg() + .1, h = (Math.max(...ys) - Math.min(...ys) + 1) * rg() + .1; L.push({ x: r.at[0], y: r.at[1] + (A.portrait ? 0 : .5), text: (A.portrait ? `${m1(h)} × ${m1(w)}` : `${m1(w)} × ${m1(h)}`) + unit() }); if (A.portrait) L[L.length - 1].x += .5; }
    return L;
  }
  function ghost(g, v, dpr) { if (S.plan.walls.length || (ed && ed.moved) || ph) return; const [x1, y1] = toView(1.4, 1.4, v), [x2, y2] = toView(5.6, 5.0, v); g.strokeStyle = "rgba(243,245,243,.6)"; g.lineWidth = 1.2 * dpr; g.setLineDash([7 * dpr, 6 * dpr]); g.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); g.setLineDash([]); g.fillStyle = "#f3f5f3"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `${15 * dpr}px ${A.font}`; g.fillText(A.t.sample, (x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) * 1.5); }
  return { sizes, ghost, words: ui, open, close, down, move, up, key, place, cancel: () => { if (ed) { ed = null; A.ink(); } }, photoPinch, photoZoom, usePhoto, get state() { return { tool, mat, undo: undo.length, ph }; }, setTool: (k) => { tool = k; ui(); } };
}
