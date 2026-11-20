import { test } from "node:test";
import assert from "node:assert/strict";
import { Uint16BufferAttribute, Float32BufferAttribute } from "three";
import { linearVertexColors } from "../src/view/colorData";
test("normalized glTF color storage preserves skin color instead of clipping white", () => {
  const stored = new Uint16BufferAttribute(
    [65535, 32768, 0, 16384, 49151, 65535],
    3,
    true,
  );
  const actual = linearVertexColors(stored);
  assert.ok(actual.every((x) => x >= 0 && x <= 1));
  assert.equal(actual[0], 1);
  assert.ok(Math.abs(actual[1] - 0.5) < 0.00002);
  assert.ok(Math.abs(actual[3] - 0.25) < 0.00002);
  assert.equal(actual[5], 1);
});
test("floating point pigmentation remains unchanged", () => {
  const source = new Float32BufferAttribute([0.43, 0.265, 0.18], 3);
  assert.deepEqual(linearVertexColors(source), source.array);
});
