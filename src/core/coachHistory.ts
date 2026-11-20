import {fatPercent,muscleMass,type Career,type DailySummary} from './model';
/** Optional, bounded history. Existing careers and simulation RNG are untouched. */
export function recordCoachDay(c:Career,s:DailySummary):Career {
  if(!c.coachingGuide)return c;
  const sample={day:s.day,weight:s.weight,muscle:muscleMass(c.athlete.body),fat:fatPercent(c.athlete.body),fatigue:c.athlete.systemicFatigue,sleep:s.sleep.hours,plannedSets:s.training.plannedSets,completedSets:s.training.completedSets,minutes:s.training.duration*60,calories:s.meal.calories,cost:s.meal.cost,mealRatio:s.detail?.actual.mealRatio??1,expenditure:s.weight*29+s.training.duration*210+(s.detail?.actual.cardioMinutes??0)*4,focus:s.training.focus};
  return {...c,coachingGuide:{...c.coachingGuide,samples:[...c.coachingGuide.samples.filter(x=>x.day<s.day),sample].slice(-28)}};
}
