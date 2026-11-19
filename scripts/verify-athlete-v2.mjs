import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Vector3,AnimationMixer} from 'three';
const root=new URL('../',import.meta.url),path=new URL('public/assets/athlete-v2.glb',root),meta=JSON.parse(fs.readFileSync(new URL('public/assets/regions-v2.json',root),'utf8'));
const bytes=fs.readFileSync(path),jsonLength=bytes.readUInt32LE(12),gltfJSON=JSON.parse(bytes.subarray(20,20+jsonLength).toString()),binOffset=20+jsonLength+8,bin=bytes.subarray(binOffset);
// CPU image loading preserves decoded dimensions only. Blender and the actual
// browser verify image appearance; geometry/skinning use the real GLTFLoader.
globalThis.self=globalThis;globalThis.createImageBitmap=async blob=>{const b=Buffer.from(await blob.arrayBuffer());return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),close(){}};};
const textures=[];
for(const image of gltfJSON.images??[]){
 const v=gltfJSON.bufferViews[image.bufferView],b=bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);assert.equal(b.toString('ascii',1,4),'PNG');const w=b.readUInt32BE(16),h=b.readUInt32BE(20);assert.ok(w>=512&&h>=512);let at=8,idat=[];
 while(at<b.length){const n=b.readUInt32BE(at),type=b.toString('ascii',at+4,at+8);if(type==='IDAT')idat.push(b.subarray(at+8,at+8+n));at+=12+n;}assert.ok(zlib.inflateSync(Buffer.concat(idat)).length>w*h);textures.push({name:image.name,width:w,height:h});
}
const g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
assert.deepEqual(g.animations.map(x=>x.name).sort(),[...meta.clips].sort());assert.ok(gltfJSON.animations.every(a=>a.channels.every(c=>c.target.path!=='weights')));
const body=g.scene.getObjectByName(meta.body),shorts=g.scene.getObjectByName(meta.garment);assert.ok(body?.isSkinnedMesh&&shorts?.isSkinnedMesh);assert.equal(body.skeleton.bones.length,50);assert.equal(body.morphTargetInfluences.length,18);assert.ok(body.geometry.attributes.color);assert.ok(body.material.normalMap);assert.ok(body.material.roughnessMap);
const mixer=new AnimationMixer(g.scene),records=[];let frames=0;
for(const height of [169,172,175,178,181,185])for(const variant of ['initial','developed','fat']){
 for(const mesh of [body,shorts])for(const [name,index] of Object.entries(mesh.morphTargetDictionary))mesh.morphTargetInfluences[index]=variant==='developed'&&!['bodyFat','pump'].includes(name)?1:variant==='fat'&&name==='bodyFat'?.8:0;
 g.scene.scale.set(height/172,height/177,1);
 for(const clip of g.animations){
  mixer.stopAllAction();const a=mixer.clipAction(clip);a.play();let minY=Infinity,maxY=-Infinity;
  const keep=[...body.morphTargetInfluences];
  for(const fraction of [0,.25,.5,.75,.99]){
   mixer.setTime(clip.duration*fraction);g.scene.updateMatrixWorld(true);g.scene.traverse(o=>o.skeleton?.update());const box=new Box3().setFromObject(g.scene,true),size=box.getSize(new Vector3());
   assert.ok([...box.min.toArray(),...box.max.toArray()].every(Number.isFinite));assert.ok(size.y>1.15&&size.y<2.6,`${clip.name} height ${size.y}`);assert.ok(size.x<2&&size.z<2,`${clip.name} deformed surface`);assert.ok(box.min.y>-.10&&box.min.y<.12,`${height}/${variant}/${clip.name} ground ${box.min.y}`);assert.deepEqual(body.morphTargetInfluences,keep);minY=Math.min(minY,box.min.y);maxY=Math.max(maxY,box.max.y);frames++;
  }
  records.push({height,variant,clip:clip.name,minY,maxY});
 }
}
const extremeRecords=[];
g.scene.scale.set(1,1,1);
for(const name of meta.morphs)for(const value of [-.6,1.5]){
 for(const mesh of [body,shorts])for(const [key,index] of Object.entries(mesh.morphTargetDictionary))mesh.morphTargetInfluences[index]=key===name?value:0;
 const delta=body.geometry.morphAttributes.position[body.morphTargetDictionary[name]];let maxDelta=0;
 for(let i=0;i<delta.count;i++)maxDelta=Math.max(maxDelta,Math.hypot(delta.getX(i),delta.getY(i),delta.getZ(i)));
 assert.ok(maxDelta>.001,`${name} must alter underlying geometry`);
 for(const clipName of ['Idle','FrontDoubleBiceps','TrainingSquat']){
  mixer.stopAllAction();const clip=g.animations.find(a=>a.name===clipName);mixer.clipAction(clip).play();mixer.setTime(clip.duration*.5);g.scene.updateMatrixWorld(true);g.scene.traverse(o=>o.skeleton?.update());
  const box=new Box3().setFromObject(g.scene,true);assert.ok([...box.min.toArray(),...box.max.toArray()].every(Number.isFinite));assert.ok(box.min.y>-.10&&box.max.y<2.6);frames++;
 }
 extremeRecords.push({name,value,maxDelta});
}
const hashes={};for(const name of ['athlete-v1.glb','bulk-life-athlete-v1.blend']){
 const current=fs.readFileSync(new URL(name.endsWith('.glb')?'public/assets/'+name:'assets/blender/'+name,root)),backup=new URL('tmp/redesign-backup/'+name,root);hashes[name]=crypto.createHash('sha256').update(current).digest('hex');if(fs.existsSync(backup))assert.equal(hashes[name],crypto.createHash('sha256').update(fs.readFileSync(backup)).digest('hex'),name+' v1 preserved');
}
const report={version:'athlete-v2',status:'pass',checkedFrames:frames,cases:records.length,bones:50,morphs:18,clips:meta.clips,glbBytes:bytes.length,renderTriangles:meta.renderTriangles,textures,v1PreservedHashes:hashes,records,extremeRecords,limits:['CPU texture validation checks PNG data/dimensions; actual browser image decode and performance are checked separately','Face/hand anatomy comes from the CC0 pinned source plus game-specific rig and surface authoring','No claim of medical anatomy measurement or exact real-life muscle prediction']};
report.glbSha256=crypto.createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(new URL('docs/qa/athlete-v2/',root),{recursive:true});fs.writeFileSync(new URL('docs/qa/athlete-v2/report.json',root),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,frames,cases:records.length,bones:50,morphs:18,textures,bytes:bytes.length,triangles:meta.renderTriangles}));
