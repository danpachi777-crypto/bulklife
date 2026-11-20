import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { AnimationMixer, Box3, Vector3, Mesh, SkinnedMesh } from "three";
import { PORTRAIT_CASES, portraitBody } from "../src/view/portraitCases";
import { morphValues } from "../src/view/bodyMapping";
import { linearVertexColors } from "../src/view/colorData";
import { PORTRAIT_ASSET_URL } from "../src/view/portraitAsset";
const bytes = fs.readFileSync("public/assets/athlete-v4.glb");
const meta = JSON.parse(
  fs.readFileSync("public/assets/portrait-v4.json", "utf8"),
);
const sha = crypto.createHash("sha256").update(bytes).digest("hex");
assert.equal(sha, meta.sha256);
assert.ok(PORTRAIT_ASSET_URL.includes(sha.slice(0, 12)));
// CPU test decodes geometry and skinning with the real loader. Texture appearance
// and actual browser decoding are verified separately in the visible browser.
Object.assign(globalThis, {
  self: globalThis,
  createImageBitmap: async () => ({ width: 1024, height: 1024, close() {} }),
});
const g = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
assert.deepEqual(g.animations.map((a) => a.name).sort(), meta.clips.toSorted());
const body = g.scene.getObjectByName("BL_V2_AthleteBody") as SkinnedMesh;
assert.equal(body.skeleton.bones.length, 50);
assert.deepEqual(
  Object.keys(body.morphTargetDictionary!).sort(),
  [...meta.morphs,...meta.expressionMorphs].toSorted(),
);
const color = body.geometry.getAttribute("color");
if (color)
  assert.ok(
    linearVertexColors(color).every(
      (c) => Number.isFinite(c) && c >= 0 && c <= 1,
    ),
  );
assert.ok(
  (body.material as any).map &&
    (body.material as any).roughnessMap &&
    (body.material as any).normalMap,
);
const clothes = meta.garments.map(
  (n) => g.scene.getObjectByName(n) as SkinnedMesh,
);
for (const cloth of clothes) {
  assert.ok(cloth.isSkinnedMesh);
  assert.deepEqual(
    Object.keys(cloth.morphTargetDictionary!).filter(n=>n!=="seatedCloth").sort(),
    meta.morphs.toSorted(),
  );
  const correction=cloth.morphTargetDictionary!.seatedCloth;
  if(correction!==undefined){
    const delta=cloth.geometry.morphAttributes.position[correction],v=new Vector3();
    for(let i=0;i<delta.count;i++)assert.ok(v.fromBufferAttribute(delta,i).length()<=.00451,'seated cloth must contain only millimetre folds, not another body target');
  }
}
const blink=body.geometry.morphAttributes.position[body.morphTargetDictionary!.blink],blinkDelta=new Vector3();
for(let i=0;i<blink.count;i++)assert.ok(blinkDelta.fromBufferAttribute(blink,i).length()<.008,'blink must not inherit a body morph');
assert.ok(!g.scene.getObjectByName('BL_V2_Eyebrow.L'), 'old eyebrow lines must not overlay the groom');
const shorts=clothes.find(c=>c.name==='BL_V4_TrainingShorts')!;
const joint=shorts.geometry.getAttribute('skinIndex'),skinWeight=shorts.geometry.getAttribute('skinWeight');
for(let i=0;i<joint.count;i++)for(let j=0;j<4;j++){
  const bone=shorts.skeleton.bones[joint.getComponent(i,j)];
  if(/finger|hand|forearm|upperArm/.test(bone.name))assert.ok(skinWeight.getComponent(i,j)<.02,`shorts vertex ${i} bound to ${bone.name}`);
}
const mixer = new AnimationMixer(g.scene);
const records = [];
for (const variant of PORTRAIT_CASES) {
  const b = portraitBody(variant.id),
    values = morphValues(b);
  g.scene.traverse((o) => {
    if (o instanceof Mesh && o.morphTargetDictionary && o.morphTargetInfluences)
      for (const [name, index] of Object.entries(o.morphTargetDictionary))
        o.morphTargetInfluences[index] =
          values[name as keyof typeof values] ?? 0;
  });
  for (const name of [
    "GymIdle",
    "SeatedPrepare",
    "StandUp",
    "TrainingPress",
    "TrainingSquat",
    "StageEntry",
    "FrontDoubleBiceps",
    "SideChest",
    "BackDoubleBiceps",
  ]) {
    mixer.stopAllAction();
    const clip = g.animations.find((a) => a.name === name)!;
    mixer.clipAction(clip).play();
    for (const t of [0, 0.5, 0.98]) {
      mixer.setTime(clip.duration * t);
      g.scene.updateMatrixWorld(true);
      g.scene.traverse((o) => {
        if (o instanceof SkinnedMesh) o.skeleton.update();
      });
      const box = new Box3().setFromObject(g.scene, true),
        size = box.getSize(new Vector3());
      assert.ok(
        [...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite),
      );
      assert.ok(
        size.y > 1 && size.y < 2.6 && size.x < 2.2 && size.z < 2.2,
        `${variant.id}/${name} bounds`,
      );
      assert.ok(
        box.min.y > -0.14 && box.min.y < 0.15,
        `${variant.id}/${name} ground ${box.min.y}`,
      );
      for (const cloth of clothes)
        assert.equal(
          cloth.morphTargetInfluences![cloth.morphTargetDictionary!.bodyFat],
          values.bodyFat,
        );
      records.push({
        variant: variant.id,
        clip: name,
        t,
        min: box.min.toArray(),
        max: box.max.toArray(),
      });
    }
  }
}
// The transition previously sank the toe box into the floor between endpoints.
// Sample every authored frame, beyond the three general animation samples.
const standContact: number[] = [];
mixer.stopAllAction();
const stand = g.animations.find(a=>a.name==='StandUp')!;
mixer.clipAction(stand).play();
for(let frame=0;frame<=36;frame++){
  mixer.setTime(stand.duration*frame/36);
  g.scene.updateMatrixWorld(true);
  g.scene.traverse(o=>{if(o instanceof SkinnedMesh)o.skeleton.update();});
  const low=new Box3().setFromObject(g.scene,true).min.y;
  assert.ok(low >= -.035 && low <= .06, `Stand-up frame ${frame}: ground ${low}`);
  standContact.push(low);
}
for (const [file, expected] of [
  [
    "public/assets/athlete-v3.glb",
    "2d8907ef0dd75393cdf425e97a339c9fed0a3b6c59a74203abe96685607b120a",
  ],
  [
    "public/assets/athlete-v2.glb",
    "3b4ff1ed7253368c09d4d6b1e593f6c46a2d84ae31686a584098cf67979543b6",
  ],
  [
    "assets/blender/bulk-life-athlete-v2.blend",
    "db34d8e224e5de3426534349a52af1649ba4dbe257725176fc6e5eca52b262be",
  ],
])
  assert.equal(
    crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
    expected,
  );
const report = {
  status: "pass",
  frames: records.length,
  bones: 50,
  morphs: 18,
  triangles: meta.triangles,
  bytes: bytes.length,
  sha256: sha,
  originalV2Preserved: true,
  standContact,
  records,
  limits: [
    "Bounds and finite skinning tests are not exhaustive collision proofs.",
    "CPU image loading is a dimensions stub, not texture appearance or phone performance verification.",
  ],
};
fs.writeFileSync(
  "docs/qa/coach-portrait-v4/runtime-report.json",
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    status: report.status,
    frames: report.frames,
    bones: 50,
    morphs: 18,
    triangles: meta.triangles,
    bytes: bytes.length,
    originalV2Preserved: true,
  }),
);
