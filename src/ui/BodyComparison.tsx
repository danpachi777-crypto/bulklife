import { useState } from "react";
import { useMobileLayout } from "./useMobileLayout";
import { BodyView } from "../view/BodyView";
import { weight,muscleMass,fatPercent,type BodyState } from "../core/model";
export function BodyComparison({
  before,
  after,
  model,
  labels = ["期間前", "期間後"],
}: {
  before: BodyState;
  after: BodyState;
  model: string;
  labels?: [string,string];
}) {
  const mobile=useMobileLayout(),[index,setIndex]=useState(1),[angle,setAngle]=useState(0),[clip,setClip]=useState("GymIdle");
  return <section className="life-compare">
    <div className="button-row">{["正面","側面","背面"].map((name,i)=><button key={name} aria-pressed={angle===i} onClick={()=>setAngle(i)}>{name}</button>)}
    <button aria-pressed={clip==="FrontDoubleBiceps"} onClick={()=>setClip(clip==="GymIdle"?"FrontDoubleBiceps":"GymIdle")}>大会ポーズ</button></div>
    {mobile && <div className="button-row">{labels.map((label,i)=><button key={i} aria-pressed={index===i} onClick={()=>setIndex(i)}>{label}</button>)}</div>}
    <div className={mobile?"life-single-body":"challenge-compare"}>
      {[
        [labels[0], before],
        [labels[1], after],
      ].filter((_,i)=>!mobile||i===index).map(([name, body]) => (
        <div key={name as string}>
          <h3>{name as string}</h3>
          <BodyView
            body={body as BodyState}
            selected="chest"
            model={model}
            comparisonAngle={angle*Math.PI/2}
            defaultClip={clip}
            preview
            comparison
          />
          <p>
            体重{weight(body as BodyState).toFixed(1)}kg／筋質量
            {muscleMass(body as BodyState).toFixed(2)}kg／体脂肪{fatPercent(body as BodyState).toFixed(1)}%
          </p>
        </div>
      ))}
    </div></section>;
}
