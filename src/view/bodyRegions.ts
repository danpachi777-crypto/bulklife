import { PARTS, type Part } from "../core/model";
// Region authoring uses Blender X/right, Y/back, Z/up. Exported bind vertices
// use glTF X/right, Y/up, Z/front, even when posed by the skeleton.
import v2Regions from "./regionFields-v2.json";
const regions: Record<Part, number[]> = {
  upperChest: [0.09, -0.1, 1.4, 0.09, 0.08, 0.045],
  chest: [0.095, -0.1, 1.34, 0.1, 0.08, 0.065],
  frontDelts: [0.215, -0.045, 1.424, 0.065, 0.06, 0.075],
  sideDelts: [0.24, 0, 1.425, 0.06, 0.07, 0.08],
  rearDelts: [0.215, 0.045, 1.425, 0.065, 0.06, 0.075],
  lats: [0.16, 0.025, 1.28, 0.07, 0.1, 0.15],
  upperBack: [0.09, 0.08, 1.395, 0.11, 0.08, 0.09],
  erectors: [0.055, 0.075, 1.16, 0.06, 0.06, 0.15],
  biceps: [0.27, -0.03, 1.29, 0.07, 0.07, 0.12],
  triceps: [0.265, 0.03, 1.29, 0.07, 0.07, 0.13],
  forearms: [0.322, 0, 1.075, 0.055, 0.07, 0.11],
  quads: [0.099, -0.045, 0.724, 0.09, 0.1, 0.2],
  hamstrings: [0.099, 0.05, 0.72, 0.09, 0.1, 0.2],
  glutes: [0.09, 0.075, 0.91, 0.1, 0.09, 0.1],
  calves: [0.102, 0.025, 0.34, 0.065, 0.08, 0.15],
  abs: [0.055, -0.07, 1.14, 0.085, 0.07, 0.15],
};
export function influence(
  v: { x: number; y: number; z: number },
  p: Part,
  model = "athlete-v1",
) {
  const volumes = model === "athlete-v2" ? v2Regions[p] : [regions[p]];
  return Math.max(
    ...volumes.map(([x, y, z, rx, ry, rz]) =>
      Math.exp(
        -2 *
          ((Math.abs(v.x) - x) ** 2 / rx ** 2 +
            (-v.z - y) ** 2 / ry ** 2 +
            (v.y - z) ** 2 / rz ** 2),
      ),
    ),
  );
}
export function selectedRegion(
  v: { x: number; y: number; z: number },
  model = "athlete-v1",
): Part | null {
  let best: Part | null = null,
    value = 0.03;
  for (const p of PARTS) {
    const w = influence(v, p, model);
    if (w > value) {
      best = p;
      value = w;
    }
  }
  return best;
}
