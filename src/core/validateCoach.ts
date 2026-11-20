import type {CoachingGuide} from './coachTypes';
const object=(x:unknown):x is Record<string,any>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const number=(x:unknown,a:number,b:number)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
export function validateCoach(raw:unknown,day:number):asserts raw is CoachingGuide {
  const fail=()=>{throw new Error('コーチ設定の保存データが不正です。元の保存は保持しています。');};
  if(!object(raw))return fail();const g=raw;
  if(g.version!==1||!['build','cut','balance','ask'].includes(g.goal)||!number(g.minutes,15,120)||!number(g.budget,300,3000)||!['balanced','chest','back','shoulders','arms','legs'].includes(g.priority)||!['light','standard','hard'].includes(g.effort)||!['recommend','budget','quick'].includes(g.foodStyle)||!object(g.ownership)||['training','food','rest'].some(k=>!['coach','manual'].includes(g.ownership[k]))||!Number.isInteger(g.adoptedDay)||!number(g.adoptedDay,0,day)||!Number.isInteger(g.reviewAfter)||!number(g.reviewAfter,0,day+1000)||!Number.isInteger(g.lastAdjustment)||!number(g.lastAdjustment,-100,day)||![-1,0,1].includes(g.adjustmentDirection)||!Array.isArray(g.samples)||g.samples.length>28)return fail();
  let previous=-1;
  for(const s of g.samples){if(!object(s)||!Number.isInteger(s.day)||!number(s.day,previous+1,day-1)||!number(s.weight,10,500)||!number(s.muscle,.001,1600)||!number(s.fat,0,100)||!number(s.fatigue,0,1)||!number(s.sleep,3,12)||!number(s.plannedSets,0,200)||!number(s.completedSets,0,s.plannedSets)||!number(s.minutes,0,1440)||!number(s.calories,0,10000)||!number(s.cost,0,100000)||!number(s.mealRatio,0,1)||!number(s.expenditure,0,30000)||!['full','push','pull','legs','rest'].includes(s.focus))return fail();previous=s.day;}
}
