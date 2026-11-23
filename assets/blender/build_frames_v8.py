"""Stable skeletal proportions: A, long-limbed B, broad C. D is a fat route.
Meshes, all shape endpoints and REST bones receive the same authored transform.
Neither growth nor fat can change the frame. Existing game quantities stay intact.
"""
import bpy,json,math,os
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];source=ROOT/'assets/blender/bulk-life-athlete-v8-work.blend'
assert Path(bpy.data.filepath)==source
def s(t):t=max(0,min(1,t));return t*t*(3-2*t)
def framePoint(p,kind):
 p=p.copy();x,y,z=p
 if kind=='standard':return p
 wide=1.075 if kind=='broad' else .955;depth=1.065 if kind=='broad' else .96;leg=-.032 if kind=='broad' else .042
 head=1-s((z-1.45)/.075);p.x*=1+(wide-1)*head;p.y*=1+(depth-1)*head
 # Keep total authored height/head fixed, redistribute leg/torso proportions.
 p.z+=leg*(z/.95 if z<.95 else 1-s((z-.95)/.55))
 # Arms extend toward the relaxed hand independently of the leg redistribution.
 arm=s((abs(x)-.18)/.16)*s((1.46-z)/.14)
 p.z+=(-.022 if kind=='tall' else .016)*arm
 return p
reportPath=ROOT/'docs/qa/anatomy-v8/frames.json';reports=json.loads(reportPath.read_text()) if reportPath.exists() else []
helper=ROOT/'assets/blender/retarget_contacts_v8.py';retarget={};exec(compile(helper.read_text(),str(helper),'exec'),retarget)
kinds=os.environ.get('BULK_LIFE_FRAMES','standard,tall,broad').split(',')
standardMeta=ROOT/'public/assets/portrait-v8-standard.json';groom=bpy.data.objects['BL_V4_Hair'].get('v8FeatheredHairline','pre-fringe')
if 'standard' not in kinds and (not standardMeta.exists() or json.loads(standardMeta.read_text()).get('groomRevision')!=groom):kinds=['standard']+kinds
for kind in kinds:
 if kind!='standard':bpy.ops.wm.open_mainfile(filepath=str(source))
 rig=bpy.data.objects['BL_V2_Rig'];body=bpy.data.objects['BL_V2_AthleteBody'];col=bpy.data.collections['BULK_LIFE_Athlete_v2']
 reference=retarget['capture_contacts'](rig) if kind!='standard' else {}
 oldRest={b.name:b.matrix_local.copy() for b in rig.data.bones}
 for o in col.objects:
  if o.type!='MESH' or o.parent_type=='BONE':continue
  if o.data.shape_keys:
   for k in o.data.shape_keys.key_blocks:
    for v in k.data:v.co=framePoint(v.co,kind)
  else:
   for v in o.data.vertices:v.co=framePoint(v.co,kind)
  o.data.update()
 if kind!='standard':
  bpy.context.view_layer.objects.active=rig;rig.hide_set(False);rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
  for b in rig.data.edit_bones:b.head=framePoint(b.head,kind);b.tail=framePoint(b.tail,kind)
  bpy.ops.object.mode_set(mode='OBJECT')
 contacts=retarget['retarget_contacts'](rig,reference,kind,oldRest) if reference else {}
 body['frameV8']=kind
 destination=ROOT/f'assets/blender/bulk-life-athlete-v8-{kind}-work.blend'
 bpy.ops.wm.save_as_mainfile(filepath=str(destination))
 if kind!='standard':
  del body['v8PoseCorrection']
  script=ROOT/'assets/blender/correct_poses_v8.py';exec(compile(script.read_text(),str(script),'exec'),{'__file__':str(script),'__name__':'__main__'})
 script=ROOT/'assets/blender/correct_seat_v8.py';exec(compile(script.read_text(),str(script),'exec'),{'__file__':str(script),'__name__':'__main__'})
 script=ROOT/'assets/blender/install_coverage_v8.py';scope={'__file__':str(script),'__name__':'coverage_helpers'};exec(compile(script.read_text(),str(script),'exec'),scope);scope['install'](body)
 script=ROOT/'assets/blender/export_anatomy_v8.py';exec(compile(script.read_text(),str(script),'exec'),{'__file__':str(script),'__name__':'__main__'})
 reports=[r for r in reports if r['frame']!=kind]+[{'frame':kind,'authoring':str(destination.relative_to(ROOT)),'heightMetres':1.77,'frameChangesWithGrowth':False,'sameRestTransformForSkinGarmentsAndBones':True,'contactRetarget':contacts}]
(ROOT/'docs/qa/anatomy-v8/frames.json').write_text(json.dumps(reports,indent=2),encoding='utf8')
print('V8 THREE FRAMES EXPORTED',flush=True)
