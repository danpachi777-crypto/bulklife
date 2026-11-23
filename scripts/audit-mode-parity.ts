import assert from 'node:assert/strict';import fs from 'node:fs';
import {newChallenge,strategyCandidates,inspectStrategy,confirmStrategy,runPeriodBatch,nextDecision,continueWorld,validateChallenge} from '../src/core/challenge';
let japan=newChallenge('japan',823,'bl-parity'),world=newChallenge('world',823,'bl-parity');let domestic='';const started=performance.now();
for(let n=1;n<=40;n++){
 const options=strategyCandidates(japan),preferred=n%4===0?2:n%5===0?1:0,p=inspectStrategy(japan,options[preferred]).errors.length?options[0]:options[preferred];
 assert.deepEqual(options,strategyCandidates(world));japan=confirmStrategy(japan,p);world=confirmStrategy(world,p);
 while(japan.job){japan=runPeriodBatch(japan).run;world=runPeriodBatch(world).run;}
 assert.deepEqual(japan.career,world.career);assert.deepEqual(japan.rivals,world.rivals);validateChallenge(japan);validateChallenge(world);
 assert.equal(japan.status,'result');japan=nextDecision(japan);world=nextDecision(world);
 if(n===20){assert.equal(japan.status,'japanEnd');domestic=JSON.stringify(japan.domestic);japan=continueWorld(japan);world=nextDecision(world);}
 if(n%4===0)console.log(`Compared ${n}/40 decisions: identical physical state and opponents`);
}
assert.equal(japan.status,'worldEnd');assert.equal(world.status,'worldEnd');assert.equal(JSON.stringify(japan.domestic),domestic);
fs.writeFileSync('docs/qa/decisions-v6/mode-parity.json',JSON.stringify({pass:true,decisions:40,days:japan.career.athlete.day,domesticUnchanged:true,worldDirect:world.world,extended:japan.world,calculationSeconds:(performance.now()-started)/1000,notes:'Calculation and state parity, not measured human playtime.'},null,2));
