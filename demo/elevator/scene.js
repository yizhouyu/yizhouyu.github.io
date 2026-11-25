// The cutaway model. Display metres; the shaft is shortened by two breaks (see map()). Knows nothing of the rules.
import { T, Build, Rope, M4, bevel, ring, web, helix, brick, lay, wood, words, checker, blob } from "./kit.js";
import { P, floorY } from "./sim.js";

export const G = { Ta: 44.0, Pb: 1.72, Hm: 4.7, gap: .34, base: -.42, roof: 48.3, wl: -1.58, wr: 1.92, wt: .26, zb: -1.12, zf: .42, rail: .99, gA: -1.17, gB: -1.43, cw: P.geo.xCw, R: P.geo.R, r: P.geo.r, SY: P.sheaveY, DY: P.sheaveY - P.geo.dy, EX: P.geo.xCw - P.geo.r, zs: .115, xh: .135, MR: 45.5, GP: 45.16 };
const kOf = i => i - 2.5, V3 = (x, y, z) => new T.Vector3(x, y, z), sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const COATS = ["#34506b", "#8a6a33", "#4f5d3a", "#7d7a70", "#22302c", "#a08254", "#5b4436"];

export class View {
  constructor(canvas, { small = false, calm = false, dpr = 1 } = {}) {
    this.canvas = canvas; this.small = small; this.calm = calm;
    const r = this.r = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: false });
    r.localClippingEnabled = true; r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; r.toneMapping = T.NeutralToneMapping; r.setClearColor(0, 0);
    this.scene = new T.Scene(); this.cam = new T.PerspectiveCamera(13, 1, 5, 200);
    this.yaw = .40; this.pitch = .105; this.yawT = this.yaw; this.pitchT = this.pitch; this.box = { x0: -2, x1: 2, y0: 0, y1: 10 }; this.boxT = { ...this.box };
    this.c = 12; this.cReady = false; this.gp = G.gap; this.gt = G.gap;
    this.mats(); this.lights(); this.build(); this.setTheme(false);
  }
  mats() {
    const S = (c, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: .6, metalness: 0, ...o }), m = this.m = {};
    const b = this.brick = brick();
    m.tile = S("#ffffff", { map: b.map, bumpMap: b.bump, bumpScale: 1.6, roughness: .34 });
    m.tileT = m.tile.clone(); m.tileT.map = b.map.clone(); m.tileT.bumpMap = b.bump.clone(); m.tileP = m.tile.clone(); // fixed copies for the ends
    m.ink = S("#1d2420", { roughness: .85 }); m.shell = S("#46524b", { roughness: .9 }); m.conc = S("#c9c8ba", { roughness: .9 });
    m.steel = S("#a9adab", { metalness: 1, roughness: .34 }); m.dsteel = S("#5d625f", { metalness: .9, roughness: .42 }); m.iron = S("#2c322f", { metalness: .35, roughness: .55 });
    m.green = S("#3f5a4c", { metalness: .15, roughness: .42 }); m.green2 = S("#587263", { metalness: .15, roughness: .45 });
    m.brass = S("#d9a94e", { metalness: 1, roughness: .26 }); m.brassD = S("#8f6a2b", { metalness: 1, roughness: .4 }); m.copper = S("#b06a3c", { metalness: 1, roughness: .38 });
    m.wood = S("#ffffff", { map: wood(), roughness: .45 }); m.beech = S("#e2c18f", { roughness: .5 }); m.door = S("#6f7d70", { roughness: .5, metalness: .2 });
    m.red = S("#d2311d", { roughness: .5, emissive: "#d2311d", emissiveIntensity: .25 }); m.cream = S("#f1ecdc", { roughness: .5 }); m.slate = S("#262a2b", { roughness: .4 }); m.black = S("#151917", { roughness: .7 });
    m.floor = S("#ffffff", { map: checker("#ece6d4", "#2c3431"), roughness: .4 }); m.floor.map.repeat.set(3.5, 3.5);
    m.lamp = new T.MeshStandardMaterial({ color: "#fff3d6", emissive: "#ffdf9f", emissiveIntensity: 2.2 });
    m.rope = S("#ffffff", { map: lay(), metalness: .55, roughness: .45 }); m.gov = S("#ffffff", { map: m.rope.map, metalness: .4, roughness: .5 });
    m.hard = S("#1a1d1b", { roughness: .7 });
    m.spark = new T.PointsMaterial({ size: 7, map: blob(), sizeAttenuation: false, color: "#ffe2a0", transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    this.lit = {};  // parts that can glow own a private copy of their materials
  }
  glowMat(base, key) { const c = base.clone(); (this.lit[key] ||= []).push({ m: c, e: c.emissive.clone(), i: c.emissiveIntensity }); return c; }
  lights() {
    const s = this.scene; this.hemi = new T.HemisphereLight("#ffffff", "#8c937f", 1); s.add(this.hemi);
    const k = this.key = new T.DirectionalLight("#fff4e0", 2); k.position.set(-3.4, 17, 13.5); k.target.position.set(.2, 5.2, -.5); s.add(k, k.target); k.castShadow = true; k.shadow.mapSize.set(this.small ? 1024 : 2048, this.small ? 1024 : 2048); Object.assign(k.shadow.camera, { left: -5.5, right: 5.5, top: 8.5, bottom: -8.5, near: 4, far: 36 }); k.shadow.bias = -.0006; k.shadow.normalBias = .02; k.shadow.radius = 4;
    this.fill = new T.DirectionalLight("#cfe0da", .5); this.fill.position.set(9, 5, 8); s.add(this.fill);
    this.carL = new T.PointLight("#ffcf87", 3, 7, 1.8); s.add(this.carL);
    this.mrL = new T.PointLight("#ffd9a0", 3, 9, 1.7); s.add(this.mrL);
    this.pitL = new T.PointLight("#ffd9a0", 1, 5, 1.8); s.add(this.pitL);
    // soft boxes for the metal
    const e = new T.Scene(), bx = (x, y, z, w, h, c, i) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(i), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); e.add(m); };
    e.background = new T.Color("#4c544e"); bx(-5, 5, 5, 5, 4, "#fff6e6", 7); bx(6, 2, 3, 2, 7, "#eaf2ee", 4); bx(0, 8, 0, 8, 8, "#ffffff", 2.4); bx(0, -6, 0, 12, 12, "#31332b", 1); bx(-3, 0, 7, .8, 8, "#ffffff", 5); bx(0, 1, -7, 12, 6, "#6b7268", 1);
    const pm = new T.PMREMGenerator(this.r); this.scene.environment = pm.fromScene(e, .03).texture; pm.dispose();
    const w = this.wallMat = new T.ShadowMaterial({ opacity: .2 }), wp = new T.Mesh(new T.PlaneGeometry(60, 60), w); wp.position.set(0, 5, -2.75); wp.receiveShadow = true; s.add(wp); this.wallP = wp;
  }
  setTheme(dark) {
    this.dark = dark; const L = dark
      ? { env: .16, hemi: .14, key: .3, fill: .22, car: 13, mr: 9, pit: 2.2, wall: .35, exp: 1.12, kc: "#9fb8d8" }
      : { env: .62, hemi: .75, key: 2.35, fill: .5, car: 4.6, mr: .9, pit: .25, wall: .17, exp: .96, kc: "#fff3de" };
    this.L = L; this.scene.environmentIntensity = L.env; this.hemi.intensity = L.hemi; this.key.intensity = L.key; this.key.color.set(L.kc); this.fill.intensity = L.fill; this.mrL.intensity = L.mr; this.pitL.intensity = L.pit; this.wallMat.opacity = L.wall; this.r.toneMappingExposure = L.exp;
    if (this.edge) { this.edge.opacity = this.edgeC.opacity = dark ? .26 : 0; this.edge.visible = this.edgeC.visible = dark; }
    this.m.ink.color.set(dark ? "#1b2620" : "#1d2420"); this.m.shell.color.set(dark ? "#26302b" : "#46524b");
  }
  lines(q, mat) { const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(q, 3)); return new T.LineSegments(g, mat); }
  // ---- static shells
  shell(g, y0, y1, tile, tex) {
    const { wl, wr, wt, zb, zf } = G, h = y1 - y0, b = new Build(), m = this.m;
    b.box(m.shell, wl - wt, y0, zb - wt, wr - wl + 2 * wt, h, wt); b.box(m.shell, wl - wt, y0, zb, wt, h, zf - zb - .02); b.box(m.shell, wr, y0, zb, wt, h, zf - zb - .02);
    b.box(m.ink, wl - wt, y0, zf - .02, wt, h, .02); b.box(m.ink, wr, y0, zf - .02, wt, h, .02);
    for (const y of [y0, y1 - .012]) { b.box(m.ink, wl - wt, y, zb - wt, wr - wl + 2 * wt, .012, wt); b.box(m.ink, wl - wt, y, zb, wt, .012, zf - zb); b.box(m.ink, wr, y, zb, wt, .012, zf - zb); }
    for (const x of [-G.rail, G.rail]) { b.box(m.steel, x - .045, y0, -.012, .09, h, .024); b.box(m.steel, x - .012 * 1, y0, -.06, .024, h, .12); }
    for (const x of [G.cw - .3, G.cw + .3]) { b.box(m.dsteel, x - .03, y0, -.01, .06, h, .02); b.box(m.dsteel, x - .01, y0, -.045, .02, h, .09); }
    b.done(g);
    this.edge ||= new T.LineBasicMaterial({ color: "#efeadb", transparent: true, opacity: 0 });
    { const q = [], r = (x0, x1) => q.push(x0, y0, zf, x0, y1, zf, x1, y0, zf, x1, y1, zf, x0, y0, zf, x1, y0, zf, x0, y1, zf, x1, y1, zf); r(wl - wt, wl); r(wr, wr + wt); for (const y of [y0, y1]) q.push(wl, y, zf, wl, y, zb, wl, y, zb, wr, y, zb, wr, y, zb, wr, y, zf, wr + wt, y, zf, wr + wt, y, zb - wt); q.push(wr + wt, y0, zb - wt, wr + wt, y1, zb - wt); g.add(this.lines(q, this.edge)); }
    const pl = (w, x, z, ry) => { const q = new T.PlaneGeometry(w, h), u = q.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, (u.getX(i) * w) / this.brick.w, (u.getY(i) * h) / this.brick.h); const me = new T.Mesh(q, tex); me.position.set(x, (y0 + y1) / 2, z); me.rotation.y = ry; me.receiveShadow = true; g.add(me); return me; };
    const e = .004; pl(wr - wl, (wl + wr) / 2, zb + e, 0); pl(zf - zb - .02, wl + e, (zb + zf - .02) / 2, Math.PI / 2); pl(zf - zb - .02, wr - e, (zb + zf - .02) / 2, -Math.PI / 2);
  }
  build() {
    const s = this.scene, m = this.m, root = this.root = new T.Group(); s.add(root);
    this.top = new T.Group(); this.mid = new T.Group(); this.pit = new T.Group(); root.add(this.top, this.mid, this.pit);
    this.shell(this.pit, 0, G.Pb, 0, m.tileP); this.midA = new T.Group(); this.midB = new T.Group(); this.mid.add(this.midA, this.midB); this.shell(this.midA, 0, G.Hm, 1, m.tile); this.shell(this.midB, 0, 9.1, 1, m.tile); this.setTall(false); this.shell(this.top, G.Ta, 45.2, 0, m.tileT);
    // pit floor
    { const b = new Build(); b.box(m.ink, G.wl - G.wt, G.base, G.zb - G.wt, G.wr - G.wl + 2 * G.wt, -G.base, G.zf - G.zb + G.wt); b.box(m.conc, G.wl, 0, G.zb, G.wr - G.wl, .015, G.zf - G.zb - .02); b.done(this.pit); const a = G.wl - G.wt, c = G.wr + G.wt, z = G.zf; this.pit.add(this.lines([a, G.base, z, c, G.base, z, a, G.base, z, a, 0, z, c, G.base, z, c, 0, z, G.wl, 0, z, G.wr, 0, z, c, G.base, z, c, G.base, G.zb - G.wt], this.edge)); }
    this.modules(); this.machineRoom(); this.governor(); this.buffers(); this.makeCar(); this.makeCw(); this.makeRopes(); this.riders = []; this.makeSparks();
    // red ends
    const tip = new T.InstancedMesh(new T.SphereGeometry(.036, 12, 8), m.red, 28); tip.frustumCulled = false; root.add(tip); this.tips = tip; this.tipN = 0;
    const hb = this.halo = []; const ht = blob(); for (let i = 0; i < 3; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: ht, color: "#ffd58a", transparent: true, depthWrite: false, depthTest: false, opacity: 0, toneMapped: false })); sp.renderOrder = -1; root.add(sp); hb.push(sp); }
  }
  clipM(base) { const c = base.clone(); c.clippingPlanes = this.clipMid; c.clipShadows = true; return c; }
  modules() {
    const m = this.m; this.clipMid = [new T.Plane(V3(0, 1, 0), 0), new T.Plane(V3(0, -1, 0), 0)]; const cm = {}; for (const k of ["ink", "shell", "conc", "door", "brass", "iron", "steel", "dsteel", "cream"]) cm[k] = this.clipM(m[k]);
    this.mods = [];
    for (let j = 0; j < 4; j++) {
      const g = new T.Group(), b = new Build(), z = G.zb + .006;
      // landing door, frame, sill, floor beam
      b.box(cm.iron, -.74, 0, z, 1.48, 2.3, .05, .008); for (const q of [-1, 1]) { const x = q < 0 ? -.63 : .015; b.box(cm.door, x, 0, z + .03, .615, 2.17, .045, .008); b.box(cm.door, x + .09, 1.12, z + .07, .435, .86, .02, .006); b.box(cm.door, x + .09, .2, z + .07, .435, .72, .02, .006); b.box(cm.brass, q < 0 ? -.075 : .045, .98, z + .07, .03, .2, .03); }
      b.box(cm.conc, -.8, -.1, z, 1.6, .1, .13); b.box(cm.steel, -.72, -.015, z, 1.44, .016, .15);
      b.box(cm.conc, G.wl, -.38, z, G.wr - G.wl, .28, .02);
      // slabs going out left and right: cut faces
      for (const [x, w] of [[G.wl - G.wt - .62, .62], [G.wr + G.wt, .62]]) { b.box(cm.ink, x, -.3, G.zb - G.wt, w, .3, G.zf - G.zb + G.wt); b.box(cm.conc, x, -.002, G.zb - G.wt, w, .012, G.zf - G.zb + G.wt - .012); }
      for (const dy of [.2, 1.95]) { for (const q of [-1, 1]) { const x0 = q < 0 ? G.wl : G.rail + .02, x1 = q < 0 ? -G.rail - .02 : G.rail + .16; b.box(cm.iron, x0, dy, -.14, x1 - x0, .09, .03); b.box(cm.iron, x0, dy, -.14, .03, .09, .28); } b.box(cm.iron, G.cw + .3, dy + .5, -.1, G.wr - G.cw - .3, .07, .03); }
      b.done(g); { const em = this.edgeC ||= Object.assign(this.edge.clone(), { clippingPlanes: this.clipMid }), q = [], z = G.zf, zz = G.zb - G.wt; for (const [a, c] of [[G.wl - G.wt - .62, G.wl - G.wt], [G.wr + G.wt, G.wr + G.wt + .62]]) { q.push(a, -.3, z, c, -.3, z, a, .012, z, c, .012, z, a, -.3, z, a, .012, z, c, -.3, z, c, .012, z); if (c > 0) q.push(c, .012, z, c, .012, zz, c, -.3, z, c, -.3, zz, c, -.3, zz, c, .012, zz); } g.add(this.lines(q, em)); }
      const pm = new T.MeshStandardMaterial({ transparent: true, roughness: .6, clippingPlanes: this.clipMid, depthWrite: false }), num = new T.Mesh(new T.PlaneGeometry(.36, .36), pm); num.position.set(-1.28, 1.42, G.zb + .02); g.add(num); g.userData = { num, f: -1 };
      this.mid.add(g); this.mods.push(g);
    }
    this.nums = []; this.numTex = f => this.nums[f] ||= words(String(f));
    // extra door of the 12th floor head / pit ladder
    const b = new Build(); for (let i = 0; i < 5; i++) b.box(m.iron, -1.05, .2 + i * .3, G.zb + .05, .34, .025, .025); b.box(m.iron, -1.06, .05, G.zb + .04, .025, 1.6, .03); b.box(m.iron, -.73, .05, G.zb + .04, .025, 1.6, .03); b.done(this.pit);
  }
  machineRoom() {
    const m = this.m, y = G.MR, g = this.top, b = new Build(), x0 = -2.05, x1 = 2.95, z0 = -2.15, z1 = G.zf + .42;
    // slab with three slots
    const slots = [[G.gB - .12, G.gA + .12, -.2, .2], [-.44, .42, -.45, .45], [G.cw - .22, G.cw + .24, -.45, .45]], yS = y - .3;
    b.box(m.conc, x0, yS, z0, x1 - x0, .3, -.45 - z0); b.box(m.conc, x0, yS, .45, x1 - x0, .3, z1 - .45 - .02); b.box(m.ink, x0, yS, z1 - .02, x1 - x0, .3, .02); b.box(m.ink, x0 - .012, yS, z0, .012, .3, z1 - z0); b.box(m.ink, x1, yS, z0, .012, .3, z1 - z0); b.box(m.ink, x0, yS - .012, z0, G.wl - G.wt - x0, .012, z1 - z0); b.box(m.ink, G.wr + G.wt, yS - .012, z0, x1 - G.wr - G.wt, .012, z1 - z0);
    let x = x0; for (const [a, c] of slots) { b.box(m.conc, x, yS, -.45, a - x, .3, .9); x = c; } b.box(m.conc, x, yS, -.45, x1 - x, .3, .9);
    // walls: low dado in green, white above, cut edges in ink
    const H = 2.3; b.box(m.shell, x0, y, z0 - .2, x1 - x0, H, .2); b.box(m.shell, x0, y, z0, .2, H, 1.05); b.box(m.ink, x0 - .0, y + H, z0 - .2, x1 - x0, .012, .2); b.box(m.ink, x0, y + H, z0, .2, .012, 1.05); b.box(m.ink, x0, y, z0 + 1.05, .2, H + .012, .012); b.box(m.ink, x1, y, z0 - .2, .012, H + .012, .2);
    b.box(m.cream, x0 + .2, y + .9, z0, x1 - x0 - .2, H - .9, .012); b.box(m.green2, x0 + .2, y, z0, x1 - x0 - .2, .9, .014); b.box(m.cream, x0 + .2, y + .9, z0, .012, H - .9, 1.05); b.box(m.green2, x0 + .2, y, z0, .014, .9, 1.05); b.box(m.ink, x0 + .2, y + .9, z0 + .014, x1 - x0 - .2, .025, .006);
    g.add(this.lines([x0, y, z1, x1, y, z1, x0, yS, z1, x1, yS, z1, x0, yS, z1, x0, y, z1, x1, yS, z1, x1, y, z1, x1, y, z1, x1, y, z0 - .2, x1, yS, z1, x1, yS, z0, x0, y + H + .012, z0, x1, y + H + .012, z0, x1, y, z0, x1, y + H, z0, x0, y, z0 + 1.06, x0, y + H, z0 + 1.06, x0 + .2, y, z0 + 1.06, x0 + .2, y + H, z0 + 1.06, x0, y + H + .012, z0 + 1.06, x0 + .2, y + H + .012, z0 + 1.06], this.edge));
    b.box(m.green2, -.47, 45.12, -.1, .92, .06, .2, .008); for (let i = 0; i < 6; i++) b.cyl(m.brass, kOf(i) * G.xh, 45.14, 0, .04, .1);
    // bed
    for (const z of [.36, -.46]) { b.box(m.iron, -.5, y, z, 2.3, .04, .16); b.box(m.iron, -.5, y + .18, z, 2.3, .04, .16); b.box(m.iron, -.5, y, z + .065, 2.3, .2, .03); }
    for (const q of [-.5, 1.72]) b.box(m.iron, q, y + .02, -.46, .08, .18, .98);
    // drive wheel bearing + pedestal behind the wheel
    const cx = G.R, cy = G.SY;
    b.extrude(m.green, poly([[-.42, -.88], [-.16, .02], [-.12, .13], [.12, .13], [.16, .02], [.42, -.88]]), .14, M4(cx, cy, -.56), .012); b.cyl(m.brass, cx, cy, -.5, .13, .2, "z"); b.cyl(m.dsteel, cx, cy, -.7, .07, 1.9, "z");
    // deflector brackets
    b.extrude(m.green, poly([[-.2, -.36], [-.07, .05], [.07, .05], [.2, -.36]]), .05, M4(G.EX, G.DY, -.42), .008); b.cyl(m.dsteel, G.EX, G.DY, -.02, .045, .84, "z");
    b.done(g);
    // motor (own materials so it can glow)
    const gm = this.glowMat(m.green, "motor"), gm2 = this.glowMat(m.green2, "motor"), gc = this.glowMat(m.copper, "motor"), gb = this.glowMat(m.brass, "motor"), c = new Build(), mz = -1.55, R = .84;
    c.cyl(gm, cx, cy, mz, R, .62, "z", R, 56); for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; c.add(new T.BoxGeometry(.04, .05, .58), gm2, M4(cx + Math.cos(a) * (R + .015), cy + Math.sin(a) * (R + .015), mz, 0, 0, a + Math.PI / 2)); }
    c.lathe(gm, [[.0, .12], [.3, .12], [.34, .06], [R - .06, .02], [R + .03, 0], [R + .03, -.06]].reverse(), cx, cy, mz + .31, "z", 56); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .3; c.extrude(m.black, holeShape(.42, .7, .72), .02, M4(cx, cy, mz + .365, 0, 0, a)); c.cyl(gb, cx + Math.cos(a - .5) * .79, cy + Math.sin(a - .5) * .79, mz + .37, .032, .06, "z", .032, 10); }
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; c.add(new T.TorusGeometry(.05, .016, 6, 10), gc, M4(cx + Math.cos(a) * .56, cy + Math.sin(a) * .56, mz + .34, 0, 0, a)); }
    c.box(gm, cx - .75, y, mz - .28, 1.5, .34, .56, .02); c.box(gm, cx - .95, y, mz - .3, 1.9, .08, .6, .01); c.add(new T.TorusGeometry(.09, .022, 8, 20), m.iron, M4(cx, cy + R + .1, mz, 0, Math.PI / 2, 0)); c.box(gm2, cx + .62, cy - .42, mz - .1, .34, .3, .34, .015);
    this.motorG = c.done(g);
    // control board
    const d = new Build(), bx = 2.12, by = y + .28, bz = -1.5; d.box(m.iron, bx - .02, y, bz - .05, .05, 1.95, .05); d.box(m.iron, bx + .67, y, bz - .05, .05, 1.95, .05); d.box(m.slate, bx, by, bz, .7, 1.6, .05, .01);
    for (let i = 0; i < 2; i++) { d.cyl(m.brass, bx + .19 + i * .32, by + 1.38, bz + .07, .125, .04, "z"); d.cyl(m.cream, bx + .19 + i * .32, by + 1.38, bz + .09, .105, .02, "z"); d.rod(m.black, [bx + .19 + i * .32, by + 1.33, bz + .105], [bx + .23 + i * .32, by + 1.44, bz + .105], .006); }
    for (let i = 0; i < 3; i++) { const X = bx + .15 + i * .2; d.box(m.brass, X - .035, by + .66, bz + .05, .07, .07, .05); d.box(m.brass, X - .035, by + 1.0, bz + .05, .07, .07, .05); d.box(m.copper, X - .012, by + .7, bz + .08, .024, .36, .018); d.box(m.black, X - .02, by + 1.06, bz + .08, .04, .12, .04); }
    for (let i = 0; i < 4; i++) { d.cyl(m.copper, bx + .13 + i * .15, by + .36, bz + .1, .05, .16, "y"); d.box(m.iron, bx + .08 + i * .15, by + .46, bz + .05, .1, .03, .1); } d.box(m.brass, bx + .06, by + .16, bz + .05, .58, .025, .02); d.box(m.brass, bx + .06, by + .1, bz + .05, .58, .025, .02); d.done(g);
    // leads: whole and cut
    const mk = (cut) => { const e = new Build(); for (let i = 0; i < 3; i++) { const A = [cx + .94, cy - .34 + i * .09, mz + .05 + i * .06], Z = [bx + .12 + i * .2, by + .12, bz + .08], mid = [bx - .35, y + .34 + i * .05, -1.36 + i * .05]; if (!cut) e.tube(m.hard, [A, [A[0] + .22, A[1] - .06, A[2]], mid, [Z[0], Z[1] - .12, Z[2] + .05], Z], .028, 30); else { e.tube(m.hard, [A, [A[0] + .16, A[1] - .02, A[2]], [A[0] + .22, A[1] - .2 - i * .05, A[2] + .05], [A[0] + .2, A[1] - .34 - i * .06, A[2] + .1]], .028, 18); e.ball(m.red, A[0] + .2, A[1] - .36 - i * .06, A[2] + .1, .04, 10); e.tube(m.hard, [Z, [Z[0], Z[1] - .12, Z[2] + .05], [Z[0] - .16, y + .06, Z[2] + .18 + i * .06], [Z[0] - .34 - i * .08, y + .04, Z[2] + .25 + i * .06]], .028, 18); e.ball(m.red, Z[0] - .36 - i * .08, y + .04, Z[2] + .25 + i * .06, .04, 10); } } return e.done(g); };
    this.leads = mk(false); this.leadsCut = mk(true); this.leadsCut.visible = false; this.leadAt = V3(bx - .33, y + .42, -1.32);
    // brake: drum turns with the wheel, shoes hinge at the foot, springs on top
    const dz = -.79, dr = .6; this.drum = new T.Group(); this.drum.position.set(cx, cy, 0); g.add(this.drum);
    { const e = new Build(), bs = this.glowMat(m.steel, "brake"); e.lathe(bs, [[.16, -.1], [dr - .04, -.1], [dr, -.09], [dr, .09], [dr - .04, .1], [.16, .1]], 0, 0, dz, "z", 64); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; e.cyl(m.iron, Math.cos(a) * .42, Math.sin(a) * .42, dz + .1, .05, .02, "z"); } e.done(this.drum); }
    this.shoes = []; for (const q of [-1, 1]) { const h = new T.Group(); h.position.set(cx + q * (dr - .12), cy - dr - .14, 0); g.add(h); const e = new Build(), am = this.glowMat(m.green2, "brake"), lm = this.glowMat(m.black, "brake"); e.base.makeTranslation(-q * (dr - .12), dr + .14, 0); e.extrude(am, ring(dr + .16, dr + .05, q > 0 ? -.62 : Math.PI - .62, q > 0 ? .62 : Math.PI + .62), .17, M4(0, 0, dz - .085), .01); e.extrude(lm, ring(dr + .052, dr + .006, q > 0 ? -.55 : Math.PI - .55, q > 0 ? .55 : Math.PI + .55), .19, M4(0, 0, dz - .095)); e.rod(am, [q * (dr - .12), -dr - .14, dz], [q * (dr + .1), -.34, dz], .06); e.rod(am, [q * (dr + .1), .3, dz], [q * .42, dr + .3, dz], .05); e.box(am, q * .42 - .05, dr + .16, dz - .08, .1, .26, .16, .01); e.done(h); this.shoes.push(h); }
    { const e = new Build(); for (const q of [-1, 1]) e.box(m.iron, cx + q * (dr - .12) - .1, y, dz - .1, .2, cy - dr - .14 - y + .05, .2); e.done(g); }
    this.springs = new T.Group(); this.springs.position.set(cx, cy + dr + .29, dz); g.add(this.springs); { const e = new Build(), sb = this.glowMat(m.brass, "brake"); e.cyl(m.steel, 0, 0, 0, .022, 1.5, "x"); e.box(sb, -.14, -.12, -.12, .28, .24, .24, .02); for (const q of [-1, 1]) { e.tube(sb, helix(q * .6, 0, 0, .075, .22, 6), .016, 110, 6); e.cyl(m.iron, q * .72, 0, 0, .09, .03, "x"); } e.done(this.springs); }
    { this.springBits = new T.Group(); this.springBits.visible = false; g.add(this.springBits); const e = new Build(); for (const q of [-1, 1]) e.tube(m.red, helix(0, 0, q * .2, .075, .34, 6), .016, 110, 6); e.done(this.springBits); }
    // wheel
    this.wheel = new T.Group(); this.wheel.position.set(cx, cy, 0); g.add(this.wheel);
    { const e = new Build(), br = this.glowMat(m.brass, "wheel"), bd = this.glowMat(m.brassD, "wheel"), pr = [], W = 6 * G.zs / 2 + .03; pr.push([G.R - .1, -W], [G.R + .045, -W]); for (let i = 0; i < 6; i++) { const z = kOf(i) * G.zs; pr.push([G.R + .045, z - .052], [G.R + .012, z - .036], [G.R - .012, z], [G.R + .012, z + .036], [G.R + .045, z + .052]); } pr.push([G.R + .045, W], [G.R - .1, W], [G.R - .1, -W]);
      e.lathe(br, pr, 0, 0, 0, "z", 72); e.extrude(br, web(G.R - .07, .13, 5), .06, M4(0, 0, W - .13), .008); e.cyl(br, 0, 0, W - .04, .13, .2, "z"); e.cyl(bd, 0, 0, W + .07, .07, .04, "z"); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; e.cyl(m.iron, Math.cos(a) * .1, Math.sin(a) * .1, W + .065, .014, .03, "z", .014, 6); } e.box(m.red, -.011, G.R - .035, W - .004, .022, .07, .012); e.done(this.wheel); }
    this.defl = new T.Group(); this.defl.position.set(G.EX, G.DY, 0); g.add(this.defl);
    { const e = new Build(), W = 6 * G.zs / 2 + .02; e.lathe(m.steel, [[G.r - .05, -W], [G.r + .03, -W], [G.r + .03, W], [G.r - .05, W], [G.r - .05, -W]], 0, 0, 0, "z", 48); e.lathe(m.dsteel, [[G.r - .012, -W + .03], [G.r + .031, -W + .03], [G.r + .031, W - .03], [G.r - .012, W - .03]], 0, 0, 0, "z", 48); e.extrude(m.dsteel, web(G.r - .03, .06, 4, .3), .04, M4(0, 0, W - .08), .004); e.cyl(m.dsteel, 0, 0, W - .04, .06, .1, "z"); e.done(this.defl); }
    // lamp
    const l = new Build(), lx = -.75, lz = -1.0; l.rod(m.black, [lx, y + 2.9, lz - 1.1], [lx, y + 2.9, lz], .016); l.rod(m.black, [lx, y, z0 + .06], [lx, y + 2.9, z0 + .06], .022); l.rod(m.black, [lx, y + 2.9, lz], [lx, y + 2.62, lz], .008); l.lathe(m.green, [[.03, .2], [.06, .16], [.26, 0], [.25, -.005], [.05, .14]], lx, y + 2.45, lz); l.ball(m.lamp, lx, y + 2.48, lz, .07); l.done(g); this.mrL0 = V3(lx + .1, y + 2.3, lz + .5);
  }
  governor() {
    const m = this.m, g = this.top, y = G.MR, x = (G.gA + G.gB) / 2, r = (G.gA - G.gB) / 2, wy = y + .4; this.gov = { wy, x, r };
    const ir = this.glowMat(m.green, "gov"), br = this.glowMat(m.brass, "gov"), st = this.glowMat(m.steel, "gov"), b = new Build();
    b.extrude(ir, poly([[-.26, -.4], [-.07, .04], [.07, .04], [.26, -.4]]), .05, M4(x, wy, -.2), .008); b.extrude(ir, poly([[-.26, -.4], [-.07, .04], [.07, .04], [.26, -.4]]), .05, M4(x, wy, .13), .008); b.box(ir, x - .32, y, -.24, .64, .05, .5, .01); b.cyl(m.dsteel, x, wy, 0, .03, .46, "z"); b.done(g);
    this.gwheel = new T.Group(); this.gwheel.position.set(x, wy, 0); g.add(this.gwheel); { const e = new Build(); e.lathe(br, [[r - .05, -.045], [r + .03, -.045], [r + .03, -.03], [r - .005, 0], [r + .03, .03], [r + .03, .045], [r - .05, .045], [r - .05, -.045]], 0, 0, 0, "z", 40); e.extrude(br, web(r - .03, .035, 4, .3), .03, M4(0, 0, -.015)); e.done(this.gwheel); }
    // upper stand holding the spindle
    this.gtop = new T.Group(); this.gtop.position.set(x, wy + .1, -.0); g.add(this.gtop);
    { const e = new Build(); e.box(ir, -.11, .02, -.16, .22, .1, .32, .01); e.cyl(br, 0, .16, 0, .055, .1); e.cyl(st, 0, .62, 0, .016, 1.0); e.ball(br, 0, 1.13, 0, .04); e.done(this.gtop); }
    this.gspin = new T.Group(); this.gtop.add(this.gspin); this.garms = []; this.L = .4;
    { const e = new Build(); e.cyl(br, 0, 1.06, 0, .055, .07); e.done(this.gspin); }
    for (const q of [0, 1]) { const h = new T.Group(); h.rotation.y = q * Math.PI; this.gspin.add(h); const a = new T.Group(); a.position.set(.04, 1.06, 0); h.add(a); const e = new Build(); e.rod(st, [0, 0, 0], [0, -.44, 0], .016); e.ball(br, 0, -.47, 0, .098, 28); e.ball(br, 0, 0, 0, .03, 12); e.done(a); const l = new T.Group(); h.add(l); const e2 = new Build(); e2.rod(st, [0, 0, 0], [0, 1, 0], .012); e2.done(l); this.garms.push({ a, l }); }
    this.gslide = new T.Group(); this.gspin.add(this.gslide); { const e = new Build(); e.lathe(br, [[.02, -.05], [.09, -.05], [.09, -.02], [.05, 0], [.05, .04], [.02, .04]], 0, 0, 0); e.done(this.gslide); }
    // jaw that grips the thin rope
    this.gjaw = new T.Group(); g.add(this.gjaw); { const e = new Build(), jw = this.glowMat(m.iron, "gov"); e.box(jw, .03, -.07, -.07, .13, .14, .14, .012); e.box(br, .02, -.05, -.05, .015, .1, .1); e.done(this.gjaw); } { const e = new Build(), jw = m.iron; e.box(jw, G.gA - .1, wy - .3, -.07, .075, .14, .14, .01); e.done(g); }
    this.gball = new T.Mesh(new T.SphereGeometry(.098, 24, 16), m.red); this.gball.castShadow = true; this.gball.visible = false; g.add(this.gball);
    // pit wheel
    this.pwheel = new T.Group(); this.pwheel.position.set(x, .55, 0); this.pit.add(this.pwheel); { const e = new Build(); e.lathe(m.steel, [[r - .05, -.045], [r + .03, -.045], [r + .03, .045], [r - .05, .045], [r - .05, -.045]], 0, 0, 0, "z", 36); e.extrude(m.dsteel, web(r - .03, .035, 4, .3), .03, M4(0, 0, -.015)); e.done(this.pwheel); }
    { const e = new Build(); e.box(m.iron, x - .04, .08, -.1, .08, .5, .04); e.box(m.iron, x - .16, 0, -.13, .32, .14, .26, .01); e.done(this.pit); }
  }
  buffers() {
    const m = this.m; this.bufs = [];
    for (const [key, x, w] of [["buf", 0, .2], ["cwBuf", G.cw, .165]]) {
      const g = new T.Group(); g.position.set(x - w, .015, 0); this.pit.add(g); const b = new Build(), br = this.glowMat(m.brass, key), st = this.glowMat(m.steel, key), gr = this.glowMat(m.green, key); b.base.makeTranslation(w, 0, 0);
      b.lathe(gr, [[0, 0], [w + .1, 0], [w + .1, .05], [w * .75, .07], [w * .75, .62], [w * .86, .64], [w * .86, .7], [w * .4, .72]], 0, 0, 0); b.lathe(br, [[w * .76, .3], [w * .8, .31], [w * .8, .36], [w * .76, .37]], 0, 0, 0);
      const gb = b.done(g), hd = new T.Group(); g.add(hd); const c = new Build(); c.base.makeTranslation(w, 0, 0); c.cyl(st, 0, -.42, 0, w * .42, .82); c.lathe(gr, [[0, -.08], [w * .95, -.08], [w, -.06], [w, -.02], [w * .9, 0], [0, 0]], 0, 0, 0); c.done(hd);
      const sp = new T.Group(); g.add(sp); const d = new Build(); d.base.makeTranslation(w, 0, 0); d.tube(st, helix(0, .5, 0, w * .82, 1, 6, "y"), .026, 150, 7); d.done(sp);
      this.bufs.push({ key, g, hd, sp, w, x });
    }
  }
  makeCar() {
    const m = this.m, g = this.car = new T.Group(), b = new Build(), w = .9, H = 2.35, d = .72; this.root.add(g);
    // frame
    for (const q of [-1, 1]) { b.box(m.green, q < 0 ? -w - .075 : w - .0, -.14, -.07, .075, 3.02, .14, .008); for (const [yy, s] of [[-.12, 1], [2.76, 1]]) { b.box(m.iron, q * G.rail - .07, yy, -.1, .14, .14, .2, .01); b.cyl(m.brass, q * (G.rail - .09 * 0) - q * .03, yy + .2 * (yy > 0 ? 1 : 0) + .07, .0, .05, .07, "z"); } }
    b.box(m.green, -w - .075, 2.64, -.09, 2 * w + .15, .2, .05); b.box(m.green, -w - .075, 2.64, .04, 2 * w + .15, .2, .05); b.box(m.iron, -.5, 2.84, -.11, 1.0, .05, .22);
    b.rod(m.green2, [-w, 2.42, -.0], [-.35, 2.66, 0], .018); b.rod(m.green2, [w, 2.42, 0], [.35, 2.66, 0], .018);
    b.box(m.green, -w - .06, -.2, -d, 2 * w + .12, .14, 2 * d, .01); b.box(m.iron, -w + .1, -.3, -.08, 2 * w - .2, .1, .16); b.box(m.iron, -.16, -.4, -.16, .32, .1, .32, .012);
    // shell
    b.box(m.iron, -w, H, -d, 2 * w, .06, 2 * d, .01); b.box(m.brass, -w, H - .05, d - .03, 2 * w, .05, .03); b.box(m.brass, -w, -.06, d - .01, 2 * w, .06, .02);
    b.box(m.wood, -w, 0, -d, .035, H, 2 * d - .02); b.box(m.wood, w - .035, 0, -d, .035, H, 2 * d - .02); for (const q of [-1, 1]) b.box(m.brass, q < 0 ? -w : w - .04, 0, d - .04, .04, H - .05, .03);
    b.box(m.wood, -w, 0, -d, .3, H, .03); b.box(m.wood, w - .3, 0, -d, .3, H, .03); b.box(m.wood, -w, 2.1, -d, 2 * w, H - 2.1, .03); for (const q of [0, 1]) { b.box(m.wood, q ? .008 : -.6, 0, -d + .0, .592, 2.1, .03); b.box(m.brass, q ? .02 : -.05, .95, -d + .03, .03, .22, .02); b.box(m.brassD, (q ? .008 : -.6) + .08, 1.15, -d + .03, .432, .78, .006); b.box(m.wood, (q ? .008 : -.6) + .095, 1.165, -d + .03, .402, .75, .012); b.box(m.brassD, (q ? .008 : -.6) + .08, .2, -d + .03, .432, .78, .006); b.box(m.wood, (q ? .008 : -.6) + .095, .215, -d + .03, .402, .75, .012); }
    for (const q of [-1, 1]) { b.rod(m.brass, [q * (w - .09), .92, -d + .1], [q * (w - .09), .92, d - .12], .02); for (const z of [-d + .15, d - .16]) b.rod(m.brass, [q * (w - .03), .92, z], [q * (w - .09), .92, z], .012); }
    b.box(m.brass, w - .045, 1.15, -.2, .014, .42, .16); for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) b.ball(m.cream, w - .05, 1.2 + i * .062, -.16 + j * .075, .016, 8);
    b.box(m.cream, -w + .03, H - .012, -d + .03, 2 * w - .06, .012, 2 * d - .06);
    b.done(g);
    this.gap = new T.Group(); this.gap.position.set(0, 0, -d + .07); g.add(this.gap); { const e = new Build(); e.box(m.conc, -.36, .02, 0, .72, .98, .02); e.box(m.shell, -.36, .94, 0, .72, .08, .03); e.box(m.black, -.36, 1.02, 0, .72, 1.06, .02); e.box(m.wood, -.5, .02, .0, .14, 2.06, .05); e.box(m.wood, .36, .02, .0, .14, 2.06, .05); e.box(m.brass, -.37, .02, .02, .02, 2.06, .05); e.box(m.brass, .35, .02, .02, .02, 2.06, .05); e.done(this.gap); } this.gap.visible = false;
    const fl = new Build(); fl.box(m.floor, -w, -.01, -d, 2 * w, .012, 2 * d); fl.done(g, { cast: false });
    this.carLamp = this.m.lamp.clone(); { const e = new Build(); e.lathe(m.brass, [[0, 0], [.22, 0], [.22, -.03], [.19, -.035]], 0, H - .01, 0); e.lathe(this.carLamp, [[.19, -.02], [.17, -.06], [.1, -.085], [0, -.095]], 0, H - .01, 0); e.done(g, { cast: false }); }
    // hitch springs + plate
    { const e = new Build(), hm = this.glowMat(m.brass, "ropes"); for (let i = 0; i < 6; i++) { const x = kOf(i) * G.xh; e.cyl(m.steel, x, 2.98, 0, .014, .24); e.tube(hm, helix(x, 2.965, 0, .042, .13, 4, "y"), .011, 60, 5); e.cyl(m.iron, x, 3.04, 0, .046, .02); e.cyl(m.iron, x, 3.1, 0, .026, .06, "y", .034); } e.done(g); }
    // lever from the thin rope + rod under the floor
    this.lever = new T.Group(); this.lever.position.set(-w - .06, 1.02, 0); g.add(this.lever); { const e = new Build(), lm = this.glowMat(m.brass, "govRope"); e.rod(lm, [0, 0, 0], [G.gA + w + .06 + .03, .0, 0], .024); e.ball(lm, G.gA + w + .06 + .0, 0, 0, .05, 14); e.cyl(lm, 0, 0, 0, .05, .06, "z"); e.done(this.lever); }
    this.link = new T.Group(); g.add(this.link); { const e = new Build(); e.rod(m.steel, [-w - .13, -.2, 0], [-w - .13, 1.0, 0], .014); e.done(this.link); }
    { const e = new Build(); e.rod(m.steel, [-w - .13, -.26, -.12], [w + .13, -.26, -.12], .02); e.done(g); }
    // clamps
    this.jaws = []; for (const q of [-1, 1]) { const key = q < 0 ? "jawL" : "jawR", h = new T.Group(); h.position.set(q * G.rail, -.36, 0); g.add(h); const bl = this.glowMat(m.iron, key), br = this.glowMat(m.brass, key), e = new Build(); e.box(bl, -.17, -.12, -.16, .34, .05, .32, .006); e.box(bl, -.17, .13, -.16, .34, .05, .32, .006); for (const p of [-1, 1]) e.add(wedgeGeo(p, .0), bl, M4(0, 0, 0)); e.done(h); const ws = []; for (const p of [-1, 1]) { const k = new T.Group(); h.add(k); const e2 = new Build(); e2.add(wedgeGeo(p, 1), br, M4(0, 0, 0)); e2.done(k); ws.push(k); } this.jaws.push({ key, h, ws, q }); }
  }
  makeCw() {
    const m = this.m; this.cws = [];
    for (let j = 0; j < 3; j++) { const pl = [new T.Plane(V3(0, 1, 0), 0), new T.Plane(V3(0, -1, 0), 0)], mk = b => { const c = b.clone(); c.clippingPlanes = pl; c.clipShadows = true; return c; }, ir = mk(m.iron), a = mk(m.dsteel), st = mk(m.shell), br = mk(m.brass); a.color.set("#4a504c"); a.metalness = .5; a.roughness = .6; st.color.set("#5a605b"); st.roughness = .65; (this.lit.cw ||= []).push(...[ir, a, st].map(q => ({ m: q, e: q.emissive.clone(), i: 1 })));
      const g = new T.Group(), b = new Build(), w = .235, h = P.cwH, d = .4; for (const q of [-1, 1]) b.box(ir, q < 0 ? -w - .03 : w - .03, 0, -.1, .06, h - .1, .2, .006); b.box(ir, -w - .03, 0, -.12, 2 * w + .06, .12, .24, .008); b.box(ir, -w - .03, h - .28, -.12, 2 * w + .06, .14, .24, .008);
      for (let i = 0; i < 12; i++) b.box(i % 2 ? a : st, -w + .025, .13 + i * .222, -d, 2 * w - .05, .214, 2 * d, .012); for (const q of [-1, 1]) for (const yy of [.04, h - .22]) b.box(br, q * .3 - .045, yy, -.07, .09, .12, .14, .006); for (let i = 0; i < 6; i++) b.cyl(br, 0, h - .06, kOf(i) * G.zs * .9, .024, .18); b.done(g); this.root.add(g); this.cws.push({ g, pl }); }
  }
  makeRopes() {
    const m = this.m, r = .021; this.rp = []; for (let i = 0; i < 6; i++) { const mat = this.glowMat(m.rope, "rope" + i); this.rp.push({ top: new Rope(mat, 64, r, this.root), mid: new Rope(mat, 20, r, this.root), cw: new Rope(mat, 12, r, this.root), stub: new Rope(mat, 16, r, this.root), tail: new Rope(mat, 14, r, this.root) }); }
    const gm = this.glowMat(m.gov, "govRope"); this.gr = [0, 1, 2, 3, 4, 5].map(() => new Rope(gm, 18, .015, this.root, 6));
  }
  makeSparks() { const n = 90, g = new T.BufferGeometry(); this.sp = { n, p: new Float32Array(n * 3).fill(-99), v: new Float32Array(n * 3), life: new Float32Array(n), i: 0 }; g.setAttribute("position", new T.BufferAttribute(this.sp.p, 3)); const q = new T.Points(g, this.m.spark); q.frustumCulled = false; this.root.add(q); this.sp.g = g; }
  spark(x, y, z, k = 2) { if (this.calm) return; const s = this.sp; for (let q = 0; q < k; q++) { const i = s.i++ % s.n; s.p.set([x, y, z], i * 3); s.v.set([(Math.random() - .5) * 2.2, 1.2 + Math.random() * 2.6, Math.random() * 1.6], i * 3); s.life[i] = .25 + Math.random() * .35; } }
  setRiders(n) {
    const m = this.m; for (const r of this.riders) this.car.remove(r.g); this.riders = []; const rows = n > 8 ? 3 : n > 3 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const row = i % rows, k = Math.floor(i / rows), per = Math.ceil((n - row) / rows), h = 1.48 + ((i * 37) % 7) * .045, g = new T.Group(), b = new Build(), coat = this.coats ||= COATS.map(c => new T.MeshStandardMaterial({ color: c, roughness: .55 })), c = coat[(i * 3) % 7], kS = h / 1.6;
      b.base.makeScale(kS, kS, kS); b.lathe(c, [[0, 0], [.185, 0], [.2, .015], [.205, .06], [.2, .3], [.185, .7], [.165, .95], [.13, 1.08], [.08, 1.14], [0, 1.15]], 0, 0, 0, "y", 36); b.lathe(m.beech, [[.0, 1.12], [.075, 1.13], [.07, 1.16], [.12, 1.19], [.165, 1.27], [.178, 1.36], [.165, 1.45], [.12, 1.52], [.06, 1.55], [0, 1.555]], 0, 0, 0, "y", 36); b.lathe(m.beech, [[.199, .34], [.204, .36], [.203, .4], [.197, .42]], 0, 0, 0, "y", 36);
      if (i % 3 === 0) b.lathe(m.black, [[0, 1.66], [.115, 1.655], [.125, 1.645], [.135, 1.48], [.235, 1.475], [.237, 1.46], [.13, 1.45]], 0, 0, 0, "y", 36); else if (i % 3 === 1) b.lathe(coat[(i * 3 + 2) % 7], [[0, 1.6], [.08, 1.59], [.15, 1.53], [.185, 1.43], [.18, 1.4], [.17, 1.4]], 0, 0, 0, "y", 36);
      b.done(g); const x = (per > 1 ? -.64 + (n > 3 ? 1.02 : .62) * k / (per - 1) : (n === 1 ? -.18 : -.2)) + (rows > 1 && row % 2 ? .09 : 0) * (per > 2 ? 1 : 0), z = rows === 1 ? (n === 1 ? .12 : .05 + (i % 2) * .12) : -.42 + row * (.86 / (rows - 1)); g.position.set(Math.max(-.68, Math.min(.68, x)), 0, z); this.car.add(g); this.riders.push({ g, off: 0, v: 0, rx: 0, rz: 0, wx: 0, wz: 0, h: h * 1.03, k: .6 + ((i * 31) % 9) / 10, sq: 0 });
    }
  }
  setTall(on) { this.tall = on; this.Hm = on ? 9.1 : G.Hm; this.midA.visible = !on; this.midB.visible = on; this.cReady = false; }
  // ---- mapping sim y -> display y
  map(c, dt, jump, lag) {
    const lo = G.Pb + this.Hm / 2, hi = G.Ta - this.Hm / 2; const h2 = this.Hm / 2; let want = c + (this.co ?? 1.36); if (this.tall) { want = !this.cReady || jump ? c - .62 + h2 : this.c; if (c - .5 < want - h2) want = c - .5 + h2; if (c + 3.25 > want + h2) want = c + 3.25 - h2; } want = Math.max(lo, Math.min(hi, want));
    if (!this.cReady || jump || Math.abs(want - this.c) > 6) { this.c = want; this.cReady = true; } else this.c += (want - this.c) * (lag ? 1 - Math.exp(-dt * 5) : 1);
    this.c = Math.max(lo, Math.min(hi, this.c)); this.gp = G.gap * sm(0, 1.2, this.c - lo); this.gt = G.gap * sm(0, 1.2, hi - this.c);
    this.m0 = G.Pb + this.gp; this.off = this.m0 + this.Hm / 2 - this.c; this.t0 = this.m0 + this.Hm + this.gt; this.offT = this.t0 - G.Ta; this.lo = this.c - this.Hm / 2; this.hi = this.c + this.Hm / 2;
    this.H = this.t0 + (G.roof - G.Ta);
  }
  Y(y) { return y < this.lo && y <= G.Pb ? y : y >= this.hi - 1e-6 && y >= G.Ta - 1e-6 ? y + this.offT : y + this.off; }
  // ---- frame
  update(sim, st, dt) {
    this.map(sim.y, dt, st.jump, sim.hand !== null); const m = this.m, now = st.now;
    this.mid.position.y = this.m0; this.top.position.y = this.offT; m.tile.map.offset.y = m.tile.bumpMap.offset.y = ((this.lo % this.brick.h) + this.brick.h) % this.brick.h / this.brick.h; { const o = (G.Ta % this.brick.h) / this.brick.h; m.tileT.map.offset.y = m.tileT.bumpMap.offset.y = o; }
    this.clipMid[0].constant = -this.m0 - .001; this.clipMid[1].constant = this.m0 + this.Hm - .001;
    const f0 = Math.floor((this.lo - P.y1) / P.floorH) + 1; for (let j = 0; j < 4; j++) { const g = this.mods[j], f = f0 + j, on = f >= 1 && f <= 12; g.visible = on; if (on) { g.position.y = floorY(f) - this.lo; if (g.userData.f !== f) { g.userData.f = f; g.userData.num.material.map = this.numTex(f); g.userData.num.material.needsUpdate = true; } } }
    const cy = this.Yc = sim.y + (sim.y + 1.5 < this.lo ? 0 : sim.y > this.hi ? this.offT : this.off); this.car.position.set(0, cy + (st.jolt || 0), 0); this.gap.visible = !!st.gap; this.gap.scale.x = Math.max(.02, st.gap || 0); this.car.rotation.z = (st.wreck || 0) * -.035;
    this.carL.position.set(0, cy + 1.95, .15); const fl = st.light ?? 1; this.carL.intensity = this.L.car * fl; this.carLamp.emissiveIntensity = 2.4 * fl; this.mrL.position.set(this.mrL0.x, this.mrL0.y + this.offT, this.mrL0.z); this.pitL.position.set(.6, 1.5, .9);
    // clamps, lever
    const set = sim.set ? 1 : 0; this.jk = (this.jk ?? 0) + (set - (this.jk ?? 0)) * (1 - Math.exp(-dt * 30)); for (const j of this.jaws) { const br = st.b[j.key]; j.h.visible = true; if (br != null) { const t = now - br, yy = Math.max(-6, -4.9 * t * t); j.h.position.y = -.36 + yy; j.h.rotation.z = j.q * t * 4; j.h.visible = t < 1.2; } else { j.h.position.y = -.36; j.h.rotation.z = 0; } j.ws.forEach((w, i) => { const p = i ? 1 : -1; w.position.set(p * (.026 - .054 * this.jk), -.03 + .09 * this.jk, 0); }); }
    const tr = sim.tripped || sim.set ? 1 : 0; this.lk = (this.lk ?? 0) + (tr - (this.lk ?? 0)) * (1 - Math.exp(-dt * 20)); this.lever.rotation.z = -this.lk * .42; this.link.position.y = this.lk * .07;
    // riders: the same gravity the car feels
    const geff = P.g + st.acc; for (const r of this.riders) {
      if (dt > 0) { r.v -= geff * dt * (r.off > 0 || geff < 0 ? 1 : 0); r.off += r.v * dt; const top = 2.3 - r.h; if (r.off <= 0) { if (r.v < -1) { r.sq = Math.min(.16, -r.v * .04); } r.off = 0; r.v = r.v < -1.2 ? -r.v * .22 : 0; r.wx *= .5; r.wz *= .5; } if (r.off > top) { r.off = top; if (r.v > 0) r.v = -r.v * .3; }
        if (r.off > .01 && Math.abs(r.wx) < .05) { r.wx = (Math.random() - .5) * 1.4; r.wz = (Math.random() - .5) * 1.4; } if (r.off > 0) { r.rx += r.wx * dt; r.rz += r.wz * dt; } else { const kk = Math.exp(-dt * 7); r.rx *= kk; r.rz *= kk; } if (!st.wreck) { r.rx = Math.max(-.5, Math.min(.5, r.rx)); r.rz = Math.max(-.5, Math.min(.5, r.rz)); } const load = Math.max(0, geff / P.g - 1.25); r.sq += (Math.min(.12, load * .07) - r.sq) * (1 - Math.exp(-dt * 10)); }
      if (st.wreck) { const w = st.wreck, side = r.g.position.x >= 0 ? 1 : -1, lone = this.riders.length === 1; r.rz += ((lone ? -1.56 : side * (.16 + .14 * r.k)) * -w - r.rz) * Math.min(1, dt * 9); r.rx *= .95; if (lone) { r.g.position.x += (.72 * w - r.g.position.x) * Math.min(1, dt * 6); r.off = Math.max(r.off, .185 * w); } } r.g.position.y = r.off + .002; r.g.rotation.set(r.rx, 0, r.rz); r.g.scale.set(1 + r.sq * .3, 1 - r.sq, 1 + r.sq * .3); }
    // counterweight: one clipped copy for each part of the model
    const zones = [[-1, this.gp > .01 ? G.Pb : this.lo, 0], [this.lo, this.hi, this.off], [this.gt > .01 ? G.Ta : this.hi, 99, this.offT]]; this.cws.forEach((c, j) => { const [a, b, o] = zones[j], vis = sim.w < b && sim.w + P.cwH > a; c.g.visible = vis; c.g.position.set(G.cw, sim.w + o, 0); c.pl[0].constant = -(a + o); c.pl[1].constant = b + o; if (st.cwTilt) c.g.rotation.z = st.cwTilt; else c.g.rotation.z = 0; });
    // machine
    this.wheel.rotation.z = -sim.th / G.R; this.drum.rotation.z = -sim.th / G.R; this.defl.rotation.z = -sim.xr / G.r;
    const open = st.b.brake != null ? Math.min(1, (now - st.b.brake) / .22) * .16 : st.brakeOpen * .03; this.shoes[0].rotation.z = open; this.shoes[1].rotation.z = -open; this.springs.visible = st.b.brake == null; this.springBits.visible = st.b.brake != null; if (st.b.brake != null) { const t = Math.min(1.1, now - st.b.brake), yy = Math.max(G.MR + .1, G.SY + .9 + 1.6 * t - 4.9 * t * t); this.springBits.position.set(G.R - .4 - Math.min(t, .62) * 1.2, yy, -.75 + Math.min(t, .62) * 1.6); this.springBits.rotation.set(t * 5, t * 3, t * 4); }
    this.leads.visible = st.b.motor == null; this.leadsCut.visible = st.b.motor != null;
    // speed watcher
    const gv = st.govV, sp = st.b.gov != null ? 0 : Math.min(1.12, (gv / P.vTrip) ** 2), want = .16 + sp * .92; this.gphi = (this.gphi ?? want) + (want - (this.gphi ?? want)) * (1 - Math.exp(-dt * 25)); const ph = this.gphi; this.gspin.rotation.y = st.govPh; this.gwheel.rotation.z = -st.gth / this.gov.r; this.pwheel.rotation.z = -st.gth / this.gov.r;
    const L2 = .3, hx = .04 + Math.sin(ph) * L2, hy = 1.06 - Math.cos(ph) * L2, sy = 1.06 - 2 * Math.cos(ph) * L2 + .02; this.gslide.position.y = sy; for (const { a, l } of this.garms) { a.rotation.z = ph; const dx = .05 - hx, dy = sy + .03 - hy, len = Math.hypot(dx, dy); l.position.set(hx, hy, 0); l.scale.y = len; l.rotation.z = Math.atan2(-dx, dy); }
    if (st.b.gov != null) { const t = Math.min(1, (now - st.b.gov) / .3); this.gtop.rotation.z = t * t * 1.15; this.gtop.rotation.x = t * .2; this.garms[1].a.visible = false; this.gball.visible = true; const q = Math.min(.8, now - st.b.gov); this.gball.position.set(this.gov.x + .1 - q * .7, Math.max(G.MR + .1, this.gov.wy + .7 + q - 4.9 * q * q), .1 + q * .7); } else { this.gtop.rotation.set(0, 0, 0); this.garms[1].a.visible = true; this.gball.visible = false; }
    this.gjaw.position.set(G.gA + (sim.tripped ? 0 : .05), this.gov.wy - .23, 0);
    // buffers
    for (const b of this.bufs) { const x = b.key === "buf" ? sim.x1Now ?? sim.x1 : sim.x2Now ?? sim.x2, top = P.bufTop - x - .015; b.hd.position.y = top; b.sp.scale.y = Math.max(.05, top - .08 - .72); b.sp.position.y = .72 + b.sp.scale.y * .0 - 0; b.sp.position.y = .72; const t = st.b[b.key]; if (t != null) { const k = Math.min(1, (now - t) / .45); b.g.rotation.z = k * k * 1.38 * (b.key === "buf" ? 1 : -1) * -1; b.g.position.x = b.x - b.w + (b.key === "buf" ? .0 : -.0); } else { b.g.rotation.z = 0; } }
    this.tipN = 0; this.drawRopes(sim, st); this.drawGov(sim, st);
    const tm = new T.Matrix4(); for (let i = this.tipN; i < 28; i++) { tm.makeScale(0, 0, 0); this.tips.setMatrixAt(i, tm); } this.tips.instanceMatrix.needsUpdate = true;
    // sparks
    const s = this.sp; for (let i = 0; i < s.n; i++) if (s.life[i] > 0) { s.life[i] -= dt; s.v[i * 3 + 1] -= 9 * dt; for (let j = 0; j < 3; j++) s.p[i * 3 + j] += s.v[i * 3 + j] * dt; if (s.life[i] <= 0) s.p[i * 3 + 1] = -99; } s.g.attributes.position.needsUpdate = true;
    // glow
    for (const k in this.lit) { const a = k.startsWith("rope") && k !== "ropes" ? (st.cuts[+k[4]] ? 0 : (st.lit.ropes || 0) * .75) : st.lit[k] || 0; for (const q of this.lit[k]) { if (a > 0) { q.m.emissive.set("#ffb84a"); q.m.emissiveIntensity = a * (k === "cw" ? .2 : .42); } else { q.m.emissive.copy(q.e); q.m.emissiveIntensity = q.i; } } }
    this.halo.forEach((h, i) => { const q = st.halos?.[i]; if (q && q.a > .01) { const v = this.anchor(q.key, sim, st); h.visible = true; h.position.copy(v); h.scale.setScalar(q.r || 2.4); h.material.opacity = q.a * (this.dark ? .5 : .75); } else h.visible = false; });
  }
  tip(x, y, z) { if (this.tipN > 27) return; this.tips.setMatrixAt(this.tipN++, new T.Matrix4().makeTranslation(x, y, z)); }
  hitchY(sim) { return sim.y + P.hitch + .24; }
  ropeX(i, y, sim) { const t = Math.max(0, Math.min(1, (G.SY - y) / (G.SY - G.GP))); return [kOf(i) * G.xh * t, kOf(i) * G.zs * (1 - t)]; }
  drawRopes(sim, st) {
    const now = st.now, hy = this.hitchY(sim), cwTop = sim.w + P.cwH, cx = G.R, EX = G.EX, DX = EX - cx, DYv = G.DY - G.SY, D = Math.hypot(DX, DYv), th = Math.atan2(DYv, DX) + Math.acos((G.R - G.r) / D), topLo = this.gt > .01 ? G.Ta : this.hi, n0 = sim.n === 0;
    const cwFall = n0 ? Math.max(0, st.cwAll - sim.w) : 0, carFall = n0 ? Math.max(0, st.carAll - sim.y) : 0;
    for (let i = 0; i < 6; i++) {
      const R = this.rp[i], c = st.cuts[i], k = kOf(i), z = k * G.zs, off = sim.xr, at = y => { const [x, zz] = this.ropeX(i, y, sim); return [x, this.Y(y), zz]; };
      for (const q of ["top", "mid", "cw", "stub", "tail"]) R[q].hide();
      const slack1 = c ? 0 : Math.max(0, Math.min(.6, sim.l1 - (P.sheaveY - (sim.y + P.hitch)))), slack2 = c ? 0 : Math.max(0, Math.min(.6, sim.l2 - (P.sheaveY - cwTop)));
      const trem = c || !st.trem ? 0 : Math.sin(now * 95 + i * 2) * st.trem * .03, bow = (s, t) => Math.sin(t * Math.PI) * s;
      // where the rope ends on each side
      let carLo = hy, cwLo = cwTop, carTail = false, cwTail = false, gone = false, dtc = 0, wig = 0;
      if (c) { dtc = now - c.t; const rec = .55 * (1 - Math.exp(-dtc * 9)), moved = sim.xr - c.th; wig = Math.exp(-dtc * 1.5) * .2 * Math.sin(dtc * 13 + i);
        if (c.side === "car") { carLo = c.y + rec + moved + cwFall; carTail = true; if (carLo > G.SY) gone = true; } else { cwLo = c.y + rec - moved + carFall; cwTail = true; if (cwLo > G.DY) gone = true; } }
      const lowC = Math.max(topLo, carLo), lowW = Math.max(topLo, cwLo);
      if (!gone) {
        const pts = []; if (lowC < G.SY) { const n = 9; for (let j = 0; j <= n; j++) { const y = lowC + (G.SY - lowC) * j / n, p = at(y), f = 1 - j / n; if (carTail && carLo >= topLo) { p[0] += wig * f; p[2] += wig * .6 * f; } else if (slack1 > .01) p[0] += bow(slack1 * .5, .7 + .3 * j / n); else if (trem) p[0] += trem; pts.push(p); } }
        const yS = G.SY + this.offT, yD = G.DY + this.offT; for (let j = 1; j <= 20; j++) { const a = Math.PI - (Math.PI - th) * j / 20; pts.push([cx + Math.cos(a) * (G.R + .008), yS + Math.sin(a) * (G.R + .008), z]); }
        for (let j = 0; j <= 10; j++) { const a = th * (1 - j / 10); pts.push([EX + Math.cos(a) * (G.r + .008), yD + Math.sin(a) * (G.r + .008), z]); }
        if (lowW < G.DY) for (let j = 1; j <= 5; j++) { const y = G.DY + (lowW - G.DY) * j / 5; pts.push([G.cw + .008 + (cwTail && cwLo >= topLo ? wig * j / 5 : 0) + (slack2 > .01 ? bow(slack2 * .35, j / 5) : 0), this.Y(y), z]); }
        R.top.set(pts, off); if (carTail && carLo >= topLo) this.tip(...pts[0]); if (cwTail && cwLo >= topLo) this.tip(...pts[pts.length - 1]);
      }
      // window, car side
      const wTop = Math.min(this.hi, topLo), end = Math.max(carLo, this.lo); if (!gone && end < wTop && !(cwTail && gone)) { const pts = [], n = 10; for (let j = 0; j <= n; j++) { const y = end + (wTop - end) * j / n, p = at(y), f = 1 - j / n; if (carTail) { p[0] += wig * f * 1.2 + k * .04 * f; p[2] += wig * .5 * f; } else { if (slack1 > .01) { p[0] += bow(slack1 * .55, j / n) * (i % 2 ? 1 : -1); p[2] += bow(slack1 * .4, j / n); } else if (trem) p[0] += trem * Math.sin(j / n * Math.PI); } pts.push(p); } R.mid.set(pts, off - 5); if (carTail && carLo >= this.lo) this.tip(...pts[0]); }
      // window, other side
      const cEnd = Math.max(cwLo, this.lo); if (!gone && cEnd < wTop) { const pts = [], n = 8; for (let j = 0; j <= n; j++) { const y = cEnd + (wTop - cEnd) * j / n, f = 1 - j / n; pts.push([G.cw + .008 + (cwTail ? wig * f : 0) + (slack2 > .01 ? bow(slack2 * .4, j / n) * (i % 2 ? 1 : -1) : 0), this.Y(y), z]); } R.cw.set(pts, -off + 5); if (cwTail && cwLo >= this.lo) this.tip(...pts[0]); }
      // stub on the car roof (or the whole rope that ran over the wheel, piled up)
      if (c && (c.side === "car" || gone)) { const len = c.side === "car" ? Math.min(1.5, Math.max(.22, c.y - c.hy)) : 1.5, q = Math.min(1, dtc / .4), e = q * q * (3 - 2 * q), sd = i % 2 ? 1 : -1, hx = k * G.xh, hY = this.Y(hy), dx = sd * (.26 + .09 * (i % 3)), dz = ((i * 5) % 6 - 2.5) * .13; R.stub.set(bez([hx, hY, 0], [hx, hY + len * .55 * (1 - e * .6), 0], [hx + dx * .5 * e, hY + len * .75 * (1 - e * .6), dz * .5 * e], [hx + dx * e * 1.4, hY + len * (1 - e) - e * (.42 + .02 * i), dz * e + e * .12]), 0); this.tip(hx + dx * e * 1.4, hY + len * (1 - e) - e * (.42 + .02 * i), dz * e + e * .12); }
      if (c && (c.side === "cw" || gone)) { const yT = this.Y(cwTop), vis = (cwTop > this.lo && cwTop < this.hi) || cwTop > topLo || cwTop < (this.gp > .01 ? G.Pb : this.lo); if (vis) { const q = Math.min(1, dtc / .45), sd = i % 2 ? 1 : -1; R.tail.set(bez([G.cw, yT, z], [G.cw, yT + .5 * (1 - q) + .2, z], [G.cw + sd * .15 * q, yT + .4, z], [G.cw + sd * .22 * q, yT + .6 * (1 - q) - .25 * q, z + sd * .1 * q]), 0); this.tip(G.cw + sd * .22 * q, yT + .6 * (1 - q) - .25 * q, z + sd * .1 * q); } }
    }
  }
  drawGov(sim, st) {
    const q = this.gr; q.forEach(r => r.hide()); const now = st.now, c = st.b.govRope, off = st.gth, wy = this.gov.wy, r = this.gov.r + .006, xm = this.gov.x, yW = this.Y(wy) + 0, topLo = this.gt > .01 ? G.Ta : this.hi, pHi = this.gp > .01 ? G.Pb : this.lo;
    const yc = c != null ? st.govCutY : 0, dt = c != null ? now - c : 0, fall = 4.9 * dt * dt, wig = Math.exp(-dt * 1.3) * .16 * Math.sin(dt * 12), carY = sim.y + 1.02;
    const tW = wy + this.offT, arcT = (full) => { const p = []; for (let j = 0; j <= 14; j++) { const a = Math.PI * j / 14; p.push([xm + Math.cos(a) * r, tW + Math.sin(a) * r, 0]); } return p; };
    const keepA = yc ? yc + .2 : -1; // rope A (car side) hangs from the wheel down to keepA
    const segA = (a, b, w) => { const n = 6, p = []; for (let j = 0; j <= n; j++) { const y = a + (b - a) * j / n; p.push([G.gA + (w || 0) * (1 - j / n), this.Y(y), (w || 0) * .4 * (1 - j / n)]); } return p; };
    const aLo = Math.max(topLo, keepA); q[0].set([...segA(aLo, wy, c != null && keepA > topLo ? wig : 0), ...arcT(), [G.gB, this.Y(topLo), 0]], off); if (c != null && keepA > topLo) this.tip(G.gA + wig, this.Y(aLo), wig * .4);
    const wTop = Math.min(this.hi, topLo), mLo = Math.max(this.lo, pHi);
    if (c == null) q[1].set([[G.gA, this.Y(this.lo), 0], [G.gA, this.Y(wTop - .001), 0]], off); else { if (keepA < wTop) { const e = Math.max(mLo, keepA); q[1].set(segA(e, wTop - .001, keepA > mLo ? wig : 0), off); if (keepA > mLo) this.tip(G.gA + wig, this.Y(e), wig * .4); }
      const low = Math.max(carY < yc ? carY - .4 : 0, yc - fall); if (low > mLo + .05) { q[4].set(segA(mLo, Math.min(low, wTop), 0), off); } }
    q[2].set([[G.gB, this.Y(wTop - .001), 0], [G.gB, this.Y(this.lo), 0]], off);
    const p = []; for (let j = 0; j <= 14; j++) { const a = -Math.PI * j / 14; p.push([xm + Math.cos(a) * r, .55 + Math.sin(a) * r, 0]); } const loA = c == null ? pHi : Math.min(pHi, Math.max(.58, yc - fall)); q[3].set([[G.gA, loA, 0], ...p, [G.gB, pHi, 0]], off);
  }
  // ---- where things are (display space)
  anchor(k, sim, st) {
    const o = this.offT, cy = this.Yc, v = { motor: [G.R + .55, G.SY + .35 + o, -1.1], brake: [G.R + .0, G.SY + .86 + o, -.75], wheel: [G.R, G.SY + o, .35], gov: [this.gov.x, this.gov.wy + .62 + o, 0], jawL: [-G.rail, cy - .36, 0], jawR: [G.rail, cy - .36, 0], buf: [0, .75, 0], cwBuf: [G.cw, .75, 0], car: [0, cy + 1.2, .7], cw: [G.cw, 0, .4] }[k];
    if (k === "ropes") { const y = (this.hitchY(sim) + this.hi) / 2, i = Math.max(0, st.cuts.findIndex((c, j) => !c && j >= 2)), l = st.cuts.map((c, j) => c ? -1 : j).filter(j => j >= 0), j = l.length ? l[l.length >> 1] : i, [x, z] = this.ropeX(j, y, sim); return V3(x, this.Y(y), z); } if (k === "govRope") return V3(G.gA, cy + 1.6, 0); if (k === "lever") return V3(G.gA, cy + 1.02, 0); if (k === "cw") { const y = sim.w + 1.6; return V3(G.cw, this.Y(Math.max(this.lo, Math.min(this.hi, y))), .4); } return V3(...v);
  }
  // picking: list of {key,i,x,y,r|line} in css px
  targets(sim, st) {
    const out = [], P2 = v => this.project(v), o = this.offT, add = (key, pts, r, extra) => out.push({ key, pts: pts.map(p => P2(V3(...p))), r, ...extra });
    if (st.b.brake == null) add("brake", [[G.R - .62, G.SY + .78 + o, -.8], [G.R + .62, G.SY + .78 + o, -.8]], 22); if (st.b.brake == null) add("brake", [[G.R - .72, G.SY - .5 + o, -.8], [G.R - .74, G.SY + .4 + o, -.8]], 16, { weak: 1 });
    if (st.b.motor == null) { const b = this.leadAt; add("motor", [[G.R + .98, G.SY - .3 + o, -1.45], [b.x, b.y + o, b.z], [2.35, G.MR + .34 + o, -1.42]], 26); add("motor", [[G.R + .5, G.SY + .3 + o, -1.2], [G.R + .75, G.SY - .1 + o, -1.2]], 24, { weak: 1 }); }
    if (st.b.gov == null) add("gov", [[this.gov.x, this.gov.wy + 1.0 + o, 0], [this.gov.x, this.gov.wy + .1 + o, 0]], 26);
    if (st.b.govRope == null) { add("govRope", [[G.gA, this.Y(this.hi) - .05, 0], [G.gA, this.Y(this.lo) + .05, 0]], 11); add("govRope", [[G.gB, this.Y(this.hi) - .05, 0], [G.gB, this.Y(this.lo) + .05, 0]], 9, { weak: 1 }); }
    for (const j of this.jaws) if (st.b[j.key] == null) add(j.key, [[j.q * G.rail, this.Yc - .5, 0], [j.q * G.rail, this.Yc - .2, 0]], 22);
    for (const b of this.bufs) if (st.b[b.key] == null) add(b.key, [[b.x, .15, 0], [b.x, 1.15, 0]], 22);
    const hy = this.hitchY(sim), topLo = this.gt > .01 ? G.Ta : this.hi;
    for (let i = 0; i < 6; i++) if (!st.cuts[i]) { const A = y => { const [x, z] = this.ropeX(i, y, sim); return [x, this.Y(y), z]; }, z = kOf(i) * G.zs, cwTop = sim.w + P.cwH; const segs = []; if (hy < this.hi) segs.push([hy, Math.min(this.hi, G.GP), "car"]); if (hy < G.GP) segs.push([Math.max(hy, topLo), G.GP, "car"]); segs.push([Math.max(hy, G.GP), G.SY - .05, "car"]); for (const [a, b, side] of segs) if (b > a) add("rope", [A(a), A(b)], 15, { i, side, ya: a, yb: b });
      const w = [[Math.max(cwTop, this.lo), this.hi], [Math.max(cwTop, topLo), G.DY]]; for (const [a, b] of w) if (b > a + .1) add("rope", [[G.cw, this.Y(a), z], [G.cw, this.Y(b), z]], 11, { i, side: "cw", ya: a, yb: b }); }
    add("car", [[-.5, this.Yc + .5, .7], [.5, this.Yc + 2, .7]], 60, { weak: 2 });
    return out;
  }
  project(v) { const p = v.clone().project(this.cam); return { x: (p.x + 1) / 2 * this.w, y: (1 - p.y) / 2 * this.h }; }
  project3(x, y, z) { return this.project(V3(x, y, z)); }
  cheap() { this.r.shadowMap.enabled = false; this.key.castShadow = false; this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
  // ---- camera
  resize(w, h, dpr, rect) { this.w = w; this.h = h; this.rect = rect; this.r.setPixelRatio(dpr); this.r.setSize(w, h, false); }
  look(dt, jump) {
    const k = jump ? 1 : 1 - Math.exp(-dt * 4.2); for (const q in this.box) this.box[q] += (this.boxT[q] - this.box[q]) * k; const k2 = jump ? 1 : 1 - Math.exp(-dt * 9); this.yaw += (this.yawT - this.yaw) * k2; this.pitch += (this.pitchT - this.pitch) * k2;
    const b = this.box, r = this.rect, cam = this.cam, bw = b.x1 - b.x0, bh = b.y1 - b.y0, scale = Math.min(r.w / bw, r.h / bh); // px per metre
    const fov = cam.fov * Math.PI / 180, dist = this.h / scale / 2 / Math.tan(fov / 2), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, cz = -.4; cam.aspect = this.w / this.h; cam.near = Math.max(1, dist - 14); cam.far = dist + 14;
    cam.position.set(cx + Math.sin(this.yaw) * Math.cos(this.pitch) * dist, cy + Math.sin(this.pitch) * dist, cz + Math.cos(this.yaw) * Math.cos(this.pitch) * dist); if (this.shake) { cam.position.x += (Math.random() - .5) * this.shake * .05; cam.position.y += (Math.random() - .5) * this.shake * .05; } cam.lookAt(cx, cy, cz);
    const ox = this.w / 2 - (r.x + r.w / 2), oy = this.h / 2 - (r.y + r.h / 2); cam.setViewOffset(this.w, this.h, ox, oy, this.w, this.h); cam.updateProjectionMatrix(); cam.updateMatrixWorld(); this.scale = scale;
  }
  render() { this.r.render(this.scene, this.cam); }
  // a still at any size; returns a canvas
  still(w, h, rect, box, yaw, pitch) {
    const keep = { w: this.w, h: this.h, rect: this.rect, box: { ...this.box }, yaw: this.yaw, pitch: this.pitch, pr: this.r.getPixelRatio() }; this.resize(w, h, 1, rect); Object.assign(this.box, box); this.boxT = { ...box }; const yt = this.yawT, pt = this.pitchT; this.yaw = this.yawT = yaw ?? this.yaw; this.pitch = this.pitchT = pitch ?? this.pitch; this.look(0, true); this.render();
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(this.r.domElement, 0, 0); this.resize(keep.w, keep.h, keep.pr, keep.rect); Object.assign(this.box, keep.box); this.boxT = { ...keep.box }; this.yaw = keep.yaw; this.pitch = keep.pitch; this.yawT = yt; this.pitchT = pt; this.look(0, false); this.render(); return c;
  }
}
function poly(p) { const s = new T.Shape(); p.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s; }
function holeShape(r, R, span) { const s = new T.Shape(); s.absarc(0, 0, R, 0, span); s.absarc(0, 0, r, span, 0, true); s.closePath(); return s; }
// side: -1/1; kind 0 = housing cheek, 1 = sliding wedge next to the rail
function wedgeGeo(p, kind) { const s = kind ? poly([[p * .03, -.1], [p * .03, .09], [p * .075, .09], [p * .105, -.1]]) : poly([[p * .115, -.12], [p * .085, .13], [p * .17, .13], [p * .17, -.12]]); const g = new T.ExtrudeGeometry(s, { depth: kind ? .24 : .3, bevelEnabled: false }); g.translate(0, 0, kind ? -.12 : -.15); return g; }
function bez(a, b, c, d) { const p = []; for (let i = 0; i <= 14; i++) { const t = i / 14, u = 1 - t; p.push([0, 1, 2].map(j => u * u * u * a[j] + 3 * u * u * t * b[j] + 3 * u * t * t * c[j] + t * t * t * d[j])); } return p; }
