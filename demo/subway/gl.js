// Raw WebGL2 drawing: shore, city strokes, tracks, trains. No library.
const CAPS_V = `#version 300 es
precision highp float;
layout(location=0) in vec2 q; layout(location=1) in vec4 P; layout(location=2) in vec4 O; layout(location=3) in vec4 C; layout(location=4) in vec4 A;
uniform mat4 M; uniform vec2 res; uniform float slot, wide, dpr, mode, lim, reveal, flip, warp; uniform highp sampler2D hops, warps;
out vec2 px; flat out vec2 s0, s1; flat out float w; out vec4 col; flat out vec4 tt; flat out float wt; flat out float ex;
void main(){
  vec4 Q=P; float hide=0.;
  if(warp>0.&&(mode>.5&&mode<1.5||mode>2.5)){ int h=int(A.x+.5); vec4 W=texelFetch(warps,ivec2(h%64,h/64),0); if(W.x>9e6||W.z>9e6) hide=1.; else Q=mix(P,vec4(mix(W.xy,W.zw,A.y),mix(W.xy,W.zw,A.z)),warp); }
  vec4 a=M*vec4(Q.xy+O.xy*slot,0.,1.), b=M*vec4(Q.zw+O.zw*slot,0.,1.);
  w=wide; col=C; tt=vec4(0.); wt=0.; ex=0.;
  if(mode>.5&&mode<1.5){ int h=int(A.x+.5); vec4 t=texelFetch(hops,ivec2(h%64,h/64),0);
    tt=vec4(mix(t.x,t.y,A.y),mix(t.x,t.y,A.z),mix(t.z,t.w,1.-A.y),mix(t.z,t.w,1.-A.z));
    float e=min(min(tt.x,tt.y),min(tt.z,tt.w)); if(e>min(lim,reveal)){ gl_Position=vec4(2.,2.,2.,1.); return; } 
    w=wide; }
  if(mode>1.5&&mode<2.5){ w=wide*A.x; col.a*=A.y; }
  s0=(a.xy/a.w*.5+.5)*res; s1=(b.xy/b.w*.5+.5)*res;
  vec2 d=s1-s0; float L=length(d); d=L>.01?d/L:vec2(1.,0.); vec2 n=vec2(-d.y,d.x);
  float R=w*.5+2.*dpr+flip*w*1.9; 
  px=mix(s0,s1,q.x)+d*(q.x*2.-1.)*R+n*q.y*R;
  vec4 m=q.x<.5?a:b; gl_Position=vec4((px/res*2.-1.)*1.,0.,1.); if(a.w<0.||b.w<0.||hide>.5) gl_Position=vec4(2.,2.,2.,1.);
}`;
const CAPS_F = `#version 300 es
precision highp float;
in vec2 px; flat in vec2 s0,s1; flat in float w; in vec4 col; flat in vec4 tt; flat in float ex;
uniform float mode, lim, reveal, flip, dpr, glow, fade; uniform vec3 casing; uniform vec4 tint; uniform float caseW, boost, dark; out vec4 o;
void main(){
  vec2 d=s1-s0; float L2=dot(d,d); float h=L2>1e-4?clamp(dot(px-s0,d)/L2,0.,1.):0.; float r=length(px-s0-d*h); float hw=w*.5;
  vec3 c=mix(col.rgb,tint.rgb,tint.a); if(dark>.5){ float l=dot(c,vec3(.3,.59,.11)); c=l>.4?c*.42:c; } float al=col.a*fade, front=0.;
  if(mode>.5&&mode<1.5){ float t=min(mix(tt.x,tt.y,h),mix(tt.z,tt.w,h)); float T=min(lim,reveal); if(t>T) discard;
    front=reveal<lim*1.05?smoothstep(lim*.06,0.,T-t)*.8:0.; }
  c+=flip*max(0.,.52-dot(c,vec3(.3,.59,.11)))*vec3(.8,.95,1.05)*step(tint.a,.99); c=mix(c,vec3(1.),boost*flip+front*.75*flip);
  float core=1.-smoothstep(hw-.6,hw+.6,r);
  float cs=caseW>0.?(1.-smoothstep(hw+caseW-.6,hw+caseW+.6,r)):0.;
  vec4 base=vec4(c,1.)*core*al; base+=vec4(casing,1.)*max(cs-core,0.)*al*.9;
  float g=flip*glow*exp(-max(r-hw,0.)/(hw*.75+.01))*(1.-smoothstep(hw+w*1.2,hw+w*1.9+dpr,r));
  o=base+vec4(c*g*al*(.42+front),0.);
}`;
const CELL_V = `#version 300 es
precision highp float;
layout(location=0) in vec2 q; layout(location=1) in vec2 P; layout(location=2) in float F; layout(location=3) in float T;
uniform mat4 M; uniform vec2 res; uniform float ext, ex, w, lim, reveal, dpr; uniform vec3 dim, lit, litTop; uniform float flip, dimA, geo;
out vec4 c; out vec2 v; flat out float L;
void main(){
  vec2 p=P*2.*ext-ext; float t=T*255.; float at=(t-1.)/250.*3600.; float on=t<.5?0.:smoothstep(0.,60.,min(lim,reveal)-at);
  float fl=F*255.*.5; float h=(fl+1.2)*3.5*ex*mix(.92,1.,on);
  vec4 a=M*vec4(p,0.,1.), b=M*vec4(p,h,1.);
  vec2 s0=(a.xy/a.w*.5+.5)*res, s1=(b.xy/b.w*.5+.5)*res; if(s1.y-s0.y<1.6*dpr) s1.y=s0.y+1.6*dpr;
  float ww=w*mix(1.,1.25,on);
  vec2 s=mix(s0,s1,q.x)+vec2(q.y*ww*.5,0.); v=q; L=on;
  float near=on*(.5+.5*smoothstep(0.,lim*.5,lim-at));
  vec3 col=mix(mix(lit,litTop,q.x),lit,0.); c=vec4(mix(dim,col,on),mix(dimA*(.45+.55*q.x),near*mix(.45,.88,q.x)*geo,on));
  if(abs(s0.x-res.x*.5)>res.x*.6) {gl_Position=vec4(2.);return;}
  gl_Position=vec4(s/res*2.-1.,0.,1.);
}`;
const CELL_F = `#version 300 es
precision mediump float; in vec4 c; out vec4 o; void main(){ o=vec4(c.rgb*c.a,c.a); }`;
const FILL_V = `#version 300 es
precision highp float; layout(location=0) in vec2 P; uniform mat4 M; uniform float ext; void main(){ gl_Position=M*vec4(P*2.*ext-ext,0.,1.); }`;
const FILL_F = `#version 300 es
precision mediump float; uniform vec4 c; out vec4 o; void main(){ o=vec4(c.rgb*c.a,c.a); }`;
const SEA_V = `#version 300 es
precision highp float; layout(location=0) in vec2 q; uniform mat4 M; uniform float ext; out vec2 p; void main(){ p=q*ext*2.2; gl_Position=M*vec4(p,0.,1.); }`;
const SEA_F = `#version 300 es
precision highp float; in vec2 p; uniform sampler2D sh; uniform float ext, mpp; uniform vec3 water, ink; uniform float a; out vec4 o;
void main(){ vec2 u=vec2(p.x+ext,ext-p.y)/(2.*ext); float inside=step(0.,u.x)*step(u.x,1.)*step(0.,u.y)*step(u.y,1.);
  float d=texture(sh,u).r*2040.; float f=max(fwidth(d),.5); float s=max(mpp,16.); float l=0.;
  float D[7]=float[7](4.5,10.5,18.5,22.5,30.5,39.5,49.5);
  for(int i=0;i<3;i++){ float k=D[i]*s; if(k<1960.) l=max(l,(1.-smoothstep(.35,1.25,abs(d-k)/f))*(1.-float(i)/7.5)); }
  vec3 c=mix(water,ink,l*a*inside); o=vec4(c,1.); }`;
