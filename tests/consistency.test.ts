import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PROFILES } from "../src/core/content";
import {
  generateCareer,
  simulateDay,
  advance,
  freshLibrary,
} from "../src/core/simulation";
import { save, loadCareer, exportSave, parseImport } from "../src/core/storage";
import {
  proposeCoach,
  adoptCoach,
  setupCoach,
  explainCoachResult,
  resolvedGoal,
  markManual,
  prepareCoachDay,
} from "../src/core/coach";
import { acknowledgeDecision } from "../src/core/competitions";
import {
  assessFood,
  foodTargets,
  todayTraining,
  periodSummary,
  formatDelta,
} from "../src/core/planning";
import { nutritionPlan } from "../src/core/nutrition";
import { applyPlanScope } from "../src/core/planScope";
import { validateCareer } from "../src/core/validation";
import {
  localEditions,
  enterLocal,
  runLocal,
  scoreLocal,
  localPerson,
} from "../src/core/localCompetitions";
import { localEvaluation } from "../src/core/localEvaluation";
import { CoachToday } from "../src/ui/Coach";
import { progressivePlan } from "../src/core/training";
const make = (i = 0) =>
  setupCoach(generateCareer(PROFILES[i], 42, "bl-consistency-" + i));

test("resuming after a fatigue stop refreshes coached training and preserves manual plans", () => {
  const c = make(1);
  c.athlete.systemicFatigue = 0.83;
  c.pendingEvent = "全身疲労が高まっています。計画を確認してください。";
  const waiting = prepareCoachDay(c);
  assert.deepEqual(waiting.plan, c.plan);
  const resumed = prepareCoachDay(acknowledgeDecision(waiting));
  assert.equal(resumed.pendingEvent, null);
  assert.equal(resumed.plan.days[c.athlete.day % 7].focus, "rest");
  assert.equal(resumed.coachingGuide!.ownership.training, "coach");
  const manual = markManual(c, ["training"]);
  const manualResumed = prepareCoachDay(acknowledgeDecision(manual));
  assert.deepEqual(manualResumed.plan, manual.plan);
  assert.equal(manualResumed.coachingGuide!.ownership.training, "manual");
});

