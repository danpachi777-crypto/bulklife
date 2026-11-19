"""Author the same 16 career clips on the v2 anatomical rig, including fingers.
All tracks are bone transforms; growth/fat/pump targets are never animated.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
ROOT=Path('C:/Users/shota/Documents/BulkLife');scene=bpy.data.scenes['BULK_LIFE_Studio_v2'];bpy.context.window.scene=scene
rig=bpy.data.objects['BL_V2_Rig'];meta=json.loads((ROOT/'public/assets/regions-v2.json').read_text())
names=['Breathing','Idle','FrontDoubleBiceps','FrontLatSpread','SideChest','BackDoubleBiceps','BackLatSpread','SideTriceps','AbdominalsThigh','MostMuscular','TrainingPress','TrainingRow','TrainingSquat','StageEntry','ResultCelebrate','ResultReflect']
for name in names:
    old=bpy.data.actions.get(name)
    if old:old.name='V1_Preserved_'+name if not old.get('v2CareerClip') else 'V2_Previous_'+name
def reset():
    for p in rig.pose.bones:p.rotation_mode='QUATERNION';p.location=(0,0,0);p.rotation_quaternion=(1,0,0,0);p.scale=(1,1,1)
    bpy.context.view_layer.update()
def direction(name,d):
    p=rig.pose.bones[name];r=rig.data.bones[name];q=(r.tail_local-r.head_local).normalized().rotation_difference(Vector(d).normalized())
    p.matrix=Matrix.Translation(p.head.copy()) @ q.to_matrix().to_4x4() @ r.matrix_local.to_3x3().to_4x4();bpy.context.view_layer.update()
def rotate(name,axis,angle):
    r=rig.data.bones[name].matrix_local.to_3x3();rig.pose.bones[name].rotation_quaternion=Quaternion(r.inverted() @ Vector(axis),angle);bpy.context.view_layer.update()
def grounded():
    low=min(rig.pose.bones['foot.'+side].tail.z for side in ['L','R']);p=rig.pose.bones['root'];m=p.matrix.copy();m.translation.z+=.04-low;p.matrix=m;bpy.context.view_layer.update()
def arms(upper,lower):
    for s,side in [(-1,'R'),(1,'L')]:
        direction('upperArm.'+side,(s*upper[0],upper[1],upper[2]));direction('forearm.'+side,(s*lower[0],lower[1],lower[2]))
def curl(side,amount):
    # Authored knuckle envelopes, curled around the palm's transverse axis.
    for finger in range(1,6):
        for segment in range(1,4):
            name=f'finger{finger}-{segment}.{side}';factor=[.65,.85,.65][segment-1] if finger==1 else [.9,1.1,.8][segment-1]
            bone=rig.data.bones[name];axis=(bone.tail_local-bone.head_local).normalized().cross(Vector((0,-1,0))).normalized()
            r=bone.matrix_local.to_3x3();rig.pose.bones[name].rotation_quaternion=Quaternion(r.inverted() @ axis,amount*factor)
def pose(name,amount):
    reset()
    # A natural relaxed stance replaces the source mesh's wide A pose.
    for s,side in [(-1,'R'),(1,'L')]:
        direction('thigh.'+side,(s*.025,0,-1));direction('shin.'+side,(0,0,-1));direction('foot.'+side,(0,-1,-.46))
    arms((.17,-.02,-.985),(.10,-.04,-.99))
    for s,side in [(-1,'R'),(1,'L')]:direction('hand.'+side,(s*.03,-.025,-1));curl(side,.18)
    if name in ['FrontDoubleBiceps','BackDoubleBiceps']:
        arms((.96,0,.28),(-.10,-.12,.99))
        for side in ['L','R']:curl(side,1.05)
    elif name in ['FrontLatSpread','BackLatSpread']:
        arms((.59,0,-.81),(-.77,-.35,-.45))
        for side in ['L','R']:curl(side,.85)
    elif name=='SideChest':
        arms((.08,-.2,-.98),(-.72,-.35,.60));rotate('chest',(0,0,1),-.10)
        for side in ['L','R']:curl(side,.9)
    elif name=='SideTriceps':
        arms((.14,.22,-.97),(-.40,.32,-.86))
        for side in ['L','R']:curl(side,.85)
    elif name=='AbdominalsThigh':
        arms((.72,0,.69),(-.75,.12,.56));rotate('chest',(1,0,0),.06)
        for side in ['L','R']:curl(side,.40)
    elif name=='MostMuscular':
        rotate('chest',(1,0,0),.11);arms((.60,-.36,-.71),(-.72,-.50,.49))
        for side in ['L','R']:curl(side,1)
    elif name=='TrainingPress':
        arms((.85*(1-amount)+.23*amount,0,-.43*(1-amount)+.97*amount),(.06,-.06,.99))
        for side in ['L','R']:curl(side,.9)
    elif name=='TrainingRow':
        rotate('pelvis',(1,0,0),.10);rotate('spine',(1,0,0),.32);rotate('head',(1,0,0),-.12)
        arms((.19,-.55*(1-amount)+.25*amount,-.83*(1-amount)-.95*amount),(-.04,-.62*(1-amount)-.76*amount,-.77*(1-amount)+.65*amount))
        for side in ['L','R']:curl(side,.9)
    elif name=='TrainingSquat':
        rotate('pelvis',(1,0,0),.10*amount);rotate('chest',(1,0,0),.12*amount)
        for s,side in [(-1,'R'),(1,'L')]:
            direction('thigh.'+side,(s*.08,-.65*amount,-1+.25*amount));direction('shin.'+side,(0,.65*amount,-1+.25*amount));direction('foot.'+side,(0,-1,-.46))
        arms((.17,-.97,-.16),(-.10,-.99,-.02))
    elif name=='StageEntry':
        phase=amount*math.tau
        for s,side in [(-1,'R'),(1,'L')]:
            a=math.sin(phase)*s;direction('thigh.'+side,(s*.025,-.22*a,-1));direction('shin.'+side,(0,.12*max(0,-a),-1));direction('foot.'+side,(0,-1,-.46));direction('upperArm.'+side,(s*.19,.20*a,-1));direction('forearm.'+side,(s*.10,.12*a,-1))
    elif name=='ResultCelebrate':
        arms((.55,0,.84),(.10,0,.99))
        for side in ['L','R']:curl(side,.95)
        rotate('head',(1,0,0),-.05)
    elif name=='ResultReflect':rotate('head',(1,0,0),.10);rotate('chest',(1,0,0),.03)
    elif name in ['Breathing','Idle']:rotate('chest',(1,0,0),.006*math.sin(amount*math.tau))
    # Shoulder girdles elevate gently with the arm instead of stretching the axilla.
    if name in ['FrontDoubleBiceps','BackDoubleBiceps','AbdominalsThigh','ResultCelebrate','TrainingPress']:
        elevation=.035 if name!='TrainingPress' else .035*amount
        for s,side in [(-1,'R'),(1,'L')]:rotate('clavicle.'+side,(0,1,0),-s*elevation)
    if name.startswith('Back'):rotate('root',(0,0,1),math.pi)
    elif name in ['SideChest','SideTriceps']:rotate('root',(0,0,1),math.pi/2)
    grounded();bpy.context.view_layer.update()
made={}
for name in names:
    a=bpy.data.actions.new(name);a.use_fake_user=True;a['v2CareerClip']=True;rig.animation_data_create();rig.animation_data.action=a
    samples=[(1,0),(13,.25),(25,.5),(37,.75),(49,1)] if name in ['Breathing','Idle'] else [(1,0),(13,.5),(25,1),(37,.5),(49,0)] if name.startswith('Training') else [(1,0),(7,.125),(13,.25),(19,.375),(25,.5),(31,.625),(37,.75),(43,.875),(49,1)] if name=='StageEntry' else [(1,1),(49,1)]
    for frame,value in samples:
        scene.frame_set(frame);pose(name,value)
        for p in rig.pose.bones:p.keyframe_insert(data_path='location',frame=frame,group=p.name);p.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=p.name)
    made[name]=a
rig.animation_data.action=made['Breathing'];scene.frame_set(1);pose('Breathing',0)
meta['clips']=names;meta['restPose']='A-pose topology, Breathing/Idle uses relaxed stance';meta['handBones']=['handL','handR'];meta['bones']=len(rig.data.bones)
(ROOT/'public/assets/regions-v2.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v2.blend'))
print(json.dumps({'clips':names,'bones':len(rig.data.bones)}))
