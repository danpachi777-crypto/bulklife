import type { PwaState } from "./usePwa";
export function PwaNotice({
  state: s,
  busy,
  onUpdate,
}: {
  state: PwaState;
  busy: boolean;
  onUpdate: () => void;
}) {
  if (!s.waiting && s.online) return null;
  return (
    <div className="pwa-notice" role="status">
      {!s.online && (
        <span>オフラインでプレイ中。進行はこの端末に保存されます。</span>
      )}
      {s.waiting && (
        <>
          <span>新しい版を準備できました。</span>
          <button disabled={busy} onClick={onUpdate}>
            保存して更新
          </button>
        </>
      )}
    </div>
  );
}
export function PwaSettings({ state: s }: { state: PwaState }) {
  return (
    <section className="paper pwa-settings">
      <h2>スマホでの使い方</h2>
      <p>
        {s.standalone
          ? "ホーム画面からアプリとして起動しています。"
          : "Safariは共有メニュー、Chromeはメニューから「ホーム画面に追加」を選べます。対応するHTTPS環境で利用できます。"}
      </p>
      {s.installable && (
        <button className="primary" onClick={() => void s.install()}>
          ホーム画面に追加
        </button>
      )}
      {s.development ? (
        <p>
          開発表示です。オフライン起動は本番ビルドのHTTPS環境で利用できます。Wi-FiのHTTP接続でも通常のゲームと保存は使えます。
        </p>
      ) : !s.supported ? (
        <p>
          このブラウザーではオフライン起動を利用できません。通常のWeb版として遊べます。
        </p>
      ) : !s.secure ? (
        <p>
          このHTTP接続ではPWAのオフライン起動を利用できません。HTTPSの公開URLで開いてください。
        </p>
      ) : (
        <>
          <p>
            {s.ready
              ? "オフライン準備済み。育成・大会・記録・3Dをこの版のまま使えます。外部の出典リンクは通信が必要です。"
              : "オフライン用データを準備しています。最初はオンラインのままお待ちください。"}
          </p>
          <button onClick={() => void s.check()}>アプリの更新を確認</button>
        </>
      )}
      {s.error && <p role="status">{s.error}</p>}
      <p>
        セーブは端末・ブラウザー・URLごとに別です。ホーム画面版でも自動共有はありません。移動前に保存ファイルを書き出してください。
      </p>
    </section>
  );
}
