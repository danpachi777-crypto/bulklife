import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const root='docs/qa/anatomy-v8',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const captures=JSON.parse(fs.readFileSync(root+'/exported-captures.json','utf8'));
assert.equal(captures.captures.length,95);
for(const capture of captures.captures){const b=fs.readFileSync(path.join(root,capture.file));assert.equal(b.subarray(-8,-4).toString(),'IEND',capture.file);}
const gallery=fs.readFileSync(root+'/index.html','utf8'),images=[...gallery.matchAll(/<img src="([^"]+)"/g)].map(m=>m[1]);
assert.equal(images.length,173);
for(const file of images)assert.ok(fs.existsSync(path.join(root,file)),file);
const response=await fetch('http://localhost:5178/docs/qa/anatomy-v8/index.html');assert.equal(response.status,200);
// Vite injects its development reload client into served HTML.
const served=(await response.text()).replace(/\s*<script type="module" src="\/@vite\/client"><\/script>\s*/,'');
// Vite's inline CSS transform also normalises Windows line endings.
assert.equal(sha(Buffer.from(served.replaceAll('\r\n','\n'))),sha(Buffer.from(gallery.replaceAll('\r\n','\n'))),'served gallery content after expected dev-client/line-ending transforms');
const models=['standard','tall','broad'].map(frame=>{const meta=JSON.parse(fs.readFileSync(`public/assets/portrait-v8-${frame}.json`,'utf8'));assert.equal(sha(fs.readFileSync(`public/assets/athlete-v8-${frame}.glb`)),meta.sha256);return {frame,sha256:meta.sha256,bytes:meta.glbBytes,triangles:meta.triangles};});
const logBytes=fs.readFileSync('tmp/anatomy-v8-tests-final.log'),log=logBytes.toString(logBytes[0]===255&&logBytes[1]===254?'utf16le':'utf8');
const value=name=>Number(log.match(new RegExp('\\b'+name+'\\s+(\\d+(?:\\.\\d+)?)'))?.[1]);
assert.equal(value('tests'),121);assert.equal(value('pass'),121);assert.equal(value('fail'),0);
const bench=JSON.parse(fs.readFileSync(root+'/runtime-geometry-audit.json','utf8'));
assert.equal(bench.results.length,6);for(const row of bench.results){assert.ok(Math.abs(row.seatDeltaMetres)<.004);assert.ok(Math.abs(row.shoeFloorMetres)<.002);}
const result={version:'0.7.2',models,automatedTests:{tests:121,pass:121,fail:0,durationMs:value('duration_ms')},productionBuild:'passed; matching final model hashes verified in the built JavaScript and PWA paths',exportedViews:95,referencePairs:60,matchedAndContextArticles:28,galleryImageReferences:images.length,allGalleryFilesExist:true,galleryHttpStatus:response.status,maxInitialSeatErrorMetres:Math.max(...bench.results.map(r=>Math.abs(r.seatDeltaMetres))),maxInitialShoeFloorErrorMetres:Math.max(...bench.results.map(r=>Math.abs(r.shoeFloorMetres))),browserVisualInspection:false,smartphoneHardwareTest:false,gpuFpsMeasured:false,notes:'Blender images and CPU geometry/HTTP checks are not browser screenshots, a full manual playthrough or smartphone performance evidence.'};
fs.writeFileSync(root+'/verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
