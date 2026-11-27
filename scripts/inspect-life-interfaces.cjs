// Observe only resources delivered to the browser. Store measurements and selector matches.
const {chromium}=require("playwright"),fs=require("node:fs");
const folder="docs/qa/athlete-screen";fs.mkdirSync(folder,{recursive:true});
const sites=[["https://1in8b.life/ja/","#scene,.panel.p-scene"],["https://nakata-ataru.com/konotochi/play/",".page,.pagebody,#choicearea .choice"],["https://parallel-life-phi.vercel.app/",".choice-label,.choice-hint"]];
(async()=>{const b=await chromium.launch({channel:"chrome"});try{await Promise.all(sites.map(async([url,selector],k)=>{
 if(process.argv[2]!==undefined && k!==Number(process.argv[2]))return;
 const p=await b.newPage({viewport:{width:390,height:844},ignoreHTTPSErrors:true}),sources=[],layout=[],actions=[];
 const tokens=["getContext","canvas","pagebody","addEventListener","p-scene","pixelated","choicearea","pagebody","choice-label","choice-hint","safe-area-inset-bottom","prefers-reduced-motion","localStorage"];
 p.on("response",async r=>{try{const type=r.request().resourceType();if(!["document","stylesheet","script"].includes(type)||new URL(r.url()).origin!==new URL(url).origin)return;let body=await r.text();const matches=tokens.filter(t=>body.includes(t));if(matches.length)sources.push({url:r.url(),type,matches});}catch{}});
 await p.goto(url,{waitUntil:"domcontentloaded"});let started=false,choice=false,detail=false,detailClosed=false,after=0,resultChanged=false,choiceText="", detailButton="";
 for(let i=0;i<180;i++){
 await p.waitForTimeout(900);
 const buttons=p.locator("button:visible:not([disabled])"),labels=(await buttons.allTextContents()).map(s=>s.trim());
 if(!started){let j=labels.findIndex(x=>[x==="生まれる",x==="はじめる",x.includes("だれかの人生を生きる")][k]);if(j>=0){await buttons.nth(j).evaluate(b=>b.click());actions.push(labels[j]);started=true;}continue;}
 const born=p.getByText(/タップして.*出生/).last();if(k===1&&await born.isVisible()){await born.click();continue;}
 if(k===2 && !detail){const toggle=p.locator('button[aria-controls="breakdown"]');if(await toggle.isVisible() && await toggle.evaluate(el=>!el.closest("[inert]"))){await toggle.click({timeout:1500}).then(async()=>{detail=await p.locator("#breakdown").isVisible();await toggle.click({timeout:1500});detailClosed=await p.locator("#breakdown").isHidden();actions.push("資金内訳の開閉");}).catch(()=>{});}}
 const find=re=>labels.findIndex(x=>re.test(x));
 const choiceIndex=k===0?find(/^[1-4][^×\d]/):k===1?labels.findIndex(x=>/育休|仕事はいつも通り|残業の少ない|預ける|保育園|子どもと|家で育てる/.test(x)):await buttons.evaluateAll(bs=>bs.findIndex(b=>b.matches(".choice-btn,.choice")||b.querySelector(".choice-label,.choice-hint")));
 if(choiceIndex>=0&&!choice){choiceText=await p.locator("body").innerText();for(const width of [390,1280]){await p.setViewportSize({width,height:844});layout.push(await p.locator(selector).evaluateAll(nodes=>({width:innerWidth,sceneCanvas:!!document.querySelector("#scene canvas, canvas#scene"),items:nodes.slice(0,8).map(el=>{let c=getComputedStyle(el),r=el.getBoundingClientRect();return {tag:el.tagName,classes:el.className,w:Math.round(r.width),h:Math.round(r.height),font:c.fontSize,line:c.lineHeight,overflow:c.overflowY,position:c.position};})})));}await p.setViewportSize({width:390,height:844});actions.push(labels[choiceIndex]);await buttons.nth(choiceIndex).evaluate(b=>b.click());choice=true;continue;}
 if(choice){resultChanged=choiceText!==await p.locator("body").innerText();if(detail && detailClosed || ++after>12)break;if(!detail){const j=k===0?find(/以前の記録をもっと見る|^母 |^父 |家族|暮らし|人生の記録|人生の歩み|ステータス|プロフィール/):k===1?find(/あなた（|あなた\(/):find(/タップで内訳/);if(j>=0){await buttons.nth(j).evaluate(b=>b.click());actions.push(labels[j]);detailButton=labels[j];detail=true;}}else{if(k===2){const toggle=p.locator('button[aria-controls="breakdown"]');if(await toggle.getAttribute("aria-expanded")==="true"){await toggle.click({timeout:1000}).catch(()=>{});detailClosed=(await toggle.getAttribute("aria-expanded"))==="false" && await p.locator("#breakdown").isHidden();if(detailClosed)break;}}let j=find(/^とじる$|^閉じる$|^もどる$|^戻る$/);if(j>=0){await buttons.nth(j).evaluate(b=>b.click());actions.push(labels[j]);detailClosed=true;break;}const toggle=labels.indexOf(detailButton);if(toggle>=0){await buttons.nth(toggle).evaluate(b=>b.click());actions.push(detailButton);detailClosed=true;break;}await p.keyboard.press("Escape");}continue;}
 const j=[find(/人生を始める|次の決断まで/),find(/子育てを始める|早送り|次へ|育児を始|進む/),find(/^生まれる$|結果まで飛ばす|この人生を生きる|^8×$/)][k];
 if(j>=0){if(actions.at(-1)!==labels[j])actions.push(labels[j]);await buttons.nth(j).evaluate(b=>b.click());}
 }
 fs.writeFileSync(folder+"/reference-"+k+".json",JSON.stringify({url,choice,detail,detailClosed,resultChanged,actions,sources,layout},null,2));await p.close();
}));}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
