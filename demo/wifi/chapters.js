// Five small experiments. Each one is a little scene, one thing to do, and a sentence afterwards.
import { clone, PLANS } from "./plans.js";
import * as P from "./physics.js";

const empty = () => clone({ walls: [], feats: [], boxes: [], labels: [] });
export const MATS = ["drywall", "brick", "concrete"];
export const HAND = 0.09;

export const SCENES = {
  1: { // one wall, three materials
    make() { const plan = empty(); plan.walls.push({ m: "drywall", x1: 5.6, y1: 0.1, x2: 5.6, y2: 7.58 }); return { plan, view: [2.8, 1.92, 5.6, 3.84], router: [4.1, 3.84], phone: [7.3, 3.84], band: "5", tried: ["drywall"] }; },
    main: "wall",
  },
  2: { // an L-shaped corridor in solid concrete
    make() { const plan = empty(); plan.blocks = [{ m: "concrete", r: [2.1, 1.4, 5.9, 4.35] }, { m: "concrete", r: [2.1, 5.75, 9.1, 6.2] }, { m: "concrete", r: [7.3, 1.4, 9.1, 5.75] }]; plan.solid = [[0, 0, 5.9, 4.35], [0, 5.75, 11.2, 7.68], [7.3, 0, 11.2, 5.75]];
      plan.outline = [[[2.1, 4.35], [5.9, 4.35], [5.9, 1.4]], [[7.3, 1.4], [7.3, 5.75], [2.1, 5.75]]]; plan.mirrors = [[4.1, 4.72, 1.0, 135]]; return { plan, view: [2.24, 1.536, 6.72, 4.608], router: [2.9, 5.1], phone: [6.6, 2.3], band: "5" }; },
    main: "mirror",
  },
  3: { // open floor, one fridge
    make() { const plan = empty(); plan.boxes = [[4.9, 2.05, 5.55, 2.7, "fridge"]]; return { plan, view: [2.24, 1.536, 6.72, 4.608], router: [3.2, 3.84], phone: [7.6, 3.84], band: "5" }; },
    main: "box",
  },
  4: { // in the corner of two mirrors, close up; the router is 4 m away behind a concrete wall
    make() { const plan = empty(); plan.mirrors = [[6.16, 3.84, 3.0, 90], [5.2, 3.44, 2.4, 0]]; for (const [x, m] of [[3.9, "concrete"]]) plan.walls.push({ m, x1: x, y1: 0.1, x2: x, y2: 7.58 }); return { plan, view: [4.86, 3.36, 1.4, 0.96], router: [1.6, 5.3], phone: [5.65, 3.905], home: [5.65, 3.905], band: "5", sharp: 1, lev: -89 }; },
    main: "phone",
  },
  5: { // the first home again, two bands
    make() { const plan = clone(PLANS.concrete); return { plan, view: null, router: [...PLANS.concrete.router], phone: [...PLANS.concrete.phone], band: "5", seen: {} }; },
    main: "router",
  },
};
export const share = (m, band) => P.wallTR(m, P.BANDS[band].f).T; // how much gets straight through
export const in1000 = (x) => { const n = x * 1000; return n >= 100 ? String(Math.round(n / 10) * 10) : n >= 10 ? String(Math.round(n)) : n.toFixed(1); };
export const farther = (m, band) => Math.round(1 / Math.sqrt(share(m, band))); // a wall costs as much as standing this many times farther away (free space: power falls with distance squared)
