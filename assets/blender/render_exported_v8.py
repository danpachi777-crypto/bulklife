"""Render the actual exported GLBs, not a different Blender-only sculpt.
Sixty view labels are generated from explicit camera vectors with identical lights.
"""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/anatomy-v8';cases=json.loads((OUT/'fixtures.json').read_text())['cases'];captures=[]
for frame in ['standard','tall','broad']:
 assert 'seatedSeatMid' in json.loads((ROOT/f'public/assets/portrait-v8-{frame}.json').read_text())['morphs'],'Re-export the current contact-corrected v8 models before producing evidence'
def resetScene(frame):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/assets/athlete-v8-{frame}.glb'))
 # Apply the same depth-stable alpha policy as AthleteStudio, including when
 # this helper is used to compare the protected old v7 BLEND asset fairly.
 hair=bpy.data.objects.get('BL_V4_Hair')
 if hair:
  for o in [hair]+list(hair.children_recursive):
   if o.type!='MESH':continue
   for material in o.data.materials:
    material.use_backface_culling=False
    pr=next((n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    if pr and pr.inputs['Alpha'].is_linked:
     alpha=pr.inputs['Alpha'].links[0].from_socket;cut=material.node_tree.nodes.new('ShaderNodeMath');cut.operation='GREATER_THAN';cut.inputs[1].default_value=.18;material.node_tree.links.new(alpha,cut.inputs[0]);material.node_tree.links.new(cut.outputs[0],pr.inputs['Alpha'])
 scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=640;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.exposure=-.8
 world=bpy.data.worlds.new('QA_Neutral');scene.world=world;world.use_nodes=True;bg=world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.22,.23,.25,1);bg.inputs['Strength'].default_value=.45
 for name,loc,power,size in [('Key',(-2,-3.5,3.7),480,3),('Fill',(2,-2,2.5),300,3),('Rim',(0,2.4,3),420,2.5)]:
  d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.mesh.primitive_plane_add(size=16,location=(0,0,-.025));floor=bpy.context.object;m=bpy.data.materials.new('QA_floor');m.diffuse_color=(.19,.20,.21,1);m.use_nodes=True;m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.19,.20,.21,1);m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.9;floor.data.materials.append(m)
 d=bpy.data.cameras.new('QA_Camera');cam=bpy.data.objects.new('QA_Camera',d);scene.collection.objects.link(cam);scene.camera=cam;d.lens=65
 rig=next(o for o in scene.objects if o.type=='ARMATURE');rig.animation_data_clear()
 # The glTF action is the very same 19-clip payload consumed by Three.js.
 action=next(a for a in bpy.data.actions if a.name=='GymIdle' or a.name.startswith('GymIdle_'))
 rig.animation_data_create();rig.animation_data.action=action
 if action.slots:rig.animation_data.action_slot=action.slots[0]
 scene.frame_set(1)
 for name in ['BL_V4_TrainingTank','BL_V4_TrainingShorts','BL_V3_Trainers']:
  o=bpy.data.objects.get(name)
  if o:
   o.hide_render=True
   for child in o.children_recursive:child.hide_render=True
 return scene,rig
def setState(values):
 for o in bpy.context.scene.objects:
  if o.type=='MESH' and o.data.shape_keys:
   for k in o.data.shape_keys.key_blocks:k.value=values.get(k.name,0)
def outfit(visible):
 for name in ['BL_V4_TrainingTank','BL_V4_TrainingShorts','BL_V3_Trainers']:
  o=bpy.data.objects.get(name)
  if o:
   o.hide_render=not visible
   for child in o.children_recursive:child.hide_render=not visible
 bpy.data.objects['BL_V2_Shorts'].hide_render=visible
 coverage(bpy.data.objects['BL_V2_AthleteBody'],visible)
def coverage(skin,visible):
 mask=skin.modifiers.get('QA_RuntimeCoverage')
 group=skin.vertex_groups.get('QA_VisibleSkin') or skin.vertex_groups.new(name='QA_VisibleSkin')
 group.add(list(range(len(skin.data.vertices))),1,'REPLACE')
 frame=skin.get('frameV8','standard');leg=-.032 if frame=='broad' else .042 if frame=='tall' else 0
 def s(t):t=max(0,min(1,t));return t*t*(3-2*t)
 for i,p in enumerate(skin.data.vertices):
  arm=sum(g.weight for g in p.groups if skin.vertex_groups[g.group].name.startswith(('upperArm','forearm','hand','finger')))
  z=p.co.z
  if leg:
   for _ in range(12):z=p.co.z-leg*(z/.95 if z<.95 else 1-s((z-.95)/.55))
  hidden=(z<.112 or .695<z<.97) if visible else .80<z<.975
  if arm<=.15 and hidden:group.add([i],0,'REPLACE')
 if not mask:
  mask=skin.modifiers.new('QA_RuntimeCoverage','MASK');mask.vertex_group=group.name
 mask.show_render=True
