// The world outside: New York as seen from an airliner window. Raw WebGL2.
// World frame: metres, x east, y north, z up, azimuthal-equidistant around 40.72 N 73.98 W.
import earcut from './vendor/earcut.js';
import { landmarkMesh, RUNWAYS } from './models.js';

const HEAD = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
`;
const COMMON = `
uniform mat4 uVP; uniform vec3 uEye; uniform vec3 uSun; uniform vec4 uTime; // uTime: day 0..1, dusk glow 0..1, night 0..1, seconds
uniform vec3 uHaze, uHazeSun, uZen, uSunCol, uAmb; uniform float uVis;
float hash(vec2 p){ p=fract(p*vec2(.1031,.1030)); p+=dot(p,p.yx+33.33); return fract((p.x+p.y)*p.x*1.17); }
vec2 hash2(vec2 p){ vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); q+=dot(q,q.yzx+33.33); return fract((q.xx+q.yz)*q.zy); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
vec3 skyCol(vec3 d){
  float e=max(d.z,0.); float m=max(dot(normalize(vec3(d.xy,0.)+1e-5),normalize(vec3(uSun.xy,0.)+1e-5)),0.);
  vec3 hz=mix(uHaze,uHazeSun,pow(m,3.)*.85);
  vec3 c=mix(hz,uZen,1.-exp(-e*4.2));
  float s=max(dot(d,uSun),0.); c+=uSunCol*(pow(s,700.)*1.2+pow(s,24.)*.10*(1.-uTime.z));
  return c; }
vec3 fog(vec3 c, vec3 rel){ float d=length(rel); vec3 v=rel/d; float f=1.-exp(-pow(d/uVis,1.25)); f*=mix(1.,.86,smoothstep(0.,1500.,uEye.z));
  float m=max(dot(normalize(vec3(v.xy,0.)+1e-5),normalize(vec3(uSun.xy,0.)+1e-5)),0.);
  return mix(c,mix(uHaze,uHazeSun,pow(m,3.)*.85),f); }
vec3 tone(vec3 c){ float l=dot(c,vec3(.3,.59,.11)); c=mix(vec3(l),c,1.14)*1.05; return pow(clamp(c,0.,1.),vec3(.95)); }
vec3 curve(vec3 p){ vec2 r=p.xy-uEye.xy; p.z-=dot(r,r)/(2.*7432000.); return p; } // earth curvature with standard refraction
`;
const GROUNDFN = `
uniform sampler2D tW, tG, tO;
uniform vec4 uRw[10];
float waterD(vec2 p){ vec2 u=p/65536.+.5; u.y=1.-u.y; return (texture(tW,u).r*255.-128.)/127.*192.; }
vec2 cover(vec2 p){ vec2 u=p/65536.+.5; u.y=1.-u.y; return texture(tG,u).rg; }
`;
const P = {};
P.sky = [`in vec2 a; out vec2 v; void main(){ v=a; gl_Position=vec4(a,.9999,1.); }`,
`in vec2 v; uniform vec3 uF,uR,uU; uniform vec2 uTan; out vec4 o; void main(){ vec3 d=normalize(uF+uR*v.x*uTan.x+uU*v.y*uTan.y); vec3 c=skyCol(d);
 if(d.z>.0){ vec2 q=d.xy/(d.z+.12)*1.3; float n=noise(q*vec2(1.2,3.1)+3.)*.55+noise(q*vec2(3.1,8.)+9.)*.3+noise(q*vec2(9.,21.))*.15; float k=smoothstep(.46,.86,n)*smoothstep(.02,.16,d.z)*.34*(1.-uTime.z*.8); c=mix(c,mix(uHaze,vec3(1.),.5)+uSunCol*.05,k); 
 if(uTime.z>.5){ vec2 s=floor(d.xy/(d.z+.2)*140.); float h=hash(s+7.); c+=vec3(.8)*step(.994,h)*smoothstep(.12,.4,d.z)*(uTime.z-.5)*fract(h*77.); } }
 o=vec4(tone(c),1.); }`];
P.ground = [`in vec2 a; uniform vec4 uGrid; uniform sampler2D tT; out vec3 vp; void main(){ vec2 p=uGrid.xy+a*uGrid.zw; float h=0.; vec2 u=p/81920.+.5; u.y=1.-u.y; if(u.x>0.&&u.x<1.&&u.y>0.&&u.y<1.) h=texture(tT,u).r*255.; vp=vec3(p,h); gl_Position=uVP*vec4(curve(vp)-uEye,1.); }`,
GROUNDFN + `in vec3 vp; out vec4 o;
vec3 land(vec2 p, vec2 cv, float px){
  float built=cv.x, tree=cv.y;
  vec3 grass=mix(vec3(.56,.58,.42),vec3(.64,.62,.46),noise(p/260.));
  vec3 wood=mix(vec3(.30,.37,.28),vec3(.41,.45,.31),noise(p/46.)); 
  float f1=1.-smoothstep(4.,16.,px); wood*=mix(1.,.80+.36*noise(p/8.),f1);
  vec3 c=mix(grass,wood,smoothstep(.12,.70,tree));
  // town: soft blocks, small roofs, trees between them
  float ang=floor(noise(p/5200.)*5.)*.42; mat2 R=mat2(cos(ang),-sin(ang),sin(ang),cos(ang)); vec2 q=R*p;
  vec2 bl=vec2(64.,150.); vec2 g=abs(fract(q/bl)-.5)*bl; float st=max(smoothstep(bl.x*.5-6.-px*.6,bl.x*.5-4.5,g.x),smoothstep(bl.y*.5-6.-px*.6,bl.y*.5-4.5,g.y));
  vec2 hc=floor(q/vec2(14.,17.)); float h=hash(hc); vec3 roof=mix(vec3(.62,.57,.53),vec3(.76,.73,.69),h); roof=mix(roof,vec3(.60,.48,.42),step(.82,fract(h*7.7))); roof=mix(roof,vec3(.86,.85,.83),step(.94,fract(h*13.)));
  float yard=step(.42,fract(h*31.)); vec3 lot=mix(roof,mix(vec3(.42,.48,.35),vec3(.53,.55,.42),noise(p/11.)),yard*.9*(1.-built*.75));
  vec3 town=mix(lot,vec3(.70,.685,.67),st*.8);
  vec3 avg=mix(vec3(.575,.565,.49),vec3(.675,.64,.60),built)*(.95+.10*noise(p/420.));
  town=mix(avg,town,(1.-smoothstep(4.,18.,px))*.72);
  c=mix(c,town,smoothstep(.10,.55,built)*(1.-smoothstep(.6,1.,tree)*.6));
  return c; }
