import {createProgress} from './progress';
import {lifecycleBeforeDay,lifecycleAfterDay} from './competitions';
import {nutritionPlan} from './nutrition';
import {executeExercises} from './training';
import {sessionMinutes} from './exercises';
import {gameDate} from './calendar';
export {gameDate} from './calendar';
import {PARTS,partMap,clamp,weight,muscleMass,VERSIONS,type Career,type Library,type StartProfile,type WeeklyPlan,type DailySummary} from './model';
import {PROFILES,MASS_WEIGHTS,STIMULUS} from './content';
export function nextRng(seed:number):[number,number] {let x=seed>>>0; x^=x<<13; x^=x>>>17; x^=x<<5; return [x>>>0,(x>>>0)/4294967296];}
// Rejection sampling removes modulo bias. No history/retry/rarity adjustment.
export function profileDrawSample(value:number):number|null {return Number.isInteger(value)&&value>=1&&value<=4294967292?(value-1)%6:null;}
export function drawIndex(seed:number):[number,number] {let s=seed||1; for(;;){[s]=nextRng(s);const index=profileDrawSample(s);if(index!==null)return [index,s];}}
export function freshLibrary(seed:number,appearanceSeed:number):Library{return {versions:VERSIONS,drawRng:seed||1,appearanceRng:appearanceSeed||2,activeId:null,draft:null,ids:[]};}
export function defaultPlan(p:StartProfile):WeeklyPlan {return {days:Array.from({length:7},(_,i)=>({focus:[0,2,4].includes(i)?'full':'rest',sets:3,rir:3,start:20})),sleep:7.5,calories:Math.round((p.weight*30+150)/50)*50,protein:Math.round(p.weight*1.6),foodCost:850,prep:.5};}
export function generateCareer(p:StartProfile,seed:number,id:string):Career {
 let s=seed||1; const rand=()=>{let r;[s,r]=nextRng(s);return r;};
 const fat=p.weight*p.fatPercent/100, lean=p.weight-fat, totalMuscle=lean*.48;
 const raw=MASS_WEIGHTS.map((v,i)=>v*(p.id==='P2'&&[11,12,13,14].includes(i)?1.16:1)); const sum=raw.reduce((a,b)=>a+b,0);
 const muscle=partMap((_,i)=>totalMuscle*raw[i]/sum);
 const body={height:p.height,shoulder:clamp(p.height/172,.94,1.06),muscle,capacity:partMap(k=>muscle[k]*(1.65+rand()*.15)),fat,otherLean:lean-totalMuscle,waterDelta:0,pump:partMap(()=>0),fatigue:partMap(()=>0)};
 const athlete={id,profileId:p.id,profileTitle:p.title,name:['蓮','悠真','湊','陽介','直樹','大地'][Math.floor(rand()*6)],ageAtStart:22,day:0,body,life:{money:p.money,income:p.income,fixed:p.fixed,work:p.work,commute:p.commute,gymMonthly:5000,stress:.2},ability:partMap((_,i)=>p.id==='P2'&&i>=11&&i<=14?.3:.1),systemicFatigue:0,previousSleep:7.5,appearance:{hair:Math.floor(rand()*2),skin:.4+rand()*.2},status:'active' as const};
 const career:Career={versions:VERSIONS,athlete,plan:defaultPlan(p),initial:{day:0,body:structuredClone(body)},snapshots:[],rng:s,lastSummary:null,pendingEvent:null,tutorialHidden:false};career.progress=createProgress(career);return career;
}
export function drawDraft(lib:Library,id:string):Library {const [i,s]=drawIndex(lib.drawRng);const [a]=nextRng(lib.appearanceRng);return {...lib,drawRng:s,appearanceRng:a,draft:generateCareer(PROFILES[i],a,id)};}

