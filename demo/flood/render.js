// Draws the plaster model, the glass water, the 1865 sheet and everything that stands on them. Raw WebGL2.
import { compile, tex, fbo } from './sim.js';
import { U0, V0, W, H, NX, NY } from './data.js';
export const EX = 4;        // ground and water are drawn 4 times taller than they are (said on the page)
const BH = 0.72;            // buildings at 72 % of their height so that streets stay visible
const BASE = -150;          // bottom of the plinth
const COMMON = `#version 300 es
precision highp float; precision highp sampler2D;
const vec2 O=vec2(${U0}.,${V0}.), D=vec2(${W}.,${H}.); const float EX=${EX}., BH=${BH};
uniform mat4 uVP; uniform vec3 uEye; uniform sampler2D uG,uLight,uSurf,uTop,uMap,uZone,uDiff; uniform vec3 uSun,uBg,uInk,uAcc,uPl; uniform float uDark,uTime,uSea,uFull; uniform vec3 uWipe; uniform vec2 uLamp;
float G(vec2 p){ return texture(uG,(p-O)/D).r; }
float wipe(vec2 p){ return uWipe.y*smoothstep(uWipe.x+90.,uWipe.x-90.,p.x+18.*sin(p.y*.011)+9.*sin(p.y*.037)); }
`;
const LIT = `
vec3 shade(vec3 alb,vec3 n,float ao,float sun){
  float d=max(dot(n,uSun),0.); float up=n.z*.5+.5;
  vec3 key=mix(vec3(.90,.875,.84),vec3(1.0,.93,.83),uDark), sky=mix(vec3(.80,.86,.92),vec3(.20,.26,.34),uDark), gnd=mix(vec3(.74,.71,.67),vec3(.13,.12,.11),uDark);
  vec3 amb=mix(gnd,sky,up)*(ao*ao*.35+ao*.65);
  return alb*(key*d*sun*mix(.92,1.0,uDark)+amb*mix(.53,.62,uDark));
}
vec3 tone(vec3 c){ c=pow(max(c,0.),vec3(1./2.2)); return c; }
`;
const V_GROUND = COMMON + `uniform ivec2 uGN; uniform float uStep; out vec2 p; out float z;
void main(){ int i=gl_VertexID%(uGN.x+1), j=gl_VertexID/(uGN.x+1); p=O+vec2(min(float(i)*uStep,D.x),min(float(j)*uStep,D.y)); z=texture(uG,(clamp(p,O+2.5,O+D-2.5)-O)/D).r; gl_Position=uVP*vec4(p,z*EX,1.); }`;
const F_GROUND = COMMON + LIT + `in vec2 p; in float z; out vec4 o; uniform vec4 uRing; uniform float uZoneOn,uDiffOn,uMapOn,uStripe; uniform vec4 uPick;
void main(){
  vec2 uv=(p-O)/D; float e=6.; float gx=(G(p+vec2(e,0.))-G(p-vec2(e,0.)))/(2.*e), gy=(G(p+vec2(0.,e))-G(p-vec2(0.,e)))/(2.*e);
  float zz=G(p); float k=zz<0.?1.:2.6; vec3 n=normalize(vec3(-gx*EX*k,-gy*EX*k,1.));
  vec2 l=texture(uLight,uv).rg; float m=wipe(p)*uMapOn; float ao=mix(l.x,1.,m*.8), sun=mix(l.y,1.,m*.85);
  vec3 alb=uPl*(zz<0.?1.:mix(.80,.92,uDark));
  if(m>.001){ vec3 mp=texture(uMap,uv).rgb; mp=pow(mp,vec3(2.2)); alb=mix(alb,mp*.97,m); }
  vec4 s=texture(uSurf,uv); float wet=smoothstep(.08,.3,s.w)*(1.-smoothstep(.0,.05,s.y))*step(.0,zz);
  alb*=mix(vec3(1.),vec3(.80,.85,.87),wet*(1.-m*.6));
  if(uDiffOn>0.){ vec4 f=texture(uDiff,uv); float h=.5+.5*cos((p.x+p.y)*uStripe); alb=mix(alb,mix(vec3(.10,.48,.36),vec3(.20,.72,.52),uDark),f.r*(.22+.78*smoothstep(.35,.65,h))*uDiffOn); alb=mix(alb,uAcc,f.g*.8*uDiffOn); }
  vec3 c=shade(alb,n,ao,sun);
  if(uZoneOn>0.&&zz>-.5){ float f=texture(uZone,uv).r-.5; float w=fwidth(f)+1e-4; float ln=1.-smoothstep(.7,1.7,abs(f)/w); c=mix(c,uAcc,ln*uZoneOn*step(.02,m)); }
  if(uRing.w>0.){ float r=length(p-uRing.xy); float w=fwidth(r)+.5; float q=1.-smoothstep(0.,1.6,abs(r-uRing.z)/w); c=mix(c,pow(uInk,vec3(2.2)),q*.6*uRing.w); }
  o=vec4(tone(c),1.);
}`;
const V_WALL = COMMON + `layout(location=0) in vec4 aE; layout(location=1) in vec2 aH; out vec3 P; out vec3 N; out float zg; out float al; flat out float id;
void main(){ int v=gl_VertexID; vec2 p=(v==0||v==2)?aE.xy:aE.zw; float m=wipe(p); float top=aH.x*EX+aH.y*BH*(1.-m); float z=v>1?top:aH.x*EX-12.; vec2 d=normalize(aE.zw-aE.xy); N=vec3(d.y,-d.x,0.); P=vec3(p,z); zg=aH.x*EX; al=(v==0||v==2)?0.:length(aE.zw-aE.xy); id=fract(sin(dot(aE.xy,vec2(12.9898,78.233)))*43758.5453); if(m>.995) { gl_Position=vec4(2.,2.,2.,1.); return; } gl_Position=uVP*vec4(P,1.); }`;
const F_WALL = COMMON + LIT + `in vec3 P; in vec3 N; in float zg; in float al; flat in float id; out vec4 o; uniform float uMarch;
float h2(vec2 q){ return fract(sin(dot(q,vec2(127.1,311.7))+id*91.)*43758.5453); }
bool manhattan(vec2 p){ return p.y>3500.? p.x<2150. : p.y>2400. ? p.x<2250. : p.x<1150.+(p.y-1200.)*.62; }
void main(){ vec3 n=normalize(N); vec2 uv=(P.xy+n.xy*3.5-O)/D; vec2 l=texture(uLight,uv).rg; float hgt=max(P.z-zg,0.); float ao=mix(l.x*.94,1.,smoothstep(0.,90.,hgt)); float sun=0.;
  float nl=dot(n,uSun); if(nl>0.){ sun=1.; if(uMarch>0.){ vec3 q=P+n*2.; for(int i=1;i<=12;i++){ float t=5.*float(i)+float(i*i)*2.2; vec3 r=q+uSun*t; float h=texture(uTop,(r.xy-O)/D).r; sun=min(sun,clamp(1.+(r.z-h)/(t*.22+2.),0.,1.)); } } else sun=mix(l.y,1.,smoothstep(0.,60.,hgt)); }
  vec3 c=tone(shade(uPl*.985,n,ao,sun)); float lamp=manhattan(P.xy)?uLamp.x:uLamp.y;
  if(lamp>.001){ vec2 q=vec2(al/4.6,(P.z-zg)/(3.9*BH)); vec2 f=fract(q), w=fwidth(q); float px=max(w.x,w.y); float on=step(.62,h2(floor(q)))*step(.6,q.y); vec2 e=smoothstep(.16,.30,f)*smoothstep(.16,.30,1.-f); float sharp=on*e.x*e.y; float mean=.38*.40*(.5+id); float k=mix(sharp,mean,smoothstep(.35,1.1,px)); c+=vec3(1.,.74,.40)*k*lamp*mix(1.,2.1,smoothstep(.35,1.1,px)); }
  o=vec4(c,1.); }`;
