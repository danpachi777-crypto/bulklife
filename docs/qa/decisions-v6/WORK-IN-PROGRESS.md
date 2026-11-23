# 作業中：決断モードとv6人物（未完了・未プッシュ）

> 途中の引継ぎ記録。最新の実装・検証範囲は [report.md](report.md) を参照。

2026-11-23。ユーザーは20/40回モードと人物の大幅改修を依頼し、完成後のGitHubプッシュを明示承認。4回の試作だけで終了しない、写実未達の報告だけで人物を打ち切らない。現在のHEADは33ce450、復元branch backup/pre-decision-modes-20261123。作業開始時clean。今は全変更未コミット。

## 実装済み・検証途中

- docs/decision-modes.mdに設計。新AppはChallengeApp、従来ExperienceAppはタイトル→過去のキャリア→従来として残す。DBもbulk-life-challenges-v1と旧bulk-life-v1を分離。旧データへ未操作。
- core/challengeTypes.ts / challenge.ts / challengeStorage.ts。20/40の固定期間は28,42,56,70,56,70,70,84,84,84,84,84,70,84,84,98,56,70,70,84日、後半も同じ期間（合計1428/2856日）。confirmだけ回数消費、periodJobを保存し7日ごとのCASトランザクションで実行。reloadは保存した続き。入力・結果・大会・身体閲覧は無料。
- 実際のsimulateDayへ全日を渡す。追加の任意context.contestHoursは新大会当日の仕事・練習を止めるためだけで、旧キャリアの呼出しは不変。コーチの具体的種目、疲労時休養、日ごと食品量調整を合意範囲で行う。勤務・設備・大会等は作戦確定時だけ。手動の練習/食品も同じ計算。食品手動はownershipをmanualへ切替。
- 架空BULKサーキット：ジム/地域/地方/日本グランプリ/世界ファイナル。実在資格とは区別。出場条件は参加・順位の複数経路、世界は決断21以降＋国内3位。20回の国内endingはsnapshot固定、追加20回でも変更しない。引退を強制しない。12名固定名のCPUも同じsimulateDayで毎日成長（プレイヤーへの追従強さ補正なし）。CPUの参加費/大会前準備/既成資格の扱いは追加整合確認の余地あり。
- UI: Openingのmenu override、ChallengeApp（モード/作成/ホーム/作戦比較・調整・最終確認/実行/結果/身体/大会/記録/アーカイブ/JSON）とChallengeResults（期間結果、ステージ、審査、ending、グラフ）。新ホームは日次UIと分離。各候補を開いた最初は要約、基本フォームは「目的・生活条件を調整」から開くよう修正したばかり。
- PortalのModalSheetが新画面もinertにする。実行中にタイトルへ移っても保存済みCAS結果を同じrunへ反映するよう修正。エラー時のループ停止＋保存済み再読込。

## 計算検証

- 新tests/challenge.test.tsの4件（初4回から大会、保存途中/再開/CAS/移行、同seed国内前半の同一性4回、preview純粋性）通過。npm run check成功。
- scripts/audit-challenges.tsで全6初期パターンを20→追加20まで完走、40決断/2856日、validate毎決断。最新long-run-audit.jsonに結果。P2は国内優勝→世界優勝、P5国内優勝→世界2位、他は未優勝。体脂肪は約16〜17%、有限な筋量/資金。これは自動計算で、実プレイ時間や面白さではない。
- 最初の監査で「減量目的が次候補へ引き継がれ続ける」不具合を修正。候補の新目的はaskから現在の身体で生成、確定した期間内は目的固定。旧不良結果はtmp/long-run-before-corrections.jsonへ保存済み。
- まだ必要：最終全テスト/ビルド、世界40回新規直行の通し・20+20との全40同条件比較、未出場/上位資格未達、複数作戦の差・最大金額/練習量が常に最良でないか、保存失敗・不正JSON追加検証。
- validateChallengeを強化したばかり。body、履歴、job、ending、rivals、strategyの検証。最終追加後check/testは未実行。どの検証も実機や見た目の合格証明とはしない。

## 人物v6

