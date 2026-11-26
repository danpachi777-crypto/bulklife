import {adoptCalendar,findEdition,pendingEdition} from "../core/seasonCircuit";
import {SeasonCalendar} from "./SeasonCalendar";
import {relationshipBook} from "../core/turningPoints";
import { profile, currentEpisode } from "../core/lifeStory";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { Opening } from "./Opening";
import { BodyView } from "../view/BodyView";
import { AthleteSummary } from "./AthleteSummary";
import { TrainingScreen } from "./TrainingScreen";
import { FoodLifeScreen } from "./FoodLifeScreen";
import { ModalSheet } from "./ModalSheet";
import { Numeric } from "./Forms";
import { usePwa } from "../pwa/usePwa";
import { useVisualViewport } from "./useMobileLayout";
import { careerId } from "../core/identity";
import { loadLibrary, loadCareer } from "../core/storage";
import {
  PARTS,
  LABELS,
  weight,
  muscleMass,
  fatPercent,
  type Career,
  type Part,
} from "../core/model";
import { PROFILES, FOCUS_LABELS } from "../core/content";
import { gameDate } from "../core/calendar";
import {
  GOALS,
  PRIORITIES,
  FOOD_STYLES,
  EFFORT,
  guideFor,
  resolvedGoal,
} from "../core/coach";
import { nutritionPlan } from "../core/nutrition";
import { sessionMinutes, exerciseById } from "../core/exercises";
import { formatDelta } from "../core/planning";
import {
  newChallenge,
  strategyCandidates,
  inspectStrategy,
  confirmStrategy,
  runPeriodBatch,
  nextDecision,
  continueWorld,
  challengeIssue,
  decisionScene,
  decisionDays, periodDays,
  CHAPTERS,
  LEAGUE,
  TIERS,
  eligibilityChallenge,
  entryReason,
} from "../core/challenge";
import {
  listChallenges,
  persistChallenge,
  exportChallenges,
  importChallenges,
} from "../core/challengeStorage";
import type {
  ChallengeRun,
  ChallengeMode,
  Strategy,
  StageTier,
  DecisionRecord,
} from "../core/challengeTypes";
import {
  ChallengeGraph,
  ChallengePeriod,
  ChallengeEndingView,
  ChallengeShowView,
} from "./ChallengeResults";
import "./challenge.css";
const money = (n: number) => Math.round(n).toLocaleString("ja-JP") + "円";
export const challengeDate = (day: number) =>
  gameDate(day).toLocaleDateString("ja-JP", { timeZone: "UTC" });
