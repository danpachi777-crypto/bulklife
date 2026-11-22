import { fatPercent } from "./model";
import type { LocalResult, LocalScore } from "./localCompetitions";
export const LOCAL_AXES = {
  mass: { name: "筋量", weight: 0.3 },
  balance: { name: "バランス", weight: 0.2 },
  condition: { name: "仕上がり", weight: 0.15 },
  posing: { name: "ポージング", weight: 0.25 },
  readiness: { name: "当日の状態", weight: 0.1 },
};
export function localEvaluation(r: LocalResult) {
  const fat = fatPercent(r.body),
    mine = r.standings.find((s) => s.id === "player")!,
    above = r.standings.filter((s) => s.rank < mine.rank).at(-1);
  const contributions = (
    Object.keys(LOCAL_AXES) as (keyof typeof LOCAL_AXES)[]
  ).map((k) => ({
    key: k,
    ...LOCAL_AXES[k],
    score: r.score[k],
    points: r.score[k] * LOCAL_AXES[k].weight,
    gap: above ? (r.score[k] - above.score[k]) * LOCAL_AXES[k].weight : 0,
  }));
  const condition =
    r.score.condition >= 99.99
      ? `体脂肪率${fat.toFixed(1)}%が、この架空大会の満点範囲12〜22%に入っています。現実の大会の仕上がり基準ではありません。満点でも総合への寄与は15点までです。`
      : `体脂肪率${fat.toFixed(1)}%と架空大会の12〜22%基準から、外れた幅1ポイントにつき5点を減じる式です。`;
  return {
    condition,
    contributions,
    above,
    weakest: [...contributions].sort((a, b) => a.score - b.score)[0],
    rankFactors: [...contributions].sort((a, b) => a.gap - b.gap),
  };
}
