import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IDBObjectStore} from 'fake-indexeddb';
import {PROFILES} from '../src/core/content.ts';
import {generateCareer,advance,freshLibrary,drawDraft} from '../src/core/simulation.ts';
import {loadLibrary,loadCareer,save,readLogs,exportSave,parseImport,importSave,validateCareer} from '../src/core/storage.ts';
const create=(i:number,id:string)=>generateCareer(PROFILES[i],15936+i,id);
test('all six play through a year, persist, restore, export and import without overwriting',async()=>{
 let lib=freshLibrary(6789,8357);const originals=[];
 for(let i=0;i<6;i++){
  let c=create(i,'bl-e2e-'+i);lib={...lib,ids:[...lib.ids,c.athlete.id],activeId:c.athlete.id};await save(lib,c);
  for(let day=0;day<364;day+=7){const result=advance(c,7);assert.equal(result.logs.length,7);c=result.career;await save(lib,c,result.logs);}
  const result=advance(c,1);c=result.career;await save(lib,c,result.logs);originals.push(c);
  assert.deepEqual(await loadCareer(c.athlete.id),c);assert.equal((await readLogs(c.athlete.id)).length,365);
  assert.deepEqual(advance(await loadCareer(c.athlete.id),7),advance(c,7));
 }
 assert.deepEqual(await loadLibrary(),lib);
 const envelope=parseImport(await exportSave(lib));assert.equal(envelope.careers.length,6);
 const merged=await importSave(envelope,lib);assert.equal(merged.ids.length,12);assert.equal(new Set(merged.ids).size,12);
 for(let i=0;i<6;i++){assert.deepEqual(await loadCareer(originals[i].athlete.id),originals[i]);const copy=await loadCareer(merged.ids[i+6]);copy.athlete.id=originals[i].athlete.id;assert.deepEqual(copy,originals[i]);assert.equal((await readLogs(merged.ids[i+6])).length,365);}
});
test('synchronous quota failure aborts metadata, career and logs together',async()=>{
 const c=create(0,'bl-atomic');const lib={...freshLibrary(2,3),ids:[c.athlete.id],activeId:c.athlete.id};await save(lib,c);
 const next=advance(c,7),nextLib={...lib,drawRng:123};
 const put=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(...args:any[]){if(this.name==='days')throw new DOMException('Full','QuotaExceededError');return put.apply(this,args as any);};
 try{await assert.rejects(save(nextLib,next.career,next.logs));}finally{IDBObjectStore.prototype.put=put;}
 assert.deepEqual(await loadLibrary(),lib);assert.deepEqual(await loadCareer(c.athlete.id),c);assert.equal((await readLogs(c.athlete.id)).length,0);
 await save(nextLib,next.career,next.logs);assert.equal((await readLogs(c.athlete.id)).length,7);
});
test('damaged summaries, duplicate/missing dates and future saves are rejected',()=>{
 const r=advance(create(0,'bl-invalid'),7),lib={...freshLibrary(2,3),ids:['bl-invalid'],activeId:'bl-invalid'};
 const envelope={format:'BULK_LIFE',library:lib,careers:[r.career],logs:[r.logs]};
 const badTrace=structuredClone(envelope);badTrace.careers[0].lastSummary!.traces=[];assert.throws(()=>parseImport(JSON.stringify(badTrace)));
 const badLog=structuredClone(envelope);badLog.logs[0][2].day=1;assert.throws(()=>parseImport(JSON.stringify(badLog)));
 const missing=structuredClone(envelope);missing.logs[0].pop();assert.throws(()=>parseImport(JSON.stringify(missing)));
 const badNumber=structuredClone(r.career);badNumber.athlete.appearance.skin=NaN;assert.throws(()=>validateCareer(badNumber));
});
test('saved plan and pending draft appearance survive reload and round trip',async()=>{
 const c=create(3,'bl-template');c.savedPlan=structuredClone(c.plan);c.savedPlan.days[0].focus='legs';
 let lib=drawDraft({...freshLibrary(24,25),ids:[c.athlete.id],activeId:c.athlete.id},'bl-draft-persist');lib.draft!.athlete.name='確認用';lib.draft!.athlete.appearance.hair=1;
 await save(lib,c);assert.deepEqual((await loadCareer(c.athlete.id)).savedPlan,c.savedPlan);assert.deepEqual((await loadLibrary())!.draft,lib.draft);
 const copy=parseImport(await exportSave(lib));assert.deepEqual(copy.careers[0].savedPlan,c.savedPlan);assert.equal(copy.library.draft!.athlete.name,'確認用');
});
test('failed import rolls back active slot and preserves the original athlete',async()=>{const c=create(1,'bl-import-atomic'),lib={...freshLibrary(5,6),ids:[c.athlete.id],activeId:c.athlete.id};await save(lib,c);const data=parseImport(await exportSave(lib)),put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args:any[]){if(this.name==='careers')throw new DOMException('Full','QuotaExceededError');return put.apply(this,args as any);};try{await assert.rejects(importSave(data,lib));}finally{IDBObjectStore.prototype.put=put;}assert.deepEqual(await loadLibrary(),lib);assert.deepEqual(await loadCareer(c.athlete.id),c);});
