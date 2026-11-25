import { decode } from './core.js'; import { build } from './geom.js';
const get = async u => { const r = await fetch(u); if (!r.ok) throw new Error(u + ' ' + r.status); const gz = new Uint8Array(await r.arrayBuffer()); return gz[0] === 31 && gz[1] === 139 ? new Uint8Array(await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()) : gz; };
let id0 = 0, q = Promise.resolve();
onmessage = e => { q = q.then(() => job(e.data)).catch(x => postMessage({ name: e.data.name, error: String(x) })); };
async function job({ name }) {
  const [raw, t] = await Promise.all([get(`data/${name}.bin`), get(`data/${name}.txt.bin`)]), txt = new TextDecoder().decode(t).split('\n');
  const b = decode(raw); b.id0 = id0; id0 += b.n; const chunks = build(b, txt);
  postMessage({ name, band: b, txt, chunks }, [...chunks.flatMap(c => [c.wb, c.rb]), b.bin.buffer, b.src.buffer, b.base.buffer, b.bp.buffer, b.pv.buffer, b.x.buffer, b.y.buffer, b.z.buffer, b.bb.buffer]);
}
