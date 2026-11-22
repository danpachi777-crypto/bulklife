import {
  PARTS,
  weight,
  muscleMass,
  fatPercent,
  clamp,
  type Career,
  type DayPlan,
  type Part,
  type Focus,
  type DailySummary,
} from "./model";
import { FOCUS_LABELS, STIMULUS } from "./content";
import { exerciseById, exerciseCapacity, sessionMinutes } from "./exercises";
import { nutritionPlan, mealTotals, type MealItem } from "./nutrition";
import { FOODS } from "./foods";
import { trainingWindow } from "./simulation";
import { enableCareer } from "./progress";
import type {
  CoachingGuide,
  CoachSection,
  CoachGoal,
  CoachPriority,
  FoodStyle,
} from "./coachTypes";
import { energyExpenditure, todayTraining } from "./planning";
export const GOALS: Record<CoachGoal, string> = {
  build: "身体を大きくしたい",
  cut: "脂肪を落として引き締めたい",
  balance: "今の体型を整えたい",
  ask: "コーチに相談して決めたい",
};
export const PRIORITIES: Record<CoachPriority, string> = {
  balanced: "全身をバランスよく",
  chest: "胸",
  back: "背中",
  shoulders: "肩",
  arms: "腕",
  legs: "脚・お尻",
};
export const FOOD_STYLES: Record<FoodStyle, string> = {
  recommend: "コーチのおすすめ",
  budget: "節約して自炊",
  quick: "手軽に済ませる",
};
export const EFFORT = {
  light: "軽め",
  standard: "標準",
  hard: "しっかり",
} as const;
const priorityParts: Record<CoachPriority, Part[]> = {
  balanced: [...PARTS],
  chest: ["chest", "upperChest"],
  back: ["lats", "upperBack"],
  shoulders: ["frontDelts", "sideDelts", "rearDelts"],
  arms: ["biceps", "triceps", "forearms"],
  legs: ["quads", "hamstrings", "glutes", "calves"],
};
export function guideFor(c: Career): CoachingGuide {
  return (
    c.coachingGuide ?? {
      version: 1,
      goal: "ask",
      minutes: 45,
      budget: 850,
      priority: "balanced",
      effort: "standard",
      foodStyle: "recommend",
      ownership: { training: "manual", food: "manual", rest: "manual" },
      adoptedDay: c.athlete.day,
      reviewAfter: c.athlete.day + 14,
      lastAdjustment: -100,
      adjustmentDirection: 0,
      samples: [],
    }
  );
}
export function resolvedGoal(
  c: Career,
  g = guideFor(c),
): Exclude<CoachGoal, "ask"> {
  return g.goal === "ask"
    ? fatPercent(c.athlete.body) >= 24
      ? "cut"
      : fatPercent(c.athlete.body) < 16
        ? "build"
        : "balance"
    : g.goal;
}
function restRequired(c: Career) {
  const a = c.athlete;
  return (
    a.status === "retired" ||
    a.systemicFatigue > 0.64 ||
    (!!c.progress && a.day < c.progress.injuryUntil) ||
    !!c.local?.results.some((r) => r.day === a.day) ||
    !!c.progress?.results.some((r) => r.day === a.day) ||
    !!c.progress?.entries.some(
      (e) =>
        ["travelled", "checkedIn"].includes(e.status) &&
        a.day >= e.travelDay &&
        a.day <= e.showDay,
    )
  );
}
function chooseFocus(c: Career, g: CoachingGuide): Focus {
  if (restRequired(c)) return "rest";
  // A full rest day follows a recent session when local fatigue remains high.
  const average =
    PARTS.reduce((s, p) => s + c.athlete.body.fatigue[p], 0) / PARTS.length;
  if (average > 0.36) return "rest";
  const choices: Focus[] = ["full", "push", "pull", "legs"];
  const scores = choices.map((f) => {
    const relevant = PARTS.filter((p) => STIMULUS[f][p] > 0.3);
    const tired =
      relevant.reduce((s, p) => s + c.athlete.body.fatigue[p], 0) /
      relevant.length;
    const emphasis =
      g.priority === "balanced"
        ? f === "full"
          ? 0.13
          : 0
        : (priorityParts[g.priority].reduce((s, p) => s + STIMULUS[f][p], 0) /
            priorityParts[g.priority].length) *
          0.2;
    const repeat = c.lastSummary?.training.focus === f ? 0.09 : 0;
    return { f, score: tired + repeat - emphasis };
  });
  scores.sort((a, b) => a.score - b.score);
  return scores[0].f;
}
const recipes: Record<Exclude<Focus, "rest">, string[]> = {
  full: ["squat", "supportedRow", "bench", "lateral"],
  push: ["incline", "ohp", "lateral", "overheadTri"],
  pull: ["supportedRow", "pullup", "curl", "rearFly"],
  legs: ["squat", "rdl", "splitSquat", "calf"],
};
function training(
  c: Career,
  g: CoachingGuide,
  forceRest = false,
): { day: DayPlan; reason: string; limit: number } {
  const focus = forceRest ? "rest" : chooseFocus(c, g),
    dayIndex = c.athlete.day % 7;
  const day: DayPlan = {
    focus,
    sets: 2,
    rir: g.effort === "light" ? 5 : g.effort === "hard" ? 2 : 3,
    start: c.plan.days[dayIndex].start,
    exercises: [],
  };
  if (focus === "rest")
    return {
      day,
      reason: forceRest
        ? "今日は負担をかけず、回復に使う計画です。"
        : restRequired(c)
          ? "現在の疲労・回復期間・大会予定に合わせ、筋力練習を休む計画です。"
          : "複数の部位に疲労が残っているため、今日は休養を挟みます。",
      limit: g.minutes,
    };
  // Select a real window, including work, commuting, wake time and travel.
  const candidates = [
    day.start,
    19,
    20,
    18,
    8,
    21,
    7.5,
    16,
    14,
    12,
    10,
    22,
  ].filter((v, i, a) => a.indexOf(v) === i);
  let best = -1,
    start = day.start;
  for (const time of candidates) {
    const copy = {
      ...c,
      plan: {
        ...c.plan,
        days: c.plan.days.map((d, i) =>
          i === dayIndex ? { ...d, start: time } : d,
        ),
      },
    };
    const w = trainingWindow(copy, dayIndex);
    if (!w.insideWork && !w.beforeWake && w.available > best) {
      best = w.available;
      start = time;
    }
  }
  day.start = start;
  const work =
    dayIndex < 5 ? (c.athlete.life.work + c.athlete.life.commute) / 5 : 0;
  const remaining =
    (24 -
      work -
      c.plan.sleep -
      nutritionPlan(c).prep -
      3 -
      ((c.progress?.posingMinutes ?? 0) + (c.progress?.cardioMinutes ?? 0)) /
        60) *
    60;
  const limit = Math.max(0, Math.min(g.minutes, best * 60, remaining));
  if (limit < 13)
    return {
      day: { ...day, focus: "rest" },
      reason:
        "仕事・食事準備・睡眠を確保すると練習時間が足りないため、今日は休養にします。",
      limit,
    };
  const ids = [...recipes[focus]];
  if (g.priority !== "balanced")
    ids.sort((a, b) => {
      const ea = exerciseById(a)!,
        eb = exerciseById(b)!;
      return priorityParts[g.priority].reduce(
        (s, p) => s + eb.direct[p] - ea.direct[p],
        0,
      );
    });
  const fatigue = c.athlete.systemicFatigue;
  for (const id of ids) {
    const e = exerciseById(id)!;
    if (
      c.progress?.equipment === "home" &&
      !["free", "bodyweight"].includes(e.equipment)
    )
      continue;
    const cap = exerciseCapacity(
      e,
      c.athlete.body.muscle,
      c.athlete.ability,
      c.initial.body.muscle,
    );
    const plan = {
      exerciseId: id,
      sets: 1,
      reps: 10,
      rir: day.rir,
      rest: 90,
      rom: 1,
      priority: "rir" as const,
      load: Math.max(0.5, Math.round(cap * (0.78 - fatigue * 0.12) * 2) / 2),
    };
    if (sessionMinutes([...day.exercises!, plan]) <= limit)
      day.exercises!.push(plan);
  }
  // More time funds real sets; it does not grant the same stimulus for free.
  for (let pass = 0; pass < 2; pass++)
    for (const x of day.exercises!) {
      const copy = structuredClone(day.exercises!);
      copy.find((p) => p.exerciseId === x.exerciseId)!.sets++;
      if (sessionMinutes(copy) <= limit) x.sets++;
    }
  if (!day.exercises!.length) day.focus = "rest";
  const protectedParts = PARTS.filter((p) => c.athlete.body.fatigue[p] > 0.35);
  const reason = protectedParts.length
    ? `疲労の少ない${FOCUS_LABELS[day.focus]}を中心に、使える${Math.round(limit)}分に収めました。`
    : `${g.priority === "balanced" ? "全身の土台" : PRIORITIES[g.priority]}を育てる種目を、仕事と睡眠に重ならない時間へ組みました。`;
  return { day, reason, limit };
}
function food(
  c: Career,
  g: CoachingGuide,
  trainingMinutes: number,
  calorieOverride?: number,
) {
  const w = weight(c.athlete.body),
    goal = resolvedGoal(c, g),
    offset = goal === "build" ? 175 : goal === "cut" ? -300 : 0;
  const calories =
    Math.round(
      clamp(
        calorieOverride ??
          energyExpenditure(
            c.athlete.body,
            trainingMinutes,
            c.progress?.cardioMinutes ?? 0,
          ) + offset,
        1200,
        4500,
      ) / 25,
    ) * 25;
  const proteinTarget = w * 1.6;
  const items: MealItem[] =
    g.foodStyle === "quick"
      ? [
          { foodId: "bread", grams: 140, time: 7.5 },
          { foodId: "milk", grams: 250, time: 7.5 },
          { foodId: "yogurt", grams: 200, time: 12.5 },
          { foodId: "banana", grams: 120, time: 7.5 },
          { foodId: "tofu", grams: 300, time: 19 },
          { foodId: "chicken-breast", grams: 230, time: 19 },
          { foodId: "broccoli", grams: 140, time: 19 },
          { foodId: "olive-oil", grams: 18, time: 19 },
        ]
      : [
          { foodId: "oats", grams: 60, time: 7.5 },
          { foodId: "milk", grams: 250, time: 7.5 },
          { foodId: "banana", grams: 100, time: 7.5 },
          {
            foodId: "tofu",
            grams: g.foodStyle === "budget" ? 350 : 150,
            time: 19,
          },
          {
            foodId: "chicken-breast",
            grams: Math.max(100, Math.round((proteinTarget - 60) / 0.388)),
            time: 19,
          },
          { foodId: "broccoli", grams: 150, time: 12.5 },
          { foodId: "spinach", grams: 100, time: 19 },
          { foodId: "olive-oil", grams: 20, time: 19 },
        ];
  const rice = FOODS.find((f) => f.id === "rice")!;
  const riceGrams = Math.max(
    100,
    (calories - mealTotals(items).calories) / (rice.kcal / 100),
  );
  items.push(
    { foodId: "rice", grams: Math.round(riceGrams / 2), time: 12.5 },
    { foodId: "rice", grams: Math.round(riceGrams / 2), time: 19 },
  );
  let totals = mealTotals(items);
  // Style uses the same food composition, with explicit game service/prep costs.
  const service =
    g.foodStyle === "quick" ? 1.38 : g.foodStyle === "budget" ? 0.83 : 1;
  const effort =
    g.foodStyle === "quick" ? 0.35 : g.foodStyle === "budget" ? 1.35 : 1;
  const desiredCost = totals.cost * service;
  const ratio = Math.min(1, g.budget / Math.max(1, desiredCost));
  const scaled = items.map((x) => ({
    ...x,
    grams: Math.max(1, Math.round(x.grams * ratio)),
  }));
  totals = mealTotals(scaled);
  const cost = Math.min(g.budget, Math.round(totals.cost * service));
  const prep = clamp((totals.prep / 60) * effort, 0.25, 2);
  return {
    items: scaled,
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    cost: Math.max(300, cost),
    prep,
    coverage: Math.min(1, totals.protein / proteinTarget),
    target: calories,
    ratio,
    reason: `${goal === "build" ? "身体を大きくする目標に合わせて消費目安に少し足す" : goal === "cut" ? "ゲーム内の消費目安より約300kcal控える" : "ゲーム内の消費目安に合わせる"}食事案です。${ratio < 0.95 ? "予算に収めるため量も減り、目標の充足は下がります。" : "量と予算を両立する組み合わせです。"}`,
  };
}
export interface CoachProposal {
  guide: CoachingGuide;
  training: DayPlan;
  minutes: number;
  food: ReturnType<typeof food>;
  sleep: number;
  reason: string;
  tradeoff: string;
  sections: CoachSection[];
}
export function proposeCoach(
  c: Career,
  patch: Partial<CoachingGuide> = {},
  forceRest = false,
  sections: CoachSection[] = ["training", "food", "rest"],
): CoachProposal {
  const guide = { ...guideFor(c), ...patch };
  const train = training(c, guide, forceRest);
  const minutes =
    train.day.focus === "rest" ? 0 : sessionMinutes(train.day.exercises ?? []);
  const executionMinutes = sections.includes("training")
    ? minutes
    : todayTraining(c).minutes;
  const meal = food(c, guide, executionMinutes);
  const executionPrep = sections.includes("food")
    ? meal.prep
    : nutritionPlan(c).prep;
  const dayIndex = c.athlete.day % 7,
    work =
      dayIndex < 5 ? (c.athlete.life.work + c.athlete.life.commute) / 5 : 0;
  const sleep = clamp(
    Math.min(
      8,
      24 -
        work -
        executionPrep -
        3 -
        executionMinutes / 60 -
        ((c.progress?.posingMinutes ?? 0) + (c.progress?.cardioMinutes ?? 0)) /
          60,
    ),
    3,
    9,
  );
  return {
    guide,
    training: train.day,
    minutes,
    food: meal,
    sleep: Math.round(sleep * 2) / 2,
    reason: train.reason,
    tradeoff: `${Math.round(minutes)}分・食費${meal.cost}円・準備${Math.round(meal.prep * 60)}分。${guide.minutes <= 30 && minutes > 0 ? "短時間のため種目と実施量を絞っています。" : ""}${guide.foodStyle === "budget" ? "同じ食品量なら準備の手間を多く使うプランです。" : guide.foodStyle === "quick" ? "手間を減らす分、同じ予算では食事量が少なくなります。" : ""}`,
    sections,
  };
}
export function adoptCoach(
  c: Career,
  p: CoachProposal,
  sections: CoachSection[] = p.sections,
): Career {
  const next = structuredClone(enableCareer(c)),
    g = {
      ...p.guide,
      ownership: { ...guideFor(c).ownership },
      samples: guideFor(c).samples,
      adoptedDay: c.athlete.day,
    };
  if (sections.includes("food") && g.goal !== guideFor(c).goal) {
    g.reviewAfter = c.athlete.day + 14;
    g.lastAdjustment = -100;
    g.adjustmentDirection = 0;
  }
  if (!sections.includes("food")) {
    g.foodStyle = guideFor(c).foodStyle;
    g.budget = guideFor(c).budget;
  }
  if (!sections.includes("training")) {
    g.minutes = guideFor(c).minutes;
    g.priority = guideFor(c).priority;
    g.effort = guideFor(c).effort;
  }
  for (const section of sections) g.ownership[section] = "coach";
  next.coachingGuide = g;
  if (sections.includes("training"))
    next.plan.days[c.athlete.day % 7] = structuredClone(p.training);
  if (sections.includes("rest")) next.plan.sleep = p.sleep;
  if (sections.includes("food")) {
    // Real food composition feeds the existing simulator. The bounded aggregate
    // fields remain a legacy/manual fallback; food-mode execution uses the items.
    Object.assign(next.plan, {
      calories: clamp(p.food.calories, 1000, 5000),
      protein: clamp(p.food.protein, 30, 250),
      foodCost: p.food.cost,
      prep: p.food.prep,
    });
    if (next.progress) {
      const goal = resolvedGoal(c, p.guide);
      next.progress.mealMode = "foods";
      next.progress.meals = p.food.items;
      next.progress.purpose = goal === "balance" ? "maintain" : goal;
    }
  }
  return next;
}
export function setupCoach(
  c: Career,
  patch: Partial<CoachingGuide> = {},
): Career {
  const guide = {
    ...guideFor(c),
    ...patch,
    ownership: { training: "coach", food: "coach", rest: "coach" } as const,
  };
  let next = adoptCoach(c, proposeCoach(c, guide));
  // Start with a real alternating weekly plan; daily renewal concerns only the
  // current coach-managed training. Bulk weeks always execute this visible plan.
  for (let i = 0; i < 7; i++)
    if (i !== c.athlete.day % 7) {
      next.plan.days[i] =
        i % 2
          ? { focus: "rest", sets: 2, rir: 3, start: 20, exercises: [] }
          : structuredClone(next.plan.days[c.athlete.day % 7]);
    }
  return next;
}
export function prepareCoachDay(c: Career): Career {
  if (
    !c.coachingGuide ||
    c.coachingGuide.ownership.training === "manual" ||
    c.pendingEvent ||
    c.athlete.status === "retired"
  )
    return c;
  return adoptCoach(c, proposeCoach(c), ["training"]);
}
export function markManual(c: Career, sections: CoachSection[]): Career {
  if (!c.coachingGuide) return c;
  const next = structuredClone(c);
  for (const s of sections) next.coachingGuide!.ownership[s] = "manual";
  return next;
}
export function markChangedManual(before: Career, after: Career): Career {
  const sections: CoachSection[] = [];
  if (JSON.stringify(before.plan.days) !== JSON.stringify(after.plan.days))
    sections.push("training");
  if (
    JSON.stringify(nutritionPlan(before)) !==
    JSON.stringify(nutritionPlan(after))
  )
    sections.push("food");
  if (
    before.plan.sleep !== after.plan.sleep ||
    before.progress?.posingMinutes !== after.progress?.posingMinutes ||
    before.progress?.cardioMinutes !== after.progress?.cardioMinutes
  )
    sections.push("rest");
  return markManual(after, sections);
}
const average = (a: number[]) =>
  a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
