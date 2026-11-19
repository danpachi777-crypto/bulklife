import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playNormalCareer} from '../scripts/normal-career.ts';
import {validateCareer} from '../src/core/validation.ts';
import {advance,freshLibrary} from '../src/core/simulation.ts';
import {seasonOf} from '../src/core/calendar.ts';
import {retire,acknowledgeDecision,register,requestApproval,enter,travel,checkIn,runCompetition,edition,hasOlympiaQualification} from '../src/core/competitions.ts';
import {save,loadCareer,exportSave,parseImport,importSave,readLogs} from '../src/core/storage.ts';
import type {Career} from '../src/core/model.ts';
test('normal P5 seed 417 reaches an IFBB senior class world title through real growth and qualifications',()=>{
 const result=playNormalCareer(4,417,'jbbf');assert.ok('career'in result);const c=result.career!;validateCareer(c);assert.ok(c.progress!.titles.some(t=>t.kind==='worldClass'));assert.ok(!c.progress!.titles.some(t=>t.kind==='olympiaOpen'));
 const world=c.progress!.results.find(r=>r.series==='ifbbWorld'&&r.classRank===1)!;assert.ok(world.classCount>=3);assert.ok(c.progress!.credentials.some(q=>q.kind===`dispatch:${world.editionId}`));assert.ok(c.progress!.results.some(r=>r.series==='japan'&&r.classRank<=3));assert.ok(c.athlete.day>1000);assert.equal(c.athlete.status,'active');const ended=retire(c);validateCareer(ended);assert.equal(ended.progress!.retirement!.titleIds.length,c.progress!.titles.length);
});
test('normal pro career wins Olympia, can continue and lose without erasing its title, then retires',()=>{
 const result=playNormalCareer(4,417,'npc');assert.ok('career'in result);let c=result.career!;validateCareer(c);assert.ok(c.progress!.titles.some(t=>t.kind==='olympiaOpen'));assert.ok(!c.progress!.titles.some(t=>t.kind==='worldClass'));assert.ok(c.progress!.credentials.some(q=>q.kind==='proCard'));
 const olympia=c.progress!.results.find(r=>r.series==='olympia'&&r.classRank===1)!;assert.deepEqual(olympia.rounds.map(r=>r.weight),[.5,.5]);const titles=structuredClone(c.progress!.titles);c=acknowledgeDecision(c);const nextYear=seasonOf(c.athlete.day)+1;
 c={...c,plan:{...c.plan,calories:4000,days:c.plan.days.map(d=>({...d,focus:'rest',exercises:[]}))}};
 const show=edition('newYorkPro',nextYear);c=advance(c,show.deadlineDay-10-c.athlete.day).career;c=register(c,'proActive');c=requestApproval(c,show);c=enter(c,show);c=advance(c,show.travelDay-c.athlete.day).career;c=travel(c,c.progress!.entries.at(-1)!.id);c=advance(c,show.showDay-c.athlete.day).career;c=checkIn(c,c.progress!.entries.at(-1)!.id);c=runCompetition(c,c.progress!.entries.at(-1)!.id);
 assert.ok(c.progress!.results.at(-1)!.classRank>1);assert.deepEqual(c.progress!.titles,titles);assert.ok(hasOlympiaQualification(c,nextYear));const retired=retire(c);validateCareer(retired);assert.equal(retired.athlete.status,'retired');assert.deepEqual(retired.progress!.titles,titles);assert.equal(advance(retired,7).logs.length,0);
});
test('a complete world-winning and retired career round-trips with every daily log and remapped stage identity',async()=>{
 const result=playNormalCareer(4,417,'jbbf');assert.ok('career'in result);const c=retire(result.career!),lib={...freshLibrary(4,5),ids:[c.athlete.id],activeId:c.athlete.id};
 await save(lib,c,result.logRecords);assert.deepEqual(await loadCareer(c.athlete.id),c);assert.equal((await readLogs(c.athlete.id)).length,c.athlete.day);
 const data=parseImport(await exportSave(lib));const imported=await importSave(data,lib),copy=await loadCareer(imported.activeId!);assert.notEqual(copy.athlete.id,c.athlete.id);assert.equal(copy.athlete.status,'retired');assert.deepEqual(copy.progress!.titles,c.progress!.titles);assert.equal(copy.progress!.results.length,c.progress!.results.length);const last=copy.progress!.results.at(-1)!;assert.ok(last.podium.some(p=>p.id===copy.athlete.id));assert.ok(!last.podium.some(p=>p.id===c.athlete.id));validateCareer(copy);
});
