import { useEffect, useState } from "react";
const displayNumber = (value: number) => String(Number(value.toFixed(6)));
export function Numeric({
  label,
  value,
  min,
  max,
  step = 1,
  onCommit,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onCommit: (n: number) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(displayNumber(value)),
    [error, setError] = useState(false);
  useEffect(() => {
    setDraft(displayNumber(value));
    setError(false);
  }, [value]);
  const commit = () => {
    const n = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(n) || n < min || n > max) {
      setError(true);
      return;
    }
    setError(false);
    if (n !== value && n !== Number(displayNumber(value))) onCommit(n);
  };
  return (
    <label>
      {label}
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-invalid={error}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {error && (
        <small role="alert">
          {min}〜{max}の範囲で入力してください。計画は未変更です。
        </small>
      )}
    </label>
  );
}