- Blender MCP get_addon_statusは300秒timeout。元の応答停止Blenderを終了せず、インストール済みの `blender-launcher.exe --background <blend> --python <script>` を使用。WindowsApps内blender.exe直実行はアクセス拒否だが、公式launcher aliasで動く。
- v5をコピーしたassets/blender/bulk-life-athlete-v6-work.blendだけ編集。旧v2〜v5は保存していない。v5baseline画像はdocs/qa/decisions-v6/before-*.png。
- inspect_decision_v6.py：元のメッシュ/骨/形状の最大変位inventoryと、同条件の単色front/side/back/highpose、顔front/angle/side、座位/手をrender。灰素材は.16/.18/.20（初期.4は白すぎたため前後を同条件で再render済み）。
- refine_decision_v6.py：広域target+部位targetの重なりを取り除くため、MakeHumanのCC0 full-muscle endpointを16筋群へ正規化して分配し、fan/spindleの少量の造形を加える方式へ置換。374頂点のmedial thorax arm weightを胸側へ戻し、腕上げの腋窩を16mm程度持ち上げるpose-space correction（inverse LBS、20mm上限）。衣装3種へ同一表面/4骨weightをbarycentric転写、タンクとショーツのease追加。顔の眼窩/頬/顎/鎖骨を実メッシュで調整。
- 最初の新髪はopaque scalp+540clumpsで帽子/針状に悪化し、不採用。tmp/v6-first-iteration.blendに退避。最終はrefine_hair_v6.pyで既存CC0 feathered cardsを保ち、こめかみ/襟足を短く、頭頂の左右差と流れを調整。実ゲームでの最終品質確認はまだ。
- finish_surface_v6.py：上半身と脚のalbedo中央値の不一致をUVマスクから測り、別画像BL_V6_SkinAlbedoへ最大1.16倍の補正。元テクスチャ不変。全身のcolor attributeを同程度へ戻す。surface-calibration.jsonあり。ローカルvariationは維持、筋肉を塗っていない。
- 最終GLB（surface後）：public/assets/athlete-v6.glb **6,912,828 bytes / SHA prefix aa4a8e2b123c**。public/assets/portrait-v6.json。scripts/sync-portrait-asset.mjsをv6へ変更し、src/view/portraitAsset.tsをsync済み。PWAはv5をcache除外に追加。v2互換model idのタイトル/ホーム/詳細/大会/比較が同じURLになる。まだ本番buildはしていない。
- AthleteStudioは以前の固定hair.color上書きを撤去（Blenderのマテリアル差を隠していた）。舞台でpelvis骨に追従する出場番号planeを追加、texture dispose。DOM data-asset-urlを追加。造形単色clay/輪郭silhouette mode＋簡素Studio背景を実装したばかり。**髪カードのmapをclayで外すと不透明板になるため、髪/眉だけ本来のmapを維持する修正が必要**。
- PortraitLabに実URLを表示、5体型＋胸肩/肩腕/背中肩/脚臀部の4組合せを追加。
- scripts/verify-portrait-v6.tsはv5をコピーしてv6 pathへ変更。初回実行は **“shoulder corrective stays bounded to 12mm” assertionで失敗**。v6の設計は20mm上限なので新scriptだけ.02001へ変更して再検査する必要。古いv5検査は保護。ケースは9になり135→243の予定。scripts/verify-build-v6.mjsもコピーを作成、未実行。
- 最終surface後の画像はまだ再renderしていない。qa_decision_v6.pyでafter系列再実行が必要。authoring-changes.jsonのhairVerticesは最後にscriptを修正しただけで、生成済みJSONはまだ8644の古い値なので最終実物から更新する。
- ライブMCP接続/editをしたと報告しない。背景Blender実編集と区別。造形は以前より胸の厚みと腋窩のweight接続が変わったが、高筋量の肩/上腕、手の全体型接触、髪・顔にはなお検証・修正が必要。未達だけで終了しない。

## CUA（区間は現在進行中、completion_summaryはまだ送らない）

- Computer Use skill既読。cua APIも既読、AXは使えず画像＋native入力。
- Chrome window2296460。持続binding `challengeApp`、最新SS `cs`。通常ウィンドウ771×976。第2タブ `http://127.0.0.2:5178/` が新モードQA。ユーザーのlocalhost/LAN保存は進めない。
- 0決断のQA P6大地を作成済み（150000円/74kg/筋29.8）。**このQAはCPUの初期係数調整より前に作ったので初期rivalがやや強い**。新規40回は最新の初期条件で別に作る必要。旧0.6 QA陽介14日は旧DBのまま保護。
- タイトル→日本20→抽選紹介→新ホーム→作戦比較→最初の作戦詳細まで実操作した。まだ一回も確定していない。前回の最後は長い基本フォームが最初から出る問題を発見し、optional編集へ修正したところ。HMRでタイトルへ戻っている可能性がある。新規create/planの画面は見たが、通しプレイは未着手。
- ホームで3Dが縦を使いすぎたため、27svh viewport、操作詳細を隠し、課題直下に「作戦を比較する↓」scroll anchorを追加。771pxでは初期画面内に表示できた。
- 新モード実機/360/393/430、PC、最終v6の近接・回転・比較、ステージ/number/clay、計測、読み込み失敗は未検証。既存0.6の検証を今回済みと報告しない。
- 新コードのstages指定jbbf/ifbbWorldが無効URLになる問題を実装レビューで発見し、LocalStageのlocal-national/local-worldへ修正。固有のBULKバナーと規模別幅/支柱を追加済み、画面未確認。

## 直近セッション/次の作業

- session73305（6プロフィール監査）はexit0完了。
- session27933（surface Blender）はexit0完了。
- session60114（v6 QA→v5 baseline再render）はexit0完了。これはsurface前。
- typecheckは直近成功（clay/番号追加後）。compile未定義関数等は解消。
- 次：v6 loader assertion修正→最終画像とブラウザで判断/修正。新modeのUI/手動food aggregate入力/結果カードdownload/自動調整説明/保存エラーを仕上げる。20/40全モード実プレイ＋実測時間、作戦matrix監査、full tests/build/PWA/保存互換/旧原本SHA、docs更新→GitHubpush。
- docs・README・packageまだ0.6のまま。最終report未作成。旧verify-build-v5は更新せずv6新scriptを使う。GitHubプッシュはまだであり、ユーザーの明示承認があるので完了後に再確認不要。
