import { Stage } from "./stage.js"; import * as E from "./engine.js";
// a 1600 x 2000 print: your walk on the map, and the one sentence
export async function poster(st, sim, t, lang) {
  const W = 800, H = 1000, d = 2, c = document.createElement("canvas"); c.width = W * d; c.height = H * d; const x = c.getContext("2d");
  const p = Object.assign(Object.create(Stage.prototype), st, { cv: c, ctx: x, W, H: 790, d, tgt: null, detail: null, ask: null, extra: null, spot: 2 }); const a = sim.actors[0], P = E.pos(a.from), G = E.pos(a.to);
  p.cam = p.fit({ x0: Math.min(P.x, G.x) - 30, x1: Math.max(P.x, G.x) + 40, y0: Math.min(P.y, G.y) - 30, y1: Math.max(P.y, G.y) + 40 }, { l: 70, r: 50, t: 80, b: 70, max: 2 }); p.paint(x, d);
  x.setTransform(d, 0, 0, d, 0, 0); const dark = st.theme === "dark"; x.fillStyle = dark ? "#0e1011" : "#e3e6e4"; x.fillRect(0, 790, W, 210); x.fillStyle = dark ? "#eef0ef" : "#17191b"; x.textBaseline = "alphabetic"; x.textAlign = "left"; x.font = lang === "zh" ? '800 58px ZH, "PingFang SC", sans-serif' : "750 72px Sofia, sans-serif"; x.fillText(t.end.h, 44, 874);
  x.font = lang === "zh" ? '500 22px ZH, "PingFang SC", sans-serif' : "500 26px Sofia, sans-serif"; let line = "", y = 915; const words = lang === "zh" ? [...t.end.p] : t.end.p.split(/(?<= )/); for (const w of words) { if (x.measureText(line + w).width > W - 90) { x.fillText(line, 44, y); line = ""; y += 31; } line += w; } x.fillText(line, 44, y); x.font = "500 16px Sofia, sans-serif"; x.globalAlpha = .65; x.fillText("yizhouyu.dev/demo/walk", 44, 985); x.globalAlpha = 1;
  c.toBlob(b => { const u = URL.createObjectURL(b), l = document.createElement("a"); l.href = u; l.download = "walk.png"; l.click(); window.__poster = b.size; setTimeout(() => URL.revokeObjectURL(u), 9000); }, "image/png");
}
