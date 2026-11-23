import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {AnimationMixer,Raycaster,SkinnedMesh,Vector3,Box3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ANATOMY_ROUTES,anatomyBody,type AnatomyRoute} from '../src/view/anatomyCases';
import {anatomyMorphValues,canonicalAnatomyPoint,seatedSupportValues,portraitFloorLift} from '../src/view/bodyMapping';
import {PROFILES} from '../src/core/content';
import {generateCareer} from '../src/core/simulation';
import {selectedRegion} from '../src/view/bodyRegions';
import {portraitFrame,PORTRAIT_FRAMES} from '../src/view/portraitAsset';
import {PARTS} from '../src/core/model';
import {elbowFlexAmounts,shoulderRaiseAmount} from '../src/view/poseCorrection';
import {coveredSkinIndex} from '../src/view/clothingCoverage';
Object.assign(globalThis,{self:globalThis,createImageBitmap:async()=>({width:2048,height:2048,close(){}})});
async function actor(frame:keyof typeof PORTRAIT_FRAMES){const bytes=fs.readFileSync(`public/assets/athlete-v8-${frame}.glb`);return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}

test('all four reference routes keep independent growth/fat and a stable skeleton through intermediate stages',()=>{
 for(const route of Object.keys(ANATOMY_ROUTES) as AnatomyRoute[]){
  const frame=portraitFrame(anatomyBody(route,1).height);
  for(let stage=1;stage<=5;stage+=.25){const b=anatomyBody(route,stage),v=anatomyMorphValues(b);assert.equal(portraitFrame(b.height),frame);assert.ok(v.bodyFat>=0&&v.leanDefinition>=0);assert.ok(!(v.bodyFat>0&&v.leanDefinition>0));assert.ok(Object.values(v).every(Number.isFinite));
   const f=structuredClone(b);f.fat*=1.4;const changed=anatomyMorphValues(f);for(const p of PARTS)assert.equal(v[p],changed[p],`${p} cannot grow just because fat changed`);
  }
 }
 assert.equal(portraitFrame(anatomyBody('D',1).height),portraitFrame(anatomyBody('A',1).height));
});

test('body-inspection shorts hide enclosed skin but retain bare feet, visible waist and lower thighs',async()=>{
 const g=await actor('standard'),skin=g.scene.getObjectByName('BL_V2_AthleteBody') as SkinnedMesh,full=skin.geometry.index!,kept=coveredSkinIndex(skin,'competition')!,triangles=new Set<string>();
 for(let i=0;i<kept.count;i+=3)triangles.add([kept.getX(i),kept.getX(i+1),kept.getX(i+2)].join(','));
 const p=skin.geometry.getAttribute('position');let feet=0,waist=0,covered=0;
 for(let i=0;i<full.count;i+=3){const ids=[full.getX(i),full.getX(i+1),full.getX(i+2)],exists=triangles.has(ids.join(','));
  if(ids.every(v=>p.getY(v)<.10)){feet++;assert.ok(exists,'bare feet must remain visible');}
  if(ids.every(v=>p.getY(v)>.985&&p.getY(v)<1.03&&Math.abs(p.getX(v))<.15)){waist++;assert.ok(exists,'visible waist must not disappear');}
  if(ids.every(v=>p.getY(v)>.83&&p.getY(v)<.95&&Math.abs(p.getX(v))<.15)){covered++;assert.ok(!exists,'enclosed thigh/crotch skin must not poke through the shorts');}
 }
 assert.ok(feet>100&&waist>10&&covered>30);
});

