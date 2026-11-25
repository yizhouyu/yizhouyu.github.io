// Shallow water on the GPU (WebGL2, RGBA32F).
// Finite volumes: HLL fluxes, hydrostatic reconstruction (Audusse et al. 2004) so that still water stays still,
// semi-implicit Manning friction, and porosity so that 8 m cells know how much of them is street and how much is building.
//   state Q = (h, hu, hv, deepest h so far)      bed B = (z, phi, psiX, psiY)
//   phi: open share of the cell (0 = all building, 2 = harbour); psiX/psiY: open share of the face on the +x / +y side.
export const G = 9.81;
const VS = `#version 300 es
precision highp float; layout(location=0) in vec2 a; layout(location=1) in vec2 t; uniform vec2 uN; uniform float uT;
void main(){ vec2 p=min((t+a)*uT,uN)/uN; gl_Position=vec4(p*2.-1.,0.,1.); }`;
const HEAD = `#version 300 es
precision highp float; precision highp sampler2D;
uniform sampler2D uQ,uB; uniform float uSea; uniform ivec2 uS; `;
const STEP = (mut) => HEAD + `
uniform float uDt,uDx,uN2,uRain; uniform vec4 uBrush; uniform vec4 uBrush2; out vec4 o;
const float g=9.81, EPS=1e-5;
vec4 Q(ivec2 c,vec4 b){ vec4 q=texelFetch(uQ,c,0); if(b.y>1.5) return vec4(max(uSea-b.x,0.),0.,0.,q.w); return q; }
vec2 vel(vec4 q){ float h=q.x; return h<EPS?vec2(0.):q.yz*2.*h/(h*h+max(h*h,1e-6)); }
// flux through a face with normal n (0:x 1:y); left l, right r. returns mass, normal momentum, transverse momentum
vec3 hll(float hl,float ul,float vl,float hr,float ur,float vr){
  if(hl<EPS&&hr<EPS) return vec3(0.);
  float cl=sqrt(g*hl),cr=sqrt(g*hr);
  float SL=hl<EPS?ur-2.*cr:min(ul-cl,ur-cr), SR=hr<EPS?ul+2.*cl:max(ul+cl,ur+cr);
  float ml=hl*ul,mr=hr*ur; vec2 Fl=vec2(ml,ml*ul+.5*g*hl*hl),Fr=vec2(mr,mr*ur+.5*g*hr*hr); vec2 F;
  if(SL>=0.) F=Fl; else if(SR<=0.) F=Fr; else F=(SR*Fl-SL*Fr+SL*SR*vec2(hr-hl,mr-ml))/(SR-SL);
  return vec3(F, F.x*(F.x>0.?vl:vr));
}
void main(){
  ivec2 c=ivec2(gl_FragCoord.xy); vec4 b=texelFetch(uB,c,0);
  vec4 q0=texelFetch(uQ,c,0);
  if(b.y<.01){ o=vec4(0.); return; }
  if(b.y>1.5){ float h=max(uSea-b.x,0.); o=vec4(h,0.,0.,max(q0.w,h)); return; }
  ivec2 e=min(c+ivec2(1,0),uS-1),w=max(c-ivec2(1,0),ivec2(0)),n=min(c+ivec2(0,1),uS-1),s=max(c-ivec2(0,1),ivec2(0));
  vec4 be=texelFetch(uB,e,0),bw=texelFetch(uB,w,0),bn=texelFetch(uB,n,0),bs=texelFetch(uB,s,0);
  vec4 q=Q(c,b),qe=Q(e,be),qw=Q(w,bw),qn=Q(n,bn),qs=Q(s,bs);
  float pe=c.x==uS.x-1?0.:b.z, pw=c.x==0?0.:bw.z, pn=c.y==uS.y-1?0.:b.w, ps=c.y==0?0.:bs.w;
  vec2 u=vel(q); float h=q.x, cc=sqrt(g*h); float dM=0.; vec2 dP=vec2(0.);
  float S=abs(u.x)+cc, Sy=abs(u.y)+cc;
  { float zf=max(b.x,be.x); vec2 U=vel(qe); float a=max(0.,h+b.x-zf),d=max(0.,qe.x+be.x-zf); vec3 F=hll(a,u.x,u.y,d,U.x,U.y);
    dM-=pe*F.x; dP-=pe*vec2(F.y-.5*g*a*a${mut === 'balance' ? '*0.97' : ''},F.z); dP.x-=(1.-pe)*(h*u.x*(u.x+S)); }
  { float zf=max(b.x,bw.x); vec2 U=vel(qw); float a=max(0.,h+b.x-zf),d=max(0.,qw.x+bw.x-zf); vec3 F=hll(d,U.x,U.y,a,u.x,u.y);
    dM+=pw*F.x${mut === 'mass' ? '*1.002' : ''}; dP+=pw*vec2(F.y-.5*g*a*a,F.z); dP.x+=(1.-pw)*(h*u.x*(u.x-S)); }
  { float zf=max(b.x,bn.x); vec2 U=vel(qn); float a=max(0.,h+b.x-zf),d=max(0.,qn.x+bn.x-zf); vec3 F=hll(a,u.y,u.x,d,U.y,U.x);
    dM-=pn*F.x; dP-=pn*vec2(F.z,F.y-.5*g*a*a); dP.y-=(1.-pn)*(h*u.y*(u.y+Sy)); }
  { float zf=max(b.x,bs.x); vec2 U=vel(qs); float a=max(0.,h+b.x-zf),d=max(0.,qs.x+bs.x-zf); vec3 F=hll(d,U.y,U.x,a,u.y,u.x);
    dM+=ps*F.x; dP+=ps*vec2(F.z,F.y-.5*g*a*a); dP.y+=(1.-ps)*(h*u.y*(u.y-Sy)); }
  float k=uDt/(uDx*b.y); float h1=h+k*dM; vec2 p1=q.yz+k*dP;
  h1=max(h1,0.);
  float r=uRain; vec2 x=(vec2(c)+.5); vec2 dd=x-uBrush.xy; r+=uBrush.w*exp(-dot(dd,dd)/(uBrush.z*uBrush.z)); dd=x-uBrush2.xy; r+=uBrush2.w*exp(-dot(dd,dd)/(uBrush2.z*uBrush2.z));
  h1+=r*uDt;
  if(h1<1e-4) p1=vec2(0.); else { vec2 v=p1*2.*h1/(h1*h1+max(h1*h1,1e-6)); float sp=length(v); p1=h1*v/(1.+uDt*g*uN2*sp/pow(max(h1,1e-3),1.3333)); float L=8.; sp=length(p1)/h1; if(sp>L) p1*=L/sp; }
  o=vec4(h1,p1,max(q0.w,h1));
}`;
// what the renderer needs: surface height spread a little into dry ground and buildings, depth, speed, deepest
const SURF = HEAD + `uniform float uFill; out vec4 o; float eta(ivec2 c,out float h,out vec4 q){ vec4 b=texelFetch(uB,c,0); q=texelFetch(uQ,c,0); if(b.y>1.5){h=uSea-b.x; return uSea;} h=b.y<.01?0.:q.x; return b.x+h; }
void main(){ ivec2 c=ivec2(gl_FragCoord.xy); float h; vec4 q; float e=eta(c,h,q); vec4 b=texelFetch(uB,c,0);
 float sp=h>.02?length(q.yz)/max(h,.05):0.; float H=h;
 if(h<.004){ float m=0.,wt=0.; for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){ if(x==0&&y==0)continue; ivec2 d=clamp(c+ivec2(x,y),ivec2(0),uS-1); float h2; vec4 q2; float e2=eta(d,h2,q2); float w=h2>.004?1./float(x*x+y*y):0.; m+=w*e2; wt+=w; }
   if(wt<=0.&&uFill>.5&&b.y<.01){ for(int k=0;k<8;k++){ ivec2 dd=ivec2(k<4?(k==0?1:k==1?-1:0):(k<6?1:-1),k<4?(k==2?1:k==3?-1:0):(k==4||k==6?1:-1)); for(int r=3;r<=9;r++){ ivec2 d=clamp(c+dd*r,ivec2(0),uS-1); float h2; vec4 q2; float e2=eta(d,h2,q2); if(texelFetch(uB,d,0).y>.01){ if(h2>.02){ float w=1./float(r*r); m+=w*e2; wt+=w; } break; } } } }
   if(wt>0.){ e=m/wt; H=max(H,uFill>.5&&b.y<.01?max(e-b.x,0.):min(e-b.x,.6)); H=max(H,0.); } else e=b.x-1.; }
 o=vec4(e,H,sp,q.w); }`;