const V_ROOF = COMMON + `layout(location=0) in vec4 a; out vec3 P; out float mm; void main(){ float m=wipe(a.xy); mm=m; P=vec3(a.xy,a.z*EX+a.w*BH*(1.-m)); if(m>.995){ gl_Position=vec4(2.,2.,2.,1.); return; } gl_Position=uVP*vec4(P,1.); }`;
const F_ROOF = COMMON + LIT + `in vec3 P; in float mm; out vec4 o; uniform float uDiffOn; void main(){ vec2 uv=(P.xy-O)/D; vec2 l=texture(uLight,uv).rg; vec3 al=uPl; if(uDiffOn>0.){ vec2 f=texture(uDiff,uv).rg; al=mix(al,mix(vec3(.16,.55,.42),vec3(.24,.80,.58),uDark),smoothstep(.35,.6,f.r)*.85*uDiffOn); al=mix(al,uAcc,smoothstep(.35,.6,f.g)*.85*uDiffOn); } o=vec4(tone(shade(al,vec3(0.,0.,1.),mix(l.x,1.,.25),l.y)),1.); }`;
const V_BOX = COMMON + `layout(location=0) in vec3 a; layout(location=1) in vec3 b; out vec3 P; out vec3 N; uniform float uMelt; void main(){ P=a; float m=wipe(a.xy)*uMelt; P.z=mix(a.z,-400.,step(.6,m)); N=b; gl_Position=uVP*vec4(P,1.); }`;
const F_BOX = COMMON + LIT + `in vec3 P; in vec3 N; out vec4 o; uniform vec3 uCol; void main(){ vec3 n=normalize(N); o=vec4(tone(shade(uCol,n,1.,1.)),1.); }`;
const V_FLOOR = COMMON + `out vec2 p; void main(){ vec2 q=vec2(gl_VertexID&1,gl_VertexID>>1)*2.-1.; p=O+D*.5+q*26000.; gl_Position=uVP*vec4(p,${BASE}.,1.); }`;
const F_FLOOR = COMMON + `in vec2 p; out vec4 o; void main(){ vec2 c=abs(p-(O+D*.5)+vec2(-90.,70.))-D*.5+120.; float d=length(max(c,0.)); float d2=length(max(abs(p-(O+D*.5))-D*.5,0.)); float s=.30*exp(-d/330.)+.22*exp(-d2/70.); o=vec4(uBg*(1.-s*mix(.75,.9,uDark)),1.); }`;
const V_SIDE = COMMON + `uniform int uSide; out vec3 P; out vec3 N; flat out int top; void main(){ int i=gl_VertexID>>1; int t=gl_VertexID&1; float f=float(i)/256.; vec2 p=uSide==0?O+vec2(f*D.x,0.):uSide==1?O+vec2(D.x,f*D.y):uSide==2?O+vec2(D.x-f*D.x,D.y):O+vec2(0.,D.y-f*D.y); N=uSide==0?vec3(0.,-1.,0.):uSide==1?vec3(1.,0.,0.):uSide==2?vec3(0.,1.,0.):vec3(-1.,0.,0.); float z=texture(uG,(clamp(p,O+2.5,O+D-2.5)-O)/D).r; P=vec3(p,t==1?z*EX:${BASE}.); gl_Position=uVP*vec4(P,1.); }`;
const F_SIDE = COMMON + LIT + `in vec3 P; in vec3 N; out vec4 o; void main(){ float g=smoothstep(${BASE}.,-10.,P.z); o=vec4(tone(shade(uPl*.96,N,mix(.62,1.,g),1.)),1.); }`;
// ---- water: one pass, out = scatter + dst * transmission
const GLASS = `
vec3 env(vec3 r){ float up=clamp(r.z,0.,1.); vec3 a=mix(mix(vec3(.80,.82,.82),vec3(.97,.98,1.),up),mix(vec3(.05,.06,.07),vec3(.16,.20,.25),up),uDark);
  vec3 k=normalize(vec3(-.35,.72,.60)); float q=max(abs(dot(r,normalize(cross(k,vec3(0.,0.,1.)))))*1.0-.20,abs(r.z-k.z)*1.5-.16); a+=mix(.55,.75,uDark)*smoothstep(.22,-.06,q)*step(0.,r.y); return a; }
// display-space glass: rgb to add, a = how much of what is behind stays
vec4 glass(float th,vec3 n,vec3 v,float ext){
  float T=exp(-1.0*th)*.62+.38*exp(-.10*th); T*=1.-.16*smoothstep(0.01,.2,th);
  vec3 shallow=mix(vec3(.47,.72,.71),vec3(.26,.60,.60),uDark), mid=mix(vec3(.22,.505,.525),vec3(.12,.41,.43),uDark), deep=mix(vec3(.165,.385,.425),vec3(.045,.18,.22),uDark);
  vec3 col=mix(mix(shallow,mid,smoothstep(0.,2.5,th)),deep,smoothstep(2.,16.,th));
  float light=.80+.20*max(dot(n,uSun),0.)/max(uSun.z,.1);
  float F=.03+.80*pow(1.-clamp(dot(n,v),0.,1.),5.); vec3 e=env(reflect(-v,n));
  vec3 s=col*light*(1.-T)+e*F*ext; return vec4(s,T*(1.-F*ext*.6)); }`;