test('all six actual initial athletes meet the actual bench while their shoe soles stay on the floor',async()=>{
 const bytes=fs.readFileSync('public/assets/gym-v4-room.glb'),gym=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gym.scene.updateMatrixWorld(true);
 const cushion=gym.scene.getObjectByName('BenchCushion')??gym.scene.getObjectByName('BL_V4_BenchCushion');assert.ok(cushion);const seat=new Box3().setFromObject(cushion,true);
 for(const profile of PROFILES){
  const b=generateCareer(profile,42,'seat-regression').athlete.body,g=await actor(portraitFrame(b.height)),skin=g.scene.getObjectByName('BL_V2_AthleteBody') as SkinnedMesh,mixer=new AnimationMixer(g.scene);
  mixer.clipAction(g.animations.find(c=>c.name==='SeatedPrepare')!).play();mixer.setTime(6.4);
  const values=anatomyMorphValues(b),support=seatedSupportValues(b.height,values,1);
  g.scene.traverse(o=>{if(o instanceof SkinnedMesh&&o.morphTargetDictionary)for(const [n,i] of Object.entries(o.morphTargetDictionary))o.morphTargetInfluences![i]=(values as Record<string,number>)[n]??support[n]??0;});
  g.scene.scale.set(b.shoulder,b.height/176.5,1);g.scene.position.set(0,portraitFloorLift(b.height,true)*b.height/176.5,-.48);g.scene.updateMatrixWorld(true);skin.skeleton.update();
  const p=skin.geometry.getAttribute('position'),point=new Vector3();let bottom=Infinity,samples=0,sole=Infinity;
  for(let i=0;i<p.count;i++){
   const bind=canonicalAnatomyPoint({x:p.getX(i),y:p.getY(i),z:p.getZ(i)},b.height);if(bind.y<.83||bind.y>1||bind.z>-.01)continue;
   skin.getVertexPosition(i,point);skin.localToWorld(point);if(point.x>seat.min.x+.15&&point.x<seat.max.x-.15&&point.z>seat.min.z+.05&&point.z<seat.max.z-.05){bottom=Math.min(bottom,point.y);samples++;}
  }
  g.scene.getObjectByName('BL_V3_Trainers')!.traverse(o=>{if(o instanceof SkinnedMesh){o.skeleton.update();for(let i=0;i<o.geometry.getAttribute('position').count;i++){o.getVertexPosition(i,point);o.localToWorld(point);sole=Math.min(sole,point.y);}}});
  assert.ok(samples>100);assert.ok(Math.abs(bottom-seat.max.y)<.004,`${profile.id}: seat ${bottom-seat.max.y}`);assert.ok(Math.abs(sole)<.002,`${profile.id}: sole ${sole}`);
 }
});

test('the three actual GLBs retain clips, UVs, skinning, independent fat/lean and content-hashed URLs',async()=>{
 const binds:string[]=[];
 for(const frame of Object.keys(PORTRAIT_FRAMES) as (keyof typeof PORTRAIT_FRAMES)[]){
  const bytes=fs.readFileSync(`public/assets/athlete-v8-${frame}.glb`),meta=JSON.parse(fs.readFileSync(`public/assets/portrait-v8-${frame}.json`,'utf8'));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);assert.ok(PORTRAIT_FRAMES[frame].includes(meta.sha256.slice(0,12)));
  const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.deepEqual(doc.materials.find((m:{name:string})=>m.name==='V8_LicensedFeatheredHair').pbrMetallicRoughness.baseColorFactor,[.30,.235,.18,1],'the Blender hair tint must survive the glTF export');
  assert.equal(doc.materials.find((m:{name:string})=>m.name==='V8_LicensedFeatheredHair').alphaMode,'MASK');
  assert.equal(doc.materials.find((m:{name:string})=>m.name==='V8_LicensedFeatheredHair').alphaCutoff,.18);
  const g=await actor(frame),body=g.scene.getObjectByName('BL_V2_AthleteBody') as SkinnedMesh;
  assert.ok(body.userData.anatomyV8);assert.equal(body.userData.frameV8,frame);assert.equal(body.skeleton.bones.length,50);assert.equal(g.animations.length,19);
  assert.ok(g.animations.every(c=>c.tracks.every(t=>!t.name.includes('morphTargetInfluences'))));
  for(const name of [...PARTS,'bodyFat','leanDefinition','fatSoftening','shoulderRaiseMuscle','elbowMuscleL','seatedHandsMuscle','seatedHandsFat'])assert.ok(body.morphTargetDictionary?.[name]!==undefined,name);
  assert.ok(body.geometry.getAttribute('uv'));assert.ok(body.geometry.getAttribute('skinWeight'));
  binds.push(JSON.stringify(body.skeleton.boneInverses.map(m=>m.elements)));
  const tank=g.scene.getObjectByName('BL_V4_TrainingTank')!;let pieces=0;tank.traverse(o=>{if(o instanceof SkinnedMesh){pieces++;for(const key of ['bodyFat','leanDefinition','seatedCloth','shoulderRaiseMuscle'])assert.ok(o.morphTargetDictionary?.[key]!==undefined,`${frame}/tank/${key}`);}});assert.equal(pieces,2);
 }
 assert.equal(new Set(binds).size,3,'longer limbs/broader frames require actual different rest bones, not only surface inflation');
});

