import {readFileSync,writeFileSync} from 'node:fs';
const path=new URL('../src/core/storage.ts',import.meta.url);let s=readFileSync(path,'utf8');
s=s.replace("import {PARTS,VERSIONS,type Career,type Library,type DailySummary} from './model';","import {type Career,type Library,type DailySummary} from './model';\nimport {validateCareer,validateLibrary,validateSummary,validateEnvelope} from './validation';\nexport {validateCareer,validateLibrary} from './validation';");
const start=s.indexOf('function obj('),end=s.indexOf('export async function exportSave');if(start<0||end<start)throw new Error('unexpected storage source');s=s.slice(0,start)+s.slice(end);
const p=s.indexOf('export function parseImport('),q=s.indexOf('export async function importSave');s=s.slice(0,p)+"export const parseImport=validateEnvelope;\n"+s.slice(q);
s=s.replace('if(c)validateCareer(c);const d=',"if(c){validateCareer(c);if(!lib.ids.includes(c.athlete.id))throw new Error('保存枠が一致しません');logs.forEach(validateSummary);if(logs.some((l,i)=>l.day!==c.athlete.day-logs.length+i))throw new Error('日次記録が連続していません');}const d=");
s=s.replace('r.onsuccess=()=>resolve(r.result.map(({careerId,...v})=>v));',"r.onsuccess=()=>{try{const logs=r.result.map(({careerId,...v})=>v);logs.forEach(validateSummary);resolve(logs);}catch(e){reject(e);}};");
writeFileSync(path,s);