export function trainingWindow(c:Career,dayIndex:number,sleep=c.plan.sleep){
 const l=c.athlete.life,d=c.plan.days[dayIndex],work=dayIndex<5?l.work/5:0,commute=dayIndex<5?l.commute/5:0;
 const workStart=9-commute/2,workEnd=9+work+commute/2;
 const insideWork=work>0&&d.start+.25>workStart&&d.start-.25<workEnd;
 const nextBoundary=work>0&&d.start<workStart?Math.min(workStart,31-sleep):31-sleep;
 return {insideWork,beforeWake:d.start-.25<7,available:Math.max(0,nextBoundary-d.start-.25)};
}
export function planIssues(c:Career,dayIndex:number):string[]{const p=c.plan,d=p.days[dayIndex],l=c.athlete.life,work=dayIndex<5?l.work/5:0,commute=dayIndex<5?l.commute/5:0,train=d.focus==='rest'?0:d.exercises?sessionMinutes(d.exercises)/60:.3+d.sets*.18;
 const window=trainingWindow(c,dayIndex),preparation=nutritionPlan(c).prep,auxiliary=((c.progress?.posingMinutes??0)+(c.progress?.cardioMinutes??0))/60;
 const issues=[];if(d.focus!=='rest'&&(window.insideWork||(dayIndex<5&&d.start<9&&train>window.available)))issues.push('勤務・帰宅時刻と練習が重なります');
 if(d.focus!=='rest'&&window.beforeWake)issues.push('練習への移動が起床前に始まります');
 if(d.focus!=='rest'&&d.start+train+.25>31-p.sleep)issues.push('練習・帰宅が就寝予定と重なります');
 if(work+commute+train+(train?.5:0)+p.sleep+preparation+2.5+auxiliary>24)issues.push('24時間に予定が収まりません');return issues;
}
export function simulateDay(input:Career):{career:Career;summary:DailySummary}|null {
 if(input.pendingEvent||input.athlete.status!=='active')return null;
 const legacy=input.versions.simulation==='0.1.0'&&!input.progress;
 const c={...input,versions:legacy?input.versions:VERSIONS,athlete:structuredClone(input.athlete),snapshots:input.snapshots},a=c.athlete,b=a.body,p=c.plan,d=p.days[a.day%7];
 const onTrip=!!c.progress?.entries.some(e=>['travelled','checkedIn'].includes(e.status)&&a.day>=e.travelDay&&a.day<=e.showDay);
 const work=!onTrip&&a.day%7<5?a.life.work/5:0,commute=!onTrip&&a.day%7<5?a.life.commute/5:0;
 const date=gameDate(a.day),daysInMonth=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
 const income=a.life.income/daysInMonth,fixed=a.life.fixed/daysInMonth,gym=a.life.gymMonthly/daysInMonth;
 const nutrition=nutritionPlan(c),prep=nutrition.prep,coaching=c.progress?.coach?10000/daysInMonth:0;
 const available=Math.max(0,a.life.money+income-fixed-gym-coaching),mealRatio=nutrition.cost?Math.min(1,available/nutrition.cost,10000/Math.max(1,nutrition.calories)):0,foodCost=nutrition.cost*mealRatio;
 const calories=nutrition.calories*mealRatio,protein=nutrition.protein*mealRatio;
 const n=nutrition.nutrients;
 const nutrientCoverage=n?([n.fiber/25,n.calcium/600,n.iron/10,n.vitaminC/60].reduce((sum,v)=>sum+clamp(v*mealRatio,0,1),0)/4):1;
 const hydration=c.progress?clamp((c.progress.waterLitres+(n?n.water*mealRatio/1000:weight(b)*.01*mealRatio))/(weight(b)*.035),.8,1):1;
 const recovery=clamp((a.previousSleep-3)/4.5,.12,1)*(1-a.systemicFatigue*.45)*(.95+.05*nutrientCoverage)*hydration;
 let r;[c.rng,r]=nextRng(c.rng);
 let requested=d.focus==='rest'?0:d.sets;
 const extraMinutes=c.progress?(c.progress.posingMinutes+c.progress.cardioMinutes):0;
 const actualSleep=Math.max(3,Math.min(p.sleep,24-work-commute-prep-2.5-extraMinutes/60));
 const window=trainingWindow(c,a.day%7,actualSleep);
 const recoveryHours=c.progress&&a.day<c.progress.recoveryUntil?(c.progress.recoveryUntil-a.day>14?.35:.65):24;
 const timeAvailable=Math.max(0,Math.min(window.available,recoveryHours,24-work-commute-actualSleep-prep-3-extraMinutes/60));
 const feasible=d.focus==='rest'?0:Math.max(0,Math.floor((timeAvailable-.3)/.18));
 const overlap=window.insideWork||window.beforeWake;
 const readiness=clamp(.7+recovery*.3-a.systemicFatigue*.2+r*.08,.2,1);
 let completed=overlap?0:Math.min(feasible,Math.max(0,Math.floor(requested*readiness+.2)));
 let duration=completed?.3+completed*.18:0;
 let stimulus=partMap(k=>STIMULUS[d.focus][k]*completed*clamp(1.15-d.rir*.09,.4,1.15)*(1-b.fatigue[k]*.4));
 let exerciseActuals;
 if(d.exercises){const actual=executeExercises(c,d,timeAvailable,readiness,overlap);requested=actual.planned;completed=actual.completed;duration=actual.duration;stimulus=actual.stimulus;exerciseActuals=actual.exercises;}
 if(onTrip||c.progress&&a.day<c.progress.injuryUntil){completed=0;duration=0;stimulus=partMap(()=>0);if(exerciseActuals)exerciseActuals=exerciseActuals.map(e=>({...e,sets:[],reason:onTrip?'大会遠征のため休養':'違和感の回復期間のため休養'}));}
 const expenditure=weight(b)*29+duration*210+(c.progress?.cardioMinutes??0)*4;
 const hunger=clamp((expenditure-calories)/expenditure+.3,0,1);
 const energyFactor=clamp(.8+(calories-expenditure)/1800,.25,1.1),proteinCoverage=clamp(protein/(weight(b)*1.6),0,1);
 const oldMass=muscleMass(b),oldFat=b.fat, traces=[];
 for(const k of PARTS){
  const stim=stimulus[k], effective=stim/(1+stim*.22), room=Math.max(0,1-b.muscle[k]/b.capacity[k]);
  const age=a.ageAtStart+a.day/365.2425,ageFactor=clamp(1-(age-30)*.009,.4,1);
  const gain=b.muscle[k]*.0045*effective*room*recovery*proteinCoverage*energyFactor*ageFactor;
  const loss=b.muscle[k]*((calories<expenditure*.7?.0003:stim===0?.000015:0)+(legacy?0:Math.max(0,age-45)*.0000018));
  b.muscle[k]=Math.max(.01,b.muscle[k]+gain-loss);
  b.fatigue[k]=clamp(b.fatigue[k]*(1-.5*recovery)+stim*.075,0,1);
  b.pump[k]=clamp(b.pump[k]*.15+stim*.07,0,1);
  a.ability[k]=clamp(a.ability[k]+stim*.0013*(1-a.ability[k]),0,1);
  traces.push({part:k,stimulus:stim,recovery,proteinCoverage,energyFactor,muscleDelta:gain-loss});
 }
 b.fat=clamp(b.fat+(calories-expenditure)/7700,.04*(b.otherLean+muscleMass(b)),.75*(b.otherLean+muscleMass(b)));
 b.waterDelta=clamp(b.waterDelta*.6+(r-.5)*.12,-.8,.8);
 a.systemicFatigue=clamp(a.systemicFatigue*(1-.4*recovery)+completed*.025+Math.max(0,work-7)*.015,0,1);
 a.previousSleep=actualSleep; a.life.money+=income-fixed-gym-coaching-foodCost;if(!legacy)a.life.stress=clamp(a.life.stress*.95+hunger*.025+(actualSleep<p.sleep?.03:0),0,1);
 const events:string[]=[];if(a.life.money<p.foodCost*7)events.push('1週間分の食費を下回りました。計画と収支を確認してください。');if(a.systemicFatigue>.78)events.push('全身疲労が高まっています。次の日を確定する前に計画を確認してください。');
 if(actualSleep<p.sleep)events.push('生活予定が24時間を超え、睡眠が短くなりました。計画を見直してください。');
 const skippedReasons=exerciseActuals?.filter(e=>e.sets.length<e.plannedSets).map(e=>e.reason);
 const reason=onTrip?'大会遠征のため練習を休みました。':c.progress&&a.day<c.progress.injuryUntil?'違和感の回復期間のため練習を休みました。':overlap?(window.beforeWake?'睡眠・起床と重複し練習できませんでした。':'勤務と重複し練習できませんでした。'):completed<requested?(skippedReasons?.length?[...new Set(skippedReasons)].join('。')+'。種目ごとの実績を確認してください。':'時間または当日の回復に合わせてセット数を調整しました。'):requested?'計画に沿って実施しました。':'休養日。前日の刺激から回復します。';
 const summary:DailySummary={day:a.day,training:{focus:d.focus,plannedSets:requested,completedSets:completed,rir:d.rir,duration,stimulus,reason,...(exerciseActuals?{exercises:exerciseActuals}:{})},meal:{calories,protein,cost:foodCost,prep,...(n?{nutrients:{carbs:n.carbs*mealRatio,fat:n.fat*mealRatio,fiber:n.fiber*mealRatio,calcium:n.calcium*mealRatio,iron:n.iron*mealRatio,vitaminC:n.vitaminC*mealRatio,sodium:n.sodium*mealRatio,water:n.water*mealRatio,hunger,coverage:nutrientCoverage,hydration}}:{})},sleep:{hours:actualSleep,priorHours:input.athlete.previousSleep,plannedHours:p.sleep},workHours:work,commuteHours:commute,freeHours:Math.max(0,24-work-commute-duration-(duration?.5:0)-actualSleep-prep-2.5-extraMinutes/60),income,fixed:fixed+coaching,gym,weight:weight(b),muscleDelta:muscleMass(b)-oldMass,fatDelta:b.fat-oldFat,traces,events};
 a.day++;c.lastSummary=summary;c.pendingEvent=events[0]??null;if(a.day===14)c.tutorialHidden=true;
 if(a.day%7===0)c.snapshots=[...c.snapshots,{day:a.day,body:structuredClone(b)}];
 return {career:lifecycleAfterDay(c,completed>0),summary};
}
export function advance(input:Career,days:number):{career:Career;logs:DailySummary[]}{
 if(!Number.isInteger(days)||days<0||days>20000)throw new Error('進行日数は0〜20000日の整数で指定してください');
 let c=input;const logs:DailySummary[]=[];for(let i=0;i<days;i++){c=lifecycleBeforeDay(c);if(c.pendingEvent||c.athlete.status==='retired')break;const result=simulateDay(c);if(!result)break;c=result.career;logs.push(result.summary);if(c.pendingEvent)break;}
 if(!c.pendingEvent)c=lifecycleBeforeDay(c);return {career:c,logs};
}
