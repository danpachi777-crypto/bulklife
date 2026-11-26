const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
(async()=>{const browser=await chromium.launch({channel:"chrome"});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto(process.env.BULK_PREVIEW||"http://127.0.0.1:4191");
 const archive=path.join(os.tmpdir(),"bulk-turn-top.json");
 const old=JSON.parse(fs.readFileSync(archive,"utf8")).runs[0];
 await page.locator("input[type=file]").setInputFiles(archive);await page.getByRole("button",{name:"この記録を開く"}).click();
 await page.getByRole("button",{name:/元のセーブを残して/}).click();
 await page.getByRole("button",{name:/元のセーブを残して/}).waitFor({state:"hidden"});
 await page.getByRole("button",{name:/世界編の追加20回へ/}).click();
 await page.locator(".choice-card").first().waitFor();
 const saves=await page.evaluate(()=>new Promise(resolve=>{let q=indexedDB.open("bulk-life-challenges-v1");q.onsuccess=()=>{const d=q.result,req=d.transaction("runs").objectStore("runs").getAll();req.onsuccess=()=>{d.close();resolve(req.result)};};}));
 assert.equal(saves.length,2);const copy=saves.find(x=>x.season);assert.equal(copy.records.length,20);assert.deepEqual(copy.domestic,old.domestic);assert.deepEqual(copy.records,old.records);assert.ok(copy.season.legacy.asia);assert.equal(copy.season.legacy.final,undefined);assert.equal(copy.status,"planning");fs.writeFileSync("docs/qa/season/migration.json",JSON.stringify({originalRetained:true,historyMatches:true,domestic:old.domestic.best,legacy:copy.season.legacy,turns:copy.records.length},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});