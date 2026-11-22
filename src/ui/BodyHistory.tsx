import { useState } from "react";
import {
  weight,
  muscleMass,
  type Career,
  type DailySummary,
} from "../core/model";
import { dayDate, signed } from "./Experience";
export function BodyHistory({ c, logs }: { c: Career; logs: DailySummary[] }) {
  const [metric, setMetric] = useState<"weight" | "muscle" | "fat">("muscle"),
    [period, setPeriod] = useState(30);
  const snapshots = [
    c.initial,
    ...c.snapshots,
    ...(c.snapshots.at(-1)?.day === c.athlete.day
      ? []
      : [{ day: c.athlete.day, body: c.athlete.body }]),
  ];
  const previous = snapshots
    .map((s) => s.day < c.athlete.day - period)
    .lastIndexOf(true);
  const points = snapshots.filter(
    (s, i) => s.day >= c.athlete.day - period || i === previous,
  );
  const get = (b: Career["athlete"]["body"]) =>
    metric === "weight"
      ? weight(b)
      : metric === "muscle"
        ? muscleMass(b)
        : b.fat;
  const values = points.map((s) => get(s.body)),
    min = Math.min(...values),
    max = Math.max(...values),
    span = Math.max(5, max * 0.2, max - min),
    low = Math.max(0, Math.floor((min - (span - (max - min)) / 2) * 10) / 10),
    start = points[0].day,
    end = Math.max(start + 1, c.athlete.day);
  const xy = (i: number) => [
    65 + ((points[i].day - start) / (end - start)) * 690,
    145 - ((values[i] - low) / span) * 110,
  ];
  const label =
    metric === "weight"
      ? "体重"
      : metric === "muscle"
        ? "全身の筋質量"
        : "脂肪量";
  return (
    <section className="body-history">
      <h3>まずは全身の変化から</h3>
      <div className="record-filter">
        {(
          [
            ["muscle", "筋質量"],
            ["weight", "体重"],
            ["fat", "脂肪"],
          ] as const
        ).map(([key, name]) => (
          <button
            key={key}
            aria-pressed={metric === key}
            onClick={() => setMetric(key)}
          >
            {name}
          </button>
        ))}
        {[7, 30, 365000].map((n) => (
          <button
            key={n}
            aria-pressed={period === n}
            onClick={() => setPeriod(n)}
          >
            {n === 7 ? "1週間" : n === 30 ? "1か月" : "全期間"}
          </button>
        ))}
      </div>
      <div className="history-chart">
        <h3>{label}（kg）</h3>
        <svg
          viewBox="0 0 800 195"
          role="img"
          aria-label={`${label}、${dayDate(start)} ${values[0].toFixed(2)}kgから${dayDate(c.athlete.day)} ${values.at(-1)!.toFixed(2)}kg。縦軸の幅${span.toFixed(1)}kg。`}
        >
          {[0, 0.5, 1].map((n) => (
            <g key={n}>
              <line
                x1="65"
                x2="755"
                y1={145 - n * 110}
                y2={145 - n * 110}
                stroke="#d6e0d7"
              />
              <text x="5" y={150 - n * 110}>
                {(low + span * n).toFixed(1)}
              </text>
            </g>
          ))}
          <polyline
            fill="none"
            stroke="#315c43"
            strokeWidth="3"
            points={values.map((_, i) => xy(i).join(",")).join(" ")}
          />
          {values.map((_, i) => (
            <circle key={i} cx={xy(i)[0]} cy={xy(i)[1]} r="3" fill="#315c43">
              <title>
                {dayDate(points[i].day)} {values[i].toFixed(2)}kg
              </title>
            </circle>
          ))}
          <text x="65" y="183">
            {dayDate(start)}
          </text>
          <text x="755" y="183" textAnchor="end">
            {dayDate(c.athlete.day)}
          </text>
        </svg>
        <p>
          {values[0].toFixed(2)} → {values.at(-1)!.toFixed(2)}kg / 期間差{" "}
          {signed(values.at(-1)! - values[0], 2, "kg")}
        </p>
        <small>
          縦軸の幅は最低5kg。小さな変化を拡大して見せません。週ごとの身体記録を使用します。
        </small>
        <p className="chart-events">
          期間内の練習{" "}
          {
            logs.filter((s) => s.day >= start && s.training.completedSets > 0)
              .length
          }
          日。大会：
          {[...(c.local?.results ?? []), ...(c.progress?.results ?? [])]
            .filter((r) => r.day >= start)
            .map((r) => dayDate(r.day))
            .join("、") || "なし"}
        </p>
      </div>
    </section>
  );
}
