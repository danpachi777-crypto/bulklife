"""Character gate: actual neutral/body/fat/corrective targets, not all keys at1."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
source=(ROOT/'assets/blender/qa_anatomy_v8_initial.py').read_text(encoding='utf8')
exec(compile(source[:source.index('for stage,m,bf in')],'v8-character-helpers','exec'))
def bodyState(m=0,bf=18,wear=False,clip='GymIdle',frame=1):
 state(0,0,wear,clip,frame)
 for o in athletes.objects:
  if o.type!='MESH' or not o.data.shape_keys:continue
  for k in o.data.shape_keys.key_blocks:
   k.value=m if k.name in parts else max(0,(bf-18)/18) if k.name=='bodyFat' else max(0,(18-bf)/12) if k.name=='leanDefinition' else max(0,(bf-18)/18)*max(0,m/1.2) if k.name=='fatSoftening' else 1 if k.name=='seatedCloth' and clip=='SeatedPrepare' else 0
  if clip in ['FrontDoubleBiceps','BackDoubleBiceps']:
   for n,v in [('shoulderRaise',1),('shoulderRaiseMuscle',m/1.2),('elbowFlexL',1),('elbowFlexR',1),('elbowMuscleL',m/1.2),('elbowMuscleR',m/1.2)]:
    if n in o.data.shape_keys.key_blocks:o.data.shape_keys.key_blocks[n].value=v
  if clip=='SeatedPrepare':
   for n,v in [('seatedHandsMuscle',m/1.2),('seatedHandsFat',max(0,(bf-18)/18))]:
    if n in o.data.shape_keys.key_blocks:o.data.shape_keys.key_blocks[n].value=v
   plane=.4825-.01515;t=max(0,min(1,(plane-.445)/.027));u=max(0,min(1,(plane-.472)/.028))
   for label,w in [('Low',1-t),('Mid',t*(1-u)),('High',u)]:
    for suffix,value in [('',w),('Muscle',w*m/1.2),('Fat',w*max(0,(bf-18)/18))]:
     name='seatedSeat'+label+suffix
     if name in o.data.shape_keys.key_blocks:o.data.shape_keys.key_blocks[name].value=value
bodyState(1.2,7,False,'FrontDoubleBiceps',25);render('after-A5-POSE-clay',(0,-4.3,1.2),(0,0,1.04))
bodyState(1.2,7,False,'BackDoubleBiceps',25);render('after-A5-BACKPOSE-clay',(0,-4.3,1.2),(0,0,1.04))
for i,m in enumerate(original):body.data.materials[i]=m
bodyState();render('after-face-FRONT',(0,-.92,1.63),(0,-.03,1.63),True);render('after-face-SIDE',(.92,-.12,1.63),(0,-.03,1.63),True);render('after-hair-BACK',(0,.84,1.67),(0,0,1.66),True)
body.data.shape_keys.key_blocks['blink'].value=1;render('after-face-BLINK',(0,-.92,1.63),(0,-.03,1.63),True)
bodyState(1.2,29,True,'SeatedPrepare',193);render('after-high-fat-SEATED',(1.1,-4,1.15),(0,.2,.75))
bodyState(1.2,7,True,'FrontDoubleBiceps',25);render('after-high-WEAR-RAISED')
print('V8 character pose / face / hair / clothing gate rendered',flush=True)
