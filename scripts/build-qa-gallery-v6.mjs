import fs from 'node:fs';
const dir='docs/qa/decisions-v6';
const pairs=[
 ['全身・正面','body-front'],['全身・側面','body-side'],['全身・背面','body-back'],
 ['単色・正面','clay-front'],['単色・側面','clay-side'],['単色・背面','clay-back'],
 ['顔・正面','face-front'],['顔・斜め','face-angle'],['顔・横顔','face-side'],
 ['座位・正面','seat'],['手と太ももの接触','hands'],
 ['高筋量・大会正面','high-front'],['高筋量・大会背面','high-back'],['高筋量・単色大会ポーズ','clay-high-pose'],
 ['ウェア・立位','wear-stand'],['ウェア・腕上げ','wear-raised']
];
const cases=[['細身','slim'],['標準','standard'],['筋肉質','muscular'],['中間','middle'],['筋肉と脂肪が多い','muscular-fat'],['胸＋肩','combo-chest-shoulders'],['肩＋腕','combo-shoulders-arms'],['背中＋肩','combo-back-shoulders'],['脚＋臀部','combo-legs-glutes'],['髪・背面','hair-back'],['座位・側面','seat-side'],['ウェア・高脂肪座位','wear-high-fat-seat'],['ウェア・高脂肪腕上げ','wear-high-fat-raised']];
const screens=[
 ['タイトル','browser-title-final'],['PC決断ホーム','browser-decision-home-pc'],['スマホ相当・新規世界挑戦','browser-world-new-mobile'],
 ['不足する食事案','browser-mobile-budget-warning'],['予算を変えた食事案','browser-mobile-budget-improved'],
 ['期間結果','browser-first-result'],['大会の登場','browser-mobile-stage-auto'],['大会の結果','browser-mobile-stage-auto-result'],
 ['最終世界ステージ','browser-direct-world-final-stage'],['世界優勝','browser-direct-world-final-ranking'],['未優勝の世界終了','browser-world-ending'],['世界終了・初日と最後','browser-direct-world-final-ending'],
 ['処理途中・7/28日','browser-period-in-flight'],['再読み込み後の再開','browser-period-resumed'],
 ['PC標準画質の計測','browser-performance-body-final'],['軽量画質の計測','browser-performance-low'],['2体比較の計測','browser-performance-two-models'],['モデル読込失敗','browser-model-failure']
];
const figure=(file,label)=>{if(!fs.existsSync(`${dir}/${file}.png`))throw Error(file);return `<figure><a href="${file}.png"><img loading="lazy" src="${file}.png" alt="${label}"></a><figcaption>${label}</figcaption></figure>`;};
const html=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BULK LIFE 0.7 — 比較画像</title>
<style>:root{font-family:system-ui,sans-serif;color:#173b2c;background:#f1f5ef;line-height:1.7}body{max-width:1280px;margin:auto;padding:24px}h1{font-size:28px}h2{margin-top:48px}h3{margin:0 0 16px}a{color:#205c43}p{max-width:900px}.pair,.grid{display:grid;gap:16px;grid-template-columns:repeat(2,minmax(0,1fr))}article{background:white;padding:20px;margin:24px 0}figure{margin:0;min-width:0}img{width:100%;height:auto;display:block;background:#737776}figcaption{padding:8px 0;font-size:14px}nav{display:flex;gap:24px;flex-wrap:wrap}.notice{border-left:5px solid #b8c965;padding:12px 18px;background:#fff}.screens img{max-height:760px;object-fit:contain;background:#e3e9df}@media(max-width:600px){body{padding:16px}article{padding:12px}.grid{grid-template-columns:1fr}.pair{gap:8px}.pair figcaption{font-size:12px}}</style>
<h1>BULK LIFE 0.7 — 人物比較とプレイ画面</h1><p>2026-11-23。画像を押すと原寸で開きます。<a href="report.md">実装・検証・未完了項目の報告</a></p>
<nav><a href="#pairs">同条件の前後</a><a href="#cases">体型と組合せ</a><a href="#screens">実際のゲーム</a></nav>
<p class="notice">前後の造形比較は、v5と最終v6を同じカメラ・画角・姿勢フレーム・照明・背景・描画品質でBlender描画しました。ゲーム画面は別の証拠です。顔の変化は小さく、髪・高筋量の肩と脇・布の縁は要求された写実品質に未達です。照明や画角だけの差を造形の改善として扱いません。</p>
<h2 id="pairs">修正前／修正後</h2>${pairs.map(([title,key])=>`<article><h3>${title}</h3><div class="pair">${figure(`before-${key}`,'修正前 v5')}${figure(`after-${key}`,'修正後 v6')}</div></article>`).join('')}
<h2 id="cases">同じ人物の体型・部位・衣装の組合せ</h2><p>最終v6の確認ケース。体型の値とポーズを変えた画像であり、実際のプレイでこの順に成長した記録ではありません。</p><div class="grid">${cases.map(([title,key])=>figure(`after-${key}`,title)).join('')}</div>
<h2 id="screens">実ブラウザで確認した画面</h2><p>Windows ChromeのPC表示とレスポンシブ表示。物理スマホで撮影した画像ではありません。デスクトップのFPSをスマホの性能として扱いません。2体比較は必要時描画のため表示fpsが低く、性能限界の値ではありません。</p><div class="grid screens">${screens.map(([title,key])=>figure(key,title)).join('')}</div>
<p><a href="report.md">報告書へ戻る</a></p></html>`;
fs.writeFileSync(`${dir}/gallery.html`,html,'utf8');
console.log(`Gallery: ${pairs.length} pairs, ${cases.length} cases, ${screens.length} browser captures; all files found.`);
