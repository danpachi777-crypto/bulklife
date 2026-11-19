import {readFileSync,writeFileSync} from 'node:fs';
let p=new URL('../src/core/simulation.ts',import.meta.url),s=readFileSync(p,'utf8');
s=s.replace('freeHours:24-work-commute-duration-(duration?.5:0)-actualSleep-prep-2.5-extraMinutes/60,','freeHours:Math.max(0,24-work-commute-duration-(duration?.5:0)-actualSleep-prep-2.5-extraMinutes/60),');
s=s.replace('const available=Math.max(0,a.life.money+income-fixed-gym-coaching),foodCost=Math.min(nutrition.cost,available),mealRatio=nutrition.cost?foodCost/nutrition.cost:0;', 'const available=Math.max(0,a.life.money+income-fixed-gym-coaching),mealRatio=nutrition.cost?Math.min(1,available/nutrition.cost,10000/Math.max(1,nutrition.calories)):0,foodCost=nutrition.cost*mealRatio;');
writeFileSync(p,s);
p=new URL('../src/ui/FoodLifeScreen.tsx',import.meta.url);s=readFileSync(p,'utf8');
s=s.replace("if(equipment==='home'&&c.athlete.life.money<20000)throw new Error('自宅器具の準備に20,000円が必要です');onChange({...c,", "onChange(()=>{if(equipment==='home'&&c.athlete.life.money<20000)throw new Error('自宅器具の準備に20,000円が必要です');return {...c,");
s=s.replace("progress:{...p,equipment}});}}", "progress:{...p,equipment}};});}}");
writeFileSync(p,s);
// Attach the authored equipment only to matching authored dumbbell clips.
p=new URL('../src/view/AthleteStudio.tsx',import.meta.url);s=readFileSync(p,'utf8');
s=s.replace('const gltf=useLoader(GLTFLoader,BODY_ASSET_URL);const root=', "const gltf=useLoader(GLTFLoader,BODY_ASSET_URL);const dumbbell=useLoader(GLTFLoader,'/assets/dumbbell-v1.glb');const root=");
s=s.replace(' const mixer=useMemo',` const equipment=useMemo(()=>[dumbbell.scene.clone(true),dumbbell.scene.clone(true)],[dumbbell]);
 useEffect(()=>{const bones=['handL','handR'];equipment.forEach((prop,i)=>{const bone=root.getObjectByName(bones[i]);if(bone){bone.add(prop);prop.position.set(0,.04,0);}});return()=>equipment.forEach(prop=>prop.removeFromParent());},[root,equipment]);
 useEffect(()=>{equipment.forEach(prop=>{prop.visible=['TrainingPress','TrainingRow'].includes(clip);});},[equipment,clip]);
 const mixer=useMemo`);
const unusedStart=s.indexOf('function Props('),unusedEnd=s.indexOf('function Environment(');if(unusedStart>=0)s=s.slice(0,unusedStart)+s.slice(unusedEnd);
s=s.replace('ドラッグで回転・クリックで部位選択',"{onSelectPart?'ドラッグで回転・クリックで部位選択':'ドラッグで回転・スクロールで拡大'}");
writeFileSync(p,s);
