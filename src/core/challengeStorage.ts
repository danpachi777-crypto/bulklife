import type { ChallengeRun } from "./challengeTypes";
import { validateChallenge } from "./challenge";
const NAME = "bulk-life-challenges-v1";
let opened: Promise<IDBDatabase> | undefined;
function db() {
  return (opened ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(NAME, 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("runs", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(Error("挑戦の保存領域を開けません"));
  }));
}
export async function listChallenges(): Promise<ChallengeRun[]> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const q = d.transaction("runs").objectStore("runs").getAll();
    q.onsuccess = () => {
      try {
        q.result.forEach(validateChallenge);
        resolve(q.result.sort((a, b) => (b.updatedAt??b.createdAt) - (a.updatedAt??a.createdAt)));
      } catch (e) {
        reject(e);
      }
    };
    q.onerror = () => reject(q.error);
  });
}
/** Compare-and-swap transaction makes a period batch atomic across tabs/reload.
 * Callers keep the previous UI state until this promise commits. */
export async function persistChallenge(
  input: ChallengeRun,
  expectedRevision: number | null,
): Promise<ChallengeRun> {
  validateChallenge(input);
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction("runs", "readwrite"),
      store = t.objectStore("runs");
    let next: ChallengeRun,
      reason = "保存できませんでした。直前の確定済み状態を保持しています。";
    const q = store.get(input.id);
    q.onsuccess = () => {
      const old = q.result as ChallengeRun | undefined;
      if (
        (expectedRevision === null && old) ||
        (expectedRevision !== null &&
          (!old || old.revision !== expectedRevision))
      ) {
        reason =
          "別の画面で状態が更新されています。再読み込みして保存済みの進行から再開してください。";
        t.abort();
        return;
      }
      next = {
        ...input,
        revision: expectedRevision === null ? 0 : expectedRevision + 1,
        updatedAt: Date.now(),
      };
      try {
        store.put(next);
      } catch {
        t.abort();
      }
    };
    t.oncomplete = () => resolve(next);
    t.onerror = t.onabort = () => reject(Error(reason));
  });
}
export async function exportChallenges() {
  return JSON.stringify({
    format: "BULK_CHALLENGE_ARCHIVE",
    version: 1,
    runs: await listChallenges(),
  });
}
export async function importChallenges(raw: string, newId: () => string) {
  if (raw.length > 100_000_000) throw Error("ファイルが大きすぎます");
  const data = JSON.parse(raw);
  if (
    data.format !== "BULK_CHALLENGE_ARCHIVE" ||
    data.version !== 1 ||
    !Array.isArray(data.runs) ||
    data.runs.length > 100
  )
    throw Error(
      "挑戦用の保存ファイルではありません。従来キャリアは従来の設定から読み込んでください",
    );
  data.runs.forEach(validateChallenge);
  const copies: ChallengeRun[] = data.runs.map((v: ChallengeRun) => {
    const r = structuredClone(v);
    r.id = newId();
    r.importedFrom = v.id;
    r.career.athlete.id = r.id;
    r.initial.athlete.id = r.id;
    if (r.job) r.job.id = `${r.id}:decision-${r.job.number}`;
    r.createdAt = Date.now();
    r.updatedAt = r.createdAt;
    r.revision = 0;
    return r;
  });
  const d = await db();
  return new Promise<ChallengeRun[]>((resolve, reject) => {
    const t = d.transaction("runs", "readwrite");
    for (const r of copies) t.objectStore("runs").add(r);
    t.oncomplete = () => resolve(copies);
    t.onerror = t.onabort = () =>
      reject(Error("読み込めませんでした。既存の挑戦は変更していません"));
  });
}
