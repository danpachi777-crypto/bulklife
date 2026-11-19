import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Box3,Vector3,Mesh,SkinnedMesh,AnimationMixer} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {PROFILES} from '../src/core/content.ts';
import {generateCareer} from '../src/core/simulation.ts';
import {morphValues,MAX_CAMERA_DISTANCE,STUDIO_WALL_Z} from '../src/view/bodyMapping.ts';
const bytes=readFileSync(new URL('../public/assets/athlete-v1.glb',import.meta.url));
const load=()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
test('every exported visible mesh has human-scale bounds; no giant clothing spheres',async()=>{
 const g=await load();g.scene.updateMatrixWorld(true);let clothes=0;
 g.scene.traverse(o=>{if(!(o instanceof Mesh))return;(o as SkinnedMesh).skeleton?.update();const size=new Box3().setFromObject(o,true).getSize(new Vector3());assert.ok(Math.max(...size.toArray())<1.9,o.name);if(o.name==='BL_FittedShorts'){clothes++;assert.ok(size.x<.5&&size.y>.24&&size.y<.35&&size.z<.4);}assert.ok(!o.name.startsWith('Archived_'));});assert.equal(clothes,1);
});
test('six bodies and extreme morphs keep clothing on the same skeleton with matching deformation',async()=>{
 const g=await load();const skin=g.scene.getObjectByName('BL_AthleteBody') as SkinnedMesh,shorts=g.scene.getObjectByName('BL_FittedShorts') as SkinnedMesh;
 assert.ok(skin.isSkinnedMesh&&shorts.isSkinnedMesh);assert.deepEqual(shorts.skeleton.bones.map(b=>b.name),skin.skeleton.bones.map(b=>b.name));
 assert.deepEqual(shorts.morphTargetDictionary,skin.morphTargetDictionary);
 const fit=JSON.parse(readFileSync(new URL('../public/assets/shorts-fit-v1.json',import.meta.url),'utf8'));
 const n=shorts.geometry.attributes.position.count;assert.equal(n,fit.bodyVertexIndices.length);
 // Exported indices may be reordered. Match each clothing base vertex to its nearest body surface.
 const bodyPositions=skin.geometry.attributes.position,clothPositions=shorts.geometry.attributes.position;
 const pairs:number[]=[];const a=new Vector3(),b=new Vector3();
 for(let j=0;j<n;j++){a.fromBufferAttribute(clothPositions,j);let best=Infinity,index=-1;for(const i of fit.bodyVertexIndices){b.fromBufferAttribute(bodyPositions,i);const d=a.distanceToSquared(b);if(d<best){best=d;index=i;}}assert.ok(best<.0003);pairs.push(index);}
 const mixer=new AnimationMixer(g.scene);mixer.clipAction(g.animations[0]).play();
 for(let profile=0;profile<6;profile++)for(const variant of ['initial','muscular','fat'] as const){
  const body=generateCareer(PROFILES[profile],40+profile,'bl-asset').athlete.body;
  if(variant==='muscular')for(const k of Object.keys(body.muscle))body.muscle[k as keyof typeof body.muscle]*=1.6;
  if(variant==='fat')body.fat*=2;
  const values=morphValues(body);
  for(const mesh of [skin,shorts])for(const [key,i] of Object.entries(mesh.morphTargetDictionary!))mesh.morphTargetInfluences![i]=values[key as keyof typeof values]??0;
  mixer.update(.23);g.scene.updateMatrixWorld(true);skin.skeleton.update();shorts.skeleton.update();
  const garmentBox=new Box3().setFromObject(shorts,true);assert.ok(garmentBox.getSize(new Vector3()).x<.7);
  // Same morph delta at paired surface points: check conservative spacing under all starts.
  for(let j=0;j<n;j+=7){skin.getVertexPosition(pairs[j],a);shorts.getVertexPosition(j,b);assert.ok(a.distanceTo(b)<.035,`${profile}/${variant}/${j}`);}
 }
});
test('back and side orbit positions remain inside the backdrop wall',()=>{assert.ok(STUDIO_WALL_Z< -MAX_CAMERA_DISTANCE-1);});
