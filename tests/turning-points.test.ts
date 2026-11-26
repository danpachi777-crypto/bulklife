import test from "node:test";
import assert from "node:assert/strict";
import {
  newChallenge,
  confirmStrategy,
  strategyCandidates,
  runPeriodBatch,
  nextDecision,
  validateChallenge,
  decisionScene,
} from "../src/core/challenge";
import {
  originFor,
  prefectures,
  backgrounds,
  profile,
} from "../src/core/lifeStory";
import { relationshipBook } from "../src/core/turningPoints";
function finish(input: ReturnType<typeof newChallenge>, key: string) {
  const strategy = strategyCandidates(input).find((x) =>
    x.id.endsWith("/" + key),
  )!;
  let r = confirmStrategy(input, strategy);
  while (r.job) r = runPeriodBatch(r).run;
  validateChallenge(r);
  return nextDecision(r);
}
test("all 2820 origins have three available narrative openings; only people with a compatible biography propose starting together", () => {
  const r = newChallenge("japan", 231, "opening-audit");
  for (const [i] of backgrounds.entries())
    for (const birth of prefectures) {
      const origin = originFor(r.seed, i, birth),
        scene = decisionScene({ ...r, origin });
      assert.equal(scene.choices.length, 3);
      assert.equal(
        scene.choices[1].key,
        /友人|親友|幼なじみ|仲間|同級生/.test(profile(origin).role)
          ? "friend"
          : "visit",
      );
      assert.equal(origin.birthplace, birth);
    }
});
test("a planned support day never becomes a favour when the player only sends a message", () => {
  const r = newChallenge("japan", 231, "promise-regression");
  const promised = finish(finish(finish(r, "friend"), "promise"), "split");
  assert.equal(promised.records.at(-1)?.fact?.partnerStart, undefined);
  const helped = finish(promised, "help"),
    message = finish(promised, "message");
  assert.equal(helped.records.at(-1)?.show, undefined);
  assert.ok(helped.records.at(-1)?.fact?.partnerStart);
  assert.equal(message.records.at(-1)?.fact?.partnerStart, undefined);
  assert.ok(relationshipBook(helped.records).some((p) => p.exchanges >= 3));
  const wait = (x: typeof r) => finish(x, decisionScene(x).choices[0].key);
  assert.equal(decisionScene(wait(helped)).event, "returnHelp");
  assert.notEqual(decisionScene(wait(message)).event, "returnHelp");
});
test("a stale proposal cannot register a show from the wrong route", () => {
  const r = newChallenge("japan", 231, "wrong-offer");
  const coach = finish(r, "coach"),
    home = finish(r, "home");
  const invite = strategyCandidates(coach).find((x) => x.contest)!;
  assert.throws(() => confirmStrategy(home, invite), /期限または前提/);
  assert.equal(home.records.length, 1);
});
