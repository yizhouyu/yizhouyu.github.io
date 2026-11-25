// The same wave stepper as wave.js, on the graphics card. 39 layers laid out as tiles on one sheet.
import * as W from "./wave.js";
const { X, Y, Z, NX, NY, NZ, NC, WY0, WY1, WZ0, WZ1, SRC, CH, MUR, SPP } = W; export const COLS = 8, TW = X * COLS, TH = Y * Math.ceil(Z / COLS);
const VS = `#version 300 es
void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);gl_Position=vec4(p,0.,1.);}`;
const HEAD = `#version 300 es
precision highp float;precision highp int;precision highp sampler2D;
const int X=${X},Y=${Y},Z=${Z},COLS=${COLS};
vec3 at(sampler2D s,int i,int j,int k){if(k<0||k>=Z||i<0||j<0||i>=X||j>=Y)return vec3(0);return texelFetch(s,ivec2((k%COLS)*X+i,(k/COLS)*Y+j),0).xyz;}
void me(out int i,out int j,out int k){ivec2 f=ivec2(gl_FragCoord.xy);ivec2 t=f/ivec2(X,Y);k=t.y*COLS+t.x;i=f.x-t.x*X;j=f.y-t.y*Y;}
`;
const FH = HEAD + `uniform sampler2D uE,uH;out vec4 o;void main(){int i,j,k;me(i,j,k);vec3 h=at(uH,i,j,k);if(i<${NX}&&j<${NY}&&k<${NZ}){vec3 e=at(uE,i,j,k),a=at(uE,i+1,j,k),b=at(uE,i,j+1,k),c=at(uE,i,j,k+1);h+=${CH.toExponential(10)}*vec3((c.y-e.y)-(b.z-e.z),(a.z-e.z)-(c.x-e.x),(b.x-e.x)-(a.y-e.y));}o=vec4(h,0);}`;
const FE = HEAD + `uniform sampler2D uE,uH,uA,uB;uniform float uS;out vec4 o;
vec3 upd(int i,int j,int k){vec3 h=at(uH,i,j,k),a=at(uH,i-1,j,k),b=at(uH,i,j-1,k),c=at(uH,i,j,k-1);vec3 e=at(uA,i,j,k)*at(uE,i,j,k)+at(uB,i,j,k)*vec3((h.z-b.z)-(h.y-c.y),(h.x-c.x)-(h.z-a.z),(h.y-a.y)-(h.x-b.x));return e;}
bool port(int j,int k){return j>${WY0}&&j<${WY1}&&k>=${WZ0}&&k<${WZ1};}
void main(){int i,j,k;me(i,j,k);vec3 e;if(i==${NX}){e=vec3(0);if(port(j,k)){e.z=at(uE,${NX - 1},j,k).z+${MUR.toFixed(10)}*(upd(${NX - 1},j,k).z-at(uE,${NX},j,k).z);}}else{e=upd(i,j,k);if(i==${SRC}&&port(j,k))e.z+=uS*sin(3.14159265359*float(j-${WY0})/${(WY1 - WY0).toFixed(1)});}o=vec4(e,0);}`;
export function makeWave(gl) {
  if (!gl.getExtension("EXT_color_buffer_float")) return null;
  const prog = (f) => { const p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, f]]) { const q = gl.createShader(t); gl.shaderSource(q, s); gl.compileShader(q); if (!gl.getShaderParameter(q, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(q)); gl.attachShader(p, q); } gl.linkProgram(p); return p; };
  const pH = prog(FH), pE = prog(FE), U = (p, n) => gl.getUniformLocation(p, n), vao = gl.createVertexArray();
  const tex = (data) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, TW, TH, 0, gl.RGBA, gl.FLOAT, data || null); for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST); for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); return t; };
  const fb = (t) => { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("no float target"); return f; };
  const Et = [tex(), tex()], Ht = [tex(), tex()], A = tex(), B = tex(), Ef = Et.map(fb), Hf = Ht.map(fb); let e = 0, h = 0, n = 0, total = 0, coef = null, acc = null, job = 0;
  const uh = { E: U(pH, "uE"), H: U(pH, "uH") }, ue = { E: U(pE, "uE"), H: U(pE, "uH"), A: U(pE, "uA"), B: U(pE, "uB"), S: U(pE, "uS") };
  const sheet = (src) => { const d = new Float32Array(TW * TH * 4); for (let k = 0; k < Z; k++) { const ox = (k % COLS) * X, oy = (k / COLS | 0) * Y; for (let i = 0; i < X; i++) for (let j = 0; j < Y; j++) { const a = ((oy + j) * TW + ox + i) * 4, b = W.I(i, j, k) * 4; d[a] = src[b]; d[a + 1] = src[b + 1]; d[a + 2] = src[b + 2]; } } return d; };
  const put = (t, d) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, TH, gl.RGBA, gl.FLOAT, d); };
  const bind = (u, t, l) => { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(l, u); };
  const grab = () => { const d = new Float32Array(TW * TH * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, Ef[e]); gl.readPixels(0, 0, TW, TH, gl.RGBA, gl.FLOAT, d); for (let k = 0; k < Z; k++) { const ox = (k % COLS) * X, oy = (k / COLS | 0) * Y; for (let i = 0; i < X; i++) for (let j = 0; j < Y; j++) { const a = ((oy + j) * TW + ox + i) * 4, b = W.I(i, j, k) * 3; for (let c = 0; c < 3; c++) acc[b + c] += d[a + c] * d[a + c]; } } };
  return {
    get tex() { return Et[e]; }, get n() { return n; }, get total() { return total; }, get busy() { return coef && n < total; },
    start(c, periods = 80, keep = false) { coef = c; job++; gl.activeTexture(gl.TEXTURE0); put(A, sheet(c.ca)); put(B, sheet(c.cb)); acc = new Float32Array(c.N * 3); n = keep ? 1e6 * SPP : 0; total = n + periods * SPP; if (!keep) { gl.clearColor(0, 0, 0, 0); for (const f of [...Ef, ...Hf]) { gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.clear(gl.COLOR_BUFFER_BIT); } } return job; },
    // a number of steps; returns the squared field when the oven has settled, else null
    run(steps) { if (!coef || n >= total) return null; gl.bindVertexArray(vao); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.SCISSOR_TEST); gl.viewport(0, 0, TW, TH); let done = null;
      for (let s = 0; s < steps && n < total; s++, n++) {
        gl.useProgram(pH); gl.bindFramebuffer(gl.FRAMEBUFFER, Hf[1 - h]); bind(0, Et[e], uh.E); bind(1, Ht[h], uh.H); gl.drawArrays(gl.TRIANGLES, 0, 3); h = 1 - h;
        gl.useProgram(pE); gl.bindFramebuffer(gl.FRAMEBUFFER, Ef[1 - e]); bind(0, Et[e], ue.E); bind(1, Ht[h], ue.H); bind(2, A, ue.A); bind(3, B, ue.B); gl.uniform1f(ue.S, W.drive(n)); gl.drawArrays(gl.TRIANGLES, 0, 3); e = 1 - e;
        if (n === total - 1 - SPP / 4 || n === total - 1) grab();
        if (n === total - 1) done = acc; }
      gl.bindVertexArray(null); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return done; },
    idle(steps) { if (!coef) return; const t = total; total = n + steps + 1e6; this.run(steps); total = n; },
    sync() { const p = new Float32Array(4); gl.bindFramebuffer(gl.FRAMEBUFFER, Ef[e]); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, p); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
  };
}