const V_WATER = COMMON + `uniform ivec2 uGN; uniform float uStep; out vec2 p; out float z;
void main(){ int i=gl_VertexID%(uGN.x+1), j=gl_VertexID/(uGN.x+1); p=O+vec2(min(float(i)*uStep,D.x),min(float(j)*uStep,D.y)); z=texture(uSurf,(p-O)/D).r; gl_Position=uVP*vec4(p,z*EX+.6,1.); }`;
const F_WATER = COMMON + GLASS + `in vec2 p; in float z; out vec4 o; uniform float uPx;
float hs(vec2 q){ return sin(q.x*.021+uTime*.7)+sin(q.y*.027-uTime*.6+q.x*.011)+.6*sin((q.x-q.y)*.051+uTime*1.1)+.4*sin((q.x*1.7+q.y)*.083-uTime*1.4); }
void main(){
  vec2 uv=(p-O)/D; vec4 s=texture(uSurf,uv); float g=G(p); float th=s.x-g; float film=max(s.y,0.);
  th=mix(film,max(th,0.),smoothstep(.10,.45,film)); if(g>-.2&&film<.012) discard; if(th<.006) discard;
  float e=8.; vec2 dn=vec2(texture(uSurf,uv+vec2(e,0.)/D).r-texture(uSurf,uv-vec2(e,0.)/D).r, texture(uSurf,uv+vec2(0.,e)/D).r-texture(uSurf,uv-vec2(0.,e)/D).r)/(2.*e); dn=clamp(dn,-.06,.06);
  float far=clamp(uPx*.10,0.,1.); vec2 rp=vec2(hs(p+vec2(1.5,0.))-hs(p-vec2(1.5,0.)),hs(p+vec2(0.,1.5))-hs(p-vec2(0.,1.5)))*.06*(1.-far*.7)*(.5+s.z*.8)*smoothstep(.1,1.5,th);
  vec3 n=normalize(vec3(-dn*EX*.9-rp*.35,1.)); vec3 v=normalize(uEye-vec3(p,z*EX));
  vec4 c=glass(th,n,v,1.); if(g>-.6){ float q=smoothstep(.1,.6,th)*(1.-wipe(p)); c.rgb+=mix(vec3(.02,.09,.10),vec3(.03,.14,.15),uDark)*q; c.a*=1.-.22*q; } if(g>-.6){ float mm=wipe(p); c.a=mix(c.a,mix(c.a,1.,.45),mm); c.rgb*=mix(1.,.62,mm); }
  float w=max(fwidth(th),.004); float rim=(1.-smoothstep(0.,1.7,th/w))*step(-.2,g); c.rgb+=rim*mix(vec3(.55,.72,.72),vec3(.16,.34,.36),uDark)*.35; c.a*=1.-rim*.25;
  float foam=smoothstep(.9,2.6,s.z)*smoothstep(.04,.2,th)*.30; c.rgb=mix(c.rgb,vec3(.85,.92,.92),foam); c.a*=1.-foam;
  o=c;
}`;
const V_SKIRT = COMMON + `uniform int uSide; out vec3 P; out vec3 N; out float vv; out float bot; void main(){ int i=gl_VertexID>>1; int t=gl_VertexID&1; float f=float(i)/512.; vec2 p=uSide==0?O+vec2(f*D.x,0.):uSide==1?O+vec2(D.x,f*D.y):uSide==2?O+vec2(D.x-f*D.x,D.y):O+vec2(0.,D.y-f*D.y); N=uSide==0?vec3(0.,-1.,0.):uSide==1?vec3(1.,0.,0.):uSide==2?vec3(0.,1.,0.):vec3(-1.,0.,0.); vec2 c=clamp(p,O+4.,O+D-4.); vec2 uv=(c-O)/D; float z=texture(uG,uv).r; vec4 s=texture(uSurf,uv); float e=s.y<.02?z:max(s.x,z); bot=z*EX; vv=float(t); P=vec3(p+N.xy*.5,t==1?e*EX+.6:z*EX); gl_Position=uVP*vec4(P,1.); }`;
const F_SKIRT = COMMON + GLASS + `in vec3 P; in vec3 N; in float vv; in float bot; out vec4 o; void main(){ float top=smoothstep(.0,1.,vv); vec3 c=mix(mix(vec3(.33,.66,.67),vec3(.12,.40,.45),1.-top),mix(vec3(.12,.42,.46),vec3(.04,.20,.25),1.-top),uDark); float ed=fwidth(vv); c+=smoothstep(1.-ed*2.2,1.,vv)*vec3(.32,.45,.45)*mix(1.,.45,uDark); vec3 v=normalize(uEye-P); float F=.05+.8*pow(1.-abs(dot(v,N)),4.); c+=F*.25*env(reflect(-v,N)); o=vec4(c*.86,.14); }`;
// ---- text lying on the ground or on the water
const V_TXT = COMMON + `layout(location=0) in vec4 aP; layout(location=1) in vec4 aU; layout(location=2) in vec3 aS; uniform vec2 uCam; uniform float uPxM; uniform vec2 uFade; uniform float uLift; out vec2 uv; out float al; flat out float kind;
void main(){ vec2 q=vec2(gl_VertexID&1,gl_VertexID>>1)*2.-1.; vec2 d=aP.zw; vec2 sz=aS.xy; kind=aS.z; float flip=dot(d,uCam)<-.02?-1.:1.; d*=flip; vec2 nn=vec2(-d.y,d.x); vec2 p=aP.xy+d*q.x*sz.x*.5+nn*q.y*sz.y*.5; float z=kind<.5?G(p)*EX+1.5:(kind<1.5?uSea*EX+2.:40.); uv=mix(aU.xy,aU.zw,vec2(q.x*.5+.5,.5-q.y*.5)); vec4 c=uVP*vec4(p,z,1.); vec4 c0=uVP*vec4(aP.xy,z,1.); float px=sz.y*uPxM/c0.w; al=smoothstep(uFade.x,uFade.x*1.5,px)*(1.-smoothstep(uFade.y,uFade.y*1.4,px)); float m=wipe(aP.xy); al*=kind<.5||kind>1.5?1.-m:1.-m*.9; if(al<.01) c=vec4(2.,2.,2.,1.); c.z-=uLift*c.w; gl_Position=c; }`;
const F_TXT = COMMON + `in vec2 uv; in float al; flat in float kind; uniform sampler2D uAtlas; uniform vec4 uTc; out vec4 o; void main(){ vec4 t=texture(uAtlas,uv); if(kind>1.5){ float f=t.a>.001?t.r/t.a:0.; o=vec4(mix(mix(vec3(1.),vec3(.07),uDark),uTc.rgb,clamp(f,0.,1.)),t.a*al*.95); } else o=vec4(uTc.rgb,t.a*al*uTc.a); }`;
// ---- small things
const V_DOT = COMMON + `layout(location=0) in vec4 a; uniform float uPxM,uDpr,uSz; out float st; void main(){ st=a.w; vec4 c=uVP*vec4(a.xy,max(G(a.xy)*EX,uSea*EX*0.)+a.z,1.); float m=wipe(a.xy); if(m>.5) c=vec4(2.,2.,2.,1.); gl_Position=c; gl_PointSize=clamp(14.*uPxM/c.w,(a.w>.5?6.:3.6)*uDpr,17.*uDpr)*uSz; }`;
const F_DOT = COMMON + `in float st; uniform float uDpr; out vec4 o; void main(){ vec2 q=gl_PointCoord*2.-1.; float r=length(q); if(r>1.) discard; vec3 c=st>.5?mix(vec3(.04,.22,.62),vec3(.35,.62,1.),uDark):mix(vec3(.10,.34,.24),vec3(.45,.78,.62),uDark); float hi=smoothstep(.55,.0,length(q-vec2(-.3,-.35))); vec3 k=mix(c,vec3(1.),hi*.65); k=mix(k,mix(vec3(1.),vec3(.05),uDark),smoothstep(.74,.86,r)); o=vec4(k,smoothstep(1.,.86,r)); }`;
const V_RAIN = COMMON + `uniform vec4 uBr; uniform float uPxM,uAmt; uniform vec2 uVPx; out float al; float h(float x){ return fract(sin(x*91.17)*43758.5); }
void main(){ float i=float(gl_InstanceID); vec2 q=vec2(gl_VertexID&1,gl_VertexID>>1); float a=h(i)*6.2832, r=sqrt(h(i+.31))*uBr.z; vec2 p=uBr.xy+r*vec2(cos(a),sin(a)); float g=max(G(p)*EX,uSea*EX); float ph=fract(h(i+.7)+uTime*(1.5+.5*h(i+.2))); float z0=g+uBr.w*(1.-ph); float len=uBr.w*.20; vec4 A=uVP*vec4(p,z0,1.),B=uVP*vec4(p,z0+len,1.); vec2 d=(B.xy/B.w-A.xy/A.w)*uVPx; d=normalize(d+1e-4); vec4 c=q.y<.5?A:B; c.xy+=vec2(-d.y,d.x)/uVPx*(q.x-.5)*2.0*c.w; al=(q.y<.5?.9:.0)*smoothstep(0.,.15,ph)*uAmt; gl_Position=c; }`;
const F_RAIN = COMMON + `in float al; out vec4 o; void main(){ vec3 c=mix(vec3(.10,.40,.44),vec3(.60,.86,.88),uDark); o=vec4(c,al*.85); }`;
// ---- baking
const V_FS = `#version 300 es
precision highp float; uniform vec4 uRect; out vec2 uv; void main(){ vec2 q=vec2(gl_VertexID&1,gl_VertexID>>1); uv=mix(uRect.xy,uRect.zw,q); gl_Position=vec4(uv*2.-1.,0.,1.); }`;
const V_TOP = `#version 300 es
precision highp float; layout(location=0) in vec4 a; const vec2 O=vec2(${U0}.,${V0}.), D=vec2(${W}.,${H}.); out float z; void main(){ z=a.z*${EX}.+a.w*${BH}; gl_Position=vec4((a.xy-O)/D*2.-1.,0.,1.); }`;
const F_TOP = `#version 300 es
precision highp float; in float z; out vec4 o; void main(){ o=vec4(z); }`;
const F_TOP0 = `#version 300 es
precision highp float; precision highp sampler2D; in vec2 uv; uniform sampler2D uG; out vec4 o; void main(){ o=vec4(texture(uG,uv).r*${EX}.); }`;
const F_BAKE = `#version 300 es
precision highp float; precision highp sampler2D; in vec2 uv; uniform sampler2D uTop; uniform vec3 uSun; out vec4 o; const vec2 D=vec2(${W}.,${H}.);
void main(){ vec2 p=uv*D; float z=texture(uTop,uv).r; float ao=0.; float j=fract(sin(dot(floor(p/2.5),vec2(12.9898,78.233)))*43758.5453);
 for(int k=0;k<14;k++){ float a=(float(k)+j)/14.*6.28318; vec2 d=vec2(cos(a),sin(a)); float s=0.; for(int i=0;i<7;i++){ float t=4.+float(i)*5.+float(i*i)*2.6; float h=texture(uTop,(p+d*t)/D).r-z; s=max(s,h/sqrt(h*h+t*t)); } ao+=1.-s; } ao/=14.;
 float sun=1.; for(int i=1;i<=56;i++){ float t=2.5+float(i)*3.+float(i*i)*.16; vec3 r=vec3(p,z+1.)+uSun*t; float h=texture(uTop,r.xy/D).r; sun=min(sun,clamp(1.+(r.z-h)/(t*.075+1.5),0.,1.)); }
 o=vec4(ao,sun,0.,1.); }`;

