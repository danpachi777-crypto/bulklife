import { useState } from "react";
import {
  PARTS,
  LABELS,
  muscleMass,
  weight,
  fatPercent,
  type Career,
  type Part,
} from "../core/model";
import { PROFILES } from "../core/content";
import { BodyView } from "../view/BodyView";
import { dayDate, signed, yen } from "./Experience";
import { ModalSheet } from "./ModalSheet";
import { useMobileLayout } from "./useMobileLayout";

export function AthleteSummary({
  c,
  part,
  setPart,
}: {
  c: Career;
  part: Part;
  setPart: (p: Part) => void;
}) {
  const a = c.athlete,
    b = a.body;
  const mobile = useMobileLayout();
  const [comparison, setComparison] = useState(-1),
    [inspect, setInspect] = useState(false),
    [bodyOpen, setBodyOpen] = useState(false);
  const old =
    comparison === -1
      ? null
      : comparison === 0
        ? c.initial
        : c.snapshots[comparison - 1];
  const displayedBody = old?.body ?? b,
    profile = PROFILES.find((p) => p.id === a.profileId);
  const full = (
    <section className="athlete-column">
      <div className="athlete-heading">
        <span className="eyebrow">YOUR ATHLETE</span>
        <h2>
          {a.name}
          <small>
            {a.ageAtStart + Math.floor(a.day / 365.2425)}歳 · {a.profileId}
          </small>
        </h2>
        <p>{a.profileTitle}</p>
      </div>
      <BodyView
        body={displayedBody}
        baseline={c.initial.body}
        selected={part}
        onSelectPart={(p) => {
          setPart(p);
          setInspect(true);
        }}
        hair={a.appearance.hair}
        model={c.versions.model}
        title={`${a.name} / ${old ? dayDate(old.day) : "現在"}`}
      />
      <small className="comparison-date">
        {old ? `${dayDate(old.day)}時点の身体値` : "現在の身体値"}
      </small>
      <div className="athlete-metrics">
        <span>
          体重
          <b>
            {weight(displayedBody).toFixed(2)}
            <small>kg</small>
          </b>
        </span>
        <span>
          筋質量
          <b>
            {muscleMass(displayedBody).toFixed(2)}
            <small>kg</small>
          </b>
        </span>
        <span>
          全身回復
          <b>
            {old ? "未記録" : Math.round((1 - a.systemicFatigue) * 100)}
            {!old && <small>/100</small>}
          </b>
        </span>
      </div>
      <div className="button-row">
        <button onClick={() => setInspect(!inspect)}>
          {inspect ? "身体の詳細を閉じる" : "身体を調べる"}
        </button>
        <label>
          過去との比較
          <select
            value={comparison}
            onChange={(e) => setComparison(Number(e.target.value))}
          >
            <option value={-1}>現在の身体</option>
            <option value={0}>初日の身体</option>
            {c.snapshots.map((s, i) => (
              <option key={s.day} value={i + 1}>
                {dayDate(s.day)} / {s.day}日経過
              </option>
            ))}
          </select>
        </label>
      </div>
      {old && (
        <p className="muted">
          過去の身体値を、現在と同じモデル・照明・カメラ条件で表示しています。通常表示では短期のパンプも含まれます。
        </p>
      )}
      {inspect && (
        <div className="body-inspection">
          <label>
            調べる部位
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
          <dl>
            <dt>筋質量</dt>
            <dd>{displayedBody.muscle[part].toFixed(3)}kg</dd>
            <dt>初日との差</dt>
            <dd>
              {signed(displayedBody.muscle[part] - c.initial.body.muscle[part])}
              kg
            </dd>
            <dt>局所回復</dt>
            <dd>{Math.round((1 - displayedBody.fatigue[part]) * 100)}/100</dd>
            <dt>動作習熟{old ? "（現在の値）" : ""}</dt>
            <dd>{(a.ability[part] * 100).toFixed(1)}/100</dd>
            <dt>一時的なパンプ</dt>
            <dd>{Math.round(displayedBody.pump[part] * 100)}/100</dd>
            <dt>体脂肪率</dt>
            <dd>{fatPercent(displayedBody).toFixed(1)}% / ゲーム値</dd>
          </dl>
          <small>
            筋質量は平常時の水分を含むゲーム推定値。部位は機能上の区分で、独立した筋を意味しません。
          </small>
        </div>
      )}
      <details>
        <summary>この選手の特徴と生活</summary>
        <p>{profile?.challenge}</p>
        <p>
          {profile?.experience}。{profile?.environment}
        </p>
        <p>
          月収 {yen(a.life.income)} / 固定費 {yen(a.life.fixed)} / 仕事{" "}
          {a.life.work}h・通勤 {a.life.commute}h/週
        </p>
        <p>各パターンは独立した1/6の抽選です。目標はいつでも変更できます。</p>
      </details>
    </section>
  );
  if (!mobile) return full;
  return (
    <section className="mobile-athlete" aria-label="選手の現在の状態">
      <div className="mobile-athlete-preview">
        {!bodyOpen && (
          <BodyView
            body={b}
            baseline={c.initial.body}
            selected={part}
            hair={a.appearance.hair}
            model={c.versions.model}
            preview
          />
        )}
      </div>
      <div className="mobile-athlete-stats">
        <span>
          体重{" "}
          <b>
            {weight(b).toFixed(2)}
            <small> kg</small>
          </b>
        </span>
        <span>
          筋質量{" "}
          <b>
            {muscleMass(b).toFixed(2)}
            <small> kg</small>
          </b>
        </span>
        <span>
          回復{" "}
          <b>
            {Math.round((1 - a.systemicFatigue) * 100)}
            <small> /100</small>
          </b>
        </span>
        <span className="athlete-condition">
          {a.systemicFatigue > 0.6
            ? "疲労が残っています"
            : a.systemicFatigue > 0.3
              ? "疲労を確認しながら"
              : "回復は順調です"}
        </span>
      </div>
      <button
        className="athlete-detail-link"
        onClick={() => setBodyOpen(true)}
        aria-label="3D選手を詳しく見る。回転・部位選択・過去との比較"
      >
        身体を詳しく見る<span aria-hidden="true">＋</span>
      </button>
      {bodyOpen && (
        <ModalSheet
          title="身体を詳しく見る"
          body
          onClose={() => setBodyOpen(false)}
        >
          {full}
        </ModalSheet>
      )}
    </section>
  );
}
