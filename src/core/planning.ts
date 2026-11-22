import { clamp, weight, type Career, type DailySummary } from "./model";
import { sessionMinutes } from "./exercises";
import { nutritionPlan } from "./nutrition";

/** The same expenditure terms used by simulateDay; minutes here are a plan,
 * while results use the duration actually performed. */
export const energyExpenditure = (
  body: Career["athlete"]["body"],
  minutes: number,
  cardio: number,
) => weight(body) * 29 + (minutes / 60) * 210 + cardio * 4;
export function todayTraining(c: Career) {
  const day = c.plan.days[c.athlete.day % 7];
  const contest =
    !!c.local?.results.some((r) => r.day === c.athlete.day) ||
    !!c.progress?.results.some((r) => r.day === c.athlete.day) ||
    !!c.progress?.entries.some(
      (e) =>
        ["travelled", "checkedIn"].includes(e.status) &&
        c.athlete.day >= e.travelDay &&
        c.athlete.day <= e.showDay,
    );
  const injury = !!c.progress && c.athlete.day < c.progress.injuryUntil;
  const awaiting = !!c.local?.decision || !!c.progress?.decision;
  const rest = contest || injury || day.focus === "rest";
  return {
    day,
    contest,
    injury,
    awaiting,
    focus: rest ? ("rest" as const) : day.focus,
    minutes: rest
      ? 0
      : day.exercises
        ? sessionMinutes(day.exercises)
        : (0.3 + day.sets * 0.18) * 60,
  };
}
export function foodTargets(c: Career, goal: "build" | "cut" | "balance") {
  const training = todayTraining(c);
  const expenditure = energyExpenditure(
    c.athlete.body,
    training.minutes,
    c.progress?.cardioMinutes ?? 0,
  );
  return {
    energy:
      Math.round(
        clamp(
          expenditure + (goal === "build" ? 175 : goal === "cut" ? -300 : 0),
          1200,
          4500,
        ) / 25,
      ) * 25,
    protein: weight(c.athlete.body) * 1.6,
    expenditure,
  };
}
export function assessFood(c: Career, goal: "build" | "cut" | "balance") {
  const n = nutritionPlan(c),
    target = foodTargets(c, goal),
    energyRatio = n.calories / target.energy,
    proteinRatio = Math.min(1, n.protein / target.protein);
  const insufficient = energyRatio < 0.9 || proteinRatio < 0.9;
  const cashShort = c.athlete.life.money < n.cost;
  return {
    nutrition: n,
    target,
    energyRatio,
    proteinRatio,
    insufficient,
    cashShort,
    status: insufficient
      ? "目標に不足"
      : energyRatio > 1.15
        ? "目標より多め"
        : "目標の範囲",
    reason: insufficient
      ? `食事は設定済みですが、${energyRatio < 0.9 ? "エネルギー" : ""}${energyRatio < 0.9 && proteinRatio < 0.9 ? "と" : ""}${proteinRatio < 0.9 ? "たんぱく質" : ""}が目標に届いていません。食費上限や調理方法を相談できます。`
      : energyRatio > 1.15
        ? "目標より多い案です。量と予算の配分を見直せます。"
        : "設定した目標に近い食事です。成長を保証する判定ではありません。",
  };
}
export function periodSummary(
  before: Career,
  after: Career,
  logs: DailySummary[],
  requested: number,
) {
  const sum = (f: (s: DailySummary) => number) =>
      logs.reduce((n, s) => n + f(s), 0),
    count = logs.length;
  const income = sum((s) => s.income),
    food = sum((s) => s.meal.cost),
    fixed = sum((s) => s.fixed + s.gym),
    balance = after.athlete.life.money - before.athlete.life.money;
  return {
    count,
    requested,
    first: logs[0]?.day ?? before.athlete.day,
    last: logs.at(-1)?.day ?? before.athlete.day,
    weight: weight(after.athlete.body) - weight(before.athlete.body),
    muscle: sum((s) => s.muscleDelta),
    fat: sum((s) => s.fatDelta),
    sets: sum((s) => s.training.completedSets),
    plannedSets: sum((s) => s.training.plannedSets),
    minutes: sum((s) => s.training.duration * 60),
    trainingDays: logs.filter((s) => s.training.completedSets > 0).length,
    energy: count ? sum((s) => s.meal.calories) / count : 0,
    proteinCoverage: count
      ? sum((s) => s.traces[0]?.proteinCoverage ?? 0) / count
      : 0,
    sleep: count ? sum((s) => s.sleep.hours) / count : 0,
    income,
    food,
    fixed,
    balance,
    other: balance - (income - food - fixed),
    stopped:
      after.pendingEvent ??
      (count < requested
        ? "必要な判断、またはキャリアの終了で停止しました。"
        : null),
  };
}
export function formatDelta(n: number, digits = 3, unit = "") {
  const rounded = Number(n.toFixed(digits));
  return rounded === 0
    ? Math.abs(n) > 1e-9
      ? `変化は${(10 ** -digits).toFixed(digits)}${unit}未満`
      : "0" + unit
    : (rounded > 0 ? "+" : "") + rounded.toFixed(digits) + unit;
}
