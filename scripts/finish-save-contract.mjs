import {readFileSync,writeFileSync} from 'node:fs';
let p=new URL('../src/core/storage.ts',import.meta.url),s=readFileSync(p,'utf8');
s=s.replace("const careers=data.careers.map(c=>({...c,athlete:{...c.athlete,id:'bl-'+crypto.randomUUID()}}));", "const careers=data.careers.map(original=>{const c=structuredClone(original),old=c.athlete.id;c.athlete.id='bl-'+crypto.randomUUID();if(c.progress)for(const result of c.progress.results)for(const person of result.podium)if(person.id===old)person.id=c.athlete.id;validateCareer(c);return c;});");
writeFileSync(p,s);
p=new URL('../src/core/validation.ts',import.meta.url);s=readFileSync(p,'utf8').replace('raw.length>50_000_000','raw.length>250_000_000').replace('50MBを超えています','250MBを超えています');writeFileSync(p,s);
p=new URL('./normal-career.ts',import.meta.url);s=readFileSync(p,'utf8').replace('logs=0;const trace:any[]=[];','logs=0;const logRecords:any[]=[];const trace:any[]=[];').replace('logs,career:c,titles:', 'logs,logRecords,career:c,titles:').replace('logs+=r.logs.length;','logs+=r.logs.length;logRecords.push(...r.logs);').replace('const {career,...record}=r as any;','const {career,logRecords,...record}=r as any;');writeFileSync(p,s);
