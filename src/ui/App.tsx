// The previous screen implementation is preserved in git at cc3cdb5.
import { lazy, Suspense } from "react";
import { App as ExperienceApp } from "./ExperienceApp";
import { ChallengeApp } from './ChallengeApp';
const PortraitLab = import.meta.env.DEV ? lazy(() => import("./PortraitLab")) : null;
export function App() {
  return PortraitLab &&
    new URLSearchParams(location.search).has("portrait-lab") ? (
    <Suspense fallback={<p>制作確認を読み込み中…</p>}>
      <PortraitLab />
    </Suspense>
  ) : (
    <ChallengeApp Legacy={ExperienceApp} />
  );
}
