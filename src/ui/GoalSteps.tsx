import type { Career } from "../core/model";
import { editions, eligibility, SERIES_NAMES } from "../core/competitions";
import { isoDay } from "../core/calendar";
export function GoalSteps({ c }: { c: Career }) {
  const goal = c.progress?.goal;
  if (!goal)
    return (
      <p>
        目標大会を選ぶと、必要な次の手続きをここへ表示します。後から変更できます。
      </p>
    );
  const e = editions(c).find(
    (e) => e.series === goal && e.deadlineDay >= c.athlete.day,
  );
  if (!e)
    return (
      <p>{SERIES_NAMES[goal]}の今後の日程は現在の一覧で確認してください。</p>
    );
  const q = eligibility(c, e),
    entry = c.progress?.entries.find((x) => x.editionId === e.id);
  const step =
    entry?.status === "entered"
      ? `${isoDay(entry.travelDay)}に移動を確認します。`
      : entry?.status === "travelled"
        ? `${isoDay(entry.showDay)}の計量・チェックインへ進みます。`
        : entry?.status === "checkedIn"
          ? "ステージに立ち、審査を受けます。"
          : (q.missing[0] ??
            "申込み条件を満たしています。費用と日程を確認して申し込めます。");
  return (
    <section className="paper goal-steps">
      <h3>目標大会への次の一歩</h3>
      <b>{e.name}</b>
      <p>
        開催 {isoDay(e.showDay)} / 締切 {isoDay(e.deadlineDay)}
      </p>
      <p>
        <strong>まず：{step}</strong>
      </p>
      {q.missing.length > 1 && (
        <details>
          <summary>この後に必要な条件（{q.missing.length - 1}件）</summary>
          <ol>
            {q.missing.slice(1).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </details>
      )}
      <a href={entry ? "#official-entries" : "#official-registration"}>
        該当する手続きへ進む
      </a>
      <small>
        ゲーム内の条件を満たす順に確認します。登録や出場は自動で行いません。
      </small>
    </section>
  );
}
