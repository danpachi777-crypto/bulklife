import {partMap,type PartMap,type Focus,type Part,clamp} from './model';
import type {ExercisePlan} from './careerTypes';
export interface Exercise {id:string;name:string;direct:PartMap;indirect:PartMap;equipment:'free'|'cable'|'machine'|'bodyweight';pattern:'push'|'pull'|'legs';baseLoad:number;minutes:number}
const make=(id:string,name:string,d:Partial<PartMap>,indirect:Partial<PartMap>,equipment:Exercise['equipment'],pattern:Exercise['pattern'],baseLoad:number):Exercise=>({id,name,direct:partMap(p=>d[p]??0),indirect:partMap(p=>indirect[p]??0),equipment,pattern,baseLoad,minutes:.6});
export const EXERCISES:Exercise[]=[
 make('incline','インクラインダンベルプレス',{upperChest:1,chest:.35},{frontDelts:.4,triceps:.3},'free','push',12),
 make('bench','ベンチプレス',{chest:1,upperChest:.3},{frontDelts:.3,triceps:.4},'free','push',35),
 make('fly','ケーブルフライ',{chest:1,upperChest:.2},{frontDelts:.15},'cable','push',10),
 make('ohp','オーバーヘッドプレス',{frontDelts:1,sideDelts:.4},{triceps:.4,upperChest:.15},'free','push',20),
 make('lateral','サイドレイズ',{sideDelts:1},{frontDelts:.1,upperBack:.15},'free','push',5),
 make('rearFly','リアデルトフライ',{rearDelts:1},{upperBack:.3},'free','pull',5),
 make('pulldown','ラットプルダウン',{lats:1},{biceps:.35,upperBack:.25,forearms:.2},'machine','pull',30),
 make('pullup','補助付き懸垂',{lats:1},{biceps:.4,upperBack:.25,forearms:.3},'bodyweight','pull',25),
 make('supportedRow','チェストサポートロウ',{upperBack:1,lats:.5},{rearDelts:.3,biceps:.3},'free','pull',15),
 make('cableRow','シーテッドケーブルロウ',{upperBack:.7,lats:.7},{rearDelts:.3,biceps:.3},'cable','pull',25),
 make('curl','アームカール',{biceps:1},{forearms:.3},'free','pull',7),
 make('hammer','ハンマーカール',{biceps:.7,forearms:.5},{},'free','pull',7),
 make('pressdown','トライセプスプレスダウン',{triceps:1},{},'cable','push',12),
 make('overheadTri','オーバーヘッドトライセプスエクステンション',{triceps:1},{},'free','push',8),
 make('wrist','リストカール',{forearms:1},{},'free','pull',4),
 make('squat','スクワット',{quads:1,glutes:.6},{erectors:.3,abs:.25,hamstrings:.15},'free','legs',35),
 make('legPress','レッグプレス',{quads:1,glutes:.5},{hamstrings:.15},'machine','legs',60),
 make('splitSquat','スプリットスクワット',{quads:.8,glutes:.8},{hamstrings:.2,abs:.2},'free','legs',8),
 make('legExtension','レッグエクステンション',{quads:1},{},'machine','legs',20),
 make('rdl','ルーマニアンデッドリフト',{hamstrings:1,glutes:.6},{erectors:.5,forearms:.3},'free','legs',30),
 make('legCurl','シーテッドレッグカール',{hamstrings:1},{},'machine','legs',15),
 make('hipThrust','ヒップスラスト',{glutes:1},{hamstrings:.25},'free','legs',30),
 make('calf','カーフレイズ',{calves:1},{},'free','legs',15),
 make('crunch','ケーブルクランチ',{abs:1},{},'cable','pull',15)
];
const recipes:Record<Focus,string[]>={full:['bench','pulldown','squat','rdl','lateral','calf','crunch'],push:['incline','bench','lateral','ohp','overheadTri'],pull:['pulldown','supportedRow','rearFly','curl','wrist'],legs:['squat','rdl','legCurl','hipThrust','calf'],rest:[]};
export function exerciseRecipe(focus:Focus,sets=2):ExercisePlan[]{return recipes[focus].map(id=>{const e=EXERCISES.find(e=>e.id===id)!;return {exerciseId:id,load:e.baseLoad,reps:10,sets,rir:3,rest:90,rom:1,priority:'rir'};});}
export const exerciseById=(id:string)=>EXERCISES.find(e=>e.id===id);
export function sessionMinutes(exercises:ExercisePlan[]){return exercises.length?8+exercises.reduce((total,e)=>total+e.sets*(e.reps*3/60+e.rest/60)+2,0):0;}
export function exerciseCapacity(e:Exercise,bodyMuscle:PartMap,ability:PartMap,base:PartMap){let weighted=0,total=0;for(const p of Object.keys(e.direct) as Part[]){const w=e.direct[p]+e.indirect[p]*.5;weighted+=w*(Math.pow(bodyMuscle[p]/base[p],.5)*(1+ability[p]*1.4));total+=w;}return e.baseLoad*(total?weighted/total:1);}
