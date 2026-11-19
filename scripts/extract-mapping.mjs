import {readFileSync,writeFileSync} from 'node:fs';
const p=new URL('../src/view/BodyView.tsx',import.meta.url);let s=readFileSync(p,'utf8');
const start=s.indexOf('const base=generateCareer'),end=s.indexOf('function Controls');s=s.slice(0,start)+"import {morphValues,BODY_ASSET_URL,MAX_CAMERA_DISTANCE,STUDIO_WALL_Z} from './bodyMapping';\n"+s.slice(end);
s=s.replace('controls.maxDistance=5','controls.maxDistance=MAX_CAMERA_DISTANCE').replace("useLoader(GLTFLoader,'/assets/athlete-v1.glb?revision=fitted-shorts-1')",'useLoader(GLTFLoader,BODY_ASSET_URL)').replace('[0,1.5,-6.5]','[0,1.5,STUDIO_WALL_Z]').replace('[x,1.3,-6.42]','[x,1.3,STUDIO_WALL_Z+.08]');
writeFileSync(p,s);
