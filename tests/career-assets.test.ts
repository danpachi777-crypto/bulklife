import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../public/assets/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('career-assets-v1.json',root),'utf8'));
function glb(name:string){const b=readFileSync(new URL(name,root));return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());}
test('career athlete exposes the exact authored clips without morph-weight tracks',()=>{
 const g=glb('athlete-v1.glb');assert.deepEqual(g.animations.map((a:any)=>a.name).sort(),[...manifest.clips].sort());
 assert.equal(manifest.clips.length,16);assert.equal(manifest.mandatoryPoses.length,7);
 assert.ok(g.animations.every((a:any)=>a.channels.every((c:any)=>c.target.path!=='weights')));
 assert.equal(g.skins[0].joints.length,17);
});
test('all competition environments are independent static GLBs',()=>{
 assert.equal(manifest.stages.length,8);
 for(const s of manifest.stages){const g=glb(s.url.split('/').at(-1));assert.equal(g.scenes.length,1);assert.ok(!g.skins?.length);assert.ok(!g.animations?.length);assert.equal(g.nodes.filter((n:any)=>n.name?.includes('BL_Athlete')).length,0);}
 for(const file of ['gym-v1.glb','dumbbell-v1.glb']){const g=glb(file);assert.equal(g.scenes.length,1);assert.ok(!g.skins?.length);assert.ok(!g.animations?.length);}
});
