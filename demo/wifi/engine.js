// The wave machine: runs the update of physics.js on the graphics chip and turns the field into a picture and numbers.
import { C0, W, H, SRC_SIGMA, WALLS, SPONGE, bandParams, allFits, coefficients, sourceAmp, dbm1m } from "./physics.js";

const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
const HEAD = `#version 300 es
precision highp float; precision highp sampler2D;`;
const STEP = (tex, f) => `${HEAD}
${f ? "uniform sampler2D S; out vec2 o;\n#define GET(c) texelFetch(S,c,0).xy\n#define PUT(v) o = v" : "uniform highp usampler2D S; out uvec2 o;\n#define GET(c) uintBitsToFloat(texelFetch(S,c,0).xy)\n#define PUT(v) o = floatBitsToUint(v)"}
uniform sampler2D M; ${tex ? "uniform sampler2D Q; uniform vec2 q;" : "uniform vec3 src; /* x,y cells, strength now */"}
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy), m = textureSize(S,0) - 1;
  vec2 k = texelFetch(M,c,0).xy;
  if (k.x == 0. || c.x==0 || c.y==0 || c.x==m.x || c.y==m.y) { PUT(vec2(0.)); return; }
  vec2 s = GET(c);
  #define U(a,b) GET(c+ivec2(a,b)).x
  float lap = (4.*(U(1,0)+U(-1,0)+U(0,1)+U(0,-1)) + U(1,1)+U(-1,1)+U(1,-1)+U(-1,-1) - 20.*s.x)/6.;
  float F = 0.;
  ${tex ? "vec2 a = texelFetch(Q,c,0).xy; F = a.x*q.x - a.y*q.y;" : `vec2 d = vec2(c) - src.xy; float r2 = dot(d,d); if (r2 < ${(16 * SRC_SIGMA * SRC_SIGMA + 8).toFixed(1)}) F = src.z*exp(-r2/${(2 * SRC_SIGMA * SRC_SIGMA).toFixed(4)});`}
  float v = ((1.-k.y)*s.y + k.x*lap + F)/(1.+k.y);
  PUT(vec2(s.x+v, v));
}`;
// field -> (slowed wave real, imaginary, power with the 3-D distance law)
const OBS = (f) => `${HEAD}
${f ? "uniform sampler2D S;\n#define GET(c) texelFetch(S,c,0).xy" : "uniform highp usampler2D S;\n#define GET(c) uintBitsToFloat(texelFetch(S,c,0).xy)"}
uniform vec2 trig; uniform vec2 rot; uniform vec2 src; uniform float dx, dist;
out vec4 o;
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy); vec2 s = GET(c);
  vec2 z = vec2(s.x, (-s.y*trig.x + s.x*trig.y));
  float a2 = dot(z,z);
  z = vec2(z.x*rot.x - z.y*rot.y, z.x*rot.y + z.y*rot.x);
  float r = max(length(vec2(c)-src)*dx, .2);
  o = vec4(z*8., min(a2*mix(1.,1./r,dist)*64., 60000.), 1.);
}`;
const DRAW = `${HEAD}
uniform sampler2D O; uniform vec2 size, grid, src, WH; uniform vec4 view, L[12]; uniform float portrait, p1, flash, search, ppm, sharp, px, paper, lev;
out vec4 col;
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+7.1; a*=.5; } return s; }
vec4 cubic(vec2 uv, float lod){ // Catmull-Rom with 9 filtered taps
  vec2 ts = grid/exp2(lod), p = uv*ts, t1 = floor(p-.5)+.5, f = p-t1;
  vec2 w0=f*(-.5+f*(1.-.5*f)), w1=1.+f*f*(-2.5+1.5*f), w2=f*(.5+f*(2.-1.5*f)), w3=f*f*(-.5+.5*f);
  vec2 w12=w1+w2, a=(t1-1.)/ts, b=(t1+w2/w12)/ts, c=(t1+2.)/ts;
  return textureLod(O,vec2(a.x,a.y),lod)*w0.x*w0.y + textureLod(O,vec2(b.x,a.y),lod)*w12.x*w0.y + textureLod(O,vec2(c.x,a.y),lod)*w3.x*w0.y
   + textureLod(O,vec2(a.x,b.y),lod)*w0.x*w12.y + textureLod(O,vec2(b.x,b.y),lod)*w12.x*w12.y + textureLod(O,vec2(c.x,b.y),lod)*w3.x*w12.y
   + textureLod(O,vec2(a.x,c.y),lod)*w0.x*w3.y + textureLod(O,vec2(b.x,c.y),lod)*w12.x*w3.y + textureLod(O,vec2(c.x,c.y),lod)*w3.x*w3.y;
}
vec3 ramp(float t){
  t = clamp(t,0.,1.);
  vec3 c0=vec3(.012,.062,.155), c1=vec3(.030,.160,.365), c2=vec3(.075,.355,.640), c3=vec3(.335,.665,.865), c4=vec3(.780,.910,.955), c5=vec3(1.);
  if (t<.24) return mix(c0,c1,t/.24); if (t<.47) return mix(c1,c2,(t-.24)/.23); if (t<.70) return mix(c2,c3,(t-.47)/.23);
  if (t<.88) return mix(c3,c4,(t-.70)/.18); return mix(c4,c5,(t-.88)/.12);
}
void main(){
  vec2 fc = gl_FragCoord.xy; fc.y = size.y-fc.y;             // top left origin
  vec2 s = fc/size, s1 = portrait>.5 ? vec2(s.y,1.-s.x) : s;    // where on the print, in plan orientation
  vec2 m = view.xy + s1*view.zw, uv = m/WH, pm = s1*vec2(11.2,7.68); // metres in the home / on the paper
  vec4 z = cubic(uv,0.);
  float lodS = mix(2.6,.5,sharp);
  vec2 j = mix(3.2,.6,sharp)/grid;
  float P = (textureLod(O,uv+j*vec2(.7,.3),lodS).z+textureLod(O,uv+j*vec2(-.3,.7),lodS).z+textureLod(O,uv+j*vec2(-.7,-.3),lodS).z+textureLod(O,uv+j*vec2(.3,-.7),lodS).z)*.25/64.;
  vec2 jl = 3.2/grid;
  float PL = (textureLod(O,uv+jl*vec2(3,0),4.).z+textureLod(O,uv-jl*vec2(3,0),4.).z+textureLod(O,uv+jl*vec2(0,3),4.).z+textureLod(O,uv-jl*vec2(0,3),4.).z)*.25/64.;
  float d = p1 + 4.342945*log(max(P,1e-12));                 // dBm, small neighbourhood
  float dL = p1 + 4.342945*log(max(PL,1e-12));
  float base = clamp((mix(d,dL,mix(.5,0.,sharp))+90.)/60.,0.,1.);  // -90 dBm black-blue ... -30 dBm white
  base = mix(pow(base,1.16), clamp((d-lev)/30.,0.,1.), sharp);   // close up: fixed spots, not passing crests
  // the wave itself, relative to its neighbourhood
  float Pw = mix(P,PL,.35);
  float r = max(length(m-src),.2), a = sqrt(max(mix(Pw,PL,sharp)*mix(r,1.,search),1e-13));
  float rip = clamp(z.x/8./a/1.35,-1.6,1.6);
  float crest = exp(2.1*(min(rip,1.)-1.));                   // thin bright crests, broad dark troughs
  float env = smoothstep(.0,.22,base);
  float t = base*.80 + env*(crest-.34)*mix(.17,.33,smoothstep(.05,.6,base))*mix(1.,.42,sharp);
  // light falls across the ripples from the upper left, like a wet sheet
  vec2 g = vec2(dFdx(rip),dFdy(rip))*ppm*.011;
  t += env*clamp(dot(g,vec2(-.6,.8)),-1.,1.)*.05;
  t += flash*exp(-pow(length(m-src)*1.6,2.))*.25;
  // places kept dark for lettering
  float k = 0.;
  for (int i=0;i<12;i++){ vec4 b = L[i]; if (b.z<=0.) continue; vec2 q = abs(fc-b.xy)-b.zw; float sd = length(max(q,0.))+min(max(q.x,q.y),0.); k = max(k, 1.-smoothstep(-2.*px,13.*px,sd)); }
  t = mix(t, min(t,.17), k*.9);
  // emulsion: uneven wash and paper tooth
  float wash = fbm(pm*vec2(.9,.35)+3.)-.5, tooth = h21(floor(fc/max(1.,px))+.5)-.5;
  vec3 c = ramp(t + wash*.04 + tooth*.014);
  // brushed edge
  vec2 e2 = min(pm, vec2(11.2,7.68)-pm);
  float streak = fbm(vec2(pm.x*1.1,pm.y*9.))*.15, streak2 = fbm(vec2(pm.x*9.,pm.y*1.1)+9.)*.13;
  float ed = min(e2.x-.02-streak, e2.y-.02-streak2);
  float al = smoothstep(0.,.04,ed+.03*(fbm(pm*30.)-.5));
  c = mix(c, mix(vec3(.09,.22,.42),vec3(.02,.085,.20),paper), (1.-smoothstep(.0,.15,ed))*mix(.55,.45,paper)); // pigment pools at the edge
  c *= mix(.93,1.,paper);
  col = vec4(c*al, al);
}`;

