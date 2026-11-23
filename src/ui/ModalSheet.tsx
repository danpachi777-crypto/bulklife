import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
let openSheets = 0;
const overlayEvent = () =>
  window.dispatchEvent(
    new CustomEvent("bulk-life-overlay", { detail: openSheets > 0 }),
  );

export function ModalSheet({
  title,
  label = title,
  onClose,
  busy = false,
  children,
  actions,
  body = false,
}: {
  title: string;
  label?: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
  actions?: ReactNode;
  body?: boolean;
}) {
  const dialog = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    dialog.current?.querySelector<HTMLElement>(".panel-content")?.scrollTo({top:0,behavior:"instant"});
  }, [title]);
  useEffect(() => {
    openSheets++;
    overlayEvent();
    const trigger = document.activeElement as HTMLElement | null;
    const scroll = window.scrollY;
    const app = document.querySelector<HTMLElement>(
      ".experience-app, .opening, .challenge-game, .challenge-archive",
    );
    const oldStyle = document.body.getAttribute("style");
    const wasInert = app?.inert ?? false;
    if (app) app.inert = true;
    Object.assign(document.body.style, {
      position: "fixed",
      top: `-${scroll}px`,
      width: "100%",
      overflow: "hidden",
    });
    dialog.current
      ?.querySelector<HTMLElement>("button")
      ?.focus({ preventScroll: true });
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) close.current();
      if (e.key !== "Tab") return;
      const controls = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],summary,[tabindex="0"]',
        ) ?? [],
      ).filter((el) => el.getClientRects().length);
      const first = controls[0],
        last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      openSheets--;
      overlayEvent();
      document.removeEventListener("keydown", keydown);
      if (app) app.inert = wasInert;
      if (oldStyle === null) document.body.removeAttribute("style");
      else document.body.setAttribute("style", oldStyle);
      window.scrollTo({ top: scroll, behavior: "instant" });
      trigger?.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <div className="panel-scrim">
      <section
        ref={dialog}
        className={`edit-panel${body ? " body-detail-panel" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <header>
          <h2>{title}</h2>
          <button disabled={busy} onClick={onClose}>
              {body ? "確認を閉じる" : "キャンセル"}
          </button>
        </header>
        <div className="panel-content">{children}</div>
        {actions && <div className="panel-actions">{actions}</div>}
      </section>
    </div>,
    document.body,
  );
}
