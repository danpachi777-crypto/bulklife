import type { Strategy } from "./challengeTypes";
export type Person = "mentor" | "partner" | "host" | "rival" | "origin";
export type Routine = "regular" | "joint" | "weekend" | "home";
export type PromiseStatus =
  | "同じ舞台を目指す"
  | "週末に確認"
  | "別日程で支援"
  | "一緒に練習"
  | "支援済み"
  | "今回を見送る"
  | "予定を終了";
interface Follow {
  event: string;
  delay: number;
}
interface Choice {
  key: string;
  name: string;
  reply: string;
  changes: Partial<Strategy>;
  person?: Person;
  routine?: Routine;
  promise?: PromiseStatus;
  follow?: Follow;
  fee?: number;
  visit?: number;
  contest?: "best" | "gym";
  goal?: string;
}
export interface Scene {
  title: string;
  text: string;
  choices: Choice[];
}
export const option = (
  key: string,
  name: string,
  reply: string,
  changes: Partial<Strategy> = {},
  extra: Partial<Choice> = {},
): Choice => ({ key, name, reply, changes, ...extra });
export const next = (event: string, delay = 1) => ({ event, delay });
export const mentor = {
  coach: true,
  equipment: "gym",
  minutes: 50,
  workRatio: 0.8,
} as const;
export const solo = { coach: false, minutes: 55, posing: 15 } as const;
const together = {
  coach: false,
  equipment: "gym",
  minutes: 45,
  posing: 20,
} as const;
export const atHome = {
  coach: false,
  equipment: "home",
  minutes: 35,
  sleep: 8.5,
} as const;
export const stage = { coach: false, posing: 45, minutes: 35 } as const;
export const prep = () =>
  option(
    "build",
    "今期は出場を見送り、次の準備を組む",
    "申し込みを見送り、練習帳に次の確認日を記した。",
    solo,
    { goal: "次の出場前に身体を作る", follow: next("review", 2) },
  );
export const enter = () =>
  option(
    "enter",
    "出場資格のある舞台へ申し込む",
    "この期間の舞台に申し込み、規定ポーズを準備した。",
    stage,
    { contest: "best", goal: "舞台で今の準備を確かめる" },
  );
export const independent = () =>
  option(
    "own",
    "自分で週間練習を組む",
    "自分の生活時間に合わせて自主練を組んだ。",
    solo,
    { routine: "regular", goal: "自分の方法で育てる" },
  );
export const visitGym = () =>
  option(
    "visit",
    "公開練習で設備と通える時間を確かめる",
    "公開練習で受付担当の宮田と会い、通える曜日を相談した。",
    { minutes: 40, coach: false },
    { person: "host", visit: 3, follow: next("membership") },
  );
const support = () =>
  option(
    "help",
    "友人の大会で準備を手伝う",
    "友人の大会当日、受付から出番まで荷物と準備を手伝った。",
    together,
    {
      person: "partner",
      visit: 4,
      promise: "支援済み",
      follow: next("returnHelp", 2),
    },
  );
