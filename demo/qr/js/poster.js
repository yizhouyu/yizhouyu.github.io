import { Paper } from "./paper.js";
import { text } from "./draw.js";
let lamp = null;
// A print-quality sheet, 2400×3000: the object, lit, with a wall label under it.
export async function poster(S, { src, marks, head, lines, stamp }) {
  await document.fonts?.ready; try { await Promise.all([document.fonts.load("300 40px Host"), document.fonts.load("300 40px NotoQR", head + lines.join(""))]); } catch {}
  const W = 2400, H = 3000, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"), dark = S.lights === "off";
  x.fillStyle = dark ? "#101211" : "#e9ebea"; x.fillRect(0, 0, W, H);
  const side = 1800, big = document.createElement("canvas"); if (!lamp) lamp = new Paper(big); lamp.resize(side); lamp.dark = dark ? 1 : 0; lamp.light = [.1, -.18]; lamp.dirtyTex = true; lamp.render(src, { scale: 1 });
  const w = lamp.canvas.width, px = (W - w) / 2, py = 150; x.drawImage(lamp.canvas, px, py);
  if (marks) { x.save(); x.setTransform(side, 0, 0, side, px + lamp.pad * side, py + lamp.pad * side); marks(x); x.restore(); }
  const ink = dark ? "#e8ebe8" : "#141615", soft = dark ? "#98a09b" : "#59605c", L = px + lamp.pad * side;
  x.setTransform(1, 0, 0, 1, 0, 0); text(x, head, L, 2440, 92, { align: "left", color: ink, weight: 300 });
  lines.forEach((l, i) => text(x, l, L, 2560 + i * 62, 42, { align: "left", color: soft, weight: 400 }));
  text(x, "yizhouyu.dev/demo/qr", L, 2850, 36, { align: "left", color: soft, weight: 400 }); if (stamp) text(x, stamp, L + side, 2850, 36, { align: "right", color: soft, weight: 400 });
  return new Promise(r => c.toBlob(b => r(URL.createObjectURL(b)), "image/png"));
}
