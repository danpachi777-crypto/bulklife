import {clamp,partMap,type Career,type DayPlan,type PartMap} from './model';
import {exerciseById,exerciseCapacity,sessionMinutes} from './exercises';
import type {ExerciseActual} from './careerTypes';
export function executeExercises(c:Career,d:DayPlan,availableHours:number,readiness:number,overlap:boolean){
 const plans=d.focus==='rest'?[]:d.exercises??[],body=c.athlete.body,skill=c.athlete.ability,base=c.initial.body.muscle;
 let used=0,completed=0,planned=0;const stimulus=partMap(()=>0),actuals:ExerciseActual[]=[];
 const injured=!!c.progress&&c.athlete.day<c.progress.injuryUntil;
 for(const plan of plans){const e=exerciseById(plan.exerciseId);if(!e)throw new Error('不明な種目です');planned+=plan.sets;const sets:ExerciseActual['sets']=[];
  const accessible=c.progress?.equipment!=='home'||['free','bodyweight'].includes(e.equipment);
  const capacity=exerciseCapacity(e,body.muscle,skill,base);
  let reason=injured?'違和感の回復期間のため中止':overlap?'生活予定と重複':!accessible?'必要な設備がありません':'予定に沿って実施';
  for(let set=0;set<plan.sets;set++){
   if(injured||overlap||!accessible)break;
   const fatigue=Object.entries(e.direct).reduce((s,[p,w])=>s+(body.fatigue[p as keyof PartMap]??0)*w,0)/Math.max(.01,Object.values(e.direct).reduce((a,b)=>a+b,0));
   const dailyCap=capacity*readiness*(1-fatigue*.18)*(1-set*.025);
   const load=plan.priority==='rir'?Math.min(plan.load,dailyCap*clamp(1-plan.rir*.035,.55,1)):plan.load;
   const reps=Math.floor(clamp(plan.reps*dailyCap/Math.max(.5,load)*(1-plan.rir*.025),0,30));
   if(reps<1){reason='設定重量を扱えず中止';break;}
   const performedReps=plan.priority==='rir'?Math.min(reps,plan.reps):reps;
   const cost=(performedReps*3+plan.rest)/3600+(completed===0?8/60:0)+(set===0?2/60:0);
   if(used+cost>availableHours){reason='確保できた時間まで実施';break;}
   const quality=clamp(.6+Object.entries(e.direct).reduce((s,[p,w])=>s+skill[p as keyof PartMap]*w,0)*.2-fatigue*.15,.35,1);
   const rir=plan.priority==='rir'?plan.rir:clamp(Math.round(plan.rir+(reps-plan.reps)/2),0,6);
   sets.push({load:Math.round(load*2)/2,reps:performedReps,rir,quality});used+=cost;completed++;
   for(const p of Object.keys(stimulus) as (keyof PartMap)[])stimulus[p]+=(e.direct[p]+e.indirect[p]*.5)*quality*plan.rom*clamp(1.1-rir*.09,.4,1.1)*clamp(performedReps/plan.reps,.2,1.2);
  }
  actuals.push({exerciseId:e.id,sets,plannedSets:plan.sets,reason});
 }
 return{planned,completed,duration:used,stimulus,exercises:actuals};
}
export function progressivePlan(c:Career):Career{
 const plan=structuredClone(c.plan);
 for(const d of plan.days)for(const x of d.exercises??[]){const e=exerciseById(x.exerciseId);if(!e)continue;const capacity=exerciseCapacity(e,c.athlete.body.muscle,c.athlete.ability,c.initial.body.muscle);x.load=Math.max(.5,Math.round(capacity*(1-x.rir*.04)*2)/2);}
 return {...c,plan};
}
