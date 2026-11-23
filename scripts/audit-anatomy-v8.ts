import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {AnimationMixer,Box3,Mesh,SkinnedMesh,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {PROFILES} from '../src/core/content';
import {generateCareer} from '../src/core/simulation';
import {anatomyMorphValues,canonicalAnatomyPoint,seatedSupportValues,portraitFloorLift} from '../src/view/bodyMapping';
import {portraitFrame} from '../src/view/portraitAsset';
import {PARTS} from '../src/core/model';
Object.assign(globalThis,{self:globalThis,createImageBitmap:async()=>({width:2048,height:2048,close(){}})});
async function load(path:string){const b=fs.readFileSync(path);return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
const gym=await load('public/assets/gym-v4-room.glb');gym.scene.updateMatrixWorld(true);
const cushion=gym.scene.getObjectByName('BenchCushion')??gym.scene.getObjectByName('BL_V4_BenchCushion');
if(!cushion)throw Error('Real exported bench cushion not found');
const seat=new Box3().setFromObject(cushion,true),results=[];
for(const profile of PROFILES){
 const body=generateCareer(profile,42,'bl-seat-audit').athlete.body,frame=portraitFrame(body.height),start=performance.now(),g=await load(`public/assets/athlete-v8-${frame}.glb`),parseMilliseconds=performance.now()-start;
 const skin=g.scene.getObjectByName('BL_V2_AthleteBody') as SkinnedMesh;
 const mixer=new AnimationMixer(g.scene);mixer.clipAction(g.animations.find(c=>c.name==='SeatedPrepare')!).play();mixer.setTime(6.4);
 const values=anatomyMorphValues(body),development=(Math.max(0,values.quads)+Math.max(0,values.hamstrings))/2.4;
 g.scene.traverse(o=>{if(o instanceof Mesh&&o.morphTargetDictionary)for(const [n,i] of Object.entries(o.morphTargetDictionary))o.morphTargetInfluences![i]=(values as Record<string,number>)[n]??({seatedCloth:1,seatedHandsMuscle:development,seatedHandsFat:values.bodyFat,...seatedSupportValues(body.height,values,1)} as Record<string,number>)[n]??0;});
 g.scene.scale.set(body.shoulder,body.height/176.5,1);g.scene.position.set(0,portraitFloorLift(body.height,true)*body.height/176.5,-.48);g.scene.updateMatrixWorld(true);skin.skeleton.update();
 const p=skin.geometry.getAttribute('position'),position=new Vector3(),butt=[];
 for(let i=0;i<p.count;i++){
  const bind=canonicalAnatomyPoint({x:p.getX(i),y:p.getY(i),z:p.getZ(i)},body.height);if(bind.y<.83||bind.y>1.0||bind.z>-.01)continue;
  skin.getVertexPosition(i,position);skin.localToWorld(position);
  if(position.x>seat.min.x+.15&&position.x<seat.max.x-.15&&position.z>seat.min.z+.05&&position.z<seat.max.z-.05)butt.push(position.y);
 }
 butt.sort((a,b)=>a-b);let soleMin=Infinity;const shoes=g.scene.getObjectByName('BL_V3_Trainers')!;
 shoes.traverse(o=>{if(o instanceof SkinnedMesh){o.skeleton.update();for(let i=0;i<o.geometry.getAttribute('position').count;i++){o.getVertexPosition(i,position);o.localToWorld(position);soleMin=Math.min(soleMin,position.y);}}});
 results.push({profile:profile.id,height:body.height,frame,parseMilliseconds,seatTopMetres:seat.max.y,buttBottomMetres:butt[0],butt5PercentileMetres:butt[Math.floor(butt.length*.05)],seatDeltaMetres:butt[0]-seat.max.y,shoeFloorMetres:soleMin,samples:butt.length});
}
fs.writeFileSync('docs/qa/anatomy-v8/runtime-geometry-audit.json',JSON.stringify({environment:`Node ${process.version} / ${process.platform}; CPU glTF decoding and geometry only; not browser or GPU FPS`,benchBounds:{min:seat.min.toArray(),max:seat.max.toArray()},results},null,2));
console.log(JSON.stringify(results.map(r=>({profile:r.profile,frame:r.frame,seatDelta:r.seatDeltaMetres,shoeFloor:r.shoeFloorMetres,samples:r.samples})),null,2));
