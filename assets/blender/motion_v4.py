"""Rest poses with relaxed fingers, asymmetric weight and thigh-supported hands."""
import bpy,math
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
ROOT=Path('C:/Users/shota/Documents/BulkLife');scene=bpy.data.scenes['BULK_LIFE_Studio_v2'];rig=bpy.data.objects['BL_V2_Rig'];body=bpy.data.objects['BL_V2_AthleteBody']
s=(ROOT/'assets/blender/animate_athlete_v2.py').read_text(encoding='utf-8');exec(s[s.index('def reset():'):s.index('made={}')])
def smooth(t):
    t=max(0,min(1,t));return t*t*(3-2*t)
def fingers(side,amount):
    curl(side,amount*.65)
    for f in range(1,6):
        for segment in range(1,4):
            p=rig.pose.bones[f'finger{f}-{segment}.{side}'];p.rotation_quaternion=p.rotation_quaternion.slerp(Quaternion(),[.22,.16,.28,.20,.25][f-1])
def idle(t):
    pose('Idle',0)
    for sign,side in [(-1,'R'),(1,'L')]:
        direction('upperArm.'+side,(sign*(.10 if side=='L' else .14),-.035,-.99));direction('forearm.'+side,(sign*.035,-.05,-.998));fingers(side,.37 if side=='L' else .30)
    p=rig.pose.bones['root'];m=p.matrix.copy();m.translation.x+=.007;m.translation.y+=.002;p.matrix=m
    rotate('head',(0,0,1),.035*math.sin(t*math.tau)-.025)
    rig.pose.bones['chest'].scale.y=1+.0027*math.sin(t*math.tau*5)
    grounded()
def supported_arm(side,target):
    sign=1 if side=='L' else -1;upper=rig.pose.bones['upperArm.'+side];lower=rig.pose.bones['forearm.'+side]
    a=upper.head.copy();u=target-a;distance=min(u.length,upper.length+lower.length-.005);axis=u.normalized();l1,l2=upper.length,lower.length
    along=(l1*l1-l2*l2+distance*distance)/(2*distance);height=math.sqrt(max(0,l1*l1-along*along));pole=Vector((sign, .1,-.08));pole-=axis*pole.dot(axis);pole.normalize();elbow=a+axis*along+pole*height
    direction('upperArm.'+side,elbow-a);direction('forearm.'+side,target-rig.pose.bones['forearm.'+side].head)
    handDirection=Vector((sign*.03,-1,-.08));direction('hand.'+side,handDirection)
    p=rig.pose.bones['hand.'+side];m=p.matrix.copy();p.matrix=Matrix.Translation(p.head) @ Quaternion(handDirection,math.pi).to_matrix().to_4x4() @ m.to_3x3().to_4x4();bpy.context.view_layer.update();fingers(side,.15)
def seated(t):
    idle(0)
    for sign,side in [(-1,'R'),(1,'L')]:
        direction('thigh.'+side,(sign*(.13 if side=='L' else .15),-1,-.08));direction('shin.'+side,(0,.10,-1));direction('foot.'+side,(0,-1,-.46))
    rotate('chest',(1,0,0),.065);grounded()
    for sign,side in [(-1,'R'),(1,'L')]:
        thigh=rig.pose.bones['thigh.'+side];target=thigh.head.lerp(thigh.tail,.60)+Vector((sign*.006,-.015,.145));supported_arm(side,target)
    rotate('head',(1,0,0),.10*(1-smooth(t/.20))+.028)
    q=rig.pose.bones['head'].rotation_quaternion.copy();rotate('head',(0,0,1),-.055+.018*math.sin(t*math.tau));rig.pose.bones['head'].rotation_quaternion=q @ rig.pose.bones['head'].rotation_quaternion
    rig.pose.bones['chest'].scale.y=1+.0025*math.sin(t*math.tau*5)
def capture():return {p.name:(p.location.copy(),p.rotation_quaternion.copy(),p.scale.copy()) for p in rig.pose.bones}
for name,length in [('GymIdle',733),('SeatedPrepare',733),('StandUp',37)]:
    old=bpy.data.actions.get(name)
    if old:old.name='V3_Previous_'+name
    action=bpy.data.actions.new(name);action.use_fake_user=True;action['v3CareerClip']=True;action['v4CareerClip']=True;rig.animation_data.action=action
    if name=='StandUp':seated(1);start=capture();idle(0);end=capture()
    for frame in (range(1,length+1,12) if name!='StandUp' else range(1,38,3)):
        scene.frame_set(frame);t=(frame-1)/(length-1)
        if name=='GymIdle':idle(t)
        elif name=='SeatedPrepare':seated(t)
        else:
            k=smooth(t)
            for p in rig.pose.bones:
                a,q,sc=start[p.name];b,r,ss=end[p.name];p.location=a.lerp(b,k);p.rotation_quaternion=q.slerp(r,k);p.scale=sc.lerp(ss,k)
            bpy.context.view_layer.update();grounded()
        for p in rig.pose.bones:
            p.keyframe_insert('location',frame=frame,group=p.name);p.keyframe_insert('rotation_quaternion',frame=frame,group=p.name);p.keyframe_insert('scale',frame=frame,group=p.name)
rig.animation_data.action=bpy.data.actions['GymIdle'];scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v4-final.blend'))
print('Authored supported hand poses and relaxed long idle clips')
