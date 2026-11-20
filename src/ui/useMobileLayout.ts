import { useEffect, useState } from "react";

export function useMobileLayout() {
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width:800px)").matches,
  );
  useEffect(() => {
    const query = matchMedia("(max-width:800px)");
    const update = () => setMobile(query.matches);
    query.addEventListener("change", update);
    update();
    return () => query.removeEventListener("change", update);
  }, []);
  return mobile;
}

export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      document.documentElement.style.setProperty(
        "--visual-height",
        `${viewport?.height ?? innerHeight}px`,
      );
      document.documentElement.style.setProperty(
        "--visual-top",
        `${viewport?.offsetTop ?? 0}px`,
      );
      document.documentElement.toggleAttribute(
        "data-keyboard",
        !!viewport && innerHeight - viewport.height > 150,
      );
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
}