// ---- tiny matrix kit
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], norm = a => { const l = Math.hypot(...a) || 1; return a.map(x => x / l); }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };

function earcut(px, py, s, e, out) { // ear clipping of one simple polygon (counter-clockwise), indices into px/py
  const n = e - s; if (n < 3) return; const nx = new Int16Array(n), pv = new Int16Array(n); for (let i = 0; i < n; i++) { nx[i] = (i + 1) % n; pv[i] = (i + n - 1) % n; }
  const ar = (a, b, c) => (px[s + b] - px[s + a]) * (py[s + c] - py[s + a]) - (py[s + b] - py[s + a]) * (px[s + c] - px[s + a]);
  let left = n, i = 0, guard = 0;
  while (left > 3 && guard < 2 * left + 4) {
    const a = pv[i], c = nx[i]; let ear = ar(a, i, c) > 1e-6;
    if (ear) for (let k = nx[c]; k !== a; k = nx[k]) if (ar(a, i, k) >= 0 && ar(i, c, k) >= 0 && ar(c, a, k) >= 0 && ar(pv[k], k, nx[k]) <= 0) { ear = false; break; }
    if (ear || Math.abs(ar(a, i, c)) <= 1e-6) { if (ear) out.push(s + a, s + i, s + c); nx[a] = c; pv[c] = a; left--; guard = 0; i = c; } else { i = c; guard++; }
  }
  if (left >= 3) { const a = i, b = nx[i], c = nx[b]; out.push(s + a, s + b, s + c); if (left > 3) { let k = nx[c], p = c; while (k !== a) { out.push(s + a, s + p, s + k); p = k; k = nx[k]; } } }
}

