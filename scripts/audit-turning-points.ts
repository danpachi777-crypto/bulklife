import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  newChallenge,
  nextDecision,
  confirmStrategy,
  runPeriodBatch,
  strategyCandidates,
  validateChallenge,
  inspectStrategy,
  continueWorld,
  decisionScene,
} from "../src/core/challenge";
import { relationshipBook } from "../src/core/turningPoints";
import type { ChallengeRun, Strategy } from "../src/core/challengeTypes";

const folder = "docs/qa/turning-points";
mkdirSync(folder, { recursive: true });
const report: Record<string, unknown> = {};
function play(r: ChallengeRun, p: Strategy) {
  let v = confirmStrategy(r, p);
  assert.throws(() => confirmStrategy(v, p));
  while (v.job) v = runPeriodBatch(v).run;
  validateChallenge(v);
  return nextDecision(v);
}
function action(r: ChallengeRun, key: string) {
  const p = strategyCandidates(r).find((v) => v.id.endsWith("/" + key));
  if (!p) throw Error(key + " unavailable at " + r.records.length);
  return play(r, p);
}
const base = newChallenge("japan", 231, "causal-audit");
const partner = action(base, "friend"),
  promise = action(partner, "promise");
for (const route of [
  ["split", "help"],
  ["split", "message"],
  ["adjust", "enter"],
  ["weekend", "enter"],
]) {
  let r = action(action(promise, route[0]), route[1]);
  const rec = r.records.at(-1)!;
  const source = r.records.find((x) => x.fact?.action === "friend")!;
  assert.equal(!!rec.fact?.sharedStart, route[1] === "enter");
  if (rec.show && rec.fact?.sharedStart)
    assert.ok(
      rec.show.standings.find((x) => x.name === source.fact!.personName),
    );
  assert.equal(!!rec.fact?.partnerStart, route[1] === "help");
  if (!rec.show) assert.equal(r.rivals.flatMap((x) => x.history).length, 0);
  const p = strategyCandidates(r).find((x) => x.contest === null)!;
  r = play(r, p);
  const next = decisionScene(r);
  assert.equal(next.event === "returnHelp", route[1] === "help");
  report[route.join("/")] = {
    trigger: source.strategy.name,
    selected: rec.strategy.name,
    reply: rec.response,
    next: next.issue,
    options: strategyCandidates(r).map((x) => x.name),
  };
}
function saveFixture(r: ChallengeRun, key: string) {
  writeFileSync(
    join(tmpdir(), "bulk-turn-" + key + ".json"),
    JSON.stringify({ format: "BULK_CHALLENGE_ARCHIVE", version: 1, runs: [r] }),
  );
}
for (const strong of [false, true]) {
  let r = newChallenge("japan", 823, strong ? "custom-top" : "no-entry");
  for (let n = 1; n <= 20; n++) {
    const candidates = strategyCandidates(r);
    let p = candidates[0];
    if (strong) {
      p = {
        ...p,
        id: "custom",
        name: "指導と演技を並行して準備する",
        coach: true,
        minutes: 60,
        posing: 60,
        sleep: 8.5,
        goal: n < 14 ? "build" : "cut",
        workRatio: 0.8,
        contest: n % 4 === 0 ? null : p.contest,
      };
      if (n % 4 === 0) {
        const tiers = ["world", "national", "open", "region", "gym"] as const;
        p.contest =
          tiers.find(
            (t) => !inspectStrategy(r, { ...p, contest: t }).errors.length,
          ) ?? null;
      }
      if (inspectStrategy(r, p).errors.length) p.workRatio = 1;
    } else
      p = candidates.find(
        (v) => !v.contest && !inspectStrategy(r, v).errors.length,
      )!;
    r = play(r, p);
  }
  assert.equal(r.status, "japanEnd");
  const domestic = structuredClone(r.domestic);
  saveFixture(r, strong ? "top" : "low");
  const continued = continueWorld(r);
  assert.deepEqual(continued.domestic, domestic);
  const offers = strategyCandidates(continued);
  if (strong)
    assert.ok(
      r.records.some((x) => x.show?.tier === "national" && x.show.rank <= 3),
    );
  else assert.ok(!r.records.some((x) => x.show));
  report[strong ? "国内上位" : "国内未出場"] = {
    seed: r.seed,
    archive: r.domestic?.best,
    body: r.domestic?.body.muscle,
    contacts: relationshipBook(r.records),
    issue: decisionScene(continued).issue,
    offers: offers.map((x) => ({ name: x.name, tier: x.contest })),
  };
}
writeFileSync(
  folder + "/counterfactuals.json",
  JSON.stringify(report, null, 2),
);
console.log(Object.keys(report));
