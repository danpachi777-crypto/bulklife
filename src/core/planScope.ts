import type { Career } from "./model";
import type { CoachSection, CoachingGuide } from "./coachTypes";
export type PlanScope = "today" | "ongoing";
/** Saved baseline for a one-day adoption; reloading cannot lose the restore. */
export function applyPlanScope(
  before: Career,
  after: Career,
  scope: PlanScope,
  sections: CoachSection[] = ["training", "food", "rest"],
): Career {
  const next = structuredClone(after);
  if (scope === "ongoing") {
    if (!before.oneDayPlan) {
      delete next.oneDayPlan;
      return next;
    }
    const saved = structuredClone(before.oneDayPlan);
    saved.sections = (saved.sections ?? ["training", "food", "rest"]).filter(
      (s) => !sections.includes(s),
    );
    if (!saved.sections.length) {
      delete next.oneDayPlan;
      return next;
    }
    if (sections.includes("training"))
      saved.plan.days = structuredClone(after.plan.days);
    if (sections.includes("rest")) saved.plan.sleep = after.plan.sleep;
    if (sections.includes("food"))
      for (const k of ["calories", "protein", "foodCost", "prep"] as const)
        saved.plan[k] = after.plan[k];
    if (after.coachingGuide) {
      const g: CoachingGuide = structuredClone(
        saved.guide ?? {
          ...after.coachingGuide,
          ownership: { training: "manual", food: "manual", rest: "manual" },
        },
      );
      for (const s of sections)
        g.ownership[s] = after.coachingGuide.ownership[s];
      if (sections.includes("training")) {
        g.minutes = after.coachingGuide.minutes;
        g.priority = after.coachingGuide.priority;
        g.effort = after.coachingGuide.effort;
      }
      if (sections.includes("food")) {
        g.goal = after.coachingGuide.goal;
        g.budget = after.coachingGuide.budget;
        g.foodStyle = after.coachingGuide.foodStyle;
        g.reviewAfter = after.coachingGuide.reviewAfter;
        g.lastAdjustment = after.coachingGuide.lastAdjustment;
        g.adjustmentDirection = after.coachingGuide.adjustmentDirection;
      }
      saved.guide = g;
    }
    if (after.progress) {
      const p = after.progress;
      saved.food ??= {
        mealMode: p.mealMode,
        meals: p.meals,
        purpose: p.purpose,
        posingMinutes: p.posingMinutes,
        cardioMinutes: p.cardioMinutes,
      };
      if (sections.includes("food")) {
        saved.food.mealMode = p.mealMode;
        saved.food.meals = structuredClone(p.meals);
        saved.food.purpose = p.purpose;
      }
      if (sections.includes("rest")) {
        saved.food.posingMinutes = p.posingMinutes;
        saved.food.cardioMinutes = p.cardioMinutes;
      }
    }
    next.oneDayPlan = saved;
    return next;
  }
  next.oneDayPlan = structuredClone(
    before.oneDayPlan ?? {
      day: before.athlete.day,
      plan: before.plan,
      ...(before.coachingGuide ? { guide: before.coachingGuide } : {}),
      ...(before.progress
        ? {
            food: {
              mealMode: before.progress.mealMode,
              meals: before.progress.meals,
              purpose: before.progress.purpose,
              posingMinutes: before.progress.posingMinutes,
              cardioMinutes: before.progress.cardioMinutes,
            },
          }
        : {}),
    },
  );
  next.oneDayPlan.sections = [
    ...new Set([
      ...(before.oneDayPlan
        ? (before.oneDayPlan.sections ?? ["training", "food", "rest"])
        : []),
      ...sections,
    ]),
  ] as CoachSection[];
  return next;
}
export const isTodayOnly = (c: Career, section: CoachSection) =>
  !!c.oneDayPlan &&
  (!c.oneDayPlan.sections || c.oneDayPlan.sections.includes(section));
export function restoreOneDayPlan(c: Career): Career {
  const saved = c.oneDayPlan;
  if (!saved || c.athlete.day <= saved.day) return c;
  const next = { ...c, plan: saved.plan };
  delete next.oneDayPlan;
  if (saved.guide)
    next.coachingGuide = {
      ...saved.guide,
      samples: c.coachingGuide?.samples ?? saved.guide.samples,
    };
  else delete next.coachingGuide;
  if (saved.food && next.progress)
    next.progress = { ...next.progress, ...saved.food };
  return next;
}
