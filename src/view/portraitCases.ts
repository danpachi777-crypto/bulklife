import { PROFILES } from "../core/content";
import { generateCareer } from "../core/simulation";
import { PARTS, muscleMass, type BodyState } from "../core/model";
/** Read-only art QA fixtures. They never enter the career storage or simulation. */
export const PORTRAIT_CASES = [
  { id: "slim", label: "細身", muscle: 0.78, fat: 12 },
  { id: "standard", label: "標準", muscle: 1, fat: 18 },
  { id: "intermediate", label: "中間", muscle: 1.22, fat: 20 },
  { id: "muscular-fat", label: "筋量・脂肪多め", muscle: 1.65, fat: 29 },
  { id: "muscular-lean", label: "発達・絞った体型", muscle: 1.65, fat: 8 },
  { id:'chest-shoulders',label:'胸と肩',muscle:1.65,fat:14,parts:['upperChest','chest','frontDelts','sideDelts','rearDelts']},
  { id:'shoulders-arms',label:'肩と腕',muscle:1.65,fat:14,parts:['frontDelts','sideDelts','rearDelts','biceps','triceps','forearms']},
  { id:'back-shoulders',label:'背中と肩',muscle:1.65,fat:14,parts:['lats','upperBack','erectors','frontDelts','sideDelts','rearDelts']},
  { id:'legs-glutes',label:'脚と臀部',muscle:1.65,fat:14,parts:['quads','hamstrings','glutes','calves']},
] as const;
export function portraitBody(id: string): BodyState {
  const choice = PORTRAIT_CASES.find((c) => c.id === id) ?? PORTRAIT_CASES[1];
  const body = structuredClone(
    generateCareer(PROFILES[0], 42, "bl-art-qa").athlete.body,
  );
  const selected=new Set<string>('parts' in choice?choice.parts:PARTS);
  for (const p of PARTS) if(selected.has(p))body.muscle[p] *= choice.muscle;
  const lean = muscleMass(body) + body.otherLean;
  body.fat = (lean * choice.fat) / (100 - choice.fat);
  return body;
}
