import { test } from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import {
  generateCareer,
  advance,
  freshLibrary,
} from "../src/core/simulation.ts";
import { PROFILES } from "../src/core/content.ts";
import { VERSIONS, PARTS } from "../src/core/model.ts";
import {
  localEditions,
  enterLocal,
  runLocal,
  withdrawLocal,
  scoreLocal,
  localPerson,
  localEligibility,
  enableLocal,
  LOCAL_DEFS,
} from "../src/core/localCompetitions.ts";
import { validateCareer, validateSummary } from "../src/core/validation.ts";
import { packLog, unpackLog } from "../src/core/logCodec.ts";
import {
  save,
  loadCareer,
  exportSave,
  parseImport,
  importSave,
  readLogs,
} from "../src/core/storage.ts";
import { retire, acknowledgeDecision } from "../src/core/competitions.ts";
import { useMealTemplate } from "../src/core/nutrition.ts";
const base = (i = 0) => generateCareer(PROFILES[i], 42, "bl-experience-" + i);
test("an oversubscribed but valid day credits only the auxiliary practice actually performed", () => {
  const c = base();
  c.athlete.life.work = 60;
  c.athlete.life.commute = 20;
  c.plan.prep = 2;
  c.plan.sleep = 3;
  c.plan.days[0].focus = "rest";
  c.progress!.posingMinutes = 60;
  c.progress!.cardioMinutes = 60;
  validateCareer(c);
  const result = advance(c, 1),
    s = result.logs[0];
  assert.equal(s.detail!.actual.posingMinutes, 15);
  assert.equal(s.detail!.actual.cardioMinutes, 15);
  assert.ok(
    Math.abs(
      result.career.progress!.posing -
        (c.progress!.posing + 0.25 * 0.0017 * (1 - c.progress!.posing)),
    ) < 1e-12,
  );
  assert.equal(s.sleep.hours, 3);
  assert.equal(s.freeHours, 0);
  validateCareer(result.career);
});
function show(c = base()) {
  const e = localEditions(c).find((e) => e.series === "gymMeet")!,
    paid = enterLocal(c, e);
  let r = advance(paid, 20);
  assert.equal(r.career.athlete.day, e.showDay);
  assert.equal(r.logs.length, e.showDay - c.athlete.day);
  assert.equal(r.career.local!.decision, e.id);
  assert.equal(advance(r.career, 7).logs.length, 0);
  return { c: runLocal(r.career, e.id), logs: r.logs, e };
}