void main(){ vec2 p=vp.xy; vec3 rel=curve(vp)-uEye; float d=length(rel); vec3 v=rel/d;
  float inr=step(max(abs(p.x),abs(p.y)),32000.); vec2 uo=p/163840.+.5; uo.y=1.-uo.y; vec3 ot=texture(tO,clamp(uo,0.,1.)).rgb;
  float m=inr>.5?waterD(p):(ot.r*255.-128.)*10.; vec2 cv=inr>.5?cover(p):ot.gb; 
  float px=max(length(dFdx(p)),length(dFdy(p))); float pxn=min(length(dFdx(p)),length(dFdy(p)));
  float aa=max(fwidth(m),1.); float lf=smoothstep(-aa,aa,m);
  vec3 c=vec3(0.); float spec=0.;
  if(lf>0.){ vec3 L=land(p,cv,max(pxn*2.,px*.35)); 
    float beach=1.-smoothstep(0.,40.,m); 
    for(int i=0;i<10;i++){ vec2 a=uRw[i].xy,b=uRw[i].zw-a; float t=clamp(dot(p-a,b)/dot(b,b),0.,1.); float dd=length(p-a-b*t); float L2=length(b);
      if(dd<900.){ float field=(1.-smoothstep(420.,900.,dd))*.75; vec3 fc=mix(vec3(.55,.56,.44),vec3(.60,.59,.56),step(.55,noise(p/190.))); L=mix(L,fc,field); }
      if(dd<220.&&dd>120.) L=mix(L,vec3(.52,.52,.51),.55*smoothstep(12.,9.,abs(dd-170.)-4.));
      float rw=1.-smoothstep(23.,23.+max(pxn,1.),dd); L=mix(L,vec3(.40,.40,.41),rw); float al=t*L2; float off=dot(p-a,vec2(-b.y,b.x)/L2);
      float ml=rw*(smoothstep(1.2+pxn*.5,.4,abs(off))*step(.4,fract(al/60.))+smoothstep(1.2,.5,abs(abs(off)-21.))+step(6.,al)*step(al,40.)*step(.5,fract(off/5.8))+step(400.,al)*step(al,446.)*step(abs(abs(off)-9.),3.)); L=mix(L,vec3(.86),clamp(ml,0.,1.)*(1.-smoothstep(1.,7.,pxn))); }
    vec3 light=uAmb+uSunCol*pow(max(uSun.z,0.),.55)*.92*uTime.x; vec3 day=L*light;
    // night: street lamps and glow
    float lit=smoothstep(.15,.7,cv.x); vec2 lc=floor(p/34.); vec2 lo=(hash2(lc)-.5)*.5; vec2 lp=abs(fract(p/34.)-.5-lo); float on=step(hash(lc+3.),lit*.85); float r=max(.05,pxn/34.*.8);
    float dot_=on*smoothstep(r,r*.3,length(lp))*min(1.,.11/r)*(1.-smoothstep(9.,30.,pxn)); vec3 warm=mix(vec3(1.,.72,.38),vec3(1.,.93,.80),step(.7,hash(lc+9.)));
    vec2 bq=abs(fract(p/vec2(210.,260.))-.5)*vec2(210.,260.); float av=max(smoothstep(105.-8.-pxn,105.-3.,bq.x),smoothstep(130.-8.-pxn,130.-3.,bq.y))*(1.-smoothstep(14.,60.,pxn));
    vec3 ni=warm*dot_*1.5+vec3(1.,.74,.42)*(lit*av*.60+lit*(.10+.30*pow(noise(p/330.),2.)+.09*noise(p/37.))); c=day+ni*uTime.z; }
  if(lf<1.){ float t=uTime.w; float hz=clamp(-v.z,0.,1.);
    float s1=noise(p/vec2(31.,23.)+t*.15)-.5, s2=noise(p/vec2(9.,7.)-t*.4)-.5, s3=noise(p/140.+t*.02)-.5; float near=1.-smoothstep(8.,60.,px);
    vec3 n=normalize(vec3(s1*.07*near+s3*.030+s2*.06*near*near,s2*.07*near+s1*.03-s3*.026,1.)); vec3 r=reflect(v,n); r.z=abs(r.z);
    float fr=.03+.97*pow(1.-max(dot(-v,n),0.),5.); fr=min(fr,.78);
    vec3 deep=mix(vec3(.17,.28,.33),vec3(.21,.32,.35),noise(p/900.))*(.14+uTime.x*.95); 
    float sh=smoothstep(-260.,0.,m); deep=mix(deep,deep*1.25+vec3(.02,.03,.015)*uTime.x,sh*.6);
    vec3 w=mix(deep,skyCol(r)*.94,fr); vec3 hh=normalize(uSun-v); float g=pow(max(dot(normalize(n+vec3(0,0,0)),hh),0.),mix(90.,420.,near)); w+=uSunCol*g*(.55+near*1.1)*step(0.,uSun.z)*(.25+.75*uTime.x);
    w+=vec3(1.,.72,.4)*.05*uTime.z*smoothstep(-400.,0.,m);
    c=mix(w,c,lf); }
  c=fog(c,rel); o=vec4(tone(c),1.); }`];
const FACE = `
vec3 wall(vec3 base, vec3 n, vec3 wp, float u, float h0, float top, float seed, float glass, vec3 rel){
  float d=length(rel); vec3 v=rel/d; float px=d*uPix; float z=wp.z-h0;
  vec3 c=base; float ao=mix(.74,1.,smoothstep(0.,min(45.,top-h0+6.),z));
  float roof=step(.5,n.z);
  // windows
  vec2 cell=vec2(3.4,3.7); vec2 q=vec2(u,z)/cell; vec2 f=fract(q); vec2 fw=vec2(px)/cell; float fade=1.-smoothstep(.35,1.1,max(fw.x,fw.y));
  float win=smoothstep(.14,.14+fw.x+.02,f.x)*smoothstep(.9,.9-fw.x-.02,f.x)*smoothstep(.22,.22+fw.y+.02,f.y)*smoothstep(.86,.86-fw.y-.02,f.y);
  float wid=mix(.50,.82,glass); win=mix(.46,win,fade); vec3 gl=mix(vec3(.18,.22,.26),skyCol(reflect(v,n)),.28+.45*glass);
  vec3 sunl=uSunCol*max(dot(n,uSun),0.)*uTime.x; vec3 amb=uAmb*(.82+.18*n.z)*ao; 
  vec3 lit=c*(amb+sunl*mix(.85,1.,ao)); lit=mix(lit,gl*(.35+.65*uTime.x)+c*sunl*.25,(1.-roof)*win*wid*.75);
  // big panels: faint floors seen from far
  float belt=step(.93,fract(z/37.+seed)); lit*=1.-.10*belt*(1.-roof);
  vec3 wc=mix(vec3(1.,.80,.50),vec3(.93,.95,1.),step(.62,hash(floor(q)+seed*91.+5.))); float on=step(.60+.22*hash(vec2(seed*57.,floor(q.y))),hash(floor(q)+seed*37.));
  vec3 em=wc*(1.-roof)*mix(.34+.42*hash(vec2(seed,3.))*mix(1.,.55,step(.5,fract(seed*17.))),on*win*1.35+.05,fade)*mix(.35+1.5*step(.62,hash(floor(q/vec2(3.,2.))+seed*13.))*fract(hash(floor(q/vec2(3.,2.))+seed*5.)*7.),1.,max(fade,1.-smoothstep(1.2,.5,max(fw.x,fw.y)*.22)))*uTime.z*(.8+.35*smoothstep(60.,220.,top-h0)+.6*smoothstep(top-22.,top-4.,wp.z)*step(150.,top-h0)); return lit*mix(1.,.5,uTime.z*.0)+em; }
