import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Vector3,AnimationMixer} from 'three';
const root=new URL('../',import.meta.url),manifest=JSON.parse(readFileSync(new URL('public/assets/career-assets-v1.json',root),'utf8'));
const load=async name=>{const b=readFileSync(new URL('public/assets/'+name,root));return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
const g=await load('athlete-v1.glb');
assert.deepEqual(g.animations.map(c=>c.name).sort(),[...manifest.clips].sort());
assert.ok(g.animations.every(c=>c.tracks.every(t=>!t.name.endsWith('.morphTargetInfluences'))));
const body=g.scene.getObjectByName('BL_AthleteBody'),shorts=g.scene.getObjectByName('BL_FittedShorts');
assert.equal(body.skeleton.bones.length,17);assert.equal(body.morphTargetInfluences.length,18);assert.equal(shorts.morphTargetInfluences.length,18);
const mixer=new AnimationMixer(g.scene),rows=[];let frames=0;
for(const height of [169,172,175,178,181,185])for(const variant of ['initial','developed','fat']){
 for(const mesh of [body,shorts])for(const [name,index] of Object.entries(mesh.morphTargetDictionary))mesh.morphTargetInfluences[index]=variant==='developed'&&name!=='bodyFat'&&name!=='pump'?.8:variant==='fat'&&name==='bodyFat'?.7:0;
 g.scene.scale.set(height/172,height/176.5,1);
 for(const clip of g.animations){
  mixer.stopAllAction();const action=mixer.clipAction(clip);action.play();
  let low=Infinity,high=-Infinity,maxWidth=0;
  const values=[...body.morphTargetInfluences];
  for(const fraction of [0,.25,.5,.75,.99]){
   mixer.setTime(clip.duration*fraction);g.scene.updateMatrixWorld(true);g.scene.traverse(o=>o.skeleton?.update());
   const box=new Box3().setFromObject(g.scene,true),size=box.getSize(new Vector3());
   assert.ok([...box.min.toArray(),...box.max.toArray()].every(Number.isFinite),`${clip.name}: finite bounds`);
   assert.ok(box.min.y>-.10,`${clip.name}/${height}/${variant}: below ground ${box.min.y}`);
   assert.ok(box.min.y<.08,`${clip.name}/${height}/${variant}: floating ${box.min.y}`);
   assert.ok(size.y>1.2&&size.y<2.6,`${clip.name}: vertical athlete ${size.y}`);
   assert.ok(size.x<2&&size.z<2,`${clip.name}: exploding surface`);
   assert.deepEqual(body.morphTargetInfluences,values,`${clip.name}: development reset by animation`);
   low=Math.min(low,box.min.y);high=Math.max(high,box.max.y);maxWidth=Math.max(maxWidth,size.x);frames++;
  }
  rows.push({height,variant,clip:clip.name,minY:low,maxY:high,maxWidth});
 }
}
const environments=[];
for(const file of [...manifest.stages.map(s=>s.url.split('/').at(-1)),'gym-v1.glb','dumbbell-v1.glb']){
 const env=await load(file);assert.equal(env.scenes.length,1,file+' single active scene');let meshes=0,skins=0;env.scene.traverse(o=>{if(o.isMesh)meshes++;if(o.isSkinnedMesh)skins++;});assert.equal(skins,0,file+' no athlete contamination');assert.equal(env.animations.length,0);environments.push({file,meshes,skins});
}
const report={version:'career-assets-v1',checkedFrames:frames,athleteCases:rows.length,clips:manifest.clips,environments,results:rows,limitations:['CPU glTF deformation and Blender render QA; final browser performance is a separate application check','17-bone rig has no independent finger articulation; grips are simplified','Initial stylized human mesh retains approximate anatomy']};
writeFileSync(new URL('docs/qa/career-assets-report.json',root),JSON.stringify(report,null,2));
console.log(JSON.stringify({clips:g.animations.length,checkedFrames:frames,athleteCases:rows.length,environments:environments.length,status:'pass'}));