export const scenes: Record<string, Scene> = {
  opening: {
    title: "最初の練習場所",
    text: "競技を目指すと決めた。これから数週間、誰とどこで準備しよう。",
    choices: [
      option(
        "coach",
        "元選手のいるジムへ入る",
        "ジムで元選手の桐谷に会い、測定会の案内を手渡された。",
        mentor,
        { person: "mentor", routine: "regular", follow: next("invitation") },
      ),
      option(
        "friend",
        "友人と近所のジムで始める",
        "二人でラックを交代し、初心者が舞台に立つまでの予定表を広げた。",
        together,
        { person: "partner", routine: "joint", follow: next("partnerOffer") },
      ),
      option(
        "home",
        "自宅で記録をつけながら続ける",
        "自宅で練習した日の動画と重量を残した。誰に見てもらうかはまだ決めていない。",
        atHome,
        { routine: "home", follow: next("feedback") },
      ),
    ],
  },
  invitation: {
    title: "桐谷から届いた測定会の案内",
    text: "入会した日に会った桐谷から開催日の連絡が来た。今回は選手として立つか、準備の現場を見るか。",
    choices: [
      option(
        "measure",
        "今回の測定会に出場する",
        "桐谷に参加を伝え、測定会へ申し込んだ。",
        stage,
        { person: "mentor", contest: "gym" },
      ),
      option(
        "assist",
        "他の選手の舞台準備を手伝う",
        "会場で選手の呼び出しと器具の片付けを担当した。",
        {},
        { person: "mentor", visit: 3, follow: next("backstage", 2) },
      ),
      option(
        "basics",
        "基礎を習ってから次の日程を相談する",
        "桐谷に今回は見送ると伝え、基礎練習を一緒に始めた。",
        mentor,
        { person: "mentor", follow: next("review", 2) },
      ),
    ],
  },
  partnerOffer: {
    title: "友人の予定表",
    text: "一緒に鍛え始めた相手が「まず二人で初心者の舞台を目指さない？」と日程を示した。出場申込はこれからだ。",
    choices: [
      option(
        "promise",
        "同じ大会を目指す約束をする",
        "同じ大会を目指す日を手帳に記した。まだ二人とも申し込んでいない。",
        together,
        {
          person: "partner",
          promise: "同じ舞台を目指す",
          follow: next("shift"),
        },
      ),
      support(),
      option(
        "separate",
        "それぞれに合う大会を選ぶ",
        "別々の予定表を作った。互いの準備が合う日に応援できる。",
        solo,
        {
          person: "partner",
          promise: "別日程で支援",
          follow: next("supportDay"),
        },
      ),
    ],
  },
  shift: {
    title: "勤務表の変更",
    text: "約束した友人の勤務が変わり、同じ平日の練習が難しくなった。二人の予定表を開き直す。",
    choices: [
      option(
        "adjust",
        "勤務を減らし、一緒に練習できる曜日へ移す",
        "勤務を調整し、火・木・土に一緒に通う形へ変えた。",
        { ...together, workRatio: 0.8 },
        {
          person: "partner",
          routine: "joint",
          promise: "一緒に練習",
          follow: next("entryPlan"),
        },
      ),
      option(
        "weekend",
        "平日は別々、週末に確認し合う",
        "普段は別々に鍛え、土曜に姿勢と記録を確認する日を置いた。",
        solo,
        {
          person: "partner",
          routine: "weekend",
          promise: "週末に確認",
          follow: next("entryPlan"),
        },
      ),
      option(
        "split",
        "大会を分け、互いの支援日を相談する",
        "一緒の大会という予定を変更した。先に友人の大会が来る。支援はまだ予定だ。",
        solo,
        {
          person: "partner",
          routine: "regular",
          promise: "別日程で支援",
          follow: next("supportDay"),
        },
      ),
    ],
  },
  entryPlan: {
    title: "二人の目標と自分の申込",
    text: "練習方法を相談した相手と締切を確認する。相手の出場記録と自分の申し込みは別々に残る。",
    choices: [prep(), support(), enter()],
  },
  supportDay: {
    title: "別の日程にした友人の本番",
    text: "先に友人の大会の日が来た。支援に出るなら当日は会場で過ごす。",
    choices: [
      support(),
      option(
        "message",
        "会場へ行かず、練習後に連絡する",
        "当日は自分の練習を進め、終わってから連絡した。",
        solo,
        { person: "partner", promise: "予定を終了" },
      ),
      option(
        "defer",
        "今回は支援を見送り、練習に集中する",
        "事情を伝え、今回の支援予定を閉じた。",
        solo,
        { promise: "今回を見送る" },
      ),
    ],
  },
  returnHelp: {
    title: "手伝いを受けた友人からの返事",
    text: "会場で出番まで付き添った友人から「今度は自分が荷物を持つよ」と返事が来た。",
    choices: [
      option(
        "acceptHelp",
        "友人にサポートを頼んで自分の舞台へ",
        "受付で友人に荷物を預け、自分の出番を迎えた。",
        stage,
        { person: "partner", contest: "best", promise: "予定を終了" },
      ),
      option(
        "practice",
        "今回は舞台を見送り練習の補助を頼む",
        "舞台への申し出は保留し、ラックで補助を交代した。",
        together,
        { person: "partner", routine: "joint", promise: "予定を終了" },
      ),
      option(
        "release",
        "礼を伝え、自分だけで準備する",
        "申し出に礼を伝え、今回は自分で準備した。",
        solo,
        { promise: "予定を終了" },
      ),
    ],
  },
  feedback: {
    title: "自宅の動画を誰に見せるか",
    text: "手元には自分の記録がある。一人で確かめにくい動きについて、評価を受ける場を選ぶ。",
    choices: [
      option(
        "lesson",
        "単発の個別指導を受ける",
        "初めて桐谷に動画を見せ、次に確かめる動きを一つ教わった。",
        atHome,
        { person: "mentor", fee: 6000, visit: 2, follow: next("visitOffer") },
      ),
      visitGym(),
      option(
        "remote",
        "動画を使う継続指導を頼む",
        "桐谷と遠隔で記録を共有し、定期的に動画を見てもらうことにした。",
        { ...atHome, coach: true, posing: 30 },
        { person: "mentor", follow: next("visitOffer", 2) },
      ),
    ],
  },
  visitOffer: {
    title: "指導のあとに届いた公開日程",
    text: "動画を見た桐谷から公開練習の日程が届いた。同じ器具で習った動作を試せる。",
    choices: [
      visitGym(),
      independent(),
      option(
        "remote",
        "通所は見送り、自宅から動画を送る",
        "対面の予定は見送り、記録を使う指導を選んだ。",
        { ...atHome, coach: true },
        { person: "mentor", routine: "home" },
      ),
    ],
  },
  membership: {
    title: "見学したジムから空き枠の返事",
    text: "公開日に会った宮田から、通えると相談した曜日に空きが出たと連絡が来た。",
    choices: [
      option(
        "join",
        "相談した時間にジムへ入会する",
        "相談した時間枠で入会した。これまでの練習帳も新しいラックに持ち込んだ。",
        together,
        { person: "host", routine: "regular" },
      ),
      option(
        "weekendGym",
        "週末中心の利用に切り替える",
        "平日を生活に残し、週末を含む曜日に通い始めた。",
        { ...together, minutes: 55 },
        { person: "host", routine: "weekend" },
      ),
      option(
        "stay",
        "今回は入会を断り、自宅で続ける",
        "宮田に返事をし、見学で覚えた動きを自宅で試した。",
        atHome,
        { routine: "home" },
      ),
    ],
  },
  backstage: {
    title: "舞台袖から見えた準備",
    text: "準備を手伝った日に見た呼び出しの順番を覚えている。自分の準備で試したいことを選ぶ。",
    choices: [
      independent(),
      option(
        "rehearse",
        "呼び出しから一礼まで通して練習する",
        "舞台袖で見た順番を思い出しながら、入退場を繰り返した。",
        stage,
      ),
      enter(),
    ],
  },
  review: {
    title: "準備に充てた期間を振り返る",
    text: "前に立てた準備計画の確認日が来た。育成にもう一期間使うか、出場可能な舞台で確かめるか。",
    choices: [independent(), visitGym(), enter()],
  },
};