test('front/back body picking uses the actual authored frame in major poses',async()=>{
 for(const [frame,height] of [['standard',176.5],['tall',185],['broad',169]] as const){
  const g=await actor(frame),skin=g.scene.getObjectByName('BL_V2_AthleteBody') as SkinnedMesh,mixer=new AnimationMixer(g.scene);
  for(const clip of ['GymIdle','FrontDoubleBiceps','BackDoubleBiceps']){
   mixer.stopAllAction();mixer.clipAction(g.animations.find(c=>c.name===clip)!).play();mixer.setTime(.8);g.scene.updateMatrixWorld(true);skin.skeleton.update();
   for(const side of [1,-1]){
    const hit=new Raycaster(new Vector3(.08,1.32,side*3),new Vector3(0,0,-side)).intersectObject(skin)[0];assert.ok(hit,`${frame}/${clip}/${side}`);
    const p=skin.geometry.getAttribute('position'),f=hit.face!,bind=new Vector3().fromBufferAttribute(p,f.a).add(new Vector3().fromBufferAttribute(p,f.b)).add(new Vector3().fromBufferAttribute(p,f.c)).multiplyScalar(1/3);
    const canonical=canonicalAnatomyPoint(bind,height),region=selectedRegion(canonical,'athlete-v2');
    assert.ok((canonical.z>0?['chest','upperChest','abs']:['upperBack','lats','erectors','rearDelts']).includes(region??''),`${frame}/${clip}/${side}: ${region}`);
   }
  }
 }
});

test('exported body/garments stay finite through intermediate fat/muscle, seated contact, raised arms and squat',async()=>{
 for(const [frame,route] of [['standard','D'],['tall','B'],['broad','C']] as const){
  const g=await actor(frame),mixer=new AnimationMixer(g.scene),body=g.scene.getObjectByName('BL_V2_AthleteBody') as SkinnedMesh;
  const rest=body.skeleton.boneInverses.map(m=>m.clone());
  for(const stage of [1,2.5,3,4.5,5])for(const clip of ['GymIdle','SeatedPrepare','FrontDoubleBiceps','BackDoubleBiceps','TrainingSquat']){
   mixer.stopAllAction();const action=mixer.clipAction(g.animations.find(c=>c.name===clip)!);action.play();action.time=clip==='SeatedPrepare'?6.4:.8;mixer.update(0);g.scene.updateMatrixWorld(true);
   const qaBody=anatomyBody(route,stage),values=anatomyMorphValues(qaBody),raised=shoulderRaiseAmount(g.scene),elbows=elbowFlexAmounts(g.scene),development=PARTS.reduce((s,p)=>s+Math.max(0,values[p]),0)/(16*1.2),support=seatedSupportValues(qaBody.height,values,clip==='SeatedPrepare'?1:0);
   g.scene.traverse(o=>{if(!(o instanceof SkinnedMesh))return;o.skeleton.update();const d=o.morphTargetDictionary!;if(d)for(const [name,index] of Object.entries(d))o.morphTargetInfluences![index]=(values as Record<string,number>)[name]??({...support,shoulderRaise:raised,shoulderRaiseMuscle:raised*development,elbowFlexL:elbows.L,elbowFlexR:elbows.R,elbowMuscleL:elbows.L*development,elbowMuscleR:elbows.R*development,seatedHandsMuscle:clip==='SeatedPrepare'?development:0,seatedHandsFat:clip==='SeatedPrepare'?values.bodyFat:0,seatedCloth:clip==='SeatedPrepare'?1:0} as Record<string,number>)[name]??0;
    const p=new Vector3();for(let i=0;i<o.geometry.getAttribute('position').count;i+=113){o.getVertexPosition(i,p);assert.ok(p.toArray().every(Number.isFinite),`${frame}/${stage}/${clip}/${o.name}`);assert.ok(p.length()<3,`${frame}/${clip}: vertex exploded`);}
   });
   for(let i=0;i<rest.length;i++)assert.ok(rest[i].equals(body.skeleton.boneInverses[i]),'growth must never move skeletal rest joints');
  }
 }
});
