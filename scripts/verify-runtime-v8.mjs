import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const base=process.env.BULK_LIFE_VERIFY_URL??'http://localhost:5178';
const module=fs.readFileSync('src/view/portraitAsset.ts','utf8'),source=await (await fetch(base+'/src/view/portraitAsset.ts')).text(),models=[];
const bundle=fs.readdirSync('dist/assets').filter(p=>p.endsWith('.js')).map(p=>fs.readFileSync('dist/assets/'+p,'utf8')).join('\n');
for(const frame of ['standard','tall','broad']){
 const meta=JSON.parse(fs.readFileSync(`public/assets/portrait-v8-${frame}.json`,'utf8')),url=`/assets/athlete-v8-${frame}.glb?revision=${meta.sha256.slice(0,12)}`;
 assert.ok(module.includes(url)&&source.includes(url),'the running Vite server must resolve the same content-hashed URL');
 assert.ok(bundle.includes(meta.sha256.slice(0,12)),'production JavaScript must refer to the same final model hash');
 const response=await fetch(base+url);assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(digest(bytes),meta.sha256);
 assert.ok(meta.morphs.includes('seatedSeatMid'));assert.ok(meta.groomRevision.includes('145 short connected'));
 models.push({frame,url,status:response.status,sha256:meta.sha256,bytes:bytes.length,triangles:meta.triangles});
}
const sw=fs.readFileSync('dist/sw.js','utf8');
for(const {frame} of models)assert.ok(sw.includes(`/assets/athlete-v8-${frame}.glb`));
assert.ok(!sw.includes('/assets/athlete-v7.glb'),'old preserved actor must not be in the new precache');
const receipt={base,models,metadataOnly:'creation modelVersion label updated; simulation unchanged',notes:'HTTP responses and content hashes verified. This does not claim browser rendering, interaction, offline installation or smartphone FPS.'};
fs.writeFileSync('docs/qa/anatomy-v8/runtime-paths.json',JSON.stringify(receipt,null,2)+'\n');
console.log('Three real HTTP GLB responses match the generated URLs and local content hashes; PWA paths are current.');
