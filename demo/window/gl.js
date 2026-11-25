// Raw WebGL2: the city (walls instanced, roofs triangles), sun shadow maps, the room (one analytic shader), lines in space.
const R = Math.PI / 180;
export const ROOM = { w: 4.6, d: 6.9, h: 2.8, ww: 2.3, sill: .5, top: 2.45, thick: .2, chair: [1.42, -2.15] }; // metres; window half width ww/2
const V3 = { sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm: a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); } };
export function look(eye, at, up = [0, 0, 1]) { const z = V3.norm(V3.sub(eye, at)), x = V3.norm(V3.cross(up, z)), y = V3.cross(z, x); return { x, y, z, eye, m: [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -V3.dot(x, eye), -V3.dot(y, eye), -V3.dot(z, eye), 1] }; }
export function persp(fy, asp, n, f) { const t = 1 / Math.tan(fy / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, -(f + n) / (f - n), -1, 0, 0, -2 * f * n / (f - n), 0]; }
export function ortho(r, n, f) { return [1 / r, 0, 0, 0, 0, 1 / r, 0, 0, 0, 0, -2 / (f - n), 0, 0, 0, -(f + n) / (f - n), 1]; }
export function mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; }
export const proj = (m, p) => { const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15]; return [(m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / w, (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / w, w]; };

const COMMON = `#version 300 es
precision highp float; precision highp int; precision highp sampler2DShadow; precision highp sampler2D;
uniform vec3 uSun, uSunC, uAmb, uSkyZ, uSkyH, uFog; uniform float uNight;
vec3 sky(vec3 d){ float t=clamp(d.z,0.,1.); vec3 c=mix(uSkyH,uSkyZ,1.-pow(1.-t,3.2)); float g=max(dot(d,uSun),0.); float glow=smoothstep(-.1,.05,uSun.z);
  c+=uSunC*glow*(.10*pow(g,6.)+.22*pow(g,48.)); c=mix(c,vec3(1.,.96,.84)*1.25+uSunC*.1,glow*smoothstep(.99993,.99996,g)*step(0.,d.z)); return c; }
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 tone(vec3 c){ c=max(c,0.); c=c*(1.+c*.12)/(1.+c*.34); return pow(c,vec3(.4545)); }
`;
const VS = (wall, depth) => `#version 300 es
precision highp float; precision highp int;
uniform mat4 uVP; uniform vec2 uOff; uniform highp uint uLift[8]; uniform float uLiftZ[8]; uniform int uLiftN;
${wall ? `layout(location=0) in vec4 aP; layout(location=1) in vec4 aZ; layout(location=2) in uint aId; layout(location=3) in uvec4 aM;` : `layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in uint aId; layout(location=3) in uvec4 aM;`}
out vec3 vP; flat out vec3 vN; flat out uvec4 vM; flat out uint vId; out vec3 vU; flat out vec2 vL; out float vLift;
void main(){ vec3 p; ${wall ? `float t=float(gl_VertexID&1), up=float(gl_VertexID>>1); vec2 xy=mix(aP.xy,aP.zw,t); float zt=mix(aZ.x,aZ.y,t); p=vec3(xy,mix(min(aZ.z,zt),zt,up))*.1; vec2 d=aP.zw-aP.xy; float l=length(d); vN=vec3(d.y,-d.x,0.)/max(l,.001); vU=vec3(t*l*.1,p.z-aZ.w*.1,zt*.1-p.z); vL=vec2(l*.1,max(aZ.x,aZ.y)*.1-aZ.w*.1);` : `p=aP*.1; vN=normalize(aN); vU=vec3(0.); vL=vec2(0.);`}
 vLift=0.; for(int i=0;i<uLiftN;i++) if(uLift[i]==aId) vLift=uLiftZ[i];
 p.xy+=uOff; p.z+=vLift*vLift*260.; vP=p; vM=aM; vId=aId; gl_Position=uVP*vec4(p,1.); if(vLift>=1.) gl_Position=vec4(2.,2.,2.,1.); }`;
const FD = `#version 300 es
precision mediump float; void main(){}`;
const SHADOW = `uniform sampler2DShadow uS0,uS1,uS2; uniform mat4 uM0,uM1,uM2; uniform vec3 uTx;
float samp(sampler2DShadow s, vec3 q, float tx){ float v=0.; for(int i=0;i<4;i++){ vec2 o=vec2(float(i&1)-.5,float(i>>1)-.5)*1.4; v+=texture(s,vec3(q.xy+o*tx,q.z)); } return v*.25; }
float shadow(vec3 p, vec3 n){ if(uSun.z<=0.) return 0.; vec4 a=uM0*vec4(p+n*uTx.x*1.6+uSun*uTx.x,1.); vec3 q=a.xyz*.5+.5; if(all(greaterThan(q.xy,vec2(.01)))&&all(lessThan(q.xy,vec2(.99)))) return samp(uS0,q,1./float(textureSize(uS0,0).x));
 a=uM1*vec4(p+n*uTx.y*1.6+uSun*uTx.y,1.); q=a.xyz*.5+.5; if(all(greaterThan(q.xy,vec2(.01)))&&all(lessThan(q.xy,vec2(.99)))) return samp(uS1,q,1./float(textureSize(uS1,0).x)); return 1.; }
`;
const FC = COMMON + SHADOW + `
in vec3 vP; flat in vec3 vN; flat in uvec4 vM; flat in uint vId; in vec3 vU; flat in vec2 vL; in float vLift;
uniform vec3 uEye; uniform vec4 uClip; uniform highp uint uHi, uSelf; uniform float uHiA, uExp, uIsRoof, uFogD, uGhost; out vec4 o;
vec3 pal(uint k, float r){ 
 if(k==0u) return mix(vec3(.46,.16,.105),vec3(.60,.27,.17),r);
 if(k==1u) return mix(vec3(.33,.17,.11),vec3(.52,.33,.2),r);
 if(k==2u) return mix(vec3(.62,.52,.35),vec3(.74,.65,.48),r);
 if(k==3u) return mix(vec3(.66,.64,.57),vec3(.8,.77,.68),r);
 if(k==4u) return mix(vec3(.17,.27,.33),vec3(.36,.46,.5),r);
 return mix(vec3(.38,.38,.36),vec3(.55,.53,.48),r); }
void main(){ if(dot(uClip.xyz,vP)+uClip.w<0.) discard;
 float gh=(vId==uSelf||(uHiA>0.&&vId==uHi))?0.:uGhost; float r=float(vM.y)/255.; uint k=vM.x; vec3 N=vN; vec3 V=normalize(uEye-vP); if(dot(N,V)<0.&&uIsRoof<.5) N=-N;
 vec3 c=pal(k,r); float dist=length(uEye-vP); float gls=0.;
 if(uIsRoof<.5){
   float fh=k==4u?3.9:3.45, bay=k==4u?1.6:mix(2.5,3.6,fract(r*7.3)); float nb=max(1.,floor(vL.x/bay)); vec2 g=vec2(vU.x/vL.x*nb,vU.y/fh); vec2 w=fwidth(g); float lod=1.-smoothstep(.25,.75,max(w.x,w.y));
   vec2 f=fract(g); float win; vec2 aa=max(w,vec2(.001));
   if(k==4u){ float mull=smoothstep(.5-.06-aa.x,.5-.06,abs(f.x-.5)); float sp=1.-smoothstep(.2-aa.y,.2+aa.y,f.y); win=(1.-mull)*(1.-sp); }
   else { float hx=mix(.2,.3,fract(r*3.7)); vec2 q=abs(f-vec2(.5,.52))-vec2(hx,.27); win=(1.-smoothstep(-aa.x,aa.x,q.x))*(1.-smoothstep(-aa.y,aa.y,q.y)); if(vL.x<2.2) win=0.; }
   win*=smoothstep(.6,1.2,vU.y)*smoothstep(.2,1.,vU.z); float mean=k==4u?.66:.26; win=mix(mean*step(2.2,vL.x),win,lod);
   vec3 wc=mix(vec3(.085,.10,.14),vec3(.2,.25,.3),hash(floor(g)+r*57.)*lod*.5); win*=1.-.82*gh; gls=win; c=mix(c,k==4u?mix(c*.62,wc,.35):wc,win*(k==4u?.8:.86));
   float course=1.-smoothstep(0.,.5,abs(vU.z-.45)); if(k<4u) c*=1.+.10*course;
 } else { c=mix(c,vec3(.48,.46,.44),.62)*mix(.86,1.1,hash(vec2(r,r*3.))); if(vN.z<.9) c*=.9; }
 c=mix(c,vec3(.60,.595,.57)*(.9+.2*r),gh*.82); c*=mix(vec3(1.),vec3(.97,.99,1.04),fract(r*11.));
 float ndl=max(dot(N,uSun),0.); float sh=ndl>0.?shadow(vP,N):0.; float lit=sh*smoothstep(0.,.12,ndl)*mix(.35,1.,ndl)*smoothstep(-.005,.02,uSun.z);
 float ao=uIsRoof<.5?mix(.62,1.,smoothstep(0.,26.,vU.y)):1.; float up=.62+.38*N.z;
 vec3 amb=uAmb*up*ao*(.88+.12*dot(N.xy,normalize(vec2(.35,.94)))) ; vec3 bounce=uSunC*.10*(1.-N.z)*max(uSun.z,0.)*ao;
 vec3 col=c*(amb+bounce+uSunC*lit);
 if(gls>0.){ vec3 rf=reflect(-V,N); float fr=.05+.6*pow(1.-max(dot(N,V),0.),4.); col=mix(col,sky(normalize(vec3(rf.xy,abs(rf.z)+.05)))*.9,gls*fr*(k==4u?1.:.55)); }
 if(uNight>.01&&uIsRoof<.5){ float fh=k==4u?3.9:3.45, bay=k==4u?1.6:mix(2.5,3.6,fract(r*7.3)); vec2 g=floor(vec2(vU.x/vL.x*max(1.,floor(vL.x/bay)),vU.y/fh)); float on=step(.66,hash(g+r*91.)); col+=vec3(.75,.50,.22)*on*gls*uNight*.5; }
 if(uHiA>0.&&vId==uHi) col=mix(col,vec3(.085,.075,.25)*(.6+.8*lit+.5*up*(1.-uNight*.5)),uHiA*.72);
 if(uSelf==vId){ float lm=dot(col,vec3(.3,.6,.1)); col=mix(col,vec3(1.2,.78,.22)*(.18+lm*1.05),.7); }
 float fog=1.-exp(-max(dist-120.,0.)/uFogD); vec3 fc=mix(uFog,sky(normalize(vec3(-V.xy,.02))),.5); col=mix(col,fc,fog*.82);
 if(vLift>0.){ float a=1.-vLift; if(hash(gl_FragCoord.xy)>a*1.2) discard; }
 o=vec4(tone(col*uExp),1.); }`;
const GV = `#version 300 es
precision highp float; uniform mat4 uVP; uniform vec2 uOff; layout(location=0) in vec3 aP; out vec3 vP; out vec2 vT; uniform vec4 uTR; void main(){ vP=vec3(aP.xy+uOff,aP.z); vT=(aP.xy-uTR.xy)/uTR.zw; gl_Position=uVP*vec4(vP,1.); }`;
const GF = COMMON + SHADOW + `in vec3 vP; in vec2 vT; uniform sampler2D uT; uniform vec3 uEye; uniform vec4 uClip; uniform float uExp, uFogD, uGhost; out vec4 o;
void main(){ if(dot(uClip.xyz,vP)+uClip.w<0.) discard; vec3 c=vec3(.30,.36,.42); if(all(greaterThan(vT,vec2(0.)))&&all(lessThan(vT,vec2(1.)))) c=pow(texture(uT,vT).rgb,vec3(2.2)); vec3 V=normalize(uEye-vP); float sh=shadow(vP,vec3(0.,0.,1.))*smoothstep(0.,.15,uSun.z)*max(uSun.z,.25)*step(0.,uSun.z);
 vec3 col=c*(uAmb*.86+uSunC*sh*.95); float dist=length(uEye-vP); float fog=1.-exp(-max(dist-120.,0.)/uFogD); col=mix(col,mix(uFog,sky(normalize(vec3(-V.xy,.02))),.5),fog*.82); o=vec4(tone(col*uExp),1.); }`;
const QV = `#version 300 es
out vec2 vQ; void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); vQ=p*2.-1.; gl_Position=vec4(vQ,.99999,1.); }`;
const SF = COMMON + `in vec2 vQ; uniform vec3 uX,uY,uZ; uniform vec2 uTan; uniform float uExp; out vec4 o; void main(){ vec3 d=normalize(uX*vQ.x*uTan.x+uY*vQ.y*uTan.y-uZ); vec3 c=sky(d); if(d.z<0.) c=mix(c,uFog,smoothstep(0.,-.03,d.z)); c+=(hash(gl_FragCoord.xy)-.5)*.006; o=vec4(tone(c*uExp),1.); }`;
// the room: x right (seen from inside), y towards the window (0 = inner face of the wall), z up
const RF = COMMON + `in vec2 vQ; uniform vec3 uCX,uCY,uCZ,uEyeR; uniform vec2 uTan; uniform float uExp,uPx,uSkyE,uDusk; uniform vec3 uSunR; uniform vec4 uRoom; uniform vec4 uWin; uniform sampler2DShadow uS2; uniform mat4 uM2; uniform mat3 uR2W; uniform vec3 uO; uniform vec4 uPatch; uniform vec3 uPatchN; uniform vec3 uFloorTint; uniform float uMark, uBeam; out vec4 o;
const float TH=${ROOM.thick.toFixed(2)}, CHX=${ROOM.chair[0].toFixed(2)}, CHY=${ROOM.chair[1].toFixed(2)};
// chair: boxes (centre, half)
vec3 bc[9]; vec3 bh[9]; mat2 crot;
void chair(){ vec3 p=vec3(CHX,CHY,0.); bc[0]=p+vec3(0.,0.,.445);bh[0]=vec3(.215,.205,.018); bc[1]=p+vec3(-.19,.18,.215);bh[1]=vec3(.017,.017,.215); bc[2]=p+vec3(.19,.18,.215);bh[2]=vec3(.017,.017,.215); bc[3]=p+vec3(-.19,-.19,.45);bh[3]=vec3(.017,.017,.45); bc[4]=p+vec3(.19,-.19,.45);bh[4]=vec3(.017,.017,.45); bc[5]=p+vec3(0.,-.19,.84);bh[5]=vec3(.19,.011,.055); bc[6]=p+vec3(0.,-.19,.66);bh[6]=vec3(.19,.011,.045); bc[7]=p+vec3(0.,0.,.41);bh[7]=vec3(.19,.18,.022); bc[8]=p+vec3(0.,.18,.17);bh[8]=vec3(.19,.009,.012); }
vec3 rotc(vec3 v){ vec2 c=vec2(CHX,CHY); v.xy=crot*(v.xy-c)+c; return v; }
vec2 boxi(vec3 ro, vec3 rd, vec3 c, vec3 h, out vec3 n){ vec3 m=1./rd, q=m*(ro-c), k=abs(m)*h, t1=-q-k, t2=-q+k; float a=max(max(t1.x,t1.y),t1.z), b=min(min(t2.x,t2.y),t2.z); n=vec3(0.); if(a>b||b<0.) return vec2(1e9); n=-sign(rd)*step(t1.yzx,t1.xyz)*step(t1.zxy,t1.xyz); return vec2(a,b); }
float chairHit(vec3 ro, vec3 rd, out vec3 n){ vec3 a=rotc(ro), d=vec3(crot*rd.xy,rd.z); float t=1e9; n=vec3(0.); vec3 m; vec2 bd=boxi(a,d,vec3(CHX,CHY,.45),vec3(.26,.26,.48),m); if(bd.x>1e8) return t; for(int i=0;i<9;i++){ vec2 h=boxi(a,d,bc[i],bh[i],m); if(h.x>.001&&h.x<t){ t=h.x; n=m; } } n.xy=transpose(crot)*n.xy; return t; }
// is the sun at wall point (x,z)? glass divided by a frame
float glass(vec2 q, float w){ vec2 c=vec2(0.,(uWin.y+uWin.z)*.5), h=vec2(uWin.x,(uWin.z-uWin.y)*.5); vec2 d=abs(q-c); float a=(1.-smoothstep(h.x-.055-w,h.x-.055+w,d.x))*(1.-smoothstep(h.y-.055-w,h.y-.055+w,d.y)); a*=smoothstep(.026-w,.026+w,abs(q.y-c.y)); a*=smoothstep(.012-w,.012+w,abs(q.x)); return a; }
float hole(vec2 q, float w){ vec2 c=vec2(0.,(uWin.y+uWin.z)*.5), h=vec2(uWin.x,(uWin.z-uWin.y)*.5); vec2 d=abs(q-c); return (1.-smoothstep(h.x-w,h.x+w,d.x))*(1.-smoothstep(h.y-w,h.y+w,d.y)); }
float cityLit(vec3 q){ vec3 w=uO+uR2W*vec3(q.x,0.35,q.z-uWin.w); vec4 a=uM2*vec4(w,1.); vec3 s=a.xyz*.5+.5; float v=0.; float tx=1./float(textureSize(uS2,0).x); for(int i=0;i<4;i++) v+=texture(uS2,vec3(s.xy+(vec2(float(i&1),float(i>>1))-.5)*tx*1.5,s.z)); return v*.25; }
float sunlit(vec3 p, vec3 n, float pw){ if(uSunR.y<=.002||uSunR.z<=0.) return 0.; float nd=dot(n,uSunR); if(nd<=0.) return 0.; float t0=(0.-p.y)/uSunR.y, t1=(TH*.8-p.y)/uSunR.y; if(t1<0.) return 0.; vec3 q0=p+uSunR*t0, q1=p+uSunR*t1; float w=max(.0045*abs(t1),pw); float a=glass(q1.xz,w); if(p.y<-.001) a*=hole(q0.xz,w*.8); if(a<=0.) return 0.; a*=cityLit(q1); return a; }
// light of the window on a point (polygon form factor)
float ff(vec3 p, vec3 n){ vec3 A=vec3(-uWin.x,0.,uWin.y)-p,B=vec3(uWin.x,0.,uWin.y)-p,C=vec3(uWin.x,0.,uWin.z)-p,D=vec3(-uWin.x,0.,uWin.z)-p; A=normalize(A);B=normalize(B);C=normalize(C);D=normalize(D); float s=0.; 
 vec3 x; x=cross(A,B); s+=acos(clamp(dot(A,B),-1.,1.))*dot(n,normalize(x)); x=cross(B,C); s+=acos(clamp(dot(B,C),-1.,1.))*dot(n,normalize(x)); x=cross(C,D); s+=acos(clamp(dot(C,D),-1.,1.))*dot(n,normalize(x)); x=cross(D,A); s+=acos(clamp(dot(D,A),-1.,1.))*dot(n,normalize(x)); return abs(s)/6.2831853; }
vec3 bounce(vec3 p, vec3 n){ vec3 d=uPatch.xyz-p; float r2=dot(d,d); d/=sqrt(r2+1e-5); float q=max(dot(n,d),0.)*max(dot(uPatchN,-d)+.12,0.); return uSunC*uPatch.w*(q/(r2+.55)); }
void main(){ chair(); float ca=cos(.62), sa=sin(.62); crot=mat2(ca,-sa,sa,ca);
 vec3 rd=normalize(uCX*vQ.x*uTan.x+uCY*vQ.y*uTan.y-uCZ), ro=uEyeR; float W=uRoom.x*.5, H=uRoom.z, D=uRoom.y; float px=uPx;
 vec3 n; float tc=chairHit(ro,rd,n); float tx=rd.x>0.?(W-ro.x)/rd.x:(-W-ro.x)/rd.x, tz=rd.z>0.?(H-ro.z)/rd.z:-ro.z/rd.z, ty=rd.y>0.?(0.-ro.y)/rd.y:(-D-ro.y)/rd.y; float t=min(tx,min(ty,tz)); vec3 p=ro+rd*t, N; int m; // 0 floor 1 ceiling 2 wall 3 window wall 4 chair 5 reveal 6 frame
 if(t==tz){ N=vec3(0.,0.,-sign(rd.z)); m=rd.z>0.?1:0; } else if(t==tx){ N=vec3(-sign(rd.x),0.,0.); m=2; } else { N=vec3(0.,-sign(rd.y),0.); m=rd.y>0.?3:2; }
 float A=1.; vec3 alb; float open=0.; vec3 view=vec3(0.);
 if(tc<t){ t=tc; p=ro+rd*t; N=n; m=4; }
 float w=px*t;
 if(m==3){ open=hole(p.xz,w*.7); }
 vec3 pw=p; 
 if(open>0.001){ // through the opening: reveal or glass
   float tg=(TH*.8-ro.y)/rd.y; vec3 g=ro+rd*tg; float inside=hole(g.xz,px*tg*.7);
   if(inside<.5){ m=5; float cx=uWin.x, z0=uWin.y, z1=uWin.z; float ta=1e9; vec3 nn=vec3(0.); float t1=(sign(rd.x)*cx-ro.x)/rd.x; if(t1>0.){ ta=t1; nn=vec3(-sign(rd.x),0.,0.);} float t2=((rd.z>0.?z1:z0)-ro.z)/rd.z; if(t2>0.&&t2<ta){ ta=t2; nn=vec3(0.,0.,-sign(rd.z)); } t=ta; p=ro+rd*t; N=nn; }
   else { float gls=glass(g.xz,px*tg*.8); p=g; N=vec3(0.,-1.,0.); m=6; A=1.-gls; } }
 float gr=hash(floor(p.xy*340.))*.5+hash(floor(p.zx*340.))*.5;
 vec3 wall=vec3(.71,.74,.67); if(m==0){ float pl=.115; float ix=floor(p.x/pl); float off=hash(vec2(ix,3.))*2.1; float iy=floor((p.y+off)/1.7); float h=hash(vec2(ix,iy)); float gx=abs(fract(p.x/pl)-.5)*pl; float seam=smoothstep(.0,.0025+w*.6,pl*.5-gx); float fine=hash(vec2(floor(p.x*260.),floor((p.y+off)*9.))); float ax=1.-smoothstep(.004,.03,w); alb=mix(vec3(.36,.215,.115),vec3(.47,.30,.17),h)*mix(1.,.93+.12*fine,ax)*mix(.95,mix(.6,1.,seam),ax); }
 else if(m==1) alb=vec3(.74,.735,.70); else if(m==4) alb=vec3(.25,.115,.06); else if(m==5||m==6) alb=vec3(.80,.79,.75); else { alb=wall*(.985+.03*gr); if(p.z<.13){ alb=vec3(.78,.77,.73); if(p.z>.118) alb*=.72; } }
 // window sill board
 float nsky=ff(p+N*.004,N); if(m==5) nsky=.5; if(m==6) nsky=.16;
 float ao=1.; if(m==0) ao=smoothstep(-.05,.55,W-abs(p.x))*smoothstep(-.1,.4,-p.y)*.5+.5; else if(m==1) ao=.5+.5*smoothstep(0.,.8,W-abs(p.x)); else if(m==2) ao=.55+.45*smoothstep(-.1,.8,p.z)*smoothstep(-.2,.7,H-p.z); else if(m==3) ao=.6+.4*smoothstep(0.,.5,p.z)*smoothstep(0.,.5,W-abs(p.x));
 if(m==0){ vec3 q=rotc(p); vec2 cq=abs(q.xy-vec2(CHX,CHY)); ao*=1.-.34*(1.-smoothstep(.1,.42,length(max(cq-.12,0.)))); }
 float s=0.; if(m!=6||A<1.||true){ float pwid=w*.8; s=sunlit(p+N*.002,N,pwid); if(s>0.){ vec3 nn; if(m!=4||true){ float h=chairHit(p+N*.004+uSunR*.004,uSunR,nn); if(h<8.&&h>0.) s=0.; } } }
 float nd=max(dot(N,uSunR),0.);
 vec3 skyl=uSkyZ*.55+uSkyH*.75; vec3 L=skyl*uSkyE*(nsky*2.5+.13*ao)+bounce(p,N)*1.5*ao+uSunC*uPatch.w*.045*ao*vec3(1.,.92,.78); L+=vec3(.055,.06,.085)*uDusk*ao; 
 vec3 sunIn=uSunC*s*(nd>.0?mix(nd,sqrt(nd),.35):0.)*(m==0?1.:.62); vec3 col=alb*(L+sunIn); 
 if(m==0){ vec3 rf=reflect(rd,N); float tw=(0.-p.y)/max(rf.y,1e-4); vec3 q=p+rf*tw; float g=rf.y>0.?hole(q.xz,.08+.07*tw):0.; col+=skyl*uSkyE*g*.085*pow(1.-max(dot(N,-rd),0.),2.); }
 if(uMark>0.&&m==0){ // a ruler on the floor: every metre from the window
   float dd=-p.y; float k=abs(fract(dd+.5)-.5); float ln=(1.-smoothstep(.004,.004+w*1.4,k))*step(.4,dd)*step(abs(p.x),W); col=mix(col,col*.55+vec3(.06),ln*uMark*.8); }
 if(uPatch.w>0.&&uSunR.y>.01&&m!=6){ float jit=fract(52.9829189*fract(dot(floor(gl_FragCoord.xy),vec2(.06711056,.00583715)))), acc=0.; float te=min(t,9.); for(int i=0;i<9;i++){ vec3 q=ro+rd*te*(float(i)+jit)/9.; if(q.y>-.02) continue; float t1=(TH*.8-q.y)/uSunR.y; vec3 g=q+uSunR*t1; acc+=glass(g.xz,.03)*step(abs(q.x),W); } col+=uSunC*acc/9.*te*.007*uBeam; }
 vec3 c=tone(col*uExp); c+=(hash(gl_FragCoord.xy)-.5)*.012; 
 o=vec4(c,A); if(m!=6) o.a=mix(1.,1.,open); if(m==3) o.a=1.; }`;
// lines in space: instanced segments with round ends
const LV = `#version 300 es
precision highp float; uniform mat4 uVP; uniform vec2 uRes; layout(location=0) in vec4 aA; layout(location=1) in vec4 aB; layout(location=2) in vec4 aC; out vec2 vS; flat out float vLen; flat out float vW; out vec4 vC;
void main(){ vec4 a=uVP*vec4(aA.xyz,1.), b=uVP*vec4(aB.xyz,1.); float n=.2; if(a.w<n&&b.w<n){ gl_Position=vec4(2.); return; } if(a.w<n) a=mix(a,b,(n-a.w)/(b.w-a.w)); if(b.w<n) b=mix(b,a,(n-b.w)/(a.w-b.w)); vec2 pa=a.xy/a.w*uRes*.5, pb=b.xy/b.w*uRes*.5; vec2 d=pb-pa; float l=length(d); d=l>.001?d/l:vec2(1.,0.); vec2 nn=vec2(-d.y,d.x); float w=aA.w*.5+1.; float t=float(gl_VertexID&1), s=float(gl_VertexID>>1)*2.-1.; vec2 p=mix(pa-d*w,pb+d*w,t)+nn*s*w; vS=vec2(mix(-w,l+w,t),s*w); vLen=l; vW=aA.w*.5; vec4 q=mix(a,b,t); gl_Position=vec4(p/(uRes*.5)*q.w,q.z,q.w); vC=aC; }`;
const LF = `#version 300 es
precision highp float; in vec2 vS; flat in float vLen; flat in float vW; in vec4 vC; uniform float uA; out vec4 o; void main(){ float d=length(vec2(vS.x-clamp(vS.x,0.,vLen),vS.y)); float a=1.-smoothstep(vW-.6,vW+.6,d); if(a<=0.) discard; o=vec4(vC.rgb,vC.a*a*uA); }`;

export function light(app) { // what colour the light is, from the sun's height in degrees
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t), K = [ // app, sun, amb, zenith, horizon
    [-18, [0, 0, 0], [.028, .034, .075], [.010, .014, .040], [.030, .034, .075]], [-8, [0, 0, 0], [.05, .06, .13], [.026, .038, .11], [.10, .085, .15]], [-3, [0, 0, 0], [.12, .13, .24], [.07, .11, .27], [.50, .28, .24]],
    [0, [.55, .16, .04], [.17, .18, .30], [.13, .19, .40], [.86, .46, .27]], [3, [1.25, .50, .16], [.22, .23, .36], [.19, .28, .50], [.94, .62, .38]], [8, [1.75, .98, .42], [.28, .29, .42], [.25, .39, .60], [.90, .74, .54]], [18, [2.1, 1.5, .84], [.34, .36, .48], [.25, .43, .68], [.66, .70, .68]], [35, [2.25, 1.78, 1.18], [.37, .40, .52], [.22, .42, .70], [.52, .64, .70]], [90, [2.3, 1.9, 1.35], [.39, .43, .55], [.20, .40, .70], [.48, .62, .72]]];
  let i = 0; while (i < K.length - 2 && app > K[i + 1][0]) i++; const t = Math.max(0, Math.min(1, (app - K[i][0]) / (K[i + 1][0] - K[i][0]))), a = K[i], b = K[i + 1];
  return { sun: mix(a[1], b[1], t), amb: mix(a[2], b[2], t), zen: mix(a[3], b[3], t), hor: mix(a[4], b[4], t), night: Math.max(0, Math.min(1, (2 - app) / 8)) };
}

