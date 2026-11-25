import { el, store, vib, clamp } from "./util.js";
import { encode, mapOf, LEVELS, MAX_VERSION } from "./core.js";
import { decodeImage, decodeGrid, sample, threshold } from "./decode.js";
import { Print, QUIET, quant, packOps, unpackOps, strPack, strUnpack, SCRATCH_W } from "./damage.js";
import { GREEN, line, bracket, hatch, cellAt } from "./draw.js";
import { poster } from "./poster.js";
import { play } from "./sound.js";

const ICON = {
  s: '<circle cx="13" cy="13" r="8.5"/><circle cx="13" cy="13" r="5.6"/>', d: '<path d="M16.5 4.5 21.5 9.5 17 11 12.5 15.5 11 21 5 15 10.5 13.5 15 9z M8 18 4 22"/>',
  b: '<path d="M13 22c4 0 6-2.600 6-5.800 0-4.700-4.500-6-4-12.200-4 2-5.500 5.200-5 8-1-.4-1.700-1.300-2-2.500C6.700 11 6 13 6 15.600 6 19.600 9 22 13 22z"/>',
  c: '<path d="M6 10h12v5c0 3.500-2.500 6-6 6s-6-2.500-6-6z M18 11.500h1.500a2.500 2.500 0 0 1 0 5H17.700 M10 4c-1 1.500 1 2 0 3.600 M14 4c-1 1.500 1 2 0 3.600"/>',
  l: '<path d="M21.500 13a8.500 8.500 0 1 1-8.500-8.500L21.500 13z M13 4.500c0 5 3 8.500 8.500 8.500"/>', x: '<path d="M4 20 14 10 M14 10 20.500 3.500 22.500 5.500c-1 4-3.500 6.500-6.500 7z"/>' };
