// Contact sheets arrange existing captures; originals remain byte-identical.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {createCanvas,loadImage}=await import(process.argv[2]?pathToFileURL(path.resolve(process.argv[2])).href:'@napi-rs/canvas');
const out=path.resolve('docs/qa/anatomy-v8');
for(const route of ['A','B','C','D']){
 const w=230,h=324,label=28,canvas=createCanvas(w*3,(h+label)*5),ctx=canvas.getContext('2d');ctx.fillStyle='#f3f5f2';ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let stage=1;stage<=5;stage++)for(const [index,view] of ['FRONT','SIDE','BACK'].entries()){
  const image=await loadImage(path.join(out,`${route}-${stage}-${view}.png`));const x=index*w,y=(stage-1)*(h+label);ctx.drawImage(image,x,y+label,w,h);ctx.fillStyle='#173d31';ctx.font='18px sans-serif';ctx.fillText(`${route}${stage} / ${view}`,x+8,y+21);
 }
 fs.writeFileSync(path.join(out,`contact-${route}.png`),canvas.toBuffer('image/png'));
}
const names=['exported-standard-FrontDoubleBiceps','exported-tall-FrontDoubleBiceps','exported-broad-FrontDoubleBiceps','exported-standard-HIGHFAT-SEATED-SIDE','exported-tall-HIGHFAT-SEATED-SIDE','exported-broad-HIGHFAT-SEATED-SIDE'];
const canvas=createCanvas(900,900),ctx=canvas.getContext('2d');ctx.fillStyle='#f3f5f2';ctx.fillRect(0,0,900,900);
for(const [i,name] of names.entries()){
 const image=await loadImage(path.join(out,name+'.png')),x=i%3*300,y=Math.floor(i/3)*450;ctx.drawImage(image,x,y+30,300,420);ctx.fillStyle='#173d31';ctx.font='14px sans-serif';ctx.fillText(name.replace('exported-',''),x+5,y+22);
}
fs.writeFileSync(path.join(out,'contact-poses.png'),canvas.toBuffer('image/png'));
console.log('Five labelled contact sheets from actual GLB captures written.');