export class GL {
  constructor(canvas, { phone = false } = {}) {
    const gl = this.gl = canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }); if (!gl) throw new Error('no WebGL2');
    this.canvas = canvas; this.phone = phone; this.chunks = []; this.gone = []; this.lifts = [];
    this.P = { wall: this.prog(VS(1), FC), roof: this.prog(VS(0), FC), dwall: this.prog(VS(1), FD), droof: this.prog(VS(0), FD), ground: this.prog(GV, GF), sky: this.prog(QV, SF), room: this.prog(QV, RF), line: this.prog(LV, LF) };
    this.S = [this.shadowMap(phone ? 1536 : 2560), this.shadowMap(phone ? 1024 : 2048), this.shadowMap(512)];
    this.empty = gl.createVertexArray(); this.lineB = gl.createBuffer(); this.lineA = gl.createVertexArray(); gl.bindVertexArray(this.lineA); gl.bindBuffer(gl.ARRAY_BUFFER, this.lineB); for (let i = 0; i < 3; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 48, i * 16); gl.vertexAttribDivisor(i, 1); } gl.bindVertexArray(null);
    this.org = [0, 0]; this.stamp = 0;
  }
  prog(v, f) { const gl = this.gl, p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, v], [gl.FRAGMENT_SHADER, f]]) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o) + '\n' + s.split('\n').map((l, i) => (i + 1) + ' ' + l.slice(0, 120)).join('\n').slice(0, 900)); gl.attachShader(p, o); } gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); const u = {}; for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name.replace('[0]', '')] = gl.getUniformLocation(p, a.name); } return { p, u }; }
  shadowMap(n) { const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, n, n); for (const [k, v] of [[gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE], [gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t, 0); gl.drawBuffers([gl.NONE]); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return { t, f, n, m: null }; }
  addBand(chunks) { const gl = this.gl; for (const c of chunks) { const mk = (buf, wall) => { const a = gl.createVertexArray(), b = gl.createBuffer(); gl.bindVertexArray(a); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW); for (let i = 0; i < 4; i++) gl.enableVertexAttribArray(i); if (wall) { gl.vertexAttribPointer(0, 4, gl.SHORT, false, 24, 0); gl.vertexAttribPointer(1, 4, gl.SHORT, false, 24, 8); gl.vertexAttribIPointer(2, 1, gl.UNSIGNED_INT, 24, 16); gl.vertexAttribIPointer(3, 4, gl.UNSIGNED_BYTE, 24, 20); for (let i = 0; i < 4; i++) gl.vertexAttribDivisor(i, 1); } else { gl.vertexAttribPointer(0, 3, gl.SHORT, false, 20, 0); gl.vertexAttribPointer(1, 3, gl.BYTE, true, 20, 8); gl.vertexAttribIPointer(2, 1, gl.UNSIGNED_INT, 20, 12); gl.vertexAttribIPointer(3, 4, gl.UNSIGNED_BYTE, 20, 16); } gl.bindVertexArray(null); return a; };
      this.chunks.push({ x: c.x, y: c.y, bb: c.bb, nw: c.nw, nr: c.nr, wa: mk(c.wb, 1), ra: mk(c.rb, 0) }); } this.stamp++; }
  clearCity() { this.chunks = []; this.stamp++; }
  setGround(pos, idx, tex, tr) { const gl = this.gl; if (!this.gr) { this.gr = { a: gl.createVertexArray(), b: gl.createBuffer(), i: gl.createBuffer(), t: gl.createTexture() }; } const g = this.gr; gl.bindVertexArray(g.a); gl.bindBuffer(gl.ARRAY_BUFFER, g.b); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.i); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW); gl.bindVertexArray(null); g.n = idx.length; g.tr = tr; gl.bindTexture(gl.TEXTURE_2D, g.t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); const ex = gl.getExtension('EXT_texture_filter_anisotropic'); if (ex) gl.texParameterf(gl.TEXTURE_2D, ex.TEXTURE_MAX_ANISOTROPY_EXT, 8); this.stamp++; }
  // scene: {sun:[x,y,z] local, app, win:{p,az}, hi, gone:[ids], lift:[[id,0..1]]}
  set(scene) { this.sc = scene; }
  liftU(u) { const gl = this.gl, L = [...this.sc.gone.map(i => [i, 1]), ...(this.sc.lift || [])].slice(-8); gl.uniform1i(u.uLiftN, L.length); if (L.length) { const a = new Uint32Array(8), z = new Float32Array(8); L.forEach((l, i) => { a[i] = l[0]; z[i] = l[1]; }); gl.uniform1uiv(u.uLift, a); gl.uniform1fv(u.uLiftZ, z); } }
  city(vp, cols, cull, progs) { const gl = this.gl; for (const wall of [1, 0]) { const P = this.P[progs[wall ? 0 : 1]]; gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.uVP, false, vp); this.liftU(P.u); cols && cols(P.u, wall); for (const c of this.chunks) { if (!cull(c)) continue; gl.uniform2f(P.u.uOff, c.x - this.org[0], c.y - this.org[1]); if (wall) { gl.bindVertexArray(c.wa); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, c.nw); } else { gl.bindVertexArray(c.ra); gl.drawArrays(gl.TRIANGLES, 0, c.nr); } } } gl.bindVertexArray(null); }
  shadows(foc) { const gl = this.gl, s = this.sc.sun; if (s[2] <= 0.002) { this.skey = ''; for (const m of this.S) m.m = [1e-6, 0, 0, 0, 0, 1e-6, 0, 0, 0, 0, 1e-6, 0, 0, 0, 0, 1]; return; }
    const key = JSON.stringify([s.map(v => +v.toFixed(5)), foc, this.org, this.stamp, this.sc.gone, this.sc.lift]); if (key === this.skey) return; this.skey = key; gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.colorMask(false, false, false, false); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    const win = [this.sc.win.p[0] - this.org[0], this.sc.win.p[1] - this.org[1], this.sc.win.p[2]], conf = [[foc.c, foc.r], [foc.c, foc.r2], [win, 7]]; this.tx = conf.map(([, r], i) => 2 * r / this.S[i].n);
    conf.forEach(([c, r], i) => { const M = this.S[i], far = 1e9, up = Math.abs(s[2]) > .98 ? [0, 1, 0] : [0, 0, 1], cam = look([c[0] + s[0], c[1] + s[1], c[2] + s[2]], c, up), len = Math.min(5000, 480 / Math.max(s[2], .06) + r * 2); const vp = mul(ortho(r, -len, r * 2 + 1200), cam.m); M.m = vp; gl.bindFramebuffer(gl.FRAMEBUFFER, M.f); gl.viewport(0, 0, M.n, M.n); gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 2);
      const cull = k => { const b = k.bb, x = (b[0] + b[3]) / 2 - this.org[0] - c[0], y = (b[1] + b[4]) / 2 - this.org[1] - c[1], z = (b[2] + b[5]) / 2 - c[2], rr = Math.hypot(b[3] - b[0], b[4] - b[1], b[5] - b[2]) / 2 + r * 1.42; const u = x * cam.x[0] + y * cam.x[1] + z * cam.x[2], v = x * cam.y[0] + y * cam.y[1] + z * cam.y[2]; return u * u + v * v < rr * rr && Math.abs(u) < rr && Math.abs(v) < rr; };
      this.city(vp, null, cull, ['dwall', 'droof']); gl.disable(gl.POLYGON_OFFSET_FILL); });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.colorMask(true, true, true, true); }
  common(u, exp) { const gl = this.gl, L = this.L, s = this.sc.sun; gl.uniform3fv(u.uSun, s); gl.uniform3fv(u.uSunC, L.sun); gl.uniform3fv(u.uAmb, L.amb); gl.uniform3fv(u.uSkyZ, L.zen); gl.uniform3fv(u.uSkyH, L.hor); gl.uniform3fv(u.uFog, L.hor.map((v, i) => v * .55 + L.zen[i] * .45)); gl.uniform1f(u.uNight, L.night); gl.uniform1f(u.uExp, exp); }
  texs(u) { const gl = this.gl; this.S.forEach((m, i) => { if (u['uS' + i] === undefined) return; gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, m.t); gl.uniform1i(u['uS' + i], i); gl.uniformMatrix4fv(u['uM' + i], false, m.m); }); u.uTx && gl.uniform3fv(u.uTx, this.tx || [1, 1, 1]); }
  // draw the city from a camera. cam {eye, at, fy, clip?, fog}
  drawCity(cam, exp = 1) { const gl = this.gl, W = this.canvas.width, H = this.canvas.height, asp = W / H, o = this.org; this.L = light(this.sc.app); if (this.sc.overcast) { const L = this.L = light(30); L.amb = L.amb.map(v => v * 2.1); L.sun = [0, 0, 0]; L.night = 0; L.hor = [.72, .75, .77]; L.zen = [.50, .57, .64]; } const eye = [cam.eye[0] - o[0], cam.eye[1] - o[1], cam.eye[2]], at = [cam.at[0] - o[0], cam.at[1] - o[1], cam.at[2]], v = look(eye, at), P = persp(cam.fy, asp, cam.near || 2, 9000), vp = mul(P, v.m); this.vp = vp; this.view = v;
    this.shadows(cam.foc || { c: [at[0], at[1], at[2]], r: cam.r || 380, r2: cam.r2 || 1500 });
    gl.viewport(0, 0, W, H); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LEQUAL); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const clip = cam.clip ? [...cam.clip.slice(0, 3), cam.clip[3] + cam.clip[0] * o[0] + cam.clip[1] * o[1]] : [0, 0, 0, 1], fogD = cam.fog || 2600;
    const pl = [0, 1, 4, 5].map(i => { const r = i & 1 ? -1 : 1, k = i >> 2; return [vp[3] + r * vp[k], vp[7] + r * vp[4 + k], vp[11] + r * vp[8 + k], vp[15] + r * vp[12 + k]]; });
    const cull = c => { const b = c.bb; for (const p of pl) { const x = p[0] > 0 ? b[3] : b[0], y = p[1] > 0 ? b[4] : b[1], z = p[2] > 0 ? b[5] : b[2]; if (p[0] * (x - o[0]) + p[1] * (y - o[1]) + p[2] * z + p[3] < 0) return false; } return true; };
    this.city(vp, (u, wall) => { this.common(u, exp); this.texs(u); gl.uniform3fv(u.uEye, eye); gl.uniform4fv(u.uClip, clip); gl.uniform1ui(u.uHi, (this.sc.hi ?? -1) >>> 0); gl.uniform1f(u.uHiA, this.sc.hiA ?? 0); gl.uniform1ui(u.uSelf, (this.sc.self ?? -1) >>> 0); gl.uniform1f(u.uIsRoof, wall ? 0 : 1); gl.uniform1f(u.uFogD, fogD); gl.uniform1f(u.uGhost, cam.ghost || 0); }, cull, ['wall', 'roof']);
    if (this.gr && this.gr.n) { const p = this.P.ground; gl.useProgram(p.p); this.common(p.u, exp); this.texs(p.u); gl.uniformMatrix4fv(p.u.uVP, false, vp); gl.uniform2f(p.u.uOff, -o[0], -o[1]); gl.uniform3fv(p.u.uEye, eye); gl.uniform4fv(p.u.uClip, clip); gl.uniform4fv(p.u.uTR, this.gr.tr); gl.uniform1f(p.u.uFogD, fogD); gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.gr.t); gl.uniform1i(p.u.uT, 3); gl.bindVertexArray(this.gr.a); gl.drawElements(gl.TRIANGLES, this.gr.n, gl.UNSIGNED_INT, 0); gl.bindVertexArray(null); }
    { const p = this.P.sky; gl.useProgram(p.p); this.common(p.u, exp); gl.uniform3fv(p.u.uX, v.x); gl.uniform3fv(p.u.uY, v.y); gl.uniform3fv(p.u.uZ, v.z); const t = Math.tan(cam.fy / 2); gl.uniform2f(p.u.uTan, t * asp, t); gl.bindVertexArray(this.empty); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  }
  // segs: [x0,y0,z0,width, x1,y1,z1,_, r,g,b,a] world metres, width in css px
  lines(segs, dpr, { hidden = .25 } = {}) { const gl = this.gl, n = segs.length / 12; if (!n) return; const a = new Float32Array(segs); for (let i = 0; i < n; i++) { a[i * 12] -= this.org[0]; a[i * 12 + 1] -= this.org[1]; a[i * 12 + 4] -= this.org[0]; a[i * 12 + 5] -= this.org[1]; a[i * 12 + 3] *= dpr; } const p = this.P.line; gl.useProgram(p.p); gl.bindVertexArray(this.lineA); gl.bindBuffer(gl.ARRAY_BUFFER, this.lineB); gl.bufferData(gl.ARRAY_BUFFER, a, gl.DYNAMIC_DRAW); gl.uniformMatrix4fv(p.u.uVP, false, this.vp); gl.uniform2f(p.u.uRes, this.canvas.width, this.canvas.height); gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.depthMask(false); if (hidden > 0) { gl.depthFunc(gl.GREATER); gl.uniform1f(p.u.uA, hidden); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n); } gl.depthFunc(gl.LEQUAL); gl.uniform1f(p.u.uA, 1); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n); gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null); }
  /* the room behind the window. ro = {sky: 0..1 how much sky the window sees, exp, mark, cam:{eye,at,fy}} in room metres */
  drawRoom(ro) { const gl = this.gl, W = this.canvas.width, H = this.canvas.height, asp = W / H, sc = this.sc, az = sc.win.az * R, n = [Math.sin(az), Math.cos(az), 0], r = [Math.cos(az), -Math.sin(az), 0]; // room x = r, y = n
    const zc = (ROOM.sill + ROOM.top) / 2, w2 = p => [sc.win.p[0] + r[0] * p[0] + n[0] * (p[1] - ROOM.thick), sc.win.p[1] + r[1] * p[0] + n[1] * (p[1] - ROOM.thick), sc.win.p[2] + p[2] - zc];
    const eye = w2(ro.cam.eye), at = w2(ro.cam.at); const f = 260; this.drawCity({ eye, at, fy: ro.cam.fy, near: .4, clip: [...n, -(n[0] * sc.win.p[0] + n[1] * sc.win.p[1]) - .12], foc: { c: [sc.win.p[0] + n[0] * f - this.org[0], sc.win.p[1] + n[1] * f - this.org[1], sc.win.p[2]], r: 330, r2: 1500 }, fog: 4200 }, ro.out || ro.exp * .8);
    const s = sc.sun, sr = [V3.dot(s, r), V3.dot(s, n), s[2]], L = this.L, P = this.P.room, u = P.u, v = look(ro.cam.eye, ro.cam.at), t = Math.tan(ro.cam.fy / 2);
    gl.useProgram(P.p); this.common(u, ro.exp); this.texs(u); gl.uniform3fv(u.uCX, v.x); gl.uniform3fv(u.uCY, v.y); gl.uniform3fv(u.uCZ, v.z); gl.uniform3fv(u.uEyeR, ro.cam.eye); gl.uniform2f(u.uTan, t * asp, t); gl.uniform1f(u.uPx, 2 * t / H); gl.uniform1f(u.uSkyE, ro.sky); gl.uniform1f(u.uDusk, .25 + L.night * .9); gl.uniform3fv(u.uSunR, sr); gl.uniform4f(u.uRoom, ROOM.w, ROOM.d, ROOM.h, 0); gl.uniform4f(u.uWin, ROOM.ww / 2, ROOM.sill, ROOM.top, zc); gl.uniformMatrix3fv(u.uR2W, false, [...r, ...n, 0, 0, 1]); gl.uniform3f(u.uO, sc.win.p[0] - this.org[0], sc.win.p[1] - this.org[1], sc.win.p[2]); gl.uniform4fv(u.uPatch, ro.patch.p); gl.uniform3fv(u.uPatchN, ro.patch.n); gl.uniform1f(u.uMark, ro.mark || 0); gl.uniform1f(u.uBeam, ro.beam ?? 1);
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.bindVertexArray(this.empty); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.bindVertexArray(null); }
}
// where the middle of the beam lands, and how strong it is (for the light it gives the room)
export function patchOf(sunLocal, az, frac) { const a = az * R, n = [Math.sin(a), Math.cos(a)], r = [Math.cos(a), -Math.sin(a)], s = [sunLocal[0] * r[0] + sunLocal[1] * r[1], sunLocal[0] * n[0] + sunLocal[1] * n[1], sunLocal[2]]; if (s[1] <= .01 || s[2] <= 0 || !frac) return { p: [0, -1, 0, 0], n: [0, 0, 1] }; const o = [0, 0, (ROOM.sill + ROOM.top) / 2], d = [-s[0], -s[1], -s[2]], W = ROOM.w / 2; let t = -o[2] / d[2], N = [0, 0, 1]; const tx = d[0] > 0 ? W / d[0] : d[0] < 0 ? -W / d[0] : 1e9; if (tx < t) { t = tx; N = [-Math.sign(d[0]), 0, 0]; } const ty = -ROOM.d / d[1]; if (ty > 0 && ty < t) { t = ty; N = [0, 1, 0]; } return { p: [d[0] * t, d[1] * t, o[2] + d[2] * t, frac * s[1] * .62], n: N, t }; }
