import { useEffect, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function usePwa() {
  const [online, setOnline] = useState(navigator.onLine);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [waiting, setWaiting] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [standalone, setStandalone] = useState(
    matchMedia("(display-mode: standalone)").matches,
  );
  useEffect(() => {
    const network = () => setOnline(navigator.onLine);
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallPrompt);
    };
    const display = matchMedia("(display-mode: standalone)");
    const displayChanged = () => setStandalone(display.matches);
    const installed = () => {
      setInstall(null);
      displayChanged();
    };
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", installed);
    display.addEventListener("change", displayChanged);
    let disposed = false;
    let reg: ServiceWorkerRegistration | null = null;
    const update = () => {
      if (!disposed && reg) {
        setWaiting(!!reg.waiting);
        setReady(!!reg.active);
      }
    };
    const controller = () => update();
    if (
      import.meta.env.PROD &&
      window.isSecureContext &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.addEventListener("controllerchange", controller);
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((r) => {
          if (disposed) return;
          reg = r;
          setRegistration(r);
          update();
          r.addEventListener("updatefound", () => {
            const worker = r.installing;
            worker?.addEventListener("statechange", () => {
              update();
              if (worker.state === "redundant" && !r.active)
                setError(
                  "オフライン用データを保存できませんでした。オンラインのまま遊べます。",
                );
            });
          });
          void navigator.serviceWorker.ready.then(() => {
            if (!disposed) setReady(true);
          });
        })
        .catch(() => {
          if (!disposed)
            setError(
              "オフライン保存を準備できませんでした。オンラインで遊べます。",
            );
        });
    }
    return () => {
      disposed = true;
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", installed);
      display.removeEventListener("change", displayChanged);
      if ("serviceWorker" in navigator)
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          controller,
        );
    };
  }, []);
  return {
    online,
    waiting,
    ready,
    error,
    standalone,
    installable: !!install,
    secure: window.isSecureContext,
    supported: "serviceWorker" in navigator,
    development: import.meta.env.DEV,
    async install() {
      if (!install) return;
      await install.prompt();
      await install.userChoice;
      setInstall(null);
    },
    async check() {
      try {
        await registration?.update();
        setWaiting(!!registration?.waiting);
      } catch {
        setError("更新を確認できませんでした。接続後に再試行してください。");
      }
    },
    applyUpdate() {
      if (!registration?.waiting) return;
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => location.reload(),
        { once: true },
      );
      registration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
    },
  };
}
export type PwaState = ReturnType<typeof usePwa>;
