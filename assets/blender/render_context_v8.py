"""Actual actor + room GLBs and a real two-actor scene. Not browser UI images."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];code=(ROOT/'assets/blender/render_exported_v8.py').read_text();code=code[:code.index("for frame in ['standard','tall','broad']:\n scene,rig=")];exec(compile(code,'context-helpers','exec'))
data=json.loads((OUT/'fixtures.json').read_text());initial=data['profiles'][0];b=initial['body'];height=b['height'];factor=height/176.5
scene,rig=resetScene(initial['frame']);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/gym-v4-room.glb'))
pose(rig,'SeatedPrepare',193,initial['morphs'],height);outfit(True);rig.scale=(b['shoulder'],1,factor);rig.location=(0,.48,.01515*factor)
capture('context-title-3d',(.65,-3.0,1.15),(0,.25,.8))
pose(rig,'GymIdle',1,initial['morphs'],height);rig.location=(0,0,.01515*factor);capture('context-home-3d',(.6,-3.5,1.18),(0,0,.94))
scene,first=resetScene('standard');low=next(c for c in cases if c['route']=='A' and c['stage']==1);setState(low['morphs']);outfit(False);first.location.x=-.44
previous=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/athlete-v8-standard.glb'));second=next(o for o in scene.objects if o not in previous and o.type=='ARMATURE');second.location.x=.44
action=next(a for a in bpy.data.actions if a.name=='GymIdle');second.animation_data.action=action
if action.slots:second.animation_data.action_slot=action.slots[0]
high=next(c for c in cases if c['route']=='A' and c['stage']==5)
for o in second.children_recursive:
 if o.name.startswith(('BL_V4_TrainingTank','BL_V4_TrainingShorts','BL_V3_Trainers')):
  o.hide_render=True
  for child in o.children_recursive:child.hide_render=True
 if o.type=='MESH' and o.data.shape_keys:
  for k in o.data.shape_keys.key_blocks:k.value=high['morphs'].get(k.name,0)
 if o.name.startswith('BL_V2_AthleteBody'):coverage(o,False)
scene.frame_set(1);scene.render.resolution_x=1200
capture('context-two-actors-3d',(0,-5.6,1.1),(0,0,.94))
(OUT/'context-preview.json').write_text(json.dumps({'captures':captures,'notes':'Blender previews built from the same exported actor/room assets and corresponding pose/placement. Not browser screenshots; browser UI/layout/lighting parity and GPU FPS were not tested.'},indent=2),encoding='utf8')
print('Actual GLB gym/title/standing/two-actor context previews saved',flush=True)
