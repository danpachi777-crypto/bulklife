import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { backgrounds,prefectures,profile,originFor,validOrigin } from "../src/core/lifeStory";
import { newChallenge,strategyCandidates,confirmStrategy,runPeriodBatch,inspectStrategy,nextDecision,validateChallenge } from "../src/core/challenge";
import { muscleMass } from "../src/core/model";
const seed=42;
assert.equal(new Set(prefectures).size,47);
assert.equal(new Set(backgrounds.map(b=>b[0])).size,60);
assert.deepEqual(backgrounds.map(x=>x[0]),Array.from({length:60},(_,i)=>"B"+String(i+1).padStart(2,"0")));
assert.ok(backgrounds.every(row=>row.length===8&&row.every(Boolean)));
const base=newChallenge("japan",seed,"life-audit");
for(let i=0;i<60;i++)for(const birth of prefectures){
  const o=originFor(seed,i,birth),r={...base,origin:o};
  assert.ok(validOrigin(o,seed));
  assert.ok(profile(o).origin.includes(birth));
  assert.equal(strategyCandidates(r).length,3);
  assert.ok(strategyCandidates(r).some(p=>!inspectStrategy(r,p).errors.length));
}
console.log("2820 origins open a playable first decision");
const outcomes=[];
for(const [label,idx,contest] of [["日常",0,false],["指導",1,true],["技術",2,true],["地域",0,true],["複合",1,true]] as const){
  let r=newChallenge("japan",label==="複合"?823:seed,"route-"+idx),first="";
  delete r.storyVersion; // Reproduce the archived v1 domestic routes.
  for(let n=1;n<=20;n++){
    const plans=strategyCandidates(r);
    let pick:number=n%4===0 && contest ? 2:idx;
    if(label==="地域" && n>8)pick=0;
    if(inspectStrategy(r,plans[pick]).errors.length)pick=plans.findIndex(p=>!inspectStrategy(r,p).errors.length);
    assert.ok(pick>=0);
    let plan=plans[pick];
    if(label==="複合"){
      plan={...plan,id:"custom",name:"指導と自主練を組み合わせる",goal:"build",posing:60,minutes:60,coach:true,workRatio:.8,sleep:8.5};
      if(n>=14)plan.goal="cut";
      if(inspectStrategy(r,plan).errors.length)plan.workRatio=1;
    }
    r=confirmStrategy(r,plan);while(r.job)r=runPeriodBatch(r).run;
    if(n===1)first=r.records[0].strategy.name;
    r=nextDecision(r);
  }
  validateChallenge(r);
  outcomes.push({label,seed:r.seed,first,decisions:r.records.length,history:r.records.map(x=>({event:x.strategy.id,choice:x.strategy.name,stage:x.show?.tier,rank:x.show?.rank})),best:r.domestic!.best,muscle:muscleMass(r.domestic!.body),money:r.domestic!.money});
  console.log(label,r.domestic!.best);
}
writeFileSync("docs/qa/life-story/routes.json",JSON.stringify({seed,combinations:2820,outcomes},null,2));