const PROBE = HEAD + `uniform sampler2D uP; out vec4 o; void main(){ vec4 p=texelFetch(uP,ivec2(gl_FragCoord.xy),0); ivec2 c=ivec2(p.xy); vec4 b=texelFetch(uB,c,0),q=texelFetch(uQ,c,0);
 if(p.z<.5) o=b.y>1.5?vec4(uSea-b.x,0.,0.,q.w):vec4(q.x,length(q.yz)/max(q.x,.02),b.x,q.w);
 else { float m=0.,mh=0.,s=0.,wet=0.; for(int y=0;y<32;y++)for(int x=0;x<32;x++){ ivec2 d=min(c+ivec2(x,y),uS-1); vec4 B=texelFetch(uB,d,0); if(B.y<.01||B.y>1.5) continue; vec4 q=texelFetch(uQ,d,0); mh=max(mh,q.x); m=max(m,q.x>.1?length(q.yz)/q.x:0.); s+=q.x*B.y; if(q.x>.1) wet+=B.y; } o=vec4(mh,m,s,wet); } }`;

export function compile(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [t, s] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(o) + '\n' + s.split('\n').map((l, i) => (i + 1) + ' ' + l).join('\n').slice(0, 6000));
    gl.attachShader(p, o);
  }
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i).name.replace('[0]', ''); u[a] = gl.getUniformLocation(p, a); }
  return { p, u };
}
export function tex(gl, w, h, ifmt, fmt, type, data, filter) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data || null);
  const f = filter || gl.NEAREST;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f === gl.LINEAR_MIPMAP_LINEAR ? gl.LINEAR : f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
