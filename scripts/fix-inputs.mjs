import {readFileSync,writeFileSync} from 'node:fs';
const path=new URL('../src/ui/App.tsx',import.meta.url);let s=readFileSync(path,'utf8');
for(const [label,key,min,max,step] of [['開始時刻','start',6,23,.5],['セット単位','sets',1,8,1],['余力 / RIR','rir',0,6,1]]){
 const start=s.indexOf('<label>'+label+'<input'),end=s.indexOf('</label>',start);if(start<0)throw new Error('missing '+label);
 s=s.slice(0,start)+`<NumberField label="${label}" value={d.${key}} min={${min}} max={${max}} step={${step}} disabled={busy} change={value=>editPlan({days:shown.plan.days.map((v,j)=>j===i?{...v,${key}:value}:v)})}/>`+s.slice(end+8);
}
s=s.replace('const lock=useRef(false);','const draftQueue=useRef(Promise.resolve());const lock=useRef(false);');
s=s.replace("setError('');try{await fn();}","setError('');try{await draftQueue.current;await fn();}");
const marker=' const draft=lib?.draft??null';
s=s.replace(marker,` useEffect(()=>{if(!lib?.draft||!lib.draft.athlete.name.trim())return;const current=lib;const timer=setTimeout(()=>{draftQueue.current=draftQueue.current.catch(()=>{}).then(()=>save(current)).then(()=>setNotice('抽選結果と外見を保存しました')).catch(e=>setError(String(e)));},300);return()=>clearTimeout(timer);},[lib]);\n`+marker);
s=s.replace('<button key={key} className={tab===key?', '<button disabled={busy} key={key} className={tab===key?');
s=s.replace('const snapshots=[career.initial,...career.snapshots];','const snapshots=[career.initial,...career.snapshots];if(career.athlete.day>snapshots[snapshots.length-1].day)snapshots.push({day:career.athlete.day,body:career.athlete.body});');
writeFileSync(path,s);
