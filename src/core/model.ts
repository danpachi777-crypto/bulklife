export const PARTS = ['upperChest','chest','frontDelts','sideDelts','rearDelts','lats','upperBack','erectors','biceps','triceps','forearms','quads','hamstrings','glutes','calves','abs'] as const;
export type Part = typeof PARTS[number];
export const LABELS: Record<Part,string> = {upperChest:'大胸筋上部',chest:'大胸筋その他領域',frontDelts:'三角筋前部',sideDelts:'三角筋側部',rearDelts:'三角筋後部',lats:'広背筋',upperBack:'上背部',erectors:'脊柱起立筋',biceps:'上腕二頭筋',triceps:'上腕三頭筋',forearms:'前腕',quads:'大腿四頭筋',hamstrings:'ハムストリングス',glutes:'臀筋',calves:'ふくらはぎ',abs:'腹部'};
export type PartMap = Record<Part,number>;
export const partMap = (f:(p:Part,i:number)=>number): PartMap => Object.fromEntries(PARTS.map((p,i)=>[p,f(p,i)])) as PartMap;
export interface StartProfile {id:string; title:string; height:number; weight:number; fatPercent:number; money:number; income:number; fixed:number; work:number; commute:number; challenge:string; experience:string; environment:string; drawWeight:1}
export interface BodyState {height:number; shoulder:number; muscle:PartMap; capacity:PartMap; fat:number; otherLean:number; waterDelta:number; pump:PartMap; fatigue:PartMap}
export interface LifeState {money:number; income:number; fixed:number; work:number; commute:number; gymMonthly:number; stress:number}
export interface AthleteState {id:string; profileId:string; profileTitle:string; name:string; ageAtStart:number; day:number; body:BodyState; life:LifeState; ability:PartMap; systemicFatigue:number; previousSleep:number; appearance:{hair:number; skin:number}; status:'active'|'retired'}
export type Focus='full'|'push'|'pull'|'legs'|'rest';
export interface DayPlan {focus:Focus; sets:number; rir:number; start:number;exercises?:import('./careerTypes').ExercisePlan[]}
export interface WeeklyPlan {days:DayPlan[]; sleep:number; calories:number; protein:number; foodCost:number; prep:number}
export interface TrainingSessionActual {focus:Focus; plannedSets:number; completedSets:number; rir:number; duration:number; stimulus:PartMap; reason:string;exercises?:import('./careerTypes').ExerciseActual[]}
export interface MealActual {calories:number; protein:number; cost:number; prep:number;nutrients?:{carbs:number;fat:number;fiber:number;calcium:number;iron:number;vitaminC:number;sodium:number;water:number;hunger:number;coverage:number;hydration:number}}
export interface SleepActual {hours:number; priorHours:number; plannedHours?:number}
export interface ExplanationTrace {part:Part; stimulus:number; recovery:number; proteinCoverage:number; energyFactor:number; muscleDelta:number}
export interface DailySummary {day:number; training:TrainingSessionActual; meal:MealActual; sleep:SleepActual; workHours:number; commuteHours:number; freeHours:number; income:number; fixed:number; gym:number; weight:number; muscleDelta:number; fatDelta:number; traces:ExplanationTrace[]; events:string[]}
export interface BodySnapshot {day:number; body:BodyState}
export interface DataVersions {schema:number;simulation:string;content:string;model:string;mapping:string;rules:string}
export const VERSIONS = {schema:1,simulation:'0.2.0',content:'0.2.0',model:'athlete-v1',mapping:'regions-v1',rules:'2026-jbbf-ifbb-2027oqs-game-1'} as const;
export interface Career {versions:DataVersions; athlete:AthleteState; plan:WeeklyPlan; savedPlan?:WeeklyPlan; initial:BodySnapshot; snapshots:BodySnapshot[]; rng:number; lastSummary:DailySummary|null; pendingEvent:string|null; tutorialHidden:boolean;progress?:import('./careerTypes').CareerProgress}
export interface Library {versions:DataVersions; drawRng:number; appearanceRng:number; activeId:string|null; draft:Career|null; ids:string[]}
export interface CompetitionEdition {seriesId:string; editionId:string; organizationId:string; circuitId:string; categoryId:string; classId:string; ageClassId:string; rulesetVersion:string; referenceYear:number; simulationSeason:number; sourceUrl:string; verifiedAt:string; status:'verified'|'unverified'|'fictional'}
export interface RuleSet {version:string; referenceYear:number; sources:string[]}
export interface Qualification {id:string; circuitId:string; expires:string; ruleVersion:string}
export interface CompetitionResult {editionId:string; rank:number; title:string|null}
export const weight = (b:BodyState) => PARTS.reduce((s,p)=>s+b.muscle[p],0)+b.fat+b.otherLean+b.waterDelta;
export const muscleMass = (b:BodyState) => PARTS.reduce((s,p)=>s+b.muscle[p],0);
export const fatPercent = (b:BodyState) => b.fat/weight(b)*100;
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
