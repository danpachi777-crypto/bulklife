import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {PROFILES} from '../src/core/content';
import {PARTS} from '../src/core/model';
import {generateCareer,advance,freshLibrary,simulateDay} from '../src/core/simulation';
import {setupCoach,proposeCoach,adoptCoach,prepareCoachDay,markManual,coachReview,decideReview,explainCoachResult,weeklyCoach} from '../src/core/coach';
import {nutritionPlan} from '../src/core/nutrition';
import {sessionMinutes} from '../src/core/exercises';
import {validateCareer} from '../src/core/validation';
import {save,loadCareer,exportSave,parseImport} from '../src/core/storage';
const make=()=>generateCareer(PROFILES[0],42,'bl-coach-test');
test('six unchanged draws support beginner plans within real time and budget',()=>{
 for(const profile of PROFILES){const base=generateCareer(profile,42,'bl-coach-'+profile.id);const rng=base.rng;const c=setupCoach(base);validateCareer(c);assert.equal(base.coachingGuide,undefined);assert.equal(c.rng,rng);assert.deepEqual(c.athlete,base.athlete);assert.ok(sessionMinutes(c.plan.days[0].exercises!)<=45);assert.ok(nutritionPlan(c).cost<=850);}
});
test('30 minutes reduces actual sets and stimulus instead of granting the same training',()=>{
 const base=make(),short=adoptCoach(base,proposeCoach(base,{minutes:30})),long=adoptCoach(base,proposeCoach(base,{minutes:60}));
 const a=simulateDay(short)!,b=simulateDay(long)!;assert.ok(a.summary.training.duration<=.5);assert.ok(a.summary.training.completedSets<b.summary.training.completedSets);assert.ok(a.summary.muscleDelta<b.summary.muscleDelta);assert.ok(sessionMinutes(short.plan.days[0].exercises!)<=30);
});
test('fatigue and a rest consultation change the executable plan',()=>{
 const c=make();c.athlete.systemicFatigue=.82;assert.equal(proposeCoach(c).training.focus,'rest');const selected=adoptCoach(make(),proposeCoach(make(),{},true),['training']);assert.equal(selected.plan.days[0].focus,'rest');assert.equal(simulateDay(selected)!.summary.training.completedSets,0);
 const base=make(),light=simulateDay(adoptCoach(base,proposeCoach(base,{effort:'light'})))!,standard=simulateDay(adoptCoach(base,proposeCoach(base,{effort:'standard'})))!;
 assert.equal(light.summary.training.rir,5);assert.equal(standard.summary.training.rir,3);
 assert.ok(PARTS.reduce((n,p)=>n+light.summary.training.stimulus[p],0)<PARTS.reduce((n,p)=>n+standard.summary.training.stimulus[p],0));
 assert.ok(light.career.athlete.systemicFatigue<=standard.career.athlete.systemicFatigue);
});
test('meal choices change real preparation, cost and nourishment; no invented minimum calories',()=>{
 const c=make(),cheap=adoptCoach(c,proposeCoach(c,{foodStyle:'budget',budget:850})),quick=adoptCoach(c,proposeCoach(c,{foodStyle:'quick',budget:850}));
 const a=nutritionPlan(cheap),b=nutritionPlan(quick);assert.ok(a.prep>b.prep);assert.notEqual(a.cost,b.cost);assert.notEqual(a.calories,b.calories);
 const low=adoptCoach(c,proposeCoach(c,{foodStyle:'quick',budget:300})),p=proposeCoach(c,{foodStyle:'quick',budget:300}),result=simulateDay(low)!;
 assert.ok(nutritionPlan(low).calories<1000);assert.ok(Math.abs(result.summary.meal.calories-p.food.calories)<1);assert.equal(result.summary.meal.cost,p.food.cost);assert.equal(result.summary.meal.prep,p.food.prep);validateCareer(low);
});
test('proposals are pure; partial adoption and manual sections survive next-day renewal',()=>{
 const c=setupCoach(make()),original=structuredClone(c);const p=proposeCoach(c,{minutes:30,foodStyle:'quick',budget:1200});assert.deepEqual(c,original);
 const changed=adoptCoach(c,p,['training']);assert.deepEqual(nutritionPlan(changed),nutritionPlan(c));assert.deepEqual(changed.plan.sleep,c.plan.sleep);
 const manual=markManual(changed,['training','food']);manual.plan.days[1]={focus:'legs',sets:1,rir:5,start:18};manual.athlete.day=1;
 assert.deepEqual(prepareCoachDay(manual),manual);
});
test('coach bookkeeping preserves growth/RNG and a bulk week uses the adopted plan',()=>{
 const c=setupCoach(make()),plain=structuredClone(c);delete plain.coachingGuide;
 const a=advance(c,7),b=advance(plain,7);assert.deepEqual(a.logs.map(x=>({training:x.training,traces:x.traces,weight:x.weight})),b.logs.map(x=>({training:x.training,traces:x.traces,weight:x.weight})));assert.equal(a.career.rng,b.career.rng);assert.deepEqual(a.career.athlete.body,b.career.athlete.body);assert.deepEqual(a.career.plan,c.plan);assert.equal(a.career.coachingGuide!.samples.length,7);assert.ok(weeklyCoach(a.career));
});
test('meal review uses fourteen days, needs approval, and has cooldown and reversal guard',()=>{
 let c=setupCoach(make(),{budget:1800});c.athlete.day=14;c.coachingGuide!.samples=Array.from({length:14},(_,day)=>({day,weight:66+day*.15,muscle:26+day*.002,fat:18,fatigue:.2,sleep:8,plannedSets:8,completedSets:8,minutes:30,calories:2200,cost:900,mealRatio:1,expenditure:2000,focus:'full'}));
 const initial=nutritionPlan(c).calories;assert.equal(coachReview({...c,coachingGuide:{...c.coachingGuide!,samples:c.coachingGuide!.samples.slice(0,13)}}),null);
 const r=coachReview(c)!;assert.equal(r.kind,'food');assert.equal(nutritionPlan(c).calories,initial);
 const accepted=decideReview(c,true);assert.ok(nutritionPlan(accepted).calories<initial);assert.equal(coachReview(accepted),null);assert.equal(coachReview(decideReview(c,false)),null);
});
test('reasoned results use recorded actuals and name incomplete sessions honestly',()=>{
 const c=setupCoach(make());c.plan.days[0].start=10;const s=simulateDay(c)!.summary;const e=explainCoachResult(s);assert.match(e.what,/一部/);assert.match(e.meaning,/勤務/);
});
test('coach preferences and manual ownership persist, old saves stay unchanged, corrupt metadata is rejected',async()=>{
 const c=markManual(setupCoach(make()),['food']);const lib={...freshLibrary(3,4),activeId:c.athlete.id,ids:[c.athlete.id]};await save(lib,c);const restored=await loadCareer(c.athlete.id);assert.deepEqual(restored,c);assert.deepEqual(parseImport(await exportSave(lib)).careers[0].coachingGuide,c.coachingGuide);
 const legacy=make();validateCareer(legacy);assert.equal(legacy.coachingGuide,undefined);const bad=structuredClone(c);bad.coachingGuide!.budget=NaN;assert.throws(()=>validateCareer(bad));
});