vec3 tint(float kind,float s,float h){ vec3 c;
  if(kind<.5){ c=mix(vec3(.74,.67,.58),vec3(.60,.45,.38),step(.55,s)); c=mix(c,vec3(.78,.75,.70),step(.82,s)); if(h>110.) c=mix(mix(vec3(.80,.76,.68),vec3(.70,.66,.60),fract(s*5.)),vec3(.52,.60,.66),step(.52,fract(s*9.))); else if(h>50.) c=mix(vec3(.76,.70,.61),vec3(.66,.56,.49),fract(s*7.)); }
  else if(kind<1.5){ c=mix(vec3(.66,.52,.44),vec3(.74,.69,.62),fract(s*3.)); c=mix(c,vec3(.60,.64,.67),step(.86,s)); if(h>75.) c=mix(vec3(.55,.62,.67),vec3(.75,.72,.67),step(.5,fract(s*9.))); }
  else { c=mix(vec3(.70,.62,.55),vec3(.62,.64,.65),step(.5,s)); if(h>60.) c=mix(vec3(.50,.59,.66),vec3(.68,.70,.70),fract(s*9.)); }
  return mix(c,vec3(.90,.88,.85),.26); }
`;
P.box = [`in vec3 a; in vec3 an; in vec2 iP; in vec2 iS; in float iA; in float iB; in float iH; in float iK; out vec3 vw,vn; out vec4 vm; out float vu; 
void main(){ float ang=iA/256.*3.14159265; vec2 c=vec2(cos(ang),sin(ang)); vec2 l=a.xy*iS; vec2 p=iP+vec2(c.x*l.x-c.y*l.y,c.y*l.x+c.x*l.y); vec3 w=vec3(p,iB-2.+a.z*(iH+2.)); vn=vec3(c.x*an.x-c.y*an.y,c.y*an.x+c.x*an.y,an.z); vw=w; vu=abs(an.x)>.5?l.y+iS.y:l.x+iS.x; float s=fract(sin(dot(iP,vec2(12.9898,78.233)))*43758.5453); vm=vec4(iB,iB+iH,s,iK); gl_Position=uVP*vec4(curve(w)-uEye,1.); }`,
`uniform float uPix;` + FACE + `in vec3 vw,vn; in vec4 vm; in float vu; out vec4 o; void main(){ vec3 rel=curve(vw)-uEye; vec3 b=tint(vm.w,vm.z,vm.y-vm.x); if(vn.z>.5){ b=mix(vec3(.56,.54,.52),vec3(.74,.72,.69),vm.z); }
 vec3 c=wall(b,normalize(vn),vw,vu,vm.x,vm.y,vm.z,0.,rel); o=vec4(tone(fog(c,rel)),1.); }`];
P.wall = [`in vec2 a; in vec4 iE; in vec4 iM; out vec3 vw,vn; out vec4 vm; out float vu; void main(){ vec2 p=mix(iE.xy,iE.zw,a.x); vec2 d=iE.zw-iE.xy; float L=length(d); vn=vec3(d.y,-d.x,0.)/max(L,.01); vec3 w=vec3(p,mix(iM.x-2.,iM.y,a.y)); vw=w; vu=a.x*L; vm=vec4(iM.x,iM.y,iM.w,iM.z); gl_Position=uVP*vec4(curve(w)-uEye,1.); }`,
`uniform float uPix;` + FACE + `in vec3 vw,vn; in vec4 vm; in float vu; out vec4 o; void main(){ vec3 rel=curve(vw)-uEye; float h=vm.y-vm.x; vec3 b=tint(vm.w,vm.z,h); float gl=step(.3,b.b-b.r+.28)*step(60.,h); vec3 c=wall(b,normalize(vn),vw,vu,vm.x,vm.y,vm.z,gl,rel); o=vec4(tone(fog(c,rel)),1.); }`];
P.roof = [`in vec3 a; in float ak; out vec3 vw; out float vk; void main(){ vw=a; vk=ak; gl_Position=uVP*vec4(curve(a)-uEye,1.); }`,
`in vec3 vw; in float vk; out vec4 o; void main(){ vec3 rel=curve(vw)-uEye; vec3 b=mix(vec3(.55,.53,.51),vec3(.76,.73,.69),vk); vec3 c=b*(uAmb+uSunCol*max(uSun.z,0.)*uTime.x); o=vec4(tone(fog(c,rel)),1.); }`];
P.mesh = [`in vec3 a; in vec3 an; in vec4 ac; out vec3 vw,vn; out vec4 vc; void main(){ vw=a; vn=an; vc=ac; gl_Position=uVP*vec4(curve(a)-uEye,1.); }`,
`in vec3 vw,vn; in vec4 vc; out vec4 o; void main(){ vec3 rel=curve(vw)-uEye; vec3 n=normalize(vn); if(dot(n,rel)>0.) n=-n; vec3 c=vc.rgb*(uAmb*(.65+.35*n.z)+uSunCol*max(dot(n,uSun),0.)*uTime.x)+vc.rgb*vc.a*uTime.z; if(vc.a>.5) c+=vec3(1.,.86,.6)*uTime.z*.5; o=vec4(tone(fog(c,rel)),1.); }`];
P.house = [GROUNDFN + `uniform sampler2D tT; in vec3 a; in vec3 an; uniform vec3 uHg; uniform int uN; out vec3 vw,vn; out vec3 vm; 
void main(){ ivec2 id=ivec2(gl_InstanceID%uN,gl_InstanceID/uN); vec2 cell=floor(uEye.xy/uHg.x)+vec2(id)-float(uN/2); vec2 h=hash2(cell+.5); vec2 p=(cell+.5+(h-.5)*.7)*uHg.x; vec2 cv=cover(p); float wd=waterD(p); float r=length(p-uEye.xy);
 float edge=smoothstep(uHg.y,uHg.y*.55,r); float keep=step(hash(cell+11.),cv.x*.92)*step(26.,wd)*step(hash(cell+23.)*.98+.01,edge); for(int i=0;i<10;i++){ vec2 q=uRw[i].xy,b=uRw[i].zw-q; float t=clamp(dot(p-q,b)/dot(b,b),0.,1.); if(length(p-q-b*t)<520.) keep=0.; }
 float dense=smoothstep(.72,.92,cv.x); float big=step(.95,h.x)*step(.75,cv.x); vec2 s=mix(mix(vec2(8.5,11.)+h*3.,vec2(11.,15.)+h*2.,dense),vec2(22.,26.),big); float H=mix(mix(6.+h.y*3.,8.5+h.y*3.,dense),11.,big)*keep; float flat_=max(step(.5,dense),big); float ang=floor(noise(p/5200.)*5.)*.42; vec2 l=a.xy*s; vec2 c=vec2(cos(ang),-sin(ang)); vec2 w=p+vec2(c.x*l.x-c.y*l.y,c.y*l.x+c.x*l.y); vec2 u=p/81920.+.5; u.y=1.-u.y; float g=texture(tT,u).r*255.; float az=mix(a.z,min(a.z,.63),flat_); vw=vec3(w,g-1.+az*(H+1.)); if(keep<.5) vw=vec3(p,g-40.); vn=vec3(c.x*an.x-c.y*an.y,c.y*an.x+c.x*an.y,an.z); if(flat_>.5&&an.z>.5) vn=vec3(0.,0.,1.); vm=vec3(h,a.z); gl_Position=uVP*vec4(curve(vw)-uEye,1.); }`,
`in vec3 vw,vn,vm; out vec4 o; void main(){ vec3 rel=curve(vw)-uEye; vec3 b=mix(vec3(.78,.74,.69),vec3(.88,.86,.83),vm.x); if(vn.z>.3) b=mix(vec3(.60,.56,.54),vec3(.74,.67,.62),vm.y); vec3 c=b*(uAmb*(.85+.15*vn.z)*mix(.8,1.,vm.z)+uSunCol*max(dot(vn,uSun),0.)*uTime.x); c+=vec3(1.,.75,.45)*(.10+.5*step(.72,vm.x)*step(vn.z,.3))*uTime.z; o=vec4(tone(fog(c,rel)),1.); }`];
P.wing = [`in vec3 a; in vec3 an; in float ac; uniform mat4 uW; uniform float uFlip; out vec3 vn; out float vc; out vec3 vp; void main(){ vec3 p=a; p.y*=uFlip; vn=an; vn.y*=uFlip; vc=ac; vp=p; gl_Position=uW*vec4(p,1.); }`,
`in vec3 vn; in float vc; in vec3 vp; uniform vec3 uSunP; out vec4 o; void main(){ vec3 n=normalize(vn); vec3 b=vc<.5?vec3(.80,.82,.84):vc<1.5?vec3(.60,.63,.66):vc<2.5?vec3(.9,.13,.10):vc<3.5?vec3(.10,.72,.32):vec3(.30,.33,.36); vec3 c=b*(uAmb*(.72+.28*n.z)+uSunCol*max(dot(n,uSunP),0.)*uTime.x*.9); if(vc>1.5&&vc<3.5) c=b*(.8+.9*uTime.z); c+=uHaze*.10*pow(1.-abs(n.z),2.); o=vec4(tone(c),1.); }`];

const m4 = { persp(fy, as, n, f) { const t = 1 / Math.tan(fy / 2); return [t / as, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; },
  mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; } };
const V = { add: (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm(a) { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; } };
export { m4, V };

// camera of a seat: plane {x,y,z,h(deg),bank(deg, + = right wing down),pitch}; side 'L'|'R'; yaw: + looks forward; tilt: + looks up (deg)
export function seatCamera(pl, side, yaw = 0, tilt = -4, fovy = 32, aspect = .72, wingYaw = -24) {
  const r = Math.PI / 180, h = pl.h * r, p = (pl.pitch || 0) * r, b = (pl.bank || 0) * r * .45;
  const F0 = [Math.sin(h) * Math.cos(p), Math.cos(h) * Math.cos(p), Math.sin(p)], R0 = [Math.cos(h), -Math.sin(h), 0], U0 = V.cross(R0, F0);
  const U = V.norm(V.add([U0[0] * Math.cos(b), U0[1] * Math.cos(b), U0[2] * Math.cos(b)], R0, Math.sin(b))), Rr = V.norm(V.cross(F0, U));
  const s = side === 'L' ? -1 : 1, S = [Rr[0] * s, Rr[1] * s, Rr[2] * s], cy = Math.cos(yaw * r), sy = Math.sin(yaw * r);
  // people level their eyes a little: half of the bank is felt
  let f = V.norm([S[0] * cy + F0[0] * sy, S[1] * cy + F0[1] * sy, S[2] * cy + F0[2] * sy]);
  let right = V.norm(V.cross(f, U)), up = V.cross(right, f); f = V.norm(V.add([f[0] * Math.cos(tilt * r), f[1] * Math.cos(tilt * r), f[2] * Math.cos(tilt * r)], up, Math.sin(tilt * r))); up = V.cross(right, f);
  const wy = yaw * .06 + wingYaw, wt = tilt * .25, cw = Math.cos(wy * r), sw = Math.sin(wy * r); let wfv = V.norm([S[0] * cw + F0[0] * sw, S[1] * cw + F0[1] * sw, S[2] * cw + F0[2] * sw]); const wr = V.norm(V.cross(wfv, U)); let wu = V.cross(wr, wfv); wfv = V.norm(V.add(wfv.map(v => v * Math.cos(wt * r)), wu, Math.sin(wt * r))); wu = V.cross(wr, wfv);
  return { wingView: [wr[0], wu[0], -wfv[0], 0, wr[1], wu[1], -wfv[1], 0, wr[2], wu[2], -wfv[2], 0, 0, 0, 0, 1], eye: [pl.x, pl.y, pl.z], F: f, R: right, U: up, fovy: fovy * r, aspect, body: { F: F0, R: Rr, U }, side };
}
export function project(cam, p) { // -> ndc x,y and depth (metres); curvature included
  const d = [p[0] - cam.eye[0], p[1] - cam.eye[1], p[2] - cam.eye[2]]; d[2] -= (d[0] * d[0] + d[1] * d[1]) / (2 * 7432000);
  const z = V.dot(d, cam.F), t = Math.tan(cam.fovy / 2); return { x: V.dot(d, cam.R) / z / t / cam.aspect, y: V.dot(d, cam.U) / z / t, z };
}

export class World {
  constructor(gl) { this.gl = gl; this.pr = {}; this.ready = false; this.lowDetail = false;
    for (const k in P) this.pr[k] = this.program(P[k][0], P[k][1]);
    const b = (a, t = gl.ARRAY_BUFFER) => { const x = gl.createBuffer(); gl.bindBuffer(t, x); gl.bufferData(t, a, gl.STATIC_DRAW); return x; }; this.buf = b;
    this.quad = b(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])); this.unit = b(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]));
    // open-bottom cube
    const c = [], ix = []; for (const [n, u, v] of [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, -1, 0], [0, 0, 1]], [[0, 1, 0], [-1, 0, 0], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]]]) { const o = c.length / 6; for (const [s, t] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = [0, 1, 2].map(k => (n[k] + u[k] * s + v[k] * t) * .5); if (n[2]) p[2] = .5; c.push(p[0], p[1], p[2] + .5, ...n); } ix.push(o, o + 1, o + 2, o, o + 2, o + 3); }
    this.cube = b(new Float32Array(c));
    { const h = [], q = (a, b2, c2, d, n) => { for (const p of [a, b2, c2, a, c2, d]) h.push(...p, ...n); }, e = .62, x = .5; q([x, -.5, 0], [x, .5, 0], [x, .5, e], [x, -.5, e], [1, 0, 0]); q([-x, .5, 0], [-x, -.5, 0], [-x, -.5, e], [-x, .5, e], [-1, 0, 0]); q([x, .5, 0], [-x, .5, 0], [-x, .5, e], [x, .5, e], [0, 1, 0]); q([-x, -.5, 0], [x, -.5, 0], [x, -.5, e], [-x, -.5, e], [0, -1, 0]); q([-.55, -.55, e], [.55, -.55, e], [.55, 0, 1], [-.55, 0, 1], [0, -.55, .83]); q([.55, .55, e], [-.55, .55, e], [-.55, 0, 1], [.55, 0, 1], [0, .55, .83]); this.houseB = b(new Float32Array(h)); this.houseN = h.length / 6; } this.cubeI = b(new Uint16Array(ix), gl.ELEMENT_ARRAY_BUFFER); this.vaos = {};
    this.mkGrid(); this.mkWing(); this.mkLandmarks();
  }
  program(vs, fs) { const gl = this.gl, mk = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, HEAD + COMMON + s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) + '\n' + s.slice(0, 200)); return x; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, a = {}; for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const q = gl.getActiveUniform(p, i).name; u[q.replace('[0]', '')] = gl.getUniformLocation(p, q); } for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i < n; i++) { const q = gl.getActiveAttrib(p, i).name; a[q] = gl.getAttribLocation(p, q); } return { p, u, a }; }
  mkGrid() { const n = 160, v = new Float32Array((n + 1) * (n + 1) * 2), ix = new Uint16Array(n * n * 6); let k = 0; for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { v[k++] = i / n; v[k++] = j / n; } k = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i; ix.set([a, a + 1, a + n + 2, a, a + n + 2, a + n + 1], k); k += 6; } this.grid = { v: this.buf(v), i: this.buf(ix, this.gl.ELEMENT_ARRAY_BUFFER), n: ix.length }; }
  mkWing() { // aeroplane frame, metres: x forward, y right(+)/left mirrored by uFlip, z up. Seat eye at the origin; the wing is ahead of the seat.
    const v = [], A = (p, n, c) => v.push(...p, ...n, c); const sec = []; // span stations: y, leading edge x, trailing edge x, z, thickness
    for (const [y, le, te, z, t] of [[1.6, 9.2, 2.6, -1.5, .75], [4.2, 7.6, 2.0, -1.28, .5], [8.5, 4.7, 1.0, -.85, .34], [12.8, 1.85, -.35, -.4, .24], [15.4, .1, -1.35, -.1, .16]]) sec.push({ y, le, te, z, t });
    const foil = s => { const o = []; for (let k = 0; k <= 10; k++) { const u = k / 10, x = s.le + (s.te - s.le) * u, th = s.t * (1.48 * Math.sqrt(u) - .63 * u - 1.76 * u * u + 1.42 * u ** 3 - .51 * u ** 4) * 1.3; o.push([x, s.y, s.z + th * .75 - (u > .72 ? (u - .72) * (u - .72) * (s.y < 11 ? 2.4 : .4) : 0)]); } return o; };
    const quad = (a, b, c, d, col) => { const n = V.norm(V.cross(V.add(b, a, -1), V.add(d, a, -1))); if (n[2] < 0) { n[0] *= -1; n[1] *= -1; n[2] *= -1; } for (const q of [a, b, c, a, c, d]) A(q, n, col); };
    const top = sec.map(foil); for (let i = 0; i < top.length - 1; i++) for (let k = 0; k < 10; k++) quad(top[i][k], top[i + 1][k], top[i + 1][k + 1], top[i][k + 1], k === 0 ? 1 : k === 7 ? 4 * 0 + 1 : 0);
    // winglet, blended
    const e = sec[4]; let pr = [[e.le, e.y, e.z + .03], [e.te, e.y, e.z]]; for (const [y, z, le, te] of [[15.75, .05, -.35, -1.5], [15.98, .45, -.8, -1.75], [16.10, .95, -1.25, -2.05], [16.2, 1.75, -2.0, -2.5]]) { const q = [[le, y, z], [te, y, z]]; const n = V.norm([.1, -.8, .6]); for (const p of [pr[0], q[0], q[1], pr[0], q[1], pr[1]]) A(p, n, 0); pr = q; }
    const lamp = (x, y, z, r, c) => { for (const n of [[0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, -1, 0]]) { const t = Math.abs(n[2]) ? [1, 0, 0] : [0, 0, 1], b = V.cross(n, t), p = V.add([x, y, z], n, r); const P = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, q]) => V.add(V.add(p, t, s * r), b, q * r)); for (const k of [0, 1, 2, 0, 2, 3]) A(P[k], n, c); } }; lamp(.08, 15.52, .0, .032, 2);
    for (const y of [4.6, 7.6, 10.6]) { const s = sec[1], t = sec[3], f = (y - s.y) / (t.y - s.y), te = s.te + (t.te - s.te) * f, z = s.z + (t.z - s.z) * f; quad([te + 1.1, y - .12, z + .12], [te + 1.1, y + .12, z + .12], [te - .75, y + .06, z - .22], [te - .75, y - .06, z - .22], 1); }
    this.wing = { v: this.buf(new Float32Array(v)), n: v.length / 7 }; }
  mkLandmarks() { const m = landmarkMesh(); this.lm = { v: this.buf(m), n: m.length / 10 }; }
  tex(img, opt = {}) { const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); if (opt.mip) gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opt.mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); const an = opt.mip && gl.getExtension('EXT_texture_filter_anisotropic'); if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, 8); return t; }
  async load(base, step = () => { }) {
    const img = async n => { const r = await fetch(base + n); if (!r.ok) throw new Error(n); return createImageBitmap(await r.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }); };
    const bin = async n => { const r = await fetch(base + n); if (!r.ok) throw new Error(n); let u = new Uint8Array(await r.arrayBuffer()); if (u[0] === 31 && u[1] === 139) u = new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); return u; };
    const [w, g, o, t] = await Promise.all([img('w.webp'), img('gb.webp'), img('o.webp'), img('terrain.png')]); this.tW = this.tex(w, { mip: 1 }); this.tG = this.tex(g, { mip: 1 }); this.tO = this.tex(o, { mip: 1 }); this.tT = this.tex(t); this.ready = true; step('ground');
    this.boxes(await bin('box.bin')); step('box'); this.polys(await bin('pol.bin')); step('pol'); this.full = true;
  }
  boxes(u8) { const dv = new DataView(u8.buffer, u8.byteOffset), n = dv.getUint32(0, true), gl = this.gl; let o = 4; const rd = (sz, f) => { const a = new Int32Array(n); for (let i = 0; i < n; i++, o += sz) a[i] = f(o); return a; }; const X = rd(2, p => dv.getInt16(p, true)), Y = rd(2, p => dv.getInt16(p, true)), [W, D, A, B, H, K] = [0, 0, 0, 0, 0, 0].map(() => rd(1, p => dv.getUint8(p)));
    const T = 2048, key = i => Math.floor((X[i] + 32768) / T) * 64 + Math.floor((Y[i] + 32768) / T), ord = [...Array(n).keys()].sort((a, b) => key(a) - key(b) || H[b] - H[a]); const ab = new ArrayBuffer(n * 12), v = new DataView(ab); this.boxT = []; let cur = null;
    ord.forEach((i, k) => { const p = k * 12; v.setInt16(p, X[i], true); v.setInt16(p + 2, Y[i], true); v.setUint8(p + 4, W[i]); v.setUint8(p + 5, D[i]); v.setUint8(p + 6, A[i]); v.setUint8(p + 7, B[i]); v.setUint8(p + 8, H[i]); v.setUint8(p + 9, K[i]); const q = key(i); if (!cur || cur.q !== q) { cur = { q, s: k, n: 0, tall: 0, x: (Math.floor(q / 64) + .5) * T - 32768, y: (q % 64 + .5) * T - 32768, r: T * .72 + 120, h: 0 }; this.boxT.push(cur); } cur.n++; if (H[i] > 24) cur.tall++; cur.h = Math.max(cur.h, H[i] + B[i]); });
    this.boxB = this.buf(new Uint8Array(ab)); this.nBox = n; }
  polys(u8) { let i = 0; const u = () => { let v = 0, m = 1, b; do { b = u8[i++]; v += (b & 127) * m; m *= 128; } while (b > 127); return v; }, s = () => { const v = u(); return v & 1 ? -(v + 1) / 2 : v / 2; }; const n = new DataView(u8.buffer, u8.byteOffset).getUint32(0, true); i = 4; let px = 0, py = 0; const P = [];
    for (let k = 0; k < n; k++) { const c = s(), kind = s(), base = s(), top = s() / 2, r = new Float32Array(c * 2); for (let j = 0; j < c; j++) { px += s(); py += s(); r[j * 2] = px / 2; r[j * 2 + 1] = py / 2; } P.push({ r, kind, base, top, q: Math.floor((r[0] + 32768) / 2048) * 64 + Math.floor((r[1] + 32768) / 2048) }); }
    P.sort((a, b) => a.q - b.q); this.polyList = P; let ne = 0, nv = 0; for (const p of P) { ne += p.r.length / 2; nv += p.r.length / 2; } const E = new Float32Array(ne * 8), R = new Float32Array(nv * 4), I = []; let e = 0, v = 0; this.polT = []; let cur = null;
    for (const p of P) { const c = p.r.length / 2, seed = Math.abs(Math.sin(Math.round(p.r[0] / 60) * 12.9898 + Math.round(p.r[1] / 60) * 78.233) * 43758.5453) % 1; if (!cur || cur.q !== p.q) { cur = { q: p.q, s: e, n: 0, rs: I.length, rn: 0, x: (Math.floor(p.q / 64) + .5) * 2048 - 32768, y: (p.q % 64 + .5) * 2048 - 32768, r: 1600, h: 0 }; this.polT.push(cur); } cur.h = Math.max(cur.h, p.top);
      for (let j = 0; j < c; j++) { const a = j * 2, b = (j + 1) % c * 2; E.set([p.r[a], p.r[a + 1], p.r[b], p.r[b + 1], p.base, p.top, p.kind, seed], e * 8); e++; cur.n++; R.set([p.r[a], p.r[a + 1], p.top, seed], (v + j) * 4); } for (const t of earcut(p.r, null, 2)) { I.push(v + t); cur.rn++; } v += c; }
    this.edgeB = this.buf(E); this.roofB = this.buf(R); this.roofI = this.buf(new Uint32Array(I), this.gl.ELEMENT_ARRAY_BUFFER); }
  attr(pr, name, buf, n, type, stride, off, div = 0, norm = false) { const gl = this.gl, l = pr.a[name]; if (l === undefined || l < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, type, norm, stride, off); gl.vertexAttribDivisor(l, div); this.used.push(l); }
  clearAttr() { const gl = this.gl; for (const l of this.used) { gl.vertexAttribDivisor(l, 0); gl.disableVertexAttribArray(l); } this.used = []; }
  // rect in device pixels (origin bottom-left)
  draw(cam, rect, env, opt = {}) {
    const gl = this.gl; this.used = this.used || []; gl.viewport(...rect); gl.scissor(...rect); gl.enable(gl.SCISSOR_TEST); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT);
    const pm = m4.persp(cam.fovy, cam.aspect, 12, 160000), { F, R, U } = cam, vm = [R[0], U[0], -F[0], 0, R[1], U[1], -F[1], 0, R[2], U[2], -F[2], 0, 0, 0, 0, 1], vp = m4.mul(pm, vm), tan = Math.tan(cam.fovy / 2);
    const use = k => { const p = this.pr[k]; gl.useProgram(p.p); const u = p.u; u.uVP && gl.uniformMatrix4fv(u.uVP, false, vp); u.uEye && gl.uniform3fv(u.uEye, cam.eye); u.uSun && gl.uniform3fv(u.uSun, env.sun); u.uTime && gl.uniform4f(u.uTime, env.day, env.dusk, env.night, env.t || 0); for (const [n, v] of [['uHaze', env.haze], ['uHazeSun', env.hazeSun], ['uZen', env.zen], ['uSunCol', env.sunCol], ['uAmb', env.amb]]) u[n] && gl.uniform3fv(u[n], v); u.uVis && gl.uniform1f(u.uVis, env.vis); u.uPix && gl.uniform1f(u.uPix, 2 * tan / rect[3]);
      const T = [['tW', this.tW], ['tG', this.tG], ['tO', this.tO], ['tT', this.tT]]; T.forEach(([n, t], i) => { if (u[n]) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(u[n], i); } }); u.uRw && gl.uniform4fv(u.uRw, RUNWAYS); return p; };
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    let p = use('sky'); gl.uniform3fv(p.u.uF, F); gl.uniform3fv(p.u.uR, R); gl.uniform3fv(p.u.uU, U); gl.uniform2f(p.u.uTan, tan * cam.aspect, tan); this.attr(p, 'a', this.quad, 2, gl.FLOAT, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); this.clearAttr();
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    if (this.ready) {
      p = use('ground'); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.grid.i); this.attr(p, 'a', this.grid.v, 2, gl.FLOAT, 0, 0); for (const g of [[-240000, -240000, 480000, 480000], [-40960, -40960, 81920, 81920]]) { if (g[2] > 1e5) { gl.uniform4f(p.u.uGrid, ...g); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(6, 60); gl.depthMask(false); gl.drawElements(gl.TRIANGLES, this.grid.n, gl.UNSIGNED_SHORT, 0); gl.depthMask(true); gl.disable(gl.POLYGON_OFFSET_FILL); } else { gl.uniform4f(p.u.uGrid, ...g); gl.drawElements(gl.TRIANGLES, this.grid.n, gl.UNSIGNED_SHORT, 0); } } this.clearAttr();
      // which tiles can be seen
      const as = cam.aspect, hx = Math.hypot(1, tan * as), hy = Math.hypot(1, tan), vis = t => { const d = [t.x - cam.eye[0], t.y - cam.eye[1], t.h / 2 - cam.eye[2]], z = V.dot(d, F), r = t.r + t.h / 2; if (z < -r) return -1; const x = V.dot(d, R), y = V.dot(d, U); if (Math.abs(x) - z * tan * as > r * hx || Math.abs(y) - z * tan > r * hy) return -1; return Math.max(1, Math.hypot(d[0], d[1]) - t.r); };
      const far = opt.low ? 26000 : 38000;
      if (this.polT) { p = use('wall'); this.attr(p, 'a', this.unit, 2, gl.FLOAT, 0, 0); for (const t of this.polT) { const d = vis(t); if (d < 0 || d > far + 8000) continue; this.attr(p, 'iE', this.edgeB, 4, gl.FLOAT, 32, t.s * 32, 1); this.attr(p, 'iM', this.edgeB, 4, gl.FLOAT, 32, t.s * 32 + 16, 1); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, t.n); } this.clearAttr();
        p = use('roof'); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.roofI); this.attr(p, 'a', this.roofB, 3, gl.FLOAT, 16, 0); this.attr(p, 'ak', this.roofB, 1, gl.FLOAT, 16, 12); for (const t of this.polT) { const d = vis(t); if (d < 0 || d > far) continue; gl.drawElements(gl.TRIANGLES, t.rn, gl.UNSIGNED_INT, t.rs * 4); } this.clearAttr(); }
      if (this.boxT) { p = use('box'); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeI); this.attr(p, 'a', this.cube, 3, gl.FLOAT, 24, 0); this.attr(p, 'an', this.cube, 3, gl.FLOAT, 24, 12); for (const t of this.boxT) { const d = vis(t); if (d < 0 || d > far) continue; const n = d > (opt.low ? 9000 : 16000) ? t.tall : t.n; if (!n) continue; const o = t.s * 12, B = this.boxB, g = gl; this.attr(p, 'iP', B, 2, g.SHORT, 12, o, 1); this.attr(p, 'iS', B, 2, g.UNSIGNED_BYTE, 12, o + 4, 1); this.attr(p, 'iA', B, 1, g.UNSIGNED_BYTE, 12, o + 6, 1); this.attr(p, 'iB', B, 1, g.UNSIGNED_BYTE, 12, o + 7, 1); this.attr(p, 'iH', B, 1, g.UNSIGNED_BYTE, 12, o + 8, 1); this.attr(p, 'iK', B, 1, g.UNSIGNED_BYTE, 12, o + 9, 1); gl.drawElementsInstanced(gl.TRIANGLES, 30, gl.UNSIGNED_SHORT, 0, n); } this.clearAttr(); }
      p = use('mesh'); this.attr(p, 'a', this.lm.v, 3, gl.FLOAT, 40, 0); this.attr(p, 'an', this.lm.v, 3, gl.FLOAT, 40, 12); this.attr(p, 'ac', this.lm.v, 4, gl.FLOAT, 40, 24); gl.drawArrays(gl.TRIANGLES, 0, this.lm.n); this.clearAttr();
      if (cam.eye[2] < 700) { const N = opt.low ? 96 : 150; p = use('house'); gl.uniform3f(p.u.uHg, 19, 19 * N * .48, 0); gl.uniform1i(p.u.uN, N); this.attr(p, 'a', this.houseB, 3, gl.FLOAT, 24, 0); this.attr(p, 'an', this.houseB, 3, gl.FLOAT, 24, 12); gl.drawArraysInstanced(gl.TRIANGLES, 0, this.houseN, N * N); this.clearAttr(); }
    }
    if (opt.wing) { gl.clear(gl.DEPTH_BUFFER_BIT); p = use('wing'); const b = cam.body, s = cam.side === 'L' ? -1 : 1, E = opt.wing; // seat offset: E.x metres behind the wing root reference
      const mod = [b.F[0], b.F[1], b.F[2], 0, b.R[0], b.R[1], b.R[2], 0, b.U[0], b.U[1], b.U[2], 0, 0, 0, 0, 1], tr = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, E.x, 0, E.z, 1];
      const wf = cam.wingView || vm; gl.uniformMatrix4fv(p.u.uW, false, m4.mul(m4.mul(m4.mul(m4.persp((E.fov || 33) * Math.PI / 180, cam.aspect, .5, 60), wf), mod), tr)); gl.uniform1f(p.u.uFlip, s); p.u.uSunP && gl.uniform3f(p.u.uSunP, V.dot(env.sun, b.F), V.dot(env.sun, b.R), V.dot(env.sun, b.U));
      this.attr(p, 'a', this.wing.v, 3, gl.FLOAT, 28, 0); this.attr(p, 'an', this.wing.v, 3, gl.FLOAT, 28, 12); this.attr(p, 'ac', this.wing.v, 1, gl.FLOAT, 28, 24); gl.drawArrays(gl.TRIANGLES, 0, this.wing.n); this.clearAttr(); }
    gl.disable(gl.SCISSOR_TEST);
  }
}
// light of the moment from the sun's height (degrees) and azimuth
export function light(az, alt, t = 0) {
  const r = Math.PI / 180, sun = [Math.sin(az * r) * Math.cos(alt * r), Math.cos(az * r) * Math.cos(alt * r), Math.sin(alt * r)], sm = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }, mx = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const day = sm(-5, 7, alt), night = 1 - sm(-9, -1, alt), low = sm(26, 2, alt), dusk = Math.max(0, 1 - Math.abs(alt + 1) / 10);
  let sunCol = mx([.70, .63, .52], [.92, .61, .36], low); sunCol = sunCol.map(v => v * sm(-1.4, 5, alt));
  let amb = mx([.035, .045, .075], mx([.50, .555, .63], [.52, .515, .56], low), sm(-9, 9, alt));
  let zen = mx([.010, .018, .045], mx([.27, .47, .70], [.30, .44, .68], low), sm(-11, 6, alt)), haze = mx([.050, .065, .105], mx([.76, .84, .90], [.80, .79, .82], low), sm(-10, 5, alt)), hazeSun = mx(haze, mx([.90, .90, .88], [1.0, .74, .50], low), sm(-10, 1, alt));
  // blue hour: warm band on the sun's side
  hazeSun = hazeSun.map((v, i) => v + [.30, .12, .06][i] * Math.max(0, 1 - Math.abs(alt + 4) / 6));
  return { sun, day, night, dusk, sunCol, amb, zen, haze, hazeSun, vis: 27000, t };
}
