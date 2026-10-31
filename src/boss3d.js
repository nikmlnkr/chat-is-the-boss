import * as T from 'three';
// One persistent renderer and pooled geometry: replay never allocates another scene.
export class Boss3D {
 constructor(){
  this.available=false;this.failed='';this.arms=[];
  try{
   this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
   this.renderer.setSize(512,512,false);this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.35;
   this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(34,1,.1,100);this.camera.position.set(6,4.6,12);this.camera.lookAt(0,1.8,0);
   this.scene.add(new T.HemisphereLight(0xc5d6ec,0x26212a,2.8));const key=new T.DirectionalLight(0xffe1ca,4.2);key.position.set(-4,7,8);this.scene.add(key);const rim=new T.DirectionalLight(0x9bbce8,4);rim.position.set(5,4,-5);this.scene.add(rim);
   this.geo={box:new T.BoxGeometry(1,1,1),sphere:new T.SphereGeometry(1,12,8),cyl:new T.CylinderGeometry(1,1,1,12),cone:new T.ConeGeometry(1,1,6),oct:new T.OctahedronGeometry(1),torus:new T.TorusGeometry(1,.13,6,20)};
   const mat=(c,m=.6,r=.45)=>new T.MeshStandardMaterial({color:c,metalness:m,roughness:r});
   this.mat={armor:mat(0x59616c,.3,.5),edge:mat(0x8793a1),black:mat(0x11161d),red:mat(0x6e2422),laser:mat(0x726084),ram:mat(0x88705a),shield:mat(0x4a667d),rockets:mat(0x655347),slam:mat(0x53636a),glow:new T.MeshStandardMaterial({color:0xff6b36,emissive:0xff3c08,emissiveIntensity:2.4}),white:mat(0xe4d7c3)};
   this.root=new T.Group();this.scene.add(this.root);this.body=new T.Group();this.root.add(this.body);
   this.buildBody();for(const side of [-1,1]){const joint=new T.Group();joint.position.set(side*1.25,2.1,0);this.body.add(joint);const variants={};for(const type of ['laser','charge','shield','rockets','slam']){const group=new T.Group();joint.add(group);this.buildWeapon(group,type,side);group.visible=false;variants[type]=group}this.arms.push({joint,variants,side});}
   this.available=true;this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.available=false;this.failed='3D graphics interrupted';});this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.available=true;this.failed=''});
  }catch(e){this.failed='3D unavailable on this browser';}
 }
 mesh(parent,shape,material,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){const m=new T.Mesh(this.geo[shape],this.mat[material]);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,ry,rz);parent.add(m);return m;}
 buildBody(){const p=this.body;
  for(const side of [-1,1]){this.mesh(p,'box','black',side*.53,.7,0,.48,1.2,.55,0,0,side*.1);this.mesh(p,'box','armor',side*.61,.55,.17,.63,.75,.72,.12,0,side*-.12);this.mesh(p,'box','edge',side*.65,.13,.35,.78,.25,1);for(let j=0;j<3;j++)this.mesh(p,'cone','white',side*.65+(j-1)*.22,.12,.92,.11,.4,.15,Math.PI/2,0,0);this.mesh(p,'oct','edge',side*.54,1.1,.42,.28,.27,.16);}
  this.mesh(p,'box','black',0,1.35,0,1.2,.45,.7);this.mesh(p,'oct','armor',0,2.12,0,1.18,.98,.73);this.mesh(p,'box','red',0,2.35,.5,1.55,.36,.2,0,0,0);
  for(const side of [-1,1]){this.mesh(p,'box','edge',side*.58,2.3,.56,.5,.3,.18,0,0,side*-.35);for(let i=0;i<3;i++)this.mesh(p,'box','black',side*.72,1.8+i*.13,.48,.27,.06,.15,0,0,side*.18);this.mesh(p,'sphere','black',side*1.2,2.25,0,.3,.3,.3);this.mesh(p,'oct','armor',side*1.12,2.6,0,.57,.34,.63);for(let j=0;j<2;j++)this.mesh(p,'cone','edge',side*(1.05+j*.3),2.97-j*.05,-.08,.13,.62,.13,0,0,-side*.5);}
  this.mesh(p,'cyl','black',0,1.93,.6,.36,.16,.36,Math.PI/2);this.mesh(p,'torus','edge',0,1.93,.7,.32,.32,.32);this.core=this.mesh(p,'sphere','glow',0,1.93,.7,.23,.23,.1);
  this.mesh(p,'box','black',0,2.91,0,.38,.4,.4);this.head=new T.Group();this.head.position.set(0,3.15,.08);p.add(this.head);
  this.mesh(this.head,'oct','armor',0,0,0,.59,.5,.48);this.mesh(this.head,'box','black',0,.04,.37,.75,.19,.13);for(const side of [-1,1]){this.mesh(this.head,'box','glow',side*.2,.06,.45,.27,.065,.06,0,0,side*.15);this.mesh(this.head,'cone','edge',side*.48,.4,-.03,.15,.9,.16,0,0,-side*.4);this.mesh(this.head,'box','edge',side*.24,-.23,.32,.24,.22,.16,0,0,side*-.28)}for(let i=0;i<4;i++)this.mesh(this.head,'cone','white',(i-1.5)*.12,-.23,.4,.065,.19,.06,Math.PI,0,0);
  for(const side of [-1,1]){this.mesh(p,'cyl','black',side*.52,2.45,-.6,.15,.9,.15);this.mesh(p,'cyl','edge',side*.52,2.95,-.6,.19,.15,.19);}
 }
 buildWeapon(p,type,side){this.mesh(p,'cyl','edge',side*.12,0,0,.22,.55,.22,0,0,Math.PI/2);this.mesh(p,'sphere','black',side*.4,-.2,0,.25,.25,.25);
  if(type==='laser'){this.mesh(p,'box','laser',side*.55,-.35,.13,.68,.8,.7);for(const x of [-.18,.18]){this.mesh(p,'cyl','black',side*.55+x,-.35,.65,.13,1.1,.13,Math.PI/2);this.mesh(p,'cyl','edge',side*.55+x,-.35,1.1,.18,.15,.18,Math.PI/2);this.mesh(p,'cyl','glow',side*.55+x,-.35,1.2,.1,.04,.1,Math.PI/2);}for(let i=0;i<3;i++)this.mesh(p,'box','edge',side*.55,-.1+i*.15,.45,.6,.045,.1);}
  if(type==='charge'){this.mesh(p,'box','ram',side*.58,-.35,.4,.9,.9,.7);for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)this.mesh(p,'cone','edge',side*.58+x*.25,-.35+y*.25,.98,.12,.6,.12,Math.PI/2);}
  if(type==='shield'){this.mesh(p,'box','shield',side*.6,-.25,.45,1,1.6,.35,0,side*-.15,side*.12);this.mesh(p,'box','edge',side*.6,-.25,.67,.12,1.5,.1,0,0,side*.12);for(const y of [-.7,.2])this.mesh(p,'box','edge',side*.6,y,.67,.95,.1,.1);this.mesh(p,'oct','glow',side*.6,-.25,.76,.18,.18,.08);}
  if(type==='rockets'){this.mesh(p,'box','rockets',side*.6,0,0,1,1.3,.8,-.2,0,0);for(let x=-1;x<=1;x++)for(const y of [-.28,.28]){this.mesh(p,'cyl','black',side*.6+x*.27,y,.47,.115,.3,.115,Math.PI/2);this.mesh(p,'cone','red',side*.6+x*.27,y,.72,.1,.25,.1,Math.PI/2);}}
  if(type==='slam'){this.mesh(p,'cyl','edge',side*.5,-.65,.05,.12,1.45,.12,0,0,side*-.15);this.mesh(p,'box','slam',side*.66,-1.1,.2,1.25,.65,.8);for(const x of [-.48,.48])this.mesh(p,'box','edge',side*.66+x,-1.1,.2,.16,.72,.9);this.mesh(p,'box','glow',side*.66,-1.1,.62,.65,.1,.035);}
 }
 draw(ctx,x,y,parts,t,attack,assembly,flash,hp){if(!this.available)return false;
  this.root.rotation.y=-.22+Math.sin(t*.0006)*.12;this.body.position.y=Math.sin(t*.003)*.035;this.head.rotation.y=Math.sin(t*.001)*.12;
  const pulse=1+Math.sin(t*.006)*.06;this.core.scale.set(.23*pulse,.23*pulse,.1);this.mat.glow.emissiveIntensity=flash>0?5:2.2+Math.sin(t*.006)*.6;
  for(let i=0;i<2;i++){const a=this.arms[i],m=parts[i],p=assembly===null?1:Math.max(0,Math.min(1,(assembly-i*1.2)/.9));a.joint.position.x=a.side*(1.25+(1-p)*2);a.joint.rotation.x=attack?.m===m?(attack.t<attack.warn?-.25*Math.min(1,attack.t/attack.warn):Math.sin(t*.04)*.09):Math.sin(t*.002+i)*.04;a.joint.rotation.z=attack?.m==='slam'&&m==='slam'&&attack.t<attack.warn?-a.side*.85:0;for(const [key,v]of Object.entries(a.variants))v.visible=key===m;}
  if(attack?.m==='charge'&&attack.t>=attack.warn)this.body.rotation.x=.22;else this.body.rotation.x=0;
  this.renderer.render(this.scene,this.camera);ctx.save();ctx.fillStyle='#080a0d';ctx.beginPath();ctx.ellipse(x,y+60,88,24,0,0,Math.PI*2);ctx.fill();ctx.restore();ctx.drawImage(this.renderer.domElement,x-210,y-260,420,420);return true;
 }
 info(){return{available:this.available,reason:this.failed,calls:this.renderer?.info.render.calls,geometries:this.renderer?.info.memory.geometries,revision:T.REVISION};}
 dispose(){Object.values(this.geo||{}).forEach(g=>g.dispose());Object.values(this.mat||{}).forEach(m=>m.dispose());this.renderer?.dispose();}
}

