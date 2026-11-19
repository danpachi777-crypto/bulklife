# BULK LIFE 再設計の実装監査

監査対象: `cc3cdb5` 相当の core / UI。2026-11-19。実装変更は行わず、新しい「今日・週間・キャリア・記録」導線に既存計算を接続する際の注意を整理した。外部資料の追加調査はしていない。

## 結論

既存 simulation / training / nutrition はそのまま計画と実績の入力源にできる。ただし、現行 DailySummary だけでは、実行時の予定栄養・練習開始時刻・習熟変化・疲労変化を後日正しく表示できない。実行直前と実行後の数値を optional の記録として凍結するのが必要。表示のために RNG を再度進めたり、現在の plan を過去の予定として使ってはいけない。

初期6プロフィールは現在の既定計画でも、種目別初心者案でも時間・資金上成立する。最も余裕の少ない P3 を基準にサイドパネルの警告と実行後の理由表示を確認するとよい。

## 初期6プロフィールの実測

再現条件: generateCareer(profile, 42, 'bl-audit')、月曜初日。既定の睡眠7.5h、20時開始、ポージング10分。食事に困窮する初期条件ではない。

|プロフィール|既定 planIssues|簡単計画の初日実績|初日未割当時間|種目別＋食品案の栄養 kcal / P g|食品費/日|調理 分/日|
|---|---|---|---|---|---|---|
|P1|なし|3/3単位|3.99h|2163 / 111|905円|29.4|
|P2|なし|3/3単位|3.49h|2483 / 135|1040円|35.0|
|P3|なし|3/3単位|1.49h|2337 / 124|978円|32.4|
|P4|なし|3/3単位|6.99h|2105 / 107|883円|28.5|
|P5|なし|3/3単位|3.49h|2832 / 160|1185円|41.0|
|P6|なし|3/3単位|4.39h|2396 / 128|1003円|33.5|

種目別案は月水金を `exerciseRecipe('full',2)`（7種目×2セット）、食事を `useMealTemplate(c,'build')` とした。全員初日14/14セット、約50分、planIssuesなし。7日実行も全員7日進み42/42セット、中断なし。7日間の所持金差は順に +13,986 / +14,175 / +24,767 / +8,499 / +15,414 / +14,430円。全身疲労は0.275 / 0.288 / 0.332 / 0.275 / 0.288 / 0.275。

これは「この seed の最初の週に計画を実行できる」確認であり、長期の大会成功や現実の最適計画を保証しない。食品テンプレートの build はゲーム内の目的名。新規選手に提示する際は、採用ボタンで予定内容が変わることを示す。旧選手に自動適用すると、簡単計画の3単位が14実セットになり刺激も全身疲労も変わるので避ける。

## 日次結果の取得元

現在の記録から正しく表示できるもの:

- 予定/完了セット: summary.training.plannedSets / completedSets。簡単計画の「単位」と詳細計画の「実セット」を同じ意味で並べない。
- 実績の時間・重量・回数・RIR・フォーム: training.duration、training.exercises[].sets[]。training.rir は日別の設定値で、詳細計画の全セットの実績RIRではない。
- 実績栄養・食費: meal.calories / protein / cost。食品モードなら nutrients も実食比率を適用済み。
- 睡眠予定/実績/前日: sleep.plannedHours / hours / priorHours。回復計算に使うのは priorHours。当日に睡眠計画を増やしても、その日の回復をただちに最大化しない。
- 筋量・脂肪量差: muscleDelta / fatDelta。日次体重差は水分変動もあるため「筋肉が増えた量」と同義にしない。
- 原因の一部: traces の刺激、回復係数、タンパク質充足、エネルギー係数。これらはゲーム係数として表示する。

追加しない限り不明なもの: 実行時の栄養予定、開始時刻、詳細種目予定の重量/回数/優先設定、実行前後の習熟・局所疲労・全身疲労、体重/水分/所持金の実行前値、ポージングの実行前後値。週間 snapshot は7日間隔で、これらの日次差を復元できない。

### optional 拡張案

既存フィールドの意味を変えず、例えば下記を `DailySummary.detail?` に格納する。親の実装に合わせて名称は変更可。

