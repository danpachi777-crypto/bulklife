import bpy,json
from pathlib import Path
ROOT=Path('C:/Users/shota/Documents/BulkLife')
rig=bpy.data.objects['BL_V2_Rig'];body=bpy.data.objects['BL_V2_AthleteBody']
result={'bones':{b.name:{'head':list(b.head_local),'tail':list(b.tail_local)} for b in rig.data.bones},'bodyVertices':len(body.data.vertices),'keys':list(body.data.shape_keys.key_blocks.keys()),'actions':list(bpy.data.actions.keys())}
(ROOT/'tmp/v5-rig.json').write_text(json.dumps(result,indent=2))
qa=(ROOT/'assets/blender/qa_portrait_v4.py').read_text().replace("OUT=ROOT/'docs/qa/coach-portrait-v4'","OUT=ROOT/'docs/qa/consistency-v5'")
exec(qa)
setup()
try:scene.render.engine='BLENDER_EEVEE'
except TypeError:pass
state(wear=True,clip='SeatedPrepare',frame=193);render('before-seat',(1.1,-4,1.15),(0,.2,.75))
render('before-hands',(.45,-1.4,1.2),(0,-.2,.75),True)
state(.65,0,False,'FrontDoubleBiceps',25);render('before-pose')
state();render('before-front');render('before-side',(4.3,0,1.2));render('before-back',(0,4.3,1.2))
print('V5 baseline and rig inspection complete',flush=True)
