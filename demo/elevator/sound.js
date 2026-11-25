// Everything you hear is synthesised. Off until asked for.
export class Sound {
  constructor() { this.on = false; }
  toggle(v) { this.on = v; if (v && !this.c) this.init(); if (this.c) { if (v) this.c.resume(); this.m.gain.setTargetAtTime(v ? .8 : 0, this.c.currentTime, .05); } }
  init() {
    try { const C = window.AudioContext || window.webkitAudioContext, c = this.c = new C(); this.m = c.createGain(); this.m.gain.value = 0; const k = c.createDynamicsCompressor(); this.m.connect(k); k.connect(c.destination);
      const n = c.sampleRate * 2, b = this.nb = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.hum = this.loop(220, .9, "lowpass"); this.whirr = this.loop(900, 6, "bandpass"); this.screech = this.loop(2600, 9, "bandpass"); this.wind = this.loop(500, .6, "bandpass");
    } catch { this.c = null; }
  }
  loop(f, q, type) { const c = this.c, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.nb; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(this.m); s.start(); return { fl, g }; }
  set(o, v, f) { if (!this.c) return; o.g.gain.setTargetAtTime(v, this.c.currentTime, .04); if (f) o.fl.frequency.setTargetAtTime(f, this.c.currentTime, .05); }
  frame(v, wheel, govV, jaw) { if (!this.c || !this.on) return; this.set(this.hum, Math.min(.5, Math.abs(wheel) * .16), 120 + Math.abs(wheel) * 60); this.set(this.whirr, Math.min(.35, govV * govV * .022), 500 + govV * 350); this.set(this.screech, jaw ? .5 : 0, 1800 + Math.abs(v) * 500); this.set(this.wind, Math.min(.5, Math.max(0, Math.abs(v) - 2) * .03), 300 + Math.abs(v) * 40); }
  hush() { if (this.c) for (const k of ["hum", "whirr", "screech", "wind"]) this.set(this[k], 0); }
  noise(t, dur, f, q, g, type = "bandpass") { const c = this.c, s = c.createBufferSource(), fl = c.createBiquadFilter(), e = c.createGain(); s.buffer = this.nb; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(fl); fl.connect(e); e.connect(this.m); s.start(t, Math.random()); s.stop(t + dur + .05); }
  tone(t, f0, f1, dur, g, type = "triangle") { const c = this.c, o = c.createOscillator(), e = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(e); e.connect(this.m); o.start(t); o.stop(t + dur + .05); }
  play(k) {
    if (!this.c || !this.on) return; const t = this.c.currentTime;
    if (k === "snip") { this.noise(t, .05, 4200, 1.5, .5); this.noise(t + .05, .06, 3000, 2, .5); this.tone(t + .06, 190, 70, .9, .35, "sawtooth"); this.noise(t + .06, .5, 900, 3, .35); }
    else if (k === "break") { this.noise(t, .25, 1800, 1.2, .6); this.tone(t, 420, 160, .4, .3, "square"); this.tone(t + .12, 900, 700, .5, .12); }
    else if (k === "clamp") { this.noise(t, .18, 700, 1, .9); this.tone(t, 130, 60, .4, .7); this.tone(t + .01, 1200, 900, .8, .12); }
    else if (k === "thud") { this.tone(t, 90, 32, .7, .95, "sine"); this.noise(t, .5, 300, .7, .8); }
    else if (k === "crash") { this.tone(t, 110, 24, 1.3, 1, "sine"); this.noise(t, 1.4, 500, .5, 1, "lowpass"); this.noise(t, .7, 2500, 1, .5); for (let i = 0; i < 5; i++) this.noise(t + .15 + i * .13, .2, 1200 + i * 300, 4, .25); }
    else if (k === "brake") { this.noise(t, .09, 500, 1.5, .8); this.tone(t, 160, 90, .2, .4); }
    else if (k === "tick") this.noise(t, .03, 2500, 4, .25);
    else if (k === "alarm") for (let i = 0; i < 14; i++) { this.tone(t + i * .13, 1760, 1700, .12, .22, "square"); } else if (k === "found") { this.tone(t, 660, 660, .9, .16, "sine"); this.tone(t + .09, 990, 990, 1.1, .12, "sine"); }
  }
}
