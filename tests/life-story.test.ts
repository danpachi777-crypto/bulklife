import { test } from "node:test";
import assert from "node:assert/strict";
import { newChallenge,strategyCandidates,confirmStrategy,runPeriodBatch,nextDecision,validateChallenge } from "../src/core/challenge";
import { currentEpisode,originFor,profile } from "../src/core/lifeStory";
test("one opening leads to different follow-ups, costs and weekly plans after saving",()=>{
  const initial=newChallenge("japan",42,"branches");
  // Archived origin-v1 runs retain their original narrative algorithm.
  delete initial.storyVersion;
  function choose(index:number) {
    let r=confirmStrategy(initial,strategyCandidates(initial)[index]);
    while(r.job)r=runPeriodBatch(r).run;
    r=nextDecision(r);validateChallenge(r);
    return JSON.parse(JSON.stringify(r)) as typeof r;
  }
  const alone=choose(0),taught=choose(1);
  assert.equal(currentEpisode(alone).arc,currentEpisode(taught).arc);
  assert.notEqual(currentEpisode(alone).scene,currentEpisode(taught).scene);
  assert.notEqual(alone.career.athlete.life.money,taught.career.athlete.life.money);
  assert.notDeepEqual(strategyCandidates(alone).map(x=>x.name),strategyCandidates(taught).map(x=>x.name));
  assert.match(currentEpisode(taught).issue,/個別指導/);
});
test("older archives continue without inventing a past and geographic constraints preserve the birth prefecture",()=>{
  const r=newChallenge("japan",42,"legacy");
  delete r.origin;
  validateChallenge(r);
  assert.equal(strategyCandidates(r)[0].id,"foundation");
  const island=originFor(42,20,"長野県");
  assert.equal(island.upbringing,"長崎県五島市");assert.equal(island.residence,"東京都");
  assert.match(profile(island).origin,/長野県で生まれ、幼い頃に長崎県五島市へ移った/);
});
