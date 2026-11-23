import fs from 'node:fs';
import assert from 'node:assert/strict';
import {newChallenge,strategyCandidates,inspectStrategy,confirmStrategy,runPeriodBatch,nextDecision,validateChallenge} from '../src/core/challenge';
let r=newChallenge('world',823,'world-title-proof');
for(let n=1;n<=40;n++){
 const options=strategyCandidates(r);let p={...options[n%4===0?2:0],posing:60,minutes:60,sleep:8.5,coach:true,workRatio:.8};
 if(inspectStrategy(r,p).errors.length)p={...p,workRatio:1};
 assert.equal(inspectStrategy(r,p).errors.length,0);
 r=confirmStrategy(r,p);while(r.job)r=runPeriodBatch(r).run;validateChallenge(r);
 const s=r.records.at(-1)?.show;if(s)console.log(n,s.tier,s.rank,s.score.total);
 r=nextDecision(r);if(r.status==='japanEnd')r=nextDecision(r);
}
fs.writeFileSync('docs/qa/decisions-v6/world-title-audit.json',JSON.stringify({kind:'automated legal custom strategy; no fixed bonuses',ending:r.world,shows:r.records.flatMap(v=>v.show?[{decision:v.number,...v.show}]:[]),seed:r.seed,profile:r.career.athlete.profileId},null,2));
