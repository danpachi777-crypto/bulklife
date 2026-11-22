import { useState } from "react";
import { weight, type Career } from "../core/model";
import { nutritionPlan } from "../core/nutrition";
import { FOODS } from "../core/foods";
import { exerciseById } from "../core/exercises";
import { FOCUS_LABELS } from "../core/content";
import { todayTraining, formatDelta } from "../core/planning";
import { applyPlanScope, type PlanScope } from "../core/planScope";
import {
  GOALS,
  PRIORITIES,
  FOOD_STYLES,
  EFFORT,
  guideFor,
  proposeCoach,
  adoptCoach,
  coachReview,
  decideReview,
  weeklyCoach,
} from "../core/coach";
import type {
  CoachingGuide,
  CoachGoal,
  CoachSection,
} from "../core/coachTypes";
import { ModalSheet } from "./ModalSheet";
const sections: CoachSection[] = ["training", "food", "rest"];
export const sectionName = { training: "練習", food: "食事", rest: "休養" };
export const managerName = (c: Career, s: CoachSection) =>
  c.coachingGuide?.ownership[s] === "coach" ? "コーチ管理" : "手動設定";
export function menuSummary(c: Career) {
  if (c.progress?.mealMode !== "foods")
    return "エネルギーとたんぱく質の数値設定";
  const meals = c.progress.meals;
  return (
    [
      ["朝", 0, 11],
      ["昼", 11, 16],
      ["夜", 16, 24],
    ] as const
  )
    .map(([name, lo, hi]) => {
      const items = meals
        .filter((x) => x.time >= lo && x.time < hi)
        .map((x) => ({
          name: FOODS.find((f) => f.id === x.foodId)?.name ?? x.foodId,
          energy:
            ((FOODS.find((f) => f.id === x.foodId)?.kcal ?? 0) * x.grams) / 100,
        }))
        .sort((a, b) => b.energy - a.energy);
      return `${name}：${
        items
          .slice(0, 2)
          .map((x) => x.name)
          .join("・") || "未設定"
      }`;
    })
    .join(" / ");
}
export function CoachSetup({
  c,
  onChange,
}: {
  c: Career;
  onChange: (c: Career) => void;
}) {
  const g = guideFor(c),
    p = proposeCoach(c),
    set = (patch: Partial<CoachingGuide>) =>
      onChange({ ...c, coachingGuide: { ...g, ...patch } });
  return (
    <div className="coach-setup">
      <h3>どんな身体を目指す？</h3>
      <div className="coach-goals">
        {(Object.keys(GOALS) as CoachGoal[]).map((goal) => (
          <button
            type="button"
            key={goal}
            className={g.goal === goal ? "selected" : ""}
            aria-pressed={g.goal === goal}
            onClick={() => set({ goal })}
          >
            {GOALS[goal]}
          </button>
        ))}
      </div>
      <div className="coach-life">
        <label>
          練習に使える時間
          <select
            value={g.minutes}
            onChange={(e) => set({ minutes: Number(e.target.value) })}
          >
            {[15, 30, 45, 60, 90].map((n) => (
              <option key={n} value={n}>
                {n}分まで
              </option>
            ))}
          </select>
        </label>
        <label>
          1日の食費上限
          <select
            value={g.budget}
            onChange={(e) => set({ budget: Number(e.target.value) })}
          >
            {[300, 500, 850, 1200, 1800].map((n) => (
              <option key={n} value={n}>
                {n}円
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        最初の案：{FOCUS_LABELS[p.training.focus]} {Math.round(p.minutes)}分 /
        食費{p.food.cost}円 / 睡眠{p.sleep}時間
      </p>
      <p>{p.reason}</p>
      {(p.food.coverage < 0.9 || p.food.calories < p.food.target * 0.9) && (
        <p className="warning">
          この予算の案は目標に不足します。食事{p.food.calories} / 目標
          {p.food.target}kcal、たんぱく質充足{Math.round(p.food.coverage * 100)}
          %。開始後も食事を相談できます。
        </p>
      )}
      <small>
        選手の生活と身体を育て、小さな大会へ挑戦するゲームです。数値はゲーム上の推定です。
      </small>
    </div>
  );
}
export function CoachToday({
  c,
  busy,
  onConsult,
}: {
  c: Career;
  busy: boolean;
  onConsult: () => void;
}) {
  const t = todayTraining(c);
  const headline = t.awaiting
    ? "大会の受付・出場を確認しよう"
    : t.contest
      ? "今日は大会に合わせて身体を休める日"
      : t.injury
        ? "今日は違和感の回復を優先する日"
        : t.focus === "rest"
          ? "今日は身体を休める日"
          : `今日は${FOCUS_LABELS[t.focus]}を育てよう`;
  const reason = t.awaiting
    ? "キャリアで必要な判断を行うまで、日付の進行は停止します。"
    : t.contest || t.injury
      ? "筋力練習は実施しません。食事と睡眠を日次の結果へ記録します。"
      : t.focus === "rest"
        ? "筋力練習を休み、食事と睡眠を確保する計画です。"
        : c.coachingGuide?.ownership.training === "manual"
          ? "自分で決めた練習を実行します。コーチは上書きしません。"
          : `${Math.round(t.minutes)}分で${FOCUS_LABELS[t.focus]}を鍛える採用済み計画です。現在の疲労と使える時間から変更を相談できます。`;
  return (
    <div className="coach-today">
      <div>
        <span>{c.oneDayPlan ? "今日だけの設定" : "採用済みの計画"}</span>
        <h2>{headline}</h2>
        <p>{reason}</p>
      </div>
      <button
        disabled={busy || c.athlete.status === "retired"}
        onClick={onConsult}
      >
        相談・変更
      </button>
    </div>
  );
}
export function CoachConsult({
  c,
  initialSection,
  busy,
  onClose,
  onAdopt,
  onDetailed,
}: {
  c: Career;
  initialSection?: CoachSection;
  busy: boolean;
  onClose: () => void;
  onAdopt: (c: Career) => void;
  onDetailed: (s: CoachSection) => void;
}) {
  const [g, setG] = useState(() => guideFor(c)),
    [active, setActive] = useState<CoachSection>(initialSection ?? "training"),
    [preview, setPreview] = useState(false),
    [forceRest, setForceRest] = useState(false),
    [scope, setScope] = useState<PlanScope>("ongoing"),
    [changed, setChanged] = useState<CoachSection[]>([]);
  const appliedSections = changed.length ? changed : [active];
  const p = proposeCoach(c, g, forceRest, appliedSections),
    current = nutritionPlan(c),
    today = todayTraining(c),
    proteinTarget = weight(c.athlete.body) * 1.6;
  const pick = (patch: Partial<CoachingGuide>, section = active) => {
    setG({ ...g, ...patch });
    setChanged((a) => (a.includes(section) ? a : [...a, section]));
  };
  const choose = (s: CoachSection) => {
    setActive(s);
    setPreview(false);
  };
  const short = p.food.coverage < 0.9 || p.food.calories < p.food.target * 0.9;
  return (
    <ModalSheet
      title={`${sectionName[active]}の相談`}
      onClose={onClose}
      busy={busy}
      actions={
        <>
          <p className="save-summary">
            {preview
              ? `${scope === "today" ? "今日だけ" : "今後も継続"}：${changed.map((s) => sectionName[s]).join("・")}を変更して保存。他の項目は維持します。`
              : "希望を選んだら、変更内容を確認してください。"}
          </p>
          {preview ? (
            <>
              <button onClick={() => setPreview(false)}>
                希望の入力へ戻る
              </button>
              <button
                className="primary"
                disabled={busy || !changed.length}
                onClick={() =>
                  onAdopt(
                    applyPlanScope(
                      c,
                      adoptCoach(c, p, changed),
                      scope,
                      changed,
                    ),
                  )
                }
              >
                この内容を採用して保存
              </button>
            </>
          ) : (
            <button
              className="primary"
              disabled={busy}
              onClick={() => {
                if (!changed.length) setChanged([active]);
                setPreview(true);
              }}
            >
              提案と変更内容を確認
            </button>
          )}
        </>
      }
    >
      <div className="coach-consult">
        <nav className="section-tabs" aria-label="相談する内容">
          {sections.map((s) => (
            <button
              key={s}
              aria-pressed={active === s}
              className={active === s ? "active" : ""}
              onClick={() => choose(s)}
            >
              {sectionName[s]}
            </button>
          ))}
        </nav>
        {!preview ? (
          <>
            <p>
              現在は{managerName(c, active)}
              です。保存するまで今の計画は変わりません。
            </p>
            <label className="scope-choice">
              変更する期間
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as PlanScope)}
              >
                <option value="ongoing">今後もこの方針を継続</option>
                <option value="today">今日だけ変更・翌日は元の方針へ</option>
              </select>
            </label>
            {active === "training" && (
              <>
                <div className="coach-shortcuts">
                  <button onClick={() => pick({ minutes: 30 })}>
                    今日は30分しかない
                  </button>
                  <button
                    onClick={() => {
                      pick({ effort: "light" });
                      setForceRest(false);
                    }}
                  >
                    疲れている・軽めに
                  </button>
                  <button
                    aria-pressed={forceRest}
                    onClick={() => {
                      setForceRest(!forceRest);
                      setChanged((a) =>
                        a.includes("training") ? a : [...a, "training"],
                      );
                    }}
                  >
                    今日は筋力練習を休む
                  </button>
                </div>
                <div className="coach-life">
                  <label>
                    使える時間
                    <select
                      value={g.minutes}
                      onChange={(e) =>
                        pick({ minutes: Number(e.target.value) })
                      }
                    >
                      {[15, 30, 45, 60, 90].map((n) => (
                        <option key={n} value={n}>
                          {n}分まで
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    重点部位
                    <select
                      value={g.priority}
                      onChange={(e) =>
                        pick({
                          priority: e.target.value as CoachingGuide["priority"],
                        })
                      }
                    >
                      {Object.entries(PRIORITIES).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    負担
                    <select
                      value={g.effort}
                      onChange={(e) => {
                        pick({
                          effort: e.target.value as CoachingGuide["effort"],
                        });
                        setForceRest(false);
                      }}
                    >
                      {Object.entries(EFFORT).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}
            {active === "food" && (
              <>
                <div className="coach-life">
                  <label>
                    育成の目標
                    <select
                      value={g.goal}
                      onChange={(e) =>
                        pick({ goal: e.target.value as CoachingGuide["goal"] })
                      }
                    >
                      {Object.entries(GOALS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    1日の食費上限
                    <select
                      value={g.budget}
                      onChange={(e) => pick({ budget: Number(e.target.value) })}
                    >
                      {[300, 500, 850, 1200, 1800, 2400].map((n) => (
                        <option key={n} value={n}>
                          {n}円
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <h3>費用・手間・栄養を比べる</h3>
                <div className="coach-meal-choices">
                  {Object.entries(FOOD_STYLES).map(([style, label]) => {
                    const option = proposeCoach(
                      c,
                      { ...g, foodStyle: style as CoachingGuide["foodStyle"] },
                      forceRest,
                      appliedSections,
                    );
                    return (
                      <button
                        key={style}
                        aria-pressed={g.foodStyle === style}
                        className={g.foodStyle === style ? "selected" : ""}
                        onClick={() =>
                          pick({
                            foodStyle: style as CoachingGuide["foodStyle"],
                          })
                        }
                      >
                        <b>{label}</b>
                        <span>
                          {option.food.cost}円 / 準備
                          {Math.round(option.food.prep * 60)}分
                        </span>
                        <span>
                          {option.food.calories} / 目標{option.food.target}kcal
                        </span>
                        <span>
                          たんぱく質{option.food.protein} / 目標
                          {Math.round(proteinTarget)}g（
                          {Math.round(option.food.coverage * 100)}%）
                        </span>
                        <strong>
                          {option.food.coverage < 0.9 ||
                          option.food.calories < option.food.target * 0.9
                            ? "目標に不足"
                            : "目標に近い案"}
                        </strong>
                      </button>
                    );
                  })}
                </div>
                <p>
                  同じ食品データを使います。自炊は準備の手間、手軽な案はサービス費を加味します。同じ予算でも確保できる量と栄養が異なります。
                </p>
                <p className="coach-small">
                  不足はエネルギーまたはたんぱく質がゲーム内目標の90%未満の案を示します。たんぱく質充足の表示上限は100%で、グラム数は別に確認できます。
                </p>
              </>
            )}
            {active === "rest" && (
              <p>
                睡眠の提案は{p.sleep}
                時間。仕事、食事準備、練習、補助練習を24時間へ収める案です。今夜の睡眠は翌日の回復に使います。
              </p>
            )}
            <button onClick={() => onDetailed(active)}>
              自分で{sectionName[active]}を細かく設定
            </button>
          </>
        ) : (
          <section className="coach-proposal" aria-label="採用前の変更確認">
            <span className="proposal-label">まだ未採用の提案</span>
            <h3>今回変わる項目</h3>
            {changed.map((s) => (
              <div className="proposal-section" key={s}>
                <h4>
                  {sectionName[s]}：{managerName(c, s)} → コーチ管理
                  {scope === "today" ? "（今日だけ）" : ""}
                </h4>
                {s === "training" ? (
                  <>
                    <p>
                      {FOCUS_LABELS[today.focus]} {Math.round(today.minutes)}分
                      → {FOCUS_LABELS[p.training.focus]} {Math.round(p.minutes)}
                      分・{EFFORT[g.effort]}
                    </p>
                    <p>{p.reason}</p>
                    <p>
                      {p.training.exercises
                        ?.map(
                          (x) =>
                            `${exerciseById(x.exerciseId)?.name} ${x.sets}セット`,
                        )
                        .join(" / ") || "筋力練習なし"}
                    </p>
                    <p>
                      {g.minutes <= 30
                        ? "時間に合わせて種目とセット数を絞ります。"
                        : ""}
                      軽めは刺激と疲労を抑え、しっかりは負担を多く引き受ける設定です。
                    </p>
                  </>
                ) : s === "food" ? (
                  <>
                    <p>
                      食費 {Math.round(current.cost)} → {p.food.cost}円 / 準備
                      {Math.round(current.prep * 60)} →{" "}
                      {Math.round(p.food.prep * 60)}分
                    </p>
                    <p>
                      エネルギー {p.food.calories} / 目標{p.food.target}kcal
                    </p>
                    <p>
                      たんぱく質 {p.food.protein} / 目標
                      {Math.round(proteinTarget)}g（
                      {Math.round(p.food.coverage * 100)}%）
                    </p>
                    {short && (
                      <p className="warning">
                        <b>この案は目標に不足します</b>
                        <br />
                        食費上限で量を減らしています。食費を増やすか、自炊の案を比較できます。不足を承知で採用することもできます。
                      </p>
                    )}
                    <p>{p.food.reason}</p>
                    <details>
                      <summary>具体的な献立と量</summary>
                      {[7.5, 12.5, 19].map((t) => (
                        <p key={t}>
                          {t}時：
                          {p.food.items
                            .filter((x) => x.time === t)
                            .map(
                              (x) =>
                                `${FOODS.find((f) => f.id === x.foodId)?.name} ${x.grams}g`,
                            )
                            .join("・")}
                        </p>
                      ))}
                    </details>
                  </>
                ) : (
                  <p>
                    睡眠 {c.plan.sleep} → {p.sleep}時間。
                  </p>
                )}
                <button
                  onClick={() => setChanged((a) => a.filter((x) => x !== s))}
                >
                  今回は{sectionName[s]}を変更しない
                </button>
              </div>
            ))}
            <p>
              数値はゲーム内の育成支援用です。プレイヤー本人への栄養・医療指導ではありません。
            </p>
          </section>
        )}
      </div>
    </ModalSheet>
  );
}
export function CoachReview({
  c,
  busy,
  onChange,
}: {
  c: Career;
  busy: boolean;
  onChange: (c: Career) => void;
}) {
  const r = coachReview(c);
  return r ? (
    <section className="paper coach-review">
      <h3>2週間の記録から、食事の見直し案</h3>
      <p>{r.message}</p>
      <p>今の食事は自動で変えません。</p>
      <div className="button-row">
        {!!r.adjustment && (
          <button
            className="primary"
            disabled={busy}
            onClick={() => onChange(decideReview(c, true))}
          >
            提案を採用
          </button>
        )}
        <button
          disabled={busy}
          onClick={() => onChange(decideReview(c, false))}
        >
          今の計画を続ける
        </button>
      </div>
    </section>
  ) : null;
}
export function CoachWeek({
  c,
  onRecords,
}: {
  c: Career;
  onRecords: () => void;
}) {
  const w = weeklyCoach(c);
  return w ? (
    <section className="paper coach-week">
      <h3>直近1週間の振り返り</h3>
      <p>
        練習{w.days}日 / {w.sets}・予定{w.planned}セット。睡眠平均
        {w.sleep.toFixed(1)}時間。
      </p>
      <p>
        体重差 {formatDelta(w.delta, 2, "kg")} / 筋質量差{" "}
        {formatDelta(w.muscle, 3, "kg")}
      </p>
      <p>{w.message}</p>
      <button onClick={onRecords}>身体の推移と記録を見る</button>
    </section>
  ) : null;
}
