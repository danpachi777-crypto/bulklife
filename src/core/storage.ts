import { type Career, type Library, type DailySummary } from "./model";
import {
  validateCareer,
  validateLibrary,
  validateSummary,
  validateEnvelope,
} from "./validation";
import { packLog } from "./logCodec";
export { validateCareer, validateLibrary } from "./validation";
const DB_NAME = "bulk-life-v1";
let connection: Promise<IDBDatabase> | null = null;
function db() {
  return (connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore("meta");
      d.createObjectStore("careers");
      d.createObjectStore("days", { keyPath: ["careerId", "day"] });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(
        new Error(
          "保存領域を開けません。ブラウザーの設定と容量を確認してください。",
        ),
      );
  }));
}
export async function loadLibrary(): Promise<Library | undefined> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = d.transaction("meta").objectStore("meta").get("library");
    r.onsuccess = () => {
      try {
        if (r.result) validateLibrary(r.result);
        resolve(r.result);
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(r.error);
  });
}
export async function loadCareer(id: string): Promise<Career> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = d.transaction("careers").objectStore("careers").get(id);
    r.onsuccess = () => {
      try {
        validateCareer(r.result);
        resolve(r.result);
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(r.error);
  });
}
export async function save(
  lib: Library,
  c?: Career,
  logs: DailySummary[] = [],
) {
  validateLibrary(lib);
  if (c) {
    validateCareer(c);
    if (!lib.ids.includes(c.athlete.id))
      throw new Error("保存枠が一致しません");
    logs.forEach(validateSummary);
    if (logs.some((l, i) => l.day !== c.athlete.day - logs.length + i))
      throw new Error("日次記録が連続していません");
  }
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const t = d.transaction(["meta", "careers", "days"], "readwrite");
    const failure = () =>
      reject(
        new Error(
          "保存できませんでした。以前の保存は保持しています。容量を確認し、再試行してください。",
        ),
      );
    t.oncomplete = () => resolve();
    t.onerror = t.onabort = failure;
    try {
      t.objectStore("meta").put(lib, "library");
      if (c) {
        t.objectStore("careers").put(c, c.athlete.id);
        for (const log of logs)
          t.objectStore("days").put({ ...log, careerId: c.athlete.id });
      }
    } catch (e) {
      t.abort();
      failure();
    }
  });
}
export async function readLogs(id: string): Promise<DailySummary[]> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = d
      .transaction("days")
      .objectStore("days")
      .getAll(IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]));
    r.onsuccess = () => {
      try {
        const logs = r.result.map(({ careerId, ...v }) => v);
        logs.forEach(validateSummary);
        resolve(logs);
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(r.error);
  });
}
export async function exportSave(lib: Library) {
  const careers = await Promise.all(lib.ids.map(loadCareer));
  const logs = (await Promise.all(lib.ids.map(readLogs))).map((days) =>
    days.map(packLog),
  );
  return JSON.stringify({
    format: "BULK_LIFE",
    logEncoding: "columns-v1",
    library: lib,
    careers,
    logs,
  });
}
export const parseImport = validateEnvelope;
export async function importSave(
  data: ReturnType<typeof parseImport>,
  current: Library,
) {
  // Merge with fresh IDs. Preserve an existing draw as a day-zero roster slot
  // when restoring a different draw, so neither candidate is silently lost.
  const careers = data.careers.map((original) => {
    const c = structuredClone(original),
      old = c.athlete.id;
    c.athlete.id = "bl-" + crypto.randomUUID();
    if (c.progress)
      for (const result of c.progress.results)
        for (const person of result.podium)
          if (person.id === old) person.id = c.athlete.id;
    validateCareer(c);
    return c;
  });
  const importedDraft = data.library.draft
    ? structuredClone(data.library.draft)
    : null;
  if (importedDraft) importedDraft.athlete.id = "bl-" + crypto.randomUUID();
  const preservedDraft =
    importedDraft && current.draft ? structuredClone(current.draft) : null;
  if (preservedDraft) {
    if (preservedDraft.athlete.day !== 0)
      throw new Error(
        "抽選中の選手に日次記録があり、移行できません。元の保存を書き出してください。",
      );
    validateCareer(preservedDraft);
    careers.push(preservedDraft);
  }
  const lib = {
    ...current,
    draft: importedDraft ?? current.draft,
    ids: [...current.ids, ...careers.map((c) => c.athlete.id)],
    activeId: data.careers.length
      ? careers[0].athlete.id
      : (current.activeId ?? preservedDraft?.athlete.id ?? null),
  };
  validateLibrary(lib);
  const d = await db();
  return new Promise<Library>((resolve, reject) => {
    const t = d.transaction(["meta", "careers", "days"], "readwrite");
    try {
      t.objectStore("meta").put(lib, "library");
      careers.forEach((c, i) => {
        t.objectStore("careers").put(c, c.athlete.id);
        (data.logs[i] ?? []).forEach((l) =>
          t.objectStore("days").put({ ...l, careerId: c.athlete.id }),
        );
      });
      t.oncomplete = () => resolve(lib);
      t.onerror = () => reject(t.error);
      t.onabort = t.onerror;
    } catch (e) {
      t.abort();
      reject(e);
    }
  });
}
