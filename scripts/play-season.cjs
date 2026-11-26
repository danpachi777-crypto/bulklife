const {chromium}=require("playwright");
const assert=require("node:assert/strict"), fs=require("node:fs"), crypto=require("node:crypto");
const folder="docs/qa/season";fs.mkdirSync(folder,{recursive:true});
async function stored(page){return page.evaluate(()=>new Promise(resolve=>{const q=indexedDB.open("bulk-life-challenges-v1");q.onsuccess=()=>{const db=q.result,r=db.transaction("runs").objectStore("runs").getAll();r.onsuccess=()=>{db.close();resolve(r.result.sort((a,b)=>b.updatedAt-a.updatedAt)[0]);};};}));}
(async()=>{
const route=process.argv[2]||"domestic", seed=route==="training"?823:231, direct=route==="direct";
const browser=await chromium.launch({channel:"chrome",args:["--enable-unsafe-swiftshader"]});
const report={route,seed,turns:[],browser:browser.version(),widths:[]};const start=Date.now();
let p;
try{
p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});p.setDefaultTimeout(120000);
await p.addInitScript(seed=>{const f=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>a instanceof Uint32Array&&a.length===1?(a[0]=seed,a):f(a);},seed);
await p.goto(process.env.BULK_PREVIEW||"http://127.0.0.1:4191");const btn=name=>p.getByRole("button",{name});
await btn(direct?/世界挑戦 · 40回/:/日本挑戦 · 20回/).click();await btn("この選手と挑戦を始める").click();
for(let n=1;n<=40;n++){
 const cards=p.locator(".choice-card");await cards.first().waitFor();
 if(n===1&&!direct){for(const width of [360,375,390,430]){await p.setViewportSize({width,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.widths.push(width);}await p.setViewportSize({width:390,height:844});}
 const reg=p.locator(".season-play .season-calendar").getByRole("button",{name:"申し込む",exact:true});if(route!=="training"&&await reg.count()){await reg.click();await btn(/円を支払い登録/).click();await p.getByText(/開催 · 申込済み/).first().waitFor();}
 const names=await cards.locator("strong").allTextContents(),title=await p.locator(".challenge-issue h2").innerText();
 let idx=route==="training"?names.findIndex(x=>/自宅|見送|週間練習/.test(x)):names.findIndex(x=>/近所のジム|同じ大会|大会を分け|準備を手伝う|ポーズ/.test(x));
 await cards.nth(Math.max(idx,0)).click();
 if(n===1 && route!=="training"){await p.getByText("選んだ方針の詳細").click();await btn("生活・練習を調整する").click();const budget=p.locator('label').filter({hasText:"食費"}).locator('input').first();if(await budget.count())await budget.fill("1350");await btn("調整を終えて戻る").click();}
 if(n===1&&route==="domestic"){await p.screenshot({path:folder+"/decision.png"});await btn("大会",{exact:true}).first().click();await btn("決断",{exact:true}).first().click();assert.equal(await cards.locator('[aria-pressed=true]').count()+await p.locator(".choice-card[aria-pressed=true]").count(),1);}
 const go=p.locator(".advance-bar button");
 if(n===2&&route==="domestic"){await p.addStyleTag({content:"html{font-size:200%}"});assert.ok(await go.isEnabled());assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 if(n===3)await go.evaluate(el=>{el.click();el.click();});else await go.click();
 await p.waitForFunction(n=>{return document.querySelector(".award-gate,.challenge-period") || (document.querySelector(".advance-bar button:disabled") && document.querySelector(".challenge-header")?.innerText.includes("決断 "+(n+1)+"/"));},n,{timeout:180000});
 const reveal=btn("演出を短縮して順位発表へ");if(await reveal.count()){if(n<11){await p.reload();await btn(/つづきから/).first().click();await reveal.waitFor();}assert.ok(!/\\d+人中\\d+位|今大会の順位/.test(await p.locator(".award-gate").innerText()));await reveal.click();await p.locator(".challenge-period").waitFor();}
 let r=await stored(p);assert.equal(r.records.length,n);const rec=r.records.at(-1);
 report.turns.push({n,title,options:names,action:rec.strategy.id,budget:rec.strategy.budget,person:rec.fact?.person,show:rec.show&&[rec.show.edition,rec.show.rank,rec.show.day],day:rec.to});
 if(n===20||n===40){const values=JSON.stringify([r.career,r.records,r.season,r.domestic,r.world],(k,v)=>["elapsedMs","startedAt","createdAt","updatedAt"].includes(k)?undefined:v).split(r.id).join("PLAYER");report["at"+n]=crypto.createHash("sha256").update(values).digest("hex");}
 if(await p.locator(".challenge-period").count()){await p.locator(".challenge-period .button-row button.primary").last().click();}
 if(n===20||n===40){await p.locator(".challenge-ending").waitFor();report["ending"+n]=await p.locator(".challenge-ending > p").first().innerText();if(n===20){report.domestic=r.domestic;await btn(direct?/世界編の決断21へ/:/世界編の追加20回へ/).click();}else assert.deepEqual(r.domestic,report.domestic);}
 if(n%5===0)console.log(route,n);
}
report.passed=true;
} catch(e){console.error((await p?.locator("body").innerText())?.slice(-1800));throw e;}finally{report.elapsedSeconds=(Date.now()-start)/1000;fs.writeFileSync(folder+"/"+route+".json",JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
