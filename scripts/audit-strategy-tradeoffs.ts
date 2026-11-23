import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newChallenge,strategyCandidates,inspectStrategy,confirmStrategy,runPeriodBatch,nextDecision,validateChallenge} from '../src/core/challenge';
import {muscleMass,fatPercent} from '../src/core/model';
import {scoreLocal,localPerson} from '../src/core/localCompetitions';
import type {Strategy} from '../src/core/challengeTypes';
const output=[];
for(const seed of [823,42,918]) for(const policy of ['balanced','volume','spend','work','no-stage']){
 let r=newChallenge('world',seed,`audit-${seed}-${policy}`);let shortages=0,rest=0,sets=0;
 for(let n=1;n<=40;n++){
  const options=strategyCandidates(r);let p:Strategy=structuredClone(options[n%4===0&&policy!=='no-stage'?2:0]);
  if(policy==='volume')Object.assign(p,{minutes:90,effort:'hard',posing:5,sleep:7});
  if(policy==='spend')Object.assign(p,{budget:2500,foodStyle:'quick',coach:true});
  if(policy==='work')Object.assign(p,{workRatio:1.2,minutes:30,posing:10,coach:false});
  if(policy==='no-stage')p.contest=null;
  if(inspectStrategy(r,p).errors.length){p=options[0];if(policy==='no-stage')p.contest=null;}
  r=confirmStrategy(r,p);while(r.job)r=runPeriodBatch(r).run;
  const rec=r.records.at(-1)!;shortages+=rec.stats.shortDays;rest+=rec.stats.restDays;sets+=rec.stats.sets;
  validateChallenge(r);r=nextDecision(r);if(r.status==='japanEnd')r=nextDecision(r);
 }
 assert.equal(r.status,'worldEnd');assert.equal(r.records.length,40);
 if(policy==='no-stage'){assert.equal(r.world!.best,null);assert.equal(r.world!.title,null);}
 const summary={seed,profile:r.career.athlete.profileId,policy,days:r.career.athlete.day,muscle:muscleMass(r.career.athlete.body),fat:fatPercent(r.career.athlete.body),money:r.career.athlete.life.money,score:scoreLocal(localPerson(r.career)),best:r.world!.best,title:r.world!.title,shortages,rest,sets};
 output.push(summary);console.log(JSON.stringify(summary));
 fs.writeFileSync('docs/qa/decisions-v6/strategy-tradeoffs.json',JSON.stringify({kind:'automated calculation; not fun or human playtime validation',runs:output},null,2));
}
