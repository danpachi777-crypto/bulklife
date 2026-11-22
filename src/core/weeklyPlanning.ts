import { PARTS, LABELS, type Career } from "./model";
import { STIMULUS } from "./content";
import { exerciseById } from "./exercises";
/** A schedule overlap, not a promise about future recovery percentages. */
export function weeklyTrainingNotes(c: Career) {
  const parts = (d: Career["plan"]["days"][number]) =>
    d.focus === "rest"
      ? []
      : PARTS.filter((p) =>
          d.exercises
            ? d.exercises.some(
                (e) => (exerciseById(e.exerciseId)?.direct[p] ?? 0) >= 0.5,
              )
            : STIMULUS[d.focus][p] >= 0.5,
        );
  return c.plan.days.flatMap((d, i) => {
    const next = (i + 1) % 7,
      common = parts(d).filter((p) => parts(c.plan.days[next]).includes(p));
    return common.length
      ? [
          `${["月", "火", "水", "木", "金", "土", "日"][i]}→${["月", "火", "水", "木", "金", "土", "日"][next]}：${common
            .slice(0, 3)
            .map((p) => LABELS[p])
            .join(
              "・",
            )}を連続して使う予定です。回復は実際の疲労と睡眠にも左右されます。`,
        ]
      : [];
  });
}
