// A small WebGL2 renderer: stone sitters lit by three baked lights (window, sky, rim), any number of views on one canvas, plus a light cast from the lens.
import { mul, frustum, translate, ident, rotY, portrait, project } from './optics.js';
const VS = `#version 300 es
precision highp float;layout(location=0)in vec3 p;layout(location=1)in vec2 uv;layout(location=2)in vec4 n;
uniform mat4 vp,model,lvp;uniform vec3 lo,hi;out vec2 vuv;out vec3 wp;out vec4 lp;out float part;out vec3 vn;
void main(){vec3 q=lo+p*(hi-lo);vec4 w=model*vec4(q,1.);wp=w.xyz;vuv=uv;lp=lvp*w;part=n.w;vn=mat3(model)*n.xyz;gl_Position=vp*w;}`;
const FS = `#version 300 es
precision highp float;in vec2 vuv;in vec3 wp;in vec4 lp;in float part;in vec3 vn;out vec4 o;
uniform sampler2D tn,tl;uniform highp sampler2DShadow ts;uniform mat4 model;uniform vec3 eye,ls,alb,keyC,fillC,rimC,specC,acc,ink;uniform vec2 rough;uniform float lens,expo,earA,grain,ghost,ortho,sss;uniform vec3 viewDir;uniform float tr;
float ggx(vec3 N,vec3 V,vec3 L,float a){vec3 H=normalize(V+L);float nh=max(dot(N,H),0.),a2=a*a,d=nh*nh*(a2-1.)+1.;float nl=max(dot(N,L),0.),nv=max(dot(N,V),.04);float k=(a+1.)*(a+1.)/8.;float g=nl/(nl*(1.-k)+k)*nv/(nv*(1.-k)+k);return a2/(3.1416*d*d)*g/(4.*nv);}
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 vec3 N=normalize(mat3(model)*(texture(tn,vuv).xyz*2.-1.));vec3 L3=texture(tl,vuv).rgb;L3*=L3*ls;
 vec3 V=ortho>.5?viewDir:normalize(eye-wp);float nv=clamp(dot(N,V),0.,1.);
 vec3 k=keyC*L3.r,f=fillC*L3.g,r=rimC*L3.b;
 vec3 c=alb*(k+f+r);
 c+=alb*alb*sss*keyC*exp(-pow((L3.r-.16)/.17,2.))*.22;
 float F=pow(1.-nv,5.);
 vec3 Lk=normalize(vec3(-.66,.40,.64)),Lr=normalize(vec3(.72,.40,-.57)),Lf=normalize(vec3(.6,.06,.8));
 float vk=smoothstep(.05,.6,L3.r),vr=smoothstep(.05,.7,L3.b);
 c+=(specC+(1.-specC)*F*.6)*(keyC*vk*ggx(N,V,Lk,rough.x)*1.15+fillC*.35*ggx(N,V,Lf,rough.x*1.35)*smoothstep(.1,.3,L3.g)+rimC*vr*ggx(N,V,Lr,rough.y)*.9);
 c+=(specC+(1.-specC)*F)*fillC*L3.g*(.35+.65*smoothstep(-.6,.8,reflect(-V,N).y))*(1.-rough.x)*.9;
 if(lens>0.){vec3 q=lp.xyz/lp.w*.5+.5;float s=0.;vec3 Ll=eye;float fr=1.;
  vec3 gl=vec3(0);if(lp.w>0.&&all(greaterThan(q.xy,vec2(0)))&&all(lessThan(q.xy,vec2(1)))){for(int i=0;i<9;i++){vec2 d=vec2(float(i%3)-1.,float(i/3)-1.)/1024.;s+=texture(ts,vec3(q.xy+d,q.z-.0006));}s/=9.;}
  vec3 dl=normalize(viewDir*0.+eye-wp);float fc=dot(normalize(vn),dl);s*=smoothstep(-.06,.02,fc);
  s*=smoothstep(-262.,-250.,wp.y);vec3 seen=c*.34+acc*(.30+.62*max(dot(N,dl),0.))*s;vec3 not_=vec3(dot(c,vec3(.3,.6,.1)))*.42;c=mix(c,mix(not_,seen,s),lens);}
 c=c*expo;c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);c=pow(clamp(c,0.,1.),vec3(1./2.2));
 c=mix(c,ink,ghost);
 c+=(h(gl_FragCoord.xy+tr)-.5)*grain;o=vec4(c,1.);}`;
