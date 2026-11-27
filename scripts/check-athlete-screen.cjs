const {chromium}=require("playwright"),fs=require("node:fs"),assert=require("node:assert/strict");
(async()=>{const b=await chromium.launch({channel:"chrome",args:["--enable-unsafe-swiftshader"]});
try{const p=await b.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});p.setDefaultTimeout(90000);
const folder="docs/qa/athlete-screen",btn=name=>p.getByRole("button",{name,exact:true});
await p.goto(process.env.BULK_PREVIEW||"http://127.0.0.1:4191");await p.getByRole("button",{name:/日本挑戦 · 20回/}).click();await btn("この選手と挑戦を始める").click();
const hero=p.locator(".career-portrait"),canvas=hero.locator("canvas");await canvas.waitFor();await hero.locator(".model-loading").waitFor({state:"hidden"});await p.waitForTimeout(800);
const marker=await canvas.elementHandle(),metrics=[];
for(const [width,height] of [[390,844],[360,640],[375,667],[430,932],[360,540],[1280,850]]){
 await p.setViewportSize({width,height});await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(350);
 const m=await p.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,height:r.height,bottom:r.bottom}};return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,portrait:rect(".career-portrait canvas"),firstCard:rect(".choice-card"),advance:rect(".advance-bar button"),nav:rect(".challenge-nav")};});
 assert.equal(m.scrollWidth,width);assert.ok(m.advance.height>=48&&m.advance.bottom<=m.nav.top+1);assert.ok(m.portrait.height>=140);metrics.push(m);
 if([390,1280].includes(width))await p.screenshot({path:folder+"/home-"+width+".png"});
}
await p.setViewportSize({width:390,height:844});const card=p.locator(".choice-card").first();await card.focus();await p.keyboard.press("Enter");assert.equal(await card.getAttribute("aria-pressed"),"true");await btn("全身を見る").click();await p.waitForTimeout(400);await hero.screenshot({path:folder+"/full-body.png"});await btn("上半身を見る").click();assert.ok(await canvas.evaluate((el,original)=>el===original,marker));await btn("身体を詳しく見る").click();await btn("今回の出来事に戻る").click();assert.equal(await card.getAttribute("aria-pressed"),"true");
await p.addStyleTag({content:"html {font-size:200%}"});await p.setViewportSize({width:360,height:540});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),360);await p.locator(".advance-bar button").click();await p.locator(".last-decision").waitFor();const result=await p.locator(".last-decision").innerText();assert.ok(result.includes("筋質量"));fs.writeFileSync(folder+"/layout.json",JSON.stringify({metrics,result,keptCanvasAcrossSelectionAndFraming:true,selectionSurvivedInspection:true},null,2));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
