import {PROFILES} from '../core/content';
import {generateCareer} from '../core/simulation';
import {PARTS,muscleMass,type BodyState} from '../core/model';
/** Artist-selected test anchors, NOT measurements inferred from the reference photos. */
export const ANATOMY_ROUTES={
 A:{label:'A・標準骨格',height:176.5,muscle:[0,.18,.55,.85,1.2],fat:[18,17,15,10,7]},
 B:{label:'B・長身と長い手足',height:185,muscle:[-.15,.10,.48,.82,1.2],fat:[16,15,13,10,7]},
 C:{label:'C・広い胸郭と骨盤',height:169,muscle:[0,.20,.58,.90,1.2],fat:[24,23,21,15,10]},
 D:{label:'D・脂肪の多い状態から',height:176.5,muscle:[0,.16,.55,.85,1.2],fat:[32,28,24,16,10]},
} as const;
export type AnatomyRoute=keyof typeof ANATOMY_ROUTES;
export function anatomyBody(route:AnatomyRoute,stage:number):BodyState{
 const choice=ANATOMY_ROUTES[route],position=Math.max(0,Math.min(4,stage-1)),index=Math.min(3,Math.floor(position)),fraction=position-index;
 const lerp=(values:readonly number[])=>values[index]+(values[index+1]-values[index])*fraction;
 const b=structuredClone(generateCareer(PROFILES[0],42,'bl-anatomy-v8-qa').athlete.body);
 b.height=choice.height;b.shoulder=1;
 const massFactor=Math.pow(1+lerp(choice.muscle)/3,1/.65);
 for(const p of PARTS)b.muscle[p]*=massFactor;
 const bf=lerp(choice.fat);b.fat=(muscleMass(b)+b.otherLean)*bf/(100-bf);
 return b;
}
