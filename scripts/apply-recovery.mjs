import {readFileSync,writeFileSync} from 'node:fs';
const p=new URL('../src/core/simulation.ts',import.meta.url);let s=readFileSync(p,'utf8');
s=s.replace(' const work=a.day%7<5?'," const onTrip=!!c.progress?.entries.some(e=>['travelled','checkedIn'].includes(e.status)&&a.day>=e.travelDay&&a.day<=e.showDay);\n const work=!onTrip&&a.day%7<5?");
s=s.replace('commute=a.day%7<5?', 'commute=!onTrip&&a.day%7<5?');
s=s.replace(' const timeAvailable=Math.max(0,Math.min(window.available,24-work-commute-actualSleep-prep-3-extraMinutes/60));', ' const recoveryHours=c.progress&&a.day<c.progress.recoveryUntil?(c.progress.recoveryUntil-a.day>14?.35:.65):24;\n const timeAvailable=Math.max(0,Math.min(window.available,recoveryHours,24-work-commute-actualSleep-prep-3-extraMinutes/60));');
s=s.replace(' const expenditure=weight(b)*29'," if(onTrip||c.progress&&a.day<c.progress.injuryUntil){completed=0;duration=0;stimulus=partMap(()=>0);if(exerciseActuals)exerciseActuals=exerciseActuals.map(e=>({...e,sets:[],reason:onTrip?'大会遠征のため休養':'違和感の回復期間のため休養'}));}\n const expenditure=weight(b)*29");
s=s.replace(' const reason=overlap?', " const reason=onTrip?'大会遠征のため練習を休みました。':c.progress&&a.day<c.progress.injuryUntil?'違和感の回復期間のため練習を休みました。':overlap?");
writeFileSync(p,s);
const pkg=new URL('../package.json',import.meta.url),lock=new URL('../package-lock.json',import.meta.url);let json=JSON.parse(readFileSync(pkg,'utf8'));json.version='0.2.0';writeFileSync(pkg,JSON.stringify(json,null,2)+'\n');json=JSON.parse(readFileSync(lock,'utf8'));json.version='0.2.0';json.packages[''].version='0.2.0';writeFileSync(lock,JSON.stringify(json,null,2)+'\n');
