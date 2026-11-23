"""Same neutral camera and lighting as protected v5 baseline."""
import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
baseline=(ROOT/'assets/blender/inspect_decision_v6.py').read_text(encoding='utf8').replace('source-inventory.json','v6-inventory.json').replace('before-','after-')
exec(compile(baseline,'v6-controlled-comparison','exec'))
state();keys['shoulderRaise'].value=0;render('after-body-front');render('after-body-side',(4.3,0,1.2));render('after-body-back',(0,4.3,1.2))
state(wear=True);render('after-wear-stand');state(.8,.3,True,'FrontDoubleBiceps',25);keys['shoulderRaise'].value=1;render('after-wear-raised')
state(wear=True,clip='SeatedPrepare',frame=193);keys['shoulderRaise'].value=0;render('after-seat-side',(4,-.1,1.15),(0,.2,.75));render('after-hair-back',(0,.84,1.67),(0,0,1.66),True)
for label,m,f in [('slim',-.45,-.45),('standard',0,0),('middle',.45,.15),('muscular',1,-.55),('muscular-fat',1,.75)]:
    state(m,f);keys['shoulderRaise'].value=0;render('after-'+label)
for label,clip in [('high-front','FrontDoubleBiceps'),('high-back','BackDoubleBiceps')]:
    state(1.2,-.55,False,clip,25);keys['shoulderRaise'].value=1;render('after-'+label)
for label,group in [('chest-shoulders',['upperChest','chest','frontDelts','sideDelts','rearDelts']),('shoulders-arms',['frontDelts','sideDelts','rearDelts','biceps','triceps','forearms']),('back-shoulders',['lats','upperBack','erectors','frontDelts','sideDelts','rearDelts']),('legs-glutes',['quads','hamstrings','glutes','calves'])]:
    state();keys['shoulderRaise'].value=0
    for name in group:keys[name].value=1.2
    render('after-combo-'+label)
for label,m,f in [('slim',-.45,-.45),('standard',0,0),('middle',.45,.15),('muscular',1,-.55),('muscular-fat',1,.75)]:
    state(m,f,True);render('after-wear-'+label)
for label,clip,frame in [('seat','SeatedPrepare',193),('raised','FrontDoubleBiceps',25)]:
    state(1.2,.75,True,clip,frame);render('after-wear-high-fat-'+label,(1.1,-4,1.15) if label=='seat' else (0,-4.3,1.2),(0,.2,.75) if label=='seat' else (0,0,.91))
print('V6 neutral body, face, hands, garments, five bodies and high-muscle poses captured',flush=True)
