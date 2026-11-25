// the picture to keep: two prints on one sheet, or one portrait
export function poster(gl, h, T, o) {
  const single = o.single, W = single ? o.W : 2000, H = single ? o.H : 1500, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const paper = o.dark ? '#131211' : '#efede8', ink = o.dark ? '#ece9e3' : '#1b1a19', mute = o.dark ? '#a5a19a' : '#575552', mast = o.dark ? '#57534d' : '#f3f1ec', pa = o.dark ? ['#34322f', '#161514'] : ['#bab9b5', '#85847f'];
  x.fillStyle = paper; x.fillRect(0, 0, W, H); const disp = '"Bodoni S","Song S","Songti SC",serif', text = '"Jost S","PingFang SC","Noto Sans SC",sans-serif';
  const print = (px, py, pw, ph, d, cam) => {
    x.fillStyle = '#141312'; x.fillRect(px - 8, py - 8, pw + 16, ph + 16);
    x.save(); x.beginPath(); x.rect(px, py, pw, ph); x.clip(); const g = x.createRadialGradient(px + pw * .64, py + ph * .38, 0, px + pw * .64, py + ph * .38, ph * .8); g.addColorStop(0, pa[0]); g.addColorStop(1, pa[1]); x.fillStyle = g; x.fillRect(px, py, pw, ph);
    x.fillStyle = mast; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; const num = String(Math.round(d / 10)), fs = pw * .25; x.font = `400 ${fs}px ${disp}`; const un = T.unit[0], wn = x.measureText(num).width; x.font = `400 ${fs * .36}px ${disp}`; const wu = x.measureText(un).width, x0 = px + (pw - wn - wu - fs * .05) / 2; x.textAlign = 'left'; x.font = `400 ${fs}px ${disp}`; x.fillText(num, x0, py + fs * .9); x.font = `400 ${fs * .36}px ${disp}`; x.fillText(un, x0 + wn + fs * .05, py + fs * .46);
    const keep = [gl.c.width, gl.c.height, gl.dpr]; gl.size(pw, ph, 1); gl.begin(); gl.view({ x: 0, y: 0, w: pw, h: ph, look: o.look, items: [{ head: h, expo: o.lift || 1 }], ...cam }); x.drawImage(gl.c, px, py, pw, ph); gl.size(keep[0] / keep[2], keep[1] / keep[2], keep[2]); x.restore();
  };
  if (single) { print(0, 0, W, H, o.d, o.cam({ w: W, h: H })); return c; }
  const pw = 860, ph = 1075, gap = 24, x0 = (W - 2 * pw - gap) / 2, y0 = 92;
  [300, 1500].forEach((d, i) => { print(x0 + i * (pw + gap), y0, pw, ph, d, { vp: o.portrait(h, d, pw / ph), eye: [0, 0, o.lensZ(h, d)] }); const g = o.growth(h, d); x.fillStyle = mute; x.textAlign = 'left'; x.font = `400 30px ${text}`; x.fillText(`${T.cm(d)}   ${T.s3.nose(T.pc(g))}`, x0 + i * (pw + gap), y0 + ph + 58); });
  x.fillStyle = ink; x.font = `400 64px ${disp}`; x.textAlign = 'left'; x.fillText(T.posterT, x0, y0 + ph + 178); x.fillStyle = mute; x.font = `400 26px ${text}`; x.fillText('yizhouyu.dev/demo/selfie', x0, y0 + ph + 246);
  return c;
}
