# 参考調査 — 確認できた範囲と採用した考え方

2026-11-22〜23。参考画像は閲覧用の `tmp/references-v5/` にだけ取得し、ゲームやGit配布物へ入れていない。モデル、ロゴ、文章、サイト固有のコードはコピーしていない。

## GTA VI

[Rockstar公式サイト](https://www.rockstargames.com/VI) と [公式スクリーンショット一覧](https://www.rockstargames.com/VI/media/screenshots) を開き、以下の公式画像を実見した。公開プロモーション画像の観察であり、GTA VIを実際に操作して画質を検証したものではない。トレーラーの概要も参照したが、動画の通し再生は未確認。

| 確認した公式画像 | 観察 | BULK LIFEへの適用 |
|---|---|---|
| [Jason Duval 01](https://www.rockstargames.com/VI/_next/static/media/Jason_Duval_01.07m377xeb6jhq.jpg?akim=1&imdensity=1&imwidth=1280) | タンクの縁と脇の余り、肩から上腕の面、手と物の位置関係が読める。 | 布と皮膚を別メッシュで維持し、実際の裾の厚みを調整。接触する手の位置と前腕の連続性を優先。 |
| [Jason Duval 04](https://www.rockstargames.com/VI/_next/static/media/Jason_Duval_04.16d-z2wa2s~bk.jpg?akim=1&imdensity=1&imwidth=1280) | 左右対称の直立ではなく、重心と肘、手の役割で自然さを作っている。服の裾に身体から離れる空間がある。 | 座位の左右で手の位置と指の曲がりを変え、手のひらを太ももへ沿わせる。 |
| [Jason and Lucia 01](https://www.rockstargames.com/VI/_next/static/media/Jason_and_Lucia_01.0naeahss9-1x6.jpg?akim=1&imdensity=1&imwidth=1280) | 顔の大きな面、髪の輪郭、肌と布の反射の違い、背景と人物の光の分離が重要。 | 顔の面と髪の外形を微調整。中立照明の比較を保ち、強い光沢やぼかしでモデルの弱点を隠さない。 |

これは画像からの観察と制作上の判断である。GTA VIの非公開モデル、ポリゴン数、骨格、スキンシェーダー、衣服シミュレーション、照明方式、制作ソースを確認したとは主張しない。コンソール向けの画をそのままスマホWebGLの負荷設定へ移すこともしない。

## 人体、ウェア、器具の補助資料

- [Anatomy for Sculptors・肩の骨の目印](https://anatomy4sculptors.com/blog/shoulder-bony-landmarks/) の説明と図を確認。肩先・鎖骨・三角筋と胸の連続を造形の目印にした。骨だけの変形でつぶれる箇所には、ポーズに対応する補正形状を別に用意する方針。
- [Nikeの男性用トレーニングタンク](https://www.nike.com/ph/t/dri-fit-legend-training-tank-JhQbSn) の前回取得済み公式商品画像を再確認し、[N.A.C.の公開商品ページ](https://www.nike.com/t/nac-mens-dri-fit-training-tank-YReeXjia/IM3621-010) も参照。丸い襟、袖ぐり、裾のゆとりを見るための資料で、ロゴや柄は使っていない。
- [Blender StudioのPose Shape Keys公開説明](https://studio.blender.org/tools/addons/pose_shape_keys) は検索で公開されている要旨を確認。詳細ページの取得は402となったため、教材全体を読んだり、同アドオンを使ったとは報告しない。今回の補正は既存骨格の変形後の連続表面を平滑化し、逆スキニングで独自に作成した。
- ジムのベンチとダンベルは、前回確認した [Rogueのベンチ](https://www.roguefitness.com/rogue-flat-utility-bench-2-0) と [ダンベル](https://www.roguefitness.com/rogue-dumbbells) を寸法・支持構造の参考として継続使用。今回の主なジム変更は、通常のジムと架空大会用の小さなステージを分けること。

## リアルタイム人物の技術資料を追加確認

[EpicのMetaHumanプラットフォーム資料](https://dev.epicgames.com/documentation/en-us/metahuman/platform-support-and-lod-specifications-for-metahumans) では、対象端末によって髪・形状・テクスチャの品質を分ける設計を確認した。[MetaHuman Componentの説明](https://dev.epicgames.com/documentation/metahuman/the-metahuman-component-for-unreal-engine) では、身体・首の補正と負荷の関係を確認した。ここからの判断は、スマホでは近接時に読み取れる輪郭と必要な姿勢補正を優先し、据え置き機向けの最大設定をそのまま移さないこと。BULK LIFEの既存の画質調整と肩の補正を評価する補助資料であり、MetaHumanアセット・UE・そのコードを導入したわけではない。

Blender公式マニュアルのCorrective SmoothとglTFページも取得を試みたが、今回のWeb取得は402で失敗した。本文を確認済みの参考資料には含めない。

## 今プロ

[公開トップ](https://imapuro.com/) をブラウザで表示した。主な実行操作、補助操作、公開ページへの導線をまとめる考え方を参考にした。トップの公開HTML、CSS、配信JavaScriptを取得し、登録不要の公開ページ・体験ページへのルートと公開コンポーネントを調査した。非公開の元ソースや会員データを取得したわけではない。

公開CSSでは、体験用のヘッダーはsticky・最小48px、下部ナビは画面下部に固定、ナビの最大幅は960px、幅や画面向きによる複数の切り替えがあることを確認した。これらはCSSの定義値であり、現在のスマホ画面で取得した計算済みスタイル値ではない。

採用したのは「現在地を短く示す」「主な実行を一つに絞る」「一覧から必要な詳細へ進む」という構成。BULK LIFEでは深緑・白・ライム、文字付き4項目のナビ、人物の下に今日の作戦と実行を置く独自の配置とした。細い3列の行動カードはやめ、スマホでは1列の読みやすい設定へ変更した。長い不足説明は固定領域へ置かない。

11月23日にChromeのレスポンシブ表示430×802/801 CSS pxでトップと登録不要の `/trial`、`/trial?step=game&debut=1` を実際に開いた。体験開始の5段階案内から試合の再生、終了表示まで観察。固定された現在地ヘッダー、案内の直下の主要ボタン、スコアと実況の詳細、折り畳みの履歴を確認した。これは体験版であり、登録後の本編・全5段階を検証したものではない。

DevToolsのElementsで実DOMの `html[lang=ja] > body > div#root` と、bodyに適用される公開CSSを確認した。幅520px以下の `overflow-x:hidden`、`min-width:320px`、背景のcover/fixed指定が表示された。さらに現在配信されるHTML（4961 bytes）、`index-Ck8VGhxT.css`、`index-Dt7eU28Y.js`、体験用の `TrialEntry-BEk8wyfR.js`（20689 bytes）と `TrialPlay-BssDfF8W.js`（8774 bytes）を公開URLから取得した。`trial-shared-header` のsticky、最小48px、padding 8px 16px、体験完了カードの最大520px・角丸4px、操作の最小48pxなどを確認。これらの数値は公開CSSの宣言値で、Computedタブで各要素の全計算値を測定したとはしない。会員専用ソース、非公開コードやデータは取得していない。
