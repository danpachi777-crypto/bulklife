"""Pose-space muscle belly response, independently driven for each elbow.
No change to the simulation's mass, joints or muscle-growth targets.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[2]
assert bpy.data.filepath.endswith('bulk-life-athlete-v6-work.blend')
body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];keys=body.data.shape_keys.key_blocks;basis=keys[0]
for k in keys:k.value=0
rig.animation_data.action=bpy.data.actions['FrontDoubleBiceps'];bpy.context.scene.frame_set(25);bpy.context.view_layer.update()
report={}
for side in ['L','R']:
    name='elbowFlex'+side
    key=keys[name] if name in keys else body.shape_key_add(name=name)
    rest=rig.data.bones['upperArm.'+side];bone=rig.pose.bones[rest.name];axis=rest.tail_local-rest.head_local;count=0;maximum=0
    for i,v in enumerate(basis.data):
        key.data[i].co=v.co
        if (side=='L')!=(v.co.x>0):continue
        t=(v.co-rest.head_local).dot(axis)/axis.length_squared
        if not .08<t<.92:continue
        nearest=rest.head_local+axis*t
        if (v.co-nearest).length>.085:continue
        matrix=Matrix(((0,0,0,0),)*4);total=0
        for g in body.data.vertices[i].groups:
            n=body.vertex_groups[g.group].name
            if n in rig.pose.bones:matrix+=(rig.pose.bones[n].matrix@rig.data.bones[n].matrix_local.inverted())*g.weight;total+=g.weight
        if not total:continue
        matrix*=1/total;posed=matrix@v.co;centre=bone.head+(bone.tail-bone.head)*t;radial=posed-centre
        direction=(bone.tail-bone.head).normalized();radial-=direction*radial.dot(direction)
        if radial.length<.005:continue
        front=max(0,min(1,(-v.co.y+.015)/.075));bell=math.sin(math.pi*t)**2
        movement=radial.normalized()*(.004+.006*front)*bell
        delta=matrix.inverted_safe().to_3x3()@movement
        if delta.length>.014:delta*=.014/delta.length
        key.data[i].co=v.co+delta;maximum=max(maximum,delta.length);count+=1
    report[name]={'vertices':count,'maxBindDisplacementMetres':maximum,'driver':'same-side elbow angle; onset 0.35 radians, full at 1.70 radians'}
body.data.update();rig.animation_data.action=bpy.data.actions['GymIdle'];bpy.context.scene.frame_set(1)
(ROOT/'docs/qa/decisions-v6/elbow-corrections.json').write_text(json.dumps(report,indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v6-work.blend'))
