import {
  PARTS,
  partMap,
  clamp,
  weight,
  fatPercent,
  type Career,
  type BodyState,
} from "./model";
import { MASS_WEIGHTS } from "./content";
import { randomState } from "./progress";
import { scoreBody } from "./competitions";
export type LocalSeries = "gymMeet" | "rookieMeet" | "localOpen";
export const LOCAL_RULE = "local-fiction-1";
export const LOCAL_DEFS = {
  gymMeet: {
    name: "リーフジム・ミニコンテスト",
    place: "リーフジム / 練習会",
    offset: 13,
    period: 14,
    deadline: 2,
    fee: 500,
    travel: 0,
    hours: 2,
    tier: 0,
  },
  rookieMeet: {
    name: "みどり地域・新人ステージ",
    place: "みどり市民ホール / 地域",
    offset: 20,
    period: 28,
    deadline: 4,
    fee: 1500,
    travel: 500,
    hours: 4,
    tier: 1,
  },
  localOpen: {
    name: "川沿い地方・オープンカップ",
    place: "川沿い文化センター / 地方",
    offset: 34,
    period: 56,
    deadline: 7,
    fee: 4000,
    travel: 2000,
    hours: 6,
    tier: 2,
  },
} as const;
export interface LocalEdition {
  id: string;
  series: LocalSeries;
  showDay: number;
  deadlineDay: number;
}
export interface LocalPerson {
  id: string;
  name: string;
  body: BodyState;
  posing: number;
  asymmetry: number;
  systemicFatigue: number;
  previousSleep: number;
}
export interface LocalRival extends LocalPerson {
  tier: number;
  response: number;
  bornDay: number;
}
export interface LocalScore {
  mass: number;
  balance: number;
  condition: number;
  posing: number;
  readiness: number;
  total: number;
}
export interface LocalEntry extends LocalEdition {
  status: "entered" | "completed" | "withdrawn";
  paid: number;
}
export interface LocalStanding {
  id: string;
  name: string;
  rank: number;
  score: LocalScore;
}
export interface LocalResult {
  id: string;
  entryId: string;
  editionId: string;
  series: LocalSeries;
  day: number;
  classId: string;
  rank: number;
  count: number;
  score: LocalScore;
  body: BodyState;
  posing: number;
  standings: LocalStanding[];
  podium: LocalPerson[];
  rulesVersion: typeof LOCAL_RULE;
}
export interface LocalState {
  version: 1;
  rulesVersion: typeof LOCAL_RULE;
  seed: number;
  anchorDay: number;
  lastUpdateDay: number;
  goalEditionId: string | null;
  decision: string | null;
  entries: LocalEntry[];
  results: LocalResult[];
  rivals: LocalRival[];
}
export function createLocal(c: Career): LocalState {
  let s = (c.rng ^ 0x31f781a9) >>> 0 || 1;
  const seed = s,
    rnd = () => {
      let v;
      [s, v] = randomState(s);
      return v;
    };
  const rivals = Array.from({ length: 72 }, (_, i) => {
    const tier = Math.floor(i / 24),
      w = 58 + (i % 8) * 6,
      h = 158 + (i % 8) * 4 + rnd() * 4,
      fat = 0.12 + rnd() * 0.18,
      mass = w * (1 - fat) * (0.43 + tier * 0.025 + rnd() * 0.05),
      sum = MASS_WEIGHTS.reduce((a, b) => a + b, 0),
      muscle = partMap(
        (_, j) => ((mass * MASS_WEIGHTS[j]) / sum) * (0.85 + rnd() * 0.3),
      );
    return {
      id: `local-cpu-${i}`,
      name:
        ["白井", "森田", "木下", "田辺", "高井", "小西", "榎本", "久保"][
          i % 8
        ] +
        ["航", "悠", "誠", "涼", "陸", "蓮", "拓", "陽", "渉"][
          Math.floor(i / 8)
        ],
      tier,
      response: 0.3 + rnd() * 0.7,
      bornDay: c.athlete.day,
      body: {
        height: h,
        shoulder: clamp(h / 172, 0.94, 1.06),
        muscle,
        capacity: partMap((p) => muscle[p] * (1.3 + rnd() * 0.5)),
        fat: w * fat,
        otherLean: w * (1 - fat) - mass,
        waterDelta: 0,
        pump: partMap(() => 0),
        fatigue: partMap(() => rnd() * 0.25),
      },
      posing: 0.03 + tier * 0.16 + rnd() * 0.28,
      asymmetry: rnd() * 0.04,
      systemicFatigue: rnd() * 0.3,
      previousSleep: 6 + rnd() * 2.5,
    };
  });
  return {
    version: 1,
    rulesVersion: LOCAL_RULE,
    seed,
    anchorDay: c.athlete.day,
    lastUpdateDay: c.athlete.day,
    goalEditionId: null,
    decision: null,
    entries: [],
    results: [],
    rivals,
  };
}
export function enableLocal(c: Career): Career {
  if (!c.progress) throw new Error("競技キャリアを先に追加してください");
  return c.local ? c : { ...c, local: createLocal(c) };
}
export function localEditions(c: Career): LocalEdition[] {
  if (!c.local) return [];
  const anchor = c.local.anchorDay,
    day = c.athlete.day;
  return (Object.keys(LOCAL_DEFS) as LocalSeries[])
    .flatMap((series) => {
      const d = LOCAL_DEFS[series],
        n = Math.max(0, Math.floor((day - anchor - d.offset) / d.period));
      return Array.from({ length: 3 }, (_, i) => {
        const showDay = anchor + d.offset + (n + i) * d.period;
        return {
          id: `${series}-${showDay}`,
          series,
          showDay,
          deadlineDay: showDay - d.deadline,
        };
      });
    })
    .filter((e) => e.showDay >= day)
    .sort((a, b) => a.showDay - b.showDay);
}
export function localClass(series: LocalSeries, w: number) {
  return series === "gymMeet"
    ? "Open"
    : w <= 70
      ? "70kg以下"
      : w <= 85
        ? "70〜85kg"
        : "85kg超";
}
export function localEligibility(c: Career, e: LocalEdition) {
  const reasons: string[] = [],
    d = LOCAL_DEFS[e.series];
  if (
    !d ||
    !c.local ||
    !Number.isInteger(e.showDay) ||
    e.showDay < c.local.anchorDay + d.offset ||
    (e.showDay - c.local.anchorDay - d.offset) % d.period !== 0 ||
    e.id !== `${e.series}-${e.showDay}` ||
    e.deadlineDay !== e.showDay - d.deadline
  )
    return ["この大会の日程は有効ではありません"];
  if (!c.local || !c.progress) reasons.push("ローカル大会の追加が必要です");
  if (c.athlete.status !== "active") reasons.push("現役選手が対象です");
  if (c.athlete.day > e.deadlineDay) reasons.push("申込締切を過ぎています");
  if (c.local?.entries.some((x) => x.id === e.id))
    reasons.push("この開催には申込済みです");
  if (c.local?.entries.some((x) => x.status === "entered"))
    reasons.push("同時に申し込めるローカル大会は1件です");
  if (
    c.progress?.entries.some(
      (x) =>
        ["entered", "travelled", "checkedIn"].includes(x.status) &&
        e.showDay >= x.travelDay &&
        e.showDay <= x.showDay,
    )
  )
    reasons.push("申込済み大会の遠征と重なります");
  if (c.athlete.life.money < d.fee + d.travel)
    reasons.push(`参加・移動に${d.fee + d.travel}円必要です`);
  if (e.series === "rookieMeet") {
    if (
      (c.local?.results.filter((x) => x.series !== "gymMeet").length ?? 0) +
        (c.progress?.results.length ?? 0) >=
      5
    )
      reasons.push("対象大会の経験が5回に達しています。Openへ挑戦できます");
    if (c.progress?.credentials.some((x) => x.kind === "proCard"))
      reasons.push("プロ資格取得者は新人区分の対象外です");
  }
  return reasons;
}
export function enterLocal(c: Career, e: LocalEdition): Career {
  const reasons = localEligibility(c, e);
  if (reasons.length) throw new Error(reasons.join("。"));
  const d = LOCAL_DEFS[e.series],
    paid = d.fee + d.travel;
  return {
    ...c,
    athlete: {
      ...c.athlete,
      life: { ...c.athlete.life, money: c.athlete.life.money - paid },
    },
    local: {
      ...c.local!,
      goalEditionId: e.id,
      entries: [...c.local!.entries, { ...e, status: "entered", paid }],
    },
  };
}
export function localPerson(c: Career): LocalPerson {
  return {
    id: "player",
    name: c.athlete.name,
    body: c.athlete.body,
    posing: c.progress?.posing ?? 0,
    asymmetry:
      PARTS.reduce((s, p) => s + (c.progress?.asymmetry[p] ?? 0), 0) / 16,
    systemicFatigue: c.athlete.systemicFatigue,
    previousSleep: c.athlete.previousSleep,
  };
}
export function scoreLocal(p: LocalPerson): LocalScore {
  const base = scoreBody(p.body, p.posing, p.asymmetry),
    fat = fatPercent(p.body),
    condition = clamp(100 - Math.max(12 - fat, fat - 22, 0) * 5, 0, 100),
    readiness = clamp(
      (1 - PARTS.reduce((s, k) => s + p.body.fatigue[k], 0) / 16) * 40 +
        (1 - p.systemicFatigue) * 30 +
        clamp((p.previousSleep - 3) / 4.5, 0, 1) * 30,
      0,
      100,
    ),
    balance = base.balance * 0.7 + base.symmetry * 0.3;
  return {
    mass: base.mass,
    balance,
    condition,
    posing: base.posing,
    readiness,
    total:
      base.mass * 0.3 +
      balance * 0.2 +
      condition * 0.15 +
      base.posing * 0.25 +
      readiness * 0.1,
  };
}
export function localField(c: Career, e: LocalEdition): LocalRival[] {
  return (
    c.local?.rivals.filter((r) => r.tier === LOCAL_DEFS[e.series].tier) ?? []
  );
}
export function beforeLocalDay(c: Career): Career {
  if (!c.local || c.athlete.status === "retired" || c.progress?.decision)
    return c;
  const entry = c.local.entries.find(
    (e) => e.status === "entered" && e.showDay <= c.athlete.day,
  );
  if (!entry) return c;
  const text = `${LOCAL_DEFS[entry.series].name}の開催日です。出場または欠場を選んでください。`;
  return {
    ...c,
    pendingEvent: text,
    local: { ...c.local, decision: entry.id },
  };
}
export function updateLocal(c: Career): Career {
  const l = c.local;
  if (!l) return c;
  const weeks = Math.floor((c.athlete.day - l.lastUpdateDay) / 7);
  if (!weeks) return c;
  return {
    ...c,
    local: {
      ...l,
      lastUpdateDay: l.lastUpdateDay + weeks * 7,
      rivals: l.rivals.map((r) => {
        const years = (c.athlete.day - r.bornDay) / 365.2425,
          ageLoss = Math.max(0, years - 20) * 0.000003 * weeks,
          muscle = partMap((p) =>
            Math.max(
              0.01,
              r.body.muscle[p] +
                (r.body.capacity[p] - r.body.muscle[p]) *
                  (1 - Math.pow(1 - 0.003 * r.response, weeks)) -
                r.body.muscle[p] * ageLoss,
            ),
          );
        return {
          ...r,
          body: { ...r.body, muscle },
          posing: clamp(
            r.posing + (1 - r.posing) * (1 - Math.pow(0.999, weeks)),
            0,
            1,
          ),
        };
      }),
    },
  };
}
export function withdrawLocal(c: Career, id: string): Career {
  if (!c.local) return c;
  const matches = c.local.decision === id;
  return {
    ...c,
    pendingEvent: matches
      ? (c.progress?.decision?.text ?? null)
      : c.pendingEvent,
    local: {
      ...c.local,
      decision: matches ? null : c.local.decision,
      entries: c.local.entries.map((e) =>
        e.id === id && e.status === "entered"
          ? { ...e, status: "withdrawn" }
          : e,
      ),
    },
  };
}
export function runLocal(c: Career, id: string): Career {
  const l = c.local,
    e = l?.entries.find((e) => e.id === id);
  if (!l || !e || e.status !== "entered" || c.athlete.day !== e.showDay)
    throw new Error("申込済み大会の当日に出場してください");
  if (c.progress?.decision)
    throw new Error("先に競技キャリアの手続きを確認してください");
  const d = LOCAL_DEFS[e.series];
  let classId = localClass(e.series, weight(c.athlete.body));
  const all = [localPerson(c), ...localField(c, e)],
    people = all.filter(
      (p) => localClass(e.series, weight(p.body)) === classId,
    );
  const field = people.length >= 3 ? people : all;
  if (people.length < 3) classId = "Open（階級統合）";
  const compare = (a: LocalScore, b: LocalScore) =>
    b.total - a.total ||
    b.posing - a.posing ||
    b.balance - a.balance ||
    b.readiness - a.readiness;
  const scored = field
    .map((p) => ({ person: p, score: scoreLocal(p) }))
    .sort((a, b) => compare(a.score, b.score));
  const standings: LocalStanding[] = scored.map((x, i) => ({
    id: x.person.id,
    name: x.person.name,
    score: x.score,
    rank: 1 + scored.filter((y) => compare(x.score, y.score) > 0).length,
  }));
  const mine = standings.find((x) => x.id === "player")!;
  const result: LocalResult = {
    id: `local-result-${id}`,
    entryId: id,
    editionId: id,
    series: e.series,
    day: c.athlete.day,
    classId,
    rank: mine.rank,
    count: field.length,
    score: mine.score,
    body: structuredClone(c.athlete.body),
    posing: c.progress?.posing ?? 0,
    standings,
    podium: structuredClone(scored.slice(0, 3).map((x) => x.person)),
    rulesVersion: LOCAL_RULE,
  };
  return {
    ...c,
    pendingEvent: null,
    objective:
      !c.objective || c.objective === "contest" ? "personalBest" : c.objective,
    local: {
      ...l,
      decision: null,
      entries: l.entries.map((x) =>
        x.id === id ? { ...x, status: "completed" } : x,
      ),
      results: [...l.results, result],
    },
    athlete: {
      ...c.athlete,
      systemicFatigue: clamp(c.athlete.systemicFatigue + d.hours * 0.008, 0, 1),
    },
  };
}
export function validateLocal(
  l: LocalState,
  c: Career,
  bodyCheck: (b: unknown) => void,
) {
  const bad = () => {
    throw new Error(
      "ローカル大会の保存データが不正です。以前の保存は保持しています。",
    );
  };
  const finite = (v: number, min: number, max: number) =>
    Number.isFinite(v) && v >= min && v <= max;
  const series = (v: string) => Object.hasOwn(LOCAL_DEFS, v);
  if (
    !l ||
    l.version !== 1 ||
    l.rulesVersion !== LOCAL_RULE ||
    !Number.isInteger(l.seed) ||
    !finite(l.seed, 1, 4294967295) ||
    !Number.isInteger(l.anchorDay) ||
    !finite(l.anchorDay, 0, c.athlete.day) ||
    !finite(l.lastUpdateDay, l.anchorDay, c.athlete.day) ||
    !Array.isArray(l.entries) ||
    !Array.isArray(l.results) ||
    !Array.isArray(l.rivals) ||
    l.entries.length > 20000 ||
    l.results.length > 10000 ||
    l.rivals.length !== 72
  )
    bad();
  if (l.goalEditionId !== null && typeof l.goalEditionId !== "string") bad();
  if (
    l.decision !== null &&
    !l.entries.some((e) => e.id === l.decision && e.status === "entered")
  )
    bad();
  if (
    new Set(l.entries.map((e) => e.id)).size !== l.entries.length ||
    new Set(l.results.map((r) => r.entryId)).size !== l.results.length ||
    new Set(l.rivals.map((r) => r.id)).size !== l.rivals.length
  )
    bad();
  for (const e of l.entries) {
    if (
      !series(e.series) ||
      e.id !== `${e.series}-${e.showDay}` ||
      !Number.isInteger(e.showDay) ||
      !finite(e.showDay, l.anchorDay + LOCAL_DEFS[e.series].offset, 200000) ||
      e.deadlineDay !== e.showDay - LOCAL_DEFS[e.series].deadline ||
      !["entered", "completed", "withdrawn"].includes(e.status) ||
      e.paid !== LOCAL_DEFS[e.series].fee + LOCAL_DEFS[e.series].travel
    )
      bad();
  }
  const score = (s: LocalScore) => {
    if (
      !s ||
      ["mass", "balance", "condition", "posing", "readiness", "total"].some(
        (k) => !finite(s[k as keyof LocalScore], 0, 100),
      )
    )
      bad();
    if (
      Math.abs(
        s.total -
          (s.mass * 0.3 +
            s.balance * 0.2 +
            s.condition * 0.15 +
            s.posing * 0.25 +
            s.readiness * 0.1),
      ) > 1e-7
    )
      bad();
  };
  for (const r of l.rivals) {
    bodyCheck(r.body);
    if (
      !r.id.startsWith("local-cpu-") ||
      typeof r.name !== "string" ||
      !finite(r.posing, 0, 1) ||
      !finite(r.asymmetry, 0, 1) ||
      !finite(r.systemicFatigue, 0, 1) ||
      !finite(r.previousSleep, 3, 12) ||
      !finite(r.response, 0, 1) ||
      !Number.isInteger(r.tier) ||
      !finite(r.tier, 0, 2) ||
      r.bornDay !== l.anchorDay
    )
      bad();
  }
  for (const r of l.results) {
    const e = l.entries.find((e) => e.id === r.entryId);
    if (
      !e ||
      e.status !== "completed" ||
      r.editionId !== e.id ||
      r.series !== e.series ||
      r.day !== e.showDay ||
      r.day > c.athlete.day ||
      r.rulesVersion !== LOCAL_RULE ||
      !Number.isInteger(r.rank) ||
      !finite(r.rank, 1, r.count) ||
      !Array.isArray(r.standings) ||
      r.standings.length !== r.count ||
      !Array.isArray(r.podium) ||
      r.podium.length !== 3 ||
      !finite(r.posing, 0, 1)
    )
      bad();
    bodyCheck(r.body);
    score(r.score);
    for (const p of r.standings) {
      score(p.score);
      if (
        !finite(p.rank, 1, r.count) ||
        typeof p.name !== "string" ||
        !(p.id === "player" || l.rivals.some((x) => x.id === p.id))
      )
        bad();
    }
    const p = r.standings.find((p) => p.id === "player");
    if (
      !p ||
      p.rank !== r.rank ||
      JSON.stringify(p.score) !== JSON.stringify(r.score)
    )
      bad();
    for (const p of r.podium) {
      bodyCheck(p.body);
      if (!finite(p.posing, 0, 1)) bad();
    }
  }
}
