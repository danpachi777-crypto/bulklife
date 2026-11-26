const assert=require("node:assert/strict");
const fs=require("node:fs");
const dir="docs/qa/season/";
const read=name=>JSON.parse(fs.readFileSync(dir+name+".json","utf8"));
const domestic=read("domestic"),direct=read("direct"),training=read("training");
for(const run of [domestic,direct,training]){
  assert.equal(run.passed,true);
  assert.deepEqual(run.turns.map(t=>t.n),Array.from({length:40},(_,i)=>i+1));
  const editions=run.turns.filter(t=>t.show).map(t=>t.show[0]);
  assert.equal(new Set(editions).size,editions.length);
}
assert.deepEqual(domestic.turns,direct.turns);
assert.equal(domestic.at20,direct.at20);
assert.equal(domestic.at40,direct.at40);
assert.deepEqual(domestic.domestic,direct.domestic);
assert.equal(domestic.turns[0].budget,1350);
assert.equal(domestic.turns[0].person,"origin-B34");
assert.equal(training.turns.filter(t=>t.show).length,0);
assert.equal(read("migration").historyMatches,true);
for(const run of [domestic,direct,training]){
  const frequencies={};
  for(const turn of run.turns)frequencies[turn.title]=(frequencies[turn.title]||0)+1;
  console.log(run.route,run.elapsedSeconds+" seconds",run.turns.filter(t=>t.show).map(t=>t.show.slice(0,2)),Object.entries(frequencies).sort((a,b)=>b[1]-a[1]).slice(0,2));
}
console.log("identical states at 20 and 40",direct.at20,direct.at40);
