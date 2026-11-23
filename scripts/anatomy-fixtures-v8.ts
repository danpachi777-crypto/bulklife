import fs from 'node:fs';
import {ANATOMY_ROUTES,anatomyBody,type AnatomyRoute} from '../src/view/anatomyCases';
import {anatomyMorphValues} from '../src/view/bodyMapping';
import {portraitFrame} from '../src/view/portraitAsset';
import {PROFILES} from '../src/core/content';
import {generateCareer} from '../src/core/simulation';
const cases=[];
for(const route of Object.keys(ANATOMY_ROUTES) as AnatomyRoute[])for(let stage=1;stage<=5;stage++){
 const body=anatomyBody(route,stage);
 cases.push({route,stage,frame:portraitFrame(body.height),body,morphs:anatomyMorphValues(body)});
}
const profiles=PROFILES.map(profile=>{const body=generateCareer(profile,42,'bl-art-initial-qa').athlete.body;return {profile:profile.id,body,frame:portraitFrame(body.height),morphs:anatomyMorphValues(body)};});
fs.writeFileSync('docs/qa/anatomy-v8/fixtures.json',JSON.stringify({notes:'Artist-selected anchors, not physiological measurements of the supplied images. All rendered values come from the same BodyState mapping used by the game.',cases,profiles},null,2));
