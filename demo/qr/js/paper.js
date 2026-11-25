// The print on the wall: takes the flat drawing and lights it. Ink is pressed into the sheet, holes show the mount.
const VS = `#version 300 es
in vec2 p; out vec2 v; void main(){ v = vec2(p.x*.5+.5, .5-p.y*.5); gl_Position = vec4(p,0.,1.); }`;
const FS = `#version 300 es
precision highp float; in vec2 v; out vec4 o;
uniform sampler2D A; uniform vec2 L; uniform float pad, tex, dark, relief, scale;
float h1(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+1.),f.x),f.y); }
float fibre(vec2 p){ vec2 q=p+.6*vec2(vn(p*.11),vn(p*.11+7.)); return .5*vn(q*vec2(.55,.16))+.3*vn(q.yx*vec2(.6,.2)+19.)+.2*vn(q*1.1); }
vec4 at(vec2 p, float l){ if(any(lessThan(p,vec2(0.)))||any(greaterThan(p,vec2(1.)))) return vec4(0.); return textureLod(A,p,l); }
float red(vec4 c){ return c.r + (1.-c.a)*.75; }
float lum(vec4 c){ return dot(c.rgb,vec3(.299,.587,.114)) + (1.-c.a)*.75; }
float hgt(vec2 p){ float a = red(at(p,.8)), b = red(at(p,2.2)); return (a*.55+b*.45)*1.6 + fibre(p*900.*scale)*.13 + fibre(p*330.*scale)*.07; }
void main(){
  vec2 p=(v-pad)/(1.-2.*pad); float px=1./tex;
  // mount
  float mw=.034; vec2 dM=abs(p-.5)-(.5+mw); float mIn=1.-smoothstep(-px,px,max(dM.x,dM.y));
  vec3 wallSh=vec3(0.); vec2 ld=normalize(L-vec2(.5));
  float shadow=0.; // three soft layers: contact, near, far
  for(int k=0;k<3;k++){ float f=float(k); vec2 q=p+ld*(.004+f*f*.011); vec2 dS=abs(q-.5)-(.5+mw); float sd=length(max(dS,0.))+min(max(dS.x,dS.y),0.); float r=.006+f*f*.016; shadow+=(1.-smoothstep(-r,r,sd))*(k==0?.12:.10); }
  vec2 fe=min(v,1.-v); shadow*=smoothstep(0.,.03,min(fe.x,fe.y));
  // light
  vec3 lp=vec3(L,1.05); vec3 toL=normalize(lp-vec3(p,0.)); float dist=length(lp.xy-p);
  float pool=mix(1., mix(.80,1.08,1.-smoothstep(.15,1.35,dist)), mix(.55,1.,dark));
  vec3 col; float alpha;
  if(mIn>0.){
    vec3 mount=mix(vec3(.862,.872,.866),vec3(.47,.478,.472),dark); float mg=fibre(p*420.*scale)-.5; mount*=1.+mg*.05;
    float edge=smoothstep(-.0055,-.003,max(dM.x,dM.y)); vec2 sn=dM.x>dM.y?vec2(sign(p.x-.5),0.):vec2(0.,sign(p.y-.5)); float facing=dot(sn,-ld); mount*=1.+edge*mix(.16,.34,dark)*(-facing); mount*=mix(1.,.86+.2*smoothstep(1.1,.1,length(lp.xy-p)),dark);
    vec4 c=at(p,0.);
    float ao=0.; for(int k=1;k<=6;k++){ float f=float(k); ao+=at(p+ld*(.0012+.0016*f),1.+f*.55).a; } ao/=6.;
    vec3 under=mount*(1.-.36*ao)*pool;
    float e=px*1.25; float hx=hgt(p+vec2(e,0.))-hgt(p-vec2(e,0.)), hy=hgt(p+vec2(0.,e))-hgt(p-vec2(0.,e));
    vec3 n=normalize(vec3(-vec2(hx,hy)*relief,1.));
    vec3 flatN=vec3(0.,0.,1.); float d0=dot(flatN,toL), d=dot(n,toL)/d0;
    float ink=clamp(1.-lum(c)*1.12,0.,1.)*c.a;
    vec3 hv=normalize(toL+vec3(0.,0.,1.)); float spec=pow(max(dot(n,hv),0.),26.)*ink*.16;
    vec3 base=c.a>.001?c.rgb/c.a:vec3(0.);
    float grain=(fibre(p*900.*scale)-.5); base*=1.+grain*.035*(1.-ink); base+=ink*(vn(p*tex*.42)-.45)*.045;
    float lit=mix(1.,d,.62); lit=clamp(lit,.35,1.32);
    vec3 paper=base*lit*pool+spec*pool; paper*=mix(1.,.93,dark);
    col=mix(under,paper,c.a);
    o=vec4(col,1.)*mIn+vec4(0.,0.,0.,shadow*mix(1.,1.8,dark))*(1.-mIn); o.a=mix(min(1.,shadow*mix(1.,1.6,dark)),1.,mIn);
    o.rgb=col*mIn;
  } else { alpha=min(1.,shadow*mix(1.,1.6,dark)); o=vec4(0.,0.,0.,alpha); }
}`;
export class Paper {
  constructor(canvas) {
    this.canvas = canvas; this.pad = .12; this.light = [.18, -.12]; this.goal = [.18, -.12]; this.dark = 0; this.dirtyTex = true; this.dirty = true;
    this.init(); canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); this.gl = null; }); canvas.addEventListener("webglcontextrestored", () => { this.init(); this.dirtyTex = this.dirty = true; });
  }
  init() {
    const gl = this.canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true }); this.gl = null; if (!gl) { this.flat = this.canvas.getContext("2d"); return; }
    try {
      const pr = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(o); gl.attachShader(pr, o); }
      gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw gl.getProgramInfoLog(pr); gl.useProgram(pr);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.bindAttribLocation(pr, 0, "p"); gl.vertexAttribPointer(gl.getAttribLocation(pr, "p"), 2, gl.FLOAT, false, 0, 0);
      this.u = {}; for (const n of ["L", "pad", "tex", "dark", "relief", "scale"]) this.u[n] = gl.getUniformLocation(pr, n);
      this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      this.gl = gl; gl.disable(gl.BLEND);
    } catch (e) { console.warn("paper light off: " + e); }
  }
  resize(side) { const w = Math.round(side * (1 + 2 * this.pad) / (1) ); this.canvas.width = this.canvas.height = w; this.padIn = this.pad / (1 + 2 * this.pad); this.dirty = true; }
  render(src, opt = {}) {
    const gl = this.gl, w = this.canvas.width;
    if (!gl) { const c = this.flat || (this.flat = this.canvas.getContext("2d")); if (!c) return; const m = w * this.padIn; c.clearRect(0, 0, w, w); c.fillStyle = "rgba(0,0,0,.14)"; c.fillRect(m * .8, m * .85, w - m * 1.5, w - m * 1.5); c.fillStyle = this.dark > .5 ? "#8f918f" : "#d0d4d1"; c.fillRect(m * .68, m * .68, w - m * 1.36, w - m * 1.36); c.drawImage(src, m, m, w - 2 * m, w - 2 * m); return; }
    gl.viewport(0, 0, w, w); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    if (this.dirtyTex) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.generateMipmap(gl.TEXTURE_2D); this.dirtyTex = false; }
    gl.uniform2f(this.u.L, ...(opt.light || this.light)); gl.uniform1f(this.u.pad, this.padIn); gl.uniform1f(this.u.tex, src.width); gl.uniform1f(this.u.dark, this.dark); gl.uniform1f(this.u.relief, 1.15); gl.uniform1f(this.u.scale, opt.scale || Math.min(1, w / 1500)); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); this.dirty = false;
  }
}
