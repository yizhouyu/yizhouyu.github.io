// The cabin wall with two rounded windows and their shades, drawn over the world.
const VS = `#version 300 es
in vec2 a; void main(){ gl_Position=vec4(a,0.,1.); }`;
const FS = `#version 300 es
precision highp float; uniform vec2 uRes; uniform float uDpr; uniform vec4 uWin[2]; uniform float uOpen[2]; uniform float uGlow[2]; uniform float uHover[2]; uniform vec3 uSky[2]; uniform float uDark; uniform float uTime; uniform vec4 uWarm; out vec4 o;
float rbox(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
float n1(vec2 p){ p=fract(p*vec2(.1031,.1030)); p+=dot(p,p.yx+33.33); return fract((p.x+p.y)*p.x); }
void main(){ vec2 p=gl_FragCoord.xy; vec2 uv=p/uRes; 
 vec3 wallA=mix(vec3(.905,.918,.930),vec3(.082,.096,.122),uDark), wallB=mix(vec3(.835,.856,.878),vec3(.052,.062,.082),uDark);
 // two walls meeting the aisle: light falls from above, centre a little deeper
 float cx=abs(uv.x-.5); vec3 c=mix(wallB,wallA,smoothstep(0.,.95,uv.y*.75+.25*smoothstep(0.,.3,cx))); c*=1.-.035*exp(-cx*cx*260.);
 c+=(n1(p)-.5)*.012;
 // light of the sky falls out of open windows on the wall
 for(int i=0;i<2;i++){ vec4 w=uWin[i]; if(w.z<1.) continue; float d=rbox(p-w.xy,w.zw,w.z*.86); c+=uSky[i]*uOpen[i]*.10*exp(-max(d,0.)/(w.z*.55))*(uDark*.9+.12); c+=uWarm.rgb*uGlow[i]*.22*exp(-max(d,0.)/(w.z*.34)); }
 float alpha=1.;
 for(int i=0;i<2;i++){ vec4 w=uWin[i]; if(w.z<1.) continue; float W=w.z; float r=W*.86; float d=rbox(p-w.xy,w.zw,r); float u=W*.115; // trim width
  if(d>u*2.6) continue; vec2 q=p-w.xy; vec2 e=vec2(.75,0.)*uDpr; vec2 g=normalize(vec2(rbox(q+e.xy,w.zw,r)-rbox(q-e.xy,w.zw,r),rbox(q+e.yx,w.zw,r)-rbox(q-e.yx,w.zw,r))+1e-6);
  float aa=1.1*uDpr;
  vec3 trim=mix(vec3(.94,.947,.953),vec3(.135,.150,.178),uDark), rec=mix(vec3(.80,.825,.850),vec3(.060,.070,.092),uDark);
  // outer soft lip
  float lip=smoothstep(u*1.5+aa,u*1.5-aa,d); float lipS=exp(-pow((d-u*1.5)/(u*.28),2.)); c*=1.-.10*lipS*mix(.35,1.,smoothstep(.45,-.45,g.y));
  vec3 tr=trim*(1.+.07*g.y*smoothstep(0.,u*1.5,d)-.03*(1.-smoothstep(u*.9,u*1.5,d))); c=mix(c,tr,lip);
  // recess: slope towards the pane, lit by the sky at the side facing it
  float re=smoothstep(u*.72+aa,u*.72-aa,d); float k=clamp(d/(u*.72),0.,1.); vec3 rr=rec*(.90+.22*k); rr*=1.+.16*g.y*-1.*(1.-.2*k); rr+=uSky[i]*uOpen[i]*(.10+.22*max(-g.y,0.))*(1.-k*.65)*(.35+.45*uDark*.6); rr=mix(rr,uWarm.rgb,uGlow[i]*(.30+.45*(1.-k))); c=mix(c,rr,re);
  float edge=smoothstep(u*.72+aa*1.2,u*.72,d)*smoothstep(u*.72-aa*2.2,u*.72-aa,d); c*=1.-.14*edge;
  // pane
  float pane=smoothstep(aa*.8,-aa*.8,d); if(pane>0.){ float H=w.w; float top=w.y+H; float yS=top-(1.-uOpen[i])*2.*H; // bottom edge of the shade
   float sh=smoothstep(-aa,aa,p.y-yS); 
   vec3 sc=mix(vec3(.895,.905,.912),vec3(.170,.186,.214),uDark); float rib=sin((p.y-yS)/(H*.052))*.5+.5; sc*=.975+.03*rib; sc+=uSky[i]*.06*(1.-uDark*.3); float nearTop=smoothstep(0.,H*.5,top-p.y); sc*=.93+.07*nearTop; 
   // handle: a lip above the shade's bottom edge
   vec2 hq=vec2(q.x,p.y-yS-H*.085); float hd=rbox(hq,vec2(W*.30,H*.020),H*.020); sc=mix(sc,sc*.80,smoothstep(H*.03,0.,hd)*.8); sc=mix(sc,mix(vec3(.96),vec3(.30,.32,.36),uDark)*(1.+.15*hq.y/(H*.02)),smoothstep(aa,-aa,hd)); sc=mix(sc,uWarm.rgb,.55*uHover[i]*smoothstep(aa,-aa,hd));
   sc*=1.-.18*smoothstep(H*.03,0.,p.y-yS);
   // the glass: faint edge shadow, a breather hole, a soft reflection
   float ed=smoothstep(-W*.20,0.,d); vec3 gl=mix(vec3(0.),vec3(0.),0.); float ga=ed*ed*.26; 
   float bh=length(q-vec2(0.,-H*.86)); float hole=smoothstep(W*.016+aa,W*.016-aa,bh); ga=max(ga,hole*.5*(1.-smoothstep(.0,.05,0.)));
   float ref=smoothstep(.10,.0,abs(q.x/W*.55+q.y/H*.35-.42))*.035; gl+=vec3(1.)*ref; float ra=ref;
   vec3 paneC=gl; float paneA=clamp(ga+ra,0.,1.);
   vec3 drop=vec3(0.); float da=.22*smoothstep(H*.07,0.,yS-p.y)*step(p.y,yS)*step(.01,uOpen[i])*step(uOpen[i],.995);
   float A=mix(max(paneA,da),1.,sh); vec3 C=mix(mix(paneC/max(paneA,.001)*paneA/max(max(paneA,da),.001),drop,0.),sc,sh); if(sh<.5&&ref>0.&&ga<.05) C=vec3(1.);
   // composite over wall using pane coverage
   vec3 cc=mix(c,C,pane); float al=mix(1.,A,pane); if(pane>.0){ c=mix(c,C,pane); alpha=min(alpha,al);} }
 }
 o=vec4(c*alpha,alpha); }`;
