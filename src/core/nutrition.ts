import {FOODS} from './foods';
import {weight,type Career,clamp} from './model';
import type {CareerProgress} from './careerTypes';
export type MealItem=CareerProgress['meals'][number];
export function mealTotals(meals:MealItem[]){
 const total={calories:0,protein:0,carbs:0,fat:0,fiber:0,calcium:0,iron:0,vitaminC:0,sodium:0,water:0,cost:0,prep:0};
 for(const m of meals){const f=FOODS.find(f=>f.id===m.foodId);if(!f)throw new Error('食品が見つかりません');const n=m.grams/100;total.calories+=f.kcal*n;for(const k of ['protein','carbs','fat','fiber','calcium','iron','vitaminC','sodium','water'] as const)total[k]+=f[k]*n;total.cost+=f.price*n;total.prep+=f.prep*n;}
 return total;
}
export function suggestMeals(c:Career,purpose:CareerProgress['purpose']):MealItem[]{
 const w=weight(c.athlete.body),target=w*29+(purpose==='build'?250:purpose==='cut'?-350:purpose==='recover'?100:0);
 const chicken=Math.max(100,(w*1.8-65)/.388);
 const base:MealItem[]=[{foodId:'oats',grams:60,time:7.5},{foodId:'milk',grams:250,time:7.5},{foodId:'banana',grams:100,time:7.5},{foodId:'chicken-breast',grams:Math.round(chicken/2),time:12.5},{foodId:'broccoli',grams:100,time:12.5},{foodId:'chicken-breast',grams:Math.round(chicken/2),time:19},{foodId:'tofu',grams:150,time:19},{foodId:'spinach',grams:100,time:19},{foodId:'olive-oil',grams:15,time:19},{foodId:'yogurt',grams:150,time:21.5}];
 const riceKcal=FOODS.find(f=>f.id==='rice')!.kcal/100,rice=Math.max(100,(target-mealTotals(base).calories)/riceKcal);
 return [...base,{foodId:'rice',grams:Math.round(rice/2),time:12.5},{foodId:'rice',grams:Math.round(rice/2),time:19}];
}
export function nutritionPlan(c:Career){
 const p=c.progress;
 if(!p||p.mealMode==='aggregate')return {calories:c.plan.calories,protein:c.plan.protein,cost:c.plan.foodCost,prep:c.plan.prep,nutrients:null};
 const n=mealTotals(p.meals);return {calories:n.calories,protein:n.protein,cost:n.cost,prep:clamp(n.prep/60,.25,2),nutrients:n};
}
export function useMealTemplate(c:Career,purpose:CareerProgress['purpose']):Career{
 if(!c.progress)throw new Error('競技キャリアを有効にしてください');const next={...c,progress:{...c.progress,purpose,mealMode:'foods' as const,meals:suggestMeals(c,purpose)}};
 const n=nutritionPlan(next);return {...next,plan:{...next.plan,calories:Math.round(clamp(n.calories,1000,5000)),protein:Math.round(clamp(n.protein,30,250)),foodCost:Math.round(clamp(n.cost,300,3000)),prep:n.prep}};
}
