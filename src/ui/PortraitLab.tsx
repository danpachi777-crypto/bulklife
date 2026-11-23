import { useState } from "react";
import { BodyView } from "../view/BodyView";
import { portraitBody, PORTRAIT_CASES } from "../view/portraitCases";
import { weight, fatPercent, muscleMass } from "../core/model";
import { PORTRAIT_ASSET_URL } from '../view/portraitAsset';
export default function PortraitLab() {
  const [variant, setVariant] = useState("standard");
  const b = portraitBody(variant);
  return (
    <main className="portrait-lab">
      <header>
        <h1>人物・体型の制作確認</h1>
        <p>制作確認用の身体値です。育成中の選手やセーブには反映しません。</p>
        <code>{new URLSearchParams(location.search).has('portrait-baseline')?'/assets/athlete-v6.glb?revision=8e81d79dd2aa':PORTRAIT_ASSET_URL}</code>
        <a href="/">ゲームへ戻る</a>
      </header>
      <p>同条件の顔比較：<a href="?portrait-lab=1&portrait-face=1&portrait-still=1&portrait-baseline=1&render-stats=1">基準v6</a> / <a href="?portrait-lab=1&portrait-face=1&portrait-still=1&render-stats=1">改修版</a>（同じカメラ・照明・体型、待機を停止）</p>
      <nav aria-label="比較する体型">
        {PORTRAIT_CASES.map((c) => (
          <button
            key={c.id}
            className={variant === c.id ? "selected" : ""}
            onClick={() => setVariant(c.id)}
          >
            {c.label}
          </button>
        ))}
      </nav>
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
