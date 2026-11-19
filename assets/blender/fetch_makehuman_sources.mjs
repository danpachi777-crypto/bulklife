import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const commit='a8bc2d54ff0ac92e78ff71431b1023eda42bf482';
const dir=new URL('../sources/makehuman/',import.meta.url);mkdirSync(dir,{recursive:true});
const files=['LICENSE.md','LICENSE.ASSETS.md','makehuman/data/3dobjs/base.obj','makehuman/data/rigs/default.mhskel','makehuman/data/rigs/default_weights.mhw','makehuman/data/targets/macrodetails/asian-male-young.target','makehuman/data/targets/macrodetails/universal-male-young-averagemuscle-averageweight.target','makehuman/data/targets/macrodetails/universal-male-young-maxmuscle-averageweight.target','makehuman/data/targets/macrodetails/universal-male-young-averagemuscle-maxweight.target'];
const downloaded=[];
for(const path of files){const url=`https://raw.githubusercontent.com/makehumancommunity/makehuman/${commit}/${path}`;const r=await fetch(url);if(!r.ok)throw Error(`${r.status} ${path}`);const b=Buffer.from(await r.arrayBuffer());const name=path.split('/').at(-1);writeFileSync(new URL(name,dir),b);downloaded.push({name,path,url,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}
writeFileSync(new URL('provenance.json',dir),JSON.stringify({project:'MakeHuman Community',repository:'https://github.com/makehumancommunity/makehuman',commit,license:'CC0-1.0 for bundled graphical assets (not application source code)',files:downloaded},null,2));
console.log(downloaded.map(x=>({name:x.name,bytes:x.bytes})));
