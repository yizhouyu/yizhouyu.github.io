// The real lower Manhattan: loaded while you play the street. Used by the level with the lid and by "check my street".
import { Sim } from './sim.js';
import { View, EX } from './render.js';
import * as D from './data.js';
import { World } from './world.js';
const { NX, NY, DX, MHHW } = D;
export class City {
  constructor(canvas, small) { this.cv = canvas; this.small = small; this.ready = null; this.goal = MHHW; this.on = false; }
  load() { return this.ready ||= this._load(); }
  async _load() {
    const gl = this.cv.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' }); if (!gl) throw new Error('nogl');
    const L = n => D.gz('data/' + n + '.gz'); const [g, gr, b, th, z, nm] = await Promise.all(['grid.bin', 'ground.bin', 'bld.bin', 'thr.bin', 'zone.bin', 'names.json'].map(L));
    const grid = D.parseGrid(g), bld = D.parseBld(b);
    this.sim = new Sim(gl, { nx: NX, ny: NY, dx: DX, bed: grid.bed, sea: MHHW }); this.world = new World(JSON.parse(new TextDecoder().decode(nm)), grid.bed, new Uint8Array(th), new Uint8Array(z), bld); this.world.z0 = this.sim.z0;
    const v = this.view = new View(gl, this.sim, { ground: D.parseGround(gr), bld, small: this.small }); v.hoods = 1; v.setZone(this.world.zone); this.setDark(this.dark); v.wipeX = 99999; v.shift = [0, 0];
    const im = new Image(); im.src = 'data/lid.webp'; await im.decode(); v.image('map', im); this.size(); this.sim.surface(); return this;
  }
  setDark(d) { this.dark = d; if (this.view) this.view.setTheme(!!d); }
  size() { const w = innerWidth, h = innerHeight; let d = Math.min(devicePixelRatio || 1, 2); if (w * h * d * d > 5e6) d = Math.sqrt(5e6 / w / h); this.cv.width = Math.round(w * d); this.cv.height = Math.round(h * d); if (this.view) this.view.dpr = d; }
  labels(list) { this.view.setLabels(list); }
  project(x, y, z = 10) { const v = this.view; v.aspect = innerWidth / innerHeight; v.matrices(innerWidth, innerHeight); const p = v.project(x, y, z); return [(p[0] + 1) / 2 * innerWidth, (1 - p[1]) / 2 * innerHeight, p[2]]; }
  at(x, y) { const g = Math.max(this.view.groundAt(x, y), 0) * EX + 6; return this.project(x, y, g); }
  hit(cx, cy) { const v = this.view; v.aspect = innerWidth / innerHeight; v.matrices(innerWidth, innerHeight); return v.pick(cx / innerWidth * 2 - 1, 1 - cy / innerHeight * 2); }
  setLift(t) { this.lift = t; const v = this.view; v.lift = t <= 0 ? 0 : 9000 * t * t; v.mapOn = Math.min(1, t * 1.6); this.sim.fill = t > 0; this.sim.dirty = true; }
  tick(dt) { if (!this.on || !this.view) return; const s = this.sim; if (Math.abs(s.sea - this.goal) > 1e-3) { const r = .42 * dt; s.sea += Math.max(-r, Math.min(r, this.goal - s.sea)); if (s.sea > s.maxSea) s.pickTiles(); this.run = 7; } if (this.run > 0) { this.run -= dt; s.steps(this.small ? 14 : 28); s.poll(); if (!s.wait) s.probeAsync(() => { }); } this.view.time += dt; this.view.draw(this.cv.width, this.cv.height); }
  settle() { const s = this.sim; s.sea = this.goal; s.pickTiles(); }
}