test("competition rest is explained separately from missed training", () => {
  const c = make(1);
  const { summary } = simulateDay(c);
  summary.training.completedSets = 0;
  summary.training.reason = "大会遠征のため練習を休みました。";
  summary.detail!.actual.contestHours = 2;
  summary.traces[0].proteinCoverage = 1;
  const explanation = explainCoachResult(summary);
  assert.match(explanation.what, /大会/);
  assert.doesNotMatch(explanation.what, /一部実施/);
  assert.doesNotMatch(explanation.next, /30分/);
});
test("a today-only weight suggestion leaves all other weekdays unchanged", () => {
  const c = make(),
    day = c.athlete.day % 7;
  c.athlete.ability.chest = 0.9;
  const after = progressivePlan(c, day);
  for (let i = 0; i < 7; i++)
    if (i !== day) assert.deepEqual(after.plan.days[i], c.plan.days[i]);
  assert.notDeepEqual(after.plan.days[day], c.plan.days[day]);
});
test("all six low-budget plans expose nutrient shortage instead of implying configured means adequate", () => {
  for (let i = 0; i < 6; i++) {
    const c = make(i),
      low = adoptCoach(
        c,
        proposeCoach(c, { goal: "build", foodStyle: "quick", budget: 500 }),
        ["food"],
      ),
      better = adoptCoach(
        c,
        proposeCoach(c, { goal: "build", foodStyle: "quick", budget: 1200 }),
        ["food"],
      );
    const a = assessFood(low, "build"),
      b = assessFood(better, "build");
    assert.equal(a.status, "目標に不足");
    assert.ok(a.insufficient);
    assert.ok(b.proteinRatio > a.proteinRatio);
    assert.ok(b.energyRatio > a.energyRatio);
    const result = simulateDay(low)!;
    assert.ok(result.summary.traces[0].proteinCoverage < 0.9);
    assert.match(explainCoachResult(result.summary).what, /不足/);
    assert.equal(
      Math.round(result.summary.meal.calories),
      Math.round(nutritionPlan(low).calories),
    );
  }
});
test("proposal energy target agrees with home target for the actually adopted training", () => {
  for (let i = 0; i < 6; i++) {
    const c = make(i),
      p = proposeCoach(c, { goal: "build", budget: 1200 }),
      after = adoptCoach(c, p);
    assert.equal(foodTargets(after, "build").energy, p.food.target);
  }
});
test("a food-only proposal does not use an unadopted hypothetical training session", () => {
  const c = markManual(make(), ["training"]);
  c.plan.days[c.athlete.day % 7] = {
    focus: "rest",
    sets: 2,
    rir: 3,
    start: 20,
    exercises: [],
  };
  const p = proposeCoach(c, { goal: "build", budget: 1200 }, false, ["food"]),
    after = adoptCoach(c, p, ["food"]);
  assert.equal(p.food.target, foodTargets(after, "build").energy);
  assert.deepEqual(after.plan.days, c.plan.days);
});
test("competition day headline and effective training agree with the simulator after participation", () => {
  let c = make(),
    entry = localEditions(c).find((e) => e.series === "gymMeet")!;
  c = enterLocal(c, entry);
  c.athlete.day = entry.showDay;
  c = runLocal(c, entry.id);
  c.plan.days[c.athlete.day % 7].focus = "full";
  assert.equal(todayTraining(c).focus, "rest");
  assert.equal(todayTraining(c).minutes, 0);
  const html = renderToStaticMarkup(
    createElement(CoachToday, { c, busy: false, onConsult: () => {} }),
  );
  assert.match(html, /大会に合わせて身体を休める/);
  assert.doesNotMatch(html, /全身を育てよう/);
  const result = simulateDay(c)!;
  assert.equal(result.summary.training.completedSets, 0);
  assert.equal(result.summary.training.duration, 0);
  assert.equal(result.summary.detail!.actual.contestHours, 2);
});
test("period result totals every executed day and reconciles actual money", () => {
  const before = make(),
    after = advance(before, 7),
    p = periodSummary(before, after.career, after.logs, 7);
  assert.equal(p.count, 7);
  assert.equal(p.first, 0);
  assert.equal(p.last, 6);
  assert.equal(
    p.muscle,
    after.logs.reduce((n, s) => n + s.muscleDelta, 0),
  );
  assert.ok(Math.abs(p.other) < 1e-8);
  assert.ok(p.food > after.logs.at(-1)!.meal.cost);
  assert.equal(
    p.balance,
    after.career.athlete.life.money - before.athlete.life.money,
  );
});
test("partial week reports real dates and reason when a competition requires a decision", () => {
  let c = make();
  const e = localEditions(c).find((e) => e.series === "gymMeet")!;
  c = enterLocal(c, e);
  c.athlete.day = e.showDay - 2;
  const a = advance(c, 7),
    p = periodSummary(c, a.career, a.logs, 7);
  assert.equal(p.count, 2);
  assert.match(p.stopped!, /開催日/);
  assert.equal(p.last, e.showDay - 1);
});
test("one-day plan survives serialization, restores tomorrow, and retains actual observation history", async () => {
  const before = markManual(make(), ["training", "rest"]),
    proposal = proposeCoach(before, { minutes: 30 }, true),
    once = applyPlanScope(
      before,
      adoptCoach(before, proposal, ["training"]),
      "today",
      ["training"],
    );
  validateCareer(once);
  const restored = JSON.parse(JSON.stringify(once));
  validateCareer(restored);
  const a = simulateDay(restored)!;
  assert.equal(a.summary.training.completedSets, 0);
  assert.deepEqual(a.career.plan, before.plan);
  assert.equal(a.career.coachingGuide!.ownership.training, "manual");
  assert.equal(a.career.coachingGuide!.samples.length, 1);
  assert.equal(a.career.oneDayPlan, undefined);
  const library = {
    ...freshLibrary(4, 5),
    activeId: once.athlete.id,
    ids: [once.athlete.id],
  };
  await save(library, once);
  assert.deepEqual(await loadCareer(once.athlete.id), once);
  assert.deepEqual(
    parseImport(await exportSave(library)).careers[0].oneDayPlan,
    once.oneDayPlan,
  );
  const bad = structuredClone(once);
  bad.oneDayPlan!.day++;
  assert.throws(() => validateCareer(bad));
});
test("ongoing food adoption on a day with temporary training does not overwrite its restore baseline", () => {
  const before = markManual(make(), ["training"]),
    once = applyPlanScope(
      before,
      adoptCoach(before, proposeCoach(before, {}, true), ["training"]),
      "today",
      ["training"],
    );
  const food = adoptCoach(
      once,
      proposeCoach(once, { foodStyle: "quick", budget: 1200 }),
      ["food"],
    ),
    mixed = applyPlanScope(once, food, "ongoing", ["food"]);
  validateCareer(mixed);
  const result = simulateDay(mixed)!;
  assert.deepEqual(result.career.plan.days, before.plan.days);
  assert.equal(result.career.coachingGuide!.ownership.training, "manual");
  assert.equal(result.career.coachingGuide!.foodStyle, "quick");
  assert.deepEqual(result.career.progress!.meals, food.progress!.meals);
});
test("local perfect condition is a declared range, and weighted contributions reproduce the result", () => {
  let c = make();
  const e = localEditions(c).find((e) => e.series === "gymMeet")!;
  c = enterLocal(c, e);
  c.athlete.day = e.showDay;
  c = runLocal(c, e.id);
  const r = c.local!.results.at(-1)!,
    evaluation = localEvaluation(r);
  assert.ok(
    Math.abs(
      evaluation.contributions.reduce((n, x) => n + x.points, 0) -
        r.score.total,
    ) < 1e-8,
  );
  if (r.score.condition === 100) assert.match(evaluation.condition, /12〜22%/);
  assert.equal(scoreLocal(localPerson(c)).condition, r.score.condition);
});
test("rounded deltas never produce negative zero or pretend a tiny change is large", () => {
  assert.doesNotMatch(formatDelta(-0.000001), /-0\.000/);
  assert.match(formatDelta(-0.000001), /未満/);
  assert.equal(formatDelta(0.123), "+0.123");
  assert.equal(formatDelta(0), "0");
  assert.equal(formatDelta(-0.000001, 3, "kg"), "変化は0.001kg未満");
});
