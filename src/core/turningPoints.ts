import {targetEdition} from "./seasonCircuit";
import type {
  ChallengeRun,
  DecisionRecord,
  StageTier,
  Strategy,
} from "./challengeTypes";
import { profile } from "./lifeStory";
import { fatPercent, LABELS, PARTS } from "./model";

import {
  type Person,
  type PromiseStatus,
  type Routine,
  type Scene,
  scenes,
  option,
  next,
  mentor,
  solo,
  stage,
  prep,
  enter,
  independent,
  visitGym,
  atHome,
} from "./turningPointContent";
export interface TurningFact {
  event: string;
  action: string;
  cause: number | null;
  person?: string;
  personName?: string;
  routine: Routine;
  place: string;
  venue?: string;
  jointRegistration?: boolean;
  promise?: PromiseStatus;
  goal?: string;
  offered: string[];
  closed: number[];
  next?: { event: string; due: number; expires: number };
  fee: number;
  visit: number;
  reply: string;
  appointment?: { day: number; person: string; activity: string };
  witnesses?: string[];
  sharedStart?: boolean;
  unavailable?: { person: string; through: number };
  partnerStart?: { day: number; tier: StageTier };
}
const named = (r: ChallengeRun, person: Person, source?: DecisionRecord) => {
  if (person === "mentor") return { id: "coach-kiritani", name: "桐谷" };
  if (person === "host") return { id: "gym-miyata", name: "宮田" };
  if (person === "origin")
    return { id: "origin-" + r.origin!.backgroundId, name: r.origin!.contact };
  if (person === "partner")
    return /友人|親友|幼なじみ|仲間|同級生/.test(profile(r.origin!).role)
      ? { id: "origin-" + r.origin!.backgroundId, name: r.origin!.contact }
      : { id: "partner-izumi", name: "泉" };
  const previous = source?.show;
  const rival = previous?.standings.find(
    (s) => s.rank === (previous.rank === 1 ? 2 : previous.rank - 1),
  );
  return rival
    ? {
        id: r.rivals.find((x) => x.id === rival.id)?.storyPerson ?? rival.id,
        name: rival.name,
      }
    : { id: source!.fact!.person!, name: source!.fact!.personName! };
};
function tag(r: ChallengeRun) {
  const n = r.records.length + 1,
    last = r.records.at(-1),
    facts = r.records.filter((x) => x.fact);
  const closed = new Set(facts.flatMap((x) => x.fact!.closed));
  const open = facts.filter((x) => x.fact!.next && !closed.has(x.number));
  const scheduled = open
    .filter((x) => x.fact!.next!.due <= n && x.fact!.next!.expires >= n)
    .sort((a, b) => a.fact!.next!.expires - b.fact!.next!.expires);
  const has = (key: string) => facts.some((x) => x.fact!.action === key);
  const entries: {
    event: string;
    reason: string;
    eligible: boolean;
    source?: DecisionRecord;
  }[] = [];
  function add(
    event: string,
    reason: string,
    eligible: boolean,
    source?: DecisionRecord,
  ) {
    entries.push({ event, reason, eligible, source });
  }
  add("opening", "初回の環境選択", n === 1);
  add("final", "国内または世界の最後の節目", n === 20 || n === 40, last);
  add("restart", "固定済み国内結果を受け取る時期", n === 21, last);
  for (const x of open.filter((x) => !scheduled.includes(x)))
    add(
      x.fact!.next!.event,
      "返事は決断" + x.fact!.next!.due + "以降。期限は" + x.fact!.next!.expires,
      false,
      x,
    );
  for (const x of scheduled)
    add(x.fact!.next!.event, "決断" + x.number + "で始まった話の返事", true, x);
  if(r.season && n>=36 && n<=39)add(["measure","environment","posing","recover"][n-36],"最後の舞台から逆算する準備",true,last);
  add("showReply", "直前の大会に実際に出場", !!last?.show && (!r.season||!facts.slice(-4).some(x=>x.fact!.event==="showReply")), last);
  add("entry", "当期の大会日程", (r.season?targetEdition(r).date-r.career.athlete.day<=84:n % 4 === 0) && (!r.season||!facts.slice(-4).some(x=>x.fact!.event==="entry")), last);
  add(
    "reunion",
    "以前知り合った対戦相手と記録がある",
    n >= 31 && has("talk") && !facts.some((x) => x.fact!.event === "reunion"),
    facts.find((x) => x.fact!.action === "talk"),
  );
  const firstMentor = facts.find((x) => x.fact!.person === "coach-kiritani");
  add(
    "away",
    "会った指導者から後半の遠征予定が届く",
    n >= 22 && !!firstMentor && !facts.some((x) => x.fact!.event === "away"),
    firstMentor,
  );
  add(
    "homecoming",
    "育ちと現在地が異なり、帰省をまだ検討していない",
    n >= 10 &&
      r.origin!.upbringing !== r.origin!.residence &&
      !facts.some((x) => x.fact!.event === "homecoming"),
    facts[0],
  );
  add(
    "origin",
    "最初の経歴の相手からの便り",
    n >= 6 && !facts.some((x) => x.fact!.event === "origin"),
    facts[0],
  );
  const fatigue = r.career.athlete.systemicFatigue;
  const pool =
    n <= 5
      ? ["routine", "measure"]
      : n <= 10
        ? ["measure", "routine", "environment"]
        : n <= 15
          ? ["environment", "work", "measure"]
          : n <= 19
            ? ["posing", "work", "environment"]
            : n <= 25
              ? ["work", "environment", "posing"]
              : n <= 30
                ? ["travel", "work", "environment"]
                : n <= 35
                  ? ["measure", "posing", "travel"]
                  : ["posing", "work", "measure"];
  if (fatigue > 0.55) pool.unshift("recover");
  const rotation =
    (r.seed + n + facts.filter((x) => x.strategy.coach).length) % pool.length;
  for (const event of [...pool.slice(rotation), ...pool.slice(0, rotation)])
    add(
      event,
      "現在の時期・勤務・練習と直近の話題から選出",
      !facts.slice(r.season?-4:-2).some((x) => x.fact!.event === event),
      last,
    );
  add("routine", "現在の練習から選べる予備の問い", true, last);
  return { selected: entries.find((c) => c.eligible)!, entries, open, n };
}
export function turningPoint(
  r: ChallengeRun,
  best: StageTier,
  stageName: string,
) {
  const { selected, entries, open, n } = tag(r),
    event = selected.event,
    source = selected.source;
  const records = r.records,
    last = records.at(-1),
    origin = r.origin!,
    bio = profile(origin);
  const previousRoutine = last?.fact?.routine ?? "regular";
  const routine =
    previousRoutine === "joint"
      ? "合同練習"
      : previousRoutine === "weekend"
        ? "週末を含む練習"
        : previousRoutine === "home"
          ? "自宅での練習"
          : "自主練習";
  const recentPerson = [...records].reverse().find((x) => x.fact?.person);
  const originChoice = records[0]?.fact;
  const connection = originChoice
    ? "最初に「" +
      records[0].strategy.name +
      "」を選んだ。" +
      (recentPerson
        ? "決断" + recentPerson.number + "での" + recentPerson.fact!.personName + "との記録も残っている。"
        : "")
    : recentPerson
      ? "決断" +
        recentPerson.number +
        "で" +
        recentPerson.fact!.personName +
        "と関わった。"
      : "";
  const track = last?.fact?.place ?? origin.residence;
  const strength = [...PARTS].sort(
    (a, b) =>
      r.career.athlete.body.muscle[b] / r.initial.athlete.body.muscle[b] -
      r.career.athlete.body.muscle[a] / r.initial.athlete.body.muscle[a],
  );
  const gain = (k: (typeof PARTS)[number]) =>
    (
      (r.career.athlete.body.muscle[k] / r.initial.athlete.body.muscle[k]-1)*100
    ).toFixed(2);
  const topic =
    "初日からの増加率は" +
    LABELS[strength[0]] +
    "が最も高く（" +
    gain(strength[0]) +
    "%）、" +
    LABELS[strength.at(-1)!] +
    "が最も低い（" +
    gain(strength.at(-1)!) +
    "%）。";
  const technique = option(
    "pose",
    "規定ポーズを録画して見直す",
    "映像を止めて確認する時間を毎日の練習に加えた。",
    stage,
  );
  const work = option(
    "short",
    "勤務を維持し短い練習でつなぐ",
    "仕事の時間を守り、練習を短く区切った。",
    { minutes: 30, workRatio: 1, foodStyle: "quick", sleep: 8 },
  );
  const invest = option(
    "time",
    "勤務を減らし、練習と睡眠に充てる",
    "勤務を基準の80%にして練習と回復に時間を移した。",
    { minutes: 60, workRatio: 0.8, sleep: 8.5 },
  );
  const focus = option(
    "target",
    LABELS[strength.at(-1)!] + "を含む部位を重点にする",
    "これまでの記録から重点部位を決めて練習した。",
    { minutes: 55 },
  );
  const phaseScenes: Record<string, Scene> = {
    away: {
      title: "桐谷が遠征に出る",
      text: "以前相談した桐谷から、今期と次の期間は遠征で対面できないと連絡が届いた。遠隔の指導を受けるか、自分で組み直すか。",
      choices: [
        option(
          "online",
          "記録を送り、遠隔指導を続ける",
          "桐谷が遠征先から確認できるよう、動画で相談する形に切り替えた。",
          { coach: true, posing: 30 },
          { person: "mentor" },
        ),
        option(
          "wait",
          "対面は帰着後に相談し、今期は自主練にする",
          "帰着後に連絡する約束を残し、自主練を進めた。",
          solo,
          { person: "mentor", follow: next("backFromTrip", 2) },
        ),
        independent(),
      ],
    },
    backFromTrip: {
      title: "遠征を終えた桐谷から返事",
      text: "出発時に連絡を頼んだ桐谷が戻った。以前の練習帳を見せる約束をどうするか。",
      choices: [
        option(
          "consult",
          "帰着した桐谷に今の動きを見てもらう",
          "遠征後の指導枠で、自主練の期間に変わった動きを確かめた。",
          mentor,
          { person: "mentor" },
        ),
        visitGym(),
        independent(),
      ],
    },
    final: {
      title: n === 20 ? "国内編の最後の準備" : "最後の舞台を選ぶ",
      text:
        connection +
        track +
        "での" +
        routine +
        "を重ねてきた。最後に今の身体をどこで確かめたいか。",
      choices: [independent(), focus, enter()],
    },
    restart: {
      title: "国内の記録から次の目標へ",
      text:
        (r.domestic?.text ?? "") +
        (best === "world"
          ? "国内の実績で国際大会へ申し込める。遠征を含む生活へ移るか考えたい。"
          : "今の出場可能な舞台は" +
            stageName +
            "。ここから次の実績を積む道がある。"),
      choices: [independent(), best === "world" ? invest : focus, enter()],
    },
    showReply: {
      title: "舞台を降りたあと",
      text: source?.show
        ? source.show.rank +
          "位で終えた舞台。隣で審査を受けた選手に話しかけられる時間がある。"
        : "",
      choices: [
        option(
          "talk",
          "並んだ選手に声をかけ、次の練習について聞く",
          "舞台のあとで話をし、練習日を知らせ合うことにした。",
          {},
          { person: "rival", follow: next("reunion", 2) },
        ),
        technique,
        independent(),
      ],
    },
    reunion: {
      title: "以前話した選手からの連絡",
      text:
        (source?.fact?.personName ?? "") +
        "から合同練習の日程が届いた。舞台後に自分から声をかけた相手だ。",
      choices: [
        option(
          "trainTogether",
          "日程を合わせて合同練習に参加する",
          "連絡を取り合っていた選手と同じラックで練習した。",
          { minutes: 60, workRatio: 0.8 },
          { person: "rival", visit: 3 },
        ),
        option(
          "reply",
          "会いに行かず、動画で動きを交換する",
          "今回は遠隔で動画を交換し、姿勢を確認した。",
          stage,
          { person: "rival" },
        ),
        independent(),
      ],
    },
    entry: {
      title: "今期の出場締切",
      text:
        connection +
        routine +
        "で準備してきた。現在の参加資格で選べる舞台は" +
        stageName +
        "。",
      choices: [prep(), technique, enter()],
    },
    origin: {
      title: "出発点からの便り",
      text:
        bio.role +
        "の" +
        origin.contact +
        "から手紙が届いた。「" +
        bio.letter +
        "」",
      choices: [
        option(
          "letter",
          "今の練習帳を添えて返事する",
          "練習帳の一頁を送り、これまで何を選んだかを伝えた。",
          {},
          { person: "origin" },
        ),
        technique,
        independent(),
      ],
    },
    homecoming: {
      title: "育った町へ帰る日を選ぶ",
      text:
        "現在の拠点は" +
        origin.residence +
        "。育った" +
        origin.upbringing +
        "で、昔の練習を思い出す時間を取れる。",
      choices: [
        option(
          "visitHome",
          "仕事を調整し帰省する",
          "育った土地へ一日戻り、帰宅後に普段の練習を再開した。",
          { workRatio: 0.8, minutes: 35 },
          { fee: 12000, visit: 8 },
        ),
        work,
        independent(),
      ],
    },
    environment: {
      title: "練習場所を見直す",
      text:
        track +
        "で続けている" +
        routine +
        "。自由に時間を選ぶことと、人に見てもらう機会をどう組み合わせよう。",
      choices: [
        visitGym(),
        option(
          "homeAgain",
          "自宅中心に組み替える",
          "自宅へ練習の軸を移した。以前の記録と連絡先は持ち続ける。",
          atHome,
          { routine: "home" },
        ),
        independent(),
      ],
    },
    measure: {
      title: "身体の記録を読み直す",
      text: topic,
      choices: [focus, technique, independent()],
    },
    work: {
      title: "次の勤務表",
      text: "勤務希望の締切が来た。今期の練習と収入のどちらに余裕を持たせよう。",
      choices: [
        work,
        invest,
        option(
          "income",
          "仕事を増やし次の出場費を積み立てる",
          "勤務を増やし、練習を短時間にした。",
          { workRatio: 1.1, minutes: 30 },
        ),
      ],
    },
    posing: {
      title: "比較の呼び出しに備える",
      text:
        "今のポージング習熟は" +
        Math.round(r.career.progress!.posing * 100) +
        "。筋量を育てる日と、舞台で保つ姿勢の時間を配分したい。",
      choices: [focus, technique, work],
    },
    travel: {
      title: "離れた舞台へ準備を運ぶ",
      text:
        "現在の拠点は" +
        origin.residence +
        "。" +
        stageName +
        "への出場費と準備に使う時間を見直す。",
      choices: [
        work,
        option(
          "travelPractice",
          "移動を含む一日練習を試す",
          "移動先で通し練習を行い、次の遠征の予定を組んだ。",
          {},
          { visit: 5, fee: 4500 },
        ),
        enter(),
      ],
    },
    recover: {
      title: "疲労を踏まえた練習",
      text:
        "現在の全身疲労は" +
        Math.round(r.career.athlete.systemicFatigue * 100) +
        "。休める日をどこに置くか。",
      choices: [
        work,
        option(
          "rest",
          "勤務と強度を落とし睡眠を確保する",
          "強度を落とし、睡眠を優先する期間にした。",
          { workRatio: 0.8, effort: "light", sleep: 9 },
        ),
        technique,
      ],
    },
    routine: {
      title: "次の週間予定",
      text:
        track +
        "での" +
        routine +
        "を振り返る。体脂肪率は" +
        fatPercent(r.career.athlete.body).toFixed(1) +
        "%。今期はどんな時間を残したいか。",
      choices: [independent(), visitGym(), technique],
    },
  };
  let scene = scenes[event] ?? phaseScenes[event];
  if (event === "opening") {
    const partner = named(r, "partner");
    scene = {
      ...scene,
      text: bio.wish + " " + scene.text,
      choices: scene.choices.map((c) =>
        c.key === "friend"
          ? partner.id === "partner-izumi"
            ? { ...visitGym(), name: "公開練習で近所のジムを見学する" }
            : { ...c, name: partner.name + "と近所のジムで始める" }
          : c,
      ),
    };
  }
  const knownHelper = records.find((x) => x.fact?.action === "help"),
    knownCoach = records.find((x) => x.fact?.person === "coach-kiritani");
  if (event === "final" || event === "entry" || event === "restart") {
    const away = records.some(
      (x) =>
        x.fact?.unavailable?.person === "coach-kiritani" &&
        x.fact.unavailable.through >= n,
    );
    const witness = knownHelper
      ? named(r, "partner")
      : knownCoach && !away
        ? named(r, "mentor")
        : undefined;
    if (witness)
      scene = {
        ...scene,
        choices: scene.choices.map((c) =>
          c.key === "enter"
            ? {
                ...c,
                name: witness.name + "に準備を頼み、出場資格のある舞台へ",
                person: knownHelper ? "partner" : "mentor",
                reply:
                  witness.name + "と会場で準備を確かめ、自分の出番を迎えた。",
              }
            : c,
        ),
      };
  }
  if (event === "reunion" && source?.fact?.person) {
    const visited = records.filter(
      (x) =>
        x.fact?.person === source.fact!.person && x.fact?.event === "reunion",
    );
    if (visited.length)
      scene = {
        ...scene,
        text:
          scene.text + "前の誘いから試合を一つ経て、今回はその講評を持ち寄る。",
      };
  }
  if (n >= 36 && event === "posing" && last) {
    scene = {
      ...scene,
      text:
        "決断" +
        last.number +
        "では「" +
        last.strategy.name +
        "」を選んだ。" +
        topic +
        "最後の舞台で姿勢を保つ時間をどれだけ取るか。",
    };
  }
  if (event === "membership" && last?.fact?.venue === "宮田の公開ジム")
    scene = {
      ...scene,
      text: "すでに通っている宮田のジムで、曜日を相談し直した。次の時間枠をどう使うか。",
      choices: scene.choices.map((c) =>
        c.key === "join"
          ? {
              ...c,
              name: "相談した時間枠に通い直す",
              reply: "宮田と相談し、通う時間枠を更新した。",
            }
          : c,
      ),
    };
  if(r.season){
    const goal=targetEdition(r),weeks=Math.ceil((goal.date-r.career.athlete.day)/7);
    if(event==="entry"){
      const preparation=weeks<=4
        ? option("taper","負荷を落として立ち姿を整える","練習の負荷を落とし、規定ポーズと睡眠に時間を回した。",{effort:"light",minutes:30,posing:40,sleep:8.5})
        : weeks<=8
          ? option("rehearse","本番の順番でポーズを通す","規定ポーズを続けて練習し、動きの切り替えを確かめた。",{minutes:40,posing:45})
          : focus;
      scene={...scene,title:"次の開催までの仕上げ方",text:goal.name+"まであと"+weeks+"週。"+(weeks<=4?"疲労を抜きながら立ち姿を確かめたい。":weeks<=8?"審査の流れを想定して、ポーズを通す時間を取れる。":"まだ練習を重ねる時間がある。弱点に配分するか、次の開催へ回すか。"),
        choices:scene.choices.map(choice=>choice.key==="pose"?preparation:choice)};
    }
    if(event==="restart")scene={...scene,text:"国内編で積んだ成績から、次に目指せるのは"+goal.name+"。今季の生活に合わせて準備を始めたい。"};
    if(event==="reunion"&&source?.fact?.personName){
      const rival=r.rivals.find(x=>x.name===source.fact?.personName);
      if(rival)scene={...scene,text:rival.name+"から練習の誘いが届いた。テーマは相手が得意な「"+rival.style+"」。現地で試すか、動画を交換するか。",choices:scene.choices.map(c=>c.key==="trainTogether"?{...c,name:rival.name+"と"+rival.style+"を練習",changes:{...c.changes,priority:rival.style.includes("脚")?"legs":rival.style.includes("背")?"back":"balanced",posing:rival.style.includes("ポー")?45:20},reply:rival.name+"と時間を合わせ、「"+rival.style+"」の準備を一緒に試した。"}:c)};
    }
    if(event==="work")scene={...scene,title:"大会に向けた勤務希望",text:goal.name+"まで"+weeks+"週。次の勤務表に合わせ、練習時間を取るか遠征費を積み立てるか考えたい。"};
    if(n>=36 && n<=39)scene={...scene,title:["最終シーズンの身体測定","仕上げを続ける場所","最後に見せたいポーズ","本番前の休息"][n-36],text:(n===36?bio.wish+" ":n===37?track+"で積んだ練習がある。":n===38?"鏡の前で立ち姿を確かめた。":"今の疲労は"+Math.round(r.career.athlete.systemicFatigue*100)+"%。")+goal.name+"を見据え、残りの期間をどう使おう。"};
    if(event==="showReply"&&source?.show?.edition)scene={...scene,title:source.show.rank<=3?"入賞を次の準備へつなぐ":"審査の差を受けとめる",text:source.show.rank+"位で舞台を降りた。次のシーズンに向けて、同じ列に並んだ選手に準備の工夫を聞く時間がある。"};
  }
  const due =
    selected.source?.fact?.next?.event === event ? source!.number : null;
  const cause = source?.number ?? null;
  return {
    event,
    title: scene.title,
    issue:
      (due && !r.season ? "決断" + due + "「" + source!.strategy.name + "」の続き。" : "") +
      (r.season?scene.text.replace(/決断\d+での(.+?)との記録も残っている。/g,"").replace(/決断\d+では/g,"前の期間には").replace(/最初に「[^」]+」を選んだ。/g,"").replace(/国内の実績で国際大会へ申し込める。/g,"次の国際大会の資格と受付時期を確認しよう。"):scene.text),
    choices: scene.choices,
    cause,
    source,
    open,
    due,
    previousRoutine,
    entries,
  };
}
export function turningStrategies(
  r: ChallengeRun,
  base: Strategy,
  weak: Strategy["priority"],
  best: StageTier,
  name: string,
) {
  const scene = turningPoint(r, best, name),
    prev = r.records.at(-1)?.strategy;
  return scene.choices.map((c) => {
    const tier = c.contest === "best" ? best : (c.contest ?? null);
    const routine = c.routine ?? scene.previousRoutine;
    const p: Strategy = {
      ...base,
      ...(r.season&&prev?{sleep:prev.sleep,workRatio:prev.workRatio,goal:prev.goal,minutes:prev.minutes,posing:prev.posing,cardio:prev.cardio,effort:prev.effort}:{}),
      budget: prev?.budget ?? base.budget,
      foodStyle: prev?.foodStyle ?? base.foodStyle,
      equipment: r.career.progress!.equipment,
      coach: prev?.coach ?? false,
      priority: c.key === "target" ? weak : (prev?.priority ?? base.priority),
      ...c.changes,
      ...(r.season&&prev&&tier?{coach:prev.coach}:{}),
      id: "turn/" + scene.event + "/" + c.key,
      name:
        c.name +
        (tier ? "（" + (tier === best ? name : "ジム測定会") + "）" : ""),
      contest: tier,
      aim: c.goal ?? c.name,
      reason: scene.issue,
      tradeoff: "",
      routine,
      visitHours: c.visit ?? 0,
      bookingFee: c.fee ?? 0,
    };
    p.tradeoff =
      "練習上限" +
      p.minutes +
      "分、勤務" +
      Math.round(p.workRatio * 100) +
      "%。" +
      (p.coach ? "継続指導は月10,000円。" : "") +
      (c.fee ? "今回の費用" + c.fee.toLocaleString("ja-JP") + "円。" : "") +
      (c.visit ? "期間末に" + c.visit + "時間を確保。" : "");
    return p;
  });
}
export function makeFact(
  r: ChallengeRun,
  p: Strategy,
  best: StageTier,
  name: string,
): TurningFact {
  const scene = turningPoint(r, best, name),
    c = scene.choices.find((x) => "turn/" + scene.event + "/" + x.key === p.id);
  const person = c?.person ? named(r, c.person, scene.source) : undefined;
  const n = r.records.length + 1,
    closed = scene.open
      .filter(
        (x) => x.number === scene.due || x.fact!.next!.expires <= n || n === 40,
      )
      .map((x) => x.number);
  const previousVenue = r.records.at(-1)?.fact?.venue;
  const venue =
    p.equipment === "home"
      ? "自宅"
      : c?.key === "coach"
        ? "桐谷の競技ジム"
        : c?.key === "friend"
          ? "近所のジム"
          : c?.key === "join" || c?.key === "weekendGym"
            ? "宮田の公開ジム"
            : previousVenue && previousVenue !== "自宅"
              ? previousVenue
              : "近所のジム";
  return {
    event: scene.event,
    action: c?.key ?? "custom",
    cause: scene.cause,
    person: person?.id,
    personName: person?.name,
    routine: p.routine ?? (p.equipment === "home" ? "home" : "regular"),
    venue,
    place: r.origin!.residence + "の" + venue,
    promise:
      c?.promise ?? (scene.event === "entryPlan" ? "予定を終了" : undefined),
    goal: c?.goal ?? r.records.at(-1)?.fact?.goal ?? profile(r.origin!).wish,
    offered: scene.choices.map((x) => x.name),
    closed,
    next: c?.follow
      ? {
          event: c.follow.event,
          due: n + c.follow.delay,
          expires: n + c.follow.delay + 2,
        }
      : undefined,
    fee: p.bookingFee ?? 0,
    visit: p.visitHours ?? 0,
    ...(scene.event === "away"
      ? { unavailable: { person: "coach-kiritani", through: n + 1 } }
      : {}),
    ...(scene.event === "entryPlan" && c?.key === "enter" && p.contest
      ? { jointRegistration: true }
      : {}),
    ...(person && p.contest && ["enter", "acceptHelp"].includes(c!.key)
      ? { witnesses: [person.name] }
      : {}),
    reply: c ? c.reply : "自分で調整した予定でこの期間を過ごした。",
  };
}
export function turningEnding(records: DecisionRecord[]) {
  const first = records[0],
    entry = records.find((x) => x.show),
    help = records.find((x) => x.fact?.action === "help"),
    joined = records.find((x) => x.fact?.action === "join"),
    last = records.at(-1)!;
  return [
    "初めに選んだのは「" + first.strategy.name + "」。",
    help
      ? "決断" +
        help.number +
        "で" +
        help.fact!.personName +
        "の出場準備を支えた。"
      : "",
    joined ? "公開練習の後、決断" + joined.number + "でジムへ入会した。" : "",
    entry
      ? "初出場は決断" + entry.number + "。"
      : "大会への申込をせず育成を続けた。",
    "最後に選んだのは「" + last.strategy.name + "」。",
  ].join("");
}

