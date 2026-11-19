import {PARTS,clamp,fatPercent,partMap,type BodyState} from '../core/model';
import {generateCareer} from '../core/simulation';
import {PROFILES} from '../core/content';
const base=generateCareer(PROFILES[0],42,'bl-base').athlete.body;
export const BODY_ASSET_URL='/assets/athlete-v1.glb?revision=career-assets-v1';
export const MAX_CAMERA_DISTANCE=5;
export const STUDIO_WALL_Z=-6.5;
export function morphValues(b:BodyState){return {...partMap(p=>clamp((Math.pow(b.muscle[p]/base.muscle[p],.65)-1)*3,-.55,1.2)),bodyFat:clamp((fatPercent(b)-18)/18,-.65,1.2),pump:PARTS.reduce((s,p)=>s+b.pump[p],0)/16};}
