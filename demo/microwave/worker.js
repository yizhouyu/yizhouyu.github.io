import { build, solveCPU, toPower } from "./wave.js";
onmessage = (e) => { const { f, thaw, spin } = e.data, B = build(f, thaw ? thaw.map((v, i) => v * f[i]) : null); postMessage(toPower(solveCPU(B, 80), B, f, thaw, 800, spin)); };
