// Where the sun is, and what a clock in New York says. Meeus / NOAA low-precision series, topocentric, checked against JPL Horizons (tests/truth.mjs).
const R = Math.PI / 180, s = Math.sin, c = Math.cos;
export const LAT0 = 40.7536, LON0 = -73.9832;
// apparent right ascension / declination (radians) and Greenwich sidereal time (degrees)
export function sunEq(ms) {
  const jd = ms / 864e5 + 2440587.5, T = (jd + 70 / 86400 - 2451545) / 36525, Tu = (jd - 2451545) / 36525;
  const L = 280.46646 + T * (36000.76983 + T * .0003032), M = (357.52911 + T * (35999.05029 - T * .0001537)) * R;
  const C = (1.914602 - T * (.004817 + .000014 * T)) * s(M) + (.019993 - .000101 * T) * s(2 * M) + .000289 * s(3 * M);
  const om = (125.04 - 1934.136 * T) * R, Lm = (L % 360) * R, lm = (218.3165 + 481267.8813 * T) * R;
  const dpsi = (-17.2 * s(om) - 1.32 * s(2 * Lm) - .23 * s(2 * lm) + .21 * s(2 * om)) / 3600, deps = (9.2 * c(om) + .57 * c(2 * Lm) + .1 * c(2 * lm)) / 3600;
  const lam = (L + C - .00569 + dpsi) * R, eps = (23 + (26 + (21.448 - T * (46.815 + T * .00059)) / 60) / 60 + deps) * R;
  const ra = Math.atan2(c(eps) * s(lam), c(lam)), dec = Math.asin(s(eps) * s(lam));
  const gst = 280.46061837 + 360.98564736629 * (jd - 2451545) + Tu * Tu * .000387933 + dpsi * c(eps);
  return { ra, dec, gst };
}
// azimuth from north clockwise, altitude without (alt) and with (app) the bending of light in air; degrees
export function sunPos(ms, lat = LAT0, lon = LON0) {
  const { ra, dec, gst } = sunEq(ms), H = ((gst + lon) * R - ra), f = lat * R;
  const x = s(H) * c(dec), y = c(H) * s(f) * c(dec) - s(dec) * c(f), z = c(H) * c(f) * c(dec) + s(f) * s(dec);
  let az = Math.atan2(x, y) / R + 180; az = (az + 360) % 360;
  const alt = Math.asin(z) / R - .00244 * Math.cos(Math.asin(z)); // parallax
  return { az, alt, app: alt + refr(alt) };
}
export const refr = a => a < -1 ? 0 : 1.02 / Math.tan((a + 10.3 / (a + 5.11)) * R) / 60;
// --- clock ---
const DAY = 864e5;
export const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const dayOf = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / DAY); // 0-based
export const ymd = (y, n) => { const t = new Date(Date.UTC(y, 0, 1) + n * DAY); return [t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCDay()]; };
const nthSun = (y, m, n) => { const w = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); return 1 + (7 - w) % 7 + 7 * (n - 1); };
export const dstStart = y => dayOf(y, 3, nthSun(y, 3, 2)), dstEnd = y => dayOf(y, 11, nthSun(y, 11, 1));
// hours to add to UTC, for clock minute `min` of day n (rule: US, since 2007)
export function nyOffset(y, n, min) { const a = dstStart(y), b = dstEnd(y); if (n < a || n > b) return -5; if (n > a && n < b) return -4; return n === a ? (min >= 120 ? -4 : -5) : (min >= 60 ? -5 : -4); }
export const PLACE_NY = { id: 'ny', lat: LAT0, lon: LON0, off: nyOffset };
export const toMs = (y, n, min, place = PLACE_NY) => Date.UTC(y, 0, 1) + n * DAY + min * 6e4 - (place.off ? place.off(y, n, min) : place.tz) * 36e5;
export function sunAt(y, n, min, place = PLACE_NY) { return sunPos(toMs(y, n, min, place), place.lat, place.lon); }
// today on a New York clock
export function nyNow(ms = Date.now()) { const u = new Date(ms); let y = u.getUTCFullYear(), n = Math.floor((ms - Date.UTC(y, 0, 1)) / DAY), m = (ms - Date.UTC(y, 0, 1)) / 6e4 - n * 1440;
  const a = dstStart(y), b = dstEnd(y), t = ms - Date.UTC(y, 0, 1), o = t >= a * DAY + 7 * 36e5 && t < b * DAY + 6 * 36e5 ? 4 : 5; m -= o * 60; if (m < 0) { m += 1440; n--; } if (n < 0) { y--; n = isLeap(y) ? 365 : 364; } return { y, n, min: Math.floor(m) }; }
// all sun positions of a year: step minutes, Float32 [az, app] per (day, k)
export function yearTable(y, step = 5, place = PLACE_NY, m0 = 0, m1 = 1440) {
  const D = isLeap(y) ? 366 : 365, K = (m1 - m0) / step, az = new Float32Array(D * K), al = new Float32Array(D * K), f = place.lat * R, sf = s(f), cf = c(f);
  for (let n = 0; n < D; n++) { const a0 = sunEq(Date.UTC(y, 0, 1) + n * DAY), a1 = sunEq(Date.UTC(y, 0, 1) + (n + 1) * DAY), a2 = sunEq(Date.UTC(y, 0, 1) + (n + 2) * DAY);
    const un = (v, w) => v - w < -Math.PI ? v + 2 * Math.PI : v - w > Math.PI ? v - 2 * Math.PI : v, r1 = un(a1.ra, a0.ra), r2 = un(a2.ra, r1);
    for (let k = 0; k < K; k++) { const min = m0 + (k + .5) * step, u = (toMs(y, n, min, place) - Date.UTC(y, 0, 1)) / DAY - n; // days since a0 (may be > 1)
      const q = u * (u - 1) / 2, ra = a0.ra + (r1 - a0.ra) * u + (r2 - 2 * r1 + a0.ra) * q, dec = a0.dec + (a1.dec - a0.dec) * u + (a2.dec - 2 * a1.dec + a0.dec) * q, gst = a0.gst + 360.98564736629 * u;
      const H = (gst + place.lon) * R - ra, cd = c(dec), x = s(H) * cd, yy = c(H) * sf * cd - s(dec) * cf, z = c(H) * cf * cd + sf * s(dec), alt = Math.asin(z) / R;
      const i = n * K + k; az[i] = (Math.atan2(x, yy) / R + 540) % 360; al[i] = alt + refr(alt) - .00244 * c(alt * R); } }
  return { y, D, K, step, m0, az, al, place };
}
