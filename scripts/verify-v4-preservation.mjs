import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const originals=JSON.parse(fs.readFileSync('docs/qa/coach-portrait-v4/original-hashes.json','utf8'));
for(const [path,expected]of Object.entries(originals))assert.equal(hash(fs.readFileSync(path)),expected,path);
let sourceFiles=0;
for(const base of ['assets/sources/makehuman-system-v3','assets/sources/makehuman-clothing-v4']){
  const provenance=JSON.parse(fs.readFileSync(`${base}/provenance.json`,'utf8'));
  for(const f of provenance.files){const bytes=fs.readFileSync(`${base}/${f.path}`);assert.equal(bytes.length,f.bytes,f.path);assert.equal(hash(bytes),f.sha256,f.path);sourceFiles++;}
}
const result={status:'pass',originalFiles:Object.keys(originals).length,licensedSourceFiles:sourceFiles,originals};
fs.writeFileSync('docs/qa/coach-portrait-v4/preservation-report.json',JSON.stringify(result,null,2));console.log(`Preserved ${result.originalFiles} originals and ${sourceFiles} licensed source files`);