const DISC_V = `#version 300 es
precision highp float; layout(location=0) in vec2 q; layout(location=1) in vec3 P; uniform mat4 M; uniform float pad; out vec2 v; flat out float R; void main(){ R=P.z; v=q*(P.z+pad); gl_Position=M*vec4(P.xy+v,0.,1.); }`;
const DISC_F = `#version 300 es
precision highp float; in vec2 v; flat in float R; out vec4 o; void main(){ float s=.5+(R-length(v))/1400.; o=vec4(s); }`;
// the shape of "here you can get to": one even tone with one thin edge, soft in its corners
const REACH_V = `#version 300 es
precision highp float; layout(location=0) in vec2 q; out vec2 u; void main(){ u=q*.5+.5; gl_Position=vec4(q,0.,1.); }`;
const REACH_F = `#version 300 es
precision highp float; in vec2 u; uniform sampler2D f; uniform vec2 px; uniform float b, w; uniform vec4 fill, edge, ghost; out vec4 o;
vec2 at(vec2 p){ vec2 s=texture(f,p).rg*2.; for(int i=0;i<12;i++){ float a=float(i)*.5236, r=i%2==0?1.:.55; s+=texture(f,p+vec2(cos(a),sin(a))*r*b*px).rg; } return s/14.; }
void main(){ vec2 v=at(u); vec2 g=max(fwidth(v),vec2(1e-4)); vec2 d=(v-.462)/g; float in_=clamp(d.x+.5,0.,1.);
  float e=1.-smoothstep(w*.5-.5,w*.5+.7,abs(d.x)); if(v.x<.02) e=0.; float k=clamp(d.y+.5,0.,1.);
  vec4 c=vec4(ghost.rgb,1.)*ghost.a*k; c=mix(c,vec4(fill.rgb,1.),fill.a*in_); c=mix(c,vec4(edge.rgb,1.),e*edge.a); o=c; }`;