def pose(rig,clip,frame,values,height=176.5):
 action=next(a for a in bpy.data.actions if a.name==clip or a.name.startswith(clip+'_'));rig.animation_data.action=action
 if action.slots:rig.animation_data.action_slot=action.slots[0]
 bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
 m=sum(max(0,values.get(p,0)) for p in ['frontDelts','sideDelts','rearDelts','chest','upperChest','lats'])/(6*1.2)
 amounts=[];elbows={}
 for side in ['L','R']:
  upper=rig.pose.bones['upperArm.'+side].head;lower=rig.pose.bones['forearm.'+side].head;wrist=rig.pose.bones['hand.'+side].head
  amounts.append(max(0,min(1,((lower-upper).normalized().z+.35)/.63)));elbows[side]=max(0,min(1,((lower-upper).angle(wrist-lower)-.35)/1.35))
 shoulder=sum(amounts)/2;seated=1 if clip=='SeatedPrepare' else 0;leg=(max(0,values['quads'])+max(0,values['hamstrings']))/2.4
 support={};plane=.4825/(height/176.5)-.01515;t=max(0,min(1,(plane-.445)/.027));u=max(0,min(1,(plane-.472)/.028));hips=sum(max(0,values[n]) for n in ['glutes','hamstrings','quads'])/3.6
 for label,w in [('Low',1-t),('Mid',t*(1-u)),('High',u)]:
  support['seatedSeat'+label]=seated*w;support['seatedSeat'+label+'Muscle']=seated*w*hips;support['seatedSeat'+label+'Fat']=seated*w*values['bodyFat']
 setState({**values,**support,'shoulderRaise':shoulder,'shoulderRaiseMuscle':shoulder*m,'elbowFlexL':elbows['L'],'elbowFlexR':elbows['R'],'elbowMuscleL':elbows['L']*m,'elbowMuscleR':elbows['R']*m,'seatedHandsMuscle':seated*leg,'seatedHandsFat':seated*values['bodyFat'],'seatedCloth':seated})
def capture(name,eye,target=(0,0,.91),face=False):
 scene=bpy.context.scene;scene.render.resolution_y=640 if face else 900;scene.camera.data.lens=70 if face else 65;scene.camera.location=eye;scene.camera.rotation_euler=(Vector(target)-Vector(eye)).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True);captures.append({'file':name+'.png','camera':eye,'target':target,'lens':scene.camera.data.lens,'source':'exported GLB re-import, neutral QA renderer (not browser screenshot)'})
for frame in ['standard','tall','broad']:
 scene,rig=resetScene(frame)
 for c in cases:
  if c['frame']!=frame:continue
  setState(c['morphs']);outfit(False)
  for view,eye in [('FRONT',(0,-4.3,1.2)),('SIDE',(4.3,0,1.2)),('BACK',(0,4.3,1.2))]:capture(f"{c['route']}-{c['stage']}-{view}",eye)
 high=next(c for c in cases if c['frame']==frame and c['stage']==5)
 for clip,frameTime in [('FrontDoubleBiceps',25),('BackDoubleBiceps',25),('TrainingSquat',25),('SeatedPrepare',193)]:
  pose(rig,clip,frameTime,high['morphs'],high['body']['height']);outfit(clip in ['SeatedPrepare','TrainingSquat'])
  capture(f'exported-{frame}-{clip}',(0,-4.3,1.2),(0,0,1.04 if clip!='SeatedPrepare' else .8))
  if clip=='SeatedPrepare':capture(f'exported-{frame}-SeatedPrepare-SIDE',(4.3,0,1.2),(0,0,.8))
 combined={**high['morphs'],'bodyFat':.9,'leanDefinition':0,'fatSoftening':.9}
 pose(rig,'SeatedPrepare',193,combined,high['body']['height']);outfit(True)
 capture(f'exported-{frame}-HIGHFAT-SEATED',(1.1,-4,1.15),(0,0,.8));capture(f'exported-{frame}-HIGHFAT-SEATED-SIDE',(4.3,0,1.2),(0,0,.8))
 if frame=='standard':
  low=next(c for c in cases if c['route']=='A' and c['stage']==1);pose(rig,'GymIdle',1,low['morphs']);outfit(False)
  for view,eye in [('FRONT',(0,-.92,1.63)),('THREEQUARTER',(.58,-.72,1.63)),('SIDE',(.92,-.12,1.63)),('HAIR-BACK',(0,.84,1.67))]:capture('exported-face-'+view,eye,(0,-.03,1.63),True)
  pose(rig,'GymIdle',1,combined);capture('exported-face-HIGHFAT',(0,-.92,1.63),(0,-.03,1.63),True)
  skin=bpy.data.objects['BL_V2_AthleteBody'];original=list(skin.data.materials);clay=bpy.data.materials.new('QA_Clay');clay.use_nodes=True;p=clay.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.28,.31,.33,1);p.inputs['Roughness'].default_value=.8
  for i in range(len(skin.data.materials)):skin.data.materials[i]=clay
  for stage in [1,3,5]:
   c=next(c for c in cases if c['route']=='A' and c['stage']==stage);pose(rig,'GymIdle',1,c['morphs'])
   for view,eye in [('FRONT',(0,-4.3,1.2)),('SIDE',(4.3,0,1.2)),('BACK',(0,4.3,1.2))]:capture(f'exported-A{stage}-{view}-clay',eye)
(OUT/'exported-captures.json').write_text(json.dumps({'source':'actual exported v8 standard/tall/broad GLBs','normalisedHeightMetres':1.77,'renderer':'Blender 5.3 EEVEE; not browser or smartphone evidence','captures':captures},indent=2),encoding='utf8')
print('EXPORTED V8 60-VIEW MATRIX RENDERED',flush=True)
