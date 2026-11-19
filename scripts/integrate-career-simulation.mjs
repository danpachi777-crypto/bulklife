import {readFileSync,writeFileSync} from 'node:fs';
const path=new URL('../src/core/simulation.ts',import.meta.url);let s=readFileSync(path,'utf8');
s="import {createProgress} from './progress';\nimport {lifecycleBeforeDay,lifecycleAfterDay} from './competitions';\nimport {nutritionPlan} from './nutrition';\nimport {executeExercises} from './training';\nimport {sessionMinutes} from './exercises';\nimport {gameDate} from './calendar';\nexport {gameDate} from './calendar';\n"+s;
s=s.replace(" return {versions:VERSIONS,athlete,plan:defaultPlan(p),initial:{day:0,body:structuredClone(body)},snapshots:[],rng:s,lastSummary:null,pendingEvent:null,tutorialHidden:false};", " const career:Career={versions:VERSIONS,athlete,plan:defaultPlan(p),initial:{day:0,body:structuredClone(body)},snapshots:[],rng:s,lastSummary:null,pendingEvent:null,tutorialHidden:false};career.progress=createProgress(career);return career;");
s=s.replace('export const gameDate=(day:number)=>new Date(Date.UTC(2027,0,4+day));','');
s=s.replace("train=d.focus==='rest'?0:.3+d.sets*.18;","train=d.focus==='rest'?0:d.exercises?sessionMinutes(d.exercises)/60:.3+d.sets*.18;");
s=s.replace(' const available=Math.max(0,a.life.money+income-fixed-gym),foodCost=Math.min(p.foodCost,available),mealRatio=p.foodCost?foodCost/p.foodCost:0;\n const calories=p.calories*mealRatio,protein=p.protein*mealRatio;', ' const nutrition=nutritionPlan(c),prep=nutrition.prep,coaching=c.progress?.coach?10000/daysInMonth:0;\n const available=Math.max(0,a.life.money+income-fixed-gym-coaching),foodCost=Math.min(nutrition.cost,available),mealRatio=nutrition.cost?foodCost/nutrition.cost:0;\n const calories=nutrition.calories*mealRatio,protein=nutrition.protein*mealRatio;');
s=s.replace(' const requested=d.focus', ' let requested=d.focus');
s=s.replace(' const actualSleep=Math.max(3,Math.min(p.sleep,24-work-commute-p.prep-2.5));', ' const extraMinutes=c.progress?(c.progress.posingMinutes+c.progress.cardioMinutes):0;\n const actualSleep=Math.max(3,Math.min(p.sleep,24-work-commute-prep-2.5-extraMinutes/60));');
s=s.replace('24-work-commute-actualSleep-p.prep-3','24-work-commute-actualSleep-prep-3-extraMinutes/60');
s=s.replace(' const completed=overlap?', ' let completed=overlap?').replace(' const duration=completed?', ' let duration=completed?').replace(' const stimulus=partMap', ' let stimulus=partMap');
s=s.replace(' const expenditure=weight(b)*29+duration*210;', ` let exerciseActuals;\n if(d.exercises){const actual=executeExercises(c,d,timeAvailable,readiness,overlap);requested=actual.planned;completed=actual.completed;duration=actual.duration;stimulus=actual.stimulus;exerciseActuals=actual.exercises;}\n const expenditure=weight(b)*29+duration*210+(c.progress?.cardioMinutes??0)*4;`);
s=s.replace('a.previousSleep=actualSleep; a.life.money+=income-fixed-gym-foodCost;', 'a.previousSleep=actualSleep; a.life.money+=income-fixed-gym-coaching-foodCost;');
s=s.replace('stimulus,reason},meal:{calories,protein,cost:foodCost,prep:p.prep}', 'stimulus,reason,exercises:exerciseActuals},meal:{calories,protein,cost:foodCost,prep}');
s=s.replace('actualSleep-p.prep-2.5,income,fixed,gym,','actualSleep-prep-2.5-extraMinutes/60,income,fixed:fixed+coaching,gym,');
s=s.replace(' return {career:c,summary};', ' return {career:lifecycleAfterDay(c,completed>0),summary};');
const start=s.indexOf('export function advance(');
s=s.slice(0,start)+`export function advance(input:Career,days:number):{career:Career;logs:DailySummary[]}{
 if(!Number.isInteger(days)||days<0||days>20000)throw new Error('進行日数は0〜20000日の整数で指定してください');
 let c=input;const logs:DailySummary[]=[];for(let i=0;i<days;i++){c=lifecycleBeforeDay(c);if(c.pendingEvent||c.athlete.status==='retired')break;const result=simulateDay(c);if(!result)break;c=result.career;logs.push(result.summary);if(c.pendingEvent)break;}
 if(!c.pendingEvent)c=lifecycleBeforeDay(c);return {career:c,logs};
}\n`;
writeFileSync(path,s);
