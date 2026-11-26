const fs = require("node:fs");
const assert = require("node:assert/strict");
const read = (name) =>
  JSON.parse(fs.readFileSync("docs/qa/turning-points/" + name + ".json", "utf8"));
const mentor = read("mentor-continue");
const direct = read("mentor-direct");
const friend = read("friend-continue");
const supported = read("supported-continue");
const home = read("home-continue");
const message = read("message-continue");
assert.equal(message.passed, true);
assert.equal(message.turns.length, 6);
assert.equal(message.turns[3].fact.action, "message");
assert.equal(message.turns[5].fact.event, "origin");
for (const run of [mentor, direct, friend, supported, home]) {
  assert.equal(run.seed, 231);
  assert.equal(run.passed, true);
  assert.deepEqual(run.errors, []);
  assert.deepEqual(run.turns.map((t) => t.n), Array.from({ length: 40 }, (_, i) => i + 1));
}
assert.equal(mentor.at20, direct.at20);
assert.equal(mentor.at40, direct.at40);
assert.deepEqual(mentor.turns, direct.turns);
assert.equal(new Set([mentor, friend, home].map((r) => r.turns[1].issue)).size, 3);
assert.equal(new Set([mentor, friend, home].map((r) => r.turns[0].fact.venue)).size, 3);
assert.deepEqual(home.turns.slice(0, 4).map((t) => t.fact.action), ["home", "lesson", "visit", "join"]);
assert.deepEqual(supported.turns.slice(0, 4).map((t) => t.fact.action), ["friend", "promise", "split", "help"]);
assert.equal(supported.turns[5].fact.action, "acceptHelp");
assert.ok(supported.turns[5].show);
assert.ok(!supported.turns.some((t) => t.fact.sharedStart));
const national = (r) => r.turns.find((t) => t.show?.tier === "national");
assert.notEqual(national(home).fact.venue, national(supported).fact.venue);
assert.notEqual(national(home).muscleKg, national(supported).muscleKg);
assert.deepEqual(national(supported).fact.witnesses, ["涼"]);
assert.ok(!friend.turns.slice(0, 20).some((t) => t.show));
const [low, top] = read("continuation-screen");
assert.ok(low.options.some((o) => o.includes("リーフジム測定会")));
assert.ok(top.options.some((o) => o.includes("BULKワールドファイナル")));
console.log("5 × 40 decisions verified; mode parity at 20 and 40:", mentor.at20, mentor.at40);
