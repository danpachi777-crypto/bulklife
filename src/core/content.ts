import { type StartProfile, type Focus, type PartMap, partMap } from './model';
export const PROFILES:StartProfile[] = [
 {id:'P1',title:'生活が安定した初心者',height:172,weight:66,fatPercent:18,money:200000,income:160000,fixed:65000,work:35,commute:5,challenge:'基本動作と、全身の土台をつくる。',experience:'スポーツ・ジムともにこれから',environment:'地域のジム。安定した生活リズム。',drawWeight:1},
 {id:'P2',title:'スポーツ経験のある初心者',height:178,weight:77,fatPercent:17,money:180000,income:165000,fixed:65000,work:37.5,commute:5,challenge:'脚の土台を生かし、胸・背中と競技技術を育てる。',experience:'球技の経験あり。ジムは初心者。',environment:'標準的なジム。脚の動作に経験。',drawWeight:1},
 {id:'P3',title:'資金を活用できる初心者',height:175,weight:72,fatPercent:20,money:1200000,income:260000,fixed:115000,work:45,commute:7.5,challenge:'限られた時間に、練習・食事・睡眠を収める。',experience:'スポーツ・ジムともにこれから',environment:'指導や設備に予算を使える。',drawWeight:1},
 {id:'P4',title:'時間を調整できる初心者',height:169,weight:64,fatPercent:15,money:80000,income:110000,fixed:40000,work:22.5,commute:2.5,challenge:'自炊と練習を続け、大会資金を用意する。',experience:'スポーツ・ジムともにこれから',environment:'住居面の支援。調整しやすい勤務。',drawWeight:1},
 {id:'P5',title:'身体を整え直す初心者',height:181,weight:89,fatPercent:27,money:250000,income:190000,fixed:80000,work:37.5,commute:5,challenge:'身体を把握し、生活習慣と体脂肪を整える。',experience:'運動は久しぶり。ジムは初心者。',environment:'標準的なジム。筋量と脂肪量が比較的多い。',drawWeight:1},
 {id:'P6',title:'競技環境に恵まれた初心者',height:185,weight:74,fatPercent:16,money:150000,income:160000,fixed:60000,work:35,commute:3,challenge:'全身の厚みを育て、ポージングを学ぶ。',experience:'ジム初心者。相談相手がいる。',environment:'通いやすいジムと、競技経験のある知人。',drawWeight:1}
];
export const FOCUS_LABELS:Record<Focus,string>={full:'全身',push:'胸・肩・腕',pull:'背中・腕',legs:'脚・臀部',rest:'休養'};
// Coefficients are fictional stimulus allocation, not claims of isolation.
export const STIMULUS:Record<Focus,PartMap>={
 full:partMap(()=>0.42),
 push:partMap(p=>(({upperChest:1,chest:1,frontDelts:.65,sideDelts:.7,triceps:.7,abs:.15} as Partial<PartMap>)[p]??0)),
 pull:partMap(p=>(({lats:1,upperBack:1,rearDelts:.7,erectors:.35,biceps:.75,forearms:.5} as Partial<PartMap>)[p]??0)),
 legs:partMap(p=>(({quads:1,hamstrings:.8,glutes:.9,calves:.7,erectors:.25,abs:.3} as Partial<PartMap>)[p]??0)),
 rest:partMap(()=>0)
};
export const MASS_WEIGHTS=[.035,.07,.025,.025,.025,.09,.06,.035,.04,.06,.04,.17,.08,.13,.065,.05];
