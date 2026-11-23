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
        <code>{PORTRAIT_ASSET_URL}</code>
        <a href="/">ゲームへ戻る</a>
      </header>
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
