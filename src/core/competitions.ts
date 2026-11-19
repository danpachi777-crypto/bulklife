import {PARTS,clamp,fatPercent,muscleMass,weight,type BodyState,type Career} from './model';
import {dateDay,seasonOf,yearEnd,isoDay,gameDate} from './calendar';
import {RULES_VERSION,randomState,updateRivals} from './progress';
import type {Series,Circuit,Edition,Eligibility,Credential,Membership,Score,Result,Entry,Title,Rival} from './careerTypes';
export const SERIES_NAMES:Record<Series,string>={tokyo:'ミスター東京',japanClasses:'日本クラス別選手権',japan:'日本男子ボディビル選手権',ifbbWorld:'IFBB世界選手権',regional:'ZeniX Mid Japan Open',amateurOlympia:'Amateur Olympia Japan',newYorkPro:'New York Pro',olympia:'Mr. Olympia'};
export const CIRCUIT_NAMES:Record<Circuit,string>={jbbf:'JBBF / IFBB国際連盟',npc:'NPC Worldwide / IFBB Professional League'};
const sources={jbbf:'https://www.jbbf.jp/download/Committee/List_Participate_Competition_2026.pdf',world:'https://ifbb.com/wp-content/uploads/2026/01/MI-2026-IFBB-WORLD-CHANPIONSHIPS-SPAIN-MAIN-INFORMATION_3009-1.pdf',npc:'https://www.ifbbpro.com/npc-worldwide/rules/',oqs:'https://www.ifbbpro.com/2027-olympia-qualification-system/',contract:'https://www.ifbbpro.com/contest-contracts/'};
export function edition(series:Series,season:number):Edition{
 const definitions:Record<Series,{month:number;day:number;circuit:Circuit;fee:number;travel:number;classes:number[];urls:string[];notes:string[]}>={
  tokyo:{month:7,day:12,circuit:'jbbf',fee:8000,travel:3000,classes:[Infinity],urls:['https://www.jbbf.jp/championships/3447',sources.jbbf],notes:['ブロック選手権のオーバーオールとして記録。東京都居住・所属確認をゲーム内で扱う。2026個別要項は取得できていないため追加条件はゲーム内要項。']},
  japanClasses:{month:8,day:16,circuit:'jbbf',fee:15000,travel:20000,classes:[55,60,65,70,75,80,85,90,Infinity],urls:[sources.jbbf,'https://www.jbbf.jp/championships/3297'],notes:['2026資格表参照。全階級に初心者推薦を与えない。']},
  japan:{month:9,day:20,circuit:'jbbf',fee:18000,travel:15000,classes:[Infinity],urls:[sources.jbbf,'https://www.jbbf.jp/championships/3709'],notes:['日本男子はオーバーオール。体重別の日本クラス別とは別大会。']},
  ifbbWorld:{month:11,day:8,circuit:'jbbf',fee:40000,travel:180000,classes:[65,70,75,80,85,90,95,Infinity],urls:[sources.world],notes:['2026-09-30版個別要項のシニア男子8階級を固定。10/9改訂版の本文は取得未確認。国内連盟の派遣とIFBB最終承認を分離。']},
  regional:{month:4,day:18,circuit:'npc',fee:16000,travel:15000,classes:[70,80,90,Infinity],urls:[sources.npc,'https://zenix-jp.com/schedule/zenix-mid-japan-open/'],notes:['Open Regional。Natural Regionalの記録を代用しない。ここでの参加はプロカードではない。']},
  amateurOlympia:{month:8,day:29,circuit:'npc',fee:30000,travel:18000,classes:[70,80,90,Infinity],urls:[sources.npc,'https://zenix-jp.com/schedule/amateur-olympia-japan-day-1/'],notes:['5〜7人で1枚、8〜9人で2枚、10人以上3枚、5人未満0枚。15人未満は1クラス。将来シーズンの体重分割はゲーム内設定。']},
  newYorkPro:{month:5,day:9,circuit:'npc',fee:30000,travel:220000,classes:[Infinity],urls:['https://www.ifbbpro.com/competition/2026-new-york-pro/',sources.contract],notes:['男子Open Bodybuilding。プロActive登録と大会契約を別手続きにする。渡航費はゲーム設定。']},
  olympia:{month:10,day:10,circuit:'npc',fee:45000,travel:240000,classes:[Infinity],urls:[sources.oqs],notes:['男子Open。2027 OQSを参照した相対シーズン。資格取得と大会順位は別。']}
 };
 const d=definitions[series],showDay=dateDay(season,d.month,d.day);
 const contractDate=new Date(gameDate(showDay));contractDate.setUTCDate(contractDate.getUTCDate()-((contractDate.getUTCDay()+6)%7||7));
 const deadlineDay=series==='newYorkPro'?dateDay(contractDate.getUTCFullYear(),contractDate.getUTCMonth()+1,contractDate.getUTCDate()):showDay-21;
 return{id:`${series}-${season}`,series,name:SERIES_NAMES[series],circuit:d.circuit,organizationId:d.circuit==='jbbf'?(series==='ifbbWorld'?'ifbb-international':'jbbf'):(['newYorkPro','olympia'].includes(series)?'ifbb-pro-league':'npc-worldwide'),categoryId:'mensBodybuilding',ageClassId:'senior',referenceYear:series==='olympia'?2027:2026,season,showDay,deadlineDay,travelDay:showDay-(d.travel>100000?3:1),fee:d.fee,travel:d.travel,classes:d.classes,rulesVersion:RULES_VERSION,sourceUrls:d.urls,status:'simulated',ruleStatus:series==='tokyo'?'gameSupplement':'referenceVerified',notes:['開催日・会場・費用・CPU・審査係数はゲーム内の架空シーズン。公式発表ではありません。',...d.notes]};
}
export function editions(c:Career){const y=seasonOf(c.athlete.day);return [y,y+1].flatMap(year=>(Object.keys(SERIES_NAMES) as Series[]).map(s=>edition(s,year))).sort((a,b)=>a.showDay-b.showDay);}
export function classFor(e:Edition,w:number,categoryCount=24):string{
 if((e.series==='amateurOlympia'||e.series==='regional')&&categoryCount<15)return 'Open';
 if(e.classes.length===1)return 'Open';const index=e.classes.findIndex(limit=>w<=limit);
 return Number.isFinite(e.classes[index])?`${e.classes[index]}kg以下`:`${e.classes[e.classes.length-2]}kg超`;
}
export function hasCredential(c:Career,kind:string,day=c.athlete.day){const npc=['proCard','npcMembership','proActive','openRegionalParticipation'].includes(kind)||kind.startsWith('olympiaInvitation:')||kind.startsWith('approval:newYorkPro-')||kind.startsWith('approval:olympia-');return !!c.progress?.credentials.some(q=>q.kind===kind&&q.circuit===(npc?'npc':'jbbf')&&q.earnedDay<=day&&q.expiresDay>=day&&q.rulesVersion===c.progress!.rulesVersion);}
function addCredential(c:Career,kind:string,circuit:Circuit,season:number,expiresDay:number,result?:string):Credential{return{id:`${kind}-${season}-${result??'paper'}`,kind,circuit,season,earnedDay:c.athlete.day,expiresDay,rulesVersion:c.progress!.rulesVersion,sourceResult:result};}
function pay(c:Career,amount:number):Career{if(c.athlete.life.money<amount)throw new Error(`資金が不足しています。必要額 ${amount.toLocaleString()}円`);return {...c,athlete:{...c.athlete,life:{...c.athlete.life,money:c.athlete.life.money-amount}}};}
export function register(c:Career,kind:Membership|'passport'|'internationalCard'):Career{
 if(!c.progress||c.athlete.status!=='active')throw new Error('育成中の競技キャリアが必要です');const year=seasonOf(c.athlete.day);
 if(hasCredential(c,kind))return c;
 if(['npcMembership','proActive'].includes(kind)&&hasCredential(c,'jbbfRegistration')||kind==='jbbfRegistration'&&(hasCredential(c,'npcMembership')||hasCredential(c,'proActive')))throw new Error('この版では同年の団体登録を併用しません。団体間の移行手続きは未確認のため、次シーズンに別ルートの新規登録として扱います。資格の自動変換はありません。');
 if(kind==='proActive'&&!hasCredential(c,'proCard'))throw new Error('正式なプロカード取得記録が必要です');
 const cost={jbbfRegistration:8000,antiDopingCourse:3000,npcMembership:10000,proActive:25000,passport:16000,internationalCard:7000}[kind];
 const next=pay(c,cost),q=addCredential(c,kind,['npcMembership','proActive'].includes(kind)?'npc':'jbbf',year,kind==='passport'?yearEnd(year+9):yearEnd(year));
 return {...next,progress:{...c.progress,credentials:[...c.progress.credentials,q],choices:[...c.progress.choices,{id:q.id,day:c.athlete.day,kind:'registration',label:`${kind}を更新（ゲーム設定費用 ${cost}円）`}]}};
}
export function japanClassesCandidate(c:Career,year:number){return !!c.progress?.results.some(r=>r.category==='mensBodybuilding'&&r.ageClass==='senior'&&r.circuit==='jbbf'&&r.season>=year-5&&r.season<=year&&((r.series==='japan'&&r.classRank<=12)||(['tokyo','japanClasses'].includes(r.series)&&r.classRank<=6)));}
export function japanCandidate(c:Career,year:number){return !!c.progress?.results.some(r=>r.category==='mensBodybuilding'&&r.ageClass==='senior'&&r.circuit==='jbbf'&&((r.season===year&&['tokyo','japanClasses'].includes(r.series)&&r.classRank<=6)||(r.season>=year-5&&r.season<=year&&((r.series==='japan'&&r.classRank<=12)||(r.series==='japanClasses'&&r.classRank===1)))));}
export function worldCandidate(c:Career,year:number){return !!c.progress?.results.some(r=>r.category==='mensBodybuilding'&&r.ageClass==='senior'&&r.circuit==='jbbf'&&r.season===year&&((r.series==='japan'&&r.classRank<=3)||(r.series==='japanClasses'&&r.classRank===1)));}
export function hasOlympiaQualification(c:Career,year:number){
 const p=c.progress;if(!p)return false;const begin=dateDay(year-1,8,31),end=dateDay(year,9,12);
 return p.results.some(r=>r.category==='mensBodybuilding'&&r.ageClass==='senior'&&r.classId==='Open'&&r.circuit==='npc'&&((r.series==='newYorkPro'&&r.classRank===1&&r.day>=begin&&r.day<=end)||(r.series==='olympia'&&r.season===year-1&&r.classRank<=3)||(r.series==='olympia'&&r.classRank===1&&r.season>=year-5)))||hasCredential(c,`olympiaInvitation:${year}`);
}
export function requestOlympiaInvitation(c:Career,year:number):Career{
 const p=c.progress;if(!p||c.athlete.status!=='active')throw new Error('現役選手の競技キャリアが必要です');
 if(!p.results.some(r=>r.series==='olympia'&&r.circuit==='npc'&&r.category==='mensBodybuilding'&&r.ageClass==='senior'&&r.classId==='Open'&&r.classRank===1))throw new Error('男子Open Olympia歴代優勝者の記録が必要です');
 if(!hasCredential(c,'proActive'))throw new Error('当年のActive登録を更新してください');
 if(hasCredential(c,`olympiaInvitation:${year}`))return c;
 if(scoreBody(c.athlete.body,p.posing).total<70)throw new Error('ゲーム内の特別出場審査：現在の状態では承認されませんでした');
 const q=addCredential(c,`olympiaInvitation:${year}`,'npc',year,edition('olympia',year).showDay);
 return {...c,progress:{...p,credentials:[...p.credentials,q],choices:[...p.choices,{id:q.id,day:c.athlete.day,kind:'approval',label:'歴代Olympia優勝者のPro League承認（5年超の公式裁量を補うゲーム選考）'}]}};
}
export function eligibility(c:Career,e:Edition,ignoreApproval=false):Eligibility{
 const met:string[]=[],missing:string[]=[],expires:string[]=[],basis:string[]=[];
 const require=(ok:boolean,label:string)=>{(ok?met:missing).push(label);};
 require(c.athlete.status==='active','現役選手');require(!!c.progress,'競技キャリアの有効化');require(e.season===seasonOf(c.athlete.day),'申込対象シーズン内');
 if(!c.progress)return{allowed:false,met,missing,expires,basis,gameSupplement:e.ruleStatus==='gameSupplement'};
 require(c.progress.rulesVersion===e.rulesVersion,'保存した規則版との一致');require(c.athlete.day<e.deadlineDay,'申込締切前');
 if(e.circuit==='jbbf'){
  require(hasCredential(c,'jbbfRegistration'),'当年のJBBF登録');require(hasCredential(c,'antiDopingCourse'),'当年のアンチドーピング講習');
  basis.push('日本国籍・東京居住の架空の成人男子選手として生成。登録と講習は別の年度資格。');
  if(e.series==='tokyo')basis.push('東京都居住・所属の確認をゲーム内要項で補完。2026個別要項未取得。');
  if(e.series==='japanClasses')require(japanClassesCandidate(c,e.season),'日本クラス別の対象期間内の出場資格成績');
  if(e.series==='japan')require(japanCandidate(c,e.season),'日本男子の当年/過去5年の資格成績');
  if(e.series==='ifbbWorld'){
   require(worldCandidate(c,e.season),'国内の派遣候補成績（ゲーム上の候補選考）');require(hasCredential(c,'passport'),'有効な旅券');require(hasCredential(c,'internationalCard'),'当年のIFBB International Card');
   require(hasCredential(c,`dispatch:${e.id}`),'国内連盟の正式派遣承認');
  }
  if(!ignoreApproval)require(hasCredential(c,`approval:${e.id}`),'当該大会の正式出場承認');
 }else if(['regional','amateurOlympia'].includes(e.series)){
  require(hasCredential(c,'npcMembership'),'当年NPC Worldwide会員資格');
  require(!hasCredential(c,'proActive'),'Professional League Active登録前のアマチュア区分');
  if(e.series==='amateurOlympia')require(c.progress.results.some(r=>r.series==='regional'&&r.circuit==='npc'&&r.category==='mensBodybuilding'&&r.ageClass==='senior'&&r.season===e.season&&r.day<=c.athlete.day&&r.day<e.showDay),'同年のOpen Regional参加実績（優勝不要）');
 }else{
  require(hasCredential(c,'proCard'),'男子Bodybuildingプロカード');require(hasCredential(c,'proActive'),'当年Professional League Active登録');
  if(e.series==='olympia')require(hasOlympiaQualification(c,e.season),'対象期間の男子Open Olympia資格');
  if(!ignoreApproval)require(hasCredential(c,`approval:${e.id}`),'当該プロ大会の契約受理');
 }
 for(const q of c.progress.credentials.filter(q=>q.expiresDay>=c.athlete.day))expires.push(`${q.kind}：${isoDay(q.expiresDay)}まで`);
 return{allowed:missing.length===0,met,missing,expires,basis,gameSupplement:e.ruleStatus==='gameSupplement'};
}
export function scoreBody(body:BodyState,posing:number,asymmetry=0):Score{
 const mass=clamp((muscleMass(body)/(body.height/100)**2-6)/10*100,0,100);
 const ratios=PARTS.map((p,i)=>body.muscle[p]/[.035,.07,.025,.025,.025,.09,.06,.035,.04,.06,.04,.17,.08,.13,.065,.05][i]);
 const mean=ratios.reduce((a,b)=>a+b,0)/ratios.length,cv=Math.sqrt(ratios.reduce((sum,v)=>sum+(v-mean)**2,0)/ratios.length)/mean;
 const balance=clamp(100-cv*140,0,100),symmetry=clamp(100-asymmetry*250,0,100),fat=fatPercent(body);
 const condition=clamp(100-Math.abs(fat-6)*7,0,100)*(1-PARTS.reduce((s,p)=>s+body.fatigue[p],0)/16*.12);
 const pose=clamp(posing,0,1)*100,total=mass*.40+balance*.16+symmetry*.06+condition*.23+pose*.15;
 return{mass,balance,symmetry,condition,posing:pose,total};
}
export function requestApproval(c:Career,e:Edition,kind:'dispatch'|'entry'='entry'):Career{
 const p=c.progress;if(!p)throw new Error('競技キャリアが必要です');const id=kind==='dispatch'?`dispatch:${e.id}`:`approval:${e.id}`;
 if(hasCredential(c,id))return c;
 if(kind==='dispatch'){
  if(e.series!=='ifbbWorld'||!worldCandidate(c,e.season)||!hasCredential(c,'jbbfRegistration')||!hasCredential(c,'antiDopingCourse')||!hasCredential(c,'passport')||!hasCredential(c,'internationalCard'))throw new Error('派遣候補成績、登録・講習・旅券・国際カードを確認してください');
  if(scoreBody(c.athlete.body,p.posing).total<64)throw new Error('ゲーム内選考：今回の派遣水準に届きませんでした。身体とポージングを改善して再申請できます。');
 }else{
  const requirements=eligibility(c,e,true);if(!requirements.allowed)throw new Error(requirements.missing.join('、'));
 }
 const q=addCredential(c,id,e.circuit,e.season,e.showDay);return {...c,progress:{...p,credentials:[...p.credentials,q],choices:[...p.choices,{id:q.id,day:c.athlete.day,kind:'approval',label:`${e.name} ${kind==='dispatch'?'国内派遣承認':'出場申請受理'}（公式の裁量を再現するゲーム処理）`}]}};
}
export function enter(c:Career,e:Edition):Career{
 const p=c.progress;if(!p)throw new Error('競技キャリアが必要です');if(p.entries.some(x=>x.editionId===e.id))throw new Error('この開催には申込済みです');
 const q=eligibility(c,e);if(!q.allowed)throw new Error(q.missing.join('、'));
 const next=pay(c,e.fee),entry:Entry={id:`entry-${e.id}`,series:e.series,season:e.season,editionId:e.id,showDay:e.showDay,deadlineDay:e.deadlineDay,travelDay:e.travelDay,status:'entered',classId:null,entryFee:e.fee,travelFee:e.travel,travelPaid:false,approval:`approval:${e.id}`,rulesVersion:p.rulesVersion};
 return {...next,progress:{...p,entries:[...p.entries,entry],decision:p.decision?.kind==='entryDeadline'?null:p.decision,seen:[...p.seen,`deadline-${e.id}`],choices:[...p.choices,{id:entry.id,day:c.athlete.day,kind:'entry',label:`${e.name}へ申込（${e.fee}円）`}]},pendingEvent:p.decision?.kind==='entryDeadline'?null:c.pendingEvent};
}
export function travel(c:Career,entryId:string):Career{
 const p=c.progress,entry=p?.entries.find(e=>e.id===entryId);if(!p||!entry||entry.status!=='entered')throw new Error('出場予定がありません');if(c.athlete.day<entry.travelDay)throw new Error('まだ移動日ではありません');if(c.athlete.day>entry.showDay)throw new Error('大会は終了しています');
 const next=pay(c,entry.travelFee);return {...next,pendingEvent:null,progress:{...p,entries:p.entries.map(e=>e.id===entryId?{...e,status:'travelled' as const,travelPaid:true}:e),decision:null}};
}
export function withdraw(c:Career,entryId:string):Career{if(!c.progress)return c;return {...c,pendingEvent:null,progress:{...c.progress,decision:null,entries:c.progress.entries.map(e=>e.id===entryId&&e.status!=='completed'?{...e,status:'withdrawn' as const}:e)}};}
export function checkIn(c:Career,entryId:string):Career{
 const p=c.progress,entry=p?.entries.find(e=>e.id===entryId);if(!p||!entry||entry.status!=='travelled'||c.athlete.day!==entry.showDay)throw new Error('大会当日に移動済みである必要があります');
 const e=edition(entry.series,entry.season),classId=classFor(e,weight(c.athlete.body));
 return {...c,progress:{...p,entries:p.entries.map(x=>x.id===entryId?{...x,status:'checkedIn' as const,classId,checkInWeight:weight(c.athlete.body)}:x)}};
}
function contestField(c:Career,e:Edition):Rival[]{
 const tier={tokyo:0,japanClasses:1,japan:2,ifbbWorld:3,regional:0,amateurOlympia:1,newYorkPro:3,olympia:3}[e.series];
 const pool=c.progress!.rivals.filter(r=>r.circuit===e.circuit&&!r.retired);
 const groups=new Map<string,Rival[]>();for(const r of pool){const key=classFor(e,weight(r.body));groups.set(key,[...(groups.get(key)??[]),r]);}
 return [...groups.values()].flatMap(rs=>rs.sort((a,b)=>Math.abs(a.tier-tier)-Math.abs(b.tier-tier)||a.id.localeCompare(b.id)).slice(0,e.classes.length===1?20:6));
}
export function proCardCount(categoryCount:number){return categoryCount>=10?3:categoryCount>=8?2:categoryCount>=5?1:0;}
export function runCompetition(c:Career,entryId:string):Career{
 let p=c.progress;const entry=p?.entries.find(x=>x.id===entryId);
 if(!p||!entry||entry.status!=='checkedIn'||c.athlete.day!==entry.showDay)throw new Error('当日の計量・チェックインを完了してください');
 if(p.results.some(r=>r.entryId===entryId))return c;
 p=updateRivals(p,entry.season);const prepared={...c,progress:p},e=edition(entry.series,entry.season),field=contestField(prepared,e);
 const playerScore=scoreBody(c.athlete.body,p.posing,PARTS.reduce((s,k)=>s+p!.asymmetry[k],0)/16);
 const people=[{id:c.athlete.id,name:c.athlete.name,body:structuredClone(c.athlete.body),posing:p.posing,score:playerScore},...field.map(r=>({id:r.id,name:r.name,body:r.body,posing:r.posing,score:scoreBody(r.body,r.posing)}))];
 const categoryCount=people.length,classId=classFor(e,entry.checkInWeight??weight(c.athlete.body),categoryCount);
 const classPeople=people.filter(r=>classFor(e,r.id===c.athlete.id?(entry.checkInWeight??weight(r.body)):weight(r.body),categoryCount)===classId);
 if(classPeople.length<3)throw new Error('比較審査の参加者が不足しています。記録は確定していません。');
 const isPro=['newYorkPro','olympia'].includes(e.series);
 // Physics/posing scores are game coefficients; round weights follow the selected category.
 const prejudge=(person:typeof people[number])=>person.score.total;
 const finals=(person:typeof people[number])=>person.score.total*.8+person.score.posing*.2;
 const judgeOrder=[...classPeople].sort((a,b)=>prejudge(b)-prejudge(a)||a.id.localeCompare(b.id));
 const finalists=judgeOrder.slice(0,e.series==='japan'?12:e.circuit==='jbbf'?6:classPeople.length);
 const finalOrder=[...finalists].sort((a,b)=>finals(b)-finals(a)||a.id.localeCompare(b.id));
 const freeOrder=[...finalists].sort((a,b)=>(b.score.posing*.7+b.score.balance*.3)-(a.score.posing*.7+a.score.balance*.3)||a.id.localeCompare(b.id));
 const points=(person:typeof people[number])=>{const pre=judgeOrder.findIndex(x=>x.id===person.id)+1,fin=finalOrder.findIndex(x=>x.id===person.id)+1,free=freeOrder.findIndex(x=>x.id===person.id)+1;
  if(!fin)return 1000+pre;return isPro?pre*.5+fin*.5:e.series==='ifbbWorld'?fin:e.series==='japanClasses'?fin*2+free:e.circuit==='jbbf'?pre+fin:pre;};
 const ordered=[...classPeople].sort((a,b)=>points(a)-points(b)||(e.series==='japanClasses'?freeOrder.findIndex(x=>x.id===a.id)-freeOrder.findIndex(x=>x.id===b.id):finalOrder.findIndex(x=>x.id===a.id)-finalOrder.findIndex(x=>x.id===b.id))||prejudge(b)-prejudge(a));
 const rank=ordered.findIndex(x=>x.id===c.athlete.id)+1;
 const winners=new Map<string,typeof people[number]>();for(const person of people){const key=classFor(e,weight(person.body),categoryCount),current=winners.get(key);if(key===classId){winners.set(key,ordered[0]);continue;}if(!current||person.score.total>current.score.total)winners.set(key,person);}
 const overall=[...winners.values()].sort((a,b)=>b.score.total-a.score.total),overallIndex=overall.findIndex(r=>r.id===c.athlete.id),overallRank=overallIndex<0?null:overallIndex+1;
 const notes=[...e.notes,`審査指標の係数：筋量40%・バランス16%・対称性6%・仕上がり23%・ポージング15%（ゲーム仮定）。`];
 if(isPro)notes.push('男子Open ProはJudging 50%＋Finals 50%。この版では各ラウンドの架空の比較順位を合算。');
 else if(e.series==='ifbbWorld')notes.push('シニア男子の予選から決勝を分離。決勝進出者の予選順位は最終比較へ持ち越さない。');
 else if(e.circuit==='jbbf')notes.push(`JBBF参照：日本男子は予選＋決勝、日本クラス別は予選破棄・決勝規定×2＋フリー。日本男子決勝12人、日本クラス別6人。指標点はゲーム独自。`);
 else notes.push('NPCアマ：Judgingを順位へ使用。フリー演技は審査点を追加するものと扱わない。');
 const result:Result={id:`result-${entryId}`,entryId,editionId:e.id,series:e.series,circuit:e.circuit,season:e.season,day:c.athlete.day,category:'mensBodybuilding',ageClass:'senior',classId,classRank:rank,classCount:classPeople.length,overallRank,overallCount:overall.length,categoryCount,score:playerScore,body:structuredClone(c.athlete.body),posing:p.posing,appearance:{...c.athlete.appearance},podium:ordered.slice(0,3).map((r,i)=>({...r,rank:i+1})),rivalResults:ordered.filter(r=>r.id!==c.athlete.id).map((r,i)=>({id:r.id,name:r.name,rank:ordered.findIndex(x=>x.id===r.id)+1,score:r.score.total})),rounds:[{name:'比較審査',weight:isPro?.5:e.series==='ifbbWorld'?0:1,rank:judgeOrder.findIndex(x=>x.id===c.athlete.id)+1,count:classPeople.length},...(finalists.some(r=>r.id===c.athlete.id)?[{name:'決勝',weight:isPro?.5:e.series==='ifbbWorld'?1:0,rank:finalOrder.findIndex(x=>x.id===c.athlete.id)+1,count:finalists.length}]:[])],notes,rulesVersion:p.rulesVersion};
 if(e.series==='japanClasses')result.rounds=[{name:'予選（決勝に持ち越さない）',weight:0,rank:judgeOrder.findIndex(x=>x.id===c.athlete.id)+1,count:classPeople.length},...(finalists.some(r=>r.id===c.athlete.id)?[{name:'決勝規定',weight:2/3,rank:finalOrder.findIndex(x=>x.id===c.athlete.id)+1,count:finalists.length},{name:'決勝フリー',weight:1/3,rank:freeOrder.findIndex(x=>x.id===c.athlete.id)+1,count:finalists.length}]:[])];
 else if(e.circuit==='jbbf'&&e.series!=='ifbbWorld')result.rounds=result.rounds.map(r=>({...r,weight:.5}));
 const credentials=[...p.credentials],titles=[...p.titles];
 if(e.series==='regional')credentials.push(addCredential(c,'openRegionalParticipation','npc',e.season,yearEnd(e.season),result.id));
 if(e.series==='amateurOlympia'&&rank===1&&overallRank!==null&&overallRank<=proCardCount(categoryCount)){
  credentials.push(addCredential(c,'proCard','npc',e.season,200000,result.id));notes.push('部門人数とオーバーオール順位の条件を満たし、男子Bodybuildingプロカードを獲得。正式Active登録は別手続き。');
 }
 if(e.series==='ifbbWorld'&&rank===1){titles.push({id:`title-${result.id}-${classId}`,resultId:result.id,series:e.series,editionId:e.id,category:'mensBodybuilding',ageClass:'senior',classId,kind:'worldClass',day:c.athlete.day,rulesVersion:p.rulesVersion});if(overallRank===1)titles.push({id:`overall-${result.id}`,resultId:result.id,series:e.series,editionId:e.id,category:'mensBodybuilding',ageClass:'senior',classId:'Overall',kind:'worldOverall',day:c.athlete.day,rulesVersion:p.rulesVersion});}
 if(e.series==='olympia'&&rank===1)titles.push({id:`title-${result.id}`,resultId:result.id,series:e.series,editionId:e.id,category:'mensBodybuilding',ageClass:'senior',classId:'Open',kind:'olympiaOpen',day:c.athlete.day,rulesVersion:p.rulesVersion});
 const rivalRanks=new Map(ordered.map((r,i)=>[r.id,i+1]));const rivals=p.rivals.map(r=>rivalRanks.has(r.id)?{...r,history:[...r.history,{season:e.season,series:e.series,rank:rivalRanks.get(r.id)!}]}:r);
 return {...c,athlete:{...c.athlete,systemicFatigue:clamp(c.athlete.systemicFatigue+.2,0,1)},pendingEvent:`${e.name}の結果を保存しました。大会後の回復計画を確認してください。`,snapshots:[...c.snapshots.filter(s=>s.day!==c.athlete.day),{day:c.athlete.day,body:structuredClone(c.athlete.body)}],progress:{...p,entries:p.entries.map(x=>x.id===entryId?{...x,status:'completed' as const}:x),results:[...p.results,result],titles,credentials,rivals,decision:null,recoveryUntil:c.athlete.day+21,seen:[...p.seen,`completed-${entryId}`]}};
}
export function acknowledgeDecision(c:Career):Career{
 const p=c.progress;if(!p?.decision)return {...c,pendingEvent:null};
 if(['travel','show'].includes(p.decision.kind))throw new Error('大会画面で移動・出場、または欠場を選んでください');
 return {...c,pendingEvent:null,progress:{...p,seen:[...p.seen,p.decision.id],decision:null}};
}
export function retire(c:Career,reason:'immediate'|'finalSeason'='immediate'):Career{
 const p=c.progress;if(!p)throw new Error('競技キャリアが必要です');if(p.retirement)return c;
 const years=c.athlete.day/365.2425,change=muscleMass(c.athlete.body)-muscleMass(c.initial.body);
 const bestResults=(Object.keys(SERIES_NAMES) as Series[]).flatMap(series=>{const results=p.results.filter(r=>r.series===series).sort((a,b)=>a.classRank-b.classRank||a.day-b.day);return results[0]?[{series,rank:results[0].classRank,season:results[0].season}]:[];});
 const world=p.titles.filter(t=>t.kind==='worldClass'||t.kind==='olympiaOpen');
 const text=[`${c.athlete.name}は、${c.athlete.profileTitle}として競技人生を始めました。`,`${years.toFixed(1)}年間、${p.trainingDays}日の練習を記録。筋質量は${change>=0?'+':''}${change.toFixed(2)}kg変化しました。`,p.results.length?`${p.results.length}大会に出場し、身体と技術をステージで確かめました。`:'大会には出場せず、生活と身体づくりに向き合ったキャリアでした。',world.length?`世界タイトル${world.length}件を獲得。その記録は引退後も残ります。`:'世界タイトルには届きませんでした。出場・入賞・身体の変化の記録は、この選手自身の実績として残ります。',...p.choices.filter(x=>x.kind==='work').slice(-2).map(x=>`生活の選択：${x.label}。`)];
 return {...c,athlete:{...c.athlete,status:'retired'},pendingEvent:null,progress:{...p,decision:null,entries:p.entries.map(e=>['entered','travelled','checkedIn'].includes(e.status)?{...e,status:'withdrawn' as const}:e),retirement:{day:c.athlete.day,reason,years,trainingDays:p.trainingDays,muscleChange:change,bestResults,titleIds:p.titles.map(t=>t.id),text,finalBody:structuredClone(c.athlete.body)}}};
}
export function lifecycleBeforeDay(c:Career):Career{
 const p=c.progress;if(!p||c.athlete.status==='retired')return c;
 if(p.finalSeason!==null&&c.athlete.day>yearEnd(p.finalSeason))return retire(c,'finalSeason');
 if(p.decision)return {...c,pendingEvent:p.decision.text};
 const year=seasonOf(c.athlete.day);let next={...c,progress:updateRivals(p,year)};
 for(const entry of next.progress.entries){
  if(entry.status==='entered'&&c.athlete.day>=entry.travelDay){const text=`${SERIES_NAMES[entry.series]}の移動日です。渡航・移動費を確認し、移動または欠場を選んでください。`;return {...next,pendingEvent:text,progress:{...next.progress,decision:{id:`travel-${entry.id}`,kind:'travel',entryId:entry.id,text}}};}
  if(['travelled','checkedIn'].includes(entry.status)&&c.athlete.day>=entry.showDay){const text=`${SERIES_NAMES[entry.series]}の当日です。計量・チェックインとステージ審査へ進んでください。`;return {...next,pendingEvent:text,progress:{...next.progress,decision:{id:`show-${entry.id}`,kind:'show',entryId:entry.id,text}}};}
 }
 if(p.goal){const target=edition(p.goal,year),id=`deadline-${target.id}`;if(c.athlete.day>=target.deadlineDay-2&&c.athlete.day<target.deadlineDay&&!next.progress.seen.includes(id)&&!p.entries.some(e=>e.editionId===target.id)){const text=`目標の${target.name}は申込締切が近づいています。申込か、今季の見送りを選んでください。`;return {...next,pendingEvent:text,progress:{...next.progress,decision:{id,kind:'entryDeadline',series:p.goal,text}}};}}
 return next;
}
export function lifecycleAfterDay(c:Career,trainingCompleted:boolean):Career{
 const p=c.progress;if(!p)return c;
 const posing=clamp(p.posing+(p.posingMinutes/60)*.0017*(1-p.posing)*(p.coach?1.15:1),0,1);
 const localPeak=Math.max(...PARTS.map(k=>c.athlete.body.fatigue[k]));
 if(localPeak>.92&&c.athlete.day>=p.injuryUntil){let rng,r;[rng,r]=randomState(p.eventRng);if(r>.8)return {...c,pendingEvent:'局所の違和感が増えました。7日間は練習を休み、回復と計画を確認してください。',progress:{...p,posing,trainingDays:p.trainingDays+(trainingCompleted?1:0),injuryUntil:c.athlete.day+7,eventRng:rng,seen:[...p.seen,`discomfort-${c.athlete.day}`]}};return {...c,progress:{...p,posing,trainingDays:p.trainingDays+(trainingCompleted?1:0),eventRng:rng}};}
 return {...c,progress:{...p,posing,trainingDays:p.trainingDays+(trainingCompleted?1:0)}};
}