export function fbo(gl, t) { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return f; }

export class Sim {
  // bed: Float32Array nx*ny*4 (z, phi, psiX, psiY)
  constructor(gl, { nx, ny, dx, bed, manning = 0.03, sea = -50, mutate = '' }) {
    this.gl = gl; this.nx = nx; this.ny = ny; this.dx = dx; this.n2 = manning * manning; this.sea = sea; this.bed = bed; this.z0 = Float32Array.from({ length: nx * ny }, (_, i) => bed[i * 4]);
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('nofloat');
    this.step_ = compile(gl, VS, STEP(mutate)); this.surf_ = compile(gl, VS, SURF); this.probe_ = compile(gl, VS, PROBE);
    const F = [gl.RGBA32F, gl.RGBA, gl.FLOAT];
    this.B = tex(gl, nx, ny, ...F, bed);
    this.Q = [tex(gl, nx, ny, ...F), tex(gl, nx, ny, ...F)]; this.F = this.Q.map(t => fbo(gl, t));
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('nofloat');
    this.S = tex(gl, nx, ny, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null, gl.LINEAR); this.SF = fbo(gl, this.S);
    this.T = 32; this.tx = Math.ceil(nx / 32); this.ty = Math.ceil(ny / 32); this.nt = this.tx * this.ty;
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const q = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, q); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.tb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.tb); gl.bufferData(gl.ARRAY_BUFFER, this.nt * 8, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);
    // lowest open land in every tile, for deciding which tiles need work
    this.low = new Float32Array(this.nt).fill(99); this.land = new Uint8Array(this.nt);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, phi = bed[k * 4 + 1]; if (phi > .01 && phi < 1.5) { const t = (j >> 5) * this.tx + (i >> 5); this.land[t] = 1; if (bed[k * 4] < this.low[t]) this.low[t] = bed[k * 4]; } }
    this.allLand = false; this.active = new Uint8Array(this.nt); this.na = 0; this.cur = 0; this.time = 0; this.hmax = 1; this.umax = 1; this.rain = 0; this.brush = [0, 0, 1, 0]; this.brush2 = [0, 0, 1, 0]; this.dirty = true;
    this.maxSea = sea; this.poured = 0; this.pending = []; this.initProbes([]); this.reset(null);
  }
  reset(h) { // h: Float32Array of depths on land (or null = dry land)
    const { gl, nx, ny, bed } = this, d = new Float32Array(nx * ny * 4);
    for (let k = 0; k < nx * ny; k++) { const phi = bed[k * 4 + 1]; let v = 0; if (phi > 1.5) v = Math.max(this.sea - bed[k * 4], 0); else if (h && phi > .01) v = Math.max(0, h[k]); d[k * 4] = v; d[k * 4 + 3] = v; }
    for (const t of this.Q) { gl.bindTexture(gl.TEXTURE_2D, t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, nx, ny, gl.RGBA, gl.FLOAT, d); }
    this.active.fill(0); this.allLand = !!h; this.maxSea = this.sea; this.time = 0; this.poured = 0; this.hmax = .5; this.umax = 1; this.gen = (this.gen || 0) + 1; this.pickTiles(true); this.dirty = true;
  }
  setState(d) { const { gl, nx, ny } = this; for (const t of this.Q) { gl.bindTexture(gl.TEXTURE_2D, t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, nx, ny, gl.RGBA, gl.FLOAT, d); } this.allLand = true; this.pickTiles(true); this.dirty = true; }
  // cells: list of [k, z]; walls raise the bed. The caller passes the whole set every time.
  setWalls(cells) {
    const { gl, nx, ny, bed } = this; for (let k = 0; k < nx * ny; k++) bed[k * 4] = this.z0[k];
    for (const [k, z] of cells) if (bed[k * 4 + 1] < 1.5) bed[k * 4] = Math.max(bed[k * 4], z);
    gl.bindTexture(gl.TEXTURE_2D, this.B); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, nx, ny, gl.RGBA, gl.FLOAT, bed); this.dirty = true;
  }
  pickTiles(force) {
    let ch = !!force; if (this.sea > this.maxSea) this.maxSea = this.sea;
    const L = this.maxSea + .15;
    for (let t = 0; t < this.nt; t++) if (!this.active[t] && this.land[t] && (this.allLand || this.low[t] <= L)) { this.active[t] = 1; ch = true; }
    if (!ch) return; const a = []; for (let t = 0; t < this.nt; t++) if (this.active[t]) a.push(t % this.tx, Math.floor(t / this.tx));
    this.na = a.length / 2; const { gl } = this; gl.bindBuffer(gl.ARRAY_BUFFER, this.tb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(a));
  }
  dt() { // stable step from the deepest water on land (known bound + measured)
    const zl = .4, h = Math.max(.6, Math.min(Math.max(this.sea, -1) - zl, 8), this.hmax * 1.15); return Math.min(1.2, .44 * this.dx / (Math.sqrt(G * h) + Math.max(1.6, Math.min(this.umax, 6) * .8)));
  }
  steps(n, dt) {
    const { gl } = this, P = this.step_, u = P.u; if (!dt) dt = this.dt();
    if (this.rain > 0 || this.brush[3] > 0 || this.brush2[3] > 0) this.allLand = true;
    this.pickTiles(); gl.useProgram(P.p); gl.bindVertexArray(this.vao); gl.viewport(0, 0, this.nx, this.ny); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.uniform2f(u.uN, this.nx, this.ny); gl.uniform1f(u.uT, 32); gl.uniform2i(u.uS, this.nx, this.ny); gl.uniform1i(u.uQ, 0); gl.uniform1i(u.uB, 1);
    gl.uniform1f(u.uDt, dt); gl.uniform1f(u.uDx, this.dx); gl.uniform1f(u.uN2, this.n2); gl.uniform1f(u.uRain, this.rain); gl.uniform4fv(u.uBrush, this.brush); gl.uniform4fv(u.uBrush2, this.brush2);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.B); gl.activeTexture(gl.TEXTURE0);
    if (this.na) for (let s = 0; s < n; s++) { // sea level may be a function of time
      if (this.seaFn) { this.sea = this.seaFn(this.time + dt); if (this.sea > this.maxSea + .1) { this.pickTiles(); } }
      gl.uniform1f(u.uSea, this.sea); gl.bindTexture(gl.TEXTURE_2D, this.Q[this.cur]); gl.bindFramebuffer(gl.FRAMEBUFFER, this.F[1 - this.cur]);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.na); this.cur = 1 - this.cur; this.time += dt;
    } else { this.time += n * dt; if (this.seaFn) this.sea = this.seaFn(this.time); }
    this.dirty = true; return n * dt;
  }
  full(P, F, w, h) { const { gl } = this; gl.useProgram(P.p); gl.bindVertexArray(this.vao); gl.bindFramebuffer(gl.FRAMEBUFFER, F); gl.viewport(0, 0, w, h); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.uniform2f(P.u.uN, 1, 1); gl.uniform1f(P.u.uT, 1); gl.uniform2i(P.u.uS, this.nx, this.ny); gl.uniform1f(P.u.uSea, this.sea); gl.uniform1i(P.u.uQ, 0); gl.uniform1i(P.u.uB, 1);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.B); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.Q[this.cur]);
    gl.disableVertexAttribArray(1); gl.vertexAttrib2f(1, 0, 0); }
  surface() { if (!this.dirty) return false; const { gl } = this; this.full(this.surf_, this.SF, this.nx, this.ny); gl.uniform1f(this.surf_.u.uFill, this.fill ? 1 : 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.enableVertexAttribArray(1); this.dirty = false; return true; }
  // ---- probes: first 512*? cells = points, then one per tile (statistics)
  initProbes(pts) {
    const { gl } = this, W = 512; this.np = pts.length; const rows = Math.ceil(this.np / W) || 1, tr = Math.ceil(this.nt / W); this.pw = W; this.ph = rows + tr; this.prow = rows;
    const d = new Float32Array(W * this.ph * 4); pts.forEach((p, i) => { d[i * 4] = p[0]; d[i * 4 + 1] = p[1]; });
    for (let t = 0; t < this.nt; t++) { const o = (rows * W + t) * 4; d[o] = (t % this.tx) * 32; d[o + 1] = Math.floor(t / this.tx) * 32; d[o + 2] = 1; }
    if (this.P) { gl.deleteTexture(this.P); gl.deleteTexture(this.PT); gl.deleteFramebuffer(this.PF); }
    this.P = tex(gl, W, this.ph, gl.RGBA32F, gl.RGBA, gl.FLOAT, d); this.PT = tex(gl, W, this.ph, gl.RGBA32F, gl.RGBA, gl.FLOAT, null); this.PF = fbo(gl, this.PT); this.pts = pts;
  }
  setPoint(i, p) { const { gl } = this; gl.bindTexture(gl.TEXTURE_2D, this.P); gl.texSubImage2D(gl.TEXTURE_2D, 0, i % this.pw, Math.floor(i / this.pw), 1, 1, gl.RGBA, gl.FLOAT, new Float32Array([p[0], p[1], 0, 0])); }
  probeDraw() { const { gl } = this; this.full(this.probe_, this.PF, this.pw, this.ph); gl.uniform1i(this.probe_.u.uP, 2); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.P); gl.activeTexture(gl.TEXTURE0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.enableVertexAttribArray(1); }
  absorb(d) { let mh = 0, mu = 0, vol = 0, wet = 0; const o = this.prow * this.pw; for (let t = 0; t < this.nt; t++) { const k = (o + t) * 4; if (!this.land[t]) continue; mh = Math.max(mh, d[k]); mu = Math.max(mu, d[k + 1]); vol += d[k + 2]; wet += d[k + 3]; }
    this.hmax = mh; this.umax = mu; this.volume = vol * this.dx * this.dx; this.wet = wet * this.dx * this.dx; return d; }
  probeSync() { const { gl } = this; this.probeDraw(); const d = new Float32Array(this.pw * this.ph * 4); gl.readPixels(0, 0, this.pw, this.ph, gl.RGBA, gl.FLOAT, d); return this.absorb(d); }
  probeAsync(cb) { // at most one in flight
    const { gl } = this; if (this.wait) return false; this.probeDraw();
    const n = this.pw * this.ph * 16; if (!this.pbo || this.pboN !== n) { this.pbo = gl.createBuffer(); this.pboN = n; gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo); gl.bufferData(gl.PIXEL_PACK_BUFFER, n, gl.STREAM_READ); }
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo); gl.readPixels(0, 0, this.pw, this.ph, gl.RGBA, gl.FLOAT, 0); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    this.wait = { s: gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0), cb, gen: this.gen, t: this.time, sea: this.sea }; gl.flush(); return true;
  }
  poll() { const { gl, wait } = this; if (!wait) return; const r = gl.clientWaitSync(wait.s, 0, 0); if (r === gl.TIMEOUT_EXPIRED) return; gl.deleteSync(wait.s); this.wait = null; if (r === gl.WAIT_FAILED) return;
    const d = new Float32Array(this.pw * this.ph * 4); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, d); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); if (wait.gen !== this.gen) return; this.absorb(d); wait.cb && wait.cb(d, wait); }
  readAsync(cb) { // whole state, at most one in flight
    const { gl } = this; if (this.rw) return false; const n = this.nx * this.ny * 16; if (!this.rb) { this.rb = gl.createBuffer(); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.rb); gl.bufferData(gl.PIXEL_PACK_BUFFER, n, gl.STREAM_READ); this.rd = new Float32Array(n / 4); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.F[this.cur]); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.rb); gl.readPixels(0, 0, this.nx, this.ny, gl.RGBA, gl.FLOAT, 0); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); this.rw = { s: gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0), cb, gen: this.gen }; gl.flush(); return true; }
  pollRead() { const { gl, rw } = this; if (!rw) return; const r = gl.clientWaitSync(rw.s, 0, 0); if (r === gl.TIMEOUT_EXPIRED) return; gl.deleteSync(rw.s); this.rw = null; if (r === gl.WAIT_FAILED) return; gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.rb); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this.rd); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); if (rw.gen === this.gen) rw.cb(this.rd); }
  read() { const { gl } = this, d = new Float32Array(this.nx * this.ny * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, this.F[this.cur]); gl.readPixels(0, 0, this.nx, this.ny, gl.RGBA, gl.FLOAT, d); return d; }
}
