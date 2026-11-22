import { useState } from "react";
import type { Career, Focus } from "../core/model";
import {
  EXERCISES,
  exerciseRecipe,
  sessionMinutes,
  exerciseById,
  loadSpec,
} from "../core/exercises";
import { progressivePlan } from "../core/training";
import { LABELS } from "../core/model";
import { FOCUS_LABELS } from "../core/content";
import { Numeric } from "./Forms";
import { BodyView } from "../view/BodyView";
export function TrainingScreen({
  career: c,
  onChange,
  busy,
  todayOnly = false,
  onAuxiliary,
}: {
  career: Career;
  onChange: (c: Career | (() => Career)) => void;
  busy: boolean;
  todayOnly?: boolean;
  onAuxiliary?: () => void;
}) {
  const [chosenDay, setDay] = useState(c.athlete.day % 7),
    [selected, setSelected] = useState("bench");
  const day = todayOnly ? c.athlete.day % 7 : chosenDay;
  const d = c.plan.days[day],
    e = exerciseById(selected)!;
  const demonstration =
    selected === "ohp"
      ? {
          clip: "TrainingPress",
          part: "frontDelts" as const,
          label: "立位オーバーヘッドプレス",
        }
      : selected === "squat"
        ? {
            clip: "TrainingSquat",
            part: "quads" as const,
            label: "自重スクワット（荷重の実演ではありません）",
          }
        : null;
  const setExercises = (exercises: NonNullable<typeof d.exercises>) =>
    onChange({
      ...c,
      plan: {
        ...c.plan,
        days: c.plan.days.map((x, i) =>
          i === day
            ? {
                ...x,
                exercises,
                focus: exercises.length
                  ? x.focus === "rest"
                    ? "full"
                    : x.focus
                  : "rest",
              }
            : x,
        ),
      },
    });
  const detail = d.exercises ?? [];
  const actual = c.lastSummary?.training.exercises;
  return (
    <>
      <section className="paper">
        <div className="section-heading">
          <div>
            <span className="eyebrow">TRAIN WITH INTENT</span>
            <h2>{todayOnly ? "今日だけの練習" : "今日と今週の練習"}</h2>
          </div>
          <button
            disabled={busy}
            onClick={() =>
              onChange(
                progressivePlan(
                  {
                    ...c,
                    plan: {
                      ...c.plan,
                      days: c.plan.days.map((x, i) =>
                        todayOnly && i !== day
                          ? x
                          : {
                              ...x,
                              exercises:
                                x.exercises ?? exerciseRecipe(x.focus, 2),
                            },
                      ),
                    },
                  },
                  todayOnly ? day : undefined,
                ),
              )
            }
          >
            現在の能力から重量を提案
          </button>
        </div>
        <details>
          <summary>練習の組み方を確認</summary>
          <p>
            重量、回数、RIRを同時に達成できるとは限りません。余力を優先するか、固定重量で回数を狙うかを選びます。実際に行えたセットだけが身体へ反映されます。
          </p>
        </details>
        <div className="button-row training-days">
          {["月", "火", "水", "木", "金", "土", "日"].map((name, i) => (
            <button
              key={i}
              className={day === i ? "selected" : ""}
              disabled={todayOnly && i !== day}
              onClick={() => setDay(i)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="fields spaced">
          <label>
            この日の方針
            <select
              disabled={busy}
              value={d.focus}
              onChange={(event) => {
                const focus = event.target.value as Focus;
                onChange({
                  ...c,
                  plan: {
                    ...c.plan,
                    days: c.plan.days.map((x, i) =>
                      i === day
                        ? { ...x, focus, exercises: exerciseRecipe(focus, 2) }
                        : x,
                    ),
                  },
                });
              }}
            >
              {Object.entries(FOCUS_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Numeric
            label="開始時刻"
            value={d.start}
            min={7.5}
            max={23}
            step={0.5}
            disabled={busy}
            onCommit={(start) =>
              onChange({
                ...c,
                plan: {
                  ...c.plan,
                  days: c.plan.days.map((x, i) =>
                    i === day ? { ...x, start } : x,
                  ),
                },
              })
            }
          />
        </div>
        {!d.exercises && (
          <div className="tutorial">
            <p>
              この日は部位別の簡単計画です。詳細計画へ変更すると、種目ごとの実績を記録します。
            </p>
            <button
              disabled={busy}
              onClick={() => setExercises(exerciseRecipe(d.focus, 2))}
            >
              種目別の計画にする
            </button>
          </div>
        )}
        <p>
          目安：
          {d.focus === "rest"
            ? 0
            : d.exercises
              ? Math.round(sessionMinutes(detail))
              : Math.round((0.3 + d.sets * 0.18) * 60)}
          分（ウォームアップ・休憩を含む）
        </p>
        <div className="exercise-list">
          {detail.map((x, i) => {
            const exercise = exerciseById(x.exerciseId)!;
            const edit = (patch: Partial<typeof x>) =>
              setExercises(
                detail.map((v, j) => (j === i ? { ...v, ...patch } : v)),
              );
            return (
              <article className="exercise-row" key={i}>
                <div className="exercise-title">
                  <b>
                    {i + 1}. {exercise.name}
                  </b>
                  <div>
                    <button
                      disabled={busy || i === 0}
                      onClick={() => {
                        const copy = [...detail];
                        [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                        setExercises(copy);
                      }}
                    >
                      上へ
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        setExercises(detail.filter((_, j) => j !== i))
                      }
                    >
                      外す
                    </button>
                  </div>
                </div>
                <div className="exercise-fields">
                  <Numeric
                    label={loadSpec(exercise, x.load).label}
                    value={x.load}
                    min={0.5}
                    max={500}
                    step={loadSpec(exercise, x.load).step}
                    onCommit={(load) => edit({ load })}
                    disabled={busy}
                  />
                  <Numeric
                    label="目標回数"
                    value={x.reps}
                    min={1}
                    max={30}
                    onCommit={(reps) => edit({ reps: Math.round(reps) })}
                    disabled={busy}
                  />
                  <Numeric
                    label="セット"
                    value={x.sets}
                    min={1}
                    max={8}
                    onCommit={(sets) => edit({ sets: Math.round(sets) })}
                    disabled={busy}
                  />
                </div>
                <details className="exercise-advanced">
                  <summary>詳細：余力・休憩・可動域</summary>
                  <p>
                    余力は、あと何回できるかのゲーム設定です。軽め＝5、標準＝3、しっかり＝2。可動域比1は十分な範囲を表します。
                  </p>
                  <div className="exercise-fields">
                    <Numeric
                      label="余力 RIR"
                      value={x.rir}
                      min={0}
                      max={6}
                      onCommit={(rir) => edit({ rir: Math.round(rir) })}
                      disabled={busy}
                    />
                    <Numeric
                      label="休憩 秒"
                      value={x.rest}
                      min={15}
                      max={600}
                      step={15}
                      onCommit={(rest) => edit({ rest })}
                      disabled={busy}
                    />
                    <Numeric
                      label="可動域比"
                      value={x.rom}
                      min={0.5}
                      max={1}
                      step={0.1}
                      onCommit={(rom) => edit({ rom })}
                      disabled={busy}
                    />
                    <label>
                      優先するもの
                      <select
                        value={x.priority}
                        disabled={busy}
                        onChange={(e) =>
                          edit({ priority: e.target.value as "rir" | "load" })
                        }
                      >
                        <option value="rir">RIRを守り重量を調整</option>
                        <option value="load">固定重量で回数を狙う</option>
                      </select>
                    </label>
                  </div>
                </details>
                <small>
                  {loadSpec(exercise, x.load).note} 主な対象：
                  {Object.entries(exercise.direct)
                    .filter(([, v]) => v >= 0.5)
                    .map(([p]) => LABELS[p as keyof typeof LABELS])
                    .join("・")}{" "}
                  / 必要設備：
                  {
                    (
                      {
                        free: "フリーウェイト",
                        cable: "ケーブル",
                        machine: "マシン",
                        bodyweight: "懸垂設備",
                      } as const
                    )[exercise.equipment]
                  }
                </small>
              </article>
            );
          })}
        </div>
        <div className="button-row">
          <label>
            追加する種目
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              {EXERCISES.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={busy || detail.length >= 24}
            onClick={() =>
              setExercises([
                ...detail,
                {
                  exerciseId: e.id,
                  load: e.baseLoad,
                  reps: 10,
                  sets: 2,
                  rir: 3,
                  rest: 90,
                  rom: 1,
                  priority: "rir",
                },
              ])
            }
          >
            この種目を追加
          </button>
        </div>
        <details>
          <summary>この種目の主働・補助部位と設備</summary>
          <p>
            {e.name} / {e.equipment}
          </p>
          <p>
            主働：
            {Object.entries(e.direct)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => `${LABELS[k as keyof typeof LABELS]} ${v}`)
              .join("、")}
          </p>
          <p>
            補助：
            {Object.entries(e.indirect)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => `${LABELS[k as keyof typeof LABELS]} ${v}`)
              .join("、")}
          </p>
          <p className="muted">
            配分はゲーム係数。完全な部位の独立を意味しません。
          </p>
        </details>
      </section>
      {actual && (
        <section className="paper">
          <h2>直近の練習実績</h2>
          {actual.map((x, i) => (
            <article key={i}>
              <h3>{exerciseById(x.exerciseId)?.name}</h3>
              <p>
                {x.reason} / {x.sets.length} / {x.plannedSets}セット
              </p>
              <p>
                {x.sets
                  .map(
                    (s, i) =>
                      `${i + 1}：${s.load}kg × ${s.reps}回 / RIR ${s.rir} / フォーム ${(s.quality * 100).toFixed(0)}%`,
                  )
                  .join("、")}
              </p>
            </article>
          ))}
        </section>
      )}
      {c.progress && (
        <section className="paper">
          <h2>技術と補助練習</h2>
          <p>
            ポージング {c.progress.posingMinutes}分・有酸素{" "}
            {c.progress.cardioMinutes}分 /
            日。いずれも24時間の予定に含まれます。
          </p>
          {onAuxiliary && (
            <button onClick={onAuxiliary}>休養・補助練習の設定を開く</button>
          )}
          {!onAuxiliary && (
            <p>
              練習の変更を保存してから、休養パネルで補助練習を編集できます。
            </p>
          )}
          <p>
            ポージング技術 {(c.progress.posing * 100).toFixed(1)} /
            100。いずれも24時間の予定に含まれます。
          </p>
          <details>
            <summary>練習動作を3Dで見る</summary>
            {demonstration ? (
              <>
                <p>{demonstration.label}</p>
                <BodyView
                  model={c.versions.model}
                  body={c.athlete.body}
                  selected={demonstration.part}
                  stage="gym"
                  defaultClip={demonstration.clip}
                />
              </>
            ) : (
              <p>
                この種目に対応する実演は準備していません。説明と対象部位を確認できます。
              </p>
            )}
          </details>
          <p className="muted">
            実演は対応する動作がある種目だけに表示します。重量・姿勢はゲーム内の説明用で、現実の運動指導ではありません。
          </p>
        </section>
      )}
    </>
  );
}
