# 3D資産と再出力

- 制作元：assets/blender/bulk-life-athlete-v1.blend、専用シーン BULK_LIFE_Studio_v1。
- 初期Blenderシーンは before_bulk_life.blend に保存。衣装修正前は bulk-life-before-fitted-shorts.blend に保存。これらの作業前バックアップはローカルに保持し、Gitには含めない。
- Web：public/assets/athlete-v1.glb。人体16部位 + bodyFat + pump の18モーフ、17ボーン、下記16クリップ。肌・顔・髪・衣装は独自制作、外部素材なし。
- 領域表：regions-v1.json。部位名は src/core/model.ts のPARTSと一致。一覧とGLB面の直接クリックの両方から部位を選択できる。
- 衣装表：shorts-fit-v1.json。腰と両太ももの人体面（z=0.765〜1.022m）を12mm外側へ配置し、全18モーフと骨ウェイトを共有。元の衣装はBL_PreviousClothesコレクションに非表示で保持。
- 昔の球状衣装はGLBに含めない。Webの読込URLのrevisionでキャッシュを切り替える。身体/写像の名前と既存保存互換性を維持。

再出力：既存ファイルを開いてBlender内で assets/blender/export_career_assets.py を実行すると、人体・全舞台・ジム・器具を更新する。衣装を作り直す場合は fit_shorts.py、refine_skinning.py、export_career_assets.py の順。新規の作り直しは create_athlete.py（専用シーンがある場合は安全のため中止）、fit_shorts.py、add_career_assets.py、refine_skinning.py、export_career_assets.py の順。add_career_assets.py は著作シーンの二重作成を防ぐため再実行時に停止する。

Webのカメラ最大距離は5m、背景壁は6.5m。背面でもカメラと身体の間に壁が入らない。背面照明を別途配置する。確認はnpm testのasset.test.tsと実画面の両方を使う。

制約：人体は様式化モデル。規定ポーズの動作骨格を用意したが、精密な顔・手指・肩/腋窩の解剖学、左右差や極端な体形の仕上げは未完了。通常状態と変形の合成を検査した範囲は下記に記録する。

## キャリア資産 v1（2026-11-19）

人体の骨格・部位名・モーフ名・元頂点数を保持したまま16クリップを追加。クリップはすべて骨のlocation/rotationのみを含み、発達モーフの値を上書きしない。選択はgltf.animations[0]ではなく名前で行う。

| クリップ | 用途 |
|---|---|
| Breathing / Idle | 呼吸・待機、約2秒のループ |
| FrontDoubleBiceps | フロント・ダブルバイセップス |
| FrontLatSpread | フロント・ラットスプレッド |
| SideChest | サイドチェスト |
| BackDoubleBiceps | バック・ダブルバイセップス |
| BackLatSpread | バック・ラットスプレッド |
| SideTriceps | サイドトライセップス |
| AbdominalsThigh | アブドミナル・アンド・サイ |
| MostMuscular | 追加のモストマスキュラー（全ルート共通の必須ポーズとは扱わない） |
| TrainingPress | 立位ダンベル・オーバーヘッドプレス。ベンチプレスへ流用しない |
| TrainingRow | 前傾したダンベルロウ。ラットプルダウンへ流用しない |
| TrainingSquat | 自重スクワット、腕を前へ出してバランスを取る |
| StageEntry | その場歩き。Web側で登壇位置の移動を別に行う |
| ResultCelebrate / ResultReflect | 結果の喜び・振り返り |

全舞台は当プロジェクト独自の形状・配色・文字であり、実在会場の再現や公式提携を意味しない。8大会の見た目を別GLBにし、人体/アニメーションは含めない。床の上面は原点、選手の立ち位置は[0,0,0]、glTF正面は+Z。

- stage-tokyo-v1.glb
- stage-japan-class-v1.glb
- stage-japan-men-v1.glb
- stage-ifbb-world-v1.glb
- stage-mid-japan-v1.glb
- stage-amateur-olympia-v1.glb
- stage-new-york-pro-v1.glb
- stage-olympia-v1.glb
- gym-v1.glb（ラック、ベンチ、バーベル、ケーブル設備、ダンベル棚）
- dumbbell-v1.glb（手持ち用。handL/handRボーンへcloneし、local [0,.04,0]で把持位置に合わせる。プレス/ロウ時のみ表示）

対応表：public/assets/career-assets-v1.json。舞台は約235〜321KB、ジム約208KB、手持ちダンベル約13KB、人体約4.91MB。バイナリサイズは再出力で多少変わる。

## キャリア資産の検証

- scripts/verify-career-assets.mjs をNode.jsで実行。Three.jsの実GLTFLoader・AnimationMixer・SkinnedMeshで、16クリップ×6身長×3モーフ状態×5時点＝1440フレームを検証。有限な寸法、身体が縦向き、接地（許容8cm以内）、衣装と骨格の保持、モーフ上書きなしを確認。
- 10環境GLBは各1シーン・人体スキン混入なし・アニメ混入なしを確認。
- 機械検証記録：docs/qa/career-assets-report.json。これはブラウザーの描画性能測定を代替しない。
- Blender画像QA：docs/qa/pose-*.png（8ポーズと押す/引く/脚の頂点）、stage-olympia.png。
- QA中に見つけた旧肩ウェイトの過剰な引き伸ばし、ローカル座標の誤用によるスクワットの浮き・側面/背面ポーズの横倒し、別シーンの選択状態がGLBへ混入する問題を修正した。
- 手指は独立した骨を持たないため握りは簡略化。肩と腋窩には元の連続メッシュによる伸びが残り、人体の精密な最終美術としては追加のリトポロジーと指リグが必要。競技の内部評価は形状の見栄えではなく保存した身体データに基づかせる。

## 人体 v2（2026-11-19）

新規人体は `assets/blender/bulk-life-athlete-v2.blend` / `public/assets/athlete-v2.glb` / `regions-v2.json`。v1 のファイルと対応表は保存したまま、別バージョンとして利用する。旧作の球体の集合に近い人体から、胸郭・骨盤・顔・耳・独立した指と足趾を持つ連続トポロジーへ変更した。50ボーン（旧17名＋首・鎖骨・指）に拡張し、既存18モーフ・16クリップ名を維持する。

v2 は公式 MakeHuman の CC0 グラフィック資産を基礎としている。アプリケーションの AGPL ソースコードは使用していない。固定commit・取得URL・SHA256・元ライセンスは `assets/sources/makehuman/` に保持。筋形、ゲーム部位マッピング、衣装、アニメーション、肌の頂点色と微細法線/粗さテクスチャは添付スクリプトで制作した。外部素材なしという上記 v1 の記述は v1 に適用する。

再生成順序、読み込み名、座標、負荷、QA画像と制約は [athlete-v2.md](athlete-v2.md) を参照。v2既存blendからの再出力は `export_athlete_v2.py`、独立検証は `node scripts/verify-athlete-v2.mjs`。人体の規定身長は1.77m、glTF正面は+Z。待機表示にはAポーズのbind姿勢ではなく `Idle` / `Breathing` を使用する。
