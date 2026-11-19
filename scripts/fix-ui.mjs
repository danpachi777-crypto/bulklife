import {readFileSync,writeFileSync} from 'node:fs';
const path=new URL('../src/ui/App.tsx',import.meta.url);let s=readFileSync(path,'utf8');
s=s.replace(",[savedTemplate,setSavedTemplate]=useState<Career['plan']|null>(null)","");
s=s.replace("if(!l){l=drawDraft(freshLibrary(seed(),seed()),id());await save(l);}","if(!l||(!l.activeId&&!l.draft)){l=drawDraft(l??freshLibrary(seed(),seed()),id());await save(l);}");
s=s.replace("onClick={()=>{setSavedTemplate(structuredClone(shown.plan));setNotice('このセッションにテンプレートを保存しました');}}", "disabled={busy} onClick={()=>void run(()=>commit({...shown,savedPlan:structuredClone(shown.plan)}))}");
s=s.replace('disabled={!savedTemplate||busy} onClick={()=>savedTemplate&&editPlan(savedTemplate)}','disabled={!shown.savedPlan||busy} onClick={()=>shown.savedPlan&&editPlan(shown.savedPlan)}');
s=s.replace('!shown.tutorialHidden&&a.day<14','!shown.tutorialHidden');
s=s.replace('<small>22歳からのキャリア</small>','<small>{a.ageAtStart}歳からのキャリア</small>');
s=s.replace("URL.revokeObjectURL(url);setNotice", "setTimeout(()=>URL.revokeObjectURL(url),60000);setNotice");
s=s.replace('<NumberField label=', '<NumberField disabled={busy} label=');
s=s.replace('睡眠予定・当日実績 {l.sleep.hours}h','睡眠予定 {l.sleep.plannedHours??l.sleep.hours}h / 当日実績 {l.sleep.hours}h');
const start=s.indexOf('function NumberField('),end=s.indexOf('function HistoryChart(');
if(start<0||end<start)throw new Error('unexpected UI source');
s=s.slice(0,start)+`function NumberField({label,value,min,max,step,change,disabled=false}:{label:string;value:number;min:number;max:number;step:number;change:(n:number)=>void;disabled?:boolean}){
 const [input,setInput]=useState(String(value)),[invalid,setInvalid]=useState(false);
 useEffect(()=>{setInput(String(value));setInvalid(false);},[value]);
 const commit=()=>{const v=Number(input);if(input.trim()===''||!Number.isFinite(v)||v<min||v>max||Math.abs((v-min)/step-Math.round((v-min)/step))>1e-6){setInvalid(true);return;}setInvalid(false);if(v!==value)change(v);};
 return <label>{label}<input type="number" value={input} min={min} max={max} step={step} disabled={disabled} aria-invalid={invalid} onChange={e=>{setInput(e.target.value);setInvalid(false);}} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){setInput(String(value));setInvalid(false);}}}/>{invalid&&<small role="alert">{min}〜{max}を{step}刻みで入力してください。計画は変更していません。</small>}</label>;
}
`+s.slice(end);
writeFileSync(path,s);
