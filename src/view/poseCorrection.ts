import { Vector3, type Object3D } from "three";
/** GLTFLoader sanitizes dots in names. Accept authored and loaded names. */
export function shoulderRaiseAmount(root: Object3D) {
  const head = new Vector3(),
    elbow = new Vector3();
  let total = 0,
    count = 0;
  for (const side of ["L", "R"]) {
    const upper =
        root.getObjectByName("upperArm" + side) ??
        root.getObjectByName("upperArm." + side),
      lower =
        root.getObjectByName("forearm" + side) ??
        root.getObjectByName("forearm." + side);
    if (upper && lower) {
      upper.getWorldPosition(head);
      lower.getWorldPosition(elbow);
      total += Math.max(
        0,
        Math.min(1, (elbow.sub(head).normalize().y + 0.35) / 0.63),
      );
      count++;
    }
  }
  return total / Math.max(1, count);
}
