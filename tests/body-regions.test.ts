import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AnimationMixer, Raycaster, SkinnedMesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { selectedRegion, influence } from "../src/view/bodyRegions.ts";

globalThis.self = globalThis as any;
globalThis.createImageBitmap = (async () => ({
  width: 1024,
  height: 1024,
  close() {},
})) as any;
test("both exported human meshes map real front/back ray hits to anatomical regions in every major pose", async () => {
  for (const version of ["v1", "v2"]) {
    const bytes = readFileSync(
      new URL(`../public/assets/athlete-${version}.glb`, import.meta.url),
    );
    const g = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
    const body = g.scene.getObjectByName(
      version === "v1" ? "BL_AthleteBody" : "BL_V2_AthleteBody",
    ) as SkinnedMesh;
    const mixer = new AnimationMixer(g.scene);
    for (const name of ["Breathing", "FrontDoubleBiceps", "BackDoubleBiceps"]) {
      mixer.stopAllAction();
      mixer.clipAction(g.animations.find((c) => c.name === name)!).play();
      mixer.setTime(0.5);
      g.scene.updateMatrixWorld(true);
      body.skeleton.update();
      const front = new Raycaster(
        new Vector3(0.08, 1.32, 3),
        new Vector3(0, 0, -1),
      ).intersectObject(body);
      assert.ok(front.length, `${version}/${name}: front ray hits skin`);
      const hit = front[0],
        p = body.geometry.attributes.position,
        face = hit.face!;
      const bind = new Vector3()
        .fromBufferAttribute(p, face.a)
        .add(new Vector3().fromBufferAttribute(p, face.b))
        .add(new Vector3().fromBufferAttribute(p, face.c))
        .multiplyScalar(1 / 3);
      const expectedFront =
        bind.z > 0
          ? ["chest", "upperChest", "abs"]
          : ["upperBack", "lats", "erectors", "rearDelts"];
      assert.ok(
        expectedFront.includes(
          selectedRegion(bind, `athlete-${version}`) ?? "",
        ),
        `${version}/${name}: front-facing surface selects ${expectedFront}, got ${selectedRegion(bind, `athlete-${version}`)}`,
      );
      assert.ok(
        influence(
          bind,
          selectedRegion(bind, `athlete-${version}`)!,
          `athlete-${version}`,
        ) > 0.03,
      );
      const back = new Raycaster(
        new Vector3(0.08, 1.35, -3),
        new Vector3(0, 0, 1),
      ).intersectObject(body);
      assert.ok(back.length);
      const f = back[0].face!;
      const v = new Vector3()
        .fromBufferAttribute(p, f.a)
        .add(new Vector3().fromBufferAttribute(p, f.b))
        .add(new Vector3().fromBufferAttribute(p, f.c))
        .multiplyScalar(1 / 3);
      const expectedBack =
        v.z > 0
          ? ["chest", "upperChest", "abs"]
          : ["upperBack", "lats", "erectors", "rearDelts"];
      assert.ok(
        expectedBack.includes(selectedRegion(v, `athlete-${version}`) ?? ""),
        `${version}/${name}: opposite surface selects ${expectedBack}, got ${selectedRegion(v, `athlete-${version}`)}`,
      );
    }
  }
});
test("non-anatomical points do not select a muscle", () => {
  assert.equal(selectedRegion({ x: 0, y: 4, z: 0 }, "athlete-v2"), null);
});
