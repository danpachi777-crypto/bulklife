import {findEdition} from "../core/seasonCircuit";
import {BodyComparison} from "./BodyComparison";
import {profile} from "../core/lifeStory";
import { useEffect, useState } from "react";
import { BodyView } from "../view/BodyView";
import {
  PARTS,
  LABELS,
  muscleMass,
  weight,
  type Career,
  type BodyState,
  type Part,
} from "../core/model";
import { formatDelta } from "../core/planning";
import { LEAGUE, TIERS } from "../core/challenge";
import { LOCAL_AXES } from "../core/localEvaluation";
import { PRIORITIES } from "../core/coach";
import { exerciseById,loadSpec } from "../core/exercises";
import type {
  ChallengeRun,
  DecisionRecord,
  ChallengeShow,
} from "../core/challengeTypes";
import { challengeDate } from "./ChallengeApp";
const yen = (n: number) => Math.round(n).toLocaleString("ja-JP") + "円";
function downloadShowCard(s:ChallengeShow){
 const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
 const name=s.standings.find(p=>p.id==='player')?.name??'選手';
 const lines=[(s.edition?findEdition(s.edition).name:LEAGUE[s.tier].name),`${name} · ${challengeDate(s.day)}`,`${s.count}人中${s.rank}位 / ${s.score.total.toFixed(2)}点`,`体重 ${weight(s.body).toFixed(1)}kg / 筋質量 ${muscleMass(s.body).toFixed(2)}kg`,`筋量 ${s.score.mass.toFixed(1)} · 技術 ${s.score.posing.toFixed(1)}`,`決断${s.decision}で挑んだ舞台`];
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="680" viewBox="0 0 1000 680"><rect width="1000" height="680" fill="#173b2c"/><rect x="24" y="24" width="952" height="632" rx="12" fill="none" stroke="#d8ef83" stroke-width="3"/><text x="64" y="105" fill="#d8ef83" font-size="42" font-family="sans-serif">BULK LIFE</text>${lines.map((line,i)=>`<text x="64" y="${185+i*72}" fill="#f0f6e8" font-size="${i===2?48:30}" font-family="sans-serif">${escape(line)}</text>`).join('')}</svg>`;
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`BULK-LIFE-decision-${s.decision}-result.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
type StrategyPriority = DecisionRecord["strategy"]["priority"];
export function ChallengePeriod({
  record: r,
  career,
  onNext,
  onBody,
  archived = false,
}: {
  record: DecisionRecord;
  career: Career;
  onNext: () => void;
  onBody: (focus?:Part) => void;
  archived?: boolean;
}) {
  const [compare, setCompare] = useState(false),
    s = r.stats,
    changes = PARTS.map((p) => ({
      p,
      delta: r.after.muscle[p] - r.before.muscle[p],
    })).sort((a, b) => b.delta - a.delta);
  const focusParts:Record<StrategyPriority,Part[]> = {balanced:[],arms:["biceps","triceps","forearms"],chest:["chest","upperChest"],back:["lats","upperBack","erectors"],shoulders:["frontDelts","sideDelts","rearDelts"],legs:["quads","hamstrings","glutes","calves"]};
  const targets=focusParts[r.strategy.priority];
  return (
    <section className="challenge-period">
      <span className="eyebrow">
        決断{r.number}の記録 · {s.days}日を過ごしました
      </span>
      <h2>{r.strategy.name}</h2>
      <p>
        {challengeDate(r.from)}〜{challengeDate(r.to - 1)}
      </p>
      <div className="challenge-result-numbers">
        <p>
          筋質量
          <b>
            {formatDelta(muscleMass(r.after) - muscleMass(r.before), 2, "kg")}
          </b>
        </p>
        <p>
          脂肪<b>{formatDelta(r.after.fat - r.before.fat, 2, "kg")}</b>
        </p>
        <p>
          資金<b>{formatDelta(r.afterMoney - r.beforeMoney, 0, "円")}</b>
        </p>
      </div>
      <h3>今回の狙いと身体の変化</h3>
      {targets.length>0 && <p>{targets.map(k=>(k==="chest"?"大胸筋":LABELS[k])+" "+formatDelta(r.after.muscle[k]-r.before.muscle[k],3,"kg")).join(" ／ ")}</p>}
      {r.response && <blockquote>{r.response}</blockquote>}
      <p>
        今回の狙いは「{r.strategy.aim}」。練習{s.trainingDays}日・実施{s.sets}/
        {s.plannedSets}セット。{changes[0].delta>0?"最も増えた部位":"変化が最も小さかった部位"}は{LABELS[changes[0].p]}（
        {formatDelta(changes[0].delta, 3, "kg")}）でした。
      </p>
      <p>
        ポージング
        {formatDelta((r.afterPosing - r.beforePosing) * 100, 1, "ポイント")}
        。休養{s.restDays}日・平均睡眠{(s.sleep / s.days).toFixed(1)}
        時間・平均疲労{Math.round((s.fatigue / s.days) * 100)}。
      </p>
      {s.shortDays > 0 ? (
        <p className="warning">
          エネルギー・たんぱく質の目標または実行量に不足があった日：{s.shortDays}
          日。次の作戦で食費・調理方法・仕事の配分を相談できます。
        </p>
      ) : (
        <p>
          平均たんぱく質充足{Math.round((s.protein / s.days) * 100)}
          %。食事だけで成長を保証するものではありません。
        </p>
      )}
      <p>
        {s.adjustments
          ? `疲労・大会準備に合わせて休養へ調整した日が${s.adjustments}日ありました。`
          : "合意した週間方針で期間を進めました。"}
        筋量・脂肪・技術は別々に変化します。
      </p>
      <button onClick={() => setCompare(!compare)}>
        {compare ? "比較を閉じる" : "前回と現在の身体を比べる"}
      </button>
      {compare && (
        <BodyComparison
          before={r.before}
          after={r.after}
          model={career.versions.model}
        />
      )}
      {r.show && (
        <ChallengeShowView show={r.show} model={career.versions.model} initial={r.show.edition?'result':archived?'card':'entry'} />
      )}
      <details>
        <summary>収支と期間中の詳しい実績</summary>
        <p>
          収入{yen(s.income)}／食費{yen(s.food)}／生活・ジム・指導{yen(s.fixed)}
          ／大会・設備など
          {yen(s.income - s.food - s.fixed - (r.afterMoney - r.beforeMoney))}
        </p>
        <p>
          練習{Math.round(s.minutes)}分。平均エネルギー
          {Math.round(s.energy / s.days)}kcal。
        </p>
        {s.events.map((e) => (
          <p key={e}>{e}</p>
        ))}
        {!!s.trainingSamples?.length&&<details><summary>期間の最初と最後の練習実績</summary>{s.trainingSamples.map((sample,i)=><div key={sample.day}><h4>{i===0?'最初の練習':'最後の練習'} · {challengeDate(sample.day)}</h4>{sample.exercises.map(e=>{const exercise=exerciseById(e.exerciseId);return <p key={e.exerciseId}>{exercise?.name??e.exerciseId}：{e.sets.map(x=>`${x.load}kg×${x.reps}回`).join('、')||'実施なし'}（予定{e.plannedSets}セット）。{e.reason} {exercise?loadSpec(exercise).label:''}</p>;})}</div>)}</details>}
        <p>
          狙った部位：{PRIORITIES[r.strategy.priority]}／優先しなかったこと：
          {r.strategy.tradeoff}
        </p>
        <p>
          個々の筋量変化は刺激・食事・回復・成長余地などを同時に計算した結果で、一つの要因だけとは断定しません。
        </p>
      </details>
      <h3>{r.number===20||r.number===40?"挑戦の結果へ":"次の作戦へ"}</h3>
      <p>
        {r.number===20||r.number===40
          ? "今回の挑戦を、初日からの身体と大会の記録で振り返れます。"
          : s.shortDays
          ? `${s.days}日のうち${s.shortDays}日は食事が目標に不足しました。次は食費上限を上げる案と、同じ予算で調理方法を変える案を比較できます。勤務収入との両立も確認しましょう。`
          : s.fatigue / s.days > 0.55
            ? "回復の余裕を増やす案、短時間に絞る案を比較できます。"
            : r.show
              ? `舞台の評価を次の育成へつなげましょう。${r.show.score.posing<50?'ポージング時間を増やす案と、筋量へ時間を使う案を比較できます。':'次は弱点への重点練習と同じ大会への再挑戦を比較できます。結果の配点込みの差も判断材料になります。'}`
              : "今回伸びた部位を続けるか、他の部位や大会へ配分するかを考えられます。"}
      </p>
      <div className="button-row">
        <button className="primary" onClick={onNext}>
          {archived ? "記録を閉じる" : r.number===20?'国内編の結果を振り返る':r.number===40?'世界編の結果を振り返る':`決断${r.number + 1}の作戦を考える`}
        </button>
        <button onClick={()=>onBody(targets[0]??changes[0].p)}>育てた部位を身体で見る</button>
      </div>
    </section>
  );
}
export function ChallengeShowView({
  show: s,
  model,
  initial='card', onReveal,
}: {
  show: ChallengeShow;
  model: string;
  initial?:'card'|'entry'|'result'; onReveal?:()=>void;
}) {
  const [phase, setPhase] = useState<"card" | "entry" | "stage" | "result">(
      initial,
    ),
    [pose, setPose] = useState("StageEntry"),
    [playing,setPlaying]=useState(false),
    [rivalCompare,setRivalCompare]=useState(false);
  useEffect(()=>{
    if(phase!=='stage'||!playing)return;
    const t=setTimeout(()=>{
      if(pose==='StageEntry')setPose('FrontDoubleBiceps');
      else if(pose==='FrontDoubleBiceps')setPose('BackDoubleBiceps');
      else {setPhase('result');setPlaying(false);onReveal?.();}
    },pose==='StageEntry'?2600:3800);
    return()=>clearTimeout(t);
  },[phase,pose,playing]);
  const above = s.standings.find((v) => v.rank === s.rank - 1),
    nearest = above ?? s.standings.find(v=>v.rank===s.rank+1),
    axes = Object.entries(LOCAL_AXES).map(([k, v]) => ({
      ...v,
      key: k as keyof typeof LOCAL_AXES,
      score: s.score[k as keyof typeof LOCAL_AXES],
      gap: above
        ? (s.score[k as keyof typeof LOCAL_AXES] -
            above.score[k as keyof typeof LOCAL_AXES]) *
          v.weight
        : 0,
    }));
  const weak = [...axes].sort((a, b) => a.score - b.score)[0],
    impact = [...axes].sort((a, b) => a.gap - b.gap)[0];
  return (
    <section className="challenge-show">
      <span className="eyebrow">決断{s.decision}の舞台</span>
      {onReveal && <button onClick={onReveal}>演出を短縮して順位発表へ</button>}
      <h3>{(s.edition?findEdition(s.edition).name:LEAGUE[s.tier].name)}</h3>
      {s.preparation && <p>{s.preparation}</p>}
      <p>
        {challengeDate(s.day)} · 出場{s.count}人 · 支払済み{yen(s.fee)}
      </p>
      {phase === "card" ? (
        <>
          <div className="challenge-memory">
            <span>COMPETITOR 01</span>
            <h4>
              {s.rank === 1 ? "優勝" : s.rank <= 3 ? "入賞" : "舞台の記録"}
            </h4>
            <b>
              {s.rank}/{s.count}位
            </b>
            <p>
              {s.score.total.toFixed(2)}点／筋量{s.score.mass.toFixed(0)}・技術
              {s.score.posing.toFixed(0)}
            </p>
          </div>
          <div className="button-row">
            <button onClick={() => setPhase("entry")}>
              受付から舞台を見る
            </button>
            <button onClick={() => {setPhase("result");onReveal?.();}}>評価を確認する</button>
            <button onClick={()=>downloadShowCard(s)}>記念の結果カードを保存</button>
          </div>
        </>
      ) : phase === "entry" ? (
        <>
          <p>
            計量{weight(s.body).toFixed(1)}
            kg／番号01。育てた身体で舞台へ進みます。ここで育成時間や決断は増えません。
          </p>
          <button
            className="primary"
            onClick={() => {
              setPhase("stage");
              setPose("StageEntry");
              setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
            }}
          >
            選手入場
          </button>
        </>
      ) : phase === "stage" ? (
        <>
          <div className="challenge-stage">
            <BodyView
              body={s.body}
              opponent={rivalCompare ? nearest?.body : undefined}
              selected="chest"
              model={model}
              stage={
                s.tier === "national"
                  ? "local-national"
                  : s.tier === "world"
                    ? "local-world"
                    : "local-" +
                      (s.tier === "gym"
                        ? "gym"
                        : s.tier === "region"
                          ? "rookie"
                          : "open")
              }
              defaultClip={pose}
            />
          </div>
          {nearest && <button aria-pressed={rivalCompare} onClick={()=>{setPlaying(false);setPose("FrontDoubleBiceps");setRivalCompare(!rivalCompare)}}>{rivalCompare?"単独審査へ戻る":"比較審査へ"} · {nearest.name}</button>}
          {rivalCompare && nearest && <p>左が自分、右が{nearest.name}。相手の筋量 {nearest.score.mass.toFixed(1)}／ポージング {nearest.score.posing.toFixed(1)}。</p>}
          <div className="button-row">
            <button onClick={() => {setPlaying(false);setPose("FrontDoubleBiceps");}}>
              フロント・ダブルバイセップス
            </button>
            <button onClick={() => {setPlaying(false);setPose("BackDoubleBiceps");}}>
              背面ポーズ
            </button>
            <button className="primary" onClick={() => {setPhase("result");onReveal?.();}}>
              順位発表へ／演出を省略
            </button>
            <button onClick={()=>setPlaying(!playing)}>{playing?'演出を止めて身体を見る':'短い演出を再生する'}</button>
          </div>
        </>
      ) : (
        <>
          <h4>
            {s.rank===1?"優勝 · ":s.rank<=3?"表彰台 · ":"審査結果 · "}{s.count}人中{s.rank}位 · {s.score.total.toFixed(2)}点
          </h4>
          <p>
            強み：{[...axes].sort((a, b) => b.score - a.score)[0].name}
            。主な課題：{weak.name}。
          </p>
          <p>
            {above
              ? `一つ上の${above.name}と${(above.score.total - s.score.total).toFixed(2)}点差。配点込みの差が最も大きいのは${impact.name}です。`
              : "今回は総合点で最上位でした。次の大会での勝利を保証するものではありません。"}
            {above && impact.key !== weak.key
              ? "最低点と、直上の相手との差が最も大きい項目は異なります。"
              : ""}
          </p>
          <div className="challenge-score-bars">
            {axes.map((a) => (
              <div key={a.key}>
                <span>{a.name}</span>
                <meter min={0} max={100} value={a.score} />
                <b>{a.score.toFixed(1)}</b>
              </div>
            ))}
          </div>
          <details>
            <summary>配点と採点の意味</summary>
            <p>
              筋量は体格に対する筋質量、バランスは部位の配分、ポージングは練習した習熟、状態は疲労と睡眠から評価します。
            </p>
            <p>
              {s.judging==="life-1"?"仕上がりは架空審査の中心値12%との差1ポイントにつき3.5点の減点。":"仕上がりは架空ルールの体脂肪12〜22%で100点、範囲外の1ポイントにつき5点減点。"}満点は総合の15点分で、現実の大会の仕上がり判定ではありません。
            </p>
            {axes.map((a) => (
              <p key={a.key}>
                {a.name}：{a.score.toFixed(1)}×{a.weight}＝
                {(a.score * a.weight).toFixed(2)}点
              </p>
            ))}
          </details>
          <details>
            <summary>ライバルとの比較</summary>
            {nearest&&<><button onClick={()=>setRivalCompare(!rivalCompare)}>{rivalCompare?'身体の比較を閉じる':'比較審査の相手を見る'}</button>{rivalCompare&&<BodyComparison before={s.body} after={nearest.body} model={model} labels={['自分',nearest.name]}/>}</>}
            {s.standings.map((v) => (
              <p key={v.id}>
                {v.rank}位 {v.name}／{v.score.total.toFixed(2)}点／筋量
                {v.score.mass.toFixed(0)}・技術{v.score.posing.toFixed(0)}
              </p>
            ))}
          </details>
          <button onClick={() => setPhase("card")}>結果カードへ戻る</button>
        </>
      )}
    </section>
  );
}
export function ChallengeEndingView({
  run: r,
  onContinue,
  onBody,
  onTitle,
}: {
  run: ChallengeRun;
  onContinue: () => void;
  onBody: () => void;
  onTitle: () => void;
}) {
  const [compareDomestic,setCompareDomestic]=useState(false);
  const e = r.status === "worldEnd" ? r.world! : r.domestic!,
    records = r.records.slice(0, e.at),
    first = records.flatMap((x) => (x.show ? [x.show] : []))[0],
    last = records.flatMap((x) => (x.show ? [x.show] : [])).at(-1),
    parts = PARTS.map((p) => ({
      p,
      d: e.body.muscle[p] - r.initial.athlete.body.muscle[p],
    })).sort((a, b) => b.d - a.d);
  return (
    <section className="challenge-ending">
      <span className="eyebrow">{e.at}の決断が作ったキャリア</span>
      <h2>{e.title ?? "自分の身体で、ここまで来た。"}</h2>
      <p>{e.text}</p>
      {r.origin && <section><h3>{profile(r.origin).title}</h3><p>{r.origin.birthplace}から始まった挑戦。{r.storyVersion===2 ? records.find(x=>x.fact?.action==="letter")?.response : profile(r.origin).ending}</p><blockquote>{profile(r.origin).wish}</blockquote></section>}
      {e.at===40 && r.domestic && <button aria-pressed={compareDomestic} onClick={()=>setCompareDomestic(!compareDomestic)}>{compareDomestic?"初日と比較する":"国内20回の身体と比較する"}</button>}
      <BodyComparison
        before={compareDomestic&&r.domestic?r.domestic.body:r.initial.athlete.body}
        after={e.body}
        model={r.career.versions.model}
        labels={[compareDomestic?"国内20回の最後":"初日",e.at===20?"国内20回の最後":"世界40回の最後"]}
      />
      <div className="challenge-memory">
        <h3>{r.career.athlete.name}の挑戦記録</h3>
        <p>
          筋質量
          {formatDelta(
            muscleMass(e.body) - muscleMass(r.initial.athlete.body),
            2,
            "kg",
          )}
          ／{parts[0].d>0?'最も伸びた部位':'変化が最も小さかった部位'}：{LABELS[parts[0].p]}{" "}
          {formatDelta(parts[0].d, 2, "kg")}
        </p>
        <p>
          技術
          {formatDelta(
            (e.posing - r.initial.progress!.posing) * 100,
            1,
            "ポイント",
          )}
          ／資金{formatDelta(e.money - r.initial.athlete.life.money, 0, "円")}
        </p>
        <p>
          最初の大会：
          {first ? `${(first.edition?findEdition(first.edition).name:LEAGUE[first.tier].name)} ${first.rank}位` : "出場なし"}
          。最後の大会：
          {last ? `${(last.edition?findEdition(last.edition).name:LEAGUE[last.tier].name)} ${last.rank}位` : "出場なし"}。
        </p>
        <p>
          {records.filter((x) => x.strategy.workRatio < 1).length}
          回は仕事を減らして育成へ、
          {records.filter((x) => x.show).length}
          回は舞台への挑戦を選びました。
        </p>
      </div>
      <details>
        <summary>重要だった決断とライバル</summary>
        {records.filter((x,i)=>i===0 || i===records.findIndex(v=>!!v.show) || i===records.findIndex(v=>v.show && v.show.rank<=3) || i===records.length-1)
          .map((x) => (
            <p key={x.number}>
              決断{x.number}：{x.strategy.name}。{x.show ? (x.show.edition?findEdition(x.show.edition).name:LEAGUE[x.show.tier].name)+" "+x.show.rank+"位" : x.strategy.aim}
            </p>
          ))}
        {r.rivals
          .filter((x) => x.history.some(h=>h.decision<=e.at))
          .map((x) => (
            <p key={x.id}>
              {x.name}と{x.history.filter((h) => h.decision <= e.at).length}
              回対戦。
            </p>
          ))}
      </details>
      <p>
        これは挑戦の区切りです。引退を強制しません。国内20回の結果は固定して保存しています。
      </p>
      <div className="button-row">
        {e.at === 20 && (
          <button className="primary" onClick={onContinue}>
            {r.limit === 20
              ? "同じ選手で世界編の追加20回へ"
              : "世界編の決断21へ進む"}
          </button>
        )}
        <button onClick={onBody}>身体とキャリアを振り返る</button>
        <button onClick={onTitle}>タイトルへ</button>
      </div>
    </section>
  );
}
export function ChallengeGraph({ run: r }: { run: ChallengeRun }) {
  const [metric, setMetric] = useState<"muscle" | "weight" | "fat" | "part">("muscle"),
    [part,setPart]=useState<Part>("chest"),
    [detail, setDetail] = useState(false);
  const points = [
      { n: 0, b: r.initial.athlete.body, day: 0 },
      ...r.records.map((v) => ({ n: v.number, b: v.after, day: v.to })),
    ],
    get = (b: BodyState) =>
      metric === "muscle"
        ? muscleMass(b)
        : metric === "weight"
          ? weight(b)
          : metric === "part" ? b.muscle[part] : b.fat;
  const vals = points.map((v) => get(v.b)),
    min = Math.min(...vals),
    max = Math.max(...vals),
    range = max - min,
    padding = detail ? Math.max(0.1, range * 0.1) : Math.max(1, range * 0.2),
    low = detail ? Math.max(0, min - padding) : 0,
    high = max + padding,
    span = high - low;
  return (
    <section className="challenge-graph">
      <h2>決断が作った身体の推移</h2>
      <div className="button-row">
        {[
          ["muscle", "筋質量"],
          ["weight", "体重"],
          ["fat", "脂肪量"],
          ["part", "部位別へ"],
        ].map(([k, label]) => (
          <button
            key={k}
            aria-pressed={metric === k}
            onClick={() => setMetric(k as typeof metric)}
          >
            {label}
          </button>
        ))}
        <button aria-pressed={detail} onClick={() => setDetail(!detail)}>
          {detail ? "全体の量を見る" : "変化を詳しく見る"}
        </button>
      </div>
      {metric === "part" && <label>調べる部位<select value={part} onChange={e=>setPart(e.target.value as Part)}>{PARTS.map(p=><option key={p} value={p}>{LABELS[p]}</option>)}</select></label>}
      <p>
        {detail
          ? "縦軸の範囲を表示して変化に寄っています。"
          : "縦軸を0から表示しています。"}
        単位kg／横軸は決断番号。
      </p>
      <svg
        viewBox="0 0 700 250"
        role="img"
        aria-label={`${low.toFixed(1)}〜${high.toFixed(1)}kg、初日${vals[0].toFixed(1)}から現在${vals.at(-1)!.toFixed(1)}kg`}
      >
        <text x="8" y="25">
          {high.toFixed(1)}kg
        </text>
        <text x="8" y="208">
          {low.toFixed(1)}kg
        </text>
        <path d="M85 25V210H680" fill="none" stroke="#9aad9f" />
        <polyline
          fill="none"
          stroke="#315c43"
          strokeWidth="3"
          points={points
            .map(
              (v, i) =>
                `${90 + (v.n / r.limit) * 570},${205 - ((get(v.b) - low) / span) * 175}`,
            )
            .join(" ")}
        />
        {points.map((v, i) => (
          <g key={v.n}>
            <circle
              cx={90 + (v.n / r.limit) * 570}
              cy={205 - ((get(v.b) - low) / span) * 175}
              r={r.records[v.n - 1]?.show ? 6 : 3}
              fill={r.records[v.n - 1]?.show ? "#75891e" : "#315c43"}
            />
            {(i === 0 || i === points.length - 1 || v.n % 4 === 0) && (
              <text x={90 + (v.n / r.limit) * 570} y="238" textAnchor="middle">
                {v.n}
              </text>
            )}
          </g>
        ))}
      </svg>
      <p>
        {challengeDate(0)} {vals[0].toFixed(2)}kg →{" "}
        {challengeDate(r.career.athlete.day)} {vals.at(-1)!.toFixed(2)}
        kg。大きな点は大会。4決断で章が変わります。
      </p>
      <details>
        <summary>決断ごとの日付と数値</summary>
        {points.map((v) => (
          <p key={v.n}>
            決断{v.n}／{challengeDate(v.day)}／{get(v.b).toFixed(2)}kg{" "}
            {r.records[v.n - 1]?.show
              ? LEAGUE[r.records[v.n - 1].show!.tier].name
              : ""}
          </p>
        ))}
      </details>
    </section>
  );
}