const BVS = `#version 300 es
precision highp float;const vec2 q[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3));out vec2 uv;void main(){uv=q[gl_VertexID]*.5+.5;gl_Position=vec4(q[gl_VertexID],.9999,1.);}`;
const BFS = `#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform vec3 a,b;uniform vec4 pool;uniform float grain,asp;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec2 d=(uv-pool.xy)*vec2(asp,1.);float t=exp(-dot(d,d)*pool.z);float v=smoothstep(0.,1.,t);vec3 c=mix(b,a,v);c*=1.-.10*smoothstep(.35,0.,uv.y);c+=(h(gl_FragCoord.xy)-.5)*(grain+1./255.);o=vec4(c,1.);}`;
const DFS = `#version 300 es
precision highp float;in float part;out vec4 o;void main(){o=vec4(part>.5?1.:0.,0.,0.,1.);}`;
export const STONE = {
  plaster: { alb: [.80, .765, .71], spec: [.035, .035, .035], rough: [.52, .45], sss: 1 }, basalt: { alb: [.082, .077, .074], spec: [.045, .045, .046], rough: [.36, .30], sss: 0 },
  honey: { alb: [.70, .53, .345], spec: [.04, .04, .04], rough: [.40, .34], sss: 1.3 }, terracotta: { alb: [.50, .225, .125], spec: [.03, .03, .03], rough: [.56, .5], sss: .5 },
  child: { alb: [.150, .090, .050], spec: [.34, .215, .115], rough: [.44, .38], sss: 0 }, cat: { alb: [.046, .052, .050], spec: [.05, .052, .05], rough: [.34, .28], sss: 0 } };
