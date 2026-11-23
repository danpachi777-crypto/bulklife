# 最新チェックポイント（未完了・未プッシュ）

> 作業途中の履歴。現在の結果は [report.md](report.md) を優先する。

2026-11-23。CHECKPOINT-2.mdより本書を優先。

- UIのP6大地 seed1326575383、国内20→世界追加20を40回まで完走。国内4位、世界最終9人中4位86.18点、直上藤代と1.50点差。初日74kg/筋29.84→92.3kg/筋44.30（+14.46kg）、資金4,648,691円。world-ending画像保存。国内20は52.153分、追加20は80.665分。コード修正・モデルQA・ツール待機を含み通常プレイ時間ではない。
- 新規直接world40のUIプレイを別抽選「蓮」で開始。初期89kg/体脂肪27%/250000円。6種類抽選は維持。**現在20回後の国内エンディングを保存済み、次21**。初大会5人中2位、地域7人中1位、地方9人中3位、日本16回・20回で優勝。国内終了筋41kg台、85.8kg、資金3,331,294円。初日/国内最後の2体比較・エンディング実見。世界40後半はまだ。
- 蓮の最初の20まで実測46.9037分。修正・処理中リロードのQA・ツール待機込み。目安20〜30/40〜60の通常人間のプレイ時間を達成と報告しない。
- 蓮は1〜8スマホ393幅。9でhome設備（2万円一度）案を選び、目的build、予算1600、posing45へUI変更。quick1200では1997/2525kcal/P96%不足→1600で2700/2700/P100%/費用1571、収支低下を確認して採用。10基本案へbuildが保持された。12大会案でcutへ変える警告を確認して採用。15以降の大会準備balanceで現在安定。
- 途中処理のリロード：DEV専用 `?qa-slow-period=1` でバッチ待機5000ms、最初の期間7/28日で実リロード、続きから14/28日へ再開したSS保存。検証後クエリを外し通常速度へ。待機は本番ビルドでは無効。二重再計算なし、決断1のまま。
- Chrome native window2296460、**現在最大化1536×976**。Cua変数challengeApp/cs/v6fs/v6dir維持。devtools window3149052は閉じた。QA origin127.0.0.2でユーザーセーブを触らない。Cuaは再開時rewriteDocumentation、AX常にunavailable。
- PC UI：結果End→次は[350,814]。計画Endで候補3列、詳細1[740,757]、2[1040,757]、3[1320,757]。右サイドパネルの確認/実行は**[1420,921]**（768は説明の場所で押せない）。最終結果後はEnd。4候補になる21/25/29/33/37は配置をSSで見直す。現在国内endingは上部、Endで世界21へのボタンを探す。
- モバイルエミュレーション393×801：結果End次[300,764]、候補End末尾詳細[380,757]、その前[380,409]、基本はEndからup350で詳細[380,373]付近（内容で違うのでSS必須）。確認/実行[380,917]。パネルはEndキーが閉じるボタンへ焦点するとスクロールしない。scroll[550,780]down720で詳細ボタン類、基本調整[280,705]。
- 360/393でタイトル、新規、結果、予算編集、身体ページ、顔カメラ、各nav操作。430はタイトルのみ今回実見（前回QA別）。360身体確認ボタン50%幅問題を修正、hero数値nowrap、touch操作を固定UIから分離。PC3案のボタン下端を揃え、右パネル主ボタンnowrap。物理iPhone/Android実機なし。
- 結果追加：期間最初/最後のactual exercisesを2件だけoptional保存・詳細表示（旧新モードデータもoptional互換）。検証のnumber-only条件が弾いたのを修正。期間不足はenergy/P/actualの表現へ、priority日本語、全negative時の「増えた」修正、次の助言は状態/大会/節目別。Compareにlabelprops、ending初日/最後、直上rivalの身体2体比較ボタン追加。
- 大会：2.6秒入場→3.8秒正面→3.8秒背面→結果の短い自動演出、停止/再生/skip、reduced-motion初期停止。地域8/日本16で実際に自動で背面・順位へ進むことを確認。普段のジムとは別会場、世界は紺/金、国内グレー。**修正キュー**：winnerでaboveがない場合も「最低点と直上相手の差が違う」と出る条件があるので `above && impact.key!==weak.key` にする。期間の次助言が演出を見る前に順位を言い、ネタバレするので「舞台の評価から…」にする（まだ未修正）。
- goal修正：基本候補のgoalを `g.goal` にした。以前は毎回forced ask解決し、手動目的を次候補で変える余地があった。askを保持すると現体脂肪に基づく理由を既存UIで出せる。手動目的は基本案へ保持。変更する候補は確定前に元→新目的の警告。job内は解決済みgoal固定、途中で目的変更なし。テストに初期askとmanualbuild次候補保持を追加（最後追加分は最終再テスト要）。
- inspectStrategy.minutesはセット数を返していたのをsessionMinutesへ修正。rematchは相手との部位質量比から重点決定、posing差は相手/自分どちらが上か自然な説明へ。

