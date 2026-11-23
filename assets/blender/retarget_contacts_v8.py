"""Bake contact-preserving two-bone IK into ordinary glTF bone animation.
Authoring constraints/targets never ship to the game. Frame proportions stay fixed.
"""
import bpy
from mathutils import Vector
def capture_contacts(rig):
 result={};scene=bpy.context.scene
 for clip,end,step in [('SeatedPrepare',733,4),('StandUp',37,2)]:
  action=bpy.data.actions[clip];rig.animation_data.action=action;frames={}
  for f in range(1,end+1,step):
   scene.frame_set(f);bpy.context.view_layer.update();frames[f]={name:rig.pose.bones[name].matrix.copy() for name in ['pelvis','foot.L','foot.R','hand.L','hand.R']}
  result[clip]=frames
 return result
def retarget_contacts(rig,reference,kind,oldRest):
 scene=bpy.context.scene;wide=1.075 if kind=='broad' else .955;report={}
 for clip,frames in reference.items():
  action=bpy.data.actions[clip];rig.animation_data.action=action;targets=[]
  # Match the bench height, retaining the original modest torso asymmetry.
  for frame,matrices in frames.items():
   scene.frame_set(frame);bpy.context.view_layer.update();bone=rig.pose.bones['pelvis'];matrix=bone.matrix.copy();p=matrices['pelvis'].translation.copy();p.x*=wide;matrix.translation=p;bone.matrix=matrix;bone.keyframe_insert('location',frame=frame,group='pelvis')
  for limb,endBone in [('shin','foot'),('forearm','hand')]:
   for side in ['L','R']:
    name=endBone+'.'+side;data=bpy.data.objects.new('V8_Contact_'+name,None);scene.collection.objects.link(data);targets.append(data);data.rotation_mode='QUATERNION'
    offset=rig.data.bones[name].head_local.z-oldRest[name].translation.z if endBone=='foot' else 0
    for frame,matrices in frames.items():
     matrix=matrices[name];p=matrix.translation.copy();p.x*=wide;p.z+=offset;data.location=p;data.rotation_quaternion=matrix.to_quaternion();data.keyframe_insert('location',frame=frame);data.keyframe_insert('rotation_quaternion',frame=frame)
    ik=rig.pose.bones[limb+'.'+side].constraints.new('IK');ik.name='V8_BakeContact';ik.target=data;ik.chain_count=2;ik.use_stretch=False;ik.iterations=100
    copy=rig.pose.bones[name].constraints.new('COPY_ROTATION');copy.name='V8_BakeOrientation';copy.target=data;copy.target_space='WORLD';copy.owner_space='WORLD'
  bpy.context.view_layer.objects.active=rig
  bpy.ops.object.select_all(action='DESELECT');rig.hide_set(False);rig.select_set(True)
  bpy.ops.object.mode_set(mode='POSE')
  bpy.ops.nla.bake(frame_start=min(frames),frame_end=max(frames),step=4 if clip=='SeatedPrepare' else 2,only_selected=False,visual_keying=True,clear_constraints=True,clear_parents=False,use_current_action=True,clean_curves=False,bake_types={'POSE'})
  bpy.ops.object.mode_set(mode='OBJECT')
  for target in targets:bpy.data.objects.remove(target,do_unlink=True)
  report[clip]={'samples':len(frames),'constraintsBakedAndRemoved':True}
 rig.animation_data.action=bpy.data.actions['GymIdle'];scene.frame_set(1)
 return report
