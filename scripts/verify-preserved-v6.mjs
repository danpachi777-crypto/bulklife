import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=execFileSync('git',['ls-files','assets/blender','public/assets'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(p=>/athlete-v[2-5].*\.(blend|glb)$/.test(p));
const files=names.map(path=>{
 const original=execFileSync('git',['show',`33ce450:${path}`],{maxBuffer:100*1024*1024});
 const current=fs.readFileSync(path);assert.equal(sha(current),sha(original),path);
 return {path,bytes:current.length,sha256:sha(current),unchanged:true};
});
assert.ok(files.length>=8);
fs.writeFileSync('docs/qa/decisions-v6/preserved-originals.json',JSON.stringify({baseline:'33ce450',files,notes:'Original source and distributed assets compared by content hash, not only timestamps.'},null,2)+'\n');
console.log(`${files.length} original Blender/GLB files are byte-identical to 33ce450.`);