```ts
detail?: {
  version: 1;
  planned: {
    training: DayPlan; // structuredClone。当日の詳細種目設定を含む
    trainingMinutes: number; // sessionMinutes または簡単計画の式
    mealMode: 'aggregate' | 'foods';
    calories: number; protein: number; foodCost: number; prepHours: number;
    posingMinutes: number; cardioMinutes: number; waterLitres: number;
  };
  before: {
    weight: number; muscle: PartMap; fat: number; waterDelta: number;
    ability: PartMap; fatigue: PartMap; systemicFatigue: number;
    money: number; posing?: number;
  };
  after: {
    ability: PartMap; fatigue: PartMap; systemicFatigue: number;
    waterDelta: number; money: number; posing?: number;
  };
  foodRatio: number;
  expenditure: number; // 実際に既存式へ入力した値
  costs: {fixed: number; gym: number; coach: number; food: number};
}
```

全項目が大きければ、before/after の必要値と予定のカロリー・P・費用・時間だけでもよい。技能/疲労は現在値から逆算しない。`after-before` を実データで出し、「局所回復」の差を示すなら `(1-afterFatigue)-(1-beforeFatigue)` と符号を反転する。

取得順は input から before と planned を複製 → 既存計算を1回実行 → lifecycleAfterDay 後の career から after を取得 → 同じ summary を lastSummary と戻り値/保存ログに入れる。posing は lifecycleAfterDay で増えるため、その前に after を確定しない。lifecycleBeforeDay が決定待ちにしてログを返さない場合は「0セットの1日完了」と扱わない。

実測例: P1 seed42 初日は胸の習熟0.100000→0.101297296（表示上 +0.13ポイント/100）、局所疲労0→0.08316、全身疲労0→0.075。+0.1297%という相対増加ではなく、100点表示での差を明記する。

### 記録・互換性

`logCodec.ts` は外側配列をちょうど7要素、内側も固定長としている。TypeScript の optional を追加するだけでは圧縮exportで消える。互換方法は、旧7要素をそのまま読むことを維持し、新記録だけ8番目へ detail を追加して unpack が7/8要素の両方を受理する形、または明示的な columns-v2 を追加して v1 decoder を残す形。

`validateSummary` は detail が absent の旧記録を受け入れ、present の場合だけ version、有限値、範囲、PartMap16部位を検査する。栄養「予定値」は食品40行×最大1500gで、実績用の10000kcalより大きくなり得る。予定の所要時間も24種目×8セット×長休憩なら24時間を超えるため、実績と同じ上限をそのまま使わない。過大な予定は警告し、invalid save で既存記録を閉じ出さない。

旧記録の optional 欠損は「この版では未記録」とする。現在planから補完したり差をゼロにしてはいけない。IndexedDBはオブジェクト保存なので detail を保持できるが、export/import roundtrip と lastSummary の整合も検証する。保存失敗時の既存保持、import時の新IDでのマージは現在の storage の性質を維持する。

## 計算・UXで誤認しやすい点

1. **食品モードが集約入力より優先。** 再現: P1にbuild食品テンプレを適用し plan.calories=1000 / protein=30 を設定しても、実行栄養は食品由来の2163kcal等。今日カードと予測は `nutritionPlan(c)` を用いる。サイドパネルで集約欄を編集するならモード変更を明示し、食品を使ったまま無効な欄だけ編集させない。食品費の月額見込みも plan.foodCost だけでは古い。
2. **予算不足と安全上限で実食量が一律縮小。** mealRatio は所持金と日割り費用差引後の予算、10000kcal上限で決まる。予定を達成したように見せず、予定対実績と foodRatio、理由を出す。prep は現行では縮小されず全予定時間のままなので、「計測した実調理時間」とは呼ばない。
3. **栄養バランスは全栄養素の判定ではない。** coverage は繊維25g、Ca600mg、鉄10mg、VitC60mgへの4指標の平均というゲーム指標。aggregate では値を持たず内部1扱い。食品未入力の計画に「バランス100%」を表示しない。sodium は記録するが現在成長・水分計算の個別因子ではない。
4. **補助練習は現状、予定を実施扱い。** cardioMinutes は毎日時間枠と消費量 `4kcal/分` へ直接入り、posingMinutes は lifecycleAfterDay でそのまま習熟に入る。実行可能な開始時刻や中断の独立判定はない。新UIで「実際に完了した有酸素○分」と呼ぶには実績方針が必要。未変更なら「補助練習は予定どおり実施する簡略化」とする。
5. **不足時間は睡眠短縮として処理。** 再現: P3、休養日、sleep10h / prep2h / cardio60分 / posing60分では睡眠7h、freeHours0、posingは0.08→0.081564。無条件に睡眠が確保されたとは表示しない。freeHours は負値を0へ丸めるので「余裕がある」の根拠にせず、planIssues と短縮イベントも表示する。
6. **予測と実績の限界。** trainingWindow/planIssues は通常の仕事・通勤を見るが、遠征日は実行側で勤務0・練習休養へ上書きする。遠征時に通常日の警告や予定を確定結果として見せない。怪我/回復期間でも理由を最優先に表示する。実行前のセット完了数は乱数・当日の状態で変わる。
7. **費目名の混同。** summary.fixed は現在、固定費+コーチ料であり固定費だけではない。コーチONで別にコーチ料を加えると二重計上する。新 breakdown を追加し、旧記録は「固定費等」と表示する。
8. **入力しても因果がない項目。** stress は更新されるが、現行の練習/回復式に再入力されていない。meals[].time も時間順の摂取可否判定に使わない。新UIで「ストレスを下げると成長する」「食事時刻が合わず未食」と説明しない。
9. **体脂肪と水分。** fat には下限/上限clampがあり、体重には水分乱数が加わる。単日体重差や fatDelta から摂取量の厳密な因果を断定しない。trace.muscleDelta は gain-loss であり、ごく小さい筋量の下限clamp時は実差と一致しない。部位の厳密な差は before/after の筋量を使う。
10. **曜日と実行日。** summary.day は完了した日（0起点）、career.athlete.day は次に実行する日。結果を実行後の曜日で見出し表示しない。編集パネルは選択曜日と今日を区別する。現在 TrainingScreen の actual は選択曜日に関係なく直近ログなので、曜日切替時にその曜日の実績と誤認させない。

