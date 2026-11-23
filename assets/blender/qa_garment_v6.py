import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
qa=(ROOT/'assets/blender/qa_portrait_v4.py').read_text(encoding='utf8').replace("OUT=ROOT/'docs/qa/coach-portrait-v4'","OUT=ROOT/'docs/qa/decisions-v6'")
exec(qa);setup()
for label,clip,frame in [('stand','GymIdle',1),('raised','FrontDoubleBiceps',25),('seat','SeatedPrepare',193)]:
 state(.8,.3,True,clip,frame)
 for obj in athletes.objects:
  if obj.type=='MESH' and obj.data.shape_keys and 'shoulderRaise' in obj.data.shape_keys.key_blocks:
   obj.data.shape_keys.key_blocks['shoulderRaise'].value=1 if label=='raised' else 0
 render('review-tank-'+label)
