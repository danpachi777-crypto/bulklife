import {
  PARTS,
  VERSIONS,
  weight,
  type BodyState,
  type Career,
  type Library,
  type DailySummary,
} from "./model";
import { validateProgress, validateExercisePlans } from "./validateProgress";
import { validateLocal } from "./localCompetitions";
import { EXERCISES } from "./exercises";
import { unpackLog } from "./logCodec";
function obj(x: unknown): x is Record<string, any> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}
function num(x: unknown, min: number, max: number) {
  return typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
}
function fail(): never {
  throw new Error("保存形式または値が不正です。既存データは変更していません。");
}
const text = (x: unknown, max = 1000) =>
  typeof x === "string" && x.length <= max;
const id = (x: unknown) =>
  typeof x === "string" && /^bl-[a-zA-Z0-9-]{1,100}$/.test(x);
const uint = (x: unknown) => num(x, 1, 4294967295) && Number.isInteger(x);
function versions(x: any) {
  const common = obj(x) && x.schema === 1;
  const model =
    common &&
    ((x.model === "athlete-v1" && x.mapping === "regions-v1") ||
      (x.model === "athlete-v2" && x.mapping === "regions-v2"));
  const legacy =
    common &&
    x.simulation === "0.1.0" &&
    x.content === "0.1.0" &&
    x.model === "athlete-v1" &&
    x.rules === "unimplemented";
  const previous =
    common &&
    ["0.2.0", "0.2.1"].includes(x.simulation) &&
    x.content === "0.2.0" &&
    x.model === "athlete-v1";
  const current =
    common &&
    x.simulation === VERSIONS.simulation &&
    x.content === VERSIONS.content;
  if (
    !model ||
    (!legacy && (!(previous || current) || x.rules !== VERSIONS.rules))
  )
    throw new Error(
      "この保存データの版には対応していません。元の版で開いてください。",
    );
}
function partMap(x: any, min: number, max: number) {
  if (!obj(x) || PARTS.some((k) => !num(x[k], min, max))) fail();
}
export function validateBody(b: any) {
  if (
    !obj(b) ||
    !num(b.height, 140, 220) ||
    !num(b.shoulder, 0.8, 1.3) ||
    !num(b.fat, 0.01, 500) ||
    !num(b.otherLean, 1, 200) ||
    !num(b.waterDelta, -10, 10)
  )
    fail();
  partMap(b.muscle, 0.001, 100);
  partMap(b.capacity, 0.001, 100);
  partMap(b.fatigue, 0, 1);
  partMap(b.pump, 0, 1);
  if (!num(weight(b as BodyState), 10, 500)) fail();
}
function validatePlan(p: any) {
  if (
    !obj(p) ||
    !Array.isArray(p.days) ||
    p.days.length !== 7 ||
    p.days.some(
      (d: any) =>
        !obj(d) ||
        !["full", "push", "pull", "legs", "rest"].includes(d.focus) ||
        !Number.isInteger(d.sets) ||
        !num(d.sets, 1, 8) ||
        !num(d.rir, 0, 6) ||
        !num(d.start, 6, 23),
    ) ||
    !num(p.sleep, 3, 10) ||
    !num(p.calories, 1000, 5000) ||
    !num(p.protein, 30, 250) ||
    !num(p.foodCost, 300, 3000) ||
    !num(p.prep, 0.25, 2)
  )
    fail();
  for (const d of p.days)
    if (d.exercises !== undefined) validateExercisePlans(d.exercises);
}
export function validateSummary(l: any): asserts l is DailySummary {
  if (
    !obj(l) ||
    !Number.isInteger(l.day) ||
    !num(l.day, 0, 200000) ||
    !num(l.weight, 10, 500) ||
    !num(l.muscleDelta, -100, 100) ||
    !num(l.fatDelta, -100, 100)
  )
    fail();
  const t = l.training,
    m = l.meal,
    s = l.sleep;
  if (
    !obj(t) ||
    !["full", "push", "pull", "legs", "rest"].includes(t.focus) ||
    !Number.isInteger(t.plannedSets) ||
    !num(t.plannedSets, 0, 200) ||
    !Number.isInteger(t.completedSets) ||
    !num(t.completedSets, 0, t.plannedSets) ||
    !num(t.rir, 0, 6) ||
    !num(t.duration, 0, 24) ||
    !text(t.reason)
  )
    fail();
  partMap(t.stimulus, 0, 250);
  if (t.exercises !== undefined) {
    if (!Array.isArray(t.exercises) || t.exercises.length > 24) fail();
    for (const e of t.exercises) {
      if (
        !obj(e) ||
        !EXERCISES.some((x) => x.id === e.exerciseId) ||
        !Number.isInteger(e.plannedSets) ||
        !num(e.plannedSets, 1, 8) ||
        !text(e.reason) ||
        !Array.isArray(e.sets) ||
        e.sets.length > e.plannedSets
      )
        fail();
      for (const s of e.sets)
        if (
          !obj(s) ||
          !num(s.load, 0, 500) ||
          !Number.isInteger(s.reps) ||
          !num(s.reps, 1, 30) ||
          !num(s.rir, 0, 6) ||
          !num(s.quality, 0, 1)
        )
          fail();
    }
  }
  if (
    !obj(m) ||
    !num(m.calories, 0, 10000) ||
    !num(m.protein, 0, 3000) ||
    !num(m.cost, 0, 100000) ||
    !num(m.prep, 0.25, 2)
  )
    fail();
  if (m.nutrients !== undefined) {
    const n = m.nutrients;
    if (
      !obj(n) ||
      [
        "carbs",
        "fat",
        "fiber",
        "calcium",
        "iron",
        "vitaminC",
        "sodium",
        "water",
      ].some((k) => !num(n[k], 0, 1e7)) ||
      ["hunger", "coverage", "hydration"].some((k) => !num(n[k], 0, 1))
    )
      fail();
  }
  if (
    !obj(s) ||
    !num(s.hours, 3, 10) ||
    !num(s.priorHours, 3, 12) ||
    (s.plannedHours !== undefined && !num(s.plannedHours, 3, 10))
  )
    fail();
  for (const key of ["workHours", "commuteHours", "freeHours"])
    if (!num(l[key], -0.000001, 24)) fail();
  for (const key of ["income", "fixed", "gym"])
    if (!num(l[key], 0, 1e8)) fail();
  if (
    !Array.isArray(l.events) ||
    l.events.length > 100 ||
    l.events.some((v: any) => !text(v)) ||
    !Array.isArray(l.traces) ||
    l.traces.length !== PARTS.length
  )
    fail();
  if (l.detail !== undefined) {
    const d = l.detail;
    if (
      !obj(d) ||
      d.version !== 1 ||
      !obj(d.planned) ||
      !obj(d.actual) ||
      !obj(d.before) ||
      !obj(d.after)
    )
      fail();
    const p = d.planned;
    if (
      !num(p.trainingMinutes, 0, 20000) ||
      !num(p.start, 6, 23) ||
      !num(p.calories, 0, 1e8) ||
      !num(p.protein, 0, 1e7) ||
      !num(p.cost, 0, 1e8) ||
      !num(p.sleep, 3, 10) ||
      !num(p.posingMinutes, 0, 60) ||
      !num(p.cardioMinutes, 0, 60) ||
      !["foods", "aggregate"].includes(p.mealMode)
    )
      fail();
    if (
      !num(d.actual.posingMinutes, 0, p.posingMinutes) ||
      !num(d.actual.cardioMinutes, 0, p.cardioMinutes) ||
      !num(d.actual.mealRatio, 0, 1) ||
      !num(d.actual.contestHours, 0, 24)
    )
      fail();
    for (const v of [d.before, d.after]) {
      if (!num(v.fatigue, 0, 1) || !num(v.posing, 0, 1)) fail();
      partMap(v.localFatigue, 0, 1);
      partMap(v.ability, 0, 1);
    }
  }
  const seen = new Set();
  for (const t of l.traces) {
    if (
      !obj(t) ||
      !PARTS.includes(t.part) ||
      seen.has(t.part) ||
      !num(t.stimulus, 0, 250) ||
      !num(t.recovery, 0, 1) ||
      !num(t.proteinCoverage, 0, 1) ||
      !num(t.energyFactor, 0, 2) ||
      !num(t.muscleDelta, -100, 100)
    )
      fail();
    seen.add(t.part);
  }
}
export function validateCareer(x: unknown): asserts x is Career {
  if (!obj(x)) fail();
  versions(x.versions);
  const a = x.athlete;
  if (
    !obj(a) ||
    !id(a.id) ||
    !text(a.name, 32) ||
    !a.name.trim() ||
    !text(a.profileId, 64) ||
    !text(a.profileTitle, 120) ||
    !num(a.ageAtStart, 18, 100) ||
    !Number.isInteger(a.day) ||
    !num(a.day, 0, 200000) ||
    !uint(x.rng) ||
    !["active", "retired"].includes(a.status)
  )
    fail();
  validateBody(a.body);
  validatePlan(x.plan);
  if (x.savedPlan !== undefined) validatePlan(x.savedPlan);
  if (
    !obj(a.life) ||
    !num(a.life.money, -1e9, 1e12) ||
    !num(a.life.income, 0, 1e8) ||
    !num(a.life.fixed, 0, 1e8) ||
    !num(a.life.work, 0, 100) ||
    !num(a.life.commute, 0, 50) ||
    !num(a.life.gymMonthly, 0, 1e6) ||
    !num(a.life.stress, 0, 1) ||
    !num(a.systemicFatigue, 0, 1) ||
    !num(a.previousSleep, 3, 12) ||
    !obj(a.appearance) ||
    ![0, 1].includes(a.appearance.hair) ||
    !num(a.appearance.skin, 0, 1)
  )
    fail();
  partMap(a.ability, 0, 1);
  if (a.life.work / 5 + a.life.commute / 5 + x.plan.prep + 2.5 + 3 > 24) fail();
  if (
    !obj(x.initial) ||
    x.initial.day !== 0 ||
    !Array.isArray(x.snapshots) ||
    x.snapshots.length > 30000
  )
    fail();
  validateBody(x.initial.body);
  let previous = 0;
  for (const s of x.snapshots) {
    if (!obj(s) || !Number.isInteger(s.day) || !num(s.day, previous + 1, a.day))
      fail();
    validateBody(s.body);
    previous = s.day;
  }
  if (
    (x.pendingEvent !== null && !text(x.pendingEvent)) ||
    typeof x.tutorialHidden !== "boolean"
  )
    fail();
  if (a.day === 0) {
    if (x.lastSummary !== null) fail();
  } else {
    validateSummary(x.lastSummary);
    if (x.lastSummary.day !== a.day - 1) fail();
  }
  if (x.progress !== undefined) validateProgress(x.progress, x as Career);
  if (x.local !== undefined) validateLocal(x.local, x as Career, validateBody);
  if (
    x.objective !== undefined &&
    !["habit", "contest", "balance", "personalBest"].includes(x.objective)
  )
    fail();
}
export function validateLibrary(x: unknown): asserts x is Library {
  if (!obj(x)) fail();
  versions(x.versions);
  if (
    !uint(x.drawRng) ||
    !uint(x.appearanceRng) ||
    !Array.isArray(x.ids) ||
    x.ids.length > 1000 ||
    x.ids.some((v: any) => !id(v)) ||
    new Set(x.ids).size !== x.ids.length ||
    (x.activeId !== null && !x.ids.includes(x.activeId))
  )
    fail();
  if (x.draft !== null) validateCareer(x.draft);
}
export function validateEnvelope(raw: string): {
  library: Library;
  careers: Career[];
  logs: DailySummary[][];
} {
  if (raw.length > 250_000_000)
    throw new Error(
      "保存ファイルが250MBを超えています。既存データは変更していません。",
    );
  const x = JSON.parse(raw);
  if (
    !obj(x) ||
    x.format !== "BULK_LIFE" ||
    !Array.isArray(x.careers) ||
    !Array.isArray(x.logs)
  )
    fail();
  validateLibrary(x.library);
  if (x.logEncoding !== undefined && x.logEncoding !== "columns-v1")
    throw new Error(
      "この日次記録の圧縮版には対応していません。元の版で開いてください。",
    );
  if (x.logEncoding === "columns-v1")
    x.logs = x.logs.map((days: unknown) => {
      if (!Array.isArray(days)) fail();
      return days.map(unpackLog);
    });
  if (
    x.careers.length !== x.library.ids.length ||
    x.logs.length !== x.careers.length
  )
    fail();
  x.careers.forEach(validateCareer);
  for (let i = 0; i < x.careers.length; i++) {
    const c = x.careers[i];
    if (
      c.athlete.id !== x.library.ids[i] ||
      !Array.isArray(x.logs[i]) ||
      x.logs[i].length !== c.athlete.day
    )
      fail();
    x.logs[i].forEach((l: any, j: number) => {
      validateSummary(l);
      if (l.day !== j) fail();
    });
  }
  return x as any;
}
