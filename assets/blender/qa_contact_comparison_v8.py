"""Matched v7/v8 face, hand contact, clothing and pose evidence."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
code=(ROOT/'assets/blender/qa_anatomy_v8_character.py').read_text(encoding='utf8')
exec(compile(code[:code.index('bodyState(1.2,7,False')],'contact-helpers','exec'))
for i,m in enumerate(original):body.data.materials[i]=m
prefix='after' if body.get('anatomyV8') else 'before'
def apply(m=0,bf=18,wear=False,clip='GymIdle',frame=1):
 bodyState(m,bf,wear,clip,frame)
 if prefix=='before':
  for o in athletes.objects:
   if o.type=='MESH' and o.data.shape_keys and 'bodyFat' in o.data.shape_keys.key_blocks:o.data.shape_keys.key_blocks['bodyFat'].value=(bf-18)/18
apply()
for view,eye in [('FRONT',(0,-.92,1.63)),('THREEQUARTER',(.58,-.72,1.63)),('SIDE',(.92,-.12,1.63))]:render(prefix+'-face-'+view,eye,(0,-.03,1.63),True)
render(prefix+'-hair-BACK',(0,.84,1.67),(0,0,1.66),True)
for label,m,bf in [('standard',0,18),('high-fat',1.2,29)]:
 apply(m,bf,True,'SeatedPrepare',193)
 for view,eye in [('FRONT',(0,-4.3,1.2)),('SIDE',(4.3,.2,1.2)),('THREEQUARTER',(1.1,-4,1.15))]:render(prefix+'-'+label+'-SEATED-'+view,eye,(0,.2,.75))
 render(prefix+'-'+label+'-HAND',(1.05,-1.6,.90),(0,.02,.72),True)
apply(1.2,7,False,'FrontDoubleBiceps',25);render(prefix+'-high-POSE-SKIN',(0,-4.3,1.2),(0,0,1.04))
apply(1.2,7,True,'FrontDoubleBiceps',25);render(prefix+'-high-WEAR-RAISED',(0,-4.3,1.2),(0,0,1.04))
apply(.55,15,True);render(prefix+'-WEAR-STAND')
print(prefix+' matched face / contact / clothing evidence saved',flush=True)
