// The whole model: a pinhole camera. Millimetres. Head frame: x to the sitter's left as seen in the picture's right, y up, z towards the camera,
// origin half way between the eyeballs. No DOM here, so the tests can import it.

/** z of the lens when it is d mm in front of the tip of the nose */
export const lensZ = (h, d) => h.nose[2] + d;
/** picture size (per mm) of something at depth z, seen by a lens at zc */
export const scale = (zc, z) => 1 / (zc - z);
/** how much wider a part looks, compared with a picture from very far away in which the face (cheekbones) is equally wide. 0.3 = +30 % */
export const growth = (h, d, part = 'al') => { const zc = lensZ(h, d); return scale(zc, h[part][2]) / scale(zc, h.zy[2]) - 1; };
export const noseGrowth = (h, d) => growth(h, d, 'al');
/** straight-line distance from the lens (at eye height) to a landmark */
export const reach = (h, d, part) => Math.hypot(h[part][0], h[part][1], lensZ(h, d) - h[part][2]);
/** Ward et al. 2018: parallel planes, cheekbones at half the head's length, nose breadth at the glabella plane, lens `d` in front of the nose tip */
export const ward = (d, protrusion, half) => (d + protrusion + half) / (d + protrusion) - 1;

/** the portrait framing: the face (cheekbones) always takes the same share of the picture's width */
export const FACE_SHARE = 0.47;
export const frameW = h => 2 * h.zy[0] / FACE_SHARE;        // mm across the picture, at the plane of the cheekbones
export const EYE_LINE = 0.455;                              // eyes this far down the picture
export const ASPECT = 4 / 5;                                // picture width / height

/** view+projection (column major) for a lens at eye z = zc looking straight at the sitter, off-axis frustum, pinned on the cheekbones */
export function portrait(h, d, aspect = ASPECT, opt = {}) {
  const zc = lensZ(h, d), D = zc - h.zy[2], H = (opt.w || frameW(h)) / Math.min(aspect, opt.w ? aspect : ASPECT), W = H * aspect, near = Math.max(8, d * 0.25), k = near / D;
  const eye = opt.eyeLine ?? EYE_LINE, l = -W / 2 * k, r = W / 2 * k, t = H * eye * k, b = -H * (1 - eye) * k;
  return mul(frustum(l, r, b, t, near, zc + 1200), translate(0, 0, -zc));
}
/** a phone camera: focal length in mm "35 mm equivalent" over the long side of the picture, aspect w/h, at [x,y,z], pitch radians */
export function phoneCam(f35, aspect, pos, pitch = 0, shiftY = 0) {
  // equivalent focal length is defined on the 43.27 mm diagonal of a 36 x 24 frame
  const diag = 43.2666, hgt = diag / Math.hypot(aspect, 1), wid = hgt * aspect, near = 20, k = near / f35;
  const sy = shiftY * hgt;
  return mul(mul(frustum(-wid / 2 * k, wid / 2 * k, (-hgt / 2 + sy) * k, (hgt / 2 + sy) * k, near, 9000), rotX(-pitch)), translate(-pos[0], -pos[1], -pos[2]));
}
export const halfAngle = (f35, aspect) => Math.atan(43.2666 * aspect / Math.hypot(aspect, 1) / 2 / f35);
/** how much a small round thing is stretched towards the picture's edge, seen th radians off the axis of a flat picture */
export const edgeStretch = th => 1 / Math.cos(th);
/** outline of a sphere of radius r at (X,0,-D): exact image extents [radial width, tangential height] on the plane at distance 1 */
export function sphereImage(X, D, r) {
  // tangent cone in the plane containing the axis
  const th = Math.atan2(X, D), R = Math.hypot(X, D), a = Math.asin(r / R), w = Math.tan(th + a) - Math.tan(th - a);
  // tangential half-height: the cone cut by the picture plane is an ellipse; its semi-minor axis
  const c = Math.cos(a), s = Math.sin(a), ct = Math.cos(th), q = c * c - Math.sin(th) ** 2; // q>0 while the whole outline is in front
  const semiMinor = s / Math.sqrt(q); return [w, 2 * semiMinor];
}
/** the right place to look at a print from: the picture must fill the same angle as the scene did. printW = width of the print, any unit */
export const viewingDistance = (h, d, printW) => printW * (lensZ(h, d) - h.zy[2]) / frameW(h);

// ---- matrices (column major)
export function frustum(l, r, b, t, n, f) { const m = new Float32Array(16); m[0] = 2 * n / (r - l); m[5] = 2 * n / (t - b); m[8] = (r + l) / (r - l); m[9] = (t + b) / (t - b); m[10] = -(f + n) / (f - n); m[11] = -1; m[14] = -2 * f * n / (f - n); return m; }
export function ortho(l, r, b, t, n, f) { const m = new Float32Array(16); m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n); m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n); m[15] = 1; return m; }
export const ident = () => { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; };
export const translate = (x, y, z) => { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m; };
export const rotY = a => { const m = ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; };
export const rotX = a => { const m = ident(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; };
export function mul(a, b) { const m = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; m[c * 4 + r] = s; } return m; }
/** project a point: returns [x,y] in 0..1 of the picture (y down) */
export function project(m, p) { const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15]; return [(m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / w * .5 + .5, .5 - (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / w * .5]; }
