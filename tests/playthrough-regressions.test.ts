import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateCareer,advance,planIssues} from '../src/core/simulation.ts';
import {PROFILES} from '../src/core/content.ts';
import {useMealTemplate} from '../src/core/nutrition.ts';
import {executeExercises} from '../src/core/training.ts';
import {register,edition,requestApproval,enter,travel,checkIn,runCompetition,retire,acknowledgeDecision} from '../src/core/competitions.ts';
import {validateCareer,validateSummary} from '../src/core/validation.ts';
import {changeEquipment,changeEmployment} from '../src/core/progress.ts';
import {sessionMinutes,exerciseRecipe} from '../src/core/exercises.ts';
import {VERSIONS} from '../src/core/model.ts';

const base=()=>generateCareer(PROFILES[4],417,'bl-playtest');
test('0.2.0 saves load unchanged and record the patch version on the next simulated day',()=>{
 const c=advance(base(),7).career;c.versions={...VERSIONS,simulation:'0.2.0'};const before=structuredClone(c);
 validateCareer(c);assert.deepEqual(c,before);const next=advance(c,1);assert.equal(next.logs.length,1);assert.equal(next.career.versions.simulation,'0.2.1');assert.deepEqual(c,before);assert.deepEqual(next.career.snapshots,c.snapshots);validateCareer(next.career);
});
function resultCareer(){let c=register(base(),'npcMembership');const e=edition('regional',2027);c=enter(c,e);c=advance(c,e.travelDay).career;c=travel(c,c.progress!.entries[0].id);c=advance(c,e.showDay-c.athlete.day).career;c=checkIn(c,c.progress!.entries[0].id);return runCompetition(c,c.progress!.entries[0].id);}

test('unaffordable food cannot provide the planned micronutrients or food water',()=>{
 const c=useMealTemplate(base(),'maintain');c.athlete.life.money=0;c.athlete.life.income=0;c.progress!.waterLitres=.5;
 const r=advance(c,1),n=r.logs[0].meal.nutrients!;
 assert.equal(r.logs[0].meal.calories,0);assert.equal(n.water,0);assert.equal(n.coverage,0);assert.equal(n.hydration,.8);
});

test('actual repetitions determine the time needed by a fixed-load set',()=>{
 const c=base(),d={...c.plan.days[0],focus:'push' as const,exercises:[{exerciseId:'bench',load:.5,reps:10,sets:1,rir:0,rest:90,rom:1,priority:'load' as const}]};
 const actual=executeExercises(c,d,1,1,false),set=actual.exercises[0].sets[0];
 assert.equal(set.reps,30);assert.ok(Math.abs(actual.duration-(8/60+2/60+(set.reps*3+90)/3600))<1e-10);
 assert.equal(executeExercises(c,d,.205,1,false).completed,0);
});

test('pro Active registration cannot bypass the same-year federation restriction',()=>{
 const c=register(base(),'jbbfRegistration');c.progress!.credentials.push({id:'verified-prior-card',kind:'proCard',circuit:'npc',season:2027,earnedDay:0,expiresDay:200000,rulesVersion:c.progress!.rulesVersion});
 assert.throws(()=>register(c,'proActive'));
});

test('malformed result presentation data is rejected before it can crash a screen',()=>{
 const original=resultCareer();validateCareer(original);
 for(const mutate of [
  (r:any)=>{r.classId={bad:true};},
  (r:any)=>{r.notes=[{bad:true}];},
  (r:any)=>{delete r.body.shoulder;},
  (r:any)=>{r.overallRank={bad:true};},
  (r:any)=>{r.appearance={hair:9,skin:'bad'};}
 ]){const c=structuredClone(original);mutate(c.progress!.results[0]);assert.throws(()=>validateCareer(c));}
});

test('retired athletes cannot receive new competition approvals',()=>{
 const c=retire(register(register(base(),'jbbfRegistration'),'antiDopingCourse'));
 assert.throws(()=>requestApproval(c,edition('tokyo',2027)));
 assert.throws(()=>changeEmployment(c,.8));assert.throws(()=>changeEquipment(c,'home'));
});

test('home equipment is purchased once and survives switching back to the gym',()=>{
 const c=base(),initial=c.athlete.life.money;
 const home=changeEquipment(c,'home');assert.equal(home.athlete.life.money,initial-20000);
 const gym=changeEquipment(home,'gym'),again=changeEquipment(gym,'home');
 assert.equal(again.athlete.life.money,initial-20000);assert.equal(again.athlete.life.gymMonthly,1500);
 assert.equal(c.athlete.life.money,initial);validateCareer(again);
 const legacy=structuredClone(home);delete legacy.progress!.homeEquipmentOwned;
 assert.equal(changeEquipment(changeEquipment(legacy,'gym'),'home').athlete.life.money,initial-20000);
 const debt=structuredClone(gym);debt.athlete.life.money=-100;
 assert.equal(changeEquipment(debt,'home').athlete.life.money,-100);
});

test('schedule warnings account for daily posing and cardio, including rest days',()=>{
 const c=generateCareer(PROFILES[0],17,'bl-time-budget');c.plan.sleep=10;c.plan.prep=2;c.plan.days[0].focus='rest';c.progress!.posingMinutes=60;c.progress!.cardioMinutes=60;
 assert.ok(advance(c,1).logs[0].sleep.hours<c.plan.sleep);
 assert.ok(planIssues(c,0).some(t=>t.includes('24時間')));assert.equal(sessionMinutes([]),0);
});

test('an extreme but valid food plan still produces a saveable capped intake',()=>{
 const c=base();c.progress!.mealMode='foods';c.progress!.meals=Array.from({length:4},()=>({foodId:'chicken-breast',grams:1500,time:12}));
 validateCareer(c);const result=advance(c,1);validateSummary(result.logs[0]);validateCareer(result.career);
 assert.ok(result.logs[0].meal.calories<=10000);
});

test('the daily explanation names missing equipment when it caused skipped sets',()=>{
 const c=changeEquipment(base(),'home');c.plan.days[0].exercises=exerciseRecipe('full',2);
 const r=advance(c,1);assert.ok(r.logs[0].training.completedSets<r.logs[0].training.plannedSets);
 assert.match(r.logs[0].training.reason,/設備/);
});

test('all six profiles remain saveable across three years of changing real plans',()=>{
 for(let profile=0;profile<6;profile++)for(const seed of [17,417,9901]){
  let c=generateCareer(PROFILES[profile],seed,'bl-policy-'+profile+'-'+seed);
  for(let month=0;month<36;month++){
   c=useMealTemplate(c,(['build','cut','recover','maintain'] as const)[month%4]);
   c=changeEmployment(c,[1,.8,1.1][month%3]);if(month===2)c=changeEquipment(c,'home');if(month===5)c=changeEquipment(c,'gym');
   c.plan.days=c.plan.days.map((d,i)=>({...d,focus:i%2===0?'full':'rest',exercises:exerciseRecipe(i%2===0?'full':'rest',month%3+1)}));
   c.progress!.cardioMinutes=(month%4)*15;c.progress!.posingMinutes=(month%3)*20;
   for(let day=0;day<28;day++){
    if(c.pendingEvent)c=acknowledgeDecision(c);
    const result=advance(c,1);assert.equal(result.logs.length,1);validateSummary(result.logs[0]);c=result.career;
   }
   validateCareer(c);
  }
  assert.equal(c.athlete.day,1008);
 }
});
