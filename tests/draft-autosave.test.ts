import { test } from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { draftAutosave } from "../src/core/draftAutosave.ts";
import { freshLibrary, generateCareer } from "../src/core/simulation.ts";
import { PROFILES } from "../src/core/content.ts";
import { save, loadLibrary, loadCareer } from "../src/core/storage.ts";
const fixture = () => {
  const c = generateCareer(PROFILES[0], 42, "bl-autosave");
  return {
    c,
    old: { ...freshLibrary(4, 5), draft: c },
    next: {
      ...freshLibrary(4, 5),
      draft: null,
      ids: [c.athlete.id],
      activeId: c.athlete.id,
    },
  };
};
test("starting before the draft debounce fires cannot resurrect the old candidate", async () => {
  const { c, old, next } = fixture(),
    errors: unknown[] = [];
  const writer = draftAutosave(
    (value) => save(value),
    (e) => errors.push(e),
    10,
  );
  writer.schedule(old);
  await writer.takeOver();
  await save(next, c);
  await new Promise((r) => setTimeout(r, 25));
  assert.deepEqual(await loadLibrary(), next);
  assert.deepEqual(await loadCareer(c.athlete.id), c);
  assert.deepEqual(errors, []);
});
test("an in-flight draft write finishes before the new active slot is committed", async () => {
  const { c, old, next } = fixture();
  let started!: () => void, release!: () => void;
  const writing = new Promise<void>((r) => (started = r)),
    gate = new Promise<void>((r) => (release = r)),
    errors: unknown[] = [];
  const writer = draftAutosave<typeof old>(
    async (value) => {
      started();
      await gate;
      await save(value);
    },
    (e) => errors.push(e),
    1,
  );
  writer.schedule(old);
  await writing;
  let committed = false;
  const finishing = writer.takeOver().then(async () => {
    await save(next, c);
    committed = true;
  });
  await Promise.resolve();
  assert.equal(committed, false);
  release();
  await finishing;
  assert.deepEqual(await loadLibrary(), next);
  assert.deepEqual(errors, []);
});
