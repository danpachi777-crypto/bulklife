import type {Strategy} from "../core/challengeTypes";
import {PRIORITIES} from "../core/coach";

const hints:Record<string,string>={
 coach:"フォームをその場で教わる。指導費と通う時間を確保する。",
 friend:"二人で交代しながら練習する。相手の予定にも時間を合わせる。",
 home:"自分の時間で反復する。フォームの確認は自分で続ける。",
 help:"友人の準備を間近で学ぶ。この日は自分の練習を譲る。",
 split:"互いの仕上がりに合わせ、別々の日程で準備する。",
 promise:"同じ舞台を目標にする。二人の勤務表を見ながら進める。",
 lesson:"一度フォームを見てもらい、次の自主練に持ち帰る。",
 visit:"実際の設備と人を知るため、公開練習に時間を使う。",
 join:"相談した時間にジムへ通い、練習の場を変える。",
 pose:"規定ポーズを磨く時間を取り、筋力練習を短くまとめる。",
 target:"伸びの小さい部位に練習を配分する。他の部位は維持を目指す。",
 own:"生活に合わせて練習を組む。毎週の配分も自分で判断する。",
 travelPractice:"一日だけ現地で試し、移動と食事の段取りを確かめる。",
};
export function choiceHint(p:Strategy){
 const action=p.id.split("/").at(-1)??"";
 if(hints[action])return hints[action];
 if(p.aim!==p.name&&!p.name.startsWith(p.aim))return p.aim;
 if(p.contest)return "今回の仕上がりを審査で確かめる。直前は練習を休んで備える。";
 if(p.visitHours)return "予定当日は"+p.visitHours+"時間を空け、それ以外はいつもの練習を続ける。";
 if(p.workRatio<1)return "勤務を減らし、収入の一部を練習と休養の時間に換える。";
 if(p.workRatio>1)return "勤務を増やして資金を積む。練習は短時間にまとめる。";
 return PRIORITIES[p.priority]+"を意識して、1回"+p.minutes+"分を練習の目安にする。";
}