export class Ruin {
  id = "ruin"; fine = true;
  constructor(S) {
    this.S = S; this.ops = []; this.text = null; this.level = "H"; this.tool = "s"; this.showMarks = true; this.open = false; this.game = null; this.img = null; this.from = null;
    this.probe = new Print("probe", document.createElement("canvas")); this.fade = 1; this.ev = null;
  }
  get T() { return this.S.T.ruin; }
  get defText() { return this.T.def; }
  ghost() { return this.free || this.ops.length ? null : [[.36, .5], [.62, .44], [.38, .54], [.64, .5], [.4, .6]]; }
  enter(q) {
    this.free = true;
    if (q?.get?.("t") || q?.get?.("o")) {
      try { if (q.get("t")) this.text = strUnpack(q.get("t")); if (LEVELS.includes(q.get("l"))) this.level = q.get("l"); this.ops = q.get("o") ? unpackOps(q.get("o")) : []; if (!encode(this.text ?? this.defText, this.level, { byte: true })) throw 0; this.shared = this.ops.length > 0 && q.get("from") === "1"; }
      catch { this.text = null; this.level = "H"; this.ops = []; this.S.toast(this.T.linkBad); }
    } else if (q?.text) { this.text = q.text; this.level = q.level || "Q"; this.ops = []; this.from = "make"; this.free = true; }
    this.make(); this.words();
  }
  leave() { this.burning = null; this.cut = null; this.dot = null; }
  hash() { return "m=ruin" + (this.text !== null && this.text !== this.defText ? "&t=" + strPack(this.text) : this.ops.length ? "&t=" + strPack(this.code.text) : "") + (this.level !== "H" ? "&l=" + this.level : "") + (this.ops.length ? "&o=" + packOps(this.ops) : ""); }
  make() { // print a fresh copy and redo the damage on it
    this.code = encode(this.text || this.defText, this.level, { byte: true }); this.map = mapOf(this.code); const S = this.S, n = this.code.n;
    const mpx = Math.max(6, Math.floor(S.px / (n + 2 * QUIET))); this.look = new Print("look", S.look); this.look.setCode(this.code, mpx); this.probe.setCode(this.code, n > 41 ? 7 : 8);
    this.ops.forEach(o => { if (o.logo) o.img = this.img; }); this.look.replay(this.ops); this.probe.replay(this.ops); S.paper.dirtyTex = S.paper.dirty = true; this.check(true);
  }
  resize() { this.make(); }
  /* ---- the reader ---- */
  check(quiet = false) {
    const p = this.probe, W = p.canvas.width, g = p.gray(), n = this.code.n, T = Math.min(150, Math.max(60, threshold(g))), r = decodeImage(g, W, W, T), bits = sample(g, W, W, T, [p.mpx, 0, QUIET * p.mpx, 0, p.mpx, QUIET * p.mpx, 0, 0, 1], n);
    const wrong = []; bits.forEach((b, i) => { if (b !== this.code.modules[i]) wrong.push(i); });
    const bad = new Set(); wrong.forEach(i => { const k = this.map.pieceAt[i]; if (k >= 0) bad.add(k); });
    const used = this.code.lay.blocks.map(() => 0); bad.forEach(k => used[this.map.pieces[k].block]++);
    const ideal = decodeGrid(bits, n), alive = r.stage === "ok" && r.text === this.code.text, inside = ideal.stage === "ok" && ideal.text === this.code.text, t = this.code.lay.t;
    let cause = ""; if (!alive) { const over = used.some(u => u > t), lab = ideal.fmt && (ideal.fmt.level !== this.code.level || ideal.fmt.mask !== this.code.mask || ideal.stage === "format"), lost = r.stage === "find"; cause = inside ? "corners" : over ? (lost ? "both" : "pieces") : lab ? "label" : "corners"; }
    const was = this.ev; this.ev = { r, wrong, bad, used, alive, inside, cause, t, set: new Set(wrong), finders: (r.three || r.finders || []).map(f => [(f.x + .5) / W, (f.y + .5) / W, f.u / W]) };
    if (this.ev.cause !== "corners") this.assist = false;
    if (was && was.alive && !alive && !quiet) { this.deadAt = performance.now(); this.S.flicker(); play.dead(); vib([30, 40, 80]); this.onDeath(was); }
    else if (was && !quiet && alive && bad.size > was.bad.size) play.patch(Math.max(0, 1 - Math.max(...used) / t));
    if (was && !was.alive && alive) this.deadAt = 0;
    if (alive && wrong.length) { const best = store.get("live", 0); if (this.game === "most" && wrong.length > best) store.set("live", wrong.length); if (this.game === "most") this.most = Math.max(this.most || 0, wrong.length); }
    this.S.mark(); this.render();
  }
  onDeath() {
    if (!this.free) { this.free = true; this.firstKill = { n: this.ev.wrong.length, p: Math.round(this.ev.wrong.length / this.code.n ** 2 * 100), cause: this.ev.cause }; this.S.tick(); this.wonNow = true; setTimeout(() => this.S.mode === this && this.build()); } else if (this.game) this.S.tick();
    if (this.game === "few" && this.ev.cause !== "corners") { const n = this.ev.wrong.length, b = store.get("kill", 0); if (!b || n < b) store.set("kill", n); }
    this.S.finish("ruin");
  }
  changed() { this.look.canvas && (this.S.paper.dirtyTex = this.S.paper.dirty = true); this.due = this.due || performance.now() + 50; }
  add(op) { this.shared = false; this.ops.push(op); this.look.apply(op); this.probe.apply(op); this.changed(); this.S.save(); }
  grow(op, from) { this.look.apply(op, from); this.probe.apply(op, from); this.changed(); }
  undo() { if (!this.ops.length) return; this.ops.pop(); this.make(); this.S.save(); play.dot(); }
  fresh() { this.ops = []; this.most = 0; this.shared = false; this.assist = false; this.make(); this.S.save(); this.wonNow = false; play.stick(); }
  tick(dt, now) {
    if (this.burning && now - (this.burnAt || 0) > 60) { this.burnAt = now; const o = this.burning, p = o.p[o.p.length - 1]; if (p[2] < .034) { o.p.push([p[0], p[1], quant(Math.min(.034, p[2] + .003))]); this.grow(o, o.p.length - 1); } play.crackle(); }
    if (this.due && now > this.due) { this.due = 0; this.check(); }
    if (this.deadAt && now - this.deadAt < 700) this.S.mark();
    return false;
  }
  /* ---- fingers ---- */
  down(p, e) {
    document.body.classList.add("touched");
    const seed = Math.floor(Math.random() * 65535), [x, y] = [quant(clamp(p[0], -.1, 1.1)), quant(clamp(p[1], -.1, 1.1))], t = this.tool;
    if (t === "s") { this.op = { k: "s", seed, p: [[x, y]] }; this.add(this.op); }
    if (t === "b") { this.burning = { k: "b", seed, p: [[x, y, quant(.007)]] }; this.add(this.burning); play.strike(); }
    if (t === "c") { this.add({ k: "c", seed, x, y, r: quant(.085 + Math.random() * .05) }); play.splash(); }
    if (t === "l") { this.stick = { k: "l", x, y, r: quant(this.img ? .1 : .07), logo: !!this.img, img: this.img }; this.S.mark(); }
    if (t === "x") { this.cut = { k: "x", x1: x, y1: y, x2: x, y2: y }; }
    if (t === "d") this.pin(p);
  }
  pin(p) {
    const n = this.code.n, [i, j, c] = cellAt(p, n); if (c < 0) return;
    if (this.game === "few" && this.map.roles[c] === 1) { this.S.toast(this.T.off); return; }
    const k = n + 2 * QUIET, same = this.ops.findIndex(o => o.k === "d" && Math.floor(o.x * k) - QUIET === i && Math.floor(o.y * k) - QUIET === j); play.dot();
    if (same >= 0) { this.ops.splice(same, 1); this.make(); this.S.save(); return; }
    this.add({ k: "d", x: quant((i + QUIET + .5) / k), y: quant((j + QUIET + .5) / k) });
  }
  move(p) {
    const x = quant(clamp(p[0], -.1, 1.1)), y = quant(clamp(p[1], -.1, 1.1)); this.at = [x, y];
    if (this.op) { const a = this.op.p[this.op.p.length - 1], d = Math.hypot(x - a[0], y - a[1]); if (d > .003) { const from = this.op.p.length, k = Math.ceil(d / .1); for (let i = 1; i <= k; i++) this.op.p.push([quant(a[0] + (x - a[0]) * i / k), quant(a[1] + (y - a[1]) * i / k)]); this.grow(this.op, from); if (performance.now() - (this.sn || 0) > 45) { this.sn = performance.now(); play.scratch(Math.min(1, d * 20)); } } }
    if (this.burning) { const a = this.burning.p[this.burning.p.length - 1]; if (Math.hypot(x - a[0], y - a[1]) > .012) { this.burning.p.push([x, y, quant(.009)]); this.grow(this.burning, this.burning.p.length - 1); } }
    if (this.stick) { const d = Math.hypot(x - this.stick.x, y - this.stick.y); if (d > .03) this.stick.r = quant(clamp(d, .03, .42)); this.S.mark(); }
    if (this.cut) { this.cut.x2 = x; this.cut.y2 = y; this.S.mark(); }
  }
  up() {
    if (this.stick) { const o = this.stick; this.stick = null; this.add(o); play.stick(); }
    if (this.cut) { const o = this.cut; this.cut = null; if (Math.hypot(o.x2 - o.x1, o.y2 - o.y1) > .06) { const dx = o.x2 - o.x1, dy = o.y2 - o.y1; Object.assign(o, { x1: quant(clamp(o.x1 - dx * 0, -.9, 1.9)), x2: quant(clamp(o.x1 + dx, -.9, 1.9)) }); this.add(o); play.cut(); } this.S.mark(); }
    this.op = this.burning = null; this.S.save(); this.due = this.due || performance.now();
    
  }
  hover(p) { const on = p && (this.tool === "s" || this.tool === "d") && p[0] > 0 && p[0] < 1 && p[1] > 0 && p[1] < 1; this.dot = on ? p : null; this.S.mark(); }
  key(k) {
    const i = "123456".indexOf(k); if (i >= 0 && k) { this.pick("sdbclx"[i]); return true; }
    if (k === "u" || k === "Backspace") { this.undo(); return true; } if (k === "n") { this.fresh(); return true; }
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k], u = 1 / (this.code.n + 2 * QUIET);
    if (step && document.activeElement === this.S.over) { const d = this.dot || [(QUIET + .5) * u, (QUIET + .5) * u]; this.dot = [clamp(d[0] + step[0] * u, u / 2, 1 - u / 2), clamp(d[1] + step[1] * u, u / 2, 1 - u / 2)]; this.S.mark(); return true; }
    if ((k === " " || k === "Enter") && document.activeElement === this.S.over && this.dot) { const p = this.dot; this.S.hint(""); if (this.tool === "x") return true; this.down(p); this.up(p); this.dot = p; return true; }
    return false;
  }
  /* ---- the reader's marks ---- */
  marks(c) { this.paintMarks(c, true); }
  paintMarks(c, live) {
    const { code, map, ev } = this, n = code.n, u = 1 / (n + 2 * QUIET), w = 1 / this.S.size; if (!ev) return;
    const ok = ev.alive || this.assist;
    if (this.showMarks) {
      for (const i of ev.wrong) { const role = map.roles[i], x = (i % n + QUIET) * u, y = (Math.floor(i / n) + QUIET) * u; if (role === 1) continue;
        if (ok) { if (code.modules[i]) { c.fillStyle = GREEN; c.globalAlpha = role ? .45 : 1; c.fillRect(x + u * .1, y + u * .1, u * .8, u * .8); } else { c.strokeStyle = "#2be39a"; c.globalAlpha = role ? .45 : 1; c.lineWidth = u * .13; c.strokeRect(x + u * .2, y + u * .2, u * .6, u * .6); } c.globalAlpha = 1; }
        else hatch(c, x, y, u, code.modules[i] ? "rgba(22,24,23,.34)" : "rgba(247,247,243,.42)", u * .045);
      }
      const f = ev.r.three ? ev.r.three : null; // where it thinks the corners are
      if (f) ev.finders.forEach(([x, y, m]) => bracket(c, x, y, m * 4.6, GREEN, Math.max(w * 1.5, .0016), 0, .3));
      if (live && this.deadAt) { const k = clamp((performance.now() - this.deadAt) / 650); if (k < 1) { c.strokeStyle = "rgba(22,24,23," + (1 - k) * .7 + ")"; c.lineWidth = .004; c.strokeRect(-.0 + .02 - k * .06, .02 - k * .06, .96 + k * .12, .96 + k * .12); } }
    }
    if (!live) return;
    if (this.stick) { const o = this.stick; c.save(); c.fillStyle = "rgba(251,251,248,.92)"; c.strokeStyle = "rgba(22,24,23,.5)"; c.lineWidth = w; c.beginPath(); if (o.logo) c.rect(o.x - o.r, o.y - o.r, 2 * o.r, 2 * o.r); else c.arc(o.x, o.y, o.r, 0, 7); c.fill(); c.stroke(); if (o.logo && o.img) { const s = o.r * 1.76, k = Math.min(s / o.img.width, s / o.img.height); c.drawImage(o.img, o.x - o.img.width * k / 2, o.y - o.img.height * k / 2, o.img.width * k, o.img.height * k); } c.restore(); }
    if (this.cut) { const o = this.cut, dx = o.x2 - o.x1, dy = o.y2 - o.y1, L = Math.hypot(dx, dy) || 1; c.setLineDash([.012, .009]); line(c, [[o.x1 - dx / L * 2, o.y1 - dy / L * 2], [o.x2 + dx / L * 2, o.y2 + dy / L * 2]], GREEN, w * 1.5); c.setLineDash([]); }
    if (this.dot) { c.strokeStyle = "rgba(22,24,23,.75)"; c.lineWidth = w * 1.2; if (this.tool === "d") { const [i, j, k] = cellAt(this.dot, n); if (k >= 0) c.strokeRect((i + QUIET) * u, (j + QUIET) * u, u, u); } else { c.beginPath(); c.arc(this.dot[0], this.dot[1], SCRATCH_W * .9, 0, 7); c.stroke(); } }
  }
  /* ---- words and controls ---- */
  words() {
    const t = this.T; if (this.text === null && !this.ops.length && this.code && this.code.text !== this.defText) this.make();
    this.S.aria(t.canvas); if (!this.ops.length) this.S.hint(""); this.toolsOn = this.toolsOn || this.ops.length > 0 || this.S.phone; this.build();
  }
  pick(k) { this.tool = k; this.dot = null; this.S.mark(); this.build(); if (this.S.phone) this.S.hint(this.T.toolHint[k]); }
  build() {
    const t = this.T, S = this.S; this.ui = {};
    const ui = this.ui; ui.msg = el("div", { class: "msg", lang: "" }); ui.meter = el("div", { class: "meter" });
    ui.tools = el("div", { class: "tools", role: "toolbar", "aria-label": t.tools }, ..."sdbclx".split("").filter(k => this.game !== "few" || k === "d").map(k => el("button", { type: "button", "aria-pressed": String(k === this.tool), title: t.toolHint[k], html: `<svg viewBox="0 0 26 26" aria-hidden="true">${ICON[k]}</svg>${t.tool[k]}`, onclick: () => this.pick(k) })));
    const b = (label, fn, pressed) => el("button", { class: "link", type: "button", onclick: fn, "aria-pressed": pressed == null ? null : String(pressed) }, label);
    ui.row = el("div", { class: "row" }, b(t.undo, () => this.undo()), b(t.fresh, () => this.fresh()), b(t.marks, () => { this.showMarks = !this.showMarks; S.mark(); this.build(); }, this.showMarks), b(t.keep, () => this.keep()), this.game ? b(t.gameOff, () => this.play(null)) : b(this.open ? t.less : t.more, () => { this.open = !this.open; this.build(); }, this.open));
    const logo = this.tool === "l" ? el("label", { class: "link", style: "cursor:pointer;display:inline-flex;align-items:center" }, t.logo, el("input", { type: "file", accept: "image/*", hidden: true, onchange: e => this.pickLogo(e.target.files[0]) })) : null;
    ui.hint = el("p", { class: "cap hintcap" + (this.game || this.tool === "l" || !this.showMarks ? " keep" : "") }, this.game ? t.gameHint[this.game] : !this.showMarks ? t.phone : t.toolHint[this.tool], logo ? " " : "", logo);
    const more = el("div", { class: "more" },
      el("div", { class: "field" }, el("label", { for: "txt" }, t.says), ui.txt = el("input", { id: "txt", maxlength: 120, spellcheck: "false", autocomplete: "off", oninput: e => this.type(e.target.value) }), ui.note = el("p", { class: "cap", role: "status" })),
      el("div", { class: "field" }, el("label", {}, t.strength), ui.seg = el("div", { class: "seg", role: "radiogroup", "aria-label": t.strength })),
      el("div", { class: "field" }, el("label", {}, t.games), el("div", { class: "row", style: "margin-top:0" }, b(t.gameFew, () => this.play("few"), this.game === "few"), b(t.gameMost, () => this.play("most"), this.game === "most")), ui.rec = el("p", { class: "cap" })), el("p", { class: "cap", style: "margin:0" }, t.phoneMore));
    ui.txt.value = this.code.text;
    S.ctl(ui.msg, ui.meter, this.free ? (this.open ? [ui.row, more] : [this.game === "few" ? null : ui.tools, ui.hint, ui.row]) : null);
    if (S.phone && this.free && this.ops.length + (this.game ? 1 : 0)) S.hint(this.game ? "" : t.toolHint[this.tool]);
    S.next(S.T.backEnd, () => S.go("end"), true); this.render();
  }
  render() {
    const { ui, ev, code, S } = this, t = this.T; if (!ui || !ev || S.mode !== this) return;
    const n2 = code.n * code.n, w = ev.wrong.length, max = Math.max(...ev.used);
    S.say(this.sayText(), { kick: this.game ? t.kickGame[this.game] : this.shared ? t.shared : t.kick, title: !ev.alive ? t.titleDead : this.game === "few" ? t.titleFew(w) : this.game === "most" ? t.titleMost(w) : this.free ? t.titleFree : t.title, won: false, dead: !ev.alive });
    document.body.classList.toggle("dead", !ev.alive);
    const L = [...code.text], ok = ev.alive || this.assist;
    ui.msg.className = "msg" + (L.length > 60 ? " xl" : L.length > 20 ? " long" : "");
    ui.msg.replaceChildren(...this.map.letters.map(l => el("span", { class: !ok ? "gone" : l.cells.some(c => ev.set.has(c)) ? "fix" : "" }, l.ch)));
    ui.msg.setAttribute("aria-label", ok ? code.text : t.nothing);
    const rows = code.lay.blocks.length > 4 ? [Math.max(...ev.used)] : ev.used;
    ui.meter.replaceChildren(...rows.map(u => el("div", { class: u > ev.t ? "over" : "" }, ...Array.from({ length: ev.t }, (_, i) => el("i", { class: i < ev.t - u ? "on" : "" })))), el("p", {}, code.lay.nb > 1 ? t.meterMany(Math.max(0, ev.t - max), ev.t, code.lay.nb) : max > ev.t ? t.meterOver(max, ev.t) : t.meter(ev.t - max, ev.t)));
    
    if (ui.seg) ui.seg.replaceChildren(...[...LEVELS].map(l => { const v = this.atLevel(l); return el("button", { type: "button", role: "radio", "aria-checked": String(l === this.level), class: v === false ? "dead" : "", disabled: v === null, onclick: () => { this.level = l; this.make(); this.build(); S.save(); } }, t.lv[l], el("small", {}, (v === null ? t.tooLong : v ? t.alive : t.dead))); }));
    if (ui.rec) { const k = store.get("kill", 0), m = store.get("live", 0); ui.rec.textContent = t.rec(k, m); }
  }
  atLevel(l) { // the same damage on a copy printed at another strength
    if (l === this.level) return this.ev.alive; const e = encode(this.code.text, l, { byte: true }); if (!e) return null; const key = l + this.ops.length + this.code.text + this.ev.wrong.length;
    this.lvCache = this.lvCache || {}; if (this.lvCache[l]?.key === key) return this.lvCache[l].v;
    if (!this.open) return true; const p = new Print("probe", document.createElement("canvas")); p.setCode(e, 7).replay(this.ops); const g = p.gray(), r = decodeImage(g, p.canvas.width, p.canvas.width), v = r.stage === "ok" && r.text === e.text; this.lvCache[l] = { key, v }; return v;
  }
  sayText() {
    const t = this.T, ev = this.ev, w = ev.wrong.length; if (this.game === "most" && !ev.alive) return t.mostEnd(this.most || 0); if (this.game === "few" && !ev.alive && ev.cause !== "corners") return t.fewEnd(w, ev.cause);
    if (!ev.alive && ev.cause === "corners") return t.lost + (this.assist ? " " + t.assisted : this.free && !this.wonNow ? ` <button class="link" id="assist" type="button" onclick="__qr.mode.help()">${t.assist}</button>` : "");
    if (!ev.alive) return t.cause[ev.cause](Math.max(...ev.used), ev.t, w, Math.round(w / this.code.n ** 2 * 100)); if (!w) return this.ops.length ? t.wasted : this.free ? t.cleanFree : t.clean; return ev.bad.size ? t.still(w, ev.bad.size) : t.stillFree(w);
  }
  help() { this.assist = true; this.S.mark(); this.render(); play.alive(); }
  type(v) { const text = v || " "; const e = encode(text, this.level, { byte: true }); this.ui.note.textContent = e ? "" : this.T.tooLongNote; if (!e) return; this.text = v || null; this.make(); this.render(); this.S.save(); }
  play(g) { this.game = g; this.free = true; this.most = 0; if (g) { this.text = null; this.level = "H"; this.tool = g === "few" ? "d" : "s"; } this.open = false; this.toolsOn = true; this.fresh(); this.S.hint(""); this.build(); if (g && this.S.phone) scrollTo({ top: 0, behavior: "smooth" }); }
  async pickLogo(f) { if (!f) return; try { this.img = await createImageBitmap(f); this.S.toast(this.T.logoIn); } catch { this.S.toast(this.T.logoBad); } }
  async keep() {
    this.due = 0; this.check(true); const t = this.T, ev = this.ev, total = this.code.n ** 2, url = await poster(this.S, { src: this.S.look, marks: c => this.paintMarks(c, false), head: ev.alive ? t.pAlive : t.pDead, lines: [t.pSaid(this.code.text.length > 40 ? this.code.text.slice(0, 39) + "…" : this.code.text), t.pCount(ev.wrong.length, total, Math.max(...ev.used), ev.t)] });
    this.S.poster(url, t.pAlive, [[this.S.T.savePic, () => this.S.download(url, ev.alive ? "qr-still-reads.png" : "qr-dead.png")], [this.S.T.copyLink, () => this.S.copy(this.S.link())], ...(this.ops.length ? [] : [])]);
  }
}