export class View {
  constructor(gl, sim, { ground, bld, small }) {
    this.gl = gl; this.sim = sim; this.small = small; this.ground = ground; this.bld = bld; this.melt = 0; this.cam = { x: 620, y: 1900, d: 9000, az: 0, el: 50, fov: 26 }; this.time = 0; this.mapOn = 0; this.wipeX = U0 - 300; this.zoneOn = 0; this.diffOn = 0; this.ring = [0, 0, 0, 0]; this.rainFx = [0, 0, 0, 0]; this.rainAmt = 0; this.dots = false; this.hoods = 1; this.lamp = [1, 1]; this.dusk = 0; this.dk = 0;
    this.lin = gl.getExtension('OES_texture_float_linear'); gl.getExtension('EXT_float_blend');
    const P = (v, f) => compile(gl, v, f);
    this.p = { ground: P(V_GROUND, F_GROUND), wall: P(V_WALL, F_WALL), roof: P(V_ROOF, F_ROOF), box: P(V_BOX, F_BOX), floor: P(V_FLOOR, F_FLOOR), side: P(V_SIDE, F_SIDE), water: P(V_WATER, F_WATER), skirt: P(V_SKIRT, F_SKIRT), txt: P(V_TXT, F_TXT), dot: P(V_DOT, F_DOT), rain: P(V_RAIN, F_RAIN), top: P(V_TOP, F_TOP), top0: P(V_FS, F_TOP0), bake: P(V_FS, F_BAKE) };
    this.G = tex(gl, ground.w, ground.h, gl.R16F, gl.RED, gl.FLOAT, ground.g, gl.LINEAR);
    const one = new Uint8Array([255, 255, 255, 255]), nil = new Uint8Array([0, 0, 0, 0]);
    this.map = tex(gl, 1, 1, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, one, gl.LINEAR); this.zone = tex(gl, 1, 1, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nil, gl.LINEAR); this.diff = tex(gl, 1, 1, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nil, gl.LINEAR);
    this.empty = gl.createVertexArray(); this.meshes(); this.boxes = []; this.setTheme(false); this.bridges();
  }
  meshes() {
    const { gl, bld } = this, { nb, ne, st, X, Y, base, ht } = bld, E = new Float32Array(ne * 6), R = new Float32Array(ne * 4), idx = [];
    for (let b = 0; b < nb; b++) { const s = st[b], e = st[b + 1]; for (let k = s; k < e; k++) { const n = k + 1 < e ? k + 1 : s; E.set([X[k], Y[k], X[n], Y[n], base[b], ht[b]], k * 6); R.set([X[k], Y[k], base[b], ht[b]], k * 4); } earcut(X, Y, s, e, idx); }
    const va = (f) => { const v = gl.createVertexArray(); gl.bindVertexArray(v); f(); gl.bindVertexArray(null); return v; }, buf = (t, d) => { const b = gl.createBuffer(); gl.bindBuffer(t, b); gl.bufferData(t, d, gl.STATIC_DRAW); return b; };
    this.wallV = va(() => { buf(gl.ARRAY_BUFFER, E); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 24, 0); gl.vertexAttribDivisor(0, 1); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 16); gl.vertexAttribDivisor(1, 1); }); this.nWall = ne;
    this.roofV = va(() => { buf(gl.ARRAY_BUFFER, R); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0); buf(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx)); }); this.nRoof = idx.length;
    this.step = this.small ? 20 : 10; this.gn = [W / this.step, H / this.step]; const [gw, gh] = this.gn, I = new Uint32Array(gw * gh * 6); let o = 0;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const a = j * (gw + 1) + i, b = a + 1, c = a + gw + 1, d = c + 1; I[o++] = a; I[o++] = b; I[o++] = d; I[o++] = a; I[o++] = d; I[o++] = c; }
    this.gridV = va(() => buf(gl.ELEMENT_ARRAY_BUFFER, I)); this.nGrid = o;
  }
  setTheme(dark) {
    const { gl } = this; this.dark = dark;
    this.sun = norm(dark ? [-.80, -.30, .52] : [-.62, -.36, .72]);
    this.base = null; this.col = dark ? { bg: [.066, .073, .080], ink: [.93, .93, .91], acc: [1.0, .42, .29], pl: [.80, .785, .76] } : { bg: [.902, .902, .894], ink: [.11, .12, .13], acc: [.86, .25, .14], pl: [.895, .885, .865] };
    this.bakeNow = true; this.setDusk(this.dusk || 0);
  }
  setDusk(v) { // 0 = the visitor's own light, 1 = the night of the storm
    this.dusk = v; const a = this.dark, mix = (x, y) => x.map((q, i) => q + (y[i] - q) * v), n = { bg: [.052, .060, .070], ink: [.93, .93, .91], acc: [1.0, .42, .29], pl: [.125, .145, .185] }; this.dk = a ? 1 : v; const b = this.base || (this.base = this.col); this.col = { bg: mix(b.bg, n.bg), ink: mix(b.ink, n.ink), acc: mix(b.acc, n.acc), pl: mix(b.pl, n.pl) };
  }
  bake() { // top heights (once) then occlusion + sun, in strips so that a phone never stalls for long
    const { gl, p } = this, tw = this.small ? 1024 : 2048, th = tw * 1.25; gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    if (!this.top) {
      this.top = tex(gl, tw, th, gl.R16F, gl.RED, gl.HALF_FLOAT, null, gl.LINEAR); this.topF = fbo(gl, this.top); this.light = tex(gl, tw, th, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, null, gl.LINEAR); this.lightF = fbo(gl, this.light);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.topF); gl.viewport(0, 0, tw, th); gl.bindVertexArray(this.empty); gl.useProgram(p.top0.p); gl.uniform4f(p.top0.u.uRect, 0, 0, 1, 1); gl.uniform1i(p.top0.u.uG, 0); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.G); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.useProgram(p.top.p); gl.bindVertexArray(this.roofV); gl.enable(gl.BLEND); gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE); gl.drawElements(gl.TRIANGLES, this.nRoof, gl.UNSIGNED_INT, 0); gl.blendEquation(gl.FUNC_ADD); gl.disable(gl.BLEND);
      const rw = 1024, rh = 1280; if (tw === rw) { const d = new Float32Array(rw * rh * 4); gl.readPixels(0, 0, rw, rh, gl.RGBA, gl.FLOAT, d); this.topA = Float32Array.from({ length: rw * rh }, (_, i) => d[i * 4]); }
      else { const d = new Float32Array(tw * th * 4); gl.readPixels(0, 0, tw, th, gl.RGBA, gl.FLOAT, d); const a = new Float32Array(rw * rh); for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) a[j * rw + i] = d[(j * 2 * tw + i * 2) * 4]; this.topA = a; }
    }
    gl.useProgram(p.bake.p); gl.bindVertexArray(this.empty); gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightF); gl.viewport(0, 0, tw, th); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.top); gl.uniform1i(p.bake.u.uTop, 0); gl.uniform3fv(p.bake.u.uSun, this.sun);
    const n = this.small ? 16 : 10; for (let j = 0; j < n; j++) { gl.uniform4f(p.bake.u.uRect, 0, j / n, 1, (j + 1) / n); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); if (this.small) gl.flush(); }
    this.bakeNow = false;
  }
  box(list, x0, y0, z0, dx, dy, len, w, h, taper = 1) { // oriented box: centre line start, unit dir, length, width, height
    const nx = -dy, ny = dx, c = []; for (const t of [0, 1]) for (const [l, s] of [[0, -1], [1, -1], [1, 1], [0, 1]]) { const ww = w / 2 * (t ? taper : 1); c.push([x0 + dx * len * l + nx * s * ww, y0 + dy * len * l + ny * s * ww, z0 + h * t]); }
    const f = (a, b, d, e, n) => list.push(...[a, b, d, a, d, e].flatMap(i => [...c[i], ...n])); f(4, 5, 6, 7, [0, 0, 1]); f(0, 1, 5, 4, [-nx, -ny, 0]); f(2, 3, 7, 6, [nx, ny, 0]); f(3, 0, 4, 7, [-dx, -dy, 0]); f(1, 2, 6, 5, [dx, dy, 0]); f(0, 3, 2, 1, [0, 0, -1]);
  }
  mesh(list) { const { gl } = this, v = gl.createVertexArray(), b = gl.createBuffer(); gl.bindVertexArray(v); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(list), gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12); gl.bindVertexArray(null); return { v, b, n: list.length / 6 }; }
  groundAt(x, y) { const i = Math.max(0, Math.min(1023, Math.floor((x - U0) / 5))), j = Math.max(0, Math.min(1279, Math.floor((y - V0) / 5))); return this.ground.g[j * 1024 + i]; }
  topAt(x, y) { const i = Math.max(0, Math.min(1023, Math.floor((x - U0) / 5))), j = Math.max(0, Math.min(1279, Math.floor((y - V0) / 5))); return this.topA ? this.topA[j * 1024 + i] : this.ground.g[j * 1024 + i] * EX; }
  bridges() { // Brooklyn, Manhattan, Williamsburg: deck from the city's centre lines, span lengths as built, heights true to the plan
    const L = []; for (const [mx, my, dx, dy, span, a, b, deck, tow, w] of [[977, 1112, .9587, -.2845, 486, -700, 860, 41, 84, 26], [1383, 1478, .7909, -.6120, 448, -960, 960, 41, 98, 37], [2404, 2861, .9919, .1266, 488, -900, 795, 41, 94, 36]]) {
      const P = t => [mx + dx * t, my + dy * t], z = t => { const A = Math.abs(t), e = t < 0 ? -a : b, h = span / 2 + 60; return A < h ? deck * EX * .55 : Math.max(this.groundAt(...P(t)) * EX + 4, deck * EX * .55 * (1 - (A - h) / (e - h))); }, N = 48;
      for (let i = 0; i < N; i++) { const t0 = a + (b - a) * i / N, t1 = a + (b - a) * (i + 1) / N, p = P(t0); this.box(L, p[0], p[1], Math.min(z(t0), z(t1)), dx, dy, (b - a) / N + .5, w, 5); if (i % 3 === 1 && (z(t0) - this.groundAt(...p) * EX > 25) && Math.abs(t0) > span / 2 + 20) this.box(L, p[0], p[1], -60, dx, dy, 7, w * .6, z(t0) + 60); }
      for (const s of [-1, 1]) { const p = P(s * span / 2 - 6); const nx = -dy, ny = dx; for (const q of [-1, 0, 1]) if (w > 30 ? q : 1) this.box(L, p[0] + nx * q * w * .42, p[1] + ny * q * w * .42, -70, dx, dy, 13, w > 30 ? 8 : 6.5, 70 + tow * EX * .55, .9); for (const zz of [.62, .97]) this.box(L, p[0], p[1], tow * EX * .55 * zz - 12, dx, dy, 12, w * .95, 12); }
      const cab = (t) => { const A = Math.abs(t), h = span / 2; return A < h ? deck * EX * .55 + 8 + (tow - deck) * EX * .55 * (t / h) ** 2 : Math.max(z(t), tow * EX * .55 - (tow * EX * .55 - z(t < 0 ? -h - 300 : h + 300)) * Math.min(1, (A - h) / 300)); };
      for (const s of [-1, 1]) for (let i = 0; i < 56; i++) { const t0 = -span / 2 - 300 + (span + 600) * i / 56, t1 = t0 + (span + 600) / 56; if (t1 < a || t0 > b || t1 > b) continue; const p = P(t0), q = P(t1), za = cab(t0), zb = cab(t1), nx = -dy * s * w * .42, ny = dx * s * w * .42, r = 2.2; L.push(...[[p, za - r], [q, zb - r], [q, zb + r], [p, za - r], [q, zb + r], [p, za + r]].flatMap(([c, zz]) => [c[0] + nx, c[1] + ny, zz, -dy * .3, dx * .3 - .5, .8])); }
    } this.bridge = this.mesh(L);
  }
  setWalls(lines, h) { // lines of [x,y]; kept dry side does not matter
    const { gl } = this; if (this.walls) { gl.deleteVertexArray(this.walls.v); gl.deleteBuffer(this.walls.b); } const L = [], w = Math.max(9, this.cam.d * .0020), hh = Math.max(h * EX, this.cam.d * .0026); this.wallScale = this.cam.d;
    for (const l of lines) for (let i = 0; i + 1 < l.length; i++) { const [a, b] = [l[i], l[i + 1]], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < .5) continue; const dx = (b[0] - a[0]) / len, dy = (b[1] - a[1]) / len, n = Math.max(1, Math.round(len / 20)); for (let k = 0; k < n; k++) { const x = a[0] + dx * len * k / n, y = a[1] + dy * len * k / n; if (this.onSea && this.onSea(x + dx * len / n / 2, y + dy * len / n / 2)) continue; const z = Math.max(-1, Math.max(this.groundAt(x, y), this.groundAt(x + dx * 10, y + dy * 10))) * EX - 10; this.box(L, x - dx * .6, y - dy * .6, z, dx, dy, len / n + 1.2, w, hh + 10, .8); } }
    this.walls = L.length ? this.mesh(L) : null; this.wallLines = lines; this.wallH = h;
  }
  setDots(pts, st) { const { gl } = this, d = new Float32Array(pts.length * 4); pts.forEach((p, i) => d.set([p[0], p[1], 26, st ? st[i] : 0], i * 4)); if (!this.dotV) { this.dotV = gl.createVertexArray(); this.dotB = gl.createBuffer(); gl.bindVertexArray(this.dotV); gl.bindBuffer(gl.ARRAY_BUFFER, this.dotB); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null); } gl.bindBuffer(gl.ARRAY_BUFFER, this.dotB); gl.bufferData(gl.ARRAY_BUFFER, d, gl.DYNAMIC_DRAW); this.nDot = pts.length; }
  image(name, src) { const { gl } = this; gl.deleteTexture(this[name]); const t = this[name] = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); const a = gl.getExtension('EXT_texture_filter_anisotropic'); if (a) gl.texParameterf(gl.TEXTURE_2D, a.TEXTURE_MAX_ANISOTROPY_EXT, 8); }
  setZone(u8) { const { gl } = this; gl.deleteTexture(this.zone); this.zone = tex(gl, NX, NY, gl.R8, gl.RED, gl.UNSIGNED_BYTE, u8, gl.LINEAR); }
  setDiff(rg) { const { gl } = this; gl.deleteTexture(this.diff); this.diff = tex(gl, NX, NY, gl.RG8, gl.RG, gl.UNSIGNED_BYTE, rg, gl.LINEAR); }
  // labels: {t, x, y, dx, dy, h, k} k 0 street 1 water 2 neighbourhood
  setLabels(list) {
    const { gl } = this, S = this.small ? 2048 : 4096, c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d'), fs = this.small ? 30 : 44; g.textBaseline = 'middle'; g.fillStyle = '#fff';
    let x = 4, y = 4; const cache = new Map(), out = []; const rowH = fs * 1.35; let full = false;
    for (const l of list) { const key = l.k + l.t; let r = cache.get(key);
      if (!r) { if (full) continue; const sp = l.k === 2 ? .16 : l.k === 1 ? .42 : .03; g.font = (l.k === 1 ? '400 ' : l.k === 2 ? '500 ' : '400 ') + fs + 'px Jost, "PingFang SC", "Noto Sans SC", sans-serif'; if ('letterSpacing' in g) g.letterSpacing = (sp * fs) + 'px'; const w = Math.ceil(g.measureText(l.t).width) + 8; if (x + w > S - 4) { x = 4; y += rowH; } if (y + rowH > S) { full = true; continue; } if (l.k === 2) { g.strokeStyle = '#000'; g.lineWidth = fs * .22; g.lineJoin = 'round'; g.strokeText(l.t, x + 6, y + rowH / 2); } g.fillText(l.t, x + (l.k === 2 ? 6 : 4), y + rowH / 2); r = [x / S, y / S, (x + w) / S, (y + rowH) / S, w / rowH]; cache.set(key, r); x += w + 4; }
      out.push(l.x, l.y, l.dx, l.dy, r[0], r[1], r[2], r[3], l.h * r[4] * 1.35, l.h * 1.35, l.k); }
    if (this.atlas) gl.deleteTexture(this.atlas); const t = this.atlas = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); const a = gl.getExtension('EXT_texture_filter_anisotropic'); if (a) gl.texParameterf(gl.TEXTURE_2D, a.TEXTURE_MAX_ANISOTROPY_EXT, 8); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (!this.txtV) { this.txtV = gl.createVertexArray(); this.txtB = gl.createBuffer(); gl.bindVertexArray(this.txtV); gl.bindBuffer(gl.ARRAY_BUFFER, this.txtB); [[0, 4, 0], [1, 4, 16], [2, 3, 32]].forEach(([i, n, o]) => { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, n, gl.FLOAT, false, 44, o); gl.vertexAttribDivisor(i, 1); }); gl.bindVertexArray(null); }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.txtB); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(out), gl.DYNAMIC_DRAW); this.nTxt = out.length / 11;
    this.txtRange = {}; let i0 = 0; for (const k of [0, 1, 2]) { let n = 0; for (let i = i0; i < this.nTxt && out[i * 11 + 10] === k; i++) n++; this.txtRange[k] = [i0, n]; i0 += n; }
  }
  // ---- camera
  matrices(w, h) {
    const c = this.cam, e = c.el * Math.PI / 180, a = c.az * Math.PI / 180, dir = [Math.sin(a) * Math.cos(e), -Math.cos(a) * Math.cos(e), Math.sin(e)]; const tz = 0, eye = [c.x + dir[0] * c.d, c.y + dir[1] * c.d, tz + dir[2] * c.d]; this.eye = eye;
    const f = norm(sub([c.x, c.y, tz], eye)), s = norm(cross(f, [0, 0, 1])), u = cross(s, f); this.right = s; this.up = u; this.fwd = f;
    const V = new Float32Array([s[0], u[0], -f[0], 0, s[1], u[1], -f[1], 0, s[2], u[2], -f[2], 0, -dot(s, eye), -dot(u, eye), dot(f, eye), 1]);
    const t = Math.tan(c.fov * Math.PI / 360), asp = w / h, n = Math.max(20, c.d * .04), fr = c.d * 2.5 + 9000; this.tan = t; const ox = this.shift ? this.shift[0] : 0, oy = this.shift ? this.shift[1] : 0;
    const Pm = new Float32Array([1 / (t * asp), 0, 0, 0, 0, 1 / t, 0, 0, -ox, -oy, (fr + n) / (n - fr), -1, 0, 0, 2 * fr * n / (n - fr), 0]); this.VP = mul(Pm, V); this.pxM = h / (2 * t);
  }
  project(x, y, z) { const m = this.VP, w = m[3] * x + m[7] * y + m[11] * z + m[15]; return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, w]; }
  ray(nx, ny) { const asp = this.aspect, t = this.tan, ox = this.shift ? this.shift[0] : 0, oy = this.shift ? this.shift[1] : 0, X = (nx - ox) * t * asp, Y = (ny - oy) * t; const d = norm([0, 1, 2].map(i => this.fwd[i] + this.right[i] * X + this.up[i] * Y)); return d; }
  pick(nx, ny, buildings = true) { // first hit on the model, in metres; null if outside
    const d = this.ray(nx, ny), o = this.eye; if (d[2] >= -.01) return null; const zmax = 420, t0 = Math.max(0, (o[2] - zmax) / -d[2]), t1 = (o[2] + 80) / -d[2]; let hit = null; const N = 900;
    for (let i = 0; i <= N; i++) { const t = t0 + (t1 - t0) * i / N, x = o[0] + d[0] * t, y = o[1] + d[1] * t, z = o[2] + d[2] * t; if (x < U0 || y < V0 || x > U0 + W || y > V0 + H) continue; const g = buildings && this.mapOn < .5 ? this.topAt(x, y) : Math.max(this.groundAt(x, y), this.sim.sea) * EX; if (z <= Math.max(g, this.sim.sea * EX * (this.groundAt(x, y) < -.5 ? 1 : -99))) { hit = [x, y]; break; } }
    return hit;
  }
  // ---- frame
  uni(P) { const { gl } = this, u = P.u; gl.useProgram(P.p); gl.uniformMatrix4fv(u.uVP, false, this.VP); gl.uniform3fv(u.uEye, this.eye); ['uG', 'uLight', 'uSurf', 'uTop', 'uMap', 'uZone', 'uDiff'].forEach((n, i) => u[n] && gl.uniform1i(u[n], i)); u.uSun && gl.uniform3fv(u.uSun, this.sun); u.uBg && gl.uniform3fv(u.uBg, this.col.bg); u.uInk && gl.uniform3fv(u.uInk, this.col.ink); u.uAcc && gl.uniform3fv(u.uAcc, this.col.acc.map(v => Math.pow(v, 2.2))); u.uPl && gl.uniform3fv(u.uPl, this.col.pl); u.uDark && gl.uniform1f(u.uDark, this.dk); u.uTime && gl.uniform1f(u.uTime, this.time); u.uSea && gl.uniform1f(u.uSea, this.sim.sea); u.uWipe && gl.uniform3f(u.uWipe, this.wipeX, this.mapOn, 0); u.uLamp && gl.uniform2f(u.uLamp, this.lamp[0] * this.dusk, this.lamp[1] * this.dusk); return u; }
  draw(w, h, target = null) {
    const { gl, sim, p } = this; if (this.bakeNow) this.bake(); sim.surface(); this.aspect = w / h; this.matrices(w, h);
    if (this.walls && Math.abs(Math.log(this.cam.d / this.wallScale)) > .25) this.setWalls(this.wallLines, this.wallH);
    [this.G, this.light, sim.S, this.top, this.map, this.zone, this.diff].forEach((t, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); });
    gl.bindFramebuffer(gl.FRAMEBUFFER, target); gl.viewport(0, 0, w, h); gl.clearColor(...this.col.bg, 1); gl.clearDepth(1); gl.depthMask(true); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.bindVertexArray(this.empty); let u;
    gl.depthMask(false); this.uni(p.floor); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.depthMask(true);
    u = this.uni(p.side); for (let s = 0; s < 4; s++) { gl.uniform1i(u.uSide, s); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 514); }
    u = this.uni(p.ground); gl.uniform2i(u.uGN, ...this.gn); gl.uniform1f(u.uStep, this.step); gl.uniform4fv(u.uRing, this.ring); gl.uniform1f(u.uZoneOn, this.zoneOn); gl.uniform1f(u.uDiffOn, this.diffOn); gl.uniform1f(u.uStripe, 6.2832 / Math.max(14, this.cam.d * .0062)); gl.uniform1f(u.uMapOn, this.mapOn); gl.bindVertexArray(this.gridV); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1, 2); gl.drawElements(gl.TRIANGLES, this.nGrid, gl.UNSIGNED_INT, 0); gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.enable(gl.CULL_FACE); gl.frontFace(gl.CCW); u = this.uni(p.wall); gl.uniform1f(u.uMarch, this.small ? 0 : 1); gl.bindVertexArray(this.wallV); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.nWall); gl.disable(gl.CULL_FACE);
    u = this.uni(p.roof); gl.uniform1f(u.uDiffOn, this.diffOn); gl.bindVertexArray(this.roofV); gl.drawElements(gl.TRIANGLES, this.nRoof, gl.UNSIGNED_INT, 0);
    u = this.uni(p.box); gl.uniform1f(u.uMelt, 1); gl.uniform3fv(u.uCol, this.col.pl); gl.bindVertexArray(this.bridge.v); gl.drawArrays(gl.TRIANGLES, 0, this.bridge.n);
    if (this.walls) { gl.uniform1f(u.uMelt, 0); gl.uniform3fv(u.uCol, this.col.acc.map(v => Math.pow(v, 2.2))); gl.bindVertexArray(this.walls.v); gl.drawArrays(gl.TRIANGLES, 0, this.walls.n); }
    if (this.dots && this.nDot) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); u = this.uni(p.dot); gl.uniform1f(u.uPxM, this.pxM); gl.uniform1f(u.uDpr, this.dpr || 1); gl.uniform1f(u.uSz, 1); gl.bindVertexArray(this.dotV); gl.drawArrays(gl.POINTS, 0, this.nDot); gl.disable(gl.BLEND); }
    this.text(0, [5, 70]);
    // water
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.SRC_ALPHA, gl.ZERO, gl.ONE);
    u = this.uni(p.skirt); gl.bindVertexArray(this.empty); gl.enable(gl.CULL_FACE); for (let s = 0; s < 4; s++) { gl.uniform1i(u.uSide, s); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 1026); } gl.disable(gl.CULL_FACE);
    u = this.uni(p.water); gl.uniform2i(u.uGN, ...this.gn); gl.uniform1f(u.uStep, this.step); gl.uniform1f(u.uPx, this.cam.d / this.pxM); gl.bindVertexArray(this.gridV); gl.drawElements(gl.TRIANGLES, this.nGrid, gl.UNSIGNED_INT, 0);
    this.text(1, [7, 400]); if (this.hoods > 0) this.text(2, [this.small ? 6.5 : 7.5, 25]);
    if (this.rainAmt > 0) { gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.depthMask(false); u = this.uni(p.rain); gl.uniform4fv(u.uBr, this.rainFx); gl.uniform1f(u.uPxM, this.pxM); gl.uniform1f(u.uAmt, this.rainAmt); gl.uniform2f(u.uVPx, w / 2, h / 2); gl.bindVertexArray(this.empty); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.rainN || 120); gl.depthMask(true); }
    gl.disable(gl.BLEND);
  }
  text(k, fade) {
    const { gl, p } = this; if (!this.nTxt || !this.txtRange[k] || !this.txtRange[k][1]) return; gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.depthMask(false);
    const u = this.uni(p.txt); gl.uniform2f(u.uCam, this.right[0], this.right[1]); gl.uniform1f(u.uPxM, this.pxM / (this.dpr || 1)); gl.uniform2fv(u.uFade, fade); gl.uniform1f(u.uLift, k === 0 ? .0004 : 0); const c = k === 1 ? (this.dark ? [.80, .93, .95, .55] : [.96, 1, 1, .78]) : k === 2 ? [...this.col.ink, .80] : [...this.col.ink, .70]; gl.uniform4fv(u.uTc, c);
    gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, this.atlas); gl.uniform1i(u.uAtlas, 7); if (k === 2) gl.disable(gl.DEPTH_TEST); gl.bindVertexArray(this.txtV); const [s, n] = this.txtRange[k];
    gl.bindBuffer(gl.ARRAY_BUFFER, this.txtB);[[0, 4, 0], [1, 4, 16], [2, 3, 32]].forEach(([i, m, o]) => gl.vertexAttribPointer(i, m, gl.FLOAT, false, 44, o + s * 44)); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n); gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
  }
}
