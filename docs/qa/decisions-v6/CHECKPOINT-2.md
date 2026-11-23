# 最新の作業チェックポイント（未完了・未プッシュ）

> 作業途中の履歴。現在の結果は [report.md](report.md) を優先する。

2026-11-23。WORK-IN-PROGRESS.mdより本書を優先。

- QAは127.0.0.2:5178、P6大地、seed1326575383。日本20回をUIで完走。最終大会→国内endingまで確認。日本グランプリ11人中4位（未優勝）、初日74kg/筋29.84→86.9kg/筋40.12、筋+10.28kg、資金2,884,770円。地方9人中5位から再戦4位で国内上位へ進んだ経路。国内endingから同選手の世界追加20へ継続し、**現在26回の結果を保存済み、次27**。UI40完走はまだ。
- 日本20まで52.153分実測。ただしコード修正・画像確認・保存QA・ツール待ちを含むので通常プレイヤー時間ではない。CUA変数uiStartedV6、uiWorldExtensionStarted（21開始時）保持。
- UI確認：連打で二重期間なし、結果中に身体/決断nav、reload→再開、最終確認の取消→比較で回数未消費、JSON書出し→別枠へ読み込み、SVG記念カードdownload成功。Downloads/BULK-LIFE-challenges.jsonは4回時点、同decision-4-result.svgもある。コピー側を現在継続中、元4回も残る。処理中のreloadはnative click待ちの間に期間終了した可能性があり、実画面で途中jobのreload証拠は未取得。CPU checkpoint再開テストは成功。
- 13回で自宅設備案。手軽食事1200円では2046/2650kcal不足を確認。生活条件の予算1600円へ変更→2651kcal、P100%、食費1556円、収支低下を確認し採用。器具2万円を一度払い、以後homeを維持。
- UI修正：身体ページ要約値の白背景/白文字→深緑。保存noticeをresultと途中で分けた。status変更時scrollreset。ModalSheet title変更時content先頭へ（basicフォームが上に追加され見えない実操作不具合を修正）。nutritionOnlyのaggregateにkcal/P/費用/準備時間Numeric。manual editorはinspect済みcareerを表示。autoRecovery checkbox。身体比較historyは週次全部から決断境界へ。グラフ部位別追加。
- 保存にupdatedAt?/importedFrom?（旧データoptional互換）、persist更新日時でcontinue順、コピーlabel、archive statusnotice。旧legacyDBは未変更。
- NPC出場者も参加/移動費、直前3日休養、当日のcontestHoursを負担。既存出場資格を持つ背景の選手として開始する説明をUI追加。CPU敗北追従補正なし。
- 大会日to→to-1へ（期間末日と一致）。設備費を残金チェックで二重計上した箇所を修正。文脈別4案目（home投資/実対戦名と点差の再戦/長期回復）、初期より成長速度が低い時のissueを追加。基礎3案は維持。再戦案はまだ自分のweak部位を使用、相手の部位差を使う改善余地。ポージング差-10.3などの文言も自然にしたい。
- 113 tests全成功session44841。QuotaExceeded注入で直前planning/revision0保持、不正archiveの原状維持、manual食事1100kcal/40g保持+不足記録を追加。その後first4testに収支一致assertを足したので最後に全test再実行。check直近成功。
- CPU費用/休養修正後の6初期40回audit session88571成功、直接40と20+20の全40同一性session58176成功。15run（3seed×balanced/volume/spend/work/no-stage）40回audit session9057成功。JSON更新済み。未出場40endingも正常、volumeは筋量微増でも技術/状態で劣り、maxmoneyも必勝ではない。計算検証を面白さ/通常プレイ時間の証拠にしない。
- 合法調整案（P2 seed823、練習60/posing60/睡眠8.5/coach/work.8、資金不足時work1）は世界40優勝可能。session85665成功、world-title-audit.json。能力/RNG変更や固定報酬無し。
- v6上腕量感を再調整。spindle/fan成分を.35から腕.95/胸.65/大腿.75等へ。実在のv5-workを複製してrefine→surfaceを再実行。途中v5-finalという不存在名を指定した失敗があったが、その出力は採用せず、v5-workから再制作。最終GLB6,914,156bytes、sha0bf41d077274a24a2d3800080db35e50fc52fe98938a595c2cafcfdb33657944。portraitAsset.ts同期済み。全after画像最終render session89737成功。hairVertices1755に更新済み。
- 最新v6 loader243cases+37standUp成功。20mm corrective上限。CPU geometry検証であり見た目/FPS/全衝突合格の証拠にはしない。clay/highpose/hands画像実見、上腕の量感が前iterationより改善。顔/肩/脇の写実感は慎重な評価が必要。
- 接地調査tmp/foot-v6.tsでbarebody minY=-.003597m、靴sole=-.015148m。**直近修正** AthleteStudio root.position.yをwear?.01515:.00360×height/176.5へ（athlete-v2互換IDのみ）。靴/裸足別の床合わせ。verifyのalignedStandContact37時点±1mm、check+verify成功。HMRでtitleへ戻っている可能性。26結果は保存済み。
- CUA challengeApp window2296460、771×976、cs最新版。v6fs/v6dir設定済み、画像保存はv6fs.writeFile(v6dir+'browser-xxx.png',Array.isArray(cs)?cs[0].bytes:cs)。AX常にunavailable。CUA completion_summaryはまだ。再開時rewriteDocumentation。
- browser-*画像：初回結果、初舞台front/back、初評価、予算不足→調整、国内最終stage/pose/result/ending、世界継続。参照調査はdocs/qa/consistency-v5/references.mdに11月23日スマホtrial/DOM/publicCSS/JSの実調査追記がある。非公開本編未確認。

## 残る作業

1. UI27〜40→worldending。新規直接world40は計算のみ確認、UI通しがまだ。スマホ360/393/430、PC、RenderProbe実計測、fail-model、回転/拡大/比較、実機は未確認。
2. 次提案が定型なので実際の食事不足/疲労/大会から短い具体助言へ。endingの比較ラベルを初日/最後へ。ライバル2体比較、first/last exercise実績sampleなど任意履歴を検討。新たなcore大規模改変は不要。
3. 全tests/check/build/PWA/license/旧v2〜v5ファイルhash。README/packageまだ0.6、0.7更新とreport/comparison gallery。
4. LAN URL確認、最後にcommit/push。ユーザーpush明示承認あり、再確認不要。現HEAD33ce450、backup/pre-decision-modes-20261123。現変更すべて未コミット。新しいsubagentは禁止。
