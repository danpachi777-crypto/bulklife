import {PARTS,clamp,fatPercent,partMap,type BodyState} from '../core/model';
import {generateCareer} from '../core/simulation';
import {PROFILES} from '../core/content';
import {portraitFrame} from './portraitAsset';
const base=generateCareer(PROFILES[0],42,'bl-base').athlete.body;
export const BODY_ASSET_URL='/assets/athlete-v1.glb?revision=career-assets-v1';
export const MAX_CAMERA_DISTANCE=5;
export const STUDIO_WALL_Z=-6.5;
export function morphValues(b:BodyState){return {...partMap(p=>clamp((Math.pow(b.muscle[p]/base.muscle[p],.65)-1)*3,-.55,1.2)),bodyFat:clamp((fatPercent(b)-18)/18,-.65,1.2),pump:PARTS.reduce((s,p)=>s+b.pump[p],0)/16};}
/** v8 has a separately authored lean surface. Never invert its obese endpoint. */
export function anatomyMorphValues(b:BodyState){
 const regional=partMap(p=>clamp((Math.pow(b.muscle[p]/base.muscle[p],.65)-1)*3,-.30,1.2));
 const bodyFat=clamp((fatPercent(b)-18)/18,0,1.2);
 const development=PARTS.reduce((sum,p)=>sum+Math.max(0,regional[p]),0)/(PARTS.length*1.2);
 return {...regional,bodyFat,leanDefinition:clamp((18-fatPercent(b))/12,0,1),fatSoftening:bodyFat*development,pump:PARTS.reduce((sum,p)=>sum+b.pump[p],0)/PARTS.length};
}
/** Invert the authored frame for bind-space picking/heat maps (glTF Y-up).
 * Regional fields remain the same anatomical labels on every skeletal frame. */
export function canonicalAnatomyPoint(v:{x:number;y:number;z:number},height:number){
 const frame=portraitFrame(height);if(frame==='standard')return v;
 const s=(t:number)=>{t=clamp(t,0,1);return t*t*(3-2*t);};
 const wide=frame==='broad'?1.075:.955,depth=frame==='broad'?1.065:.96,leg=frame==='broad'?-.032:.042;
 let z=v.y,x=v.x;
 for(let i=0;i<12;i++){
  const head=1-s((z-1.45)/.075);x=v.x/(1+(wide-1)*head);
  const arm=s((Math.abs(x)-.18)/.16)*s((1.46-z)/.14);
  z=v.y-leg*(z<.95?z/.95:1-s((z-.95)/.55))-(frame==='tall'?-.022:.016)*arm;
 }
 return {x,y:z,z:v.z/(1+(depth-1)*(1-s((z-1.45)/.075)))};
}
export function seatedSupportValues(height:number,values:ReturnType<typeof anatomyMorphValues>,seated:number){
 const plane=.4825/(height/176.5)-portraitFloorLift(height,true);
 const t=clamp((plane-.445)/(.472-.445),0,1),u=clamp((plane-.472)/(.500-.472),0,1);
 const development=(Math.max(0,values.glutes)+Math.max(0,values.hamstrings)+Math.max(0,values.quads))/3.6;
 const result:Record<string,number>={};
 for(const [label,weight] of [['Low',1-t],['Mid',t*(1-u)],['High',u]] as const){
  result['seatedSeat'+label]=seated*weight;
  result['seatedSeat'+label+'Muscle']=seated*weight*development;
  result['seatedSeat'+label+'Fat']=seated*weight*values.bodyFat;
 }
 return result;
}
/** Source-metre sole offsets measured from the real exported skinned meshes. */
export function portraitFloorLift(height:number,wear:boolean){return (wear?.01515:.00360)+(portraitFrame(height)==='broad'?.00295:0);}