## 体形の version 切替

現在 VERSIONS は model='athlete-v1' / mapping='regions-v1'。validation.versions は旧0.1.0、0.2.0と現行の少数の完全一致だけを許可する。非legacyの simulateDay は versions を現行 VERSIONS に丸ごと差し替える。

AthleteStudio は BODY_ASSET_URL の単一GLBと morphValues(body) を使い、careerのmodel/mappingを受け取らない。したがって定数を新モデルに置き換えるだけでは、既存選手・初日snapshot・大会の過去の体形まで一斉に新表示になる。

- 旧GLBと旧mappingを残し、モデル/マッピング版でasset・変形関数・領域判定・衣服・アニメーションを一緒に選択する。BodyViewへ版を渡す経路は今日、比較、記録、大会表彰台、画像出力まで確認する。
- 新規作成から新model/mappingを使う。既存careerは既定で旧表示を維持し、明示的移行がある場合だけ切り替える。毎日の simulation で model/mapping を無条件上書きしない。
- 新版の許容追加時も旧0.1/0.2保存を引き続き受理する。version判定を新 VERSIONS 完全一致だけに置き換えない。Library版とCareer版も同一であるとは限らない。
- 現行 morph の基準は P1 seed42 の筋量。新モデルで基準を変えるなら、全6プロフィールの初日と同一選手の初日/現在の比較を確認する。新モデルの見た目のために body.muscle / fat / capacity を再生成しない。
- 体形ヒートマップの「部位バランス」は現在 muscle/capacity で、左右差や部位の均整ではない。capacityはゲーム内の潜在値なので「左右対称」「大会の均整評価」「現実の個人生涯限界」と説明しない。「直近の負荷」も pump に基づく表示で、保存された週間セット数ではない。

## 初日案内・小大会を既存構造に追加する場合

初日は「今日の予定確認→必要なら編集→1日実行→完了日の結果→明日の作戦」の順で完結させる。pendingEvent/decision がある時は、今日の主操作を具体的な判断へ変える。disabled の実行ボタンだけで理由を隠さない。

現在の Series は8大会のunionで、validateProgress内にも同じID一覧がある。小大会を追加するときは型/大会一覧/資格/結果validator/目標/版/記録の全参照をそろえる。初心者の練習会として別 optional 構造を使う場合は、公式JBBF/NPC資格・プロカード・世界タイトルを付与しない。参加者や審査を勝利固定にせず、参加・順位・改善点を実データで残す。旧careerに必須の新フィールドを要求しない。

## 変更後の必要確認

- 旧0.1.0、0.2.0、0.2.1の保存・旧7列圧縮ログを読み、旧ログの不明差分表示を確認する。
- 新optional付きログがIDB・export/importで保持され、実行直後結果と記録画面が一致する。
- 1日実行後に計画を編集しても、完了日の予定/実績が変わらない。
- P1〜P6の初日/7日、P3の過密計画、食品/集約切替、予算不足、休養・遠征・違和感期間、決定待ちでの日付停止。
- 小大会の初参加から結果保存、引退後の閲覧、旧/新体形の読み分け。同じ保存の読み直しで乱数や体組成が変わらない。

本資料作成ではsrcと既存docsを変更していない。検証スクリプトはワークツリー外の `.codex/tmp` に置いて実行した。