const DOT_V = `#version 300 es
precision highp float; layout(location=0) in vec2 q; layout(location=1) in vec4 P; uniform mat4 M; uniform vec2 res; uniform float dpr; out vec2 v; flat out float R,k;
void main(){ vec4 a=M*vec4(P.xy,0.,1.); R=P.z*dpr; k=P.w; v=q*(R+2.*dpr); vec2 s=(a.xy/a.w*.5+.5)*res+v; gl_Position=vec4(s/res*2.-1.,0.,1.); if(a.w<0.) gl_Position=vec4(2.); }`;
const DOT_F = `#version 300 es
precision mediump float; in vec2 v; flat in float R,k; uniform vec3 ink, fill, far; uniform float dpr, farA; out vec4 o;
void main(){ float r=length(v); float A=1.-smoothstep(R-.6,R+.6,r); if(k<.5){ float a=A*farA; o=vec4(far*a,a); return; }
  float in_=1.-smoothstep(R*.62-.6,R*.62+.6,r); vec3 c=mix(ink,fill,in_); o=vec4(c*A,A); }`;

export function makeGL(canvas, net, city, shoreImg) {
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, stencil: true, powerPreference: "high-performance" });
  if (!gl) return null;
  const D = net.D;
  const prog = (v, f) => { const p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, v], [gl.FRAGMENT_SHADER, f]]) { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS) && !gl.isContextLost()) throw Error(gl.getShaderInfoLog(x)); gl.attachShader(p, x); } gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); } return { p, u }; };
  const pc = prog(CAPS_V, CAPS_F), pl = prog(CELL_V, CELL_F), pf = prog(FILL_V, FILL_F), ps = prog(SEA_V, SEA_F), pd = prog(DISC_V, DISC_F), pr = prog(REACH_V, REACH_F), pt = prog(DOT_V, DOT_F);
  const buf = (data, usage = gl.STATIC_DRAW, target = gl.ARRAY_BUFFER) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, usage); return b; };
  const attr = (b, loc, n, type, norm, stride, off, div) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, type, norm, stride, off); gl.vertexAttribDivisor(loc, div); };
  const qb = buf(new Float32Array([0, -1, 1, -1, 0, 1, 1, 1])), qc = buf(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
  const vao = f => { const v = gl.createVertexArray(); gl.bindVertexArray(v); f(); gl.bindVertexArray(null); return v; };
  const rgb = D.colors.map(h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)));
  // capsule buffers: P (4f) O (4 bytes /40) C (4 ub) A (4f)
  const ST = 16 + 4 + 4 + 16;
  function capsVao(b) { return vao(() => { attr(qb, 0, 2, gl.FLOAT, false, 0, 0, 0); attr(b, 1, 4, gl.FLOAT, false, ST, 0, 1); attr(b, 2, 4, gl.BYTE, false, ST, 16, 1); attr(b, 3, 4, gl.UNSIGNED_BYTE, true, ST, 20, 1); attr(b, 4, 4, gl.FLOAT, false, ST, 24, 1); }); }
  function packer(n) { const ab = new ArrayBuffer(n * ST), f = new Float32Array(ab), i8 = new Int8Array(ab), u8 = new Uint8Array(ab); let k = 0;
    return { ab, get n() { return k; }, reset() { k = 0; }, push(x0, y0, x1, y1, o0, o1, o2, o3, r, g, b, a, A0, A1, A2) { if (k >= n) return; const j = k * ST, q = j / 4; f[q] = x0; f[q + 1] = y0; f[q + 2] = x1; f[q + 3] = y1; i8[j + 16] = o0; i8[j + 17] = o1; i8[j + 18] = o2; i8[j + 19] = o3; u8[j + 20] = r; u8[j + 21] = g; u8[j + 22] = b; u8[j + 23] = a; f[q + 6] = A0; f[q + 7] = A1; f[q + 8] = A2; k++; } }; }
  const ptx = D.ptXY;
  // base lines
  const nb = D.base.length / 3, pk = packer(nb);
  for (let i = 0; i < nb; i++) { const c = rgb[D.base[i * 3]], a = D.base[i * 3 + 1] * 2, b = D.base[i * 3 + 2] * 2, o = i * 4; pk.push(ptx[a], ptx[a + 1], ptx[b], ptx[b + 1], D.baseOx[o], D.baseOx[o + 1], D.baseOx[o + 2], D.baseOx[o + 3], ...c, 255, 0, 0, 0); }
  const baseB = buf(pk.ab), baseV = capsVao(baseB);
  // hops, each piece knows its hop and its fractions
  let nh = 0; for (let h = 0; h < net.nH; h++) nh += D.hopOff[h + 1] - D.hopOff[h] - 1;
  const ph = packer(nh);
  for (let h = 0; h < net.nH; h++) { const c = rgb[D.hopCol[h]], L = net.hopLen[D.hopOff[h + 1] - 1] || 1; for (let i = D.hopOff[h]; i < D.hopOff[h + 1] - 1; i++) { const a = D.hopPts[i] * 2, b = D.hopPts[i + 1] * 2, o = i * 2; ph.push(ptx[a], ptx[a + 1], ptx[b], ptx[b + 1], D.hopOx[o], D.hopOx[o + 1], D.hopOx[o + 2], D.hopOx[o + 3], ...c, 255, h, net.hopLen[i] / L, net.hopLen[i + 1] / L); } }
  const hopB = buf(ph.ab), hopV = capsVao(hopB);
  const hopTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, hopTex); const HR = Math.ceil(net.nH / 64); const hopData = new Float32Array(64 * HR * 4).fill(1e9);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 64, HR, 0, gl.RGBA, gl.FLOAT, hopData); for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
  const warpTex = gl.createTexture(), warpData = new Float32Array(64 * HR * 4); gl.bindTexture(gl.TEXTURE_2D, warpTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 64, HR, 0, gl.RGBA, gl.FLOAT, warpData); for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
  // shore outlines
  const K = 2 * city.ext / 65535, un = a => a * K - city.ext; const mk = (src, al) => { const n = src.length / 4, p = packer(n); for (let i = 0; i < n; i++) p.push(un(src[i * 4]), un(src[i * 4 + 1]), un(src[i * 4 + 2]), un(src[i * 4 + 3]), 0, 0, 0, 0, 255, 255, 255, al, 0, 0, 0); return { n, v: capsVao(buf(p.ab)) }; };
  const outl = mk(city.outl, 255), outo = mk(city.outo, 110);
  const mesh = (V, I) => { const ib = gl.createBuffer(); return { n: I.length, t: I instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, v: vao(() => { attr(buf(V), 0, 2, gl.UNSIGNED_SHORT, true, 0, 0, 0); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, I, gl.STATIC_DRAW); }) }; };
  const land = mesh(city.landV, city.landI), other = mesh(city.otherV, city.otherI), park = mesh(city.parkV, city.parkI);
  const seaV = vao(() => attr(qc, 0, 2, gl.FLOAT, false, 0, 0, 0));
  const shTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, shTex); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, shoreImg); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
  // cells
  const nCell = city.cellX.length, cp = new Uint16Array(nCell * 2); for (let i = 0; i < nCell; i++) { const j = nCell - 1 - i; cp[i * 2] = city.cellX[j]; cp[i * 2 + 1] = city.cellY[j]; }
  const cf = new Uint8Array(nCell); for (let i = 0; i < nCell; i++) cf[i] = city.cellF[nCell - 1 - i];
  const litRev = new Uint8Array(nCell), litB = buf(litRev, gl.DYNAMIC_DRAW), cellPB = buf(cp), cellFB = buf(cf);
  const cellV = vao(() => { attr(qb, 0, 2, gl.FLOAT, false, 0, 0, 0); attr(cellPB, 1, 2, gl.UNSIGNED_SHORT, true, 0, 0, 1); attr(cellFB, 2, 1, gl.UNSIGNED_BYTE, true, 0, 0, 1); attr(litB, 3, 1, gl.UNSIGNED_BYTE, true, 0, 0, 1); });
  const discA = new Float32Array(net.nS * 3), ghostA = new Float32Array(net.nS * 3), discB = buf(discA, gl.DYNAMIC_DRAW), discV = vao(() => { attr(qc, 0, 2, gl.FLOAT, false, 0, 0, 0); attr(discB, 1, 3, gl.FLOAT, false, 0, 0, 1); });
  const fieldT = gl.createTexture(), fieldF = gl.createFramebuffer(); let fw = 0, fh = 0;
  function field(S) {
    const w = Math.max(1, Math.round(canvas.width / 2)), h = Math.max(1, Math.round(canvas.height / 2)); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fieldT);
    if (w !== fw || h !== fh) { fw = w; fh = h; gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, p, v); gl.bindFramebuffer(gl.FRAMEBUFFER, fieldF); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldT, 0); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, fieldF); gl.viewport(0, 0, w, h); gl.disable(gl.STENCIL_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.BLEND); gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(pd.p); gl.bindVertexArray(discV); gl.uniformMatrix4fv(pd.u.M, false, M); gl.uniform1f(pd.u.pad, 700);
    for (const [arr, n, r] of [[discA, S.discN, true], [ghostA, S.ghostN, false]]) if (n) { gl.colorMask(r, !r, false, false); gl.bindBuffer(gl.ARRAY_BUFFER, discB); gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr.subarray(0, n * 3)); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n); }
    gl.colorMask(true, true, true, true); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
  }
  const dotA = new Float32Array(net.nS * 4), dotB = buf(dotA, gl.DYNAMIC_DRAW), dotV = vao(() => { attr(qc, 0, 2, gl.FLOAT, false, 0, 0, 0); attr(dotB, 1, 4, gl.FLOAT, false, 0, 0, 1); });
  const trP = packer(6000), trB = buf(trP.ab, gl.DYNAMIC_DRAW), trV = capsVao(trB);
  const rtP = packer(3000), rtB = buf(rtP.ab, gl.DYNAMIC_DRAW), rtV = capsVao(rtB);

  let W = 1, H = 1, dpr = 1;
  const M = new Float32Array(16);
  const cam = { x: 0, y: 0, mpp: 40, yaw: 0, pitch: .8, ox: 0, oy: 0, F: 1000, ex: 0, ey: 0, ez: 0 };
  function resize(w, h, d) { W = w; H = h; dpr = d; canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); }
  // camera: looks at (x,y,0); mpp = metres per CSS pixel there; ox/oy = where on screen (CSS px from centre, +y down) that point sits
  function setCam(c) {
    Object.assign(cam, c); { const q = slotOf(cam.mpp); cam.slot = q * cam.mpp; cam.lw = q * .7; } const F = cam.F = 1.25 * Math.max(W, H), dist = cam.mpp * F, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    // camera axes in world: right r, up u, back b
    const r = [cy, sy, 0], f = [-sy, cy, 0], b = [-f[0] * sp, -f[1] * sp, cp], u = [f[0] * cp, f[1] * cp, sp];
    const e = [cam.x + b[0] * dist, cam.y + b[1] * dist, b[2] * dist]; cam.ex = e[0]; cam.ey = e[1]; cam.ez = e[2]; cam.r = r; cam.u = u; cam.b = b;
    const n = dist * .05, fa = dist * 8, sx = 2 * F / W, syy = 2 * F / H, kx = 2 * cam.ox / W, ky = -2 * cam.oy / H;
    const dot = (v) => -(v[0] * e[0] + v[1] * e[1] + v[2] * e[2]), V = [[...r, dot(r)], [...u, dot(u)], [...b, dot(b)]];
    for (let j = 0; j < 4; j++) { M[j * 4] = sx * V[0][j] - kx * V[2][j]; M[j * 4 + 1] = syy * V[1][j] - ky * V[2][j]; M[j * 4 + 2] = -(fa + n) / (fa - n) * V[2][j] + (j === 3 ? -2 * fa * n / (fa - n) : 0); M[j * 4 + 3] = -V[2][j]; }
  }
  function project(x, y, z = 0) { const c = [0, 1, 3].map(i => M[i] * x + M[4 + i] * y + M[8 + i] * z + M[12 + i]); return c[2] > 0 ? [(c[0] / c[2] * .5 + .5) * W, (.5 - c[1] / c[2] * .5) * H] : [-9999, -9999]; }
  function unproject(px, py) { const a = (px - W / 2 - cam.ox) / cam.F, b = -(py - H / 2 - cam.oy) / cam.F, d = [0, 1, 2].map(i => cam.r[i] * a + cam.u[i] * b - cam.b[i]); if (d[2] > -1e-3) return null; const t = -cam.ez / d[2]; return [cam.ex + d[0] * t, cam.ey + d[1] * t]; }

  function caps(v, n, o) {
    const u = pc.u; gl.useProgram(pc.p); gl.bindVertexArray(v); gl.uniformMatrix4fv(u.M, false, M); gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1f(u.slot, (o.slot || 0) / 40); gl.uniform1f(u.wide, o.w * dpr); gl.uniform1f(u.dpr, dpr); gl.uniform1f(u.mode, o.mode || 0); gl.uniform1f(u.lim, o.lim || 1); gl.uniform1f(u.reveal, o.reveal ?? 1e9); gl.uniform1f(u.flip, o.night || 0); gl.uniform1f(u.glow, o.glow || 0); gl.uniform1f(u.fade, o.fade ?? 1); gl.uniform1f(u.caseW, (o.caseW || 0) * dpr); gl.uniform3fv(u.casing, o.casing || [0, 0, 0]); gl.uniform1f(u.boost, o.boost || 0); gl.uniform1f(u.dark, o.dark || 0); gl.uniform4f(u.tint, ...(o.tint ? [...o.tint, o.tintA ?? 1] : [0, 0, 0, 0]));
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, hopTex); gl.uniform1i(u.hops, 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, warpTex); gl.uniform1i(u.warps, 1); gl.uniform1f(u.warp, o.warp || 0); gl.activeTexture(gl.TEXTURE0);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
  }
  const fill = (m, c, a) => { gl.useProgram(pf.p); gl.bindVertexArray(m.v); gl.uniformMatrix4fv(pf.u.M, false, M); gl.uniform1f(pf.u.ext, city.ext); gl.uniform4f(pf.u.c, ...c, a); gl.drawElements(gl.TRIANGLES, m.n, m.t, 0); };
  const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function slotOf(m) { return Math.max(3.3, Math.min(8, 130 / m)); }
  function frame(S) {
    const P = S.pal, night = S.night, w = S.warp || 0, g = 1 - w, water = mix3(P.water, P.bg, w);
    gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(...water, 1); gl.clearStencil(0); gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT); gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const px = .9, slotPx = slotOf(cam.mpp), slot = slotPx * cam.mpp; cam.slot = slot; const lw = slotPx * .7; cam.lw = lw;
    if (w <= .5 && (S.discN || S.ghostN)) { field(S); gl.clearColor(...water, 1); }
    if (g > .01) {
      gl.useProgram(ps.p); gl.bindVertexArray(seaV); gl.uniformMatrix4fv(ps.u.M, false, M); gl.uniform1f(ps.u.ext, city.ext); gl.uniform1f(ps.u.mpp, cam.mpp); gl.uniform3fv(ps.u.water, water); gl.uniform3fv(ps.u.ink, P.shore); gl.uniform1f(ps.u.a, P.lineA * g); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, shTex); gl.uniform1i(ps.u.sh, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      const landC = mix3(P.bg, P.land, g);
      fill(other, mix3(water, P.other, g), 1);
      gl.enable(gl.STENCIL_TEST); gl.stencilFunc(gl.ALWAYS, 1, 1); gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE); fill(land, landC, 1); gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      gl.stencilFunc(gl.EQUAL, 1, 1); fill(park, P.park, P.parkA * g);
      // the shape of the answer
      if (w <= .5 && (S.discN || S.ghostN)) { gl.useProgram(pr.p); gl.bindVertexArray(seaV); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fieldT); gl.uniform1i(pr.u.f, 0); gl.uniform2f(pr.u.px, 1 / fw, 1 / fh); gl.uniform1f(pr.u.b, Math.max(1.5, 300 / cam.mpp * dpr / 2)); gl.uniform1f(pr.u.w, 1.15 * dpr); const k = S.reachA * g * g * (1 - S.homesA); gl.uniform4f(pr.u.fill, ...P.reach, P.reachF * k); gl.uniform4f(pr.u.edge, ...P.reachEdge, P.edgeA * k); gl.uniform4f(pr.u.ghost, ...P.ink, .2 * S.ghostK * g); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
      gl.disable(gl.STENCIL_TEST);
      caps(outo.v, outo.n, { w: 1, fade: .6 * P.shoreA * g, tint: P.shore }); caps(outl.v, outl.n, { w: 1, fade: P.shoreA * g, tint: P.shore });
      // tracks: thin ink first
      if (S.pickA > .01) caps(baseV, nb, { w: 2.2, slot, fade: .5 * S.pickA * g }); if (S.pickA < .99) caps(baseV, nb, { w: S.ride ? 2 : px, slot, fade: (S.ride ? .42 : P.ghostA + (P.baseA - P.ghostA) * S.allA) * g * (1 - S.pickA), tint: S.ride ? null : P.baseTint, tintA: 1 - .5 * S.allA });
      // homes: only when asked for, only the lit ones
      if (S.homesA > .01) { gl.useProgram(pl.p); gl.bindVertexArray(cellV); const u = pl.u; gl.uniformMatrix4fv(u.M, false, M); gl.uniform2f(u.res, canvas.width, canvas.height); gl.uniform1f(u.ext, city.ext); gl.uniform1f(u.ex, Math.max(1.6, Math.min(7, cam.mpp / 5)) * g * S.homesA); gl.uniform1f(u.w, Math.max(1, Math.min(14, 46 / cam.mpp)) * dpr * .95); gl.uniform1f(u.lim, S.lim); gl.uniform1f(u.reveal, S.reachA < .02 ? -1 : S.reveal); gl.uniform1f(u.dpr, dpr); gl.uniform3fv(u.dim, P.dim); gl.uniform1f(u.dimA, 0.); gl.uniform3fv(u.lit, P.lit); gl.uniform3fv(u.litTop, P.litTop); gl.uniform1f(u.geo, g * S.homesA * .9); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nCell); }
    }
    if (w > .5 && S.discN) { field(S); gl.useProgram(pr.p); gl.bindVertexArray(seaV); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fieldT); gl.uniform1i(pr.u.f, 0); gl.uniform2f(pr.u.px, 1 / fw, 1 / fh); gl.uniform1f(pr.u.b, 1); gl.uniform1f(pr.u.w, 1.15 * dpr); const k = S.reachA * (w * 2 - 1); gl.uniform4f(pr.u.fill, ...P.reach, P.reachF * k * .7); gl.uniform4f(pr.u.edge, ...P.ink, 0); gl.uniform4f(pr.u.ghost, ...P.ink, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
    if (w > .01 && w < .99) caps(hopV, nh, { w: px, slot, mode: 3, fade: P.ghostA * w * (1 - w) * 4, tint: P.baseTint, tintA: 1, warp: w });
    // tracks you can ride
    if (S.reachA > .02) { const o = { slot, mode: 1, lim: S.lim, reveal: S.reveal, night, glow: 0, warp: w }; caps(hopV, nh, { ...o, w: lw + 2.2, fade: S.reachA * .9 * (1 - S.homesA), tint: w > .5 ? P.bg : P.reachMix }); if (night < .5 && w < .5) caps(hopV, nh, { ...o, w: lw + 1.3, dark: 1, fade: S.reachA * (1 - S.homesA) }); caps(hopV, nh, { ...o, w: w > .5 ? lw * .7 : lw, boost: .04, fade: S.reachA * (1 - .68 * S.homesA) }); }
    if (S.routeN) { gl.bindBuffer(gl.ARRAY_BUFFER, rtB); gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Uint8Array(rtP.ab, 0, S.routeN * ST)); caps(rtV, S.routeN, { w: Math.max(3.6, lw * 1.25), slot, mode: 2, night, glow: 0, boost: 0, casing: P.routeCase, caseW: 0 }); }
    // trains
    if (S.trainN) { gl.bindBuffer(gl.ARRAY_BUFFER, trB); gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Uint8Array(trP.ab, 0, S.trainN * ST)); caps(trV, S.trainN, { w: S.ride ? Math.max(3, Math.min(6.5, 130 / cam.mpp)) : Math.max(2.4, lw * .9), slot, mode: 2, night, glow: .5 * night * S.allA, boost: .55, casing: P.trainCase, caseW: 0 }); }
    // stations
    gl.useProgram(pt.p); gl.bindVertexArray(dotV); gl.bindBuffer(gl.ARRAY_BUFFER, dotB); gl.bufferSubData(gl.ARRAY_BUFFER, 0, dotA); gl.uniformMatrix4fv(pt.u.M, false, M); gl.uniform2f(pt.u.res, canvas.width, canvas.height); gl.uniform1f(pt.u.dpr, dpr); gl.uniform3fv(pt.u.ink, P.dotInk); gl.uniform3fv(pt.u.fill, P.dotFill); gl.uniform3fv(pt.u.far, P.ink); gl.uniform1f(pt.u.farA, P.farA); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, net.nS);
  }
  function uploadWarp(a) { warpData.set(a); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, warpTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 64, HR, gl.RGBA, gl.FLOAT, warpData); gl.activeTexture(gl.TEXTURE0); }
  function uploadHops(a) { hopData.set(a); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, hopTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 64, HR, gl.RGBA, gl.FLOAT, hopData); }
  function uploadLit(lit) { for (let i = 0, j = nCell - 1; i < nCell; i++, j--) litRev[i] = lit[j]; gl.bindBuffer(gl.ARRAY_BUFFER, litB); gl.bufferSubData(gl.ARRAY_BUFFER, 0, litRev); }
  return { gl, cam, M, setCam, project, unproject, resize, frame, slotOf, uploadHops, uploadLit, uploadWarp, ghostA, discA, dotA, trP, rtP, rgb, get W() { return W; }, get H() { return H; }, get dpr() { return dpr; } };
}