export class Cabin {
  constructor(gl) { this.gl = gl; const mk = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; }; const p = this.p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); this.u = {}; for (const n of ['uRes', 'uDpr', 'uWin', 'uOpen', 'uGlow', 'uHover', 'uSky', 'uDark', 'uTime', 'uWarm']) this.u[n] = gl.getUniformLocation(p, n); this.b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); this.a = gl.getAttribLocation(p, 'a'); }
  // win: [{cx,cy,w,h (px, css, from the top), open, glow, hover, sky}] x2
  draw(W, H, dpr, win, s) { const gl = this.gl, u = this.u; gl.viewport(0, 0, W * dpr, H * dpr); gl.disable(gl.SCISSOR_TEST); gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(this.p); gl.uniform2f(u.uRes, W * dpr, H * dpr); gl.uniform1f(u.uDpr, dpr); const wv = [], op = [], gv = [], hv = [], sv = []; for (const w of win) { wv.push(w.cx * dpr, (H - w.cy) * dpr, w.w / 2 * dpr, w.h / 2 * dpr); op.push(w.open); gv.push(w.glow); hv.push(w.hover || 0); sv.push(...w.sky); } gl.uniform4fv(u.uWin, wv); gl.uniform1fv(u.uOpen, op); gl.uniform1fv(u.uGlow, gv); gl.uniform1fv(u.uHover, hv); gl.uniform3fv(u.uSky, sv); gl.uniform1f(u.uDark, s.dark); gl.uniform1f(u.uTime, s.t); gl.uniform4f(u.uWarm, ...s.warm, 1); gl.bindBuffer(gl.ARRAY_BUFFER, this.b); gl.enableVertexAttribArray(this.a); gl.vertexAttribPointer(this.a, 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(this.a, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.disableVertexAttribArray(this.a); gl.disable(gl.BLEND); }
}