## 3D 最終ファイルと実施

- 公式WindowsApps alias **`blender-launcher.exe`** を使う（Get-CommandでLocalAppData alias）。package内のフルパスlauncherは即exit0で何もしなかった。source元は保護v5、作業用v6のみ保存。ライブBlender MCPは過去timeout、連携したと主張しない。
- final work `assets/blender/bulk-life-athlete-v6-work.blend`。現在GLB **7,061,680bytes sha256 8e81d79dd2aa5059c6403ad4c071962b4ef4d8fd1e73a13ab44d28d750278401**。portraitAsset.ts同期済み。243ケース+37StandUp検証成功、48026triangles/50bones/18physicalmorphs。Pose肩+左右肘も存在。
- authoring順：v5複製→refine_decision_v6.py（16領域partition endpoint/顔mm修正/374thoraxweights/肩corrective/服転写/髪）→finish_surface_v6.py（独立albedo脚色校正、1回のみ）→**tailor_roundneck_v6.py**（真のcollarclip、丸首/楕円armhole、1.5mm304rimvertices、1857tankverts、allbones/morphs、183pose境界修正）→pose_elbows_v6.py（各244verts、最大10.36mm、角度driver）→finish_shoulders_v6.py（594verts posed surface relaxation、肩corrective全体20mmcap）→export_portrait_v6.py→npm assets:portrait。
- `tmp/v6-before-garment.blend` はfinalbody/hair/skinで服加工前、`tmp/v6-before-shoulder-finish.blend` は丸首/肘後で肩relax前。元v2〜v5は未変更。非冪等scriptを最終blendへ再適用しない。
- 肩仕上げ最初総変位が20mm検証を超えた。backupから再生成しcombineddelta20mmcap、検証成功。レポートshoulder-surface-correction.json。
- 最終qa_decision_v6.py全after画像再描画 **session83145終了済**。before/after同cam/light。basebody変化は小さい、顔もmm単位で大差と偽らない。高筋量morph重複を抑え、服は目で見て丸首になり襟フラップ除去、肩ridge平滑化は実変形。before/after clay高筋量も実見。依然顔近接の眉/髪、極端高筋量の筋の大きな面は写実完成基準に課題。ファイル追加数を品質の証明にしない。
- Browser髪が硬い輪郭の一因：runtime alphaTest=.4がfeathered毛先を捨てていた。**.18へ変更**、まだ同条件beforefaceとのafterUI比較は未取得。仕上げ済み旧after画像にこのruntime変更は含まれないので分けて説明。
- 接地：barebody実測全clip minY約-.00360m、shoes-.01515m。runtimewear別rootY補正既存。**ContactShadeがy=-.022でstage床0の下に隠れていた**→y=.002へ変更、mobile地域8/PC日本16の足元に影が見えることを確認。モデル形状改善とこの陰影変更を区別。
- `ModalSheet` body閉じるlabelを「今日へ戻る」→「確認を閉じる」へ修正。

## 自動検証の最新

- check成功。全113testsは112/113となった時点（samples配列の旧validator）あり、その後修正しchallenge6件再成功。最後manualgoal保持assert追加後の全test最終実行が必要。
- 最新6profile×40audit **session97641終了pass**。40direct対20+20全同一 **session45548終了pass**、domesticUnchanged true。15runs方針audit **session27542がまだ実行中**（P5 workまで出力、残no-stage後）。それ以外sessions91759（6tests成功）終了。
- 世界優勝可能な合法調整audit-world-title.ts は前バージョンで成功、目的保持修正後再実行推奨（purpose固定p指定のため同じ見込み）。

## 次に残る仕事

1. 蓮のworld直接40：endingEnd→21、21〜40と最終ending通し。1〜20は46.9037分QA込み、通常時間ではない。P6日本20+追加20完走は済。
2. 結果文2件の修正（winner比較文、順位ネタバレ）＋final typecheck/tests/audits/build/PWA/sourcehash。
3. レンダープローブ実測（query render-stats=1）、low/high/2models/画面外/遷移メモリ。3Dfail-model意図的失敗のUI、rotation/zoom/reset/picking、360/430の計画/結果最終、顔after透過差SS、セーブ最新書出/再読み込み。
4. README/packageまだ0.6→0.7、docs最終report/gallery（pairs/screenshotsのリンク）、14項目報告と具体的remainingconstraints。PWAはLAN HTTPではinstall/SW不可、localhost/HTTPSproductionsecurecontextのみ、外出公開未確認、cloud共有なし。LANは192.168.2.197:5178/、Vite42996既存。
5. CUA最後観測の次CUA呼び出しでcompletion_summaryのみ、まだ一度も送っていない。
6. git差分確認→commit→GitHubpush。ユーザー明示承認あり、再確認不要。HEAD33ce450、backup branchあり、すべて現変更未コミット。新規subagent禁止。
