import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Mesh,SkinnedMesh,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {coveredSkinIndex} from '../src/view/clothingCoverage';
import {belongsToHair,stabilizeHairMaterial} from '../src/view/portraitMaterials';
Object.assign(globalThis,{self:globalThis,createImageBitmap:async()=>({width:1024,height:1024,close(){}})});
async function actor(){const b=fs.readFileSync('public/assets/athlete-v7.glb');return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
test('real exported layered hair retains depth occlusion after conversion from glTF alpha blending',async()=>{
 const g=await actor();const hair:Mesh[]=[];g.scene.traverse(o=>{if(o instanceof Mesh&&belongsToHair(o))hair.push(o);});
 assert.ok(g.animations.every(c=>c.tracks.every(t=>!t.name.includes('morphTargetInfluences'))),'animations must leave growth/fat targets to the simulation');
 assert.equal(hair.length,6);let blended=0;
 assert.ok(hair.every(m=>m.morphTargetDictionary?.bodyFat!==undefined),'every hair primitive must follow the actual head-fat shape');
 for(const mesh of hair)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
  if(m.transparent){blended++;assert.equal(m.depthWrite,false);}
  stabilizeHairMaterial(m);assert.equal(m.depthWrite,true);assert.equal(m.transparent,false);
 }
 assert.ok(blended>0,'fixture must include the actual alpha-card material which caused the regression');
});
test('tailored binding shares body targets and waist triangles remain visible below the hem',async()=>{
 const g=await actor(),tank=g.scene.getObjectByName('BL_V4_TrainingTank')!;let pieces=0;
 tank.traverse(o=>{if(o instanceof SkinnedMesh){pieces++;assert.ok(o.morphTargetDictionary!.seatedCloth!==undefined);assert.ok(o.morphTargetDictionary!.bodyFat!==undefined);assert.ok(o.morphTargetDictionary!.shoulderRaise!==undefined);assert.ok(o.geometry.getAttribute('skinWeight').count>0);}});
 assert.equal(pieces,2,'cloth and sewn binding must both be skinned');
 const body=g.scene.getObjectByName('BL_V2_AthleteBody') as SkinnedMesh;assert.ok(body.userData.v7Sculpt);
 const full=body.geometry.index!,kept=coveredSkinIndex(body)!;const keys=new Set<string>();
 for(let i=0;i<kept.count;i+=3)keys.add([kept.getX(i),kept.getX(i+1),kept.getX(i+2)].join(','));
 const p=body.geometry.getAttribute('position');let waist=0;
 for(let i=0;i<full.count;i+=3){const tri=[full.getX(i),full.getX(i+1),full.getX(i+2)];if(tri.every(v=>p.getY(v)>.98&&p.getY(v)<1.04&&Math.abs(p.getX(v))<.15)){waist++;assert.ok(keys.has(tri.join(',')),'visible waist skin must not disappear with the outfit');}}
 assert.ok(waist>20);
});