export function coachReview(c: Career) {
  const g = c.coachingGuide;
  if (!g || g.samples.length < 14 || c.athlete.day < g.reviewAfter) return null;
  const a = g.samples.slice(-14);
  if (a.some((x, i) => i > 0 && x.day !== a[i - 1].day + 1)) return null;
  const previous = average(a.slice(0, 7).map((x) => x.weight)),
    current = average(a.slice(7).map((x) => x.weight)),
    delta = current - previous;
  const goal = resolvedGoal(c, g),
    target =
      ((goal === "build" ? 175 : goal === "cut" ? -300 : 0) * 7) / 7700 +
      ((a.at(-1)!.muscle - a[0].muscle) / 13) * 7;
  const tolerance = Math.max(0.16, current * 0.0025);
  let adjustment =
    delta > target + tolerance ? -125 : delta < target - tolerance ? 125 : 0;
  if (!adjustment) return null;
  const direction = adjustment > 0 ? 1 : -1;
  if (
    g.adjustmentDirection !== 0 &&
    g.adjustmentDirection !== direction &&
    c.athlete.day - g.lastAdjustment < 28
  )
    return null;
  const n = nutritionPlan(c);
  if (
    average(a.map((x) => x.mealRatio)) < 0.9 ||
    proposeCoach(c, {}, false, ["food"]).food.ratio < 0.9 ||
    (adjustment > 0 &&
      n.cost * (1 + adjustment / Math.max(1, n.calories)) > g.budget)
  )
    return {
      kind: "budget" as const,
      delta,
      adjustment: 0,
      message:
        "今の食費や資金では、目標に合わせた量を十分に賄いにくい状態です。量を変える前に、食費と生活費の配分を相談しましょう。",
    };
  return {
    kind: "food" as const,
    delta,
    adjustment,
    message: `前後7日ずつの平均体重を比べると${delta >= 0 ? "+" : ""}${delta.toFixed(2)}kg。${adjustment < 0 ? "目標より増加が速い" : "目標より増加が遅い、または減少が速い"}ため、食事を約${Math.abs(adjustment)}kcal${adjustment < 0 ? "減らす" : "増やす"}提案です。水分の1日差だけで判断していません。`,
  };
}
export function decideReview(c: Career, accept: boolean): Career {
  const review = coachReview(c);
  if (!review || !c.coachingGuide) return c;
  let next = structuredClone(c);
  next.coachingGuide!.reviewAfter = c.athlete.day + 14;
  if (accept && review.adjustment) {
    const p = proposeCoach(c, {}, false, ["food"]),
      current = nutritionPlan(c),
      ratio =
        (current.calories + review.adjustment) / Math.max(1, current.calories);
    const items = (c.progress?.meals ?? p.food.items).map((x) => ({
      ...x,
      grams: Math.max(1, Math.round(x.grams * ratio)),
    }));
    const totals = mealTotals(items),
      service =
        p.guide.foodStyle === "quick"
          ? 1.38
          : p.guide.foodStyle === "budget"
            ? 0.83
            : 1,
      effort =
        p.guide.foodStyle === "quick"
          ? 0.35
          : p.guide.foodStyle === "budget"
            ? 1.35
            : 1;
    p.food = {
      ...p.food,
      items,
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      cost: Math.min(
        p.guide.budget,
        Math.max(300, Math.round(totals.cost * service)),
      ),
      prep: clamp((totals.prep / 60) * effort, 0.25, 2),
    };
    next = adoptCoach(next, p, ["food"]);
    next.coachingGuide!.lastAdjustment = c.athlete.day;
    next.coachingGuide!.adjustmentDirection = review.adjustment > 0 ? 1 : -1;
    next.coachingGuide!.reviewAfter = c.athlete.day + 14;
  }
  return next;
}
export function weeklyCoach(c: Career) {
  const a = c.coachingGuide?.samples.slice(-7);
  if (!a || a.length < 7) return null;
  const sets = a.reduce((s, x) => s + x.completedSets, 0),
    planned = a.reduce((s, x) => s + x.plannedSets, 0),
    delta = a.at(-1)!.weight - a[0].weight;
  const sleep = average(a.map((x) => x.sleep)),
    fatigue = average(a.map((x) => x.fatigue));
  return {
    days: a.filter((x) => x.completedSets > 0).length,
    sets,
    planned,
    sleep,
    delta,
    muscle: a.at(-1)!.muscle - a[0].muscle,
    fatigue,
    message:
      planned && sets / planned < 0.8
        ? "曜日の予定と実績に差がありました。大会・回復期間・時間不足など、各日の理由を確認して次の計画を相談できます。"
        : sleep < 7
          ? "睡眠が短めでした。来週は食事準備や練習の時間配分を見直せます。"
          : fatigue > 0.5
            ? "疲労が残る週でした。軽い練習や休養を挟む案を相談できます。"
            : "予定した行動を積み重ねた週です。体型の比較は数週間単位で確かめましょう。",
  };
}
export function explainCoachResult(s: DailySummary) {
  const d = s.detail;
  if ((s.traces[0]?.proteinCoverage ?? 1) < 0.9)
    return {
      what:
        s.meal.calories > 0
          ? "食事の実績は栄養の目標に不足しています"
          : "予定の食事を確保できませんでした",
      meaning: `ゲーム内のたんぱく質充足は${Math.round(s.traces[0].proteinCoverage * 100)}%。予定を賄えた割合と、身体に必要な目標の充足は別です。${(s.traces[0]?.energyFactor ?? 1) < 0.6 ? "エネルギー条件も成長を抑える値でした。" : ""}`,
      next: "次は食事の相談で、目標量・食費上限・自炊と手軽な案を比べられます。筋質量の変化を食事だけの原因とは断定しません。",
    };
  if (s.detail?.actual.contestHours || s.training.reason.startsWith("大会遠征"))
    return {
      what: "大会に合わせて筋力練習を休みました",
      meaning:
        "大会・遠征日は通常の筋力練習を休止します。曜日の練習予定が残っていても、時間不足で実行できなかった日とは区別します。",
      next: "大会の評価を振り返り、翌日の疲労と回復を見て次の計画を決めましょう。",
    };
  if (s.training.reason.startsWith("違和感の回復期間"))
    return {
      what: "回復期間として筋力練習を休みました",
      meaning: s.training.reason,
      next: "ゲーム内の回復期間を確認し、食事と睡眠の計画を見直せます。",
    };
  if (s.training.completedSets < s.training.plannedSets)
    return {
      what: "予定の練習を一部実施しました",
      meaning: s.training.reason,
      next: "次は「今日は30分」など、確保できる時間から計画を組み直せます。",
    };
  if ((d?.after.fatigue ?? 0) > 0.5)
    return {
      what: "疲労が残っています",
      meaning: `実行後の全身疲労は${Math.round(d!.after.fatigue * 100)}/100です。負担と回復の計算結果です。`,
      next: "次は「疲れている」から、軽めの練習か休養を相談できます。",
    };
  if ((d?.actual.mealRatio ?? 1) < 0.95)
    return {
      what: "食事の一部を賄いました",
      meaning: `予定量の${Math.round(d!.actual.mealRatio * 100)}%が実績です。`,
      next: "次は食費を抑える案と、仕事・生活費の配分を確認できます。",
    };
  return {
    what:
      s.training.focus === "rest"
        ? "回復に使う一日を過ごしました"
        : "予定した練習を積み重ねました",
    meaning: `${s.training.completedSets}セット、睡眠${s.sleep.hours.toFixed(1)}時間を記録しました。短期の小さな体重差は成長の評価に使いません。`,
    next: "翌日の身体と疲労を見て、次の計画を確認しましょう。",
  };
}
