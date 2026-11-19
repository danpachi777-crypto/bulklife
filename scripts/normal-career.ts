import {generateCareer,advance} from '../src/core/simulation';
import {PROFILES} from '../src/core/content';
import {fatPercent,weight,type Career} from '../src/core/model';
import {edition,editions,eligibility,register,requestApproval,enter,travel,checkIn,runCompetition,acknowledgeDecision,worldCandidate,japanCandidate,japanClassesCandidate,hasCredential,retire} from '../src/core/competitions';
import {seasonOf} from '../src/core/calendar';
import type {Series} from '../src/core/careerTypes';
import {writeFileSync} from 'node:fs';
export function playNormalCareer(profile:number,seed:number,circuit:'jbbf'|'npc'='jbbf'){
 let c=generateCareer(PROFILES[profile],seed,'bl-normal-proof'),logs=0;const logRecords:any[]=[];const trace:any[]=[];
 c={...c,progress:{...c.progress!,posingMinutes:40,coach:true}};
 const interested:Series[]=circuit==='jbbf'?['tokyo','japanClasses','japan','ifbbWorld']:['regional','amateurOlympia','newYorkPro','olympia'];
 for(let step=0;step<365*20;step++){
  if(c.pendingEvent){if(!c.progress!.decision)c=acknowledgeDecision(c);else if(!['travel','show'].includes(c.progress!.decision.kind))c=acknowledgeDecision(c);}
  const year=seasonOf(c.athlete.day);
  for(const kind of (circuit==='jbbf'?['jbbfRegistration','antiDopingCourse','passport','internationalCard']:hasCredential(c,'proCard')?['npcMembership','proActive']:['npcMembership']) as ('jbbfRegistration'|'antiDopingCourse'|'passport'|'internationalCard'|'npcMembership'|'proActive')[]){if(!hasCredential(c,kind))try{c=register(c,kind);}catch{}}
  for(const series of interested){
   const e=edition(series,year);if(c.athlete.day!==e.deadlineDay-8)continue;
   try{if(series==='ifbbWorld')c=requestApproval(c,e,'dispatch');if(e.circuit==='jbbf'||['newYorkPro','olympia'].includes(series))c=requestApproval(c,e);if(eligibility(c,e).allowed){c=enter(c,e);trace.push({action:'enter',series,year,day:c.athlete.day});}}catch{}
  }
  for(const e of [...c.progress!.entries]){
   if(e.status==='entered'&&c.athlete.day>=e.travelDay)try{c=travel(c,e.id);}catch{}
   const current=c.progress!.entries.find(x=>x.id===e.id)!;
   if(current.status==='travelled'&&c.athlete.day===current.showDay)c=checkIn(c,e.id);
   if(c.progress!.entries.find(x=>x.id===e.id)!.status==='checkedIn'){
    c=runCompetition(c,e.id);const r=c.progress!.results.at(-1)!;trace.push({action:'result',series:r.series,year,rank:r.classRank,class:r.classId,score:r.score.total,mass:r.score.mass,pose:r.score.posing});c=acknowledgeDecision(c);
   }
  }
  if(c.progress!.titles.some(t=>circuit==='jbbf'?t.kind==='worldClass':t.kind==='olympiaOpen'))return {profile:PROFILES[profile].id,seed,day:c.athlete.day,logs,logRecords,career:c,titles:c.progress!.titles,trace,body:{weight:weight(c.athlete.body),fat:fatPercent(c.athlete.body)},retirement:retire(c).progress!.retirement};
  const nextShow=c.progress!.entries.filter(e=>['entered','travelled'].includes(e.status)).sort((a,b)=>a.showDay-b.showDay)[0];
  const nextPossible=editions(c).filter(e=>e.circuit===circuit&&e.showDay>c.athlete.day&&(circuit==='jbbf'?['tokyo','japanClasses','japan','ifbbWorld'].includes(e.series):hasCredential(c,'proActive')?['newYorkPro','olympia'].includes(e.series):['regional','amateurOlympia'].includes(e.series))).sort((a,b)=>a.showDay-b.showDay)[0];
  const preparing=(nextShow&&nextShow.showDay-c.athlete.day<180)||(nextPossible&&nextPossible.showDay-c.athlete.day<120);
  const targetFat=preparing?6:13,fat=fatPercent(c.athlete.body),calories=weight(c.athlete.body)*29+(fat>targetFat+.4?-450:fat<targetFat-.4?220:preparing?30:160);
  c={...c,plan:{...c.plan,calories:Math.round(Math.max(1000,Math.min(5000,calories))/50)*50,protein:Math.round(Math.min(250,weight(c.athlete.body)*1.9))}};
  const r=advance(c,1);if(!r.logs.length&&!r.career.pendingEvent)throw new Error('silent stop');c=r.career;logs+=r.logs.length;logRecords.push(...r.logs);
 }
 return {profile:PROFILES[profile].id,seed,day:c.athlete.day,logs,logRecords,career:c,trace,body:{weight:weight(c.athlete.body),fat:fatPercent(c.athlete.body)},failure:'world not reached within this run (up to 20 years)'};
}
if(process.argv[1]?.endsWith("normal-career.ts")){
const circuit=process.argv.includes('--npc')?'npc':'jbbf';
const results=[];for(const [profile,seed] of [[4,417],[0,179],[2,591]]){const r=playNormalCareer(profile,seed,circuit);results.push(r);console.log(JSON.stringify({profile:r.profile,seed,day:r.day,title:'titles'in r?r.titles.map(t=>t.kind):[],latest:r.trace.slice(-4)}));if('titles'in r)break;}
writeFileSync(circuit==='npc'?'docs/qa/normal-pro-career-proof.json':'docs/qa/normal-career-proof.json',JSON.stringify({verifiedAt:'2026-11-19',mode:'normal-generation-no-body-or-ability-overrides',results:results.map(r=>{const {career,logRecords,...record}=r as any;return record;})},null,2));
}
