"""Readable original-reference versus actual-GLB evidence. No photo alterations."""
import csv,json,html
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/qa/anatomy-v8'
rows=list(csv.DictReader((OUT/'reference/02_IMAGE_INDEX.csv').open(encoding='utf-8-sig',newline='')))
records=[]
def img(path,label):
 return f'<figure><div class="image"><img src="{html.escape(path)}" alt="{html.escape(label)}" width="640" height="900" loading="lazy"></div><figcaption>{html.escape(label)}</figcaption></figure>'
for r in rows:
 route=r['pattern'];stage=int(r['stage']);view=r['view'];actual=f'{route}-{stage}-{view}.png'
 records.append(f'<article data-route="{route}" data-view="{view}"><h2>{route}{stage}・{dict(FRONT="正面",SIDE="側面",BACK="背面")[view]}</h2><div class="pair">'+img('reference/'+r['target'],'左：支給された参照画像（原本）')+img(actual,'右：実際のゲーム用GLBを再読み込みした3D')+'</div></article>')
before=[]
for stage in [1,3,5]:
 for view in ['FRONT','SIDE','BACK']:
  before.append(f'<article data-route="comparison" data-view="{view}"><h2>A{stage}・{view}・単色造形比較</h2><div class="pair">'+img(f'before-A{stage}-{view}-clay.png','左：修正前v7制作データ（Blender）')+img(f'after-A{stage}-{view}-clay.png','右：修正後v8制作データ（Blender）')+'</div></article>')
for name in ['face-FRONT','face-THREEQUARTER','face-SIDE','hair-BACK','standard-SEATED-FRONT','standard-SEATED-SIDE','standard-HAND','high-fat-SEATED-THREEQUARTER','high-fat-HAND','high-POSE-SKIN','high-WEAR-RAISED','WEAR-STAND']:
 before.append(f'<article data-route="comparison" data-view="DETAIL"><h2>{html.escape(name)}</h2><div class="pair">'+img('before-'+name+'.png','左：修正前v7制作データ（Blender）')+img('after-'+name+'.png','右：修正後v8制作データ（Blender）')+'</div></article>')
for view in ['FRONT','THREEQUARTER','SIDE','HAIR-BACK']:
 before.append(f'<article data-route="comparison" data-view="DETAIL"><h2>実配信GLB・顔と髪・{view}</h2><div class="pair">'+img('before-export-face-'+view+'.png','左：実際のv7 GLBを再読み込み')+img('exported-face-'+view+'.png','右：実際のv8 GLBを再読み込み')+'</div></article>')
for name,label in [('context-title-3d','座位と実際のジム資産'),('context-home-3d','通常立位と実際のジム資産'),('context-two-actors-3d','二人を同時に置いた身体比較')]:
 before.append(f'<article data-route="comparison" data-view="CONTEXT"><h2>{label}</h2>'+img(name+'.png','実配信GLBを組んだBlenderの場面確認。ブラウザのUIスクリーンショットではありません。')+'</article>')
page='''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BULK LIFE 人体v8・参照と制作比較</title><style>
*{box-sizing:border-box}body{margin:0;background:#edf1ed;color:#193d32;font:16px/1.65 system-ui,sans-serif}header,main{max-width:1180px;margin:auto;padding:20px}header{background:white}h1{font-size:24px}h2{font-size:18px;margin:0 0 10px}button,a{min-height:44px;padding:10px;display:inline-block}button{background:white;border:1px solid #678477;border-radius:7px;color:inherit;font:inherit;margin:3px}button[aria-pressed=true]{background:#193d32;color:white}article{background:white;padding:16px;margin:18px 0;border-radius:10px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}.image{aspect-ratio:640/900;background:#dee3df;display:flex;align-items:center;justify-content:center}img{width:100%;height:100%;object-fit:contain}figcaption{padding:8px;font-weight:600}nav{display:flex;flex-wrap:wrap}article[hidden]{display:none}@media(max-width:540px){header,main{padding:12px}.pair{gap:6px}article{padding:10px}figcaption{font-size:12px;padding:5px}h1{font-size:21px}}
</style><header><h1>BULK LIFE 人体v8・参照と制作比較</h1><p>左は支給画像の原本、右はゲームへ書き出した実際の3DアセットをBlenderで再読込して撮影したものです。ブラウザ画面のスクリーンショットとは区別しています。</p><p>A〜Cは固定した骨格、DはAと同じ骨格で筋量・脂肪を独立して変える経路です。段階は外見の制作基準です。写真から体脂肪率や成長期間を測定したものではありません。</p><p>修正前後の造形比較は同じカメラ・画角・照明・露出です。参照写真との比較は人物の全体像をそろえていますが、元写真のカメラや実寸を測定できているわけではありません。</p><a href="/">ゲーム</a><a href="/?portrait-lab=1&portrait-still=1&render-stats=1">実際のゲーム描画で回転・体型・ポーズを調べる</a><nav aria-label="表示する体型">'''
for route,label in [('all','すべて'),('A','A・標準'),('B','B・長身'),('C','C・がっしり'),('D','D・脂肪変化'),('comparison','修正前後')]:page+=f'<button data-filter="{route}" aria-pressed="{str(route=="A").lower()}">{label}</button>'
page+='</nav></header><main>'+''.join(records+before)+'''</main><script>function show(route){document.querySelectorAll('article').forEach(a=>a.hidden=route!=='all'&&a.dataset.route!==route);document.querySelectorAll('button[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===route)));}document.querySelectorAll('button[data-filter]').forEach(b=>b.onclick=()=>show(b.dataset.filter));show('A');</script></html>'''
(OUT/'index.html').write_text(page,encoding='utf8')
print(f'Gallery: {len(rows)} original-reference/3D pairs + {len(before)} matched comparisons')
