import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import {
  newChallenge,
  strategyCandidates,
  confirmStrategy,
  runPeriodBatch,
  nextDecision,
  continueWorld,
  validateChallenge,
  inspectStrategy,
} from "../src/core/challenge";
import {
  persistChallenge,
  listChallenges,
  exportChallenges,
  importChallenges,
} from "../src/core/challengeStorage";
import type { ChallengeRun } from "../src/core/challengeTypes";
function period(r: ChallengeRun, index = 0) {
  let v = confirmStrategy(r, strategyCandidates(r)[index]);
  while (v.job) v = runPeriodBatch(v).run;
  return v;
}
test("first four meaningful decisions execute detailed days and a contest without extra decision costs", () => {
  let r = newChallenge("japan", 42, "four");
  assert.equal(strategyCandidates(r)[0].goal,'ask');
  for (let n = 0; n < 4; n++) {
    const before = structuredClone(r);
    strategyCandidates(r).forEach((p) => inspectStrategy(r, p));
    assert.deepEqual(r, before);
    r = period(r, n === 3 ? 2 : 0);
    validateChallenge(r);
    if(n<3)assert.equal(r.career.coachingGuide!.goal,'ask');
    assert.equal(r.records.length, n + 1);
    const record=r.records[n],s=record.stats;
    assert.ok(Math.abs((record.afterMoney-record.beforeMoney)-(s.income-s.food-s.fixed-(record.strategy.contest?(record.show!.fee):0)))<.01);
    if (n < 3) r = nextDecision(r);
  }
  assert.equal(r.career.athlete.day, 196);
  assert.ok(r.records[3].show);
  assert.equal(r.records[3].stats.days, 70);
  assert.ok(r.records[0].stats.sets > 0);
  assert.equal(r.records[0].stats.trainingSamples?.length,2);
  assert.notEqual(
    r.records[0].stats.muscle.chest,
    r.records[0].stats.muscle.quads,
  );
});
test("a saved in-flight period resumes deterministically and cannot be confirmed twice", async () => {
  const initial = newChallenge("japan", 7, "resume-test");
  const start = confirmStrategy(initial, strategyCandidates(initial)[0]);
  assert.throws(() => confirmStrategy(start, strategyCandidates(initial)[0]));
  const one = runPeriodBatch(start).run;
  const saved = await persistChallenge(one, null);
  const reload = (await listChallenges()).find((v) => v.id === saved.id)!;
  const direct = runPeriodBatch(one).run,
    resumed = runPeriodBatch(reload).run;
  assert.deepEqual(resumed.career, direct.career);
  assert.equal(resumed.job!.id, direct.job!.id);
  assert.deepEqual(resumed.job!.record.stats, direct.job!.record.stats);
  const a = await persistChallenge(resumed, reload.revision);
  await assert.rejects(
    () => persistChallenge(direct, reload.revision),
    /別の画面/,
  );
  assert.equal(a.revision, 1);
  const raw = await exportChallenges(),
    copies = await importChallenges(raw, () => "bl-import-copy");
  assert.equal(copies.length, 1);
  assert.equal((await listChallenges()).length, 2);
  assert.equal(copies[0].career.athlete.day, a.career.athlete.day);
});
test("same seed has identical domestic gameplay in Japan and world modes", () => {
  let a = newChallenge("japan", 823, "same"),
    b = newChallenge("world", 823, "same");
  for (let n = 0; n < 4; n++) {
    assert.deepEqual(strategyCandidates(a), strategyCandidates(b));
    a = period(a, n === 3 ? 2 : 0);
    b = period(b, n === 3 ? 2 : 0);
    assert.deepEqual(a.career, b.career);
    assert.deepEqual(a.rivals, b.rivals);
    if (n < 3) {
      a = nextDecision(a);
      b = nextDecision(b);
    }
  }
});
test("free editing, navigation and previews do not alter RNG or physical state", () => {
  const r = newChallenge("japan", 884, "pure"),
    before = JSON.stringify(r);
  const old=structuredClone(r);delete old.modelVersion;validateChallenge(old);
  assert.throws(()=>validateChallenge({...r,modelVersion:{unexpected:true}}));
  for (const p of strategyCandidates(r)) {
    inspectStrategy(r, p);
    inspectStrategy(r, { ...p, budget: 500, foodStyle: "quick" });
  }
  assert.equal(JSON.stringify(r), before);
  const p = strategyCandidates(r)[0],
    bad = { ...p, contest: "world" as const };
  assert.ok(inspectStrategy(r, bad).errors.length);
  assert.throws(() => confirmStrategy(r, bad));
});

test("failed persistence and a malformed archive leave committed runs intact", async () => {
  const initial=newChallenge("japan",918,"quota-test");
  const saved=await persistChallenge(initial,null);
  const put=IDBObjectStore.prototype.put;
  try {
    IDBObjectStore.prototype.put=function(){throw new DOMException("Full","QuotaExceededError");};
    await assert.rejects(()=>persistChallenge(confirmStrategy(saved,strategyCandidates(saved)[0]),saved.revision),/保存できません/);
  } finally { IDBObjectStore.prototype.put=put; }
  const reloaded=(await listChallenges()).find(x=>x.id===initial.id)!;
  assert.equal(reloaded.status,"planning");assert.equal(reloaded.revision,0);
  const bad=structuredClone(initial);bad.career.athlete.day=4;
  const count=(await listChallenges()).length;
  await assert.rejects(()=>importChallenges(JSON.stringify({format:"BULK_CHALLENGE_ARCHIVE",version:1,runs:[initial,bad]}),()=>"invalid-copy"));
  assert.equal((await listChallenges()).length,count);
});

test("one-time equipment spending is counted once and manual food remains manual",()=>{
  const r=newChallenge("japan",42,"manual"),base=strategyCandidates(r)[0];
  r.career.athlete.life.money=25000;
  const p={...base,equipment:"home" as const};
  assert.equal(inspectStrategy(r,p).upfront,20000);
  const manual=structuredClone(r.career);manual.plan.calories=1100;manual.plan.protein=40;manual.progress!.mealMode="aggregate";
  let v=confirmStrategy(r,{...base,goal:'build',manual,autoFood:false});v=runPeriodBatch(v).run;
  assert.equal(v.career.plan.calories,1100);assert.equal(v.career.plan.protein,40);
  assert.equal(v.career.coachingGuide!.ownership.food,"manual");assert.ok(v.job!.record.stats.shortDays>0);
  while(v.job)v=runPeriodBatch(v).run;
  assert.equal(strategyCandidates(nextDecision(v))[0].goal,'build');
});
