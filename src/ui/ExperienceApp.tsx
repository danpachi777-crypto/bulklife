import { useEffect, useRef, useState } from "react";
import {
  PARTS,
  LABELS,
  VERSIONS,
  muscleMass,
  weight,
  type Career,
  type Library,
  type Part,
  type DailySummary,
  type Focus,
} from "../core/model";
import {
  advance,
  drawDraft,
  freshLibrary,
  planIssues,
  gameDate,
} from "../core/simulation";
import {
  loadLibrary,
  loadCareer,
  save,
  readLogs,
  exportSave,
  parseImport,
  importSave,
} from "../core/storage";
import { acknowledgeDecision } from "../core/competitions";
import { enableCareer } from "../core/progress";
import { FOCUS_LABELS } from "../core/content";
import { exerciseRecipe } from "../core/exercises";
import { nutritionPlan } from "../core/nutrition";
import { CareerScreen } from "./CareerScreen";
import { TrainingScreen } from "./TrainingScreen";
import { FoodLifeScreen } from "./FoodLifeScreen";
import { Numeric } from "./Forms";
import {
  Today,
  DayResult,
  LocalCareer,
  LocalResultView,
  OBJECTIVES,
  yen,
  dayDate,
  signed,
} from "./Experience";
import { createLocal, LOCAL_DEFS } from "../core/localCompetitions";
import { draftAutosave } from "../core/draftAutosave";
import "./experience.css";
type Tab = "today" | "plan" | "career" | "records" | "settings";
type Panel = { kind: "training" | "food" | "rest"; value: Career } | null;
const seed = () => crypto.getRandomValues(new Uint32Array(1))[0] || 1;
const id = () => "bl-" + crypto.randomUUID();
const NAV = [
  ["today", "今日"],
  ["plan", "週間計画"],
  ["career", "キャリア"],
  ["records", "記録"],
] as const;
export function App() {
  const [lib, setLib] = useState<Library | null>(null),
    [career, setCareer] = useState<Career | null>(null),
    [tab, setTab] = useState<Tab>("today"),
    [part, setPart] = useState<Part>("chest"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [logs, setLogs] = useState<DailySummary[]>([]),
    [roster, setRoster] = useState<Career[]>([]),
    [panel, setPanel] = useState<Panel>(null),
    [result, setResult] = useState<DailySummary | null>(null),
    [careerArea, setCareerArea] = useState<"local" | "official" | "roster">(
      "local",
    );
  const lock = useRef(false),
    draftQueue = useRef<ReturnType<typeof draftAutosave<Library>> | null>(null),
    file = useRef<HTMLInputElement>(null);
  if (!draftQueue.current)
    draftQueue.current = draftAutosave(
      (l) => save(l),
      (e) => setError(String(e)),
    );
  const run = async (fn: () => Promise<void>, replacesLibrary = false) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await (replacesLibrary
        ? draftQueue.current!.takeOver()
        : draftQueue.current!.drain());
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    void run(async () => {
      let l = await loadLibrary();
      if (!l || (!l.activeId && !l.draft)) {
        l = drawDraft(l ?? freshLibrary(seed(), seed()), id());
        await save(l);
      }
      setLib(l);
      if (l.activeId) setCareer(await loadCareer(l.activeId));
    });
  }, []);
  useEffect(() => {
    if (!lib?.draft || !lib.draft.athlete.name.trim()) return;
    draftQueue.current!.schedule(lib);
    return () => draftQueue.current!.cancelPending();
  }, [lib]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab, career?.athlete.id, result?.day]);
  useEffect(() => {
    if (!lib) return;
    if (tab === "career" && careerArea === "roster")
      void run(async () =>
        setRoster(await Promise.all(lib.ids.map(loadCareer))),
      );
    if (tab === "records" && career)
      void run(async () => setLogs(await readLogs(career.athlete.id)));
  }, [tab, careerArea, career?.athlete.id]);
  useEffect(() => {
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel(null);
        previous?.focus();
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".edit-panel button:not([disabled]),.edit-panel input:not([disabled]),.edit-panel select:not([disabled])",
          ),
        );
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    document.querySelector<HTMLElement>(".edit-panel button")?.focus();
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [!!panel]);
  const draft = lib?.draft ?? null,
    shown = draft ?? career;
  const commit = async (c: Career, extra: DailySummary[] = []) => {
    if (!lib) return;
    await save(lib, c, extra);
    setCareer(c);
    setNotice("保存済み");
  };
  const changeCareer = (value: Career | (() => Career)) => {
    if (career?.athlete.status === "retired") return;
    void run(async () => {
      await commit(typeof value === "function" ? value() : value);
    });
  };
  const step = (days: number) => {
    if (!career) return;
    void run(async () => {
      const next = advance(career, days);
      await commit(next.career, next.logs);
      setResult(next.logs.at(-1) ?? null);
      setNotice(
        `${next.logs.length}日分の実績を保存しました${next.career.pendingEvent ? "。重要な判断で停止しました" : ""}`,
      );
    });
  };
  const reroll = () => {
    if (!lib) return;
    void run(async () => {
      const next = drawDraft(lib, id());
      await save(next);
      setLib(next);
      setTab("today");
      setResult(null);
    }, true);
  };
  const start = () => {
    if (!lib || !draft) return;
    void run(async () => {
      const next = {
        ...lib,
        draft: null,
        activeId: draft.athlete.id,
        ids: [...lib.ids, draft.athlete.id],
      };
      const started = draft.local
        ? draft
        : { ...draft, local: createLocal(draft) };
      await save(next, started);
      setLib(next);
      setCareer(started);
      setTab("today");
    }, true);
  };
  const exportData = () => {
    if (!lib) return;
    void run(async () => {
      const data = await exportSave(lib),
        url = URL.createObjectURL(
          new Blob([data], { type: "application/json" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "BULK-LIFE-save.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setNotice("全キャリアと抽選中の選手を書き出しました");
    });
  };
  const importData = (f: File) => {
    if (!lib) return;
    void run(async () => {
      const next = await importSave(parseImport(await f.text()), lib);
      setLib(next);
      if (next.activeId) setCareer(await loadCareer(next.activeId));
      setRoster(await Promise.all(next.ids.map(loadCareer)));
      setTab("career");
      setCareerArea("roster");
      setResult(null);
      setNotice("既存選手を残して別枠に読み込みました");
    }, true);
  };
  const openPanel = (kind: NonNullable<Panel>["kind"]) => {
    if (career) {
      setError("");
      setPanel({ kind, value: structuredClone(career) });
    }
  };
  const panelChange = (value: Career | (() => Career)) => {
    try {
      const next = typeof value === "function" ? value() : value;
      setPanel((p) => (p ? { ...p, value: next } : p));
    } catch (e) {
      setError(String(e));
    }
  };
  if (!lib || !shown)
    return (
      <main className="startup">
        <div className="wordmark">
          BULK <em>LIFE</em>
        </div>
        <p>{error || "選手の記録を読み込み中…"}</p>
        {error && <button onClick={() => location.reload()}>再試行</button>}
      </main>
    );
  const a = shown.athlete,
    retired = a.status === "retired";
  return (
    <div className="experience-app">
      <aside className="main-nav">
        <button
          className="wordmark"
          onClick={() => {
            setTab("today");
            setResult(null);
          }}
        >
          BULK <em>LIFE</em>
          <small>その選択が、身体になる。</small>
        </button>
        <nav aria-label="主要メニュー">
          {NAV.map(([key, name], i) => (
            <button
              disabled={busy}
              className={tab === key ? "active" : ""}
              key={key}
              onClick={() => {
                setTab(key);
                setResult(null);
              }}
            >
              <span>0{i + 1}</span>
              {name}
            </button>
          ))}
        </nav>
        <button
          className={tab === "settings" ? "active" : ""}
          disabled={busy}
          onClick={() => {
            setTab("settings");
            setResult(null);
          }}
        >
          知識・設定
        </button>
        <small className="save-state" role="status">
          {busy ? "処理・保存中…" : notice || "このブラウザーに保存"}
        </small>
      </aside>
      <main className="experience-main">
        <header className="career-header">
          <div>
            <span className="eyebrow">
              {draft ? "YOUR STORY STARTS HERE" : "BULK LIFE / YOUR CAREER"}
            </span>
            <h1>
              {draft
                ? "ひとりの選手と、長いキャリアを。"
                : `${a.name}のキャリア　${Math.floor(a.day / 7) + 1}週目・${["月", "火", "水", "木", "金", "土", "日"][a.day % 7]}曜日`}
            </h1>
            <p>
              {draft
                ? "練習・食事・休養を決め、身体を育て、小さな大会から挑戦しましょう。"
                : `目標：${OBJECTIVES[shown.objective ?? "contest"]}`}
            </p>
          </div>
          <div className="header-resources">
            <b>{yen(a.life.money)}</b>
            <span>
              {gameDate(a.day).toLocaleDateString("ja-JP", { timeZone: "UTC" })}{" "}
              · {retired ? "引退" : "現役"}
            </span>
          </div>
        </header>
        {error && (
          <div className="error" role="alert">
            {error}
            <button onClick={() => setError("")}>閉じる</button>
          </div>
        )}
        {draft && (
          <section className="draft-banner">
            <div>
              <b>
                抽選された選手：{a.profileId} / {a.profileTitle}
              </b>
              <span>6種類から毎回1/6。得意なことと生活条件が違います。</span>
              <label>
                選手名
                <input
                  maxLength={32}
                  value={a.name}
                  onChange={(e) =>
                    setLib({
                      ...lib,
                      draft: {
                        ...draft,
                        athlete: { ...a, name: e.target.value },
                      },
                    })
                  }
                />
              </label>
              <label>
                髪型
                <select
                  value={a.appearance.hair}
                  onChange={(e) =>
                    setLib({
                      ...lib,
                      draft: {
                        ...draft,
                        athlete: {
                          ...a,
                          appearance: {
                            ...a.appearance,
                            hair: Number(e.target.value),
                          },
                        },
                      },
                    })
                  }
                >
                  <option value={0}>クロップ</option>
                  <option value={1}>ショート</option>
                </select>
              </label>
            </div>
            <div className="button-row">
              <button disabled={busy} onClick={reroll}>
                もう一度抽選
              </button>
              {lib.activeId && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const next = { ...lib, draft: null };
                      await save(next);
                      setLib(next);
                    }, true)
                  }
                >
                  今の選手へ戻る
                </button>
              )}
              <button disabled={busy} onClick={exportData}>
                保存を書き出す
              </button>
              <button disabled={busy} onClick={() => file.current?.click()}>
                保存を読み込む
              </button>
              <button
                className="primary"
                disabled={busy || !a.name.trim()}
                onClick={start}
              >
                この選手で始める →
              </button>
            </div>
          </section>
        )}
        {!draft && shown.pendingEvent && (
          <section className="event" role="alert">
            <b>進行を一時停止しています</b>
            <p>{shown.pendingEvent}</p>
            <button
              onClick={() => {
                setTab("career");
                setCareerArea(shown.local?.decision ? "local" : "official");
                setResult(null);
              }}
            >
              必要な判断を開く
            </button>
            {!shown.local?.decision && !shown.progress?.decision && (
              <button
                disabled={busy}
                onClick={() => changeCareer(() => acknowledgeDecision(shown))}
              >
                内容を確認して再開を許可
              </button>
            )}
          </section>
        )}
        {!draft && !shown.progress && (
          <section className="tutorial">
            <p>
              身体・記録を保ち、競技キャリアと詳細な生活設定を追加できます。
            </p>
            <button
              disabled={busy || retired}
              onClick={() => changeCareer(enableCareer(shown))}
            >
              競技キャリアを追加
            </button>
          </section>
        )}
        {result && !draft ? (
          <DayResult
            summary={result}
            onNext={() => {
              setResult(null);
              setTab("today");
            }}
          />
        ) : (
          (tab === "today" || draft) && (
            <Today
              c={shown}
              draft={!!draft}
              busy={busy}
              part={part}
              setPart={setPart}
              onEdit={openPanel}
              onStep={() => step(1)}
              onTab={setTab}
              onChange={changeCareer}
            />
          )
        )}
        {!draft && !result && tab === "plan" && (
          <Weekly
            c={shown}
            busy={busy}
            onChange={changeCareer}
            onEdit={openPanel}
            onStep={() => step(7)}
          />
        )}
        {!draft && !result && tab === "career" && (
          <>
            <div className="section-tabs">
              {(
                [
                  ["local", "小さな大会"],
                  ["official", "全国・国際の挑戦 / 引退"],
                  ["roster", "選手一覧"],
                ] as const
              ).map(([key, name]) => (
                <button
                  key={key}
                  className={careerArea === key ? "active" : ""}
                  onClick={() => setCareerArea(key)}
                >
                  {name}
                </button>
              ))}
            </div>
            {careerArea === "local" && (
              <LocalCareer
                c={shown}
                busy={busy}
                onChange={changeCareer}
                onNext={() => setTab("today")}
              />
            )}
            {careerArea === "official" && (
              <CareerScreen
                career={shown}
                onChange={changeCareer}
                onAdvance={step}
                onNew={reroll}
                busy={busy}
              />
            )}
            {careerArea === "roster" && (
              <section className="paper">
                <div className="section-heading">
                  <h2>育ててきた選手たち</h2>
                  <button className="primary" disabled={busy} onClick={reroll}>
                    新しい選手を抽選
                  </button>
                </div>
                <p>現在の選手の身体と記録は残ります。</p>
                <div className="roster">
                  {roster.map((c) => (
                    <article key={c.athlete.id}>
                      <small>
                        {c.athlete.profileId} /{" "}
                        {c.athlete.status === "retired" ? "引退" : "育成中"}
                      </small>
                      <h3>{c.athlete.name}</h3>
                      <p>
                        {c.athlete.profileTitle} / {c.athlete.day}日経過
                      </p>
                      <button
                        disabled={busy || lib.activeId === c.athlete.id}
                        onClick={() =>
                          void run(async () => {
                            const next = { ...lib, activeId: c.athlete.id };
                            await save(next);
                            setLib(next);
                            setCareer(c);
                            setTab("today");
                          })
                        }
                      >
                        {lib.activeId === c.athlete.id
                          ? "現在の選手"
                          : "この選手を開く"}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
        {!draft && !result && tab === "records" && (
          <Records
            c={shown}
            logs={logs}
            part={part}
            setPart={setPart}
            onSelect={setResult}
          />
        )}
        {!draft && !result && tab === "settings" && (
          <>
            <section className="paper">
              <h2>保存・再開</h2>
              <p>
                このブラウザーのIndexedDBへ、日次実績と選手を一緒に保存します。読み込みは既存の選手を消さず、別枠へ追加します。
              </p>
              <div className="button-row">
                <button disabled={busy} onClick={exportData}>
                  全キャリアを書き出す
                </button>
                <button disabled={busy} onClick={() => file.current?.click()}>
                  保存ファイルを読み込む
                </button>
                <button
                  disabled={busy}
                  onClick={() => void run(() => commit(shown))}
                >
                  手動保存
                </button>
                <button
                  disabled={busy || retired}
                  onClick={() => {
                    changeCareer({ ...shown, tutorialHidden: false });
                    setTab("today");
                  }}
                >
                  最初の案内を再表示
                </button>
              </div>
              <p>
                保存版 {VERSIONS.schema} / 計算 {shown.versions.simulation} /
                モデル {shown.versions.model}
              </p>
              {shown.versions.model === "athlete-v1" && (
                <>
                  <p>
                    新しい人体モデルへ切り替えられます。変更するのは見た目の参照だけで、身体値・資格・乱数・記録は保持します。
                  </p>
                  <button
                    disabled={busy || retired}
                    onClick={() =>
                      changeCareer({
                        ...shown,
                        versions: {
                          ...VERSIONS,
                          model: "athlete-v2",
                          mapping: "regions-v2",
                        },
                      })
                    }
                  >
                    新しい人体モデルを使う
                  </button>
                </>
              )}
            </section>
            <section className="paper">
              <h2>身体と育成の考え方</h2>
              <p>
                練習の刺激、食事、前夜の回復、成長余地を組み合わせて身体を計算します。セットを増やすほど刺激は逓減し、疲労が残ります。筋質量、脂肪、動作習熟、ポージング、一時的なパンプは別々の値です。
              </p>
              <p>
                日々の小さな変化より数週間・数か月の推移で成長を確かめましょう。身体値・成長係数・費用・採点はゲーム用の推定値で、現実の測定や成長予測ではありません。
              </p>
              <h3>大会と資格</h3>
              <p>
                ジム・地域・地方の3大会はゲーム独自の架空体系です。全国・国際の挑戦は既存の公式資料を参照した架空シーズンを維持しています。実際の開催日・費用・出場許可とは異なり、団体間で資格を自動変換しません。
              </p>
              <h3>操作と3D</h3>
              <p>
                今日のカードから編集し、「保存して今日へ戻る」で設定を確定します。3Dはドラッグで回転、部位をクリックして詳細を確認。正面・側面・背面ボタンと、ポーズ・画質選択があります。読み込みに失敗しても数値の育成を続けられます。
              </p>
              <p>
                人体の土台にはMakeHumanのCC0人体データを使用し、ゲーム用の形状・モーフ・骨格・衣装を制作しています。素材と制作手順はリポジトリの制作記録に記載します。
              </p>
            </section>
          </>
        )}
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            if (e.target.files?.[0]) importData(e.target.files[0]);
            e.target.value = "";
          }}
        />
        <footer>
          BULK LIFE <span>その選択が、身体になる。</span>
          <small>LOCAL SAVE / 0.3</small>
        </footer>
      </main>
      {panel && (
        <div className="panel-scrim">
          <section
            className="edit-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`${panel.kind === "training" ? "練習" : panel.kind === "food" ? "食事" : "休養"}の編集`}
          >
            <header>
              <div>
                <span className="eyebrow">EDIT YOUR STRATEGY</span>
                <h2>
                  {panel.kind === "training"
                    ? "今日と今週の練習"
                    : panel.kind === "food"
                      ? "食事・生活を選ぶ"
                      : "休養と補助練習を決める"}
                </h2>
              </div>
              <button disabled={busy} onClick={() => setPanel(null)}>
                変更を破棄して閉じる
              </button>
            </header>
            <div className="panel-content">
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              {panel.kind === "training" ? (
                <TrainingScreen
                  career={panel.value}
                  onChange={panelChange}
                  busy={busy}
                />
              ) : panel.kind === "food" ? (
                <>
                  <AggregateFood
                    c={panel.value}
                    onChange={panelChange}
                    busy={busy}
                  />
                  <FoodLifeScreen
                    career={panel.value}
                    onChange={panelChange}
                    busy={busy}
                  />
                </>
              ) : (
                <Rest c={panel.value} busy={busy} onChange={panelChange} />
              )}
            </div>
            <div className="panel-actions">
              <p>保存するまで実際の設定には反映されません。</p>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await commit(panel.value);
                    setPanel(null);
                    setTab("today");
                  })
                }
              >
                保存して今日へ戻る →
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function Rest({
  c,
  onChange,
  busy,
}: {
  c: Career;
  onChange: (c: Career) => void;
  busy: boolean;
}) {
  return (
    <section className="paper">
      <h3>睡眠と追加の活動</h3>
      <div className="fields">
        <Numeric
          label="睡眠 / 時間"
          value={c.plan.sleep}
          min={3}
          max={10}
          step={0.5}
          disabled={busy}
          onCommit={(sleep) => onChange({ ...c, plan: { ...c.plan, sleep } })}
        />
        {c.progress && (
          <>
            <Numeric
              label="ポージング / 分・日"
              value={c.progress.posingMinutes}
              min={0}
              max={60}
              disabled={busy}
              onCommit={(posingMinutes) =>
                onChange({ ...c, progress: { ...c.progress!, posingMinutes } })
              }
            />
            <Numeric
              label="有酸素 / 分・日"
              value={c.progress.cardioMinutes}
              min={0}
              max={60}
              disabled={busy}
              onCommit={(cardioMinutes) =>
                onChange({ ...c, progress: { ...c.progress!, cardioMinutes } })
              }
            />
          </>
        )}
      </div>
      <p>
        今夜の実睡眠は翌日の回復に使います。ポージングは筋量とは別の技術を育て、有酸素は消費エネルギーに加算されます。いずれも24時間に収まる実施量を記録します。
      </p>
      <p>筋力練習を休む日は、練習カードで「休養」を選べます。</p>
    </section>
  );
}
function AggregateFood({
  c,
  onChange,
  busy,
}: {
  c: Career;
  onChange: (c: Career) => void;
  busy: boolean;
}) {
  return (
    <section className="paper">
      <h3>簡単な食事設定</h3>
      <p>
        使用中：
        {c.progress?.mealMode === "foods" ? "下の食品計画" : "この簡単設定"}
        。数値を変更すると、この簡単設定へ切り替えます。
      </p>
      <div className="fields">
        {(
          [
            ["calories", "エネルギー / kcal", 1000, 5000, 50],
            ["protein", "タンパク質 / g", 30, 250, 1],
            ["foodCost", "食費 / 円・日", 300, 3000, 50],
            ["prep", "準備時間 / 時間", 0.25, 2, 0.25],
          ] as const
        ).map(([key, label, min, max, step]) => (
          <Numeric
            key={key}
            label={label}
            min={min}
            max={max}
            step={step}
            disabled={busy}
            value={c.plan[key]}
            onCommit={(v) =>
              onChange({
                ...c,
                plan: { ...c.plan, [key]: v },
                ...(c.progress
                  ? {
                      progress: {
                        ...c.progress,
                        mealMode: "aggregate" as const,
                      },
                    }
                  : {}),
              })
            }
          />
        ))}
      </div>
    </section>
  );
}
function Weekly({
  c,
  busy,
  onChange,
  onEdit,
  onStep,
}: {
  c: Career;
  busy: boolean;
  onChange: (c: Career) => void;
  onEdit: (p: "training" | "food" | "rest") => void;
  onStep: () => void;
}) {
  const n = nutritionPlan(c),
    disabled = busy || c.athlete.status === "retired";
  return (
    <fieldset disabled={disabled} className="plan-fields">
      <section className="paper">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A WEEK THAT FITS YOUR LIFE</span>
            <h2>今週の予定を整える</h2>
          </div>
          <div className="button-row">
            <button
              onClick={() =>
                onChange({ ...c, savedPlan: structuredClone(c.plan) })
              }
            >
              週間の簡単設定を保存
            </button>
            <button
              disabled={disabled || !c.savedPlan}
              onClick={() =>
                c.savedPlan &&
                onChange({ ...c, plan: structuredClone(c.savedPlan) })
              }
            >
              テンプレートを適用
            </button>
          </div>
        </div>
        <p className="muted">
          テンプレートには種目・睡眠・簡単な食事設定が入ります。食品の組合せと生活条件は現在の設定を使います。
        </p>
        <div className="week-grid">
          {c.plan.days.map((d, i) => (
            <article className="day-card" key={i}>
              <b>{["月", "火", "水", "木", "金", "土", "日"][i]}曜日</b>
              <small>
                {i < 5
                  ? `仕事${c.athlete.life.work / 5}h / 通勤${c.athlete.life.commute / 5}h`
                  : "仕事なし"}
              </small>
              <label>
                練習
                <select
                  value={d.focus}
                  onChange={(e) => {
                    const focus = e.target.value as Focus;
                    onChange({
                      ...c,
                      plan: {
                        ...c.plan,
                        days: c.plan.days.map((x, j) =>
                          i === j
                            ? {
                                ...x,
                                focus,
                                ...(x.exercises
                                  ? { exercises: exerciseRecipe(focus, 2) }
                                  : {}),
                              }
                            : x,
                        ),
                      },
                    });
                  }}
                >
                  {Object.entries(FOCUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              {d.focus !== "rest" && (
                <>
                  <Numeric
                    label="開始時刻"
                    value={d.start}
                    min={6}
                    max={23}
                    step={0.5}
                    onCommit={(start) =>
                      onChange({
                        ...c,
                        plan: {
                          ...c.plan,
                          days: c.plan.days.map((x, j) =>
                            i === j ? { ...x, start } : x,
                          ),
                        },
                      })
                    }
                  />
                  <Numeric
                    label={d.exercises ? "各種目のセット" : "セット単位"}
                    value={d.sets}
                    min={1}
                    max={8}
                    onCommit={(sets) =>
                      onChange({
                        ...c,
                        plan: {
                          ...c.plan,
                          days: c.plan.days.map((x, j) =>
                            i === j
                              ? {
                                  ...x,
                                  sets,
                                  ...(x.exercises
                                    ? {
                                        exercises: x.exercises.map((e) => ({
                                          ...e,
                                          sets,
                                        })),
                                      }
                                    : {}),
                                }
                              : x,
                          ),
                        },
                      })
                    }
                  />
                  <Numeric
                    label="余力 RIR"
                    value={d.rir}
                    min={0}
                    max={6}
                    onCommit={(rir) =>
                      onChange({
                        ...c,
                        plan: {
                          ...c.plan,
                          days: c.plan.days.map((x, j) =>
                            i === j
                              ? {
                                  ...x,
                                  rir,
                                  ...(x.exercises
                                    ? {
                                        exercises: x.exercises.map((e) => ({
                                          ...e,
                                          rir,
                                        })),
                                      }
                                    : {}),
                                }
                              : x,
                          ),
                        },
                      })
                    }
                  />
                </>
              )}
              {planIssues(c, i).map((x) => (
                <small className="warning" key={x}>
                  {x}
                </small>
              ))}
            </article>
          ))}
        </div>
        <div className="button-row">
          <button onClick={() => onEdit("training")}>
            種目・重量・回数を編集
          </button>
          <button onClick={() => onEdit("food")}>食事・仕事・設備を編集</button>
          <button onClick={() => onEdit("rest")}>睡眠・補助練習を編集</button>
        </div>
      </section>
      <section className="paper weekly-run">
        <div>
          <h2>この予定で、1週間を過ごす</h2>
          <p>
            毎日 {Math.round(n.calories)}kcal / P{Math.round(n.protein)}g / 食費
            {yen(n.cost)} / 睡眠{c.plan.sleep}h
          </p>
          <p>
            月の収支目安{" "}
            {yen(
              c.athlete.life.income -
                c.athlete.life.fixed -
                c.athlete.life.gymMonthly -
                n.cost * 30 -
                (c.progress?.coach ? 10000 : 0),
            )}
            （大会費別）
          </p>
          <p>
            今日から最大7日分を1日ずつ計算・保存します。大会当日・必要な確認・疲労などの重要イベントでは途中で止まります。
          </p>
        </div>
        <button
          className="primary"
          disabled={disabled || !!c.pendingEvent}
          onClick={onStep}
        >
          週間計画をまとめて実行 →
        </button>
      </section>
    </fieldset>
  );
}
function Records({
  c,
  logs,
  part,
  setPart,
  onSelect,
}: {
  c: Career;
  logs: DailySummary[];
  part: Part;
  setPart: (p: Part) => void;
  onSelect: (s: DailySummary) => void;
}) {
  const [kind, setKind] = useState<"body" | "daily" | "contest">("body"),
    [localId, setLocalId] = useState("");
  const snapshots = [
      c.initial,
      ...c.snapshots,
      ...(c.snapshots.at(-1)?.day === c.athlete.day
        ? []
        : [{ day: c.athlete.day, body: c.athlete.body }]),
    ],
    values = snapshots.map((x) => x.body.muscle[part]),
    low = Math.min(...values),
    span = Math.max(0.01, Math.max(...values) - low),
    local =
      c.local?.results.find((r) => r.id === localId) ?? c.local?.results.at(-1);
  return (
    <>
      <div className="section-tabs">
        {(
          [
            ["body", "身体の推移"],
            ["daily", "練習・食事の実績"],
            ["contest", "大会結果"],
          ] as const
        ).map(([k, v]) => (
          <button
            className={kind === k ? "active" : ""}
            key={k}
            onClick={() => setKind(k)}
          >
            {v}
          </button>
        ))}
      </div>
      {kind === "body" && (
        <section className="paper">
          <h2>身体と技術に、積み重ねが残る。</h2>
          <div className="record-stats stats">
            <p>{c.athlete.day}日経過</p>
            <p>
              筋質量{" "}
              {signed(muscleMass(c.athlete.body) - muscleMass(c.initial.body))}
              kg / 初日比
            </p>
            <p>練習 {c.progress?.trainingDays ?? "未記録"}日</p>
          </div>
          <label>
            推移を見る部位
            <select
              value={part}
              onChange={(e) => setPart(e.target.value as Part)}
            >
              {PARTS.map((p) => (
                <option key={p} value={p}>
                  {LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <div className="history-chart">
            <h3>{LABELS[part]} / 筋質量kg</h3>
            <svg
              viewBox="0 0 800 150"
              role="img"
              aria-label={`初日${values[0].toFixed(3)}kg、現在${values.at(-1)!.toFixed(3)}kg。縦軸は変化に合わせた範囲です。`}
            >
              <polyline
                fill="none"
                stroke="#315c43"
                strokeWidth="3"
                points={values
                  .map(
                    (v, i) =>
                      `${20 + (snapshots[i].day / Math.max(1, c.athlete.day)) * 760},${125 - ((v - low) / span) * 100}`,
                  )
                  .join(" ")}
              />
            </svg>
            <p>
              初日 {values[0].toFixed(3)}kg → 現在 {values.at(-1)!.toFixed(3)}kg
              / 縦軸 {low.toFixed(3)}〜{(low + span).toFixed(3)}kg
            </p>
          </div>
          <p>
            身体の見た目の比較は「今日」の選手欄で行えます。全身の数値は下で日付ごとに確認できます。
          </p>
          <details>
            <summary>週ごとの全身記録</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>体重</th>
                    <th>筋質量</th>
                    <th>{LABELS[part]}</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s, i) => (
                    <tr key={i}>
                      <td>{dayDate(s.day)}</td>
                      <td>{weight(s.body).toFixed(2)}</td>
                      <td>{muscleMass(s.body).toFixed(3)}</td>
                      <td>{s.body.muscle[part].toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      )}
      {kind === "daily" && (
        <section className="paper">
          <h2>毎日の実績</h2>
          {logs.length === 0 ? (
            <p>最初の1日を過ごすと実績が残ります。</p>
          ) : (
            <div className="log-list">
              {logs
                .slice(-56)
                .reverse()
                .map((s) => (
                  <button
                    key={s.day}
                    className="daily-log"
                    onClick={() => onSelect(s)}
                  >
                    <span>{dayDate(s.day)}</span>
                    <b>{FOCUS_LABELS[s.training.focus]}</b>
                    <span>
                      実施{s.training.completedSets}/{s.training.plannedSets} ·
                      筋質量{signed(s.muscleDelta)}kg
                    </span>
                    <span>詳しい結果 →</span>
                  </button>
                ))}
            </div>
          )}
          <small>画面は直近56日。全日次ログは保存ファイルに含まれます。</small>
        </section>
      )}
      {kind === "contest" && (
        <>
          <section className="paper">
            <h2>ステージの記録</h2>
            <p>
              ローカル {c.local?.results.length ?? 0}回 / 公式参照大会{" "}
              {c.progress?.results.length ?? 0}回 / タイトル{" "}
              {c.progress?.titles.length ?? 0}件
            </p>
            {local && (
              <label>
                ローカル大会
                <select
                  value={local.id}
                  onChange={(e) => setLocalId(e.target.value)}
                >
                  {c.local?.results.map((r) => (
                    <option value={r.id} key={r.id}>
                      {dayDate(r.day)} · {LOCAL_DEFS[r.series].name} · {r.rank}/
                      {r.count}位
                    </option>
                  ))}
                </select>
              </label>
            )}
            {c.progress?.results.map((r) => (
              <details key={r.id}>
                <summary>
                  {dayDate(r.day)} · {r.series} · {r.classRank}位
                </summary>
                <pre>{JSON.stringify(r.score, null, 2)}</pre>
                <p>
                  正式な出場・評価・対戦者の詳細はキャリアの「全国・国際の挑戦」から確認できます。
                </p>
              </details>
            ))}
            {c.progress?.retirement && (
              <div>
                <h3>引退の記録</h3>
                {c.progress.retirement.text.map((s, i) => (
                  <p key={i}>{s}</p>
                ))}
              </div>
            )}
          </section>
          {local && (
            <LocalResultView
              model={c.versions.model}
              result={local}
              previous={c.local?.results
                .filter((r) => r.series === local.series && r.day < local.day)
                .at(-1)}
            />
          )}
        </>
      )}
    </>
  );
}
