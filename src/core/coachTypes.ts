import type { Focus } from './model';
export type CoachSection='training'|'food'|'rest';
export type CoachGoal='build'|'cut'|'balance'|'ask';
export type CoachPriority='balanced'|'chest'|'back'|'shoulders'|'arms'|'legs';
export type FoodStyle='recommend'|'budget'|'quick';
export interface CoachSample {
  day:number;weight:number;muscle:number;fat:number;fatigue:number;sleep:number;
  plannedSets:number;completedSets:number;minutes:number;calories:number;cost:number;
  mealRatio:number;expenditure:number;focus:Focus;
}
export interface CoachingGuide {
  version:1;goal:CoachGoal;minutes:number;budget:number;priority:CoachPriority;
  effort:'light'|'standard'|'hard';foodStyle:FoodStyle;
  ownership:Record<CoachSection,'coach'|'manual'>;
  adoptedDay:number;reviewAfter:number;lastAdjustment:number;adjustmentDirection:-1|0|1;
  samples:CoachSample[];
}
