import {dateDay, seasonOf} from "./calendar";
import type {ChallengeRun, StageTier} from "./challengeTypes";

// BULK's fictional men's bodybuilding circuit. Qualification applies to a specific season.
export const SERIES = [
  {id:"gym",name:"リーフジム測定会",tier:"gym",month:3,day:15,city:"地元ジム",fee:500,travel:0,days:0},
  {id:"rookie",name:"BULK県オープン",tier:"region",month:9,day:15,city:"県民ホール",fee:3500,travel:1200,days:0},
  {id:"regional",name:"BULK地方オープン",tier:"open",month:8,day:16,city:"大阪",fee:8000,travel:18000,days:1},
  {id:"japan",name:"BULK日本グランプリ",tier:"national",month:10,day:18,city:"東京",fee:18000,travel:28000,days:1},
  {id:"asia",name:"BULKアジア招待戦",tier:"world",month:7,day:12,city:"台北",fee:22000,travel:65000,days:2},
  {id:"international",name:"BULK国際オープン",tier:"world",month:8,day:20,city:"ソウル",fee:26000,travel:78000,days:2},
  {id:"qualifier",name:"BULK世界予選",tier:"world",month:9,day:19,city:"シンガポール",fee:30000,travel:100000,days:3},
  {id:"final",name:"BULKワールドファイナル",tier:"world",month:11,day:15,city:"ロンドン",fee:40000,travel:180000,days:4},
] as const;
export type SeriesId=typeof SERIES[number]["id"];
export type Edition=ReturnType<typeof edition>;
export function edition(series:typeof SERIES[number],year:number,month:number=series.month){
  const day=dateDay(year,month,series.day);
  return {...series,year,key:series.id+"-"+year+(month===series.month?"":"-"+month),date:day,opens:day-150,deadline:day-14,checkIn:day-Math.min(1,series.days)};
}
export interface SeasonBook {
 version:1; since:number; target?:string; announced:string[];
 entries:{key:string;day:number;paid:number;state:"entered"|"cancelled"|"finished"}[];
 legacy:Partial<Record<SeriesId,number>>;
}
export function adoptCalendar(r:ChallengeRun):ChallengeRun {
 if(r.season||r.job)return r;
 const legacy:SeasonBook["legacy"]={};
 const year=seasonOf(r.career.athlete.day);
 const shows=r.records.flatMap(x=>x.show?[x.show]:[]);
 if(shows.length>=2)legacy.regional=year+1;
 if(shows.filter(s=>s.tier==="open"&&s.rank<=6).length>=2)legacy.japan=year+1;
 for(const rec of r.records){
   const s=rec.show;
   if(!s)continue;
   if(s.tier==="region"&&s.rank<=6)legacy.regional=year+1;
   if(s.tier==="open"&&s.rank<=4)legacy.japan=year+1;
   if(s.tier==="national"&&s.rank<=3)legacy.asia=year+1;
 }
 return {...r,season:{version:1,since:r.records.length,entries:[],announced:[],legacy}};
}
export function editions(r:ChallengeRun){
 const year=seasonOf(r.career.athlete.day);
 return [year,year+1].flatMap(y=>SERIES.flatMap(s=>s.id==="gym"?[3,6,9,12].map(m=>edition(s,y,m)):[edition(s,y)]));
}
export function findEdition(key:string){
 const [id,ys,ms,...extra]=key.split("-");const s=SERIES.find(s=>s.id===id), y=Number(ys);
 if(extra.length||!s||!Number.isInteger(y)||y<2027||y>2100||(ms!==undefined&&(s.id!=="gym"||!["6","9","12"].includes(ms))))throw Error("開催回が不正です");
 return edition(s,y,ms?Number(ms):s.month);
}
export function qualifier(r:ChallengeRun,e:Edition){
 const i=SERIES.findIndex(s=>s.id===e.id);
 if(i<2)return "";
 if(i>=4&&r.records.length<20)return "国内編を終えて国際予選へ";
 if((r.season?.legacy[e.id]??0)>=e.year)return "";
 const prev=SERIES[i-1];
 return r.records.some(rec=>{const show=rec.show;if(!show?.edition)return false;const from=findEdition(show.edition);return from.id===prev.id&&(from.year+1===e.year||(e.id==="asia"&&rec.number<=20&&r.domestic&&e.year===seasonOf(r.domestic.day)&&from.year>=e.year-2))&&show.rank<=3;})?"":(e.year-1)+"年の"+prev.name+"で3位以内";
}
export function advancement(e:Edition){
 const idx=SERIES.findIndex(s=>s.id===e.id);
 if(e.id==="japan")return "3位以内で翌年のアジア招待戦へ（国内編の間に獲得した資格は翌々年の世界編開幕にも有効）";
 return idx===0?"審査と舞台を経験する":idx===7?"世界の年間順位を決める":"3位以内で翌年の"+SERIES[idx+1].name+"へ";
}
export function entryProblem(r:ChallengeRun,e:Edition){
 const day=r.career.athlete.day;
 if(r.status!=="planning")return "次の決断で受付";
 if(r.season?.entries.some(x=>x.key===e.key))return "受付手続き済み";
 if(r.season?.entries.some(x=>x.state==="entered"))return "別の開催回に申込済み";
 const starts=r.season?.entries.filter(x=>x.state==="finished"&&findEdition(x.key).year===e.year&&findEdition(x.key).id!=="gym").length??0;
 if(e.id!=="gym"&&starts>=3)return "今季の公式戦3回を終了";
 if(day>e.deadline)return "申込終了";
 if(day<e.opens)return "受付開始前";
 return qualifier(r,e)||(r.career.athlete.life.money<e.fee+e.travel?"資金不足":"");
}
export function registerEdition(r:ChallengeRun,key:string){
 const e=findEdition(key),error=entryProblem(r,e);if(!r.season||error)throw Error(error||"カレンダーがありません");
 const next=structuredClone(r),paid=e.fee+e.travel;
 next.career.athlete.life.money-=paid;
 next.season!.target=e.key;
 next.season!.entries.push({key,day:r.career.athlete.day,paid,state:"entered"});
 return next;
}
export function pendingEdition(r:ChallengeRun){
 const entry=r.season?.entries.find(x=>x.state==="entered");return entry&&findEdition(entry.key);
}
export function targetEdition(r:ChallengeRun){
 const all=editions(r).filter(e=>e.date>=r.career.athlete.day);
 return pendingEdition(r)||all.find(e=>e.key===r.season?.target)||all.filter(e=>!qualifier(r,e)&&e.deadline>=r.career.athlete.day).sort((a,b)=>a.year-b.year||SERIES.indexOf(SERIES.find(s=>s.id===b.id)!)-SERIES.indexOf(SERIES.find(s=>s.id===a.id)!))[0]||all[0];
}
export function availableShow(r:ChallengeRun,tier:StageTier,end:number){
 const pending=pendingEdition(r); if(pending)return pending.tier===tier&&pending.date<end?pending:undefined;
 return editions(r).find(e=>e.tier===tier&&e.date<end&&!entryProblem(r,e));
}
export function periodLength(r:ChallengeRun,n:number,day:number,old:number){
 if(!r.season||n<=r.season.since)return old;
 const year=seasonOf(day);
 const boundaries=[[3,1],[5,25],[7,31],[10,1],[1,4]];
 const boundary=boundaries.map(([m,d])=>dateDay(m===1?year+1:year,m,d)).find(v=>v>day)!;
 return boundary-day;
}
