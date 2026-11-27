import test from "node:test";
import assert from "node:assert/strict";
import {newChallenge,validateChallenge,confirmStrategy,strategyCandidates,runPeriodBatch,nextDecision} from "../src/core/challenge";
import {adoptCalendar,edition,SERIES,entryProblem,qualifier,registerEdition} from "../src/core/seasonCircuit";
import {dateDay} from "../src/core/calendar";

test("one annual registration debits once, survives batch restart and is judged on its date",()=>{
 let r=adoptCalendar(newChallenge("japan",231,"calendar-test"));
 const e=edition(SERIES[0],2027), cash=r.career.athlete.life.money;
 r=registerEdition(r,e.key);assert.equal(r.career.athlete.life.money,cash-e.fee-e.travel);assert.equal(r.records.length,0);
 assert.throws(()=>registerEdition(r,e.key));
 const advance=()=>{const p=strategyCandidates(r).find(x=>!x.contest)!;r=confirmStrategy(r,{...p,budget:1350});while(r.job){r=runPeriodBatch(r,7).run;validateChallenge(r);}r=nextDecision(r);};
 advance();assert.equal(r.records[0].strategy.budget,1350);assert.equal(r.records[0].fact?.person,"coach-kiritani");assert.equal(r.records[0].show,undefined);
 advance();assert.equal(r.records[1].show?.day,e.date);assert.equal(r.records[1].show?.edition,e.key);assert.equal(r.season!.entries[0].state,"finished");assert.equal(r.records.filter(x=>x.show).length,1);
});
test("qualification is tied to prior edition and rank and cannot jump from Japan to the final",()=>{
 const r=adoptCalendar(newChallenge("world",231,"qual"));const model={tier:"national",edition:"japan-2030",rank:3};
 r.records=Array.from({length:20},(_,i)=>({number:i+1,...(i===19?{show:model}:{})})) as typeof r.records;
 assert.equal(qualifier(r,edition(SERIES[4],2031)),"");assert.ok(qualifier(r,edition(SERIES[7],2031)));assert.ok(qualifier(r,edition(SERIES[4],2033)));
 model.rank=4;assert.ok(qualifier(r,edition(SERIES[4],2031)));
});
test("old saves retain history and can be copied into the new seasons",()=>{
 const old=newChallenge("japan",231,"old"),snapshot=JSON.stringify(old);const r=adoptCalendar(old);assert.equal(JSON.stringify(old),snapshot);validateChallenge(r);
 const e=edition(SERIES[1],2027);r.career.athlete.day=e.deadline+1;assert.equal(entryProblem(r,e),"申込終了");r.career.athlete.day=dateDay(2027,8,1);const registered=registerEdition(r,e.key);
 registered.season!.entries[0].state="cancelled";assert.throws(()=>registerEdition(registered,e.key));
});

test("training proposals use the date of the targeted edition",()=>{
 let run=adoptCalendar(newChallenge("japan",231,"calendar-countdown"));
 run=confirmStrategy(run,strategyCandidates(run)[0]);
 while(run.job) run=runPeriodBatch(run,7).run;
 run=nextDecision(run);
 // Isolate calendar proposals from the pending personal invitation.
 delete run.records[0].fact!.next;
 const target=edition(SERIES[1],2027);
 run.season!.target=target.key;
 for(const [weeks,action,minutes] of [[12,"target",55],[8,"rehearse",40],[4,"taper",30]] as const){
   run.career.athlete.day=target.date-weeks*7;
   const proposal=strategyCandidates(run).find(p=>p.id==="turn/entry/"+action);
   assert.ok(proposal,"expected "+action+" at "+weeks+" weeks");
   assert.equal(proposal.minutes,minutes);
 }
});

test("quarterly measurements and the world final keep distinct occurrence IDs",async()=>{
 const {editions,findEdition}=await import("../src/core/seasonCircuit");
 const r=adoptCalendar(newChallenge("world",823,"rounds"));
 const gym=editions(r).filter(e=>e.year===2027&&e.id==="gym");
 assert.equal(gym.length,4);for(const e of gym)assert.deepEqual(findEdition(e.key),e);
 r.records=Array.from({length:38},(_,i)=>({number:i+1,...(i===33?{show:{edition:"qualifier-2033",tier:"world",rank:3}}:{})})) as typeof r.records;
 assert.equal(qualifier(r,edition(SERIES[7],2034)),"");
 assert.ok(qualifier(r,edition(SERIES[7],2035)));
});
