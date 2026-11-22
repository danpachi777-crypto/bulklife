import { useState, useEffect } from "react";
import type { Career, DailySummary } from "../core/model";
import { periodSummary } from "../core/planning";
import { dayDate, signed, yen, DayResult } from "./Experience";
export interface PeriodReport {
  before: Career;
  after: Career;
  logs: DailySummary[];
  requested: number;
}
export function PeriodResult({
  report,
  onNext,
  onRecords,
}: {
  report: PeriodReport;
  onNext: () => void;
  onRecords: () => void;
}) {
  const p = periodSummary(
      report.before,
      report.after,
      report.logs,
      report.requested,
    ),
    [day, setDay] = useState<number | null>(null);
  const [canContinue, setCanContinue] = useState(false);
  useEffect(() => {
    setCanContinue(false);
    const timer = setTimeout(() => setCanContinue(true), 500);
    return () => clearTimeout(timer);
  }, [p.first, p.last, p.count]);
  if (day !== null)
    return (
      <>
        <button onClick={() => setDay(null)}>期間全体のまとめへ戻る</button>
        <DayResult
          summary={report.logs[day]}
          onNext={() => setDay(null)}
          nextLabel="期間全体のまとめへ戻る"
        />
      </>
    );
  return (
    <section className="paper period-result">
      <span className="eyebrow">YOUR WEEK IN REVIEW</span>
      <h2>{p.count}日間の育成結果</h2>
      <p>
        {p.count
          ? `${dayDate(p.first)}〜${dayDate(p.last)}`
          : "日付は進んでいません"}{" "}
        / 予定{p.requested}日・実行{p.count}日
      </p>
      {p.stopped && (
        <div className="warning" role="status">
          <b>ここで停止しました</b>
          <p>{p.stopped}</p>
          <button disabled={!canContinue} onClick={onNext}>
            今日へ戻って必要な判断を確認
          </button>
        </div>
      )}
      <div className="result-grid">
        <article>
          <h3>身体の変化</h3>
          <p>体重 {signed(p.weight, 2, "kg")}</p>
          <p>
            筋質量 {signed(p.muscle, 3, "kg")} / 脂肪 {signed(p.fat, 3, "kg")}
          </p>
        </article>
        <article>
          <h3>練習の積み重ね</h3>
          <p>
            {p.trainingDays}日 / {p.sets}・予定{p.plannedSets}セット
          </p>
          <p>
            実施 {Math.round(p.minutes)}分。日ごとの実績は下で確認できます。
          </p>
        </article>
        <article>
          <h3>食事と回復</h3>
          <p>
            平均 {Math.round(p.energy)}kcal / たんぱく質充足{" "}
            {Math.round(p.proteinCoverage * 100)}%
          </p>
          <p>睡眠 平均{p.sleep.toFixed(1)}時間</p>
          <p>
            {p.proteinCoverage < 0.9
              ? "目標の栄養量に届かない日がありました。食費や調理方法を相談できます。"
              : p.sleep < 7
                ? "短い睡眠の日がありました。生活の時間配分を見直せます。"
                : "短期の増減だけで成長を評価せず、数週間の推移を比べましょう。"}
          </p>
        </article>
        <article>
          <h3>収支</h3>
          <p>
            収入 {yen(p.income)} / 食費 {yen(p.food)}
          </p>
          <p>生活・ジム・コーチ費 {yen(p.fixed)}</p>
          <p>大会・その他の臨時収支 {signed(p.other, 0, "円")}</p>
          <b>所持金の変化 {signed(p.balance, 0, "円")}</b>
          <small>臨時収支は実際の所持金差と日次収支の差額です。</small>
        </article>
      </div>
      <details>
        <summary>実行した日を確認</summary>
        {report.logs.map((s, i) => (
          <button className="period-day" key={s.day} onClick={() => setDay(i)}>
            {dayDate(s.day)}：練習{s.training.completedSets}セット / 食事
            {Math.round(s.meal.calories)}kcal / 睡眠{s.sleep.hours.toFixed(1)}h
          </button>
        ))}
      </details>
      <div className="button-row">
        <button className="primary" disabled={!canContinue} onClick={onNext}>
          {dayDate(report.after.athlete.day)}の作戦を決める
        </button>
        <button disabled={!canContinue} onClick={onRecords}>
          身体の推移を見る
        </button>
      </div>
    </section>
  );
}
