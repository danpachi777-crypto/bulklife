// Requires Playwright (installed in the QA environment), and a local production preview.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const folder='docs/qa/life-story';
const startUrl=process.env.BULK_PREVIEW || 'http://127.0.0.1:4187';
const seed=Number(process.env.BULK_SEED || 42);
const end=Number(process.env.BULK_DECISIONS || 40);
const standalone=process.env.BULK_WORLD==='1';
const prefix=seed===42?'':seed+'-';
async function saved(page){
  return page.evaluate(()=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('bulk-life-challenges-v1',1);
    request.onsuccess=()=>{const db=request.result, q=db.transaction('runs').objectStore('runs').getAll();q.onsuccess=()=>{db.close();resolve(q.result[0])};q.onerror=()=>reject(q.error)};
    request.onerror=()=>reject(request.error);
  }));
}
(async()=>{
const browser=await chromium.launch({executablePath:process.env.BULK_CHROME,headless:true,args:['--enable-unsafe-swiftshader']});
const log={browser:browser.version(),seed,standalone,viewport:[390,844],decisions:[],widths:[],errors:[]};
const file=folder+'/'+prefix+'browser.json';
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 page.setDefaultTimeout(120000);page.on('pageerror',e=>log.errors.push(e.message));
 await page.addInitScript(seed=>{const random=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>a instanceof Uint32Array && a.length===1?(a[0]=seed,a):random(a)},seed);
 const button=name=>page.getByRole('button',{name}); const shot=async name=>page.screenshot({path:folder+'/'+prefix+name+'.png'});
 const checkWidths=async screen=>{for(const width of [320,390,768,1280]){
   await page.setViewportSize({width,height:844});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   if(overflow>1)console.log(await page.locator('body *').evaluateAll(els=>els.filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>e.tagName+'.'+e.className).slice(0,20)));
   log.widths.push({screen,width,overflow});assert.ok(overflow<=1,screen+' overflow '+width+' '+overflow);
 }await page.setViewportSize({width:390,height:844})};
 await page.goto(startUrl);
 await button(standalone?/世界挑戦 · 40回/:/日本挑戦 · 20回/).click();
 log.origin=await page.locator('.origin-card').innerText();await checkWidths('creation');
 await button('この選手と挑戦を始める').click();
 let domestic;const started=Date.now();
 for(let i=1;i<=end;i++){
  const choices=page.locator('.challenge-strategies article');await choices.first().waitFor();
  if(i===1){await checkWidths('decision');await page.locator('.challenge-issue').scrollIntoViewIfNeeded();await shot('opening');}
  const essay=await page.locator('.challenge-issue p').first().innerText();
  const preferred=i%4===0?2:(i%3===0?1:0);
  const choose=async n=>choices.nth(n).getByRole('button').click();
  await choose(preferred);
  const confirm=button(new RegExp('決断'+i+'を確定'));
  if(!await confirm.isEnabled()){await page.keyboard.press('Escape');await choose(0);}
  await confirm.click();
  const next=button(i===20?/国内編の結果を振り返る/:i===40?/世界編の結果を振り返る/:new RegExp('決断'+(i+1)+'の作戦を考える'));
  await next.waitFor();
  const run=await saved(page), rec=run.records.at(-1);assert.equal(run.records.length,i);
  log.decisions.push({i,essay,id:rec.strategy.id,choice:rec.strategy.name,rank:rec.show?.rank,tier:rec.show?.tier,score:rec.show?.score,elapsedMs:Date.now()-started});
  console.log(i,rec.strategy.name,rec.show?.rank || '');
  if([4,20].includes(i) && rec.show){
   await button('選手入場').click();await button(/比較審査へ/).click();await button('背面ポーズ').click();
   await page.locator('.challenge-stage .model-loading').waitFor({state:'hidden'});await page.locator('.challenge-stage').scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const c=document.querySelector('.challenge-stage canvas');const g=c?.getContext('webgl2');if(!g)return false;const w=g.drawingBufferWidth,h=g.drawingBufferHeight,pixels=new Uint8Array(w*h*4);g.readPixels(0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,pixels);let left=0,right=0;for(let y=Math.floor(h*.2);y<h*.8;y+=5)for(let x=0;x<w;x+=5){let k=(y*w+x)*4;if(pixels[k]>100&&pixels[k]>pixels[k+1]*1.08&&pixels[k+1]>pixels[k+2]*1.05){if(x<w/2)left++;else right++;}}return left>10&&right>10;});await shot('stage-'+i);
   await button(/順位発表へ/).click();
  }
  if([1,4,5,20,40].includes(i)){await page.locator('.challenge-period h2').scrollIntoViewIfNeeded();await shot('decision-'+i);}
  if(i===5){await page.reload();await button(/つづきから/).first().click();await next.waitFor();assert.equal((await saved(page)).records.length,5);}
  if(i===20){domestic=run.domestic;fs.writeFileSync(require('node:path').join(require('node:os').tmpdir(),'bulklife-qa-domestic.json'),JSON.stringify(run));}
  if(i===end && i!==20 && i!==40)break;
  await next.click();
  if(i===20 || i===40){
   await page.locator('.challenge-ending').waitFor();await checkWidths('ending'+i);
   await page.locator('.life-compare').scrollIntoViewIfNeeded();await button('大会ポーズ').click();await page.locator('.life-compare .model-loading').waitFor({state:'hidden'});
   await shot(i===20?'domestic':'world');
   if(i===20 && end>20)await button(standalone?/世界編の決断21へ/:/世界編の追加20回へ/).click();
  }
 }
 const run=await saved(page);if(domestic)assert.deepEqual(run.domestic,domestic);
 log.status=run.status;log.domestic=run.domestic;log.world=run.world;
 assert.equal(log.errors.length,0);if(end===40)assert.equal(run.status,'worldEnd');
} finally {fs.writeFileSync(file,JSON.stringify(log,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