export class GL {
  constructor(canvas) {
    const g = this.g = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' }); if (!g) throw new Error('nogl');
    this.c = canvas; this.heads = {}; this.lost = false; this.init();
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; }); canvas.addEventListener('webglcontextrestored', () => { this.lost = false; this.init(); for (const k in this.heads) { const h = this.heads[k]; this.upload(h); } this.onrestore && this.onrestore(); });
  }
  prog(vs, fs) { const g = this.g, p = g.createProgram(); for (const [t, s] of [[g.VERTEX_SHADER, vs], [g.FRAGMENT_SHADER, fs]]) { const o = g.createShader(t); g.shaderSource(o, s); g.compileShader(o); g.attachShader(p, o); p['s' + t] = o; } g.linkProgram(p); if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error('shader ' + g.getShaderInfoLog(p['s' + g.VERTEX_SHADER]) + g.getShaderInfoLog(p['s' + g.FRAGMENT_SHADER])); const u = {}; const n = g.getProgramParameter(p, g.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = g.getActiveUniform(p, i); u[a.name] = g.getUniformLocation(p, a.name); } return { p, u }; }
  init() {
    const g = this.g; this.main = this.prog(VS, FS); this.bg = this.prog(BVS, BFS); this.dep = this.prog(VS, DFS); this.vao0 = g.createVertexArray();
    this.sm = g.createTexture(); g.bindTexture(g.TEXTURE_2D, this.sm); g.texStorage2D(g.TEXTURE_2D, 1, g.DEPTH_COMPONENT24, 1024, 1024); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_COMPARE_MODE, g.COMPARE_REF_TO_TEXTURE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    this.sf = g.createFramebuffer(); g.bindFramebuffer(g.FRAMEBUFFER, this.sf); g.framebufferTexture2D(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.TEXTURE_2D, this.sm, 0); g.drawBuffers([g.NONE]); g.readBuffer(g.NONE);
    this.ef = g.createFramebuffer(); g.bindFramebuffer(g.FRAMEBUFFER, this.ef); const N = this.EN = 220, t = g.createTexture(); g.bindTexture(g.TEXTURE_2D, t); g.texStorage2D(g.TEXTURE_2D, 1, g.RGBA8, N, N); g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, t, 0); const r = g.createRenderbuffer(); g.bindRenderbuffer(g.RENDERBUFFER, r); g.renderbufferStorage(g.RENDERBUFFER, g.DEPTH_COMPONENT16, N, N); g.framebufferRenderbuffer(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.RENDERBUFFER, r); g.bindFramebuffer(g.FRAMEBUFFER, null);
    this.smKey = '';
  }
  async load(name, meta, base = 'assets/') {
    if (this.heads[name]) return this.heads[name];
    if (this.pending?.[name]) return this.pending[name]; this.pending ||= {};
    return this.pending[name] = (async () => {
      const img = async u => { const r = await fetch(u); if (!r.ok) throw new Error(u); return createImageBitmap(await r.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }); };
      const [bin, n, l] = await Promise.all([fetch(base + name + '.bin').then(r => { if (!r.ok) throw new Error(name); return r.arrayBuffer(); }), img(base + name + '_n.webp'), img(base + name + '_l.webp')]);
      const h = { ...meta, name, bin, imgs: [n, l] }; const v = h.v; h.q = new Uint16Array(bin, 0, v * 3); h.nb = new Int8Array(bin, v * 10, v * 4); this.upload(h); this.heads[name] = h; return h;
    })();
  }
  upload(h) {
    const g = this.g, v = h.v; h.vao = g.createVertexArray(); g.bindVertexArray(h.vao); const b = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, b); g.bufferData(g.ARRAY_BUFFER, new Uint8Array(h.bin, 0, v * 14), g.STATIC_DRAW);
    g.enableVertexAttribArray(0); g.vertexAttribPointer(0, 3, g.UNSIGNED_SHORT, true, 6, 0); g.enableVertexAttribArray(1); g.vertexAttribPointer(1, 2, g.UNSIGNED_SHORT, true, 4, v * 6); g.enableVertexAttribArray(2); g.vertexAttribPointer(2, 4, g.BYTE, false, 4, v * 10);
    const e = g.createBuffer(); g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, e); g.bufferData(g.ELEMENT_ARRAY_BUFFER, new Uint8Array(h.bin, v * 14, h.t * 3 * (h.i32 ? 4 : 2)), g.STATIC_DRAW); g.bindVertexArray(null);
    const an = g.getExtension('EXT_texture_filter_anisotropic'); h.tex = h.imgs.map(im => { const t = g.createTexture(); g.bindTexture(g.TEXTURE_2D, t); g.texImage2D(g.TEXTURE_2D, 0, g.RGB8, g.RGB, g.UNSIGNED_BYTE, im); g.generateMipmap(g.TEXTURE_2D); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR_MIPMAP_LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAX_LOD, 3); if (an) g.texParameterf(g.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, 4); return t; });
  }
  bindHead(P, h, model, vp) { const g = this.g, u = P.u; g.uniformMatrix4fv(u.vp, false, vp); g.uniformMatrix4fv(u.model, false, model); g.uniform3fv(u.lo, h.lo); g.uniform3fv(u.hi, h.hi); g.bindVertexArray(h.vao); }
  drawHead(h) { const g = this.g; g.drawElements(g.TRIANGLES, h.t * 3, h.i32 ? g.UNSIGNED_INT : g.UNSIGNED_SHORT, 0); }
  /** depth from the lens */
  shadow(h, pos) {
    const g = this.g, key = h.name + pos.join(); const near = 40, f = 1400, k = near * Math.tan(58 * Math.PI / 180); const vp = mul(frustum(-k, k, -k, k, near, f), translate(-pos[0], -pos[1], -pos[2])); if (key === this.smKey) return vp; this.smKey = key;
    g.bindFramebuffer(g.FRAMEBUFFER, this.sf); g.viewport(0, 0, 1024, 1024); g.disable(g.SCISSOR_TEST); g.enable(g.DEPTH_TEST); g.disable(g.CULL_FACE); g.clear(g.DEPTH_BUFFER_BIT); g.useProgram(this.dep.p); this.bindHead(this.dep, h, ident(), vp); g.uniformMatrix4fv(this.dep.u.lvp, false, vp); g.enable(g.POLYGON_OFFSET_FILL); g.polygonOffset(2, 4); this.drawHead(h); g.disable(g.POLYGON_OFFSET_FILL); g.bindFramebuffer(g.FRAMEBUFFER, null); return vp;
  }
  /** how many picture cells the ears take, face size pinned (the tests check this against a ray caster) */
  earCells(h, d) {
    const g = this.g, N = this.EN; g.bindFramebuffer(g.FRAMEBUFFER, this.ef); g.viewport(0, 0, N, N); g.disable(g.SCISSOR_TEST); g.enable(g.DEPTH_TEST); g.clearColor(0, 0, 0, 1); g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT); g.useProgram(this.dep.p); this.bindHead(this.dep, h, ident(), portrait(h, d, 1, { w: h.zy[0] * 3, eyeLine: .5 })); this.drawHead(h); const px = new Uint8Array(N * N * 4); g.readPixels(0, 0, N, N, g.RGBA, g.UNSIGNED_BYTE, px); g.bindFramebuffer(g.FRAMEBUFFER, null); let s = 0; for (let i = 0; i < px.length; i += 4) s += px[i]; return s / 255;
  }
  earTable(h) { if (h.ear_) return h.ear_; const D = [100, 125, 150, 175, 200, 225, 250, 275, 300, 350, 400, 450, 500, 600, 700, 850, 1000, 1300, 1600, 2200, 3000]; const far = this.earCells(h, 20000); return h.ear_ = { D, v: D.map(d => this.earCells(h, d) / Math.max(1, far)) }; }
  earShare(h, d) { const { D, v } = this.earTable(h); if (d <= D[0]) return v[0]; for (let i = 1; i < D.length; i++) if (d <= D[i]) return v[i - 1] + (v[i] - v[i - 1]) * (d - D[i - 1]) / (D[i] - D[i - 1]); return 1; }
  size(w, hgt, dpr) { const W = Math.round(w * dpr), H = Math.round(hgt * dpr); if (this.c.width !== W || this.c.height !== H) { this.c.width = W; this.c.height = H; } this.dpr = dpr; }
  begin() { const g = this.g; g.bindFramebuffer(g.FRAMEBUFFER, null); g.disable(g.SCISSOR_TEST); g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT); }
  /** v = {x,y,w,h (css px, y down), clip?:[x,y,w,h], bg:{a,b,pool,grain}|null, vp, eye, ortho?, viewDir?, look:{key,fill,rim,expo,grain}, items:[{head,model,ghost,ink}], lens?:{head,pos,acc,amount}} */
  view(v) {
    const g = this.g, s = this.dpr, H = this.c.height; let lvp = null; if (v.lens) lvp = this.shadow(v.lens.head, v.lens.pos);
    const X = Math.round(v.x * s), Y = Math.round(H - (v.y + v.h) * s), W = Math.round(v.w * s), Hh = Math.round(v.h * s); g.viewport(X, Y, W, Hh); const c = v.clip || [v.x, v.y, v.w, v.h]; g.enable(g.SCISSOR_TEST); g.scissor(Math.round(c[0] * s), Math.round(H - (c[1] + c[3]) * s), Math.round(c[2] * s), Math.round(c[3] * s));
    if (v.clear) { g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT); } else g.clear(g.DEPTH_BUFFER_BIT);
    if (v.bg) { g.disable(g.DEPTH_TEST); g.useProgram(this.bg.p); g.bindVertexArray(this.vao0); const u = this.bg.u; g.uniform3fv(u.a, v.bg.a); g.uniform3fv(u.b, v.bg.b); g.uniform4fv(u.pool, v.bg.pool); g.uniform1f(u.grain, v.bg.grain); g.uniform1f(u.asp, v.w / v.h); g.drawArrays(g.TRIANGLES, 0, 3); }
    g.enable(g.DEPTH_TEST); g.enable(g.CULL_FACE); g.cullFace(g.BACK); const P = this.main, u = P.u; g.useProgram(P.p);
    g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, this.sm); g.uniform1i(u.tn, 0); g.uniform1i(u.tl, 1); g.uniform1i(u.ts, 2); g.uniform3fv(u.eye, v.eye); g.uniform1f(u.ortho, v.ortho ? 1 : 0); g.uniform3fv(u.viewDir, v.viewDir || [0, 0, 1]);
    const L = v.look; g.uniform3fv(u.keyC, L.key); g.uniform3fv(u.fillC, L.fill); g.uniform3fv(u.rimC, L.rim); g.uniform1f(u.grain, L.grain); g.uniform1f(u.tr, 0);
    g.uniformMatrix4fv(u.lvp, false, lvp || ident()); g.uniform1f(u.lens, v.lens ? v.lens.amount : 0); g.uniform3fv(u.acc, v.lens ? v.lens.acc : [0, 0, 0]); if (v.lens) g.uniform3fv(u.eye, v.lens.pos);
    for (const it of v.items) { const h = it.head, m = STONE[h.name]; this.bindHead(P, h, it.model || ident(), v.vp); g.uniform3fv(u.ls, h.ls); g.uniform3fv(u.alb, m.alb); g.uniform3fv(u.specC, m.spec); g.uniform2fv(u.rough, m.rough); g.uniform1f(u.sss, m.sss); g.uniform1f(u.expo, L.expo * (it.expo || 1)); g.uniform1f(u.ghost, it.ghost || 0); g.uniform3fv(u.ink, it.ink || [0, 0, 0]); g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, h.tex[0]); g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, h.tex[1]); this.drawHead(h); }
    g.disable(g.CULL_FACE); g.disable(g.SCISSOR_TEST);
  }
}
