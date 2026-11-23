import fs from "node:fs";
import assert from "node:assert/strict";
import {
  newChallenge,
  strategyCandidates,
  confirmStrategy,
  runPeriodBatch,
  nextDecision,
  continueWorld,
  validateChallenge,
  inspectStrategy,
  LEAGUE,
} from "../src/core/challenge";
import { drawIndex } from "../src/core/simulation";
import { weight, muscleMass, fatPercent } from "../src/core/model";
const out = "docs/qa/decisions-v6";
fs.mkdirSync(out, { recursive: true });
const seeds: number[] = [];
for (let s = 1; seeds.filter(Boolean).length < 6; s++) {
  const [i] = drawIndex(s);
  seeds[i] ??= s;
}
const reports = [];
for (const [profile, seed] of seeds.entries()) {
  let r = newChallenge("japan", seed, `bl-audit-${profile}`),
    domestic = "";
  const began = performance.now();
  for (let n = 1; n <= 40; n++) {
    const candidates = strategyCandidates(r);
    const preferred = n % 4 === 0 ? 2 : n % 5 === 0 ? 1 : 0;
    const p = inspectStrategy(r, candidates[preferred]).errors.length
      ? candidates.find((p) => !inspectStrategy(r, p).errors.length)
      : candidates[preferred];
    assert.ok(p, `P${profile + 1} decision ${n} must have a viable choice`);
    r = confirmStrategy(r, p!);
    while (r.job) r = runPeriodBatch(r).run;
    validateChallenge(r);
    assert.ok(Number.isFinite(r.career.athlete.life.money));
    assert.ok(
      weight(r.career.athlete.body) > 20 && weight(r.career.athlete.body) < 250,
    );
    if (n === 20) {
      r=nextDecision(r);
      assert.equal(r.status, "japanEnd");
      domestic = JSON.stringify(r.domestic);
      r = continueWorld(r);
    } else r = nextDecision(r);
  }
  assert.equal(r.status, "worldEnd");
  assert.equal(JSON.stringify(r.domestic), domestic);
  assert.equal(r.records.length, 40);
  const c = r.career,
    report = {
      profile: c.athlete.profileId,
      seed,
      decisions: r.records.length,
      days: c.athlete.day,
      weight: weight(c.athlete.body),
      muscle: muscleMass(c.athlete.body),
      fatPercent: fatPercent(c.athlete.body),
      money: c.athlete.life.money,
      posing: c.progress!.posing,
      domestic: r.domestic,
      world: r.world,
      shows: r.records.flatMap((x) =>
        x.show
          ? [
              {
                decision: x.number,
                event: LEAGUE[x.show.tier].name,
                rank: x.show.rank,
                count: x.show.count,
              },
            ]
          : [],
      ),
      calculationSeconds: (performance.now() - began) / 1000,
    };
  reports.push(report);
  fs.writeFileSync(
    `${out}/long-run-audit.json`,
    JSON.stringify(
      {
        notes:
          "Automated calculation audit, not human playtime or fun/visual quality validation.",
        reports,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      profile: report.profile,
      days: report.days,
      muscle: report.muscle,
      fatPercent: report.fatPercent,
      money: report.money,
      shows: report.shows,
      calculationSeconds: report.calculationSeconds,
    }),
  );
}
