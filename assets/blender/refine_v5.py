"""v5 duplicate only: supported palms, continuous shoulder corrective, softer transitions.
No v2/v3/v4 authoring file is opened for writing.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
ROOT=Path('C:/Users/shota/Documents/BulkLife')
assert bpy.data.filepath.endswith('bulk-life-athlete-v5-work.blend')
scene=bpy.data.scenes['BULK_LIFE_Studio_v2'];rig=bpy.data.objects['BL_V2_Rig'];body=bpy.data.objects['BL_V2_AthleteBody']
if bpy.context.window:bpy.context.window.scene=scene
source=(ROOT/'assets/blender/animate_athlete_v2.py').read_text(encoding='utf-8');exec(source[source.index('def reset():'):source.index('made={}')])
keys=body.data.shape_keys.key_blocks;basis=keys[0]
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def gauss(v,c,r):return math.exp(-2*((v-c)/r)**2)
def vframe(long,width):
    y=long.normalized();x=(width-y*width.dot(y)).normalized();z=x.cross(y).normalized();return Matrix((x,y,z)).transposed()
def palm_frame(side):
    wrist=rig.data.bones['hand.'+side].head_local
    middle=rig.data.bones['finger3-1.'+side].head_local
    index=rig.data.bones['finger2-1.'+side].head_local
    pinky=rig.data.bones['finger5-1.'+side].head_local
    return vframe(middle-wrist,index-pinky)
def relaxed_fingers(side,amount):
    frame=palm_frame(side);normal=frame.col[2]
    for f in range(1,6):
        for segment in range(1,4):
            name=f'finger{f}-{segment}.{side}';r=rig.data.bones[name];long=(r.tail_local-r.head_local).normalized();axis=long.cross(normal).normalized()
            if f==1:angle=amount*.35
            else:angle=amount*[.75,1,.85,.65][f-2]*[.45,.7,.45][segment-1]
            rig.pose.bones[name].rotation_quaternion=Quaternion(r.matrix_local.to_3x3().inverted()@axis,angle)
    bpy.context.view_layer.update()
def idle(t):
    pose('Idle',t)
    for sign,side in [(-1,'R'),(1,'L')]:
        direction('upperArm.'+side,(sign*(.13 if side=='L' else .16),-.035,-.99));direction('forearm.'+side,(sign*.045,-.07,-.998));curl(side,.22 if side=='L' else .29)
    rotate('head',(0,0,1),-.025+.014*math.sin(t*math.tau));rig.pose.bones['chest'].scale.y=1+.0025*math.sin(t*math.tau*5);grounded()
def supported(side,target):
    sign=1 if side=='L' else -1;upper=rig.pose.bones['upperArm.'+side];lower=rig.pose.bones['forearm.'+side]
    a=upper.head.copy();u=target-a;distance=min(u.length,upper.length+lower.length-.003);axis=u.normalized();l1,l2=upper.length,lower.length
    along=(l1*l1-l2*l2+distance*distance)/(2*distance);height=math.sqrt(max(0,l1*l1-along*along));pole=Vector((sign*.30,.45,-1));pole-=axis*pole.dot(axis);pole.normalize();elbow=a+axis*along+pole*height
    direction('upperArm.'+side,elbow-a);direction('forearm.'+side,target-rig.pose.bones['forearm.'+side].head)
    hand=rig.pose.bones['hand.'+side];rest=rig.data.bones['hand.'+side]
    targetLong=Vector((sign*.045,-1,-.17 if side=='L' else -.12))
    targetWidth=Vector((1 if side=='L' else -1,0,0))
    desired=vframe(targetLong,targetWidth)
    # Dorsal side faces up for both hands, with source handedness retained.
    if desired.col[2].z>0:desired=vframe(targetLong,-targetWidth)
    src=palm_frame(side)
    if src.col[2].dot(Vector((0,-1,0)))<0:src=vframe(src.col[1],-src.col[0])
    rotation=desired@src.inverted();hand.matrix=Matrix.Translation(hand.head)@rotation.to_4x4()@rest.matrix_local.to_3x3().to_4x4();bpy.context.view_layer.update();relaxed_fingers(side,.18 if side=='L' else .25)
def seated(t):
    idle(0)
    for sign,side in [(-1,'R'),(1,'L')]:
        direction('thigh.'+side,(sign*(.13 if side=='L' else .16),-1,-.08));direction('shin.'+side,(0,.10,-1));direction('foot.'+side,(0,-1,-.46))
    rotate('chest',(1,0,0),.055);grounded()
    for sign,side in [(-1,'R'),(1,'L')]:
        thigh=rig.pose.bones['thigh.'+side];target=thigh.head.lerp(thigh.tail,.57 if side=='L' else .60)+Vector((sign*.006,-.005,.135));supported(side,target)
    rotate('head',(1,0,0),.055*(1-smooth(t/.2))+.025);rotate('head',(0,0,1),-.04+.01*math.sin(t*math.tau));rig.pose.bones['chest'].scale.y=1+.0025*math.sin(t*math.tau*5)
def capture():return {p.name:(p.location.copy(),p.rotation_quaternion.copy(),p.scale.copy()) for p in rig.pose.bones}
for name,length in [('GymIdle',733),('SeatedPrepare',733),('StandUp',37)]:
    if bpy.data.actions.get(name):bpy.data.actions[name].name='V4_Preserved_'+name
    action=bpy.data.actions.new(name);action.use_fake_user=True;action['v5CareerClip']=True;rig.animation_data.action=action
    if name=='StandUp':seated(1);start=capture();idle(0);end=capture()
    for frame in (range(1,length+1,12) if name!='StandUp' else range(1,38,3)):
        scene.frame_set(frame);t=(frame-1)/(length-1)
        if name=='GymIdle':idle(t)
        elif name=='SeatedPrepare':seated(t)
        else:
            k=smooth(t)
            for p in rig.pose.bones:
                a,q,s=start[p.name];b,r,ss=end[p.name];p.location=a.lerp(b,k);p.rotation_quaternion=q.slerp(r,k);p.scale=s.lerp(ss,k)
            bpy.context.view_layer.update();grounded()
        for p in rig.pose.bones:
            for prop in ['location','rotation_quaternion','scale']:p.keyframe_insert(prop,frame=frame,group=p.name)

# Broader distal thigh transition; subtle radial bone landmarks in all body keys.
for i,p in enumerate(basis.data):
    x,y,z=p.co;ax=abs(x);sign=1 if x>=0 else -1;delta=Vector()
    delta.x+=sign*.0035*gauss(z,.59,.10)*gauss(ax,.13,.10)
    delta.y+=.002*gauss(z,1.31,.14)*gauss(ax,.08,.09)*smooth((y-.03)/.07)
    for key in keys:key.data[i].co+=delta
    for name in ['frontDelts','sideDelts','rearDelts','biceps','triceps']:
        key=keys[name];joint=gauss(ax,.20,.065)*gauss(z,1.40,.09)
        key.data[i].co=basis.data[i].co+(key.data[i].co-basis.data[i].co)*(1-.20*joint)

# Pose-space corrective is authored from the deformed continuous surface and
# inverse-skinned back to rest. It does not replace the independent growth keys.
coverage=body.modifiers.get('V4_OutfitCoverage')
if coverage:coverage.show_viewport=False;coverage.show_render=False
for k in keys:k.value=0
rig.animation_data.action=bpy.data.actions['FrontDoubleBiceps'];scene.frame_set(25);bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get();ev=body.evaluated_get(deps);mesh=ev.to_mesh();original=[v.co.copy() for v in mesh.vertices];ev.to_mesh_clear()
neighbors=[set() for _ in original]
for edge in body.data.edges:a,b=edge.vertices;neighbors[a].add(b);neighbors[b].add(a)
desired=original[:]
for step in range(3):
    new=desired[:]
    for i,v in enumerate(basis.data):
        x,y,z=v.co;mask=gauss(abs(x),.195,.075)*gauss(z,1.365,.095)
        if mask>.04 and neighbors[i]:new[i]=desired[i].lerp(sum((desired[j] for j in neighbors[i]),Vector())/len(neighbors[i]),.35*mask)
    desired=new
corrective=body.shape_key_add(name='shoulderRaise',from_mix=False);maximum=0
for i,v in enumerate(basis.data):
    matrix=Matrix(((0,0,0,0),)*4);total=0
    for g in body.data.vertices[i].groups:
        name=body.vertex_groups[g.group].name
        if name not in rig.pose.bones:continue
        matrix+=(rig.pose.bones[name].matrix@rig.data.bones[name].matrix_local.inverted())*g.weight;total+=g.weight
    if total:matrix*=1/total;rest=matrix.inverted_safe()@desired[i];delta=rest-v.co
    else:delta=Vector()
    if delta.length>.012:delta*=.012/delta.length
    corrective.data[i].co=v.co+delta;maximum=max(maximum,delta.length)
corrective.slider_min=0;corrective.slider_max=1
body['v5ShoulderCorrectiveMax']=maximum
body.data.update()
rig.location=(0,0,0);rig.animation_data.action=bpy.data.actions['GymIdle'];scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v5-work.blend'))
qa=(ROOT/'assets/blender/qa_portrait_v4.py').read_text().replace("OUT=ROOT/'docs/qa/coach-portrait-v4'","OUT=ROOT/'docs/qa/consistency-v5'")
exec(qa);setup()
try:scene.render.engine='BLENDER_EEVEE'
except TypeError:pass
state(wear=True,clip='SeatedPrepare',frame=193);keys['shoulderRaise'].value=0;render('after-seat',(1.1,-4,1.15),(0,.2,.75));render('after-hands',(.45,-1.4,1.2),(0,-.2,.75),True)
state(.65,0,False,'FrontDoubleBiceps',25);keys['shoulderRaise'].value=1;render('after-pose')
state();keys['shoulderRaise'].value=0;render('after-front');render('after-side',(4.3,0,1.2));render('after-back',(0,4.3,1.2))
print('V5 refinement and controlled comparisons complete',flush=True)
