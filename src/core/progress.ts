import {
  partMap,
  muscleMass,
  clamp,
  VERSIONS,
  type BodyState,
  type Career,
} from "./model";
import type { CareerProgress, Rival, Circuit } from "./careerTypes";
import { seasonOf } from "./calendar";
export const RULES_VERSION = "2026-jbbf-ifbb-2027oqs-game-1";
export function randomState(seed: number): [number, number] {
  let x = (seed || 1) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return [x >>> 0, (x >>> 0) / 4294967296];
}
const massWeights = [
  0.035, 0.07, 0.025, 0.025, 0.025, 0.09, 0.06, 0.035, 0.04, 0.06, 0.04, 0.17,
  0.08, 0.13, 0.065, 0.05,
];
export function createRivals(seed: number, year: number, cohort = 0): Rival[] {
  let s = seed;
  const rnd = () => {
    let r;
    [s, r] = randomState(s);
    return r;
  };
  const sum = massWeights.reduce((a, b) => a + b, 0);
  return Array.from({ length: 128 }, (_, i) => {
    const circuit: Circuit = i < 64 ? "jbbf" : "npc",
      local = i % 64,
      tier = local % 4,
      target = [53, 58, 63, 68, 73, 78, 83, 88, 93, 98, 105, 115][
        Math.floor(local / 4) % 12
      ],
      h = clamp(153 + (target - 53) * 0.61 + rnd() * 5, 153, 198),
      mass =
        target *
        0.93 *
        (0.49 + tier * 0.025 + rnd() * 0.025 + (circuit === "npc" ? 0.025 : 0));
    const muscle = partMap(
        (_, j) => ((mass * massWeights[j]) / sum) * (0.97 + rnd() * 0.06),
      ),
      leanOther = target * 0.93 - mass;
    const b: BodyState = {
      height: h,
      shoulder: clamp(h / 172, 0.94, 1.06),
      muscle,
      capacity: partMap((p) => muscle[p] * (1.02 + rnd() * 0.12)),
      fat: target * 0.07,
      otherLean: leanOther,
      waterDelta: 0,
      pump: partMap(() => 0),
      fatigue: partMap(() => 0),
    };
    return {
      id: `cpu-${cohort}-${i}-${s}`,
      name:
        ["蒼井", "成瀬", "高瀬", "宮原", "浅野", "森川", "西野", "平岡"][
          i % 8
        ] +
        ["悠人", "拓真", "翔", "涼", "誠", "健人", "直也", "航"][
          Math.floor(i / 8) % 8
        ],
      birthYear: year - 24 - Math.floor(rnd() * 18),
      circuit,
      tier,
      body: b,
      posing: 0.55 + tier * 0.07 + rnd() * 0.1,
      response: 0.4 + rnd() * 0.6,
      lastYear: year,
      retired: false,
      history: [],
    };
  });
}
export function createProgress(
  c: Career,
  source: "new" | "legacyUpgrade" = "new",
): CareerProgress {
  const seed = (c.rng ^ 0x9e3779b9) >>> 0 || 1,
    year = seasonOf(c.athlete.day);
  return {
    version: 1,
    rulesVersion: RULES_VERSION,
    contentVersion: "career-0.2",
    seed,
    eventRng: (seed ^ 0x12345678) >>> 0 || 1,
    rivalRng: (seed ^ 0x76543210) >>> 0 || 1,
    lastRivalYear: year,
    posing: 0.08,
    posingMinutes: 10,
    cardioMinutes: 0,
    recoveryUntil: 0,
    goal: null,
    credentials: [],
    entries: [],
    results: [],
    titles: [],
    rivals: createRivals(seed, year),
    seen: [],
    decision: null,
    finalSeason: null,
    retirement: null,
    choices: [],
    trainingDays: 0,
    employmentBase: {
      income: c.athlete.life.income,
      work: c.athlete.life.work,
      commute: c.athlete.life.commute,
    },
    coach: false,
    equipment: "gym",
    mealMode: "aggregate",
    meals: [],
    waterLitres: 2,
    purpose: "maintain",
    injuryUntil: 0,
    asymmetry: partMap(() => 0),
    initialSource: source,
  };
}
export function enableCareer(c: Career): Career {
  return c.progress
    ? c
    : {
        ...c,
        versions: {
          ...VERSIONS,
          model: c.versions.model,
          mapping: c.versions.mapping,
        },
        progress: createProgress(c, "legacyUpgrade"),
      };
}
export function updateRivals(p: CareerProgress, year: number): CareerProgress {
  if (year <= p.lastRivalYear) return p;
  let rng = p.rivalRng;
  let rivals = p.rivals.map((r) => {
    let b = r.body,
      posing = r.posing;
    for (let y = r.lastYear + 1; y <= year; y++) {
      const age = y - r.birthYear;
      const muscle = partMap((k) =>
        Math.max(
          0.01,
          b.muscle[k] +
            (b.capacity[k] - b.muscle[k]) * 0.13 * r.response -
            (age > 45 ? b.muscle[k] * (age - 45) * 0.001 : 0),
        ),
      );
      b = { ...b, muscle };
      posing = clamp(posing + 0.008, 0, 1);
    }
    return {
      ...r,
      body: b,
      posing,
      lastYear: year,
      retired: year - r.birthYear >= 56,
    };
  });
  for (let y = p.lastRivalYear + 1; y <= year; y++) {
    [rng] = randomState(rng);
    const newRivals = createRivals(rng, y, y)
      .filter((_, i) => i % 4 === y % 4)
      .map((r) => ({ ...r, birthYear: y - 23 - r.tier }));
    rivals = [...rivals, ...newRivals];
  }
  // Preserve retired rivals who appear in records; cap unrelated retired cohorts.
  const recorded = new Set(
    p.results.flatMap((r) => r.rivalResults.map((x) => x.id)),
  );
  rivals = rivals.filter(
    (r) => !r.retired || recorded.has(r.id) || year - r.birthYear < 60,
  );
  return { ...p, rivalRng: rng, lastRivalYear: year, rivals };
}
export function changeEmployment(c: Career, ratio: number): Career {
  const p = c.progress;
  if (!p || c.athlete.status !== "active")
    throw new Error("育成中の競技キャリアが必要です");
  ratio = clamp(ratio, 0.5, 1.2);
  const next = {
    ...c,
    athlete: {
      ...c.athlete,
      life: {
        ...c.athlete.life,
        work: p.employmentBase.work * ratio,
        income: Math.round(p.employmentBase.income * ratio),
        commute: p.employmentBase.commute,
      },
    },
    progress: {
      ...p,
      choices: [
        ...p.choices,
        {
          id: `work-${c.athlete.day}-${p.choices.length}`,
          day: c.athlete.day,
          kind: "work",
          label: `勤務を基準の${Math.round(ratio * 100)}%へ調整`,
        },
      ],
    },
  };
  return next;
}
export function changeEquipment(c: Career, equipment: "gym" | "home"): Career {
  const p = c.progress;
  if (!p || c.athlete.status !== "active")
    throw new Error("育成中の競技キャリアが必要です");
  const owned = p.homeEquipmentOwned === true || p.equipment === "home",
    cost = equipment === "home" && !owned ? 20000 : 0;
  if (cost > 0 && c.athlete.life.money < cost)
    throw new Error("自宅器具の準備に20,000円が必要です");
  return {
    ...c,
    athlete: {
      ...c.athlete,
      life: {
        ...c.athlete.life,
        money: c.athlete.life.money - cost,
        gymMonthly: equipment === "home" ? 1500 : 5000,
      },
    },
    progress: {
      ...p,
      equipment,
      homeEquipmentOwned: owned || equipment === "home",
    },
  };
}
