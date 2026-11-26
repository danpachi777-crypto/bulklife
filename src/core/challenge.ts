import {validateTurningFact,makeFact,turningEnding,turningPoint,turningStrategies} from "./turningPoints";
import { currentEpisode, lifeCandidates, originFor, validOrigin } from "./lifeStory";
import {
  PARTS,
  LABELS,
  muscleMass,
  fatPercent,
  partMap,
  weight,
  type Career,
  type DailySummary,
} from "./model";
import { PROFILES } from "./content";
import {
  drawIndex,
  generateCareer,
  simulateDay,
  planIssues,
} from "./simulation";
import {
  guideFor,
  resolvedGoal,
  setupCoach,
  proposeCoach,
  adoptCoach,
} from "./coach";
import { changeEmployment, changeEquipment } from "./progress";
import { nutritionPlan } from "./nutrition";
import { sessionMinutes } from "./exercises";
import { assessFood } from "./planning";
import { localPerson, scoreLocal } from "./localCompetitions";
import { validateCareer, validateBody } from "./validation";
import type {
  ChallengeRun,
  Strategy,
  StageTier,
  PeriodStats,
  ChallengeEnding,
  ChallengeMode,
  ChallengeShow,
} from "./challengeTypes";
export const PERIOD_DAYS = [
  28, 42, 56, 70, 56, 70, 70, 84, 84, 84, 84, 84, 70, 84, 84, 98, 56, 70, 70,
  84,
] as const;
export const CHAPTERS = [
  "土台",
  "発見",
  "専門化",
  "勝負",
  "集大成",
  "世界への条件",
  "遠征と生活",
  "世界のライバル",
  "選手としての強み",
  "最後の舞台",
];
export const LEAGUE: Record<
  StageTier,
  { name: string; fee: number; travel: number; hours: number }
