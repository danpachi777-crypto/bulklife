import { useEffect, useState } from "react";
export const PRESENTATION_EVENT = "bulk-life-presentation";
export function motionReduced() {
  try {
    const v = localStorage.getItem("bulk-life-motion");
    if (v === "reduce") return true;
    if (v === "full") return false;
  } catch {}
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}
export function setPresentation(key: "motion" | "quality", value: string) {
  try {
    localStorage.setItem("bulk-life-" + key, value);
  } catch {}
  window.dispatchEvent(new Event(PRESENTATION_EVENT));
}
export function useReducedMotion() {
  const [reduced, setReduced] = useState(motionReduced);
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(motionReduced());
    q.addEventListener("change", update);
    window.addEventListener(PRESENTATION_EVENT, update);
    return () => {
      q.removeEventListener("change", update);
      window.removeEventListener(PRESENTATION_EVENT, update);
    };
  }, []);
  return reduced;
}
