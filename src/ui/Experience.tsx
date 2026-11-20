import { useEffect, useRef, useState } from "react";
import {
  PARTS,
  LABELS,
  muscleMass,
  weight,
  fatPercent,
  type Career,
  type DailySummary,
  type Part,
} from "../core/model";
import { FOCUS_LABELS, PROFILES } from "../core/content";
import { nutritionPlan } from "../core/nutrition";
import { sessionMinutes } from "../core/exercises";
import { planIssues, gameDate } from "../core/simulation";
import { BodyView } from "../view/BodyView";
import { AthleteSummary } from "./AthleteSummary";
import { useMobileLayout } from "./useMobileLayout";
import {
  LOCAL_DEFS,
  localEditions,
  localEligibility,
  enterLocal,
  enableLocal,
  runLocal,
  withdrawLocal,
  scoreLocal,
  localPerson,
  localField,
  type LocalResult,
  type LocalScore,
} from "../core/localCompetitions";
export const yen = (n: number) => Math.round(n).toLocaleString("ja-JP") + "円";
export const signed = (n: number, d = 3) => (n >= 0 ? "+" : "") + n.toFixed(d);
export const dayDate = (n: number) =>
  gameDate(n).toLocaleDateString("ja-JP", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
  });
export const OBJECTIVES = {
  habit: "無理なく練習・食事・休養を続ける",
  contest: "初めての大会に向けて準備する",
  balance: "全身のバランスと動作を育てる",
  personalBest: "前回の自分の記録を超える",
};
export function Today({
  c,
  busy,
  draft,
  part,
  setPart,
  onEdit,
  onStep,
  onTab,
  onChange,
}: {
  c: Career;
  busy: boolean;
  draft: boolean;
  part: Part;
  setPart: (p: Part) => void;
  onEdit: (p: "training" | "food" | "rest") => void;
  onStep: () => void;
  onTab: (s: "plan" | "career" | "records") => void;
  onChange: (c: Career) => void;
}) {
  const a = c.athlete,
    b = a.body,
    d = c.plan.days[a.day % 7],
    n = nutritionPlan(c),
    minutes =
      d.focus === "rest"
        ? 0
        : d.exercises
          ? sessionMinutes(d.exercises)
          : (0.3 + d.sets * 0.18) * 60;
  const mobile = useMobileLayout();
  const next =
      c.local?.entries.find((e) => e.status === "entered") ??
      localEditions(c).find((e) => e.deadlineDay >= a.day),
    issues = planIssues(c, a.day % 7),
    retired = a.status === "retired";
  const eventRest =
    !!c.local?.results.some((r) => r.day === a.day) ||
    !!c.progress?.results.some((r) => r.day === a.day) ||
    !!c.progress?.entries.some(
      (e) =>
        ["travelled", "checkedIn"].includes(e.status) &&
        a.day >= e.travelDay &&
        a.day <= e.showDay,
    );
  const injuryRest = !!c.progress && a.day < c.progress.injuryUntil;
  return (
    <div className="today-layout">
      <AthleteSummary c={c} part={part} setPart={setPart} />
      <section className="strategy-column">
        <div className="section-heading">
          <div>
            <span className="eyebrow">TODAY'S STRATEGY</span>
            <h2>今日を、どう過ごす？</h2>
          </div>
          <span className="status-pill">
            {["月", "火", "水", "木", "金", "土", "日"][a.day % 7]}曜日
          </span>
        </div>
        {!c.tutorialHidden && (
          <div className="first-guide">
            <b>
              {a.day === 0
                ? "まずは、この選手の1日を決めてみよう。"
                : "次の1日も、実績を見て決めよう。"}
            </b>
            <p>
              おすすめの内容が入っています。気になる項目を変えて、そのまま始められます。
            </p>
            <ol>
              <li>練習・食事・休養を確認</li>
              <li>今日を実行</li>
              <li>結果から翌日を考える</li>
            </ol>
            <button
              disabled={busy || draft}
              onClick={() => onChange({ ...c, tutorialHidden: true })}
            >
              案内を終了・スキップ
            </button>
          </div>
        )}
        <article className="strategy-card">
          <span className="card-number">01 / TRAIN</span>
          <h3>
            練習{" "}
            <span className="plan-status">
              {eventRest
                ? "大会休養"
                : injuryRest
                  ? "回復期間"
                  : d.focus === "rest"
                    ? "休養日"
                    : draft
                      ? "おすすめ"
                      : "設定済み"}
            </span>
          </h3>
          <strong>
            {eventRest
              ? "大会・遠征に合わせた休養"
              : injuryRest
                ? "違和感の回復期間"
                : FOCUS_LABELS[d.focus]}
            {!eventRest &&
              !injuryRest &&
              minutes > 0 &&
              ` / 予定${Math.round(minutes)}分`}
          </strong>
          <p>
            {eventRest
              ? "大会・遠征日は筋力練習を休みます。食事・睡眠は今日の実行で記録します。"
              : injuryRest
                ? "回復期間中は筋力練習を休み、予定と実績の違いを記録します。"
                : d.focus === "rest"
                  ? "筋力練習は行わず、回復に時間を使います。"
                  : `${d.start}時開始 · ${d.exercises ? d.exercises.reduce((s, e) => s + e.sets, 0) + "セット（種目別）" : d.sets + "セット単位（簡単計画）"} · 余力 RIR ${d.rir}`}
          </p>
          <button
            disabled={busy || draft || retired}
            onClick={() => onEdit("training")}
          >
            <span className="desktop-label">
              {eventRest || injuryRest
                ? "今週の練習を変える"
                : "練習内容を変える"}
            </span>
            <span className="mobile-label">練習を変更</span>
          </button>
          {issues.map((i) => (
            <div className="inline-advice" key={i}>
              <b>予定の注意</b>
              <p>{i}。実行時は時間に合わせて短縮されます。</p>
            </div>
          ))}
          {a.systemicFatigue > 0.6 && (
            <p className="inline-advice">
              助言：疲労が残っています。セットを減らす・休養へ変える選択もできます。
            </p>
          )}
        </article>
        <article className="strategy-card">
          <span className="card-number">02 / EAT</span>
          <h3>
            食事{" "}
            <span className="plan-status">
              {draft ? "おすすめ" : "設定済み"}
            </span>
          </h3>
          <strong>
            {c.progress?.mealMode === "foods"
              ? "食品と量から作る食事"
              : "エネルギーとタンパク質の簡単設定"}
          </strong>
          <p>
            {Math.round(n.calories)} kcal · P {Math.round(n.protein)}g ·{" "}
            {yen(n.cost)}/日
          </p>
          <button
            disabled={busy || draft || retired}
            onClick={() => onEdit("food")}
          >
            <span className="desktop-label">食事を選ぶ</span>
            <span className="mobile-label">食事を変更</span>
          </button>
          {a.life.money < n.cost * 7 && (
            <p className="inline-advice">
              助言：食費の余裕が少なくなっています。資金が足りない日は賄えた量だけ食事実績に入ります。
            </p>
          )}
        </article>
        <article className="strategy-card">
          <span className="card-number">03 / RECOVER</span>
          <h3>
            休養{" "}
            <span className="plan-status">
              {draft ? "おすすめ" : "設定済み"}
            </span>
          </h3>
          <strong>睡眠 {c.plan.sleep}時間</strong>
          <p>
            ポージング {c.progress?.posingMinutes ?? 0}分 · 有酸素{" "}
            {c.progress?.cardioMinutes ?? 0}分
          </p>
          <button
            disabled={busy || draft || retired}
            onClick={() => onEdit("rest")}
          >
            <span className="desktop-label">休み方を決める</span>
            <span className="mobile-label">休養を変更</span>
          </button>
          <small className="rest-note">
            前夜の実睡眠 {a.previousSleep.toFixed(1)}
            時間。今夜の睡眠は翌日の回復に使われます。
          </small>
        </article>
        <div className="daily-action" aria-label="今日の実行">
          <p>
            {a.day === 0
              ? "最初は全身の動作と、続けられる生活を確かめましょう。"
              : a.systemicFatigue > 0.6
                ? "残った疲労と、今日の予定の両方を見て調整しましょう。"
                : "身体の変化は数週間の積み重ねで比べましょう。習熟も記録に残ります。"}
          </p>
          {c.pendingEvent && (
            <p role="alert" className="warning">
              実行を停止中：{c.pendingEvent}
            </p>
          )}
          <button
            className="primary daily-button"
            disabled={busy || draft || retired || !!c.pendingEvent}
            onClick={onStep}
          >
            {busy ? "今日を処理・保存中…" : "この内容で今日を過ごす"}
          </button>
          <small>練習・食事・休養を実行して、翌日の結果を表示します。</small>
          {draft && (
            <small>先に「この選手で始める」を押すと実行できます。</small>
          )}
          {retired && <small>引退した選手の記録を表示しています。</small>}
        </div>
      </section>
      <aside className="goals-column">
        <details className="home-agenda" open={!mobile}>
          <summary>目標・大会・今週の予定</summary>
          <section className="paper">
            <span className="eyebrow">YOUR DIRECTION</span>
            <h3>現在の目標</h3>
            <label>
              育成のテーマ
              <select
                disabled={busy || draft || retired}
                value={c.objective ?? "contest"}
                onChange={(e) =>
                  onChange({
                    ...c,
                    objective: e.target.value as Career["objective"],
                  })
                }
              >
                {Object.entries(OBJECTIVES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <small>進路や大会は固定されません。</small>
          </section>
          <section className="paper">
            <h3>次のステージ</h3>
            {next ? (
              <>
                <b>{LOCAL_DEFS[next.series].name}</b>
                <p>
                  {dayDate(next.showDay)} · あと{next.showDay - a.day}日
                </p>
                <small>{LOCAL_DEFS[next.series].place}</small>
                <button disabled={draft} onClick={() => onTab("career")}>
                  大会と条件を見る
                </button>
              </>
            ) : (
              <>
                <p>小さな大会から自分の現在地を確かめられます。</p>
                <button disabled={draft} onClick={() => onTab("career")}>
                  キャリアを開く
                </button>
              </>
            )}
          </section>
          <section className="paper">
            <h3>今週の予定</h3>
            <div className="mini-week">
              {c.plan.days.map((x, i) => (
                <span key={i} className={i === a.day % 7 ? "current" : ""}>
                  <b>{["月", "火", "水", "木", "金", "土", "日"][i]}</b>
                  {FOCUS_LABELS[x.focus]}
                </span>
              ))}
            </div>
            <button disabled={draft} onClick={() => onTab("plan")}>
              週間計画を見直す
            </button>
          </section>
          <section className="paper">
            <h3>最近の記録</h3>
            {c.lastSummary ? (
              <>
                <p>
                  {dayDate(c.lastSummary.day)} ·{" "}
                  {FOCUS_LABELS[c.lastSummary.training.focus]}
                </p>
                <p>
                  実施 {c.lastSummary.training.completedSets}/
                  {c.lastSummary.training.plannedSets} · 筋質量{" "}
                  {signed(c.lastSummary.muscleDelta)}kg
                </p>
                <button onClick={() => onTab("records")}>実績を振り返る</button>
              </>
            ) : (
              <p>最初の1日を過ごすと、ここに実績が残ります。</p>
            )}
          </section>
        </details>
      </aside>
    </div>
  );
}
export function DayResult({
  summary: s,
  onNext,
}: {
  summary: DailySummary;
  onNext: () => void;
}) {
  const d = s.detail;
  const skill = d
    ? (PARTS.reduce((v, p) => v + d.after.ability[p] - d.before.ability[p], 0) /
        16) *
      100
    : null;
  return (
    <section className="day-result paper">
      <span className="eyebrow">A DAY IN YOUR CAREER</span>
      <h2>{dayDate(s.day)}の結果</h2>
      <p>小さな変化も、今日の実績として残りました。</p>
      <div className="result-grid">
        <article>
          <h3>練習</h3>
          <b>
            {FOCUS_LABELS[s.training.focus]} · {s.training.completedSets}/
            {s.training.plannedSets}{" "}
            {s.training.exercises ? "セット" : "セット単位"}
          </b>
          <p>
            {d && `予定${Math.round(d.planned.trainingMinutes)}分 → `}実績
            {Math.round(s.training.duration * 60)}分
          </p>
          <p>{s.training.reason}</p>
        </article>
        <article>
          <h3>食事</h3>
          <b>
            {Math.round(s.meal.calories)} kcal / P {s.meal.protein.toFixed(0)}g
          </b>
          <p>
            {d
              ? `予定した食事の${Math.round(d.actual.mealRatio * 100)}%を賄いました。`
              : "当時の予定量は未記録です。"}
          </p>
          <p>
            タンパク質充足 {Math.round(s.traces[0].proteinCoverage * 100)}% /{" "}
            {yen(s.meal.cost)}
          </p>
          {s.meal.nutrients && (
            <small>
              繊維・Ca・鉄・Cの4項目の充足指標{" "}
              {Math.round(s.meal.nutrients.coverage * 100)}
              %。全栄養素の評価ではありません。
            </small>
          )}
        </article>
        <article>
          <h3>睡眠・回復</h3>
          <b>睡眠 {s.sleep.hours.toFixed(1)}時間</b>
          <p>
            予定 {s.sleep.plannedHours ?? "未記録"}時間 / 回復計算に使った前夜{" "}
            {s.sleep.priorHours}時間
          </p>
          {d && (
            <p>
              残った全身疲労 {Math.round(d.after.fatigue * 100)}/100（前日{" "}
              {Math.round(d.before.fatigue * 100)}）
            </p>
          )}
        </article>
        <article>
          <h3>積み重ね</h3>
          <b>
            筋質量 {signed(s.muscleDelta)}kg / 脂肪 {signed(s.fatDelta)}kg
          </b>
          <p>
            {skill !== null
              ? `動作習熟の全身平均 ${signed(skill, 3)}ポイント`
              : "動作習熟の前後値は、この記録の版では未記録です。"}
          </p>
          {d && (
            <p>
              ポージング {d.actual.posingMinutes.toFixed(0)}分 · 技術{" "}
              {signed((d.after.posing - d.before.posing) * 100, 3)}ポイント /
              有酸素 {d.actual.cardioMinutes.toFixed(0)}分
            </p>
          )}
        </article>
      </div>
      <p className="result-explanation">
        筋質量の計算には刺激・前夜の回復・食事・成長余地が使われています。今日の見た目の変化だけで長期成長は判断できません。数週間の記録と比べ、疲労と実施量を次の日に活かしましょう。
      </p>
      {s.events.map((e) => (
        <p className="warning" key={e}>
          {e}
        </p>
      ))}
      <details>
        <summary>種目と部位ごとの計算実績</summary>
        {s.training.exercises?.map((e, i) => (
          <p key={i}>
            {e.exerciseId}：
            {e.sets
              .map((x) => `${x.load}kg × ${x.reps}回 / RIR${x.rir}`)
              .join("、")}{" "}
            {e.reason}
          </p>
        ))}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>部位</th>
                <th>刺激</th>
                <th>回復係数</th>
                <th>筋質量変化</th>
              </tr>
            </thead>
            <tbody>
              {s.traces.map((t) => (
                <tr key={t.part}>
                  <td>{LABELS[t.part]}</td>
                  <td>{t.stimulus.toFixed(2)}</td>
                  <td>{t.recovery.toFixed(2)}</td>
                  <td>{signed(t.muscleDelta, 5)}kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          仕事 {s.workHours}h / 通勤 {s.commuteHours}h / 自由時間{" "}
          {s.freeHours.toFixed(1)}h / 収入 {yen(s.income)} / 固定費{" "}
          {yen(s.fixed)} / ジム {yen(s.gym)}
        </p>
      </details>
      <button className="primary" onClick={onNext}>
        翌日の作戦を決める
      </button>
    </section>
  );
}
const SCORE_NAMES: Record<keyof LocalScore, string> = {
  mass: "筋量",
  balance: "バランス",
  condition: "仕上がり",
  posing: "ポージング",
  readiness: "当日の状態",
  total: "総合",
};
export function LocalResultView({
  result: r,
  previous,
  model = "athlete-v2",
  onNext,
}: {
  result: LocalResult;
  previous?: LocalResult;
  model?: string;
  onNext?: () => void;
}) {
  const [person, setPerson] = useState("player");
  useEffect(() => setPerson("player"), [r.id]);
  const displayed = r.podium.find((p) => p.id === person);
  const axes = [
    ...(["mass", "balance", "condition", "posing", "readiness"] as const),
  ].sort((a, b) => r.score[b] - r.score[a]);
  return (
    <section id="local-result" className="paper local-result">
      <span className="eyebrow">YOUR STAGE RECORD</span>
      <h2>
        {LOCAL_DEFS[r.series].name} · {r.rank}位 / {r.count}人
      </h2>
      <p>
        {dayDate(r.day)} / {r.classId} / 総合 {r.score.total.toFixed(2)}
      </p>
      <label>
        当日の身体を確認
        <select value={person} onChange={(e) => setPerson(e.target.value)}>
          <option value="player">自分の身体</option>
          {r.podium
            .filter((p) => p.id !== "player")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} / 表彰台
              </option>
            ))}
        </select>
      </label>
      <div className="local-stage">
        <BodyView
          key={r.id + person}
          model={model}
          body={displayed?.body ?? r.body}
          selected="chest"
          defaultClip="FrontDoubleBiceps"
          title={`${LOCAL_DEFS[r.series].name} / ${dayDate(r.day)}`}
        />
        <div className="score-bars" aria-label="自分の評価内訳">
          {axes.map((k) => (
            <div key={k}>
              <span>{SCORE_NAMES[k]}</span>
              <meter min={0} max={100} value={r.score[k]} />
              <b>{r.score[k].toFixed(1)}</b>
            </div>
          ))}
        </div>
      </div>
      <p>
        強み：今回の内訳では「{SCORE_NAMES[axes[0]]}
        」が最も高い評価でした。改善の候補：「{SCORE_NAMES[axes.at(-1)!]}
        」を次の計画で見直せます。
      </p>
      {previous ? (
        <p>
          前回の同大会：{previous.rank}/{previous.count}位、総合{" "}
          {previous.score.total.toFixed(2)} →{" "}
          {signed(r.score.total - previous.score.total, 2)}。
          {r.score.total > previous.score.total
            ? "前回の自分の点数を更新しました。"
            : "順位と点数の両方から、次の目標を決められます。"}
        </p>
      ) : (
        <p>
          この大会の最初の出場記録が残りました。次回も同じ基準で比較できます。
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>順位</th>
              <th>選手</th>
              <th>総合</th>
              <th>前回との差</th>
            </tr>
          </thead>
          <tbody>
            {r.standings.map((p) => (
              <tr key={p.id} className={p.id === "player" ? "player-row" : ""}>
                <td>{p.rank}</td>
                <td>
                  {p.name}
                  {p.id === "player" ? "（あなた）" : ""}
                </td>
                <td>{p.score.total.toFixed(2)}</td>
                <td>
                  {previous?.standings.some((x) => x.id === p.id)
                    ? signed(
                        r.score.total -
                          p.score.total -
                          (previous.score.total -
                            previous.standings.find((x) => x.id === p.id)!.score
                              .total),
                        2,
                      )
                    : "初対戦"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <small>
        前回との差は相手との点差の変化。参加・敗北による身体能力の自動加算はありません。結果は保存した当日の値です。
      </small>
      {onNext && (
        <button className="primary" onClick={onNext}>
          結果を踏まえて今日の作戦へ
        </button>
      )}
    </section>
  );
}
export function LocalCareer({
  c,
  busy,
  onChange,
  onNext,
}: {
  c: Career;
  busy: boolean;
  onChange: (c: Career | (() => Career)) => void;
  onNext: () => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const resultCount = useRef(c.local?.results.length ?? 0);
  useEffect(() => {
    const count = c.local?.results.length ?? 0;
    if (count !== resultCount.current) {
      setChosen(null);
      requestAnimationFrame(() =>
        document
          .getElementById("local-result")
          ?.scrollIntoView({ block: "start", behavior: "smooth" }),
      );
    }
    resultCount.current = count;
  }, [c.local?.results.length]);
  if (!c.local)
    return (
      <section className="paper">
        <h2>小さな大会から始める</h2>
        <p>
          現在の身体・日次記録・公式資格を保ち、今日から新しい架空大会の日程を追加します。
        </p>
        <button
          disabled={busy || !c.progress || c.athlete.status === "retired"}
          onClick={() => onChange(() => enableLocal(c))}
        >
          ローカル大会を追加する
        </button>
      </section>
    );
  const l = c.local,
    latest = l.results.find((r) => r.id === chosen) ?? l.results.at(-1),
    active = l.entries.find((e) => e.status === "entered");
  return (
    <>
      <section className="paper">
        <span className="eyebrow">START SMALL. BUILD YOUR STORY.</span>
        <h2>今の自分で、ステージへ。</h2>
        <p>
          以下はBULK
          LIFE独自の架空大会です。実在団体の資格には変換されません。優勝しなくても、記録と再挑戦の機会が残ります。
        </p>
        {active && (
          <div className="event">
            <h3>出場予定：{LOCAL_DEFS[active.series].name}</h3>
            <p>
              {dayDate(active.showDay)} · あと{active.showDay - c.athlete.day}日
              / 支払済 {yen(active.paid)}
            </p>
            <p>
              出場日は仕事と筋力練習を休み、大会に
              {LOCAL_DEFS[active.series].hours}
              時間を使います。睡眠・食事・補助練習は日次処理で記録します。
            </p>
            {c.athlete.day === active.showDay && (
              <button
                className="primary"
                disabled={busy || !!c.progress?.decision}
                onClick={() => onChange(() => runLocal(c, active.id))}
              >
                計量して大会の審査へ進む
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => onChange(() => withdrawLocal(c, active.id))}
            >
              今回は欠場する（返金なし）
            </button>
          </div>
        )}
        <p>
          実績：
          {l.results.length
            ? `ステージ出場 ${l.results.length}回 / 総合自己最高 ${Math.max(...l.results.map((r) => r.score.total)).toFixed(2)}点`
            : "最初のステージに向けて準備中"}
        </p>
        <div className="local-events">
          {localEditions(c)
            .filter((e) => e.deadlineDay >= c.athlete.day)
            .filter(
              (e, i, all) => all.findIndex((x) => x.series === e.series) === i,
            )
            .map((e) => {
              const def = LOCAL_DEFS[e.series],
                reasons = localEligibility(c, e),
                field = localField(c, e),
                scores = field.map((p) => scoreLocal(p).total);
              return (
                <article key={e.id}>
                  <span>{def.place}</span>
                  <h3>{def.name}</h3>
                  <b>
                    {dayDate(e.showDay)} / あと{e.showDay - c.athlete.day}日
                  </b>
                  <p>
                    締切 {dayDate(e.deadlineDay)}（当日含む） / {def.period}
                    日ごとに再開催
                  </p>
                  <p>
                    参加 {yen(def.fee)} + 移動 {yen(def.travel)} / 拘束
                    {def.hours}時間
                  </p>
                  <p>
                    {e.series === "gymMeet"
                      ? "経験制限なし・体重無差別"
                      : e.series === "rookieMeet"
                        ? "対象大会の出場経験5回未満・プロ資格前"
                        : "経験制限なし"}
                    {e.series !== "gymMeet" && " / 70kg以下・70〜85kg・85kg超"}
                  </p>
                  <p>
                    予定相手 {field.length}人 · 現在の総合点{" "}
                    {Math.min(...scores).toFixed(1)}〜
                    {Math.max(...scores).toFixed(1)}（当日まで各自成長）
                  </p>
                  <button
                    className="primary"
                    disabled={busy || reasons.length > 0}
                    onClick={() => onChange(() => enterLocal(c, e))}
                  >
                    この大会に申し込む
                  </button>
                  {reasons.map((x) => (
                    <small key={x}>{x}</small>
                  ))}
                  <details>
                    <summary>審査と参加予定の選手</summary>
                    <p>
                      筋量30%・バランス20%・仕上がり15%・ポージング25%・当日の状態10%。全員共通の式です。仕上がりは架空大会独自の幅を持つ基準です。
                    </p>
                    <p>
                      上位大会は「全国・国際の挑戦」で条件を確認できます。ここでの優勝は必要ありません。
                    </p>
                    {field.map((p) => (
                      <p key={p.id}>
                        {p.name} / {weight(p.body).toFixed(1)}kg /{" "}
                        {scoreLocal(p).total.toFixed(1)}点
                      </p>
                    ))}
                  </details>
                </article>
              );
            })}
        </div>
        <p className="muted">
          同時申込は1件。3人未満の階級はOpenへ統合します。CPUはプレイヤーの強さや敗北で調整されません。
        </p>
      </section>
      {latest && (
        <>
          <label className="paper">
            大会記録
            <select
              value={latest.id}
              onChange={(e) => setChosen(e.target.value)}
            >
              {l.results.map((r) => (
                <option key={r.id} value={r.id}>
                  {dayDate(r.day)} · {LOCAL_DEFS[r.series].name} · {r.rank}/
                  {r.count}位
                </option>
              ))}
            </select>
          </label>
          <LocalResultView
            model={c.versions.model}
            result={latest}
            onNext={onNext}
            previous={l.results
              .filter((r) => r.series === latest.series && r.day < latest.day)
              .at(-1)}
          />
        </>
      )}
    </>
  );
}
