import {useState,useRef,useEffect} from 'react';
import type {Career} from '../core/model';
import {nutritionPlan} from '../core/nutrition';
import {sessionMinutes,exerciseById} from '../core/exercises';
import {FOCUS_LABELS} from '../core/content';
import {GOALS,PRIORITIES,FOOD_STYLES,EFFORT,guideFor,proposeCoach,adoptCoach,coachReview,decideReview,weeklyCoach,type CoachProposal} from '../core/coach';
import type {CoachingGuide,CoachGoal,CoachSection} from '../core/coachTypes';
import {ModalSheet} from './ModalSheet';
const sections:CoachSection[]=['training','food','rest'];
const sectionName={training:'練習',food:'食事',rest:'休養'};
export function CoachSetup({c,onChange}:{c:Career;onChange:(c:Career)=>void}){
  const g=guideFor(c),p=proposeCoach(c);
  const set=(patch:Partial<CoachingGuide>)=>onChange({...c,coachingGuide:{...g,...patch}});
  return <div className="coach-setup"><h3>どんな身体を目指す？</h3><div className="coach-goals">{(Object.keys(GOALS) as CoachGoal[]).map(goal=><button type="button" key={goal} className={g.goal===goal?'selected':''} aria-pressed={g.goal===goal} onClick={()=>set({goal})}>{GOALS[goal]}</button>)}</div>
    <div className="coach-life"><label>練習に使える時間<select value={g.minutes} onChange={e=>set({minutes:Number(e.target.value)})}>{[15,30,45,60,90].map(n=><option key={n} value={n}>{n}分まで</option>)}</select></label><label>1日の食費の上限<select value={g.budget} onChange={e=>set({budget:Number(e.target.value)})}>{[300,500,850,1200,1800].map(n=><option key={n} value={n}>{n.toLocaleString()}円</option>)}</select></label></div>
    <p className="coach-start-summary">最初の案：{FOCUS_LABELS[p.training.focus]} {Math.round(p.minutes)}分 / 食費 {p.food.cost}円 / 睡眠 {p.sleep}時間</p><p className="coach-small">{p.reason} 食事や練習は始めてからも相談できます。</p>
  </div>;
}
export function CoachToday({c,busy,onConsult}:{c:Career;busy:boolean;onConsult:()=>void}){
  const day=c.plan.days[c.athlete.day%7],g=c.coachingGuide;
  const headline=day.focus==='rest'?'今日は身体を休める日':`今日は${FOCUS_LABELS[day.focus]}を育てよう`;
  const reason=!g?'目標と生活条件から、具体的な計画を相談できます。':g.ownership.training==='manual'?'自分で決めた練習を実行します。コーチは上書きしません。':day.focus==='rest'?'筋力練習を休み、食事と睡眠を確保する計画です。':proposeCoach(c).reason;
  return <div className="coach-today"><div><span>{g?'採用済みの計画':'今の計画'}</span><h2>{headline}</h2><p>{reason}</p></div><button disabled={busy||c.athlete.status==='retired'} onClick={onConsult}>相談・変更</button></div>;
}
export function CoachConsult({c,initialSection,busy,onClose,onAdopt,onDetailed}:{c:Career;initialSection?:CoachSection;busy:boolean;onClose:()=>void;onAdopt:(c:Career)=>void;onDetailed:(section:CoachSection)=>void}){
  const [g,setG]=useState(()=>guideFor(c));
  const [forceRest,setForceRest]=useState(false);
  const [chosen,setChosen]=useState<CoachSection[]>(()=>initialSection?[initialSection]:c.coachingGuide?sections.filter(s=>c.coachingGuide!.ownership[s]==='coach'):[...sections]);
  const meals=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{if(initialSection==='food'){const frame=requestAnimationFrame(()=>meals.current?.scrollIntoView({block:'start'}));return ()=>cancelAnimationFrame(frame);}},[initialSection]);
  const p=proposeCoach(c,g,forceRest),current=nutritionPlan(c),today=c.plan.days[c.athlete.day%7];
  const pick=(patch:Partial<CoachingGuide>,section:CoachSection)=>{setG({...g,...patch});setChosen(a=>a.includes(section)?a:[...a,section]);};
  const existingMinutes=today.focus==='rest'?0:today.exercises?sessionMinutes(today.exercises):(0.3+today.sets*.18)*60;
  return <ModalSheet title="コーチに相談" onClose={onClose} busy={busy} actions={<><p>チェックした項目だけを採用して保存します。手動の項目も選び直せます。</p><button className="primary" disabled={busy||!chosen.length} onClick={()=>onAdopt(adoptCoach(c,p,chosen))}>この提案を採用</button></>}>
    <div className="coach-consult"><p>目標と生活の優先順位を決めると、具体的な内容を組みます。まだ今の計画は変わっていません。</p>
      <div className="coach-shortcuts"><button aria-pressed={g.minutes===30} onClick={()=>pick({minutes:30},'training')}>今日は30分しかない</button><button aria-pressed={g.effort==='light'} onClick={()=>{pick({effort:'light'},'training');setForceRest(false);}}>疲れている・軽めに</button><button aria-pressed={forceRest} onClick={()=>{setForceRest(!forceRest);setChosen(a=>a.includes('training')?a:[...a,'training']);}}>今日は休養にする</button><button aria-pressed={g.foodStyle==='budget'} onClick={()=>pick({foodStyle:'budget',budget:Math.min(g.budget,500)},'food')}>食費を抑えたい</button></div>
      <div className="coach-life"><label>目標<select value={g.goal} onChange={e=>setG({...g,goal:e.target.value as CoachingGuide['goal']})}>{Object.entries(GOALS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>練習時間<select value={g.minutes} onChange={e=>pick({minutes:Number(e.target.value)},'training')}>{[15,30,45,60,90].map(n=><option key={n} value={n}>{n}分まで</option>)}</select></label><label>伸ばしたい部位<select value={g.priority} onChange={e=>pick({priority:e.target.value as CoachingGuide['priority']},'training')}>{Object.entries(PRIORITIES).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>練習の負担<select value={g.effort} onChange={e=>pick({effort:e.target.value as CoachingGuide['effort']},'training')}>{Object.entries(EFFORT).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>食費の上限<select value={g.budget} onChange={e=>pick({budget:Number(e.target.value)},'food')}>{[300,500,850,1200,1800].map(n=><option key={n} value={n}>{n}円 / 日</option>)}</select></label></div>
      <h3 ref={meals}>食事のプラン</h3><div className="coach-meal-choices">{Object.entries(FOOD_STYLES).map(([style,label])=>{const option=proposeCoach(c,{...g,foodStyle:style as CoachingGuide['foodStyle']},forceRest);return <button key={style} aria-pressed={g.foodStyle===style} className={g.foodStyle===style?'selected':''} onClick={()=>pick({foodStyle:style as CoachingGuide['foodStyle']},'food')}><b>{label}</b><span>{option.food.cost}円 / 準備{Math.round(option.food.prep*60)}分</span><small>たんぱく質目安の充足 {Math.round(option.food.coverage*100)}%</small></button>;})}</div>
      <section className="coach-proposal" aria-label="未採用の提案"><span className="proposal-label">まだ未採用の提案</span><h3>{FOCUS_LABELS[p.training.focus]} / {Math.round(p.minutes)}分・{p.training.focus==='rest'?'筋力練習なし':EFFORT[g.effort]}</h3><p>{p.reason}</p><p>{p.tradeoff}</p><p>負担の目安：{p.training.focus==='rest'?'筋力練習の負担を加えない日です。':g.effort==='light'?'余力を残し、標準より刺激と疲労を抑える設定です。':g.effort==='hard'?'余力を小さくし、負担を多く引き受ける設定です。':'余力を残しながら、刺激と回復を両立する設定です。'}</p><p>{p.food.reason}</p><p>睡眠目標 {p.sleep}時間。今夜の睡眠は翌日の回復に使われます。</p>
      <dl><div><dt>練習</dt><dd>{Math.round(existingMinutes)}分 → {Math.round(p.minutes)}分</dd></div><div><dt>食費</dt><dd>{Math.round(current.cost)}円 → {p.food.cost}円</dd></div><div><dt>準備</dt><dd>{Math.round(current.prep*60)}分 → {Math.round(p.food.prep*60)}分</dd></div></dl>
      <details><summary>種目と食事の数値・提案理由</summary><p>{p.training.exercises?.map(x=>`${exerciseById(x.exerciseId)?.name} ${x.sets}セット`).join(' / ')||'筋力練習を休む計画です。'}</p><p>食事 {p.food.calories}kcal / たんぱく質{p.food.protein}g。ゲーム内の消費は体重・練習・有酸素から計算し、目標に合わせて調整します。</p><p>食事は同じ食品データを使います。自炊は準備の手間、手軽な案はサービス費をゲーム内の費用・時間へ反映します。分類だけで栄養の良し悪しは決めません。</p><p>軽め＝余力5、標準＝余力3、しっかり＝余力2。詳細のRIRへ対応しています。</p></details>
      <fieldset><legend>採用する項目</legend>{sections.map(s=><label key={s}><input type="checkbox" checked={chosen.includes(s)} onChange={e=>setChosen(a=>e.target.checked?[...a.filter(x=>x!==s),s]:a.filter(x=>x!==s))}/>{sectionName[s]} <small>現在：{guideFor(c).ownership[s]==='coach'?'コーチに任せる':'手動設定'}</small></label>)}</fieldset>
      </section>
      <details><summary>自分で細かく設定したい</summary><p>保存した項目は手動になり、日々のおすすめでは上書きしません。途中でコーチへ戻せます。</p><div className="button-row">{sections.map(s=><button key={s} onClick={()=>onDetailed(s)}>{sectionName[s]}を詳しく設定</button>)}</div></details>
      <p className="coach-small">コーチ担当の練習は、日送り後に翌日の身体と疲労から更新します。手動の練習は保持します。週間まとめ実行は表示されている週間予定を使用し、途中で組み替えません。</p>
    </div>
  </ModalSheet>;
}
export function CoachReview({c,busy,onChange}:{c:Career;busy:boolean;onChange:(c:Career)=>void}){
  const review=coachReview(c);if(!review)return null;
  return <section className="paper coach-review"><h3>2週間の記録から、食事の見直し案</h3><p>{review.message}</p><p>今の食事は自動で変えません。</p><div className="button-row">{review.adjustment!==0&&<button className="primary" disabled={busy} onClick={()=>onChange(decideReview(c,true))}>提案を採用</button>}<button disabled={busy} onClick={()=>onChange(decideReview(c,false))}>今の計画を続ける</button></div></section>;
}
export function CoachWeek({c,onRecords}:{c:Career;onRecords:()=>void}){
  const w=weeklyCoach(c);if(!w)return null;
  return <section className="paper coach-week"><h3>直近1週間の振り返り</h3><p>練習 {w.days}日 / {w.sets}・予定{w.planned}セット。睡眠 平均{w.sleep.toFixed(1)}時間。</p><p>期間内の体重差 {w.delta>=0?'+':''}{w.delta.toFixed(2)}kg / 筋質量差 {w.muscle>=0?'+':''}{w.muscle.toFixed(3)}kg</p><p>{w.message}</p><button onClick={onRecords}>身体の推移と記録を見る</button></section>;
}
