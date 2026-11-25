import { el } from "./util.js";
// One screen of the story: one verb, one goal you can see, a moment of success, one sentence of why. Next only after that.
export class Level {
  constructor(S, id) { this.S = S; this.id = id; this.won = false; }
  get T() { return this.S.T[this.id]; }
  enter(q) { this.won = false; this.load?.(q); this.start(); this.words(); }
  hash() { return `m=${this.id}` + (this.extra?.() || ""); }
  words() { const S = this.S, t = this.T; S.aria(t.canvas); S.ctl(...(this.controls?.() || [])); this.talk(); }
  talk() { const S = this.S, t = this.T; S.say(this.sentence?.() || (this.won ? t.why : t.say), { title: this.won ? t.won : t.goal, kick: t.kick, won: this.won, dead: this.won && this.kills }); if (this.won) S.next(this.nextWord?.() || S.T.next, () => this.onNext ? this.onNext() : S.go(S.after(this.id)), true); else S.next(""); }
  win(quiet) { if (this.won) return; this.won = true; this.S.finish(this.id); if (!quiet) this.S.tick(); this.talk(); this.S.mark(); }
  leave() { }
}