function OriginCard({ run }: {run: ChallengeRun}) {
  if (!run.origin) return null;
  const o=run.origin, p=profile(o);
  return <section className="origin-card"><h3>{p.title}</h3>
    <p>{p.origin}</p><p>{p.past}。</p><blockquote>{p.wish}</blockquote>
    <small>{run.career.athlete.ageAtStart}歳で競技へ · 生まれ {o.birthplace} · 育ち {o.upbringing} · 現在 {o.residence}</small>
    <p>{p.role}の{o.contact}との話題は「{p.thread}」。</p></section>;
}
const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] || 1;
export function ChallengeApp({ Legacy }: { Legacy: ComponentType }) {
  useVisualViewport();
  const pwa = usePwa();
  const [screen, setScreen] = useState<
      "title" | "create" | "game" | "history" | "legacy"
    >("title"),
    [runs, setRuns] = useState<ChallengeRun[]>([]),
    [run, setRun] = useState<ChallengeRun | null>(null),
    [draft, setDraft] = useState<ChallengeRun | null>(null),
    [legacyBody, setLegacyBody] = useState<Career | null>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState("decision"),
    [plan, setPlan] = useState<Strategy | null>(null),

    [edit, setEdit] = useState<"basic" | "training" | "food" | null>(null),
    [part, setPart] = useState<Part>("chest"),
    [inspectBody,setInspectBody]=useState(false),
    [selectedRecord, setSelectedRecord] = useState<DecisionRecord | null>(null),
    [guide, setGuide] = useState(false), [highFee,setHighFee]=useState(false);
  const bookmark=useRef({top:0,decision:-1});
  const lock = useRef(false),
    file = useRef<HTMLInputElement>(null);
  const preview = useState(() =>
    newChallenge("japan", 20261123, "bl-title-preview"),
  )[0];
  async function refresh() {
    const all = await listChallenges();
    setRuns(all);
    setRun(all[0] ?? null);
  }
  useEffect(() => {
    void (async () => {
      try {
        await refresh();
        const lib = await loadLibrary();
        if (lib?.activeId) setLegacyBody(await loadCareer(lib.activeId));
      } catch (e) {
        setError(String(e));
      } finally {
        setReady(true);
      }
    })();
  }, []);
  useEffect(() => {
    window.scrollTo({ top:tab==="decision"&&bookmark.current.decision===run?.records.length?bookmark.current.top:0, behavior:"instant" });
  }, [screen, tab, run?.records.length, run?.status]);
  async function guarded(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function commit(
    value: ChallengeRun,
    expected: number | null = run?.revision ?? null,
  ) {
    const saved = await persistChallenge(value, expected);
    setRun(saved);
    setRuns((old) => [saved, ...old.filter((x) => x.id !== saved.id)]);
    setNotice("保存済み");
    return saved;
  }
  // Every saved batch is a transaction. A reload only resumes the uncommitted tail.
  useEffect(() => {
    if (screen !== "game" || run?.status !== "running" || error) return;
    let disposed = false;
    const timer = setTimeout(() => {
      void guarded(async () => {
        let next = runPeriodBatch(run).run;
        if(next.season && next.status==="result"&&!next.records.at(-1)?.show && ![20,40].includes(next.records.length))next=nextDecision(next);
        const saved = await persistChallenge(next, run.revision);
        setRun(current=>current?.id===saved.id&&current.revision===run.revision?saved:current);
        setRuns((old) => [saved,...old.filter((x) => x.id !== saved.id)]);
        if(!disposed)setNotice(saved.status === "running" ? "期間の途中経過を保存済み" : "期間結果を保存済み");
      });
    }, import.meta.env.DEV && new URLSearchParams(location.search).has('qa-slow-period') ? 5000 : 15);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [run?.revision, run?.id, screen, error]);
  function begin(mode: ChallengeMode, seed = freshSeed()) {
    setDraft(adoptCalendar(newChallenge(mode, seed, careerId())));
    setScreen("create");
    setError("");
  }
  const exportData = () =>
    void guarded(async () => {
      const raw = await exportChallenges(),
        url = URL.createObjectURL(
          new Blob([raw], { type: "application/json" }),
        );
      const a = document.createElement("a");
      a.href = url;
      a.download = "BULK-LIFE-challenges.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setNotice("挑戦の保存を書き出しました");
    });
  const importData = (f: File) =>
    void guarded(async () => {
      await importChallenges(await f.text(), careerId);
      await refresh();
      setScreen("history");
      setNotice("元の挑戦を残して別枠に読み込みました");
    });
  const choose = (p: Strategy) => {
    setHighFee(false);
    setPlan(structuredClone(p));
    setEdit(null);

  };
  function leaveTitle() {
    setScreen("title");
    setPlan(null);

    setEdit(null);
    setSelectedRecord(null);
  }
  if (screen === "legacy")
    return (
      <>
        <button className="challenge-legacy-back" onClick={leaveTitle}>
          挑戦モードのタイトルへ
        </button>
        <Legacy />
      </>
    );
  const hiddenFile = (
    <input
      ref={file}
      type="file"
      accept="application/json,.json"
      hidden
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (f) importData(f);
      }}
    />
  );
  if (!ready)
    return (
      <main className="challenge-loading">
        <h1>BULK LIFE</h1>
        <p>保存した選手を確認中…</p>
      </main>
    );
  if (screen === "title" || screen === "create") {
    const d = screen === "create" ? draft : null,
      c = d?.career ?? run?.career ?? legacyBody ?? preview.career;
    return (
      <>
        {hiddenFile}
        <Opening
          c={c}
          phase={d ? "create" : "title"}
          hasSave={!!run}
          busy={busy}
          onBegin={() => begin("japan")}
          onContinue={() => {
            setScreen("game");
            setTab("decision");
          }}
          onTitle={leaveTitle}
          onExport={exportData}
          onImport={() => file.current?.click()}
          pwa={pwa}
          error={error}
          menu={
            <>
              {run && (
                <button
                  className="primary"
                  onClick={() => {
                    setScreen("game");
                    setTab("decision");
                  }}
                >
                  つづきから{" "}
                  <small>
                    {run.career.athlete.name} ·{" "}
                    {run.records.length + (run.job ? 1 : 0)}/{run.limit}の決断
                  </small>
                </button>
              )}
              <button
                className={!run ? "primary" : ""}
                onClick={() => begin("japan")}
              >
                日本挑戦 · 20回{" "}
                <small>日本グランプリへ／目安20〜30分・時間制限なし</small>
              </button>
              <button onClick={() => begin("world")}>
                世界挑戦 · 40回{" "}
                <small>世界ファイナルへ／目安40〜60分・時間制限なし</small>
              </button>
              <button onClick={() => setScreen("history")}>
                過去のキャリア・従来キャリア
              </button>
            </>
          }
        >
          {d && (
            <>
              <span className="eyebrow">
                {d.mode === "japan"
                  ? "20の決断。あなたの身体は、日本の頂点に届くか。"
                  : "40の決断。その先の世界へ。"}
              </span>
              <OriginCard run={d} /><h3>{d.career.athlete.profileTitle}</h3>
              <p>
                {
                  PROFILES.find((p) => p.id === d.career.athlete.profileId)
                    ?.challenge
                }
              </p>
              <div className="challenge-create-stats">
                <span>{weight(d.career.athlete.body).toFixed(1)}kg</span>
                <span>
                  体脂肪 {fatPercent(d.career.athlete.body).toFixed(1)}%
                </span>
                <span>{money(d.career.athlete.life.money)}</span>
              </div>
              <label>
                選手名
                <input
                  value={d.career.athlete.name}
                  maxLength={24}
                  onChange={(e) =>
                    setDraft({
                      ...d,
                      career: {
                        ...d.career,
                        athlete: { ...d.career.athlete, name: e.target.value },
                      },
                    })
                  }
                />
              </label>
              <p>
                経歴60種類、出生地47都道府県、初期タイプ6種類をそれぞれ等確率で抽選。外見で有利不利は変わりません。最初の作戦は選手を迎えた後に比較できます。
              </p>
              <p>
                このモードの頂点：
                {d.mode === "japan" ? LEAGUE.national.name : LEAGUE.world.name}
                。大会体系はゲーム独自の架空設定です。
              </p>
              <div className="button-row">
                <button onClick={() => begin(d.mode)}>もう一度抽選</button>
                <button
                  className="primary"
                  disabled={busy || !d.career.athlete.name.trim()}
                  onClick={() =>
                    void guarded(async () => {
                      d.initial = structuredClone(d.career);
                      await commit(d, null);
                      setDraft(null);
                      setScreen("game");
                      setTab("decision");
                    })
                  }
                >
                  この選手と挑戦を始める
                </button>
              </div>
            </>
          )}
        </Opening>
      </>
    );
  }
  if (screen === "history")
    return (
      <main className="challenge-archive">
        {hiddenFile}
        <header>
          <h1>キャリアの記録</h1>
          <button onClick={leaveTitle}>タイトルへ</button>
        </header>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        <p>
          挑戦モードと従来の育成は別の保存領域です。端末・ブラウザ・URLの間で自動共有しません。
        </p>
        <div className="button-row">
          <button onClick={exportData}>挑戦を書き出す</button>
          <button onClick={() => file.current?.click()}>挑戦を読み込む</button>
          <button onClick={() => setScreen("legacy")}>
            従来キャリアを開く
          </button>
        </div>
        {runs.map((r) => (
          <article className="challenge-archive-card" key={r.id}>
            <h2>
              {r.career.athlete.name}{" "}
              <small>{r.mode === "japan" ? "日本" : "世界"}挑戦</small>
            </h2>
            <p>
              {r.records.length}/{r.limit}の決断 ·{" "}
              {challengeDate(r.career.athlete.day)} ·{" "}
              {r.career.athlete.profileTitle}
            </p>
            <p>{r.status==="result"&&r.records.at(-1)?.show?.edition&&!r.season?.announced.includes(r.records.at(-1)!.show!.edition!)?"大会の順位発表を待っています":r.world?.text ?? r.domestic?.text ?? "挑戦中"} </p>
            {r.importedFrom && <p>読み込んだコピー（元の挑戦は保持）</p>}
            <small>
              同条件の識別：seed {r.seed} / {r.calculation} / 作成時の表示版 {r.modelVersion??"未記録（現行で表示）"}
            </small>
            <div className="button-row">
              <button
                className="primary"
                onClick={() => {
                  setRun(r);
                  setScreen("game");
                  setTab("decision");
                }}
              >
                この記録を開く
              </button>
              <button onClick={() => begin(r.mode, r.seed)}>
                同じ初期条件で別の作戦へ
              </button>
            </div>
          </article>
        ))}
      </main>
    );
  if (!run)
    return (
      <main>
        <button onClick={leaveTitle}>タイトルへ戻る</button>
      </main>
    );
  const c = run.career,
    n = run.records.length + (run.status==='planning'||run.status==='running'?1:0),
    chapter = CHAPTERS[Math.min(9, Math.floor((n - 1) / 4))],
    candidates = run.status === "planning" ? strategyCandidates(run) : [],
    evaluation = plan ? inspectStrategy(run, plan) : null;
  const body = <AthleteSummary openInspection={inspectBody} narrative={!!run.origin} c={{...c,snapshots:run.records.map(v=>({day:v.to,body:v.after}))}} part={part} setPart={setPart} />;
  const nav = (key: string) => {
    if(tab==="decision")bookmark.current={top:window.scrollY,decision:run.records.length};
    setInspectBody(false);
    setTab(key);
    setSelectedRecord(null);
  };
  const last=run.records.at(-1);
  const unrevealed=last?.show?.edition && !run.season?.announced.includes(last.show.edition) && run.status==="result";
  const save=(v:ChallengeRun)=>void guarded(async()=>{await commit(v);});
  return (
    <main className="challenge-game">
      {hiddenFile}
      <header className="challenge-header">
        <div>
          <span>
            {run.mode === "japan" ? "日本挑戦" : "世界挑戦"} · 決断{" "}
            {Math.min(run.limit, n)}/{run.limit}
          </span>
          <h1>
            {c.athlete.name}
            <small>
              {c.athlete.ageAtStart+Math.floor(c.athlete.day/365.25)}歳 · {challengeDate(c.athlete.day)}
            </small>
          </h1>
          <p>
            {run.records.length<run.limit ? "残り"+(run.limit-run.records.length)+"回 · ":""}目標 {run.limit === 20 ? LEAGUE.national.name : LEAGUE.world.name}
          </p>
        </div>
        <div>
          <b>{money(c.athlete.life.money)}</b>
          <small role="status">
            {busy ? "処理・保存中…" : notice || "このブラウザに保存"}
          </small>
          <button onClick={leaveTitle}>中断・タイトル</button>
        </div>
      </header>
      {error && (
        <section className="error" role="alert">
          <p>{error}</p>
          <p>
            成功扱いにはしていません。保存済みの状態を読み直して再開できます。
          </p>
          <button onClick={() => void guarded(refresh)}>
            保存した進行を再読込
          </button>
        </section>
      )}
      {run.status === "running" && (
        <section className="challenge-running" role="status">
          <h2>決断{run.job!.number}の期間を過ごしています</h2>
          <progress
            value={c.athlete.day - run.job!.start}
            max={run.job!.end - run.job!.start}
          />
          <p>
            {c.athlete.day - run.job!.start}/{run.job!.end - run.job!.start}日 ·{" "}
            {challengeDate(c.athlete.day)}
          </p>
          <p>
            確定した作戦を日ごとに計算しています。中断しても保存済みの続きから再開します。
          </p>
        </section>
      )}
      {!run.season && !run.job && <button onClick={()=>void guarded(async()=>{const copy=adoptCalendar(structuredClone(run));copy.importedFrom=run.id;copy.id="bl-"+crypto.randomUUID();copy.initial.athlete.id=copy.career.athlete.id=copy.id;copy.createdAt=Date.now();await commit(copy,null);setPlan(null);})}>元のセーブを残して年次カレンダーへ移行</button>}
      {run.status==="running"?null:unrevealed && last?.show?.edition ? <section className="award-gate"><h2>{findEdition(last.show.edition).name}</h2><p>{challengeDate(last.show.day)} · 入場と比較審査</p><ChallengeShowView show={last.show} model={c.versions.model} initial="entry" onReveal={()=>save({...run,season:{...run.season!,announced:[...run.season!.announced,last.show!.edition!]}})} /></section> : tab === "body" ? (
        <section className="challenge-body-page">{body}</section>
      ) : tab === "contests" ? (
        <section className="challenge-contests">
          {run.season?<SeasonCalendar run={run} save={save} busy={busy} full/>:<><h2>挑戦する舞台</h2>
          <p>
            架空のBULKサーキット。開催日は各決断の期間末で固定。出場は作戦に含めて確定し、見るだけでは決断を使いません。
          </p>
          {TIERS.map((t) => (
            <article key={t}>
              <h3>{LEAGUE[t].name}</h3>
              <b>{money(LEAGUE[t].fee + LEAGUE[t].travel)}</b>
              <p>
                {eligibilityChallenge(run, t).length
                  ? "次の条件：" + eligibilityChallenge(run, t).join("、")
                  : "出場資格："+entryReason(run,t)}
              </p>
              <p>
                次回：
                {challengeDate(
                  c.athlete.day + decisionDays(Math.min(40, n)) - 1,
                )}
                ／締切：今回の作戦確定時
              </p>
              <p>
                筋量30%・バランス20%・仕上がり15%・ポージング25%・状態10%。勝利の保証はありません。
              </p>
            </article>
          ))}
          </>}<h2>同じ時間を過ごすライバル</h2>
          <p className="muted">ライバルは各会場の出場資格を既に持つ選手として登場します。ここでの対戦記録は今回の挑戦中のものです。出場する期間は参加・移動費と当日の時間を負担し、直前の練習を休みます。</p>
          {run.rivals.map((r) => (
            <details key={r.id}>
              <summary>
                {r.name} · {r.style} ·{" "}
                {weight(r.career.athlete.body).toFixed(1)}kg
              </summary>
              <p>
                筋質量{muscleMass(r.career.athlete.body).toFixed(1)}kg / 技術
                {(r.career.progress!.posing * 100).toFixed(0)}
                。既存の日次計算で成長し、敗北に合わせた強さ補正はありません。
              </p>
              <p>
                対戦：
                {r.history
                  .map(
                    (h) =>
                      `決断${h.decision}・${LEAGUE[h.tier].name}${h.rank}位`,
                  )
                  .join("／") || "まだありません"}
              </p>
            </details>
          ))}
        </section>
      ) : tab === "records" ? (
        <section>
          <ChallengeGraph run={run} />
          {run.storyVersion===2 && <details><summary>人物・約束と練習場所の記録</summary>{relationshipBook(run.records).map(p=><section key={p.name+p.meet}><h4>{p.name} · {p.role}</h4><p>最初のやり取りは決断{p.meet}。これまでに{p.exchanges}回関わった。</p><p>{p.known.join(" ／ ")}</p></section>)}{run.records.filter(x=>x.fact).map(x=><p key={x.number}>決断{x.number} · {x.fact!.place} · {x.fact!.personName} {x.fact!.promise}　{x.response}</p>)}</details>}
          {run.origin&&<details><summary>選手の経歴と願い</summary><OriginCard run={run}/></details>}
          <h2>選んだ作戦の記録</h2>
          {run.records.map((rec) => (
            <button
              className="challenge-record-row"
              key={rec.number}
              onClick={() => setSelectedRecord(rec)}
            >
              <b>
                決断{rec.number} · {rec.strategy.name}
              </b>
              <span>
                {challengeDate(rec.from)}〜{challengeDate(rec.to - 1)} · 筋質量
                {formatDelta(
                  muscleMass(rec.after) - muscleMass(rec.before),
                  2,
                  "kg",
                )}
              </span>
              <span>
                {rec.show
                  ? `${rec.show.edition?findEdition(rec.show.edition).name:LEAGUE[rec.show.tier].name} ${rec.show.rank}位`
                  : "育成期間"}{" "}
                →
              </span>
            </button>
          ))}
        </section>
      ) : (
        <>
          {run.status === "japanEnd" || run.status === "worldEnd" ? (
            <ChallengeEndingView
              run={run}
              onContinue={() =>
                void guarded(async () => {
                  await commit(
                    run.limit === 20 ? continueWorld(run) : nextDecision(run),
                  );
                })
              }
              onBody={() => nav("body")}
              onTitle={leaveTitle}
            />
          ) : run.status === "result" ? (
            <ChallengePeriod
              record={run.records.at(-1)!}
              career={c}
              onNext={() =>
                void guarded(async () => {
                  await commit(nextDecision(run));
                  setPlan(null);
                })
              }
              onBody={focus => {nav("body");if(focus){setPart(focus);setInspectBody(true);}}}
            />
          ) : (
            (
              <div className="challenge-decision-grid season-play">{run.season&&<SeasonCalendar run={run} save={save} busy={busy}/>}
                <section className="challenge-athlete">
                  <BodyView
                    body={c.athlete.body}
                    selected={part}
                    model={c.versions.model}
                    hair={c.athlete.appearance.hair}
                    presentation="home"
                    defaultClip="GymIdle"
                  />
                  <div className="challenge-vitals">
                    <span>
                      体重 <b>{weight(c.athlete.body).toFixed(1)}kg</b>
                    </span>
                    <span>
                      筋質量 <b>{muscleMass(c.athlete.body).toFixed(1)}kg</b>
                    </span>
                    <span>
                      回復{" "}
                      <b>
                        {Math.round((1 - c.athlete.systemicFatigue) * 100)}/100
                      </b>
                    </span>
                  </div>
                  <button onClick={() => nav("body")}>
                    身体を見る
                  </button>
                </section>
                <section className="challenge-workbench">
                  <div className="challenge-issue">
                    <span className="eyebrow">
                      今回の決断 · {periodDays(run)}日
                    </span>
                    <h2>{run.origin ? (run.storyVersion===2?decisionScene(run).title:currentEpisode(run).title) : chapter}</h2>
                    <p>{challengeIssue(run)}</p>
                    {import.meta.env.DEV && run.origin && run.storyVersion===2 && new URLSearchParams(location.search).has("story-debug") && <details><summary>開発用・出来事の選出理由</summary>{decisionScene(run).entries.map((x,i)=><p key={i}>{x.event} · {x.eligible?"候補":"対象外"} · {x.reason} {x.source?"決断"+x.source.number:""}</p>)}</details>}

                    <small>
                      期間：{challengeDate(c.athlete.day)}〜
                      {challengeDate(c.athlete.day + periodDays(run) - 1)}
                    </small>
                  </div>
                  <div className="challenge-strategies" id="challenge-options">
                    {candidates.map((p) => {
                      const v = inspectStrategy(run, p);
                      return (
                        <button key={p.id} className="choice-card" aria-pressed={plan?.id===p.id} onClick={()=>choose(p)}>
                          <strong>{p.name}</strong>{p.aim!==p.name&&p.aim.length<40&&<span>{p.aim}</span>}<span>{p.minutes}分の練習 · 勤務{Math.round(p.workRatio*100)}% · {v.food.insufficient?"食事に不足あり":"食事目標内"}</span>
                          <span>{p.contest?"出場を含む":pendingEdition(run)?"申込済みの大会あり":"育成"}{v.upfront>0?" · 初期費用"+money(v.upfront):""}{p.visitHours?" · 予定"+p.visitHours+"時間":""}</span>
                          {plan?.id===p.id&&<b>✓ 選択中</b>}
                        </button>
                      );
                    })}
                  </div>
                  {plan&&evaluation&&<details><summary>選んだ方針の詳細</summary><p>目的 {GOALS[plan.goal]} · 睡眠{plan.sleep}時間 · 食費上限{money(plan.budget)}/日。{plan.coach?"継続指導あり。":"自主練習。"} {plan.tradeoff} 期間収支の見込み {money(evaluation.net)}。</p><button onClick={()=>setEdit("basic")}>生活・練習を調整する</button>{evaluation.food.insufficient&&<button onClick={()=>choose({...plan,foodStyle:"budget",budget:Math.max(1500,plan.budget)})}>自炊中心・日額1,500円以上で再計算</button>}</details>}
                  {last&&<aside className="last-decision"><h3>前の期間</h3><p>{last.response}</p><button onClick={()=>setSelectedRecord(last)}>身体と収支の記録</button></aside>}
                  {plan&&evaluation?.errors.map(msg=><p role="alert" key={msg}>{msg}</p>)}
                  <div className="advance-bar"><button className="primary" disabled={busy||!plan||!!evaluation?.errors.length} onClick={()=>{if(!plan)return;if(!highFee&&evaluation&&evaluation.upfront>=50000){setHighFee(true);return;}void guarded(async()=>{await commit(confirmStrategy(run,plan));setHighFee(false);setPlan(null);});}}>{highFee&&evaluation?"初期費用"+money(evaluation.upfront)+"を支払い進める":plan?"この方針で"+Math.floor(periodDays(run)/7)+"週"+(periodDays(run)%7?periodDays(run)%7+"日":"")+"進める":"方針を選んでください"}</button></div>
                </section>
              </div>
            )
          )}
        </>
      )}
      <nav className="challenge-nav" aria-label="主要メニュー">
        {[
          ["decision", "決断"],
          ["body", "身体"],
          ["contests", "大会"],
          ["records", "キャリア記録"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            disabled={run.status==="running" || !!unrevealed}
            onClick={() => nav(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      {edit && plan && evaluation && (
        <ModalSheet
          title={edit
                ? "作戦を調整する"
                : "作戦の詳細・比較"
          }
          onClose={() => {
            if (edit) setEdit(null);
            else setPlan(null);
          }}
          busy={busy}
          actions={<button onClick={()=>setEdit(null)}>調整を終えて戻る</button>}
        >
          <StrategyEditor
            run={run}
            plan={plan}
            setPlan={setPlan}
            editing={edit}
            setEdit={setEdit}
          />
        </ModalSheet>
      )}
      {selectedRecord && (
        <ModalSheet
          title={`決断${selectedRecord.number}の記録`}
          onClose={() => setSelectedRecord(null)}
        >
          <ChallengePeriod
            record={selectedRecord}
            career={c}
            onNext={() => setSelectedRecord(null)}
            onBody={() => {
              setSelectedRecord(null);
              nav("body");
            }}
            archived
          />
        </ModalSheet>
      )}
      {guide && (
        <ModalSheet title="20回・40回の遊び方" onClose={() => setGuide(false)}>
          <p>
            選手の状態を見て、作戦を比較し、期間を確定します。身体や説明を調べる操作では決断は減りません。
          </p>
          <p>
            年次カレンダーでは、季節ごとの区切りまで進みます。筋量・脂肪・技術・生活・大会を日ごとに計算します。疲労時の休養と、予算内の食事量を調整します。目的、大会、勤務、設備購入は勝手に変えません。
          </p>
          <p>
            世界40回の前半は日本20回と共通。20回の記録は世界へ続けても書き換えません。優勝せずに挑戦を終えることもあります。
          </p>
          <button onClick={() => setGuide(false)}>作戦へ戻る</button>
        </ModalSheet>
      )}
    </main>
  );
}
function StrategyEditor({
  run,
  plan: p,
  setPlan,
  editing,
  setEdit,
}: {
  run: ChallengeRun;
  plan: Strategy;
  setPlan: (v: Strategy) => void;
  editing: "basic" | "training" | "food" | null;
  setEdit: (v: "basic" | "training" | "food" | null) => void;
}) {
  const v = inspectStrategy(run, p),
    c = v.career,
    n = nutritionPlan(c),
    g = guideFor(c);
  const change = <K extends keyof Strategy>(key: K, value: Strategy[K]) =>
    setPlan({ ...p, [key]: value });
  if (editing === "training")
    return (
      <>
        <p>
          保存前の下書きです。ここで変更した週間練習は手動になり、日々の種目を自動で置き換えません。合意した回復調整は適用します。
        </p>
        <TrainingScreen
          career={c}
          busy={false}
          onChange={(value) => {
            const m = typeof value === "function" ? value() : value;
            setPlan({ ...p, manual: m, autoTraining: false });
          }}
        />
        <button onClick={() => setEdit(null)}>変更内容を確認へ</button>
      </>
    );
  if (editing === "food")
    return (
      <>
        <p>
          食品や数値を手動設定した場合、期間中の食事量の自動更新を止めます。数値設定は献立ではありません。
        </p>
        <FoodLifeScreen
          nutritionOnly
          career={c}
          busy={false}
          onChange={(value) => {
            const m = typeof value === "function" ? value() : value;
            setPlan({ ...p, manual: m, autoFood: false });
          }}
        />
        <button onClick={() => setEdit(null)}>変更内容を確認へ</button>
      </>
    );
  return (
    <div className="challenge-plan-detail">
      <h2>{p.name}</h2>
      <p>{p.reason}</p>
      <p>
        <b>
          {challengeDate(run.career.athlete.day)}〜
          {challengeDate(run.career.athlete.day + v.days - 1)}／{v.days}日
        </b>
      </p>
      {editing==='basic' && (
        <div className="challenge-basic-fields">
          <label>
            目的
            <select
              value={p.goal}
              onChange={(e) =>
                change("goal", e.target.value as Strategy["goal"])
              }
            >
              {Object.entries(GOALS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            重点部位
            <select
              value={p.priority}
              onChange={(e) =>
                change("priority", e.target.value as Strategy["priority"])
              }
            >
              {Object.entries(PRIORITIES).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            練習の負担
            <select
              value={p.effort}
              onChange={(e) =>
                change("effort", e.target.value as Strategy["effort"])
              }
            >
              {Object.entries(EFFORT).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Numeric
            label="練習に使う時間の上限 分"
            value={p.minutes}
            min={20}
            max={90}
            step={5}
            onCommit={(v) => change("minutes", v)}
          />
          <label>
            食事の方法
            <select
              value={p.foodStyle}
              onChange={(e) =>
                change("foodStyle", e.target.value as Strategy["foodStyle"])
              }
            >
              {Object.entries(FOOD_STYLES).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Numeric
            label="食費の上限 円/日"
            value={p.budget}
            min={300}
            max={2500}
            step={100}
            onCommit={(v) => change("budget", v)}
          />
          <Numeric
            label="睡眠目標 時間/日"
            value={p.sleep}
            min={6}
            max={9}
            step={0.5}
            onCommit={(v) => change("sleep", v)}
          />
          <Numeric
            label="ポージング 分/日"
            value={p.posing}
            min={0}
            max={60}
            step={5}
            onCommit={(v) => change("posing", v)}
          />
          <Numeric
            label="有酸素 分/日"
            value={p.cardio}
            min={0}
            max={60}
            step={5}
            onCommit={(v) => change("cardio", v)}
          />
          <label>
            仕事の配分
            <select
              value={p.workRatio}
              onChange={(e) => change("workRatio", +e.target.value)}
            >
              {[0.6, 0.8, 1, 1.1, 1.2].map((r) => (
                <option key={r} value={r}>
                  基準の{Math.round(r * 100)}%／月収
                  {money(run.career.progress!.employmentBase.income * r)}
                </option>
              ))}
            </select>
          </label>
          <label>
            設備
            <select
              value={p.equipment}
              onChange={(e) =>
                change("equipment", e.target.value as "gym" | "home")
              }
            >
              <option value="gym">ジム 月5000円</option>
              <option value="home">自宅 月1500円・初回20000円</option>
            </select>
          </label>
          <label>
            技術の指導
            <select
              value={p.coach ? "yes" : "no"}
              onChange={(e) => change("coach", e.target.value === "yes")}
            >
              <option value="no">自主練習</option>
              <option value="yes">依頼する 月10000円</option>
            </select>
          </label>
          {!run.season&&<label>
            期間末の大会
            <select
              value={p.contest ?? ""}
              onChange={(e) =>
                change("contest", (e.target.value || null) as StageTier | null)
              }
            >
              <option value="">見送って育成する</option>
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {LEAGUE[t].name}
                  {eligibilityChallenge(run, t).length ? "（条件未達）" : ""}
                </option>
              ))}
            </select>
          </label>}
        </div>
      )}
      <section>
        <h3>確定する方針</h3>
        <p>
          目的：{GOALS[p.goal]}
          {p.goal === "ask"
            ? ` → 現在の体脂肪${fatPercent(c.athlete.body).toFixed(1)}%から「${GOALS[resolvedGoal(c, { ...g, goal: p.goal })]}」を提案`
            : null}
          ／重点：{PRIORITIES[p.priority]}／負担：{EFFORT[p.effort]}
        </p>
        {p.goal!==guideFor(run.career).goal&&<p className="warning">今回採用すると、食事の目的を「{GOALS[guideFor(run.career).goal]}」から「{GOALS[p.goal]}」へ変えます。変更したくない場合は目的を調整できます。</p>}
        <p>
          勤務：基準の{Math.round(p.workRatio * 100)}%／設備：
          {p.equipment === "gym" ? "ジム" : "自宅"}／技術指導：
          {p.coach ? "月10000円で依頼" : "なし"}
        </p>
      </section>
      <section className="challenge-plan-food">
        <h3>採用する食事</h3>
        <p>
          {c.progress!.mealMode === "aggregate"
            ? "献立：エネルギーとたんぱく質の数値設定"
            : FOOD_STYLES[p.foodStyle]}
        </p>
        <b>
          {Math.round(n.calories)} / 目標{v.food.target.energy}kcal · たんぱく質
          {Math.round(n.protein)} / {Math.round(v.food.target.protein)}g（
          {Math.round(v.food.proteinRatio * 100)}%）
        </b>
        <p>
          {money(n.cost)}/日・準備{Math.round(n.prep * 60)}分 · {v.food.status}
        </p>
        {v.warnings.map((w) => (
          <p className="warning" key={w}>
            {w}
          </p>
        ))}
      </section>
      <section>
        <h3>予定と費用</h3>
        <p>
          最初に必要：{money(v.upfront)}／期間収支の見込み：{money(v.net)}
          。収支は月の日数・実施した食事量などで変わります。
        </p>
        <p>
          睡眠{p.sleep}時間・ポージング{p.posing}分・有酸素{p.cardio}分。
          {p.contest
            ? `${LEAGUE[p.contest].name}へ出場。大会前3日は筋力練習を休み、当日は仕事と練習を行いません。`
            : "大会へは出場しません。"}
        </p>
        <p>優先しないこと：{p.tradeoff}</p>
      </section>
      <details>
        <summary>具体的な週間練習</summary>
        {c.plan.days.map((d, i) => (
          <p key={i}>
            {"月火水木金土日"[i]}：{FOCUS_LABELS[d.focus]}{" "}
            {Math.round(sessionMinutes(d.exercises ?? []))}分／
            {d.exercises
              ?.map(
                (e) =>
                  `${exerciseById(e.exerciseId)?.name} ${e.load}kg×${e.reps}回×${e.sets}セット`,
              )
              .join("、") || "筋力練習なし"}
          </p>
        ))}
      </details>
      <details>
        <summary>自動調整と手動設定の範囲</summary>
        {<label><input type="checkbox" checked={p.autoRecovery} onChange={e=>change("autoRecovery",e.target.checked)} />高疲労時は休養へ調整する（大会前3日の休養は出場準備に含みます）</label>}
        <p>
          練習：
          {p.autoTraining
            ? "コーチ管理。週3回を基本に疲労と能力から種目・重量を更新"
            : "手動の週間予定を維持"}
          。食事：
          {p.autoFood
            ? "コーチ管理。日ごとの身体と練習に合わせ、同じ目的・方法・予算内で更新"
            : "手動の食品量/数値を維持"}
          。
          {p.autoRecovery
            ? "高疲労・回復期間には休養へ調整します。"
            : "自動休養は無効です。"}
        </p>
        <p>
          大会、目的、仕事、指導の購入、設備は合意した内容を維持します。成長量の保証やコーチ専用の能力補正はありません。
        </p>
      </details>
      {(
        <div className="button-row">
          <button onClick={()=>setEdit(editing==='basic'?null:'basic')}>{editing==='basic'?'調整を閉じて内容を確認':'目的・生活条件を調整する'}</button>
          <button onClick={() => setEdit("training")}>
            種目・重量を細かく編集
          </button>
          <button onClick={() => setEdit("food")}>
            食品・栄養量を細かく編集
          </button>
          <button
            onClick={() =>
              setPlan({
                ...p,
                manual: undefined,
                autoTraining: true,
                autoFood: true,
              })
            }
          >
            手動編集を取り消す
          </button>
        </div>
      )}
      {v.errors.map((s) => (
        <p role="alert" className="error" key={s}>
          {s}
        </p>
      ))}
      <small>
        身体値と必要量はゲーム内の推定です。現実の医療・栄養指導ではありません。
      </small>
    </div>
  );
}
