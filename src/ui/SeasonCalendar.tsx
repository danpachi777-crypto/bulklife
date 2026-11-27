import {useState} from "react";
import {advancement,editions,entryProblem,findEdition,pendingEdition,qualifier,registerEdition,targetEdition,type Edition} from "../core/seasonCircuit";
import {isoDay} from "../core/calendar";
import type {ChallengeRun} from "../core/challengeTypes";
export function SeasonCalendar({run,full=false,save,busy}:{run:ChallengeRun;full?:boolean;save:(r:ChallengeRun)=>void;busy:boolean}){
 const [confirm,setConfirm]=useState("");
 const current=targetEdition(run),pending=pendingEdition(run),today=run.career.athlete.day;
 const rows=full?editions(run).filter(e=>e.date>=today).sort((a,b)=>a.date-b.date):[current];
 function target(e:Edition){save({...run,season:{...run.season!,target:e.key}});}
 return <section className="season-calendar" aria-label={full?"年間大会カレンダー":"次の目標大会"}>
 {full&&<h2>年間大会カレンダー</h2>}
 {rows.map(e=>{const booked=pending?.key===e.key,reason=entryProblem(run,e),weeks=Math.ceil((e.date-today)/7);
 return <article key={e.key}><small>{full?"架空のBULK男子サーキット":"次の目標大会"} · {{gym:"測定会",region:"県",open:"地方",national:"全国",world:"国際"}[e.tier]} · {e.city}</small>
 <h3>{e.name} <small>あと{weeks}週</small></h3>
 <p><time>{isoDay(e.date)}</time> 開催 · {booked?"申込済み":qualifier(run,e)||"出場資格あり"}</p>
 <p>{advancement(e)}</p><small>締切 {isoDay(e.deadline)} · {booked?"申込済み":today<e.opens?"受付前":today>e.deadline?"受付終了":"受付中"}</small>
 {(full||!reason||confirm===e.key)&&<details open={confirm===e.key||undefined}><summary>申込日程・費用</summary>
 <p>受付 {isoDay(e.opens)}〜{isoDay(e.deadline)}。参加費{e.fee.toLocaleString()}円、交通費{e.travel.toLocaleString()}円。移動{e.days}日、受付・計量は{isoDay(e.checkIn)}。辞退時の返金はありません。</p></details>}
 {full&&!booked&&e.key!==current.key&&!pending&&run.status==="planning"&&<button onClick={()=>target(e)}>この大会を目指す</button>}
 {booked&&run.status==="planning"?<button onClick={()=>setConfirm("cancel"+e.key)}>出場を辞退する</button>:!reason&&<button disabled={busy} onClick={()=>setConfirm(e.key)}>申し込む</button>}
 {full&&reason&&!booked&&<small>{reason}</small>}
 {confirm===e.key&&!reason&&<button disabled={busy} onClick={()=>{save(registerEdition(run,e.key));setConfirm("");}}>{(e.fee+e.travel).toLocaleString()}円を支払い登録</button>}
 {confirm==="cancel"+e.key&&booked&&<button onClick={()=>{save({...run,season:{...run.season!,target:undefined,entries:run.season!.entries.map(x=>x.key===e.key?{...x,state:"cancelled"}:x)}});setConfirm("");}}>返金なしで辞退を確定</button>}
 </article>})}
 {full&&run.season!.entries.length>0&&<details><summary>申込履歴</summary>{run.season!.entries.map(x=><p key={x.key}>{findEdition(x.key).name} · {isoDay(findEdition(x.key).date)} · {{entered:"申込済み",finished:"出場済み",cancelled:"辞退"}[x.state]}</p>)}</details>}
 </section>;
}
