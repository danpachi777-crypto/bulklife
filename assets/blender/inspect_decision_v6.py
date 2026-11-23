"""Read-only v5 baseline and structural inventory, never saves the source file."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/qa/decisions-v6';OUT.mkdir(parents=True,exist_ok=True)
body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig']
keys=body.data.shape_keys.key_blocks;basis=keys[0]
data={'file':bpy.data.filepath,'body':body.name,'bones':[b.name for b in rig.data.bones],'vertices':len(body.data.vertices),'morphMax':{k.name:max((v.co-b.co).length for v,b in zip(k.data,basis.data)) for k in list(keys)[1:]},'materials':[m.name for m in body.data.materials],'actions':[a.name for a in bpy.data.actions if a.name in ['GymIdle','FrontDoubleBiceps','SeatedPrepare']]}
(OUT/'source-inventory.json').write_text(json.dumps(data,indent=2),encoding='utf8');print(json.dumps(data),flush=True)
qa=(ROOT/'assets/blender/qa_portrait_v4.py').read_text().replace("OUT=ROOT/'docs/qa/coach-portrait-v4'","OUT=ROOT/'docs/qa/decisions-v6'")
exec(qa);setup()
raw_state=state
def state(muscle=0,fat=0,wear=False,clip='GymIdle',frame=1):
 raw_state(muscle,fat,wear,clip,frame)
 for obj in athletes.objects:
  if obj.type=='MESH' and obj.data.shape_keys and 'shoulderRaise' in obj.data.shape_keys.key_blocks:
   obj.data.shape_keys.key_blocks['shoulderRaise'].value=1 if clip in ['FrontDoubleBiceps','BackDoubleBiceps'] else 0
 for side in ['L','R']:
  key='elbowFlex'+side
  if key in keys:
   arm=rig.pose.bones['upperArm.'+side];forearm=rig.pose.bones['forearm.'+side]
   angle=(arm.tail-arm.head).angle(forearm.tail-forearm.head)
   keys[key].value=max(0,min(1,(angle-.35)/1.35))
try:scene.render.engine='BLENDER_EEVEE'
except TypeError:pass
clay=bpy.data.materials.new('V6_AnatomyClay');clay.use_nodes=True
p=next(n for n in clay.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(.16,.18,.20,1);p.inputs['Roughness'].default_value=.8
def clay_case(name,m=0,clip='GymIdle',eye=(0,-4.3,1.2)):
 state(m,0,False,clip,25 if clip!='GymIdle' else 1)
 keys['shoulderRaise'].value=0 if clip=='GymIdle' else 1
 scene.view_layers[0].material_override=clay;render(name,eye);scene.view_layers[0].material_override=None
clay_case('before-clay-front');clay_case('before-clay-side',eye=(4.3,0,1.2));clay_case('before-clay-back',eye=(0,4.3,1.2));clay_case('before-clay-high-pose',1.2,'FrontDoubleBiceps')
state();render('before-face-front',(0,-.92,1.63),(0,-.03,1.63),True);render('before-face-angle',(.65,-.65,1.63),(0,-.03,1.63),True);render('before-face-side',(.92,-.12,1.63),(0,-.03,1.63),True)
state();keys['shoulderRaise'].value=0;render('before-body-front');render('before-body-side',(4.3,0,1.2));render('before-body-back',(0,4.3,1.2))
state(wear=True);keys['shoulderRaise'].value=0;render('before-wear-stand');state(.8,.3,True,'FrontDoubleBiceps',25);keys['shoulderRaise'].value=1;render('before-wear-raised')
state(wear=True,clip='SeatedPrepare',frame=193);render('before-seat',(1.1,-4,1.15),(0,.2,.75));render('before-hands',(.45,-1.4,1.2),(0,-.2,.75),True)
state(1.2,-.55,False,'FrontDoubleBiceps',25);keys['shoulderRaise'].value=1;render('before-high-front')
state(1.2,-.55,False,'BackDoubleBiceps',25);keys['shoulderRaise'].value=1;render('before-high-back')
print('V6 baseline captured without saving original v5',flush=True)
