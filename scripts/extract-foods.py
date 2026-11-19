"""Extract only the game food records from the downloaded official MEXT workbook.
Read-only workbook extraction; never replaces the source XLSX.
"""
from pathlib import Path
import json
import math
import openpyxl

ROOT = Path('C:/Users/shota/Documents/BulkLife')
SOURCE = 'https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402_02.xlsx'
workbook = openpyxl.load_workbook(ROOT/'docs/research/mext-food-20260327.xlsx', read_only=True, data_only=True)
rows = {str(row[1]): row for row in workbook.worksheets[0].iter_rows(min_row=13, values_only=True) if row[1]}
# referenceId, runtime ID, display name, measured state, fictional yen/100g, fictional preparation minutes/100g
selected = [
 ('01088','rice','白米ごはん','炊飯後・精白米うるち米',35,2),
 ('01085','brown-rice','玄米ごはん','炊飯後',40,2),
 ('01026','bread','食パン','角形食パン・そのまま',50,.3),
 ('01004','oats','オートミール','乾燥重量',70,2),
 ('01064','pasta','スパゲッティ','ゆでた後の重量',45,3),
 ('02007','sweet-potato','さつまいも','皮なし・蒸した後の重量',65,4),
 ('02019','potato','じゃがいも','皮なし・水煮後の重量',40,4),
 ('11288','chicken-breast','鶏むね肉','若どり・皮なし・焼いた後の重量',160,5),
 ('11225','chicken-thigh','鶏もも肉','若どり・皮なし・焼いた後の重量',190,5),
 ('11270','beef','牛もも肉','輸入牛・皮下脂肪なし・焼いた後の重量',300,5),
 ('11132','pork','豚もも肉','大型種・皮下脂肪なし・焼いた後の重量',200,5),
 ('10136','salmon','しろさけ','焼いた後の重量',240,5),
 ('10156','mackerel','まさば','焼いた後の重量',180,5),
 ('10252','tuna','きはだまぐろ','生・可食部',300,1),
 ('12005','egg','ゆで卵','全卵・殻なし・ゆでた後の重量',70,3),
 ('13003','milk','普通牛乳','飲用・重量gで計量',25,.1),
 ('13025','yogurt','プレーンヨーグルト','全脂・無糖',45,.1),
 ('04032','tofu','木綿豆腐','そのまま・可食部',35,.5),
 ('04046','natto','納豆','糸引き納豆・たれなし',90,.5),
 ('04002','azuki','あずき','全粒・無糖・ゆでた後の重量',60,2),
 ('06264','broccoli','ブロッコリー','花序・ゆでた後の重量',75,3),
 ('06268','spinach','ほうれんそう','通年平均・ゆでた後の重量',75,3),
 ('06215','carrot','にんじん','皮なし・ゆでた後の重量',35,3),
 ('06182','tomato','トマト','赤色・生・可食部',65,1),
 ('06061','cabbage','キャベツ','結球葉・生・可食部',25,1),
 ('07107','banana','バナナ','生・皮なしの可食部',40,.3),
 ('07176','apple','りんご','皮つき・生・可食部',60,.5),
 ('07027','mandarin','みかん','普通うんしゅう・じょうのう膜つき・可食部',70,.5),
 ('14001','olive-oil','オリーブ油','製品そのまま',180,.1),
 ('05040','almonds','アーモンド','いり・無塩',200,.1),
]
columns = {'kcal':6,'protein':9,'carbs':20,'fat':12,'fiber':18,'calcium':25,'iron':28,'vitaminC':58,'sodium':23,'water':7}
def number(value):
    if isinstance(value,(float,int)) and math.isfinite(value):return value
    text = str(value).strip()
    if text=='Tr':return 0
    if text.startswith('(') and text.endswith(')'):text=text[1:-1]
    if text in ('','-','None'):raise ValueError('Missing value must not be invented: '+str(value))
    parsed=float(text)
    if not math.isfinite(parsed):raise ValueError(text)
    return int(parsed) if parsed.is_integer() else parsed

foods=[];raw=[]
for reference_id,food_id,name,state,price,prep in selected:
    row=rows[reference_id]
    values={key:number(row[index]) for key,index in columns.items()}
    foods.append({'id':food_id,'name':name,'state':state,'referenceId':reference_id,**values,'price':price,'prep':prep,'source':SOURCE})
    raw.append({'referenceId':reference_id,'officialName':row[3],'rawSourceValues':{key:row[index] for key,index in columns.items()},'source':SOURCE})
assert len(foods)==30 and len({f['id'] for f in foods})==30
assert all(all(isinstance(f[key],(float,int)) and math.isfinite(f[key]) for key in columns) for f in foods)

header='''// Nutrition: 日本食品標準成分表（八訂）増補2023年（2026-03-27更新本表）から引用。
// Edible portion 100g. All quantities use the measured cooking state, not raw/cooked interchangeably.
// Tr is rounded to zero for game arithmetic; parenthesized source estimates retain their numeric values.
// Prices and preparation time are fictional game settings, not official or current market data.
export interface Food {
 id:string; name:string; state:string; referenceId:string;
 kcal:number; protein:number; carbs:number; fat:number; fiber:number;
 calcium:number; iron:number; vitaminC:number; sodium:number; water:number;
 price:number; prep:number; source:string;
}
export const FOODS:Food[] = '''
(ROOT/'src/core/foods.ts').write_text(header+json.dumps(foods,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
(ROOT/'docs/research/selected-food-source-values.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'foods':len(foods),'ids':[f['id'] for f in foods],'missing':0},ensure_ascii=False))