export class Engine {
  constructor(canvas, tier = 0, opt = {}) {
    this.canvas = canvas;
    const gl = this.gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
    if (!gl) throw new Error("no webgl2");
    const ext = gl.getExtension("EXT_color_buffer_float"), half = gl.getExtension("EXT_color_buffer_half_float");
    if (!ext && !half) throw new Error("no float targets");
    this.full = !!ext && !opt.half;
    this.ncell = [[1120, 768], [840, 576]][tier]; this.tier = tier; this.labels = new Float32Array(48); this.view = { x: 0, y: 0, w: W, h: H }; this.sharp = 0; this.px = 1; this.paper = 1;
    const [nx, ny] = this.ncell; this.nx = nx; this.ny = ny; this.dx = W / nx;
    this.n = 0; this.ramp0 = 0; this.phase = 0; this.vis = 0;
    
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    // where the chip cannot draw into float textures, the same 32 bits travel as whole numbers
    const UI = [gl.RG32UI, gl.RG_INTEGER, gl.UNSIGNED_INT]; this.sf = this.full ? [gl.RG32F, gl.RG, gl.FLOAT] : UI;
    this.S = [this.state(), this.state()];
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { this.sf = UI; this.full = false; this.S = [this.state(), this.state()]; }
    const ff = this.full; this.prog = { step: this.program(STEP(false, ff)), stepQ: this.program(STEP(true, ff)), obs: this.program(OBS(ff)), draw: this.program(DRAW) };
    this.M = this.tex(gl.RG32F, gl.RG, gl.FLOAT, gl.NEAREST); this.Q = null;
    this.levels = Math.floor(Math.log2(Math.max(nx, ny))) + 1;
    this.O = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.O); gl.texStorage2D(gl.TEXTURE_2D, this.levels, gl.RGBA16F, nx, ny);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    this.Of = []; for (let l = 0; l < 6; l++) { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.O, l); this.Of.push(f); }
    this.RL = 4; this.rx = nx >> this.RL; this.ry = ny >> this.RL;
    this.src = [W / 2, H / 2]; this.portrait = false; this.search = 0; this.flash = 0; this.pending = null; this.lastObs = -1;
    this.reset();
  }
  program(fs) { const gl = this.gl, p = gl.createProgram();
    for (const [t, s] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); gl.attachShader(p, sh); }
    gl.bindAttribLocation(p, 0, "p"); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) { const n = gl.getActiveUniform(p, i).name; u[n] = gl.getUniformLocation(p, n); } return { p, u }; }
  tex(i, f, t, filter) { const gl = this.gl, x = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, x); gl.texImage2D(gl.TEXTURE_2D, 0, i, this.nx, this.ny, 0, f, t, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, filter], [gl.TEXTURE_MAG_FILTER, filter], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return x; }
  state() { const gl = this.gl, t = this.tex(...this.sf, gl.NEAREST), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f }; }
  reset() { const gl = this.gl; for (const s of this.S) { gl.bindFramebuffer(gl.FRAMEBUFFER, s.f); if (this.full) gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]); else gl.clearBufferuiv(gl.COLOR, 0, [0, 0, 0, 0]); } this.n = 0; this.ramp0 = 0; this.phase = 0; }
  setBand(band) { this.dx = W / this.nx; this.band = band; this.p = bandParams(band, this.dx); this.fits = allFits(band, this.dx); this.amp = sourceAmp(this.p); this.p1 = dbm1m(band); }
  setPlan(ids) { this.ids = ids; const gl = this.gl, c = coefficients(ids, this.nx, this.ny, this.band, this.dx, this.fits);
    gl.bindTexture(gl.TEXTURE_2D, this.M); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.nx, this.ny, gl.RG, gl.FLOAT, c); }
  // only a rectangle of the home changed (something was dragged). r in metres
  patch(ids, [x1, y1, x2, y2]) {
    const gl = this.gl, { nx, ny, dx } = this, i0 = Math.max(0, Math.floor(x1 / dx) - 1), j0 = Math.max(0, Math.floor(y1 / dx) - 1), i1 = Math.min(nx, Math.ceil(x2 / dx) + 1), j1 = Math.min(ny, Math.ceil(y2 / dx) + 1), w = i1 - i0, h = j1 - j0; if (w < 1 || h < 1) return;
    this.ids = ids; const a = new Float32Array(w * h * 2), K0 = C0 * C0, n = Math.round(SPONGE / dx), tab = {}; for (const f of Object.values(this.fits)) tab[WALLS[f.name].id] = f;
    for (let j = 0, q = 0; j < h; j++) for (let i = 0; i < w; i++, q += 2) { const I = i + i0, J = j + j0, id = ids[J * nx + I]; let K = K0, s = 0; if (id === 6) K = 0; else if (id && tab[id]) { K = tab[id].K; s = tab[id].s; } const e = Math.min(I, J, nx - 1 - I, ny - 1 - J); if (e < n) { const t = 1 - e / n; s += .22 * t * t * t; } a[q] = K; a[q + 1] = s; }
    gl.bindTexture(gl.TEXTURE_2D, this.M); gl.texSubImage2D(gl.TEXTURE_2D, 0, i0, j0, w, h, gl.RG, gl.FLOAT, a);
  }
  // several small transmitters with random timing, spread over a room (used by the search). pts in metres.
  setRoomSource(pts, seed = 1) { const gl = this.gl, { nx, ny } = this, a = new Float32Array(nx * ny * 2); let s = seed * 7919 % 233280;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280, amp = this.amp / Math.sqrt(pts.length) / (2 * Math.PI * SRC_SIGMA ** 2);
    for (const [x, y] of pts) { const cx = x / this.dx - 0.5, cy = y / this.dx - 0.5, ph = rnd() * 2 * Math.PI;
      for (let j = Math.round(cy) - 5; j <= cy + 5; j++) for (let i = Math.round(cx) - 5; i <= cx + 5; i++) { if (i < 1 || j < 1 || i > nx - 2 || j > ny - 2) continue;
        const g = amp * Math.exp(-((i - cx) ** 2 + (j - cy) ** 2) / (2 * SRC_SIGMA ** 2)), q = 2 * (j * nx + i); a[q] += g * Math.cos(ph); a[q + 1] += g * Math.sin(ph); } }
    if (!this.Q) this.Q = this.tex(gl.RG32F, gl.RG, gl.FLOAT, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, this.Q); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, nx, ny, gl.RG, gl.FLOAT, a); }
  step(count) {
    const gl = this.gl, pr = this.search ? this.prog.stepQ : this.prog.step; gl.useProgram(pr.p); gl.viewport(0, 0, this.nx, this.ny);
    gl.uniform1i(pr.u.S, 0); gl.uniform1i(pr.u.M, 1); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.M);
    if (this.search) { gl.uniform1i(pr.u.Q, 2); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.Q); }
    gl.activeTexture(gl.TEXTURE0);
    const sx = this.src[0] / this.dx - 0.5, sy = this.src[1] / this.dx - 0.5, A = this.amp / (2 * Math.PI * SRC_SIGMA ** 2);
    for (let i = 0; i < count; i++) {
      this.phase = (this.phase + this.p.w) % (2 * Math.PI); this.n++;
      let g = Math.min(1, (this.n - this.ramp0) / 60); g = g * g * (3 - 2 * g);
      if (this.search) gl.uniform2f(pr.u.q, g * Math.cos(this.phase), g * Math.sin(this.phase));
      else gl.uniform3f(pr.u.src, sx, sy, A * g * Math.cos(this.phase));
      gl.bindTexture(gl.TEXTURE_2D, this.S[0].t); gl.bindFramebuffer(gl.FRAMEBUFFER, this.S[1].f); gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.S.reverse();
    }
  }
  observe() { // field -> wave + power texture with averages
    const gl = this.gl, pr = this.prog.obs, w = this.p.w; gl.useProgram(pr.p); gl.viewport(0, 0, this.nx, this.ny); gl.bindFramebuffer(gl.FRAMEBUFFER, this.Of[0]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.S[0].t); gl.uniform1i(pr.u.S, 0);
    gl.uniform2f(pr.u.trig, 1 / (2 * Math.sin(w / 2) * Math.cos(w / 2)), Math.tan(w / 2));
    const d = this.vis - this.phase; gl.uniform2f(pr.u.rot, Math.cos(d), Math.sin(d));
    gl.uniform2f(pr.u.src, this.src[0] / this.dx - 0.5, this.src[1] / this.dx - 0.5); gl.uniform1f(pr.u.dx, this.dx); gl.uniform1f(pr.u.dist, this.search ? 0 : 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindTexture(gl.TEXTURE_2D, this.O); gl.generateMipmap(gl.TEXTURE_2D);
  }
  draw(w, h, target = null) {
    const gl = this.gl, pr = this.prog.draw; gl.useProgram(pr.p); gl.bindFramebuffer(gl.FRAMEBUFFER, target); gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.O); gl.uniform1i(pr.u.O, 0);
    gl.uniform2f(pr.u.size, w, h); gl.uniform2f(pr.u.grid, this.nx, this.ny); gl.uniform2f(pr.u.src, this.src[0], this.src[1]);
    const v = this.view; gl.uniform2f(pr.u.WH, W, H); gl.uniform4f(pr.u.view, v.x, v.y, v.w, v.h); gl.uniform4fv(pr.u["L[0]"], this.labels); gl.uniform1f(pr.u.sharp, this.sharp); gl.uniform1f(pr.u.px, this.px); gl.uniform1f(pr.u.paper, this.paper); gl.uniform1f(pr.u.lev, this.lev ?? -94);
    gl.uniform1f(pr.u.portrait, this.portrait ? 1 : 0); gl.uniform1f(pr.u.p1, this.p1); gl.uniform1f(pr.u.flash, this.flash); gl.uniform1f(pr.u.search, this.search ? 1 : 0);
    gl.uniform1f(pr.u.ppm, w / (this.portrait ? v.h : v.w));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  // asynchronous read of the coarse power map (16 cells squares) and one fine patch; never stalls the picture
  requestRead(px, py, L = 2) {
    if (this.pending) return false; const gl = this.gl; this.pbo ||= gl.createBuffer(); this.pbo2 ||= gl.createBuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.Of[this.RL]); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo); gl.bufferData(gl.PIXEL_PACK_BUFFER, this.rx * this.ry * 16, gl.STREAM_READ);
    gl.readPixels(0, 0, this.rx, this.ry, gl.RGBA, gl.FLOAT, 0);
    const gx = this.nx >> L, gy = this.ny >> L, ux = Math.max(0, Math.min(gx - 1.001, px / W * gx - .5)), uy = Math.max(0, Math.min(gy - 1.001, py / H * gy - .5)), fx = Math.floor(ux), fy = Math.floor(uy);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.Of[L]); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo2); gl.bufferData(gl.PIXEL_PACK_BUFFER, 64, gl.STREAM_READ); gl.readPixels(fx, fy, 2, 2, gl.RGBA, gl.FLOAT, 0);
    const wx = ux - fx, wy = uy - fy, wt = [(1 - wx) * (1 - wy), wx * (1 - wy), (1 - wx) * wy, wx * wy];
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    this.pending = { sync: gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0), n: this.n, wt, at: [px, py] }; gl.flush(); return true;
  }
  pollRead() {
    const P = this.pending; if (!P) return null; const gl = this.gl, s = gl.clientWaitSync(P.sync, 0, 0); if (s === gl.TIMEOUT_EXPIRED) return null;
    gl.deleteSync(P.sync); this.pending = null; if (s === gl.WAIT_FAILED) return null;
    const a = new Float32Array(this.rx * this.ry * 4), b = new Float32Array(16);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, a); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo2); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, b); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    const p = new Float32Array(this.rx * this.ry); for (let i = 0; i < p.length; i++) p[i] = a[4 * i + 2] / 64;
    return { p, phone: P.wt.reduce((s, k, i) => s + k * b[4 * i + 2], 0) / 64, at: P.at, n: P.n };
  }
  async readNow(px = 1, py = 1) { while (this.pending) { this.pollRead(); await new Promise((r) => setTimeout(r, 2)); } this.observe(); this.requestRead(px, py); let r; while (!(r = this.pollRead())) await new Promise((q) => setTimeout(q, 2)); return r; }
  readField() { const gl = this.gl, a = new Float32Array(this.nx * this.ny * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, this.S[0].f); gl.readPixels(0, 0, this.nx, this.ny, gl.RGBA, gl.FLOAT, a); return a; } // tests only
}
Engine.prototype.dispose = function () { const gl = this.gl; for (const s of this.S) { gl.deleteTexture(s.t); gl.deleteFramebuffer(s.f); } gl.deleteTexture(this.M); gl.deleteTexture(this.O); if (this.Q) gl.deleteTexture(this.Q); this.Of.forEach((f) => gl.deleteFramebuffer(f)); };
