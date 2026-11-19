import {readFileSync,writeFileSync} from 'node:fs';
const p=new URL('../src/core/storage.ts',import.meta.url);let s=readFileSync(p,'utf8');
const start=s.indexOf('export async function save('),end=s.indexOf('export async function readLogs(');
s=s.slice(0,start)+`export async function save(lib:Library,c?:Career,logs:DailySummary[]=[]){
 validateLibrary(lib);if(c){validateCareer(c);if(!lib.ids.includes(c.athlete.id))throw new Error('保存枠が一致しません');logs.forEach(validateSummary);if(logs.some((l,i)=>l.day!==c.athlete.day-logs.length+i))throw new Error('日次記録が連続していません');}
 const d=await db();return new Promise<void>((resolve,reject)=>{
  const t=d.transaction(['meta','careers','days'],'readwrite');
  const failure=()=>reject(new Error('保存できませんでした。以前の保存は保持しています。容量を確認し、再試行してください。'));
  t.oncomplete=()=>resolve();t.onerror=t.onabort=failure;
  try{t.objectStore('meta').put(lib,'library');if(c){t.objectStore('careers').put(c,c.athlete.id);for(const log of logs)t.objectStore('days').put({...log,careerId:c.athlete.id});}}catch(e){t.abort();failure();}
 });
}
`+s.slice(end);
s=s.replace("t.objectStore('meta').put(lib,'library');careers.forEach", "try{t.objectStore('meta').put(lib,'library');careers.forEach");
s=s.replace("t.oncomplete=()=>resolve(lib);t.onerror=()=>reject(t.error);t.onabort=t.onerror;", "t.oncomplete=()=>resolve(lib);t.onerror=()=>reject(t.error);t.onabort=t.onerror;}catch(e){t.abort();reject(e);}");
writeFileSync(p,s);
