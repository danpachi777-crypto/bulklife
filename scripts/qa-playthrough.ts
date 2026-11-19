import {writeFileSync,mkdirSync} from 'node:fs';
import {playNormalCareer} from './normal-career.ts';
import {generateCareer,freshLibrary} from '../src/core/simulation.ts';
import {PROFILES} from '../src/core/content.ts';
import {validateCareer,validateSummary,validateEnvelope} from '../src/core/validation.ts';
import {packLog} from '../src/core/logCodec.ts';
import {retire} from '../src/core/competitions.ts';
const cases:any[]=[],careers:any[]=[],logs:any[][]=[];
for(const circuit of ['jbbf','npc'] as const)for(let profile=0;profile<6;profile++){
 const seed=profile===4?417:179+profile*103;
 const r=playNormalCareer(profile,seed,circuit);
 if('career'in r){validateCareer(r.career!);r.logRecords!.forEach(validateSummary);validateCareer(retire(r.career!));}
 const record={profile:PROFILES[profile].id,seed,circuit,days:r.day,worldReached:'titles'in r,titles:'titles'in r?r.titles.map(t=>t.kind):[],results:r.trace.filter(t=>t.action==='result'),failure:'failure'in r?r.failure:null};
 cases.push(record);console.log(JSON.stringify({profile:record.profile,circuit,days:r.day,worldReached:record.worldReached}));
 if(profile===4&&'career'in r){const c=structuredClone(r.career!);const old=c.athlete.id;c.athlete.id=`bl-qa-world-${circuit}`;c.athlete.name=`QA ${circuit==='jbbf'?'IFBB世界':'Olympia'}`;for(const result of c.progress!.results){for(const person of result.podium)if(person.id===old){person.id=c.athlete.id;person.name=c.athlete.name;}}careers.push(c);logs.push(r.logRecords!.map(packLog));}
}
const fresh=generateCareer(PROFILES[3],931,'bl-qa-manual');fresh.athlete.name='QA 操作確認';careers.push(fresh);logs.push([]);
const library={...freshLibrary(141,916),ids:careers.map(c=>c.athlete.id),activeId:fresh.athlete.id};
const raw=JSON.stringify({format:'BULK_LIFE',logEncoding:'columns-v1',library,careers,logs});validateEnvelope(raw);
mkdirSync('tmp/playtest',{recursive:true});writeFileSync('tmp/playtest/careers.json',raw);
writeFileSync('docs/qa/playthrough-2026-11-19.json',JSON.stringify({verifiedAt:new Date().toISOString(),method:'normal generated bodies; player plan and official-path game procedures only; local Node simulation, not a browser replay',cases},null,2));
