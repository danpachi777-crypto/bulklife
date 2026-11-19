import {PARTS,type Career,type BodyState,weight} from './model';
import {FOODS} from './foods';
import {EXERCISES} from './exercises';
import type {CareerProgress} from './careerTypes';
const series=['tokyo','japanClasses','japan','ifbbWorld','regional','amateurOlympia','newYorkPro','olympia'];
const number=(v:unknown,a:number,b:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const string=(v:unknown,max=1000)=>typeof v==='string'&&v.length<=max;
const array=(v:unknown,max:number):v is any[]=>Array.isArray(v)&&v.length<=max;
function fail():never{throw new Error('競技キャリアの保存データが不正です。以前のデータは保持しています。');}
function body(b:any){if(!object(b)||!number(b.height,140,220)||!number(b.shoulder,.8,1.3)||!number(b.fat,0,500)||!number(b.otherLean,1,200)||!number(b.waterDelta,-10,10))fail();for(const field of ['muscle','capacity','fatigue','pump'])if(!object(b[field])||PARTS.some(p=>!number(b[field][p],field==='muscle'||field==='capacity'?.001:0,field==='muscle'||field==='capacity'?100:1)))fail();if(!number(weight(b as BodyState),10,500))fail();}
function score(x:any){if(!object(x)||['mass','balance','symmetry','condition','posing','total'].some(k=>!number(x[k],0,100)))fail();}
export function validateExercisePlans(exercises:unknown){if(!array(exercises,24))fail();for(const e of exercises)if(!object(e)||!EXERCISES.some(x=>x.id===e.exerciseId)||!number(e.load,.5,500)||!Number.isInteger(e.reps)||!number(e.reps,1,30)||!Number.isInteger(e.sets)||!number(e.sets,1,8)||!number(e.rir,0,6)||!number(e.rest,15,600)||!number(e.rom,.5,1)||!['rir','load'].includes(e.priority))fail();}
export function validateProgress(raw:unknown,c:Career):asserts raw is CareerProgress{
 if(!object(raw)||raw.version!==1||raw.rulesVersion!=='2026-jbbf-ifbb-2027oqs-game-1'||raw.contentVersion!=='career-0.2')fail();const p=raw;
 for(const k of ['seed','eventRng','rivalRng'])if(!Number.isInteger(p[k])||!number(p[k],1,4294967295))fail();
 for(const k of ['posing','posingMinutes','cardioMinutes','waterLitres','recoveryUntil','injuryUntil','lastRivalYear','trainingDays'])if(!number(p[k],0,k==='posing'?1:k==='waterLitres'?5:k==='posingMinutes'||k==='cardioMinutes'?60:300000))fail();
 if(p.goal!==null&&!series.includes(p.goal)||p.finalSeason!==null&&!number(p.finalSeason,2027,2600)||!['new','legacyUpgrade'].includes(p.initialSource)||typeof p.coach!=='boolean'||!['gym','home'].includes(p.equipment)||!['foods','aggregate'].includes(p.mealMode)||!['build','maintain','cut','recover'].includes(p.purpose)||!object(p.employmentBase)||['income','work','commute'].some(k=>!number(p.employmentBase[k],0,1e8)))fail();
 if(!array(p.meals,40))fail();for(const m of p.meals)if(!object(m)||!FOODS.some(f=>f.id===m.foodId)||!number(m.grams,1,1500)||!number(m.time,0,23.5))fail();
 if(p.homeEquipmentOwned!==undefined&&typeof p.homeEquipmentOwned!=='boolean')fail();
 if(!object(p.asymmetry)||PARTS.some(k=>!number(p.asymmetry[k],0,1)))fail();
 for(const [field,max] of [['credentials',5000],['entries',10000],['results',10000],['titles',10000],['rivals',10000],['seen',20000],['choices',10000]] as const)if(!array(p[field],max))fail();
 const entryIds=new Set(),resultIds=new Set();
 for(const q of p.credentials)if(!object(q)||!string(q.id,200)||!string(q.kind,200)||!['jbbf','npc'].includes(q.circuit)||!number(q.earnedDay,0,c.athlete.day)||!number(q.expiresDay,q.earnedDay,300000)||q.rulesVersion!==p.rulesVersion||!number(q.season,2027,2600))fail();
 for(const e of p.entries){if(!object(e)||!string(e.id,200)||entryIds.has(e.id)||!series.includes(e.series)||!number(e.season,2027,2600)||!number(e.showDay,0,300000)||!number(e.deadlineDay,0,e.showDay)||!number(e.travelDay,0,e.showDay)||!['entered','travelled','checkedIn','completed','withdrawn'].includes(e.status)||!number(e.entryFee,0,1e7)||!number(e.travelFee,0,1e7)||typeof e.travelPaid!=='boolean'||e.rulesVersion!==p.rulesVersion||!(e.classId===null||string(e.classId,64)))fail();entryIds.add(e.id);if(e.checkInWeight!==undefined&&!number(e.checkInWeight,10,500))fail();}
 for(const r of p.results){
  if(!object(r)||!string(r.id,200)||resultIds.has(r.id)||!entryIds.has(r.entryId)||!series.includes(r.series)||!['jbbf','npc'].includes(r.circuit)||r.category!=='mensBodybuilding'||r.ageClass!=='senior'||r.rulesVersion!==p.rulesVersion||!number(r.day,0,c.athlete.day)||!Number.isInteger(r.classRank)||!number(r.classRank,1,r.classCount)||!number(r.classCount,1,10000)||!number(r.categoryCount,r.classCount,10000)||!array(r.podium,3)||!array(r.rivalResults,1000)||!array(r.rounds,8)||!array(r.notes,100))fail();
  resultIds.add(r.id);body(r.body);score(r.score);for(const person of r.podium){if(!object(person)||!string(person.id,200)||!string(person.name,64)||!number(person.rank,1,3))fail();body(person.body);score(person.score);}
  if(!string(r.editionId,200)||!Number.isInteger(r.season)||!number(r.season,2027,2600)||!string(r.classId,64)||!Number.isInteger(r.classCount)||!Number.isInteger(r.categoryCount)||!Number.isInteger(r.overallCount)||!number(r.overallCount,1,r.categoryCount)||r.overallRank!==null&&(!Number.isInteger(r.overallRank)||!number(r.overallRank,1,r.overallCount))||!number(r.posing,0,1)||r.notes.some((n:any)=>!string(n)))fail();
  if(r.appearance!==undefined&&(!object(r.appearance)||![0,1].includes(r.appearance.hair)||!number(r.appearance.skin,0,1)))fail();
  for(const row of r.rivalResults)if(!object(row)||!string(row.id,200)||!string(row.name,64)||!number(row.rank,1,r.classCount)||!number(row.score,0,100))fail();
  for(const round of r.rounds)if(!object(round)||!string(round.name,100)||!number(round.weight,0,1)||!number(round.rank,1,round.count)||!number(round.count,1,10000))fail();
 }
 for(const t of p.titles){const result=p.results.find((r:any)=>r.id===t.resultId);if(!object(t)||!result||!['worldClass','worldOverall','olympiaOpen'].includes(t.kind)||t.category!=='mensBodybuilding'||t.ageClass!=='senior'||t.rulesVersion!==p.rulesVersion||result.classRank!==1||t.editionId!==result.editionId||!((t.kind==='olympiaOpen'&&result.series==='olympia')||(t.kind!=='olympiaOpen'&&result.series==='ifbbWorld'))||(t.kind==='worldOverall'&&result.overallRank!==1))fail();}
 for(const r of p.rivals){if(!object(r)||!string(r.id,200)||!string(r.name,64)||!number(r.birthYear,1900,2600)||!['jbbf','npc'].includes(r.circuit)||!number(r.posing,0,1)||!number(r.response,0,2)||!number(r.tier,0,3)||typeof r.retired!=='boolean'||!array(r.history,1000))fail();body(r.body);}
 if(p.decision!==null){if(!object(p.decision)||!string(p.decision.id,200)||!['travel','show','entryDeadline','yearReview','finalSeason'].includes(p.decision.kind)||!string(p.decision.text)||p.decision.entryId!==undefined&&!entryIds.has(p.decision.entryId))fail();}
 if(p.retirement!==null){const r=p.retirement;if(!object(r)||c.athlete.status!=='retired'||!number(r.day,0,c.athlete.day)||!['immediate','finalSeason'].includes(r.reason)||!array(r.text,100)||r.text.some((s:any)=>!string(s))||!array(r.titleIds,10000)||!array(r.bestResults,8)||!number(r.years,0,600)||!number(r.muscleChange,-500,500))fail();body(r.finalBody);}
 else if(c.athlete.status==='retired')fail();
 if(p.seen.some((x:any)=>!string(x,200)))fail();for(const choice of p.choices)if(!object(choice)||!string(choice.id,200)||!number(choice.day,0,c.athlete.day)||!string(choice.kind,100)||!string(choice.label))fail();
}
