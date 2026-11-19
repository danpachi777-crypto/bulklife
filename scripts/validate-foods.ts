import assert from 'node:assert/strict';
import {FOODS} from '../src/core/foods';
assert.equal(FOODS.length,30);
assert.equal(new Set(FOODS.map(f=>f.id)).size,30);
assert.equal(new Set(FOODS.map(f=>f.referenceId)).size,30);
const numeric=['kcal','protein','carbs','fat','fiber','calcium','iron','vitaminC','sodium','water','price','prep'] as const;
for(const f of FOODS){for(const k of numeric)assert.ok(Number.isFinite(f[k])&&f[k]>=0,`${f.id}/${k}`);assert.ok(f.kcal<=900);assert.ok(f.water<=100);assert.match(f.referenceId,/^\d{5}$/);assert.ok(f.source.startsWith('https://www.mext.go.jp/'));assert.ok(f.state.length>0);}
const food=(id:string)=>FOODS.find(f=>f.id===id)!;
assert.equal(food('rice').kcal,156);
assert.equal(food('chicken-breast').protein,38.8);
assert.equal(food('milk').calcium,110);
assert.equal(food('olive-oil').fat,100);
assert.equal(food('rice').kcal*3,468);
console.log('30 official food records validated; edible-100g units and representative source values match.');