> = {
  gym: { name: "リーフジム測定会", fee: 500, travel: 0, hours: 2 },
  region: { name: "BULK地域新人戦", fee: 1500, travel: 500, hours: 4 },
  open: { name: "BULK地方オープン", fee: 4000, travel: 2000, hours: 6 },
  national: { name: "BULK日本グランプリ", fee: 18000, travel: 15000, hours: 6 },
  world: {
    name: "BULKワールドファイナル",
    fee: 40000,
    travel: 180000,
    hours: 6,
  },
};
export const TIERS = Object.keys(LEAGUE) as StageTier[];
export function decisionDays(number: number) {
  if (!Number.isInteger(number) || number < 1 || number > 40)
    throw Error("決断番号が無効です");
  return PERIOD_DAYS[(number - 1) % 20];
}
export function compactCareer(c: Career): Career {
  const v = structuredClone(c);
  delete v.local;
  delete v.oneDayPlan;
  if (v.progress) {
    v.progress.rivals = [];
    v.progress.entries = [];
    v.progress.results = [];
    v.progress.decision = null;
    v.progress.goal = null;
  }
  v.pendingEvent = null;
  return v;
}
export function newChallenge(
  mode: ChallengeMode,
  seed: number,
  id: string,
): ChallengeRun {
  if (!id.startsWith("bl-")) id = "bl-" + id;
  const [i] = drawIndex(seed),
    c = compactCareer(
      setupCoach(
        generateCareer(PROFILES[i], (seed ^ 0x7ac391) >>> 0 || 1, id),
        { budget: 1200, foodStyle: "budget" },
      ),
    );
  const names = [
    "蒼井 航平",
    "榊原 誠",
    "水野 拓海",
    "小野寺 亮",
    "深沢 悠人",
    "早川 健",
    "宮坂 透",
    "川端 陸",
    "藤代 直哉",
    "高槻 翔",
    "ノア・マルタン",
    "ルイス・コスタ",
  ];
  const rivals = names.map((name, n) => {
    let r = compactCareer(
      generateCareer(
        PROFILES[n % 6],
        (seed ^ ((n + 1) * 91771)) >>> 0 || 1,
        `bl-rival-${n}`,
      ),
    );
    r.athlete.name = name;
    const scale = 0.9 + n * 0.035;
    r.athlete.body.muscle = partMap((p) => r.athlete.body.muscle[p] * scale);
    r.athlete.body.capacity = partMap(
      (p) => r.athlete.body.muscle[p] * (1.25 + n * 0.02),
    );
    r.athlete.ability = partMap(() => 0.2 + n * 0.025);
    r.progress!.posing = 0.18 + n * 0.035;
    r.athlete.life.money = 300000 + n * 20000;
    r.athlete.life.income = 180000 + n * 4000;
    r.initial.body = structuredClone(r.athlete.body);
    r = setupCoach(r, { budget: 1200, foodStyle: "budget", minutes: 45 });
    return {
      id: r.athlete.id,
      name,
      style: ["全身の厚み", "ポージング", "背中の広がり", "脚の土台"][n % 4],
      career: r,
      history: [],
    };
  });
  return {
    format: "BULK_CHALLENGE",
    version: 1,
    calculation: "decisions-1",
    modelVersion: "anatomy-v8",
    origin: originFor(seed),
    storyVersion:2,
    id,
    revision: 0,
    seed,
    mode,
    limit: mode === "japan" ? 20 : 40,
    career: c,
    initial: structuredClone(c),
    rivals,
    records: [],
    status: "planning",
    job: null,
    domestic: null,
    world: null,
    tutorialHidden: false,
    createdAt: Date.now(),
  };
}
export function eligibilityChallenge(r: ChallengeRun, tier: StageTier) {
  const shows = r.records.flatMap((x) => (x.show ? [x.show] : [])),
    has = (t: StageTier, rank: number) =>
      shows.some((s) => s.tier === t && s.rank <= rank);
  if (tier === "gym") return [];
  if (tier === "region") return shows.length ? [] : ["測定会での出場記録"];
  if (tier === "open")
    return has("region", 6) || shows.length >= 2
      ? []
      : ["地域6位以内、または2大会への出場"];
  if (tier === "national")
    return has("open", 4) ||
      shows.filter((s) => s.tier === "open" && s.rank <= 6).length >= 2
      ? []
      : ["地方4位以内、または地方6位以内を2回"];
  return r.records.length < 20
    ? ["世界編（決断21以降）"]
    : has("national", 3)
      ? []
      : ["日本グランプリ3位以内"];
}
export function entryReason(r:ChallengeRun,tier:StageTier) {
  const missing=eligibilityChallenge(r,tier);
  if(missing.length) return missing.join("、");
  const shows=r.records.flatMap(v=>v.show?[v.show]:[]);
  if(tier==="gym") return "初参加を受け付けるジム測定会";
  if(tier==="region") return "測定会への参加記録あり";
  if(tier==="open") return shows.some(x=>x.tier==="region" && x.rank<=6)?"地域新人戦6位以内の実績":"2大会への出場記録";
  if(tier==="world") return "日本グランプリ3位以内の実績";
  const open=shows.filter(x=>x.tier==="open").sort((a,b)=>a.rank-b.rank);
  return open[0]?.rank<=4 ? "地方オープン"+open[0].rank+"位による推薦" : "地方オープン6位以内を2回達成";
}
function bestStage(r:ChallengeRun){return [...TIERS].reverse().find(t=>!eligibilityChallenge(r,t).length)!;}
export function decisionScene(r:ChallengeRun){const best=bestStage(r);return turningPoint(r,best,LEAGUE[best].name);}
export function challengeIssue(r: ChallengeRun) {
  if(r.origin && r.storyVersion===2)return decisionScene(r).issue;
  if (r.origin) return currentEpisode(r).issue;
  const n = r.records.length + 1,
    a = r.career.athlete,
    prev = r.records.at(-1),
    f = fatPercent(a.body);
  if (n === 1)
    return `${a.profileTitle}。${PROFILES.find((p) => p.id === a.profileId)?.challenge}まず生活に収まる土台を選びます。`;
  if (a.systemicFatigue > 0.55)
    return `前期間の疲労が${Math.round(a.systemicFatigue * 100)}残っています。伸ばす部位だけでなく回復の配分を考える場面です。`;
  if (prev?.stats.shortDays)
    return `前期間は${prev.stats.shortDays}日で食事の充足が90%未満でした。予算・手間と育成目的を組み直せます。`;
  if (prev?.show) {
    const s = prev.show;
    return `${LEAGUE[s.tier].name}で${s.count}人中${s.rank}位。筋量${s.score.mass.toFixed(0)}・ポージング${s.score.posing.toFixed(0)}。身体と技術の投資先を比較しましょう。`;
  }
  if (n > 20 && eligibilityChallenge(r, "world").length)
    return `世界への次の条件は「${eligibilityChallenge(r,'world').join('、')}」です。国内の大会作戦で資格を目指すか、地方の自己記録を追うかを選べます。`;
  if(n>20 && n%4===0){
    const last=r.records.flatMap(x=>x.show?[x.show]:[]).at(-1),above=last?.standings.find(x=>x.rank===last.rank-1);
    return `期間末の大会へ挑むか、育成を続けるかを決めます。世界の参加・遠征費は${(LEAGUE.world.fee+LEAGUE.world.travel).toLocaleString('ja-JP')}円。${above?`前回は${above.name}と${(above.score.total-last!.score.total).toFixed(2)}点差でした。`:'獲得した実績は出場を見送っても失いません。'}身体・疲労・技術と収支を一緒に確認しましょう。`;
  }
  if(n>20 && n%4===3)
    return `現在のポージングは${(r.career.progress!.posing*100).toFixed(0)}、体脂肪${f.toFixed(1)}%。残る作戦は${r.limit-r.records.length}回です。次の舞台への準備を優先するか、今回の${decisionDays(n)}日を身体づくりへ使うかを比較します。`;
  if(n>20 && n%4===1){
    const cost=LEAGUE.world.fee+LEAGUE.world.travel;
    return `世界編の遠征は1回${cost.toLocaleString('ja-JP')}円。現在の資金${Math.round(a.life.money).toLocaleString('ja-JP')}円で、出場と育成への配分を考えます。国内編の記録は確定したままです。`;
  }
  const early=r.records[0],recent=r.records.at(-1);
  if(n>=13 && early && recent && (muscleMass(recent.after)-muscleMass(recent.before))/(recent.to-recent.from)<(muscleMass(early.after)-muscleMass(early.before))/(early.to-early.from)*.75)
    return `直前の筋質量の変化は${(muscleMass(recent.after)-muscleMass(recent.before)).toFixed(2)}kg／${recent.to-recent.from}日。初期より日あたりの変化が小さくなっています。負担、栄養、技術への配分を見直せます。原因を一つに断定はしません。`;
  return `${n > 20 ? "長期育成で伸び方も変わっています。" : ""}体脂肪${f.toFixed(1)}%。${n % 4 === 0 ? "期間末の大会へ挑むか、次へ向けて育てるかを決めます。" : "前の作戦を続けるか、身体と生活の配分を変えるかを考えます。"}`;
}
export function strategyCandidates(r: ChallengeRun): Strategy[] {
  const c = r.career,
    n = r.records.length + 1,
    g = guideFor(c),
    tired = c.athlete.systemicFatigue > 0.55;
  const goal = g.goal,
    best = [...TIERS]
      .reverse()
      .find((t) => !eligibilityChallenge(r, t).length)!;
  const base: Strategy = {
    id: "foundation",
    name: tired ? "回復を整えて積み重ねる" : "生活に合わせて全身を育てる",
    aim: tired ? "疲労を減らし、継続できる練習へ" : resolvedGoal(c,g)==='cut'?"体脂肪を整えながら、筋量と動作の土台を保つ":"全身の筋量と動作の土台",
    reason: challengeIssue(r),
    tradeoff: "一部位への集中と、大会の対戦機会は後回し。",
    goal,
    priority: "balanced",
    minutes: 45,
    budget: Math.min(1600, Math.max(1000, g.budget)),
    foodStyle: "budget",
    sleep: 8,
    posing: 15,
    cardio: 0,
    workRatio: 1,
    equipment: c.progress!.equipment,
    coach: false,
    effort: tired ? "light" : "standard",
    contest: null,
    autoTraining: true,
    autoFood: true,
    autoRecovery: true,
  };
  const weak = PARTS.reduce(
    (a, p) =>
      c.athlete.body.muscle[p] / c.initial.body.muscle[p] <
      c.athlete.body.muscle[a] / c.initial.body.muscle[a]
        ? p
        : a,
    "chest",
  );
  const priority =
    weak.includes("Chest") || weak === "chest"
      ? "chest"
      : ["quads", "glutes", "hamstrings", "calves"].includes(weak)
        ? "legs"
        : ["lats", "upperBack", "erectors"].includes(weak)
          ? "back"
          : ["biceps", "triceps", "forearms"].includes(weak)
            ? "arms"
            : "shoulders";
  const specialist: Strategy = {
    ...base,
    id: "specialize",
    name:
      n % 3 === 0
        ? "仕事を増やして次の舞台を支える"
        : "弱点へ時間を振り向ける",
    aim:
      n % 3 === 0
        ? "遠征と設備のための資金を確保"
        : `${LABELS[weak]}を含む部位と技術の改善`,
    priority,
    minutes: n % 3 === 0 ? 30 : 60,
    workRatio: n % 3 === 0 ? 1.1 : 0.8,
    posing: 25,
    coach: n % 3 !== 0,
    reason:
      n % 3 === 0
        ? "同じ収入では選べる遠征や指導に限りがあります。仕事を増やす分、練習時間を絞ります。"
        : `初日からの相対的な発達が小さい${LABELS[weak]}を重視する案。短時間の全身案とは配分が異なります。`,
    tradeoff:
      n % 3 === 0
        ? "練習時間と回復の余裕は減る。"
        : "収入を減らし指導料を使う。全身の均等な配分はしない。",
  };
  const stage: Strategy = {
    ...base,
    id: "stage",
    name:
      n % 4 === 0
        ? `${LEAGUE[best].name}に挑む`
        : "身体を整え、舞台の技術を磨く",
    aim:
      n % 4 === 0
        ? "今の身体を審査に結び付け、対戦記録を作る"
        : "仕上がりとポージングを磨く",
    goal: fatPercent(c.athlete.body) > 19 ? "cut" : "balance",
    minutes: 30,
    posing: 45,
    coach: true,
    contest: n % 4 === 0 ? best : null,
    reason: `現状のポージング${((c.progress?.posing ?? 0) * 100).toFixed(0)}。筋量だけでなく技術と当日の状態も審査されます。`,
    tradeoff: "筋量を増やす練習量を抑え、指導と大会には費用が必要。",
  };
  if(r.origin && r.storyVersion===2)return turningStrategies(r,base,priority,best,LEAGUE[best].name);
  if (r.origin) return lifeCandidates(r,base,specialist,stage,LEAGUE[best].name);
  const candidates=[base,specialist,stage];
  // A contextual fourth option uses the same costs and daily engine. It is a
  // concrete investment or rematch decision, never a free event/stat reward.
  if(n>=9 && n%4===1 && !c.progress!.homeEquipmentOwned && c.progress!.equipment!=='home')
    candidates.push({...base,id:'home-investment',name:'自宅の練習環境へ投資する',aim:'設備費と毎月の会費を組み替え、生活に練習を残す',equipment:'home',minutes:35,foodStyle:'quick',reason:`自宅器具の初期費用20,000円と月会費1,500円へ切り替えます。ジムの月5,000円とは収支・使える種目・食事準備の時間が異なります。現在の勤務は変えません。`,tradeoff:'ジム専用設備は使えず、手軽な食事は費用が上がる場合があります。'});
  else if(n>20 && n%4===1){
    const last=r.records.flatMap(v=>v.show?[v.show]:[]).at(-1);
    const opponent=last?.standings.find(v=>v.rank===last.rank-1);
    if(opponent){
      const techniqueGap=opponent.score.posing-(last?.score.posing??0);
      const gapPart=[...PARTS].sort((a,b)=>(opponent.body.muscle[b]/last!.body.muscle[b])-(opponent.body.muscle[a]/last!.body.muscle[a]))[0];
      const gapPriority=gapPart.includes('Chest')||gapPart==='chest'?'chest':['quads','glutes','hamstrings','calves'].includes(gapPart)?'legs':['lats','upperBack','erectors'].includes(gapPart)?'back':['biceps','triceps','forearms'].includes(gapPart)?'arms':'shoulders';
      candidates.push({...base,id:'rematch',name:`${opponent.name}との差を詰める`,aim:techniqueGap>5?'身体を審査へ結び付ける技術を磨く':`${LABELS[gapPart]}を含む身体の厚みを育てる`,priority:gapPriority,minutes:techniqueGap>5?30:60,posing:techniqueGap>5?55:25,coach:true,workRatio:.85,sleep:8.5,reason:`直近の対戦では${opponent.name}が一つ上。総合点差${(opponent.score.total-last!.score.total).toFixed(2)}。ポージングは${techniqueGap>=0?'相手':'自分'}が${Math.abs(techniqueGap).toFixed(1)}ポイント上でした。${LABELS[gapPart]}は部位の筋質量比で最も差がある場所です。勤務を15%減らして配分を変える案で、単一部位の改善や再戦の勝利は保証しません。`,tradeoff:'勤務収入を減らし、指導費を負担します。今回は大会へ出場せず準備へ使います。'});
    }else candidates.push({...base,id:'long-recovery',name:'長いキャリアを続けるために整える',aim:'回復と技術を優先し、次の実施量を考える',effort:'light',minutes:30,sleep:9,posing:35,workRatio:.85,reason:`累計${c.athlete.day}日の育成を経ています。仕事を15%減らし、睡眠と技術へ時間を振り向ける案です。今ある疲労と練習実績を比較できます。`,tradeoff:'筋量を狙う練習の量と勤務収入を抑えます。'});
  }
  return candidates;
}
export function applyStrategy(c: Career, p: Strategy) {
  let next = changeEmployment(compactCareer(c), p.workRatio);
  // A manual draft may contain plans, never a replacement physical state or money.
  if (p.manual) {
    next.plan = structuredClone(p.manual.plan);
    if (!p.autoFood) {
      next.progress!.mealMode = p.manual.progress!.mealMode;
      next.progress!.meals = structuredClone(p.manual.progress!.meals);
      next.progress!.waterLitres = p.manual.progress!.waterLitres;
    }
  }
  next = changeEquipment(next, p.equipment);
  next.progress!.coach = p.coach;
  next.progress!.posingMinutes = p.posing;
  next.progress!.cardioMinutes = p.cardio;
  next.plan.sleep = p.sleep;
  const patch = {
    goal: p.goal,
    priority: p.priority,
    minutes: p.minutes,
    budget: p.budget,
    foodStyle: p.foodStyle,
    effort: p.effort,
  };
  if (p.autoTraining || p.autoFood)
    next = adoptCoach(next, proposeCoach(next, patch), [
      ...(p.autoTraining ? ["training" as const] : []),
      ...(p.autoFood ? ["food" as const] : []),
    ]);
  if (p.autoTraining) {
    const day = structuredClone(next.plan.days[next.athlete.day % 7]);
    next.plan.days = Array.from({ length: 7 }, (_, i) =>
      practiceDays(p).includes(i)
        ? structuredClone(day)
        : { focus: "rest", sets: 1, rir: 3, start: day.start, exercises: [] },
    );
  }
  if (next.coachingGuide) {
    next.coachingGuide.goal = p.goal;
    next.coachingGuide.ownership.training = p.autoTraining ? "coach" : "manual";
    next.coachingGuide.ownership.food = p.autoFood ? "coach" : "manual";
  }
  next.plan.sleep = p.sleep;
  return next;
}
export function inspectStrategy(r: ChallengeRun, p: Strategy) {
  let c: Career;
  try {
    c = applyStrategy(r.career, p);
  } catch (e) {
    return {
      career: r.career,
      errors: [String(e)],
      warnings: [],
      food: assessFood(r.career, resolvedGoal(r.career)),
      days: decisionDays(r.records.length + 1),
      upfront: 0,
      net: 0,
      minutes: 0,
    };
  }
  const days = decisionDays(r.records.length + 1),
    n = nutritionPlan(c),
    def = p.contest ? LEAGUE[p.contest] : null,
    fees = (def ? def.fee + def.travel : 0)+(p.bookingFee??0),
    equipment = r.career.athlete.life.money - c.athlete.life.money;
  const net =
    ((c.athlete.life.income -
      c.athlete.life.fixed -
      c.athlete.life.gymMonthly -
      (p.coach ? 10000 : 0)) *
      days) /
      30.4375 -
    n.cost * days -
    fees -
    equipment;
  const errors = p.contest ? eligibilityChallenge(r, p.contest) : [];
  if (c.athlete.life.money < fees)
    errors.push("参加費・移動費を今の所持金で支払えません");
  if (r.career.athlete.life.money + Math.min(0, net) < 0)
    errors.push(
      "この収支見込みでは期間内に資金不足です。仕事・食事・遠征を見直してください",
    );
  if (!p.autoTraining)
    for (let i = 0; i < 7; i++)
      for (const s of planIssues(c, i)) if (!errors.includes(s)) errors.push(s);
  const food = assessFood(c, resolvedGoal(c));
  const warnings = food.insufficient ? [food.reason] : [];
  return {
    career: c,
    errors,
    warnings,
    food,
    days,
    upfront: fees + equipment,
    net,
    minutes: c.plan.days.reduce(
      (s, d) => s + (d.focus==='rest'?0:d.exercises?sessionMinutes(d.exercises):(0.3+d.sets*0.18)*60),
      0,
    ),
  };
}
const emptyStats = (): PeriodStats => ({
  days: 0,
  trainingDays: 0,
  sets: 0,
  plannedSets: 0,
  minutes: 0,
  income: 0,
  food: 0,
  fixed: 0,
  energy: 0,
  protein: 0,
  sleep: 0,
  fatigue: 0,
  restDays: 0,
  adjustments: 0,
  shortDays: 0,
  muscle: partMap(() => 0),
  events: [],
});
export function confirmStrategy(
  input: ChallengeRun,
  p: Strategy,
  expectedRevision = input.revision,
): ChallengeRun {
  validateStrategy(p);
  if (
    input.status !== "planning" ||
    input.job ||
    input.records.length >= input.limit ||
    expectedRevision !== input.revision
  )
    throw Error("この決断は確定済み、または状態が更新されています");
  if(input.storyVersion===2 && input.origin && p.id.startsWith("turn/")){
    const offered=strategyCandidates(input).find(x=>x.id===p.id);
    if(!offered)throw Error("この選択肢の期限または前提が変わりました");
    if((["contest","equipment","coach","visitHours","bookingFee","routine"] as const).some(k=>p[k]!==offered[k])){
      p={...p,id:"custom",name:"自分で調整した方針",reason:"変更した練習・生活・出場条件を採用した。",aim:"選んだ条件で育成する",tradeoff:"勤務は基準の"+Math.round(p.workRatio*100)+"%。",visitHours:0,bookingFee:0};
    }
  }
  const preview = inspectStrategy(input, p);
  if (preview.errors.length) throw Error(preview.errors.join("。"));
  const r = structuredClone(input),
    c = preview.career,
    number = r.records.length + 1;
  const fee = p.contest ? LEAGUE[p.contest].fee + LEAGUE[p.contest].travel : 0;
  c.athlete.life.money -= fee+(p.bookingFee??0);
  const best=bestStage(input);
  const fact=input.origin && input.storyVersion===2?makeFact(input,p,best,LEAGUE[best].name):undefined;
  if(fact?.action==="friend"){
    const peer=r.rivals[0];peer.storyPerson=fact.person;peer.name=fact.personName!;peer.career.athlete.name=peer.name;
  }
  if(fact?.person && fact.visit)fact.appointment={day:r.career.athlete.day+preview.days-1,person:fact.person,activity:p.name};
  const before = r.career;
  r.career = c;
  r.status = "running";
  r.job = {
    id: `${r.id}:decision-${number}`,
    number,
    start: before.athlete.day,
    end: before.athlete.day + preview.days,
    plan: {...structuredClone(p), goal:resolvedGoal(c,{...guideFor(c),goal:p.goal})},
    paid: preview.upfront,
    startedAt: Date.now(),
    record: {
      number,
      ...(fact?{fact}:{}),
      issue: challengeIssue(input),
      candidates: strategyCandidates(input).map(
        ({ id, name, aim, tradeoff }) => ({ id, name, aim, tradeoff }),
      ),
      strategy: structuredClone(p),
      from: before.athlete.day,
      to: before.athlete.day + preview.days,
      before: structuredClone(before.athlete.body),
      after: structuredClone(before.athlete.body),
      beforeMoney: before.athlete.life.money,
      afterMoney: c.athlete.life.money,
      beforeAbility: structuredClone(before.athlete.ability),
      afterAbility: structuredClone(before.athlete.ability),
      beforePosing: before.progress!.posing,
      afterPosing: before.progress!.posing,
      stats: emptyStats(),
      elapsedMs: 0,
    },
  };
  return r;
}
function practiceDays(p:Strategy){
 return p.routine==="joint"?[1,3,5]:p.routine==="weekend"?[1,4,5]:p.routine==="home"?[0,3,6]:[0,2,4];
}
export function prepareStrategyDay(c: Career, p: Strategy, remaining: number) {
  let v: Career = {
    ...c,
    pendingEvent: null,
    plan: { ...c.plan, days: c.plan.days.map((d) => structuredClone(d)) },
    progress: { ...c.progress! },
  };
  const tired =
    c.athlete.systemicFatigue > 0.64 ||
    PARTS.reduce((s, k) => s + c.athlete.body.fatigue[k], 0) / 16 > 0.43 ||
    c.athlete.day < c.progress!.injuryUntil;
  if (p.autoTraining) {
    if (practiceDays(p).includes(c.athlete.day % 7) && !tired) {
      v = adoptCoach(
        v,
        proposeCoach(v, {
          goal: p.goal,
          priority: p.priority,
          minutes: p.minutes,
          budget: p.budget,
          foodStyle: p.foodStyle,
          effort: p.effort,
        }),
        ["training"],
      );
    } else
      v.plan.days[c.athlete.day % 7] = {
        focus: "rest",
        sets: 1,
        rir: 3,
        start: 20,
        exercises: [],
      };
  }
  if ((p.autoRecovery && tired) || (p.contest && remaining <= 3) || (p.visitHours && remaining===1))
    v.plan.days[c.athlete.day % 7] = {
      focus: "rest",
      sets: 1,
      rir: 3,
      start: 20,
      exercises: [],
    };
  if (p.autoFood)
    v = adoptCoach(
      v,
      proposeCoach(
        v,
        { goal: p.goal, budget: p.budget, foodStyle: p.foodStyle },
        false,
        ["food"],
      ),
      ["food"],
    );
  return v;
}
function recordDay(stats: PeriodStats, s: DailySummary, changed: boolean, insufficient=false) {
  if(s.training.exercises?.length){
    const sample={day:s.day,exercises:structuredClone(s.training.exercises)};
    const first=stats.trainingSamples?.[0];
    stats.trainingSamples=first?[first,sample]:[sample];
  }
  stats.days++;
  stats.trainingDays += s.training.completedSets > 0 ? 1 : 0;
  stats.restDays += s.training.completedSets === 0 ? 1 : 0;
  stats.sets += s.training.completedSets;
  stats.plannedSets += s.training.plannedSets;
  stats.minutes += s.training.duration * 60;
  stats.income += s.income;
  stats.food += s.meal.cost;
  stats.fixed += s.fixed + s.gym;
  stats.energy += s.meal.calories;
  stats.protein += s.traces[0]?.proteinCoverage ?? 0;
  stats.sleep += s.sleep.hours;
  stats.fatigue += s.detail?.after.fatigue ?? 0;
  stats.adjustments += changed ? 1 : 0;
  const energy = s.detail?.planned.calories ?? s.meal.calories;
  stats.shortDays +=
    insufficient || (s.traces[0]?.proteinCoverage ?? 0) < 0.9 || s.meal.calories < energy * 0.9
      ? 1
      : 0;
  for (const k of PARTS)
    stats.muscle[k] += s.traces.find((t) => t.part === k)?.muscleDelta ?? 0;
  for (const e of s.events) if (!stats.events.includes(e)) stats.events.push(e);
  stats.events = stats.events.slice(-6);
}
function contestField(r: ChallengeRun, tier: StageTier) {
  const offset = { gym: 0, region: 1, open: 2, national: 3, world: 4 }[tier];
  const count = { gym: 4, region: 6, open: 8, national: 10, world: 8 }[tier],
    start = tier === "national" ? 0 : offset;
  const pool=r.rivals.slice(start,start+count);
  const peer=r.rivals.find(x=>x.storyPerson);
  if(!peer)return pool;
  if(r.job?.record.fact?.jointRegistration)return [peer,...pool.filter(x=>x!==peer)].slice(0,count);
  const separate=r.records.some(x=>x.fact?.promise==="別日程で支援"||x.fact?.action==="help");
  if(separate && pool.includes(peer)){
    const replacement=r.rivals.find(x=>!pool.includes(x));
    if(replacement)return pool.map(x=>x===peer?replacement:x);
  }
  return pool;
}
function contest(r: ChallengeRun, tier: StageTier): ChallengeShow {
  const field = contestField(r,tier)
    .map((x) => ({
      id: x.id,
      name: x.name,
      score: scoreLocal(localPerson(x.career), !!r.origin),
      body: structuredClone(x.career.athlete.body),
      posing: x.career.progress!.posing,
    }));
  const player = {
    id: "player",
    name: r.career.athlete.name,
    score: scoreLocal(localPerson(r.career), !!r.origin),
    body: structuredClone(r.career.athlete.body),
    posing: r.career.progress!.posing,
  };
  const standings = [...field, player]
    .sort((a, b) => b.score.total - a.score.total || a.id.localeCompare(b.id))
    .map((v, i) => ({ ...v, rank: i + 1 }));
  const rank = standings.find((x) => x.id === "player")!.rank;
  for (const rival of r.rivals) {
    const s = standings.find((x) => x.id === rival.id);
    if (s) rival.history.push({ decision: r.job!.number, tier, rank: s.rank });
  }
  return {
    ...(r.job?.record.fact ? {preparation:r.job.record.fact.place+"からこの舞台へ。"+(r.job.record.fact.witnesses?.length?r.job.record.fact.witnesses.join("、")+"が準備を支えた。":"自分の準備で出場した。")+"今期の練習は"+r.job.record.stats.trainingDays+"日。"} : {}),
    ...(r.origin ? {judging:"life-1" as const} : {}),
    decision: r.job!.number,
    day: r.career.athlete.day - 1,
    tier,
    fee: LEAGUE[tier].fee + LEAGUE[tier].travel,
    rank,
    count: standings.length,
    score: player.score,
    body: player.body,
    posing: player.posing,
    standings,
  };
}
export function ending(r: ChallengeRun, at: 20 | 40): ChallengeEnding {
  const records = r.records.slice(0, at),
    shows = records.flatMap((x) => (x.show ? [x.show] : [])),
    won = shows.filter((x) => x.rank === 1),
    title = won.some((s) => s.tier === "world")
      ? LEAGUE.world.name
      : won.some((s) => s.tier === "national")
        ? LEAGUE.national.name
        : null;
  const best = [...shows].sort(
    (a, b) => TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier) || a.rank - b.rank,
  )[0];
  return {
    at,
    day: r.career.athlete.day,
    body: structuredClone(r.career.athlete.body),
    money: r.career.athlete.life.money,
    ability: structuredClone(r.career.athlete.ability),
    posing: r.career.progress!.posing,
    title,
    best: best ? { tier: best.tier, rank: best.rank } : null,
    text: r.storyVersion===2 && r.origin ? (best?LEAGUE[best.tier].name+" "+best.rank+"位。":"")+turningEnding(records) : title
      ? `${title}を制した${at}の決断。`
      : best
        ? `${LEAGUE[best.tier].name}で${best.rank}位。選んだ生活と身体が、この到達点を作りました。`
        : "舞台への出場より、生活と身体づくりを選んだキャリア。",
    recordCount: records.length,
  };
}
export function runPeriodBatch(
  input: ChallengeRun,
  days = 7,
): { run: ChallengeRun; logs: DailySummary[] } {
  if (input.status !== "running" || !input.job)
    throw Error("実行中の期間がありません");
  const r = structuredClone(input),
    j = r.job!,
    logs: DailySummary[] = [];
  for (let i = 0; i < Math.min(7, days) && r.career.athlete.day < j.end; i++) {
    const remaining = j.end - r.career.athlete.day,
      c = prepareStrategyDay(r.career, j.plan, remaining),
      changed =
        c.plan.days[c.athlete.day % 7].focus === "rest" &&
        r.career.plan.days[c.athlete.day % 7].focus !== "rest";
    const result = simulateDay(c, {
      contestHours:
        remaining === 1 ? (j.plan.contest?LEAGUE[j.plan.contest].hours:0)+(j.plan.visitHours??0) : 0,
    });
    if (!result)
      throw Error("期間を進められません。保存した時点から再開してください");
    r.career = result.career;
    r.career.pendingEvent = null;
    logs.push(result.summary);
    recordDay(j.record.stats, result.summary, changed, assessFood(c,resolvedGoal(c)).insufficient);
    for (const rival of r.rivals) {
      // The established rival field has entry qualifications before this run.
      // Once entered, it pays and rests under the same rules as the player.
      const entered = rival.storyPerson && j.record.fact?.action==="help" ? "gym" : j.plan.contest && contestField(r,j.plan.contest).some(x=>x.id===rival.id) ? j.plan.contest : null;
      if(entered && remaining===j.end-j.start)
        rival.career.athlete.life.money-=LEAGUE[entered].fee+LEAGUE[entered].travel;
      const p: Strategy = {
        ...j.plan,
        manual: undefined,
        contest: entered,
        routine:"regular",visitHours:0,bookingFee:0,
        goal: "ask",
        priority: ["balanced", "chest", "back", "legs"][
          Number(rival.id.split("-").at(-1)) % 4
        ] as Strategy["priority"],
        minutes: 45,
        budget: 1200,
        posing: 20,
        effort: "standard",
        foodStyle: "budget",
        autoTraining: true,
        autoFood: true,
        autoRecovery: true,
      };
      const rc = prepareStrategyDay(rival.career, p, remaining),
        rr = simulateDay(rc,{contestHours:entered&&remaining===1?LEAGUE[entered].hours:0});
      if (!rr) throw Error("対戦相手の計算を再開できません");
      rival.career = rr.career;
      rival.career.pendingEvent = null;
      rival.career.snapshots = [];
    }
  }
  if (r.career.athlete.day === j.end) {
    // The daily food planner receives the goal resolved for this period. Keep
    // the player's consultation intent for the next decision rather than
    // accidentally turning "ask" into a permanent cut/build instruction.
    if(r.career.coachingGuide)r.career.coachingGuide.goal=j.record.strategy.goal;
    if (j.plan.contest) j.record.show = contest(r, j.plan.contest);
    Object.assign(j.record, {
      after: structuredClone(r.career.athlete.body),
      afterMoney: r.career.athlete.life.money,
      afterAbility: structuredClone(r.career.athlete.ability),
      afterPosing: r.career.progress!.posing,
      elapsedMs: Date.now() - j.startedAt,
    });
    if(j.record.fact){
      const f=j.record.fact;
      if(f.action==="help")f.partnerStart={day:j.end-1,tier:"gym"};
      const shared=f.jointRegistration && j.record.show?.standings.find(x=>r.rivals.some(v=>v.storyPerson && v.id===x.id));
      if(shared)f.sharedStart=true;
      const closed=f.closed.filter(num=>num!==f.cause).map(num=>"決断"+num+"の予定は今回は見送った。").join("");
      j.record.response=f.reply+(shared?" "+shared.name+"も同じ大会に出場し、"+shared.rank+"位だった。":"")+closed+(j.record.show?" 結果は"+LEAGUE[j.record.show.tier].name+"で"+j.record.show.rank+"位。":"");
    }else if(r.origin){
      const friend=r.origin.contact, plan=j.record.strategy;
      j.record.response=j.record.show ? friend+"に"+LEAGUE[j.record.show.tier].name+"の"+j.record.show.rank+"位を知らせた。「次に見たい動きがある」と返事がきた。" :
        plan.coach ? "担当コーチが次の個別枠を知らせてくれた。今期は勤務を基準の"+Math.round(plan.workRatio*100)+"%にして指導を受けた。" :
        plan.posing>=35 ? friend+"が立ち姿の動画を見返した。「前の姿とも並べてみたい」" :
        friend+"に練習帳を見せた。今期の練習は"+j.record.stats.trainingDays+"日。次はこの記録から相談できる。";
    }
    r.records.push(j.record);
    r.job = null;
    r.status = "result";
    if (r.records.length === 20) {
      r.domestic = ending(r, 20);
    }
    if (r.records.length === 40) {
      r.world = ending(r, 40);
    }
  }
  return { run: r, logs };
}
export function nextDecision(input: ChallengeRun) {
  const r = structuredClone(input);
  if (r.status === "result") r.status = r.records.length===20?'japanEnd':r.records.length===40?'worldEnd':'planning';
  else if (r.status === "japanEnd" && r.limit === 40) r.status = "planning";
  else throw Error("結果の確認状態ではありません");
  return r;
}
export function continueWorld(input: ChallengeRun) {
  if (input.status !== "japanEnd" || input.limit !== 20 || !input.domestic)
    throw Error("国内編の終了後に進めます");
  return {
    ...structuredClone(input),
    mode: "world" as const,
    limit: 40 as const,
    status: "planning" as const,
  };
}
export function validateStrategy(p:Strategy) {
 const text=(v:unknown,max=1000)=>typeof v==='string'&&v.length<=max;
 const num=(v:unknown,a:number,b:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
 if(!p||!text(p.id,100)||!text(p.name,120)||!text(p.reason)||!text(p.aim)||!text(p.tradeoff)||!['build','cut','balance','ask'].includes(p.goal)||!['balanced','chest','back','shoulders','arms','legs'].includes(p.priority)||!['budget','recommend','quick'].includes(p.foodStyle)||!['light','standard','hard'].includes(p.effort)||!['gym','home'].includes(p.equipment)||!(p.contest===null||TIERS.includes(p.contest))||!num(p.minutes,20,90)||!num(p.budget,300,2500)||!num(p.sleep,6,9)||!num(p.posing,0,60)||!num(p.cardio,0,60)||!num(p.workRatio,.5,1.2)||['coach','autoTraining','autoFood','autoRecovery'].some(k=>typeof p[k as keyof Strategy]!=='boolean'))throw Error('作戦の設定が不正です');
 if(p.routine!==undefined && !["regular","joint","weekend","home"].includes(p.routine) || p.bookingFee!==undefined&&!num(p.bookingFee,0,12000) || p.visitHours!==undefined&&!num(p.visitHours,0,8))throw Error("練習日程・費用が不正です");
 if(p.manual)validateCareer(p.manual);
}
export function validateChallenge(x: unknown): asserts x is ChallengeRun {
  const r = x as ChallengeRun;
  if (
    !r ||
    r.format !== "BULK_CHALLENGE" ||
    r.version !== 1 ||
    r.calculation !== "decisions-1" ||
    (r.modelVersion!==undefined&&(typeof r.modelVersion!=="string"||r.modelVersion.length>64)) ||
    (r.storyVersion!==undefined && r.storyVersion!==2) ||
    (r.origin !== undefined && !validOrigin(r.origin,r.seed)) ||
    !["japan", "world"].includes(r.mode) ||
    ![20, 40].includes(r.limit) ||
    !Array.isArray(r.records) ||
    r.records.length > r.limit ||
    !Number.isInteger(r.revision) ||
    r.revision < 0 ||
    !Number.isInteger(r.seed) ||
    r.seed < 1 ||
    !["planning", "running", "result", "japanEnd", "worldEnd"].includes(
      r.status,
    ) ||
    typeof r.id !== "string" ||
    r.id.length > 100
  )
    throw Error("挑戦セーブの形式が不正です");
  validateCareer(r.career);
  validateCareer(r.initial);
  if(r.initial.athlete.day!==0||r.initial.athlete.id!==r.career.athlete.id||r.id!==r.career.athlete.id||(r.mode==='japan')!==(r.limit===20)||typeof r.tutorialHidden!=='boolean')throw Error('挑戦の初期条件が一致しません');
  if((r.status==='result'&&!r.records.length)||(r.status==='planning'&&r.records.length>=r.limit)||(r.status==='japanEnd'&&r.records.length!==20)||(r.status==='worldEnd'&&r.records.length!==40))throw Error('挑戦の区切りが不正です');
  let day = 0;
  r.records.forEach((v, i) => {
    if(v.fact!==undefined)validateTurningFact(v.fact,v.number);
    if(v.response!==undefined && (typeof v.response!=="string"||v.response.length>1000)) throw Error("人物の記録が不正です");
    validateStrategy(v.strategy);validateBody(v.before);validateBody(v.after);
    if(!v.stats||Object.entries(v.stats).some(([k,n])=>!['events','muscle','trainingSamples'].includes(k)&&(typeof n!=='number'||!Number.isFinite(n)))||!Array.isArray(v.stats.events)||v.stats.events.some(e=>typeof e!=='string')||!Array.isArray(v.candidates)||v.candidates.length>6||typeof v.issue!=='string'||PARTS.some(p=>!Number.isFinite(v.stats.muscle[p])))throw Error('期間の記録が不正です');
    if(v.stats.trainingSamples&&(!Array.isArray(v.stats.trainingSamples)||v.stats.trainingSamples.length>2||v.stats.trainingSamples.some(s=>!Number.isInteger(s.day)||s.day<v.from||s.day>=v.to||!Array.isArray(s.exercises)||s.exercises.length>30||s.exercises.some(e=>typeof e.exerciseId!=='string'||!Number.isFinite(e.plannedSets)||typeof e.reason!=='string'||!Array.isArray(e.sets)||e.sets.length>20||e.sets.some(x=>Object.values(x).some(n=>!Number.isFinite(n)))))))throw Error('練習実績の記録が不正です');
    if(v.show){const s=v.show;validateBody(s.body);if(!TIERS.includes(s.tier)||!Array.isArray(s.standings)||s.standings.length!==s.count||s.rank<1||s.rank>s.count||s.standings.some(p=>!p.score||Object.values(p.score).some(n=>!Number.isFinite(n)||n<0||n>100)))throw Error('大会の記録が不正です');}
    if (
      v.number !== i + 1 ||
      v.from !== day ||
      v.to !== day + decisionDays(i + 1) ||
      v.stats.days !== decisionDays(i + 1)
    )
      throw Error("決断履歴が連続していません");
    day = v.to;
  });
  if (r.status === "running") {
    if (
      !r.job ||
      r.job.number !== r.records.length + 1 ||
      r.job.start !== day ||
      r.job.end !== day + decisionDays(r.job.number) ||
      r.job.record.stats.days !== r.career.athlete.day - day ||
      r.career.athlete.day >= r.job.end
    )
      throw Error("再開用の実行記録が不正です");
    validateStrategy(r.job.plan);
    if(r.job.record.fact)validateTurningFact(r.job.record.fact,r.job.number);
  } else if (r.job || r.career.athlete.day !== day)
    throw Error("進行状態が一致しません");
  if (!Array.isArray(r.rivals) || r.rivals.length !== 12)
    throw Error("対戦相手の記録が不正です");
  r.rivals.forEach((v) => {
    validateCareer(v.career);
    if (v.career.athlete.day !== r.career.athlete.day)
      throw Error("対戦相手の日付が一致しません");
  });
  for(const [snapshot,at] of [[r.domestic,20],[r.world,40]] as const){
   if(r.records.length>=at&&!snapshot)throw Error('終了時の記録がありません');
   if(snapshot){validateBody(snapshot.body);if(snapshot.at!==at||snapshot.recordCount!==at||snapshot.day!==r.records[at-1]?.to||JSON.stringify(snapshot.body)!==JSON.stringify(r.records[at-1]?.after))throw Error('終了時の記録が一致しません');}
  }
}
