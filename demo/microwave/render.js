// The picture. One ray per pixel: plate, wheel, food (its shape is the one that is simulated), knife, lid, and the waves in the plane of the cut.
import { G } from "./heat.js"; import { lut, T0, T1 } from "./glaze.js"; import * as W from "./wave.js"; import { COLS, TW, TH } from "./gpu.js";
const VS = `#version 300 es
void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);gl_Position=vec4(p,0.,1.);}`;
export const SR = 132, SZ = 92, RMAX = 13.2, ZMIN = -1.6, ZMAX = 7.6; // shape sheet, cm
const FS = `#version 300 es
precision highp float;precision highp int;precision highp sampler2D;precision highp sampler3D;
uniform vec2 uRes,uOff;uniform vec3 uEye,uRight,uUp,uFwd;uniform float uFov,uSpin,uCut,uSlide,uKnife,uLid,uProg,uDark,uHasWave,uWave,uTime,uGrain,uTop,uGlow,uDry,uShow;uniform vec3 uBg,uInk,uRed,uPlate;uniform sampler2D uShape,uLut,uE;uniform sampler3D uTemp;out vec4 o;
#define PI 3.14159265
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
vec3 hash3(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return fract(sin(p)*43758.5453);}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
vec3 lin(vec3 c){return pow(c,vec3(2.2));}
vec3 turn(vec3 p){float c=cos(uSpin),s=sin(uSpin);return vec3(c*p.x+s*p.y,-s*p.x+c*p.y,p.z);}
float shape(vec3 p){float r=length(p.xy);vec2 uv=vec2(r/${RMAX.toFixed(2)}*${(SR - 1) / SR}+${.5 / SR},(p.z-(${ZMIN.toFixed(2)}))/${(ZMAX - ZMIN).toFixed(2)});if(uv.y<0.||uv.y>1.||r>${RMAX.toFixed(2)}){float dz=max(0.,max(p.z-${ZMAX.toFixed(2)},${ZMIN.toFixed(2)}-p.z));return max(dz,r-${RMAX.toFixed(2)})+1.4;}return texture(uShape,uv).r;}
float food0(vec3 p){float d=shape(p);if(d<.8){vec3 q=turn(p);d-=.16*(noise(q*.85)-.5)*smoothstep(-.1,.8,p.z)+.05*(noise(q*2.6)-.5);}return d;}
float food(vec3 p){float d=food0(p);if(uCut>.5)d=max(d,-p.y);else if(uKnife>-1.&&uKnife<8.&&p.z>uKnife)d=max(d,.035-abs(p.y));return d;}
float half2(vec3 p){vec3 q=p+vec3(0,uSlide,0);return max(food0(q),q.y+.02);}
float plate(vec3 p){float r=length(p.xy);float lift=.34*smoothstep(9.9,12.2,r);float th=mix(.15,.07,smoothstep(8.,12.1,r));vec2 q=vec2(max(r-11.9,0.),max(abs(p.z+.15-lift)-th,0.));float d=length(q)-.04;float foot=max(abs(r-6.4)-.16,abs(p.z+.42)-.3);return min(d*.9,foot-.05);}
float wheel(vec3 p){float r=length(p.xy);vec2 q=abs(vec2(r,p.z+.86))-vec2(12.95,.22);return min(max(q.x,q.y),0.)+length(max(q,0.))-.09;}
int mat;bool bare=false;
float map(vec3 p){float d=p.z+1.2;mat=0;float w=wheel(p);if(w<d){d=w;mat=1;}float l=plate(p);if(l<d){d=l;mat=2;}float f=food(p);if(f<d){d=f;mat=3;}if(uSlide>.001&&uSlide<7.){float h=half2(p);if(h<d){d=h;mat=3;}}if(uLid<30.&&!bare){vec3 q=p-vec3(0,0,uLid+8.05);float k=length(q*vec3(1,1,1.1))-.78;k=min(k,max(length(q.xy)-.34,abs(q.z+.6)-.5));if(k<d){d=k;mat=5;}}return d;}
vec3 normal(vec3 p){vec2 e=vec2(.004,-.004);return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}
float shadow(vec3 p,vec3 l){bare=true;float t=.12,s=1.;for(int i=0;i<26;i++){float d=map(p+l*t);s=min(s,7.*d/t);t+=clamp(d,.1,1.1);if(s<.01||t>22.)break;}bare=false;return clamp(s,0.,1.);}
float ao(vec3 p,vec3 n){float a=0.,s=1.;for(int i=1;i<=4;i++){float h=.28*float(i)*float(i)*.42+.04;a+=(h-map(p+n*h))*s;s*=.52;}return clamp(1.-.62*a,0.,1.);}
float grain(vec3 p){vec3 c=floor(p/.46);float m=1.;for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)for(int k=-1;k<=1;k++){vec3 g=c+vec3(i,j,k);vec3 h=hash3(g);vec3 q=p-(g+.2+.6*h)*.46;vec3 d=normalize(hash3(g+7.7)-.5);float t=clamp(dot(q,d),-.2,.2);m=min(m,length(q-d*t)-.15);}return m;}
vec2 temp(vec3 p){vec3 q=uSpin==0.?p:p;return texture(uTemp,vec3(clamp(q.z/${(G.NZ * G.HZ * 100).toFixed(3)},0.,1.),q.y/${(G.NY * G.HX * 100).toFixed(3)}+.5,q.x/${(G.NX * G.HX * 100).toFixed(3)}+.5)).rg;}
vec2 tempC(vec3 p){vec3 sz=vec3(${G.NZ}.,${G.NY}.,${G.NX}.);vec3 u=vec3(clamp(p.z/${(G.NZ * G.HZ * 100).toFixed(3)},0.,1.),p.y/${(G.NY * G.HX * 100).toFixed(3)}+.5,p.x/${(G.NX * G.HX * 100).toFixed(3)}+.5)*sz-.5;vec3 f=fract(u),b=floor(u);vec3 w0=(1.-f)*(1.-f)*(1.-f)/6.,w1=(4.-6.*f*f+3.*f*f*f)/6.,w2=(1.+3.*f+3.*f*f-3.*f*f*f)/6.,w3=f*f*f/6.;vec3 g0=w0+w1,g1=w2+w3,h0=(b-.5+w1/g0)/sz,h1=(b+1.5+w3/g1)/sz;vec2 r=vec2(0);for(int i=0;i<8;i++){vec3 k=vec3(i&1,(i>>1)&1,(i>>2)&1);vec3 h=mix(h0,h1,k),g=mix(g0,g1,k);r+=texture(uTemp,h).rg*g.x*g.y*g.z;}return r;}
vec3 colour(float T){return lin(texture(uLut,vec2((T-(${T0.toFixed(1)}))/${(T1 - T0).toFixed(1)},.5)).rgb);}
vec3 sky(vec3 d){float up=d.z*.5+.5;vec3 c=mix(vec3(.5,.48,.45),vec3(.98,.97,.95),smoothstep(.35,1.,up));float box=smoothstep(.0,.16,.30-abs(d.x+.48-.1*d.y))*smoothstep(0.,.16,.34-abs(d.z-.70));float strip=smoothstep(0.,.08,.1-abs(d.x-.74))*smoothstep(0.,.2,.5-abs(d.z-.45));c+=box*2.2+strip*.7;return mix(c,c*vec3(.34,.3,.28),uDark);}
float crack(vec2 p){vec2 c=floor(p);float a=9.,b=9.;for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){vec2 g=c+vec2(i,j);vec2 h=hash3(vec3(g,3.)).xy;float d=length(p-g-h);if(d<a){b=a;a=d;}else b=min(b,d);}return smoothstep(.0,.07,b-a);}
float fieldZ(vec2 q){// Ez in the plane of the cut; q = x,z in cm from the plate centre
 float a=(q.x+13.5)/.5,b=(q.y+2.5)/.5-.5;if(a<0.||a>${W.NC}.||b<0.||b>${W.NZ - 1}.)return 0.;int i=int(a),k=int(b);float u=fract(a),v=fract(b);
 #define EZ(i,k) texelFetch(uE,ivec2(((k)%${COLS})*${W.X}+(i),((k)/${COLS})*${W.Y}+27),0).z
 return mix(mix(EZ(i,k),EZ(i+1,k),u),mix(EZ(i,k+1),EZ(i+1,k+1),u),v);}
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes-uOff)/uRes.y;vec3 rd=normalize(uFwd+uFov*(uv.x*uRight+uv.y*uUp)),ro=uEye;
 vec3 bg=lin(uBg);float t=0.;bool hit=false;t=max(0.,(ro.z-16.)/max(.001,-rd.z)*.6);t=max(t,length(ro)-32.);
 float tmax=length(ro)+90.;float dd2=1.;for(int i=0;i<150;i++){dd2=map(ro+rd*t);if(dd2<.0016*max(1.,t*.06)){hit=true;break;}t+=dd2*.88;if(t>tmax)break;}if(!hit&&t<tmax&&dd2<.08)hit=true;
 vec3 col=bg;vec3 L=normalize(vec3(-.52,-.42,.95));vec3 p=ro+rd*t;
 if(hit){int m=0;map(p);m=mat;vec3 n=normal(p);
  if(m==0){float s=shadow(p+n*.02,L),a=ao(p,n);float fade=exp(-pow(length(p.xy)/26.,4.));float k=1.-fade*((1.-s)*.2+min(1.-a,.62)*.42)*(uDark>.5?1.15:.8);col=bg*k;}
  else{float s=shadow(p+n*.03,L),a=ao(p,n);float nl=max(dot(n,L),0.);vec3 v=-rd,h=normalize(L+v);float fr=pow(1.-max(dot(n,v),0.),5.);vec3 alb=vec3(.8),spec=vec3(0);float gl=0.,rough=60.;vec3 emi=vec3(0);
   vec3 key=mix(vec3(1.12,1.09,1.04),vec3(1.2,1.02,.84),uDark),amb=mix(vec3(.5,.51,.53),vec3(.17,.16,.17),uDark);
   if(m==1){float r=length(p.xy);alb=mix(vec3(.60,.565,.52),vec3(.2,.175,.155),uDark);alb*=.96+.06*noise(vec3(r*9.,0.,0.));float an=atan(p.x,p.y)/(2.*PI);if(an<0.)an+=1.;
     if(n.z>.7&&r>11.95){float e=fwidth(r);float ring=smoothstep(12.36-e,12.36,r)*(1.-smoothstep(12.58,12.58+e,r));float aw=fwidth(an)>.4?.002:fwidth(an);float on=smoothstep(uProg+aw,uProg-aw,an)*step(.0005,uProg);alb=mix(alb,lin(uRed)*mix(1.1,.5,uDark),ring*on);float tk=abs(fract(an*16.+.5)-.5)/16.*2.*PI*r;float big=step(.5,1.-mod(floor(an*16.+.5),4.)*.999);alb=mix(alb,lin(uInk),(1.-on*ring)*.75*smoothstep(.06,.02,tk)*step(12.36,r)*step(r,12.6+.28*big));}gl=.12;rough=24.;}
   else if(m==2){float r=length(p.xy);alb=mix(lin(uPlate),lin(uPlate)*.9,uDark);float e=max(fwidth(r),.01);float li=smoothstep(.055+e,.055,abs(r-11.35))+.8*smoothstep(.022+e,.022,abs(r-11.02));if(n.z>.3)alb=mix(alb,vec3(.025,.07,.24),clamp(li,0.,1.)*.85);gl=.9;rough=260.;}
   else if(m==3){bool face=uCut>.5&&abs(p.y)<.04+.0006*t&&-n.y>.6;bool slit=uCut<.5&&uKnife<8.&&abs(abs(p.y)-.035)<.02&&abs(n.y)>.8;if(face&&abs(rd.y)>1e-4){p=ro+rd*(-ro.y/rd.y);p.z=max(p.z,.02);}vec3 q=turn(p);if(uSlide>.001&&p.y<-.01&&uCut>.5)q=turn(p+vec3(0,uSlide,0));vec3 tp2=p+(uCut>.5&&p.y<-.01?vec3(0,uSlide,0):vec3(0));vec2 tw=tempC(tp2);float T=tw.x;alb=mix(vec3(.80,.775,.715),colour(T),face||slit?1.:uShow);float g=grain(q);
     float gr=uGrain*(1.-smoothstep(38.,90.,t)*.6);
     if(face||slit){float ed=smoothstep(-.05,.05,g);alb*=(1.-.2*ed*gr)*(1.05-.1*noise(q*1.3));float w=fwidth(T)+1e-4;alb=mix(alb,lin(uInk)*.6,.85*(1.-smoothstep(.55,1.35,abs(T-73.9)/w))*step(.02,w));nl=.62;s=1.;a=mix(a,1.,.75);gl=.05;}
     else{vec2 e2=vec2(.02,-.02);vec3 gn=e2.xyy*grain(q+e2.xyy)+e2.yyx*grain(q+e2.yyx)+e2.yxy*grain(q+e2.yxy)+e2.xxx*grain(q+e2.xxx);gn=normalize(gn);float c=cos(uSpin),s2=sin(uSpin);gn=vec3(c*gn.x-s2*gn.y,s2*gn.x+c*gn.y,gn.z);n=normalize(n+gn*.75*gr);nl=max(dot(n,L),0.);alb*=1.-.42*smoothstep(-.06,.1,g)*gr;gl=.42;rough=70.;}
     float dry=clamp(tw.y,0.,1.)*uDry*(face||slit?1.:uShow);if(dry>.03){float ck=crack(q.xy*1.5+q.z*.6);alb=mix(alb,alb*.35+vec3(.012,.006,.004),dry*.75);alb*=mix(1.,.25+.75*ck,dry);}
     emi=alb*(face?1.:uShow)*smoothstep(80.,100.,T)*.16*(.4+uDark);nl=mix(nl,nl*.8+.2,.5);}
   else{alb=mix(lin(uPlate),lin(uPlate)*.9,uDark);gl=.8;rough=200.;}
   float sp=pow(max(dot(n,h),0.),rough)*s*gl*(rough>100.?1.4:.5);vec3 refl=sky(reflect(rd,n))*gl*(.035+.55*fr)*mix(.45,1.,a);
   col=alb*(key*nl*s*.82+amb*a*(.65+.35*n.z))+sp*key+refl+emi;}
 }
 // the waves, in the plane of the cut
 if(uWave>.003&&uHasWave>.5&&abs(rd.y)>1e-4){float tp=-ro.y/rd.y;if(tp>0.&&tp<t+.02){vec3 q=ro+rd*tp;if(abs(q.x)<13.5&&q.z>-2.5&&q.z<16.5){float e=fieldZ(q.xz)*15.;float a=abs(e)/(abs(e)+.55);vec3 c=mix(vec3(.03,.09,.30),vec3(.42,.66,1.),uDark);float ink=e>0.?.62:.20;float w=fwidth(e);float ln=1.-smoothstep(.6,1.5,abs(e)/max(w,1e-4));float edge=smoothstep(0.,.3,13.5-abs(q.x))*smoothstep(0.,.3,16.5-q.z);col=mix(col,c,(a*ink+ln*.12*smoothstep(.02,.2,a+w))*uWave*mix(.6,1.,edge));}}}
 // the glass lid: an ellipsoid shell
 if(uLid<30.){vec3 c=vec3(0,0,uLid+.2),rr=vec3(11.4,11.4,7.2);vec3 oc=(ro-c)/rr,dd=rd/rr;float A=dot(dd,dd),B=dot(oc,dd),C=dot(oc,oc)-1.,D=B*B-A*C;if(D>0.){for(int k=0;k<2;k++){float tt=(-B+(k==0?1.:-1.)*sqrt(D))/A;vec3 q=ro+rd*tt;if(tt>0.&&tt<t+.01&&q.z>c.z){vec3 n=normalize((q-c)/rr/rr);float f=abs(dot(n,rd));float rim=pow(1.-f,4.);vec3 r=sky(reflect(rd,dot(n,rd)>0.?-n:n));float edge=smoothstep(.34,.0,q.z-c.z);col=mix(col,r*(k==1?1.:.5),clamp(rim*.55+.004+edge*.16,0.,.75)*(k==1?1.:.4));col=mix(col,mix(vec3(.93),vec3(.4,.39,.38),uDark),uGlow*.012*(1.-.6*f));}}}}
 col=min(col,vec3(1.6));col=mix(col,col/(1.+max(col-.82,0.)),1.);vec3 c=pow(max(col,0.),vec3(1./2.2));c+=(hash(vec3(gl_FragCoord.xy,uTime))-.5)/255.;o=vec4(c,1);}`;
