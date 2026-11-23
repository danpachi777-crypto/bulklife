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
export function elbowFlexAmounts(root:Object3D){
  const result={L:0,R:0};
  for(const side of ['L','R'] as const){
    const bone=(name:string)=>root.getObjectByName(name+side)??root.getObjectByName(name+'.'+side);
    const upper=bone('upperArm'),lower=bone('forearm'),hand=bone('hand');
    if(!upper||!lower||!hand)continue;
    const shoulder=upper.getWorldPosition(new Vector3()),elbow=lower.getWorldPosition(new Vector3()),wrist=hand.getWorldPosition(new Vector3());
    const angle=elbow.clone().sub(shoulder).angleTo(wrist.sub(elbow));
    result[side]=Math.max(0,Math.min(1,(angle-.35)/1.35));
  }
  return result;
}
