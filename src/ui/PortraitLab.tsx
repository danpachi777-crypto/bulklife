import { useState } from "react";
import { BodyView } from "../view/BodyView";
import { portraitBody, PORTRAIT_CASES } from "../view/portraitCases";
import { weight, fatPercent, muscleMass } from "../core/model";
import { portraitAsset } from '../view/portraitAsset';
import {anatomyBody,ANATOMY_ROUTES,type AnatomyRoute} from '../view/anatomyCases';
export default function PortraitLab() {
  const [variant, setVariant] = useState("standard");
  const [reference,setReference]=useState(false),[route,setRoute]=useState<AnatomyRoute>('A'),[stage,setStage]=useState(1);
  const b = reference?anatomyBody(route,stage):portraitBody(variant);
  return (
    <main className="portrait-lab">
      <header>
        <h1>人物・体型の制作確認</h1>
        <p>制作確認用の身体値です。育成中の選手やセーブには反映しません。</p>
        <code>{new URLSearchParams(location.search).has('portrait-baseline')?`基準 ${new URLSearchParams(location.search).get('portrait-baseline')==='v7'?'v7':'v6'}`:portraitAsset(b.height)}</code>
        <a href="/">ゲームへ戻る</a>
      </header>
      <p>同条件の顔比較：<a href="?portrait-lab=1&portrait-face=1&portrait-still=1&portrait-baseline=v7&render-stats=1">修正前v7</a> / <a href="?portrait-lab=1&portrait-face=1&portrait-still=1&render-stats=1">改修版v8</a>（同じカメラ・照明・体型、待機を停止）</p>
      <button onClick={()=>setReference(!reference)}>{reference?'部位の組み合わせへ':'参照A〜D・5段階を調べる'}</button>
      {reference&&<fieldset><legend>参照と対応する制作基準</legend>
       <select aria-label="骨格と変化経路" value={route} onChange={e=>setRoute(e.target.value as AnatomyRoute)}>{Object.entries(ANATOMY_ROUTES).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select>
       <label>段階 {stage.toFixed(1)}<input type="range" min="1" max="5" step=".1" value={stage} onChange={e=>setStage(Number(e.target.value))}/></label>
       <p>写真から体重や体脂肪率を測定した値ではありません。段階の間も連続して変形します。Dは脂肪量の変化で、別の骨格には切り替わりません。</p>
      </fieldset>}
      {!reference&&<nav aria-label="比較する体型">
        {PORTRAIT_CASES.map((c) => (
          <button
            key={c.id}
            className={variant === c.id ? "selected" : ""}
            onClick={() => setVariant(c.id)}
          >
            {c.label}
          </button>
        ))}
      </nav>}
      <p>
        体重 {weight(b).toFixed(1)}kg / 筋質量 {muscleMass(b).toFixed(1)}kg /
        体脂肪 {fatPercent(b).toFixed(1)}%（ゲーム値）
      </p>
      <BodyView
        body={b}
        selected="chest"
        model="athlete-v2"
        defaultClip="GymIdle"
      />
    </main>
  );
}