export function makePicture(gl) {
  const p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) { const q = gl.createShader(t); gl.shaderSource(q, s); gl.compileShader(q); if (!gl.getShaderParameter(q, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(q)); gl.attachShader(p, q); } gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const L = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(p, i); L[u.name] = [gl.getUniformLocation(p, u.name), u.type]; }
  const vao = gl.createVertexArray(); const set = (o) => { for (const k in o) { const u = L[k]; if (!u) continue; const v = o[k]; if (u[1] === gl.FLOAT) gl.uniform1f(u[0], v); else if (u[1] === gl.FLOAT_VEC2) gl.uniform2f(u[0], v[0], v[1]); else if (u[1] === gl.FLOAT_VEC3) gl.uniform3f(u[0], v[0], v[1], v[2]); else gl.uniform1i(u[0], v); } };
  const T2 = (f, w, h, fmt, ty, d, filt) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, f, w, h, 0, fmt, ty, d); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  gl.activeTexture(gl.TEXTURE7); const tShape = T2(gl.R16F, SR, SZ, gl.RED, gl.FLOAT, null, gl.LINEAR), tLut = T2(gl.RGBA8, 568, 1, gl.RGBA, gl.UNSIGNED_BYTE, lut(), gl.LINEAR), tNone = T2(gl.RGBA8, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4), gl.NEAREST);
  const tTemp = gl.createTexture(); gl.bindTexture(gl.TEXTURE_3D, tTemp); gl.texImage3D(gl.TEXTURE_3D, 0, gl.RG16F, G.NZ, G.NY, G.NX, 0, gl.RG, gl.FLOAT, null); for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_3D, k, gl.LINEAR); for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, k, gl.CLAMP_TO_EDGE);
  const buf = new Float32Array(SR * SZ), tb = new Float32Array(G.NX * G.NY * G.NZ * 2);
  return {
    shape(pf) { // exact distance to the profile, in cm
      const P = []; for (let r = 0; r <= 124; r += 1.5) P.push([r / 10, pf(r) / 10]); let last = P.length - 1; while (last > 0 && P[last][1] <= 0) last--; const Q = P.slice(0, Math.min(P.length, last + 2)); Q[Q.length - 1][1] = 0; let first = 0; if (P[0][1] <= .02) { while (first < Q.length - 1 && Q[first + 1][1] <= .02) first++; }
      const S = Q.slice(first); if (first > 0) S[0] = [S[0][0], 0]; S.push([S[S.length - 1][0], -1]); if (first > 0) S.unshift([S[0][0], -1]);
      for (let j = 0; j < SZ; j++) { const z = ZMIN + (ZMAX - ZMIN) * (j + .5) / SZ; for (let i = 0; i < SR; i++) { const r = RMAX * i / (SR - 1); let d = 1e9; for (let s = 0; s < S.length - 1; s++) { const ax = S[s][0], az = S[s][1], bx = S[s + 1][0] - ax, bz = S[s + 1][1] - az, l = bx * bx + bz * bz || 1e-9, u = Math.max(0, Math.min(1, ((r - ax) * bx + (z - az) * bz) / l)), dx = r - ax - bx * u, dz = z - az - bz * u, q = dx * dx + dz * dz; if (q < d) d = q; } d = Math.sqrt(d); const h = pf(r * 10) / 10; buf[j * SR + i] = Math.min(1.4, h > .02 && z < h && z > -1 ? -d : d); } }
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, tShape); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SR, SZ, gl.RED, gl.FLOAT, buf); },
    temps(T, dry, near) { for (let i = 0; i < T.length; i++) { const s = near[i]; tb[i * 2] = T[s]; tb[i * 2 + 1] = dry[s]; } gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_3D, tTemp); gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, G.NZ, G.NY, G.NX, gl.RG, gl.FLOAT, tb); },
    draw(u, waveTex) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, u.uRes[0], u.uRes[1]); gl.disable(gl.BLEND); gl.useProgram(p); gl.bindVertexArray(vao); const b = (n, t, k) => { gl.activeTexture(gl.TEXTURE0 + n); gl.bindTexture(k || gl.TEXTURE_2D, t); }; b(0, tShape); b(1, tLut); b(2, waveTex || tNone); b(3, tTemp, gl.TEXTURE_3D); set({ uShape: 0, uLut: 1, uE: 2, uTemp: 3, uHasWave: waveTex ? 1 : 0, ...u }); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null); }
  };
}
// for drawing: every box outside the food borrows the value of the nearest food box
export function nearest(f) { const { NX, NY, NZ } = G, N = NX * NY * NZ, near = new Int32Array(N).fill(-1); let q = []; for (let p = 0; p < N; p++) if (f[p] > .25) { near[p] = p; q.push(p); } while (q.length) { const nx = []; for (const p of q) { const k = p % NZ, j = (p / NZ | 0) % NY, i = p / (NY * NZ) | 0; const t = (c, o) => { if (c && near[o] < 0) { near[o] = near[p]; nx.push(o); } }; t(k > 0, p - 1); t(k < NZ - 1, p + 1); t(j > 0, p - NZ); t(j < NY - 1, p + NZ); t(i > 0, p - NY * NZ); t(i < NX - 1, p + NY * NZ); } q = nx; } for (let p = 0; p < N; p++) if (near[p] < 0) near[p] = 0; return near; }
