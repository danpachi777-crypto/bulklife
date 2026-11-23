import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const baseline='d10b656';
const paths=execFileSync('git',['ls-tree','-r','--name-only',baseline,'assets','public/assets','src/core'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(p=>p.startsWith('src/core/')||/athlete-v[1-7].*\.(blend|glb)$/.test(p)||p.startsWith('assets/sources/'));
const files=paths.map(path=>{const original=execFileSync('git',['show',`${baseline}:${path}`],{maxBuffer:100*1024*1024});const current=fs.readFileSync(path);const binary=/\.(blend|glb|png|jpg|thumb)$/i.test(path);const normalise=b=>binary?b:Buffer.from(b.toString('utf8').replaceAll('\r\n','\n'));const metadataOnly=path==='src/core/challenge.ts';const expected=metadataOnly?Buffer.from(normalise(original).toString().replace('modelVersion: "portrait-v7"','modelVersion: "anatomy-v8"')):normalise(original);assert.equal(sha(normalise(current)),sha(expected),path);return {path,sha256:sha(current),comparison:metadataOnly?'only new-career modelVersion metadata changed; all calculation code identical':binary?'byte-identical':'text-identical after Git CRLF/LF normalisation',unchanged:!metadataOnly};});
const rows=fs.readFileSync('docs/qa/anatomy-v8/reference/02_IMAGE_INDEX.csv','utf8').trim().split(/\r?\n/).slice(1);
assert.equal(rows.length,60);
for(const row of rows){const columns=row.split(',');const file='docs/qa/anatomy-v8/reference/'+columns.at(-2);assert.equal(sha(fs.readFileSync(file)),columns.at(-1),file);}
fs.writeFileSync('docs/qa/anatomy-v8/preserved-originals.json',JSON.stringify({baseline,files,referencesChecked:60,notes:'Original Blender/GLB and reference PNG files are byte-identical. Calculation/source text is unchanged after Git line-ending normalisation, except the explicit new-career modelVersion label. Existing saves/labels are not rewritten. No browser save was read or modified by this script.'},null,2)+'\n');
console.log(`${files.length-1} original source/core files unchanged,1 creation-version label only, all60 reference PNG hashes preserved.`);
