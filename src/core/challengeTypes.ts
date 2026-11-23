import type { BodyState, Career, PartMap } from "./model";
import type { CoachPriority, CoachGoal, FoodStyle } from "./coachTypes";
export type ChallengeMode = "japan" | "world";
export type StageTier = "gym" | "region" | "open" | "national" | "world";
export interface Strategy {
  id: string;
  name: string;
  reason: string;
  aim: string;
  tradeoff: string;
  goal: CoachGoal;
  priority: CoachPriority;
  minutes: number;
  budget: number;
  foodStyle: FoodStyle;
  sleep: number;
  posing: number;
  cardio: number;
  workRatio: number;
  equipment: "gym" | "home";
  coach: boolean;
  effort: "light" | "standard" | "hard";
  contest: StageTier | null;
  manual?: Career;
  autoTraining: boolean;
  autoFood: boolean;
  autoRecovery: boolean;
}
export interface Challenger {
  id: string;
  name: string;
  style: string;
  career: Career;
  history: { decision: number; rank: number; tier: StageTier }[];
}
export interface ChallengeShow {
  decision: number;
  day: number;
  tier: StageTier;
  fee: number;
  rank: number;
  count: number;
  score: import("./localCompetitions").LocalScore;
  body: BodyState;
  posing: number;
  standings: {
    id: string;
    name: string;
    rank: number;
    score: import("./localCompetitions").LocalScore;
    body: BodyState;
    posing: number;
  }[];
}
export interface PeriodStats {
  days: number;
  trainingDays: number;
  sets: number;
  plannedSets: number;
  minutes: number;
  income: number;
  food: number;
  fixed: number;
  energy: number;
  protein: number;
  sleep: number;
  fatigue: number;
  restDays: number;
  adjustments: number;
  shortDays: number;
  muscle: PartMap;
  events: string[];
  trainingSamples?: {day:number;exercises:import('./careerTypes').ExerciseActual[]}[];
}
export interface DecisionRecord {
  number: number;
  issue: string;
  candidates: Pick<Strategy, "id" | "name" | "aim" | "tradeoff">[];
  strategy: Strategy;
  from: number;
  to: number;
  before: BodyState;
  after: BodyState;
  beforeMoney: number;
  afterMoney: number;
  beforeAbility: PartMap;
  afterAbility: PartMap;
  beforePosing: number;
  afterPosing: number;
  stats: PeriodStats;
  show?: ChallengeShow;
  elapsedMs: number;
}
export interface ChallengeEnding {
  at: 20 | 40;
  day: number;
  body: BodyState;
  money: number;
  ability: PartMap;
  posing: number;
  title: string | null;
  best: { tier: StageTier; rank: number } | null;
  text: string;
  recordCount: number;
}
export interface PeriodJob {
  id: string;
  number: number;
  start: number;
  end: number;
  plan: Strategy;
  record: DecisionRecord;
  startedAt: number;
  paid: number;
}
export interface ChallengeRun {
  format: "BULK_CHALLENGE";
  version: 1;
  calculation: "decisions-1";
  /** Presentation revision at creation; omitted in pre-release challenge files. */
  modelVersion?: string;
  id: string;
  revision: number;
  seed: number;
  mode: ChallengeMode;
  limit: 20 | 40;
  career: Career;
  initial: Career;
  rivals: Challenger[];
  records: DecisionRecord[];
  status: "planning" | "running" | "result" | "japanEnd" | "worldEnd";
  job: PeriodJob | null;
  domestic: ChallengeEnding | null;
  world: ChallengeEnding | null;
  tutorialHidden: boolean;
  createdAt: number;
  updatedAt?: number;
  importedFrom?: string;
}
