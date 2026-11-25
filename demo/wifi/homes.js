// Fifteen invented homes. None is a copy of a real listing. Metres; walls are centre lines; see plans.js for the pieces.
const w = (m, x1, y1, x2, y2) => ({ m, x1, y1, x2, y2 });
const f = (k, o, x, y, len, extra = {}) => ({ k, o, x, y, w: len, ...extra });
const outer = (m, a, b, c, d) => [w(m, a, b, c, b), w(m, c, b, c, d), w(m, a, d, c, d), w(m, a, b, a, d)];
const D = (o, x, y, len, h, s, extra = {}) => f("door", o, x, y, len, { h, s, ...extra }), O = (o, x, y, len, h, s) => D(o, x, y, len, h, s, { open: 1 }), ENTRY = (o, x, y, len, h, s) => D(o, x, y, len, h, s, { m: "metal" }), WIN = (o, x, y, len) => f("win", o, x, y, len), GAP = (o, x, y, len) => f("gap", o, x, y, len);

export const HOMES = {
  studio: { // New York studio: one room, brick, the router shut in the closet
    router: [5.25, 1.55], phone: [3.0, 5.8],
    walls: [...outer("brick", 2.3, 1.1, 9.1, 6.5), w("brick", 4.5, 1.1, 4.5, 3.2), w("brick", 2.3, 3.2, 4.5, 3.2), w("drywall", 4.5, 2.2, 6.0, 2.2), w("drywall", 6.0, 1.1, 6.0, 2.2)],
    feats: [D("v", 4.5, 2.75, 0.7, 1, -1), D("h", 5.25, 2.2, 0.75, 1, 1), ENTRY("h", 6.75, 1.1, 0.9, -1, 1), WIN("h", 4.2, 6.5, 1.6), WIN("h", 7.2, 6.5, 1.6)],
    boxes: [[8.35, 1.25, 8.98, 1.9, "fridge"]], mirrors: [[2.4, 4.9, 1.4, 90]],
    labels: [["living", 6.4, 4.6], ["bath", 3.3, 2.1], ["closet", 5.25, 1.65]],
  },
  flex: { // high-rise: concrete core, a glass side, and a thin pressurised wall that makes the second bedroom
    router: [9.88, 1.62], phone: [1.6, 6.0],
    walls: [w("concrete", 1, 1.2, 10.2, 1.2), w("concrete", 1, 1.2, 1, 6.6), w("concrete", 10.2, 1.2, 10.2, 6.6), w("glass", 1, 6.6, 10.2, 6.6),
      w("drywall", 3.2, 1.2, 3.2, 3.2), w("drywall", 1, 3.2, 3.6, 3.2), w("drywall", 3.6, 3.2, 3.6, 6.6), w("concrete", 7.2, 1.2, 7.2, 6.6), w("concrete", 7.2, 3.4, 10.2, 3.4), w("concrete", 9.0, 1.2, 9.0, 3.4), w("metal", 9.66, 1.4, 9.66, 1.86), w("metal", 9.66, 1.4, 10.06, 1.4)],
    feats: [D("v", 3.2, 2.5, 0.7, 1, -1), O("v", 3.6, 4.1, 0.8, -1, -1), D("v", 7.2, 4.4, 0.85, -1, 1), D("h", 8.1, 3.4, 0.7, 1, 1), D("h", 9.5, 3.4, 0.75, -1, 1), ENTRY("h", 6.2, 1.2, 0.95, -1, 1)],
    boxes: [[3.95, 1.35, 4.6, 2.0, "fridge"]],
    labels: [["bath", 2.1, 2.1], ["bed2", 2.3, 5.1], ["living", 5.4, 4.6], ["bed1", 8.8, 5.2], ["bath2", 8.1, 2.3], ["closet", 9.6, 2.3]],
  },
  brownstone: { // long and narrow: two parlours in a row, party walls of brick, mirrors over the mantels
    router: [1.0, 3.15], phone: [10.1, 4.0],
    walls: [...outer("brick", 0.6, 1.5, 10.6, 6.3), w("brick", 0.6, 2.7, 7.4, 2.7), w("brick", 7.4, 1.5, 7.4, 6.3), w("brick", 4.2, 2.7, 4.2, 6.3), w("brick", 8.9, 1.5, 8.9, 3.3), w("brick", 8.9, 3.3, 10.6, 3.3)],
    feats: [GAP("v", 4.2, 4.6, 1.8), O("v", 7.4, 4.3, 0.9, -1, 1), O("h", 2.7, 2.7, 0.9, -1, 1), D("h", 5.9, 2.7, 0.85, 1, 1), D("v", 8.9, 2.4, 0.7, 1, -1), D("v", 0.6, 2.1, 0.9, 1, 1), WIN("v", 0.6, 3.7, 1.0), WIN("v", 0.6, 5.3, 1.0), WIN("v", 10.6, 4.2, 1.0), WIN("v", 10.6, 5.5, 0.8)],
    boxes: [[9.75, 5.5, 10.4, 6.15, "fridge"]], mirrors: [[2.5, 6.2, 1.5, 0], [5.8, 6.2, 1.3, 0]],
    labels: [["stairs", 4.9, 2.1], ["living", 2.3, 4.5], ["dining", 5.8, 4.5], ["kitchen", 8.6, 5.2], ["bath", 9.75, 2.4]],
  },
  loft: { // one big floor with columns, a steel goods lift, a glass bedroom
    router: [3.45, 6.6], phone: [9.8, 1.4],
    walls: [...outer("brick", 0.7, 0.7, 10.5, 7.0), w("metal", 2.5, 0.7, 2.5, 2.7), w("metal", 0.7, 2.7, 2.5, 2.7), w("concrete", 0.7, 4.9, 3.0, 4.9), w("concrete", 3.0, 4.9, 3.0, 7.0), w("glass", 7.3, 0.7, 7.3, 3.9), w("glass", 7.3, 3.9, 10.5, 3.9), w("drywall", 7.9, 5.0, 10.5, 5.0), w("drywall", 7.9, 5.0, 7.9, 7.0),
      w("concrete", 4.5, 2.5, 4.7, 2.5), w("concrete", 4.5, 5.1, 4.7, 5.1), w("concrete", 6.2, 2.5, 6.4, 2.5), w("concrete", 6.2, 5.1, 6.4, 5.1)],
    feats: [ENTRY("v", 2.5, 1.7, 1.1, 1, 1), D("h", 2.2, 4.9, 0.75, 1, 1), O("v", 7.3, 3.0, 0.85, 1, 1), D("v", 7.9, 5.8, 0.8, -1, 1), ENTRY("h", 3.4, 0.7, 0.95, -1, 1), WIN("v", 0.7, 3.8, 1.4), WIN("h", 4.6, 7.0, 1.8), WIN("h", 6.7, 7.0, 1.6), WIN("h", 5.4, 0.7, 1.8), WIN("h", 8.9, 0.7, 1.8), WIN("v", 10.5, 2.3, 1.6), WIN("v", 10.5, 6.0, 1.2)],
    boxes: [[0.9, 2.95, 1.55, 3.6, "fridge"]],
    labels: [["living", 5.4, 3.8], ["lift", 1.6, 1.7], ["bath", 1.85, 6.0], ["bed1", 8.9, 2.3], ["study", 9.2, 6.0]],
  },
  lshape: { // two wings around a yard
    router: [10.0, 6.55], phone: [1.4, 1.3],
    walls: [w("brick", 0.8, 0.7, 4.4, 0.7), w("brick", 4.4, 0.7, 4.4, 3.4), w("brick", 4.4, 3.4, 10.4, 3.4), w("brick", 10.4, 3.4, 10.4, 7.0), w("brick", 0.8, 7.0, 10.4, 7.0), w("brick", 0.8, 0.7, 0.8, 7.0),
      w("concrete", 0.8, 3.2, 4.4, 3.2), w("brick", 2.6, 3.2, 2.6, 4.9), w("brick", 0.8, 4.9, 4.4, 4.9), w("concrete", 4.4, 3.4, 4.4, 7.0), w("brick", 7.6, 3.4, 7.6, 7.0)],
    feats: [O("h", 3.5, 3.2, 0.8, -1, -1), D("v", 2.6, 4.1, 0.7, 1, -1), D("h", 3.6, 4.9, 0.8, -1, 1), GAP("v", 4.4, 4.2, 0.9), D("v", 7.6, 4.3, 0.8, -1, 1), ENTRY("h", 5.2, 7.0, 0.95, -1, -1), WIN("h", 2.4, 0.7, 1.4), WIN("v", 4.4, 1.9, 1.2), WIN("h", 6.0, 3.4, 1.6), WIN("h", 9.0, 3.4, 1.4), WIN("v", 10.4, 5.2, 1.4), WIN("v", 0.8, 6.0, 1.2), WIN("h", 9.0, 7.0, 1.4)],
    boxes: [[0.95, 6.2, 1.6, 6.85, "fridge"]],
    labels: [["bed1", 2.4, 1.9], ["bath", 1.7, 4.05], ["hall", 3.5, 4.05], ["kitchen", 2.4, 5.9], ["living", 6.0, 5.3], ["bed2", 9.0, 5.3]],
  },
  six: { // a "classic six": big rooms in two rows along a gallery
    size: 1.25, router: [1.3, 8.35], phone: [12.6, 1.5],
    walls: [...outer("concrete", 0.8, 0.8, 13.2, 8.8), w("brick", 0.8, 3.7, 13.2, 3.7), w("brick", 0.8, 5.0, 13.2, 5.0), w("brick", 4.6, 0.8, 4.6, 3.7), w("brick", 6.2, 0.8, 6.2, 3.7), w("brick", 9.8, 0.8, 9.8, 3.7), w("brick", 11.3, 0.8, 11.3, 3.7), w("brick", 5.4, 5.0, 5.4, 8.8), w("brick", 9.0, 5.0, 9.0, 8.8)],
    feats: [D("h", 3.9, 3.7, 0.8, 1, -1), D("h", 5.4, 3.7, 0.7, 1, -1), D("h", 7.0, 3.7, 0.8, -1, -1), D("h", 10.5, 3.7, 0.7, 1, -1), D("h", 12.2, 3.7, 0.75, -1, -1), GAP("h", 3.0, 5.0, 1.6), O("h", 7.2, 5.0, 1.0, 1, 1), D("h", 10.2, 5.0, 0.8, -1, 1), D("v", 9.0, 6.6, 0.8, 1, 1), GAP("v", 5.4, 7.0, 1.6), ENTRY("v", 0.8, 4.35, 0.95, 1, 1), WIN("h", 2.6, 8.8, 2.0), WIN("h", 7.2, 8.8, 1.8), WIN("h", 11.2, 8.8, 1.6), WIN("h", 2.6, 0.8, 1.6), WIN("h", 8.0, 0.8, 1.6), WIN("h", 12.2, 0.8, 0.9)],
    boxes: [[12.4, 5.2, 13.05, 5.85, "fridge"]], mirrors: [[11.4, 4.88, 1.2, 0]],
    labels: [["bed1", 2.7, 2.2], ["bath", 5.4, 2.1], ["bed2", 8.0, 2.2], ["bath2", 10.55, 2.1], ["study", 12.25, 2.1], ["hall", 8.0, 4.35], ["living", 3.1, 7.0], ["dining", 7.2, 7.2], ["kitchen", 11.1, 7.2]],
  },
  laogong: { // an old walk-up block: two rooms, a small hall, the router in the metal box by the door
    router: [2.75, 1.3], phone: [8.3, 6.3],
    walls: [...outer("concrete", 2.4, 0.9, 8.8, 6.8), w("concrete", 2.4, 3.5, 8.8, 3.5), w("concrete", 5.7, 3.5, 5.7, 6.8), w("concrete", 4.3, 0.9, 4.3, 3.5), w("concrete", 7.0, 0.9, 7.0, 3.5), w("metal", 3.0, 1.06, 3.0, 1.55)],
    feats: [D("h", 5.0, 3.5, 0.8, 1, 1), D("h", 6.4, 3.5, 0.8, -1, 1), D("v", 4.3, 2.6, 0.75, 1, -1), D("v", 7.0, 2.5, 0.7, 1, 1), ENTRY("h", 5.6, 0.9, 0.9, -1, 1), WIN("h", 4.0, 6.8, 1.6), WIN("h", 7.3, 6.8, 1.6), WIN("v", 2.4, 2.1, 1.0), WIN("v", 8.8, 1.9, 0.6)],
    boxes: [[2.55, 2.75, 3.15, 3.35, "fridge"]],
    labels: [["kitchen", 3.5, 2.2], ["hall", 5.5, 2.6], ["bath", 7.9, 2.2], ["bed1", 4.0, 5.4], ["bed2", 7.3, 5.4]],
  },
  suburb: { // the ground floor of a timber house with a garage and a car in it
    size: 1.25, router: [12.8, 8.3], phone: [1.2, 1.4],
    walls: [...outer("drywall", 0.7, 0.8, 13.3, 8.8), w("drywall", 0.7, 4.6, 9.6, 4.6), w("drywall", 9.6, 0.8, 9.6, 8.8), w("drywall", 9.6, 4.2, 13.3, 4.2), w("drywall", 4.0, 0.8, 4.0, 4.6), w("drywall", 6.6, 0.8, 6.6, 4.6), w("drywall", 11.6, 0.8, 11.6, 4.2), w("drywall", 5.4, 4.6, 5.4, 8.8), w("metal", 10.0, 8.8, 12.4, 8.8)],
    feats: [D("h", 5.3, 0.8, 0.95, 1, 1), GAP("v", 4.0, 2.6, 1.2), D("v", 6.6, 3.4, 0.85, -1, 1), GAP("h", 4.7, 4.6, 1.0), GAP("h", 6.0, 4.6, 0.9), GAP("v", 5.4, 6.9, 2.0), D("v", 9.6, 3.0, 0.75, 1, 1), D("v", 11.6, 2.4, 0.75, 1, 1), D("v", 9.6, 5.6, 0.85, -1, -1), WIN("h", 2.3, 0.8, 1.6), WIN("h", 8.1, 0.8, 1.4), WIN("v", 0.7, 6.7, 2.0), WIN("h", 3.0, 8.8, 2.2), WIN("h", 7.4, 8.8, 1.8), WIN("v", 13.3, 2.4, 0.8)],
    boxes: [[8.75, 8.0, 9.4, 8.65, "fridge"], [12.45, 4.4, 13.1, 5.05, "fridge"], [10.35, 5.9, 12.0, 8.4, "car"]],
    labels: [["dining", 2.3, 2.7], ["hall", 5.3, 2.9], ["study", 8.1, 2.5], ["bath", 10.6, 2.4], ["closet", 12.45, 2.4], ["living", 3.0, 6.7], ["kitchen", 7.4, 6.6], ["garage", 11.1, 5.2]],
  },
  dorm: { // a corridor of rooms behind steel fire doors
    router: [7.2, 6.5], phone: [1.0, 1.2],
    walls: [...outer("concrete", 0.5, 0.7, 10.7, 7.0), w("concrete", 0.5, 3.35, 10.7, 3.35), w("concrete", 0.5, 4.35, 10.7, 4.35), w("brick", 2.54, 0.7, 2.54, 3.35), w("brick", 4.58, 0.7, 4.58, 3.35), w("brick", 6.62, 0.7, 6.62, 3.35), w("brick", 8.66, 0.7, 8.66, 3.35), w("brick", 2.54, 4.35, 2.54, 7.0), w("brick", 4.58, 4.35, 4.58, 7.0), w("brick", 7.7, 4.35, 7.7, 7.0)],
    feats: [...[1.1, 3.14, 5.18, 7.22, 9.26].map((x) => ENTRY("h", x, 3.35, 0.8, -1, -1)), ...[1.1, 3.14].map((x) => ENTRY("h", x, 4.35, 0.8, -1, 1)), GAP("h", 6.1, 4.35, 1.4), D("h", 8.5, 4.35, 0.8, -1, 1), ENTRY("v", 0.5, 3.85, 0.8, 1, 1), ...[1.52, 3.56, 5.6, 7.64, 9.68].map((x) => WIN("h", x, 0.7, 1.1)), ...[1.52, 3.56].map((x) => WIN("h", x, 7.0, 1.1)), WIN("h", 6.1, 7.0, 1.8), WIN("v", 10.7, 3.85, 0.6)],
    boxes: [[4.75, 6.2, 5.35, 6.85, "fridge"]],
    labels: [["hall", 5.6, 3.85], ["common", 6.1, 5.5], ["bath", 9.3, 5.7]],
  },
  shop: { // a small shop: steel shelves, a glass front, the router in the stock room
    router: [9.1, 3.75], phone: [1.35, 1.3],
    walls: [w("concrete", 0.8, 0.8, 10.4, 0.8), w("concrete", 10.4, 0.8, 10.4, 7.0), w("concrete", 0.8, 7.0, 10.4, 7.0), w("glass", 0.8, 0.8, 0.8, 7.0), w("glass", 6.6, 0.8, 6.6, 3.4), w("drywall", 6.6, 3.4, 10.4, 3.4), w("drywall", 6.6, 3.4, 6.6, 7.0), w("concrete", 8.7, 3.4, 8.7, 7.0), w("concrete", 8.7, 5.4, 10.4, 5.4)],
    feats: [D("v", 0.8, 5.8, 0.95, 1, 1), D("v", 6.6, 2.7, 0.85, 1, 1), O("v", 6.6, 5.9, 0.85, 1, 1), D("v", 8.7, 4.5, 0.8, 1, -1), D("v", 8.7, 6.2, 0.7, 1, 1)],
    boxes: [[2.1, 1.3, 2.45, 4.5, "shelf"], [3.7, 1.3, 4.05, 4.5, "shelf"], [5.3, 1.3, 5.65, 4.5, "shelf"], [9.95, 3.6, 10.25, 5.2, "shelf"], [2.2, 6.2, 3.6, 6.85, "fridge"]],
    labels: [["shop", 4.6, 5.5], ["meeting", 8.5, 2.1], ["office", 7.65, 5.3], ["stock", 9.4, 4.5], ["bath", 9.6, 6.3]],
  },
  house: { // two floors and a basement, cut open from the side
    side: 1, router: [9.8, 6.85], phone: [1.7, 2.5],
    walls: [w("drywall", 1.2, 0.9, 10.0, 0.9), w("brick", 1.2, 0.9, 1.2, 5.1), w("brick", 10.0, 0.9, 10.0, 5.1), w("drywall", 1.2, 3.0, 10.0, 3.0), w("drywall", 1.2, 5.1, 10.0, 5.1), w("concrete", 1.2, 5.1, 1.2, 7.1), w("concrete", 10.0, 5.1, 10.0, 7.1), w("concrete", 1.2, 7.1, 10.0, 7.1), w("drywall", 4.4, 0.9, 4.4, 3.0), w("drywall", 6.4, 0.9, 6.4, 3.0), w("drywall", 6.2, 3.0, 6.2, 5.1), w("concrete", 6.2, 5.1, 6.2, 7.1)],
    feats: [GAP("v", 4.4, 2.0, 1.7), GAP("v", 6.4, 2.0, 1.7), GAP("h", 5.4, 3.0, 0.9), GAP("v", 6.2, 4.1, 1.7), GAP("h", 5.2, 5.1, 0.9), GAP("v", 6.2, 6.1, 1.6), WIN("v", 1.2, 1.9, 1.1), WIN("v", 10.0, 1.9, 1.1), WIN("v", 1.2, 4.0, 1.1), WIN("v", 10.0, 3.8, 0.8)],
    boxes: [[9.15, 3.35, 9.8, 5.02, "fridge"], [8.6, 5.7, 9.3, 6.98, "furnace"]],
    labels: [["bed1", 2.8, 1.8], ["landing", 5.4, 1.8], ["bed2", 8.2, 1.8], ["living", 3.4, 4.0], ["kitchen", 7.7, 4.0], ["study", 3.4, 6.1], ["cellar", 7.6, 6.1]],
  },
};
// ground around the basement (as lossy as concrete) and a roof line, for a home seen from the side
export const SOIL = { solid: [[0, 5.2, 1.1, 7.68], [10.1, 5.2, 11.2, 7.68], [0, 7.2, 11.2, 7.68]], blocks: [{ m: "concrete", r: [0.12, 5.2, 1.1, 7.56] }, { m: "concrete", r: [10.1, 5.2, 11.08, 7.56] }, { m: "concrete", r: [1.1, 7.2, 10.1, 7.56] }], outline: [[[0.12, 5.2], [1.1, 5.2]], [[10.1, 5.2], [11.08, 5.2]], [[0.95, 0.86], [5.6, 0.3], [10.25, 0.86]]] };
Object.assign(HOMES.house, SOIL);
// the order in the catalogue; three good openers for a first visit
export const ORDER = ["concrete", "flex", "brownstone", "studio", "onebed", "railroad", "drywall", "loft", "lshape", "six", "laogong", "suburb", "house", "dorm", "shop"];
export const OPENERS = ["concrete", "flex"]; // each starts with a room that is really off on 5 GHz
