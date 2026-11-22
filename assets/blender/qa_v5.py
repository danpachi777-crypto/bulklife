"""Read-only final neutral evidence; same camera/lights as the protected baseline."""
import bpy
from pathlib import Path
ROOT=Path('C:/Users/shota/Documents/BulkLife')
qa=(ROOT/'assets/blender/qa_portrait_v4.py').read_text().replace("OUT=ROOT/'docs/qa/coach-portrait-v4'","OUT=ROOT/'docs/qa/consistency-v5'")
exec(qa)
try:scene.render.engine='BLENDER_EEVEE'
except TypeError:pass
base_state=state
def state(*args,**kwargs):
    base_state(*args,**kwargs)
    amount=0
    for side in ['L','R']:
        bone=rig.pose.bones['upperArm.'+side];up=(bone.tail-bone.head).normalized().z;amount+=max(0,min(1,(up+.35)/.63))
    body.data.shape_keys.key_blocks['shoulderRaise'].value=amount/2
render_cases('after',True)
state(wear=True,clip='SeatedPrepare',frame=193);render('after-hands',(.45,-1.4,1.2),(0,-.2,.75),True)
state(.65,0,False,'FrontDoubleBiceps',25);render('after-pose')
print('Final v5 asset neutral evidence rendered without saving authoring data',flush=True)
