import { useState, type ReactNode } from "react";
import type { Career } from "../core/model";
import { BodyView } from "../view/BodyView";
import { ModalSheet } from "./ModalSheet";
import { setPresentation, useReducedMotion } from "./presentationSettings";
import { PwaSettings } from "../pwa/PwaControls";
import type { PwaState } from "../pwa/usePwa";

export function Opening({
  c,
  phase,
  hasSave,
  busy,
  onBegin,
  onContinue,
  onTitle,
  onExport,
  onImport,
  pwa,
  error,
  children,
}: {
  c: Career;
  phase: "title" | "create";
  hasSave: boolean;
  busy: boolean;
  onBegin: () => void;
  onContinue: () => void;
  onTitle: () => void;
  onExport: () => void;
  onImport: () => void;
  pwa: PwaState;
  error: string;
  children?: ReactNode;
}) {
  const [settings, setSettings] = useState(false);
  const reduced = useReducedMotion();
  return (
    <main className={`opening opening-${phase}`}>
      <header className="opening-heading">
        <h1>
          BULK <span>LIFE</span>
        </h1>
        <p>その選択が、身体になる。</p>
      </header>
      <div
        className="opening-world"
        aria-label={
          phase === "title" ? "夜のジムで準備する選手" : "ジムで選手を迎える"
        }
      >
        <BodyView
          body={c.athlete.body}
          selected="chest"
          hair={c.athlete.appearance.hair}
          model={c.versions.model}
          presentation={phase === "title" ? "title" : "creation"}
          defaultClip={
            phase === "title"
              ? "SeatedPrepare"
              : reduced
                ? "GymIdle"
                : "StandUp"
          }
        />
      </div>
      {error && (
        <p className="opening-error" role="alert">
          {error}
        </p>
      )}
      {phase === "title" ? (
        <section className="opening-menu" aria-label="ゲームを始める">
          {hasSave && (
            <button className="primary" disabled={busy} onClick={onContinue}>
              つづきから{" "}
              <small>
                {c.athlete.name} · {c.athlete.day}日経過
              </small>
            </button>
          )}
          <button
            className={!hasSave ? "primary" : ""}
            disabled={busy}
            onClick={onBegin}
          >
            キャリアを始める
          </button>
          <button disabled={busy} onClick={() => setSettings(true)}>
            設定
          </button>
        </section>
      ) : (
        <section
          className={`creation-panel${reduced ? " motion-reduced" : ""}`}
          aria-label="選手を作成"
        >
          <div className="creation-heading">
            <h2>この選手と、始めよう。</h2>
            <button disabled={busy} onClick={onTitle}>
              タイトルへ
            </button>
          </div>
          {children}
        </section>
      )}
      {settings && (
        <ModalSheet title="設定" onClose={() => setSettings(false)} busy={busy}>
          <div className="opening-settings">
            <label>
              動きの量
              <select
                defaultValue={
                  localStorage.getItem("bulk-life-motion") ?? "auto"
                }
                onChange={(e) => setPresentation("motion", e.target.value)}
              >
                <option value="auto">端末の設定に合わせる</option>
                <option value="reduce">動きを減らす</option>
                <option value="full">通常の動き</option>
              </select>
            </label>
            <label>
              描画品質
              <select
                defaultValue={
                  localStorage.getItem("bulk-life-quality") ??
                  (matchMedia("(max-width:800px)").matches
                    ? "light"
                    : "standard")
                }
                onChange={(e) => setPresentation("quality", e.target.value)}
              >
                <option value="light">軽量</option>
                <option value="standard">標準（影あり）</option>
              </select>
            </label>
            <p>
              外見と描画の設定で、育成の有利不利は変わりません。音は使用していません。
            </p>
            <div className="button-row">
              <button disabled={busy} onClick={onExport}>
                セーブを書き出す
              </button>
              <button disabled={busy} onClick={onImport}>
                セーブを読み込む
              </button>
            </div>
            <PwaSettings state={pwa} />
          </div>
        </ModalSheet>
      )}
    </main>
  );
}
