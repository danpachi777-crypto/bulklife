import backgrounds from "./backgrounds.json";
import episodes from "./episodes.json";
import type { ChallengeRun, Strategy } from "./challengeTypes";

export const prefectures = "北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県 茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県 新潟県 富山県 石川県 福井県 山梨県 長野県 岐阜県 静岡県 愛知県 三重県 滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県 鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県 福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県".split(" ");
export { backgrounds, episodes };
export interface LifeOrigin {
  version: 1;
  backgroundId: string;
  birthplace: string;
  upbringing: string;
  residence: string;
  contact: string;
}
function mix(value: number) {
  let n = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}
const pick = (seed: number, count: number) => Math.floor(mix(seed) / 4294967296 * count);
const places: Record<string,string> = {
  B21:"長崎県五島市", B24:"新潟県南魚沼市", B25:"静岡県下田市", B26:"群馬県板倉町", B30:"大阪府大阪市",
};
export function originFor(seed: number, index = pick(seed ^ 0x98124,60), birth = prefectures[pick(seed ^ 0xcc318,47)]):LifeOrigin {
  const id = backgrounds[index][0];
  const upbringing = places[id] ?? birth;
  let residence = upbringing;
  if (["B21","B48","B50"].includes(id)) residence = upbringing.includes("東京") ? "大阪府大阪市" : "東京都";
  return {version:1,backgroundId:id,birthplace:birth,upbringing,residence,contact:["直人","遥","律","千尋","葵","涼"][pick(seed ^ 0x1f31,6)]};
}
export function profile(o: LifeOrigin) {
  const [,past,thread,title,role,wish,ending,letter] = backgrounds.find(b=>b[0]===o.backgroundId)!;
  const origin = o.upbringing.startsWith(o.birthplace) ? o.upbringing+"で育った。" : o.birthplace+"で生まれ、幼い頃に"+o.upbringing+"へ移った。";
  const move = o.residence !== o.upbringing ? "成人して"+o.residence+"に移った。" : ["B28","B42"].includes(o.backgroundId) ? "一度故郷を離れ、成人後に帰郷した。" : "";
  return {past,thread,title,role,wish,ending,letter,origin:origin+move};
}
export function validOrigin(o: LifeOrigin,seed:number) {
  const index=backgrounds.findIndex(b=>b[0]===o?.backgroundId);
  if(index<0 || !prefectures.includes(o.birthplace)) return false;
  const expected=originFor(seed,index,o.birthplace);
  return (Object.keys(expected) as (keyof LifeOrigin)[]).every(k=>expected[k]===o[k]);
}
const openingArcs = [1,9,0,3,1,10,8,9,5,2,7,3,2,7,0,11,3,8,2,7,10,1,2,5,10,5,5,1,8,11,1,3,11,2,2,9,1,9,10,1,4,5,11,4,11,8,7,10,4,2,9,9,11,8,2,7,11,9,7,10];
const episodeId = (s?: Pick<Strategy,"id">) => /^story-(\d+)-(\d+)-(\d+)$/.exec(s?.id??"");
export function currentEpisode(r: ChallengeRun) {
  const o=r.origin!, n=r.records.length, phase=n%4, start=n-phase;
  const first=r.records[start], prev=r.records.at(-1);
  const seen=r.records.filter((_,i)=>i%4===0).map(x=>episodeId(x.candidates[0])).filter(x=>x!==null).map(x=>Number(x![1]));
  const lost=r.records.some(x=>x.show && x.show.rank>1);
  const pool=episodes.map((_,i)=>i).filter(i=>n<20 ? i<12 && (i!==6||lost) : i>=12);
  const available=pool.filter(i=>!seen.includes(i));
  const firstArc=n===0 ? openingArcs[Number(o.backgroundId.slice(1))-1] : undefined;
  const prior=first && episodeId(first.candidates[0]);
  const historyKey=r.records.slice(0,start).reduce((v,x)=>mix(v ^ (episodeId(x.strategy) ? Number(episodeId(x.strategy)![3])+1 : 4)),r.seed);
  const lastShow=prev?.show;
  const opportunity=n===36 ? 16 : n>=20 ? (prev?.strategy.coach ? 13 : prev?.strategy.equipment==="home" ? 14 : 12) :
    lastShow ? (lastShow.rank===1?9:6) : prev?.strategy.coach ? 8 : (prev?.strategy.workRatio??1)<1 ? 4 : prev?.strategy.equipment==="home"?5:7;
  const scheduled=prior && Number(prior[1])<episodes.length ? Number(prior[1]) : undefined;
  const arc=scheduled ?? firstArc ?? (available.includes(opportunity)?opportunity:(available.length?available:pool)[pick(historyKey,available.length||pool.length)]);
  const data=episodes[arc], lastChoice=prev && episodeId(prev.strategy);
  const scene=phase===0?1:phase===1?(lastChoice?.[3]==="1"?2:3):phase+2;
  const who=profile(o);
  const callback=phase===0 && n>0 ? "前の節目では「"+prev!.strategy.name+"」を選んだ。" : phase>0 ? "「"+prev!.strategy.name+"」を選んでから、" + o.contact+"と近況を話した。" : who.wish;
  const show=r.records.flatMap(x=>x.show?[x.show]:[]).at(-1);
  const lead=arc===6 && show ? "前回は"+show.rank+"位。":n===0? who.role+"の"+o.contact+"と話している。":"";
  const nextContact=prev?.strategy.coach?"個別指導の担当者":o.contact;
  const memory=n===4 ? o.contact+"から便りが届いた。「"+who.letter+"」" : n===16 ? o.contact+"が最初の練習帳を開く。第1回に選んだのは「"+r.records[0].strategy.name+"」だった。":"";
  const lastOpponent=show?.standings.find(x=>x.rank===(show.rank===1?2:show.rank-1));
  const rematch=lastOpponent && (arc===6||arc===0) ? show!.rank+"位の舞台で並んだ"+lastOpponent.name+"が次の練習に来る。" : "";
  const response=prev && phase>0 ? "前回の「"+prev.strategy.name+"」から始まった話だ。" + (prev.strategy.coach ? nextContact+"が次の指導枠を知らせてくれた。" : prev.strategy.workRatio>=1 ? "いつもの勤務を終え、"+o.contact+"と予定を見直す。" : o.contact+"と練習の経過を振り返る。") : callback;
  return {arc,scene,phase,title:data[0],issue:memory+response+lead+rematch+data[scene],data};
}
export function lifeCandidates(r:ChallengeRun, base:Strategy,specialist:Strategy,stage:Strategy,contestName:string) {
  const event=currentEpisode(r), prev=r.records.at(-1)?.strategy;
  const actions=event.data.slice(6,9);
  const inherited={...base, budget:prev?.budget??base.budget, foodStyle:prev?.foodStyle??base.foodStyle};
  const keepManual=prev && (!prev.autoTraining||!prev.autoFood) ? {manual:undefined,autoTraining:prev.autoTraining,autoFood:prev.autoFood} : {};
  const local:Strategy={...inherited,...keepManual, sleep:prev?.sleep??base.sleep,autoRecovery:prev?.autoRecovery??base.autoRecovery, equipment:event.arc===5?"home":base.equipment, minutes:[40,45,35,50][event.phase], effort:event.arc===4?"light":base.effort};
  const coached:Strategy={...inherited, priority:event.arc===3?"chest":[6,13].includes(event.arc)?"back":specialist.priority,coach:true,minutes:55,workRatio:.8,equipment:"gym",posing:25};
  const technique:Strategy={...stage,coach:false,posing:event.arc===13?55:40,budget:inherited.budget,foodStyle:inherited.foodStyle};
  const names=event.phase===0?actions:event.phase===1?event.data.slice(event.scene===2?9:12,event.scene===2?12:15):event.phase===2?[actions[0],event.data[10],event.data[14]]:["今期の身体を地元で記録する","大会を見送り弱点を習い直す",contestName+"へ出場する"];
  // A dated invitation belongs to the next decision only. Its source remains
  // in the previous record even if the player takes a different opportunity.
  const last=r.records.at(-1), show=last?.show;
  const opponent=show?.standings.find(x=>x.rank===(show.rank===1?2:show.rank-1));
  let invited="";
  if(show && opponent && event.phase===0) {
    names[1]=opponent.name+"の合同練習へ";
    coached.priority=opponent.score.mass>show.score.mass?"back":"shoulders";
    coached.posing=opponent.score.posing>show.score.posing?45:20;
    coached.minutes=coached.posing===45?35:60;
    invited="直近の対戦相手が次の合同日を知らせてきた。勤務を減らし、二人で指導を受ける。";
  } else if(last?.strategy.equipment==="home" && event.phase===1) {
    names[0]="家の器具で前期の種目を続ける";
    local.equipment="home";local.priority=last.strategy.priority;local.minutes=35;
  } else if(last && last.strategy.workRatio<1 && event.arc===4) {
    names[0]="引き継ぎを済ませて勤務を戻す";
    local.workRatio=1; local.minutes=30;local.foodStyle="quick";
  } else if(event.arc===4 && event.phase===0) {
    names[0]="残業を引き受け、短時間練習で遠征費を貯める";
    local.workRatio=1.1;local.minutes=30;local.sleep=7.5;
  } else if(event.arc===12 && event.phase<3) {
    local.foodStyle="quick";local.minutes=30;local.budget=Math.min(2200,inherited.budget+200);
    coached.foodStyle="recommend";coached.workRatio=.6;coached.sleep=8.5;
  }
  // Each four-decision thread resolves before another opens. The saved first choice
  // fixes the thread across reloads and subsequent choices determine the next one.
  return [local,coached,technique].map((p,i)=>({...p,id:`story-${event.arc}-${event.scene}-${i}`,name:names[i],
    aim:i===0?"今の暮らしに練習を残す":i===1?"弱点を指導の場で確かめる":p.contest?"今期の準備を舞台で確かめる":"本番で姿勢を保つ技術を磨く",reason:i===1 && invited?invited:event.issue,tradeoff:[local.equipment==="home"?"自宅器具の初回購入と種目の制約":"専門指導を依頼せず、練習を自分で組む。","勤務を基準の"+Math.round(coached.workRatio*100)+"%にし、指導料を月10,000円支払う。",p.contest?"大会への登録・遠征費と直前の練習休止を引き受ける。":"筋力練習を短くしてポーズに時間を使う。"][i]}));
}
