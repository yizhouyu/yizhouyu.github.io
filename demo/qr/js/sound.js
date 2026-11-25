let ac = null, out = null, noiseBuf = null; export const snd = { on: true };
try { snd.on = localStorage.getItem("qr.sound") !== "0"; } catch {}
export function wake() { if (ac) { if (ac.state === "suspended") ac.resume(); return; } try { ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = snd.on ? .5 : 0; out.connect(ac.destination);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } catch { ac = null; } }
export function mute(on) { snd.on = on; try { localStorage.setItem("qr.sound", on ? "1" : "0"); } catch {} if (out) out.gain.value = on ? .5 : 0; }
function noise(dur, f, Q, vol, type = "bandpass", f2 = f) { if (!ac) return; const s = ac.createBufferSource(), b = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime; s.buffer = noiseBuf; s.loop = true; b.type = type; b.Q.value = Q; b.frequency.setValueAtTime(f, t); b.frequency.linearRampToValueAtTime(f2, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur); s.connect(b).connect(g).connect(out); s.start(t, Math.random() * .8, dur + .02); }
function tone(f, dur, vol, type = "square", at = 0) { if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + at; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + dur * .7); g.gain.linearRampToValueAtTime(0, t + dur); o.connect(g).connect(out); o.start(t); o.stop(t + dur); }
export const play = {
  scratch: v => noise(.07, 2600 + v * 2600, .9, Math.min(.16, .04 + v * .12)),
  crackle: () => noise(.05, 900 + Math.random() * 2600, 2.5, .05 + Math.random() * .08), strike: () => noise(.35, 5200, .7, .16, "bandpass", 2400),
  splash: () => { noise(.35, 900, .8, .3, "lowpass", 260); noise(.12, 2400, 1.2, .08); }, stick: () => { noise(.05, 420, 1, .4, "lowpass"); tone(170, .05, .06, "sine"); },
  cut: () => noise(.22, 3800, 2, .2, "bandpass", 6200), dot: () => noise(.03, 1900, 3, .25),
  patch: left => tone(520 + (1 - left) * 520, .045, .035), dead: () => { tone(196, .16, .08); tone(131, .34, .09, "square", .17); }, stamp: () => noise(.09, 190, .7, .7, "lowpass"),
  alive: () => { tone(1046, .07, .05, "sine"); tone(1568, .1, .05, "sine", .08); }, print: () => noise(.045, 1500, 6, .12) };
