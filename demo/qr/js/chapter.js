import { el } from "./util.js";
// A chapter = a few steps. Each step: one action, one sentence, something you can now see.
export class Chapter {
  constructor(S, id, steps, num) { this.S = S; this.id = id; this.steps = steps; this.num = num; this.step = 0; this.ok = new Set(); }
  get T() { return this.S.T[this.id]; }
  get name() { return this.steps[this.step]; }
  enter(q) { const s = q?.get ? +q.get("s") || 0 : 0; this.step = Math.min(this.steps.length - 1, Math.max(0, s)); this.ok = new Set(); this.read?.(q); this.begin?.(); this.words(); }
  hash() { return `m=${this.id}` + (this.step ? `&s=${this.step}` : "") + (this.extra?.() || ""); }
  set(i) { this.step = i; this.begin?.(); this.words(); this.S.paint(); this.S.mark(); this.S.save(); }
  pass() { if (this.ok.has(this.step)) { this.talk(); return; } this.ok.add(this.step); this.S.tick(); if (this.step === this.steps.length - 1) this.S.finish(this.id); this.talk(); }
  words() {
    const S = this.S, t = this.T; S.aria(t.canvas); this.ticks = el("div", { class: "ticks" }, ...this.steps.map((_, i) => el("button", { type: "button", "aria-label": `${i + 1} / ${this.steps.length}`, onclick: () => this.set(i) })));
    if (this.steps.length < 2) this.ticks.hidden = true;
    S.ctl(this.ticks, ...(this.controls?.() || [])); if (!this.ok.has(this.step)) S.hint(t.hint?.[this.name] || ""); this.talk();
  }
  talk() {
    const S = this.S, t = this.T, d = this.ok.has(this.step), last = this.step === this.steps.length - 1; this.ticks?.querySelectorAll("button").forEach((b, i) => { b.className = i === this.step ? "on" : this.ok.has(i) ? "done" : ""; });
    S.say((this.sentence?.()) || (d && t.done[this.name] || t.do[this.name]), { title: (d ? t.won?.[this.name] : t.goal?.[this.name]) ?? t.title, kick: t.kick || "", won: d });
    if (!d) S.next(""); else if (this.step < this.steps.length - 1) S.next(S.T.next, () => this.set(this.step + 1), true); else S.next(S.after(this.id) === "end" && this.id !== "make" ? S.T.backEnd : S.T.next, () => S.go(S.after(this.id)), true);
  }
  leave() { }
}