/** Project only completed decisions. A running job carries a draft fact until the period commits. */
export function relationshipBook(records: DecisionRecord[]) {
  const people = new Map<
    string,
    {
      name: string;
      meet: number;
      last: number;
      exchanges: number;
      known: string[];
      role: string;
    }
  >();
  for (const rec of records) {
    const f = rec.fact;
    if (!f?.person || !f.personName) continue;
    const person = people.get(f.person) ?? {
      name: f.personName,
      meet: rec.number,
      last: rec.number,
      exchanges: 0,
      known: [],
      role:
        f.person === "coach-kiritani"
          ? "指導者"
          : f.person === "gym-miyata"
            ? "公開練習の受付"
            : f.person.startsWith("bl-rival")
              ? "大会選手"
              : f.action === "friend"
                ? "練習仲間"
                : "経歴に登場する相手",
    };
    person.last = rec.number;
    person.exchanges++;
    person.known.push("決断" + rec.number + "「" + rec.strategy.name + "」");
    people.set(f.person, person);
  }
  return [...people.values()];
}
export function validateTurningFact(f: TurningFact, n: number) {
  const str = (v: unknown) => typeof v === "string" && v.length <= 1500;
  const past = (v: unknown) =>
    typeof v === "number" && Number.isInteger(v) && v >= 1 && v < n;
  if (
    !f ||
    ![f.event, f.action, f.place, f.reply].every(str) ||
    !(f.cause === null || past(f.cause)) ||
    !["regular", "joint", "weekend", "home"].includes(f.routine) ||
    !Array.isArray(f.offered) ||
    f.offered.length > 6 ||
    !f.offered.every(str) ||
    !Array.isArray(f.closed) ||
    !f.closed.every(past) ||
    [f.person, f.personName, f.promise, f.goal].some(
      (x) => x !== undefined && !str(x),
    ) ||
    !Number.isFinite(f.fee) ||
    f.fee < 0 ||
    !Number.isFinite(f.visit) ||
    f.visit < 0 ||
    (f.next &&
      ((!Object.hasOwn(scenes, f.next.event) &&
        !["reunion", "backFromTrip"].includes(f.next.event)) ||
        !Number.isInteger(f.next.due) ||
        f.next.due <= n ||
        f.next.expires < f.next.due)) ||
    (f.witnesses && (!Array.isArray(f.witnesses) || !f.witnesses.every(str)))
  )
    throw Error("決断の人物・予定の記録が不正です");
}