test("a completed first stage suggests a personal record goal while preserving another chosen direction", () => {
  assert.equal(show().c.objective, "personalBest");
  const custom = base();
  custom.objective = "balance";
  assert.equal(show(custom).c.objective, "balance");
});
test("all six starts execute first day, stop weekly progress at small show, lose or win honestly and continue", () => {
  const ranks = [];
  for (let i = 0; i < 6; i++) {
    let c = base(i);
    const before = structuredClone(c),
      first = advance(c, 1);
    assert.equal(first.logs.length, 1);
    assert.deepEqual(c, before);
    validateSummary(first.logs[0]);
    assert.deepEqual(first.logs[0].detail!.before.ability, c.athlete.ability);
    const r = show(c),
      result = r.c.local!.results[0];
    validateCareer(r.c);
    ranks.push(result.rank);
    assert.equal(result.count, 25);
    assert.deepEqual(
      result.score,
      scoreLocal(
        localPerson({
          ...r.c,
          athlete: {
            ...r.c.athlete,
            body: result.body,
            systemicFatigue:
              r.c.athlete.systemicFatigue - LOCAL_DEFS.gymMeet.hours * 0.008,
          },
        }),
      ),
    );
    assert.equal(r.c.progress!.titles.length, 0);
    assert.equal(r.c.progress!.credentials.length, 0);
    assert.throws(() => runLocal(r.c, r.e.id));
    const next = advance(r.c, 1);
    assert.equal(next.logs.length, 1);
    assert.equal(next.logs[0].training.completedSets, 0);
    assert.equal(next.logs[0].detail!.actual.contestHours, 2);
    assert.ok(next.logs[0].freeHours <= 24);
    validateCareer(next.career);
    assert.ok(
      localEditions(next.career).some(
        (e) => e.series === "gymMeet" && e.showDay - r.e.showDay === 14,
      ),
    );
  }
  assert.ok(
    ranks.some((r) => r > 1),
    "first shows do not guarantee a win",
  );
});
test("daily details freeze real food plan and before/after skill, and survive both codec versions", () => {
  const c = useMealTemplate(base(), "build"),
    r = advance(c, 1),
    s = r.logs[0];
  assert.equal(s.detail!.planned.mealMode, "foods");
  assert.equal(s.detail!.after.posing, r.career.progress!.posing);
  assert.deepEqual(s.detail!.after.ability, r.career.athlete.ability);
  assert.deepEqual(unpackLog(packLog(s)), s);
  c.plan.calories = 1000;
  c.progress!.meals = [];
  assert.ok(s.detail!.planned.calories > 1000);
  const old = structuredClone(s);
  delete old.detail;
  assert.equal(packLog(old).length, 7);
  assert.deepEqual(unpackLog(packLog(old)), old);
});
test("same body/readiness gets same local score independent of identity, and fatigue matters equally", () => {
  const p = localPerson(base()),
    cpu = { ...p, id: "local-cpu-0", name: "CPU" };
  assert.deepEqual(scoreLocal(p), scoreLocal(cpu));
  const tired = { ...cpu, systemicFatigue: 0.9, previousSleep: 3 };
  assert.ok(scoreLocal(tired).readiness < scoreLocal(p).readiness);
  assert.equal(scoreLocal(tired).mass, scoreLocal(p).mass);
});
test("CPU growth and participation do not depend on the player physique, profile label or loss", () => {
  const a = base(),
    b = structuredClone(a);
  b.athlete.profileId = "P6";
  b.athlete.body.muscle.chest *= 2;
  const x = advance(a, 7).career,
    y = advance(b, 7).career;
  assert.deepEqual(x.local!.rivals, y.local!.rivals);
  assert.deepEqual(x.local!.seed, y.local!.seed);
});
test("daily and weekly progress stop at exactly the same decision", () => {
  let a = enterLocal(base(), localEditions(base())[0]),
    b = structuredClone(a);
  const one = [];
  for (let i = 0; i < 13; i++) {
    const r = advance(a, 1);
    a = r.career;
    one.push(...r.logs);
  }
  const r1 = advance(b, 7),
    r2 = advance(r1.career, 7);
  assert.deepEqual(r2.career, a);
  assert.deepEqual([...r1.logs, ...r2.logs], one);
});
test("fees charge once; duplicate registrations and invalid newcomer experience are rejected", () => {
  const c = base(),
    e = localEditions(c)[0],
    next = enterLocal(c, e);
  assert.equal(c.athlete.life.money - next.athlete.life.money, 500);
  assert.throws(() => enterLocal(next, e));
  assert.ok(localEligibility(next, localEditions(c)[1]).length);
  const withdrawn = withdrawLocal(next, e.id);
  assert.equal(withdrawn.local!.entries[0].status, "withdrawn");
  assert.equal(withdrawn.athlete.life.money, next.athlete.life.money);
  const r = show().c;
  r.local!.results = Array.from({ length: 5 }, (_, i) => ({
    ...r.local!.results[0],
    series: "localOpen" as const,
    id: "x" + i,
  }));
  assert.ok(
    localEligibility(
      r,
      localEditions(r).find((e) => e.series === "rookieMeet")!,
    ).some((x) => x.includes("5回")),
  );
});
test("local retirement records participation and closes pending entries without granting physical bonuses", () => {
  const { c } = show();
  const before = structuredClone(c.athlete.body),
    r = retire(c);
  assert.deepEqual(r.athlete.body, before);
  assert.match(r.progress!.retirement!.text.join(""), /ローカル大会1回/);
  assert.ok(
    !r.progress!.retirement!.text.join("").includes("大会には出場せず"),
  );
  assert.equal(advance(r, 7).logs.length, 0);
  validateCareer(r);
});
test("old save migration preserves physical data, RNG, official qualifications and model routing", () => {
  const c = base();
  delete c.local;
  delete c.objective;
  c.versions = {
    ...VERSIONS,
    simulation: "0.2.1",
    content: "0.2.0",
    model: "athlete-v1",
    mapping: "regions-v1",
  };
  const before = structuredClone(c),
    m = enableLocal(c);
  assert.deepEqual(m.athlete, before.athlete);
  assert.equal(m.rng, before.rng);
  assert.deepEqual(m.progress, before.progress);
  assert.equal(m.local!.anchorDay, c.athlete.day);
  validateCareer(m);
  const n = advance(m, 1).career;
  assert.equal(n.versions.model, "athlete-v1");
  validateCareer(n);
});
test("local results, frozen daily details and player identity survive transactional save/export/import", async () => {
  const r = show(),
    next = advance(r.c, 1),
    c = next.career,
    logs = [...r.logs, ...next.logs];
  const lib = {
    ...freshLibrary(1, 2),
    activeId: c.athlete.id,
    ids: [c.athlete.id],
  };
  await save(lib, c, logs);
  assert.deepEqual(await loadCareer(c.athlete.id), c);
  assert.deepEqual(await readLogs(c.athlete.id), logs);
  const raw = await exportSave(lib),
    parsed = parseImport(raw),
    merged = await importSave(parsed, lib);
  assert.equal(merged.ids.length, 2);
  const copy = await loadCareer(merged.activeId!);
  assert.notEqual(copy.athlete.id, c.athlete.id);
  assert.deepEqual(copy.local, c.local);
  assert.equal(
    copy.local!.results[0].standings.filter((x) => x.id === "player").length,
    1,
  );
  assert.deepEqual(await loadCareer(c.athlete.id), c);
});
test("corrupt local data and future details are rejected before save", () => {
  const { c } = show();
  for (const mutate of [
    (x: any) => (x.local.results[0].score.total = 101),
    (x: any) => x.local.results.push(x.local.results[0]),
    (x: any) => (x.local.rivals[0].body.muscle.chest = NaN),
    (x: any) => (x.local.version = 2),
  ]) {
    const bad = structuredClone(c);
    mutate(bad);
    assert.throws(() => validateCareer(bad));
  }
  const s = advance(base(), 1).logs[0];
  s.detail!.after.ability[PARTS[0]] = 2;
  assert.throws(() => validateSummary(s));
});
test("restoring an unstarted draw preserves both the imported and existing candidate", async () => {
  const current = { ...freshLibrary(3, 4), draft: base(1) },
    incoming = { ...freshLibrary(5, 6), draft: base(2) };
  await save(current);
  const parsed = parseImport(
    JSON.stringify({
      format: "BULK_LIFE",
      library: incoming,
      careers: [],
      logs: [],
    }),
  );
  const merged = await importSave(parsed, current);
  assert.equal(merged.draft!.athlete.name, incoming.draft.athlete.name);
  assert.deepEqual(merged.draft!.athlete.body, incoming.draft.athlete.body);
  assert.deepEqual(await loadCareer(current.draft.athlete.id), current.draft);
  assert.ok(merged.ids.includes(current.draft.athlete.id));
  assert.notEqual(merged.draft!.athlete.id, incoming.draft.athlete.id);
  parseImport(await exportSave(merged));
});
test("newcomer and open events use fixed weight classes, spend travel once, and remain open without a victory", () => {
  for (const series of ["rookieMeet", "localOpen"] as const) {
    const c = base(),
      e = localEditions(c).find((e) => e.series === series)!,
      paid = enterLocal(c, e);
    assert.equal(
      c.athlete.life.money - paid.athlete.life.money,
      LOCAL_DEFS[series].fee + LOCAL_DEFS[series].travel,
    );
    const at = advance(paid, e.showDay).career,
      r = runLocal(at, e.id);
    validateCareer(r);
    assert.ok(r.local!.results[0].count >= 3);
    assert.equal(r.local!.results[0].classId, "70kg以下");
    assert.ok(
      localEditions(r).some(
        (x) => x.series === series && x.showDay > e.showDay,
      ),
    );
    assert.equal(r.progress!.credentials.length, 0);
  }
});
