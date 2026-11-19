"""BULK LIFE career animation / original environment authoring.
Run in the existing Blender file. Keeps the 17-bone/18-morph body contract.
"""
import bpy, math, json, shutil
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
ROOT=Path('C:/Users/shota/Documents/BulkLife');OUT=ROOT/'public/assets';OUT.mkdir(parents=True,exist_ok=True)
rig=bpy.data.objects['BL_AthleteRig'];body=bpy.data.objects['BL_AthleteBody'];studio=bpy.data.scenes['BULK_LIFE_Studio_v1']
bpy.context.window.scene=studio
if studio.get('careerAssetsCreated'):
    raise RuntimeError('Career assets already authored. Use export_career_assets.py to re-export safely.')
backup=ROOT/'assets/blender/bulk-life-before-career-assets.blend'
if not backup.exists():shutil.copy2(ROOT/'assets/blender/bulk-life-athlete-v1.blend',backup)

# Subtle shape refinement applied equally to Basis and every existing target.
# This keeps all target names, deltas, skeletal data and saved-athlete identity.
if not body.get('careerRefinement'):
    for i,v in enumerate(body.data.vertices):
        x,y,z=v.co
        w=math.exp(-2*((abs(x)-.10)**2/.09**2+(z-1.35)**2/.075**2)) if y<-.07 else 0
        delta=Vector((0,.008*w,0))
        for key in body.data.shape_keys.key_blocks:key.data[i].co+=delta
    for o in bpy.data.collections['BULK_LIFE_Athlete_v1'].objects:
        if o.name.startswith(('EyeWhite','Iris')):o.scale*=.82
    body['careerRefinement']='subtle-pec-and-eyes-v1'
    body.data.update()

def reset_pose():
    for p in rig.pose.bones:
        p.rotation_mode='QUATERNION';p.location=(0,0,0);p.rotation_quaternion=(1,0,0,0);p.scale=(1,1,1)
    bpy.context.view_layer.update()

def direction(name,desired):
    """Set a bone direction in athlete-local coordinates, preserving rest roll."""
    p=rig.pose.bones[name];rest=rig.data.bones[name]
    current_head=p.head.copy();q=(rest.tail_local-rest.head_local).normalized().rotation_difference(Vector(desired).normalized())
    p.matrix=Matrix.Translation(current_head) @ q.to_matrix().to_4x4() @ rest.matrix_local.to_3x3().to_4x4()
    bpy.context.view_layer.update()

def local_rotation(name,axis,angle):
    rest=rig.data.bones[name].matrix_local.to_3x3()
    local_axis=rest.inverted() @ Vector(axis)
    rig.pose.bones[name].rotation_quaternion=Quaternion(local_axis,angle);bpy.context.view_layer.update()

def arms(upper,lower):
    for s,side in [(-1,'R'),(1,'L')]:
        direction('upperArm.'+side,(s*upper[0],upper[1],upper[2]));direction('forearm.'+side,(s*lower[0],lower[1],lower[2]))

def feet_to_ground():
    bpy.context.view_layer.update();low=min(rig.pose.bones['foot.'+side].tail.z for side in ['R','L'])
    root=rig.pose.bones['root'];matrix=root.matrix.copy();matrix.translation.z+=.05-low;root.matrix=matrix;bpy.context.view_layer.update()

def posed(name,amount=1):
    reset_pose()
    if name in ['FrontDoubleBiceps','BackDoubleBiceps']:
        arms((.95,0,.30),(.12,-.13,.98))
    elif name in ['FrontLatSpread','BackLatSpread']:
        arms((.60,0,-.80),(-.75,-.40,-.40))
    elif name=='SideChest':
        arms((.10,-.20,-.97),(-.70,-.35,.62));local_rotation('chest',(0,0,1),-.12)
    elif name=='SideTriceps':
        arms((.15,.27,-.95),(-.43,.35,-.82))
    elif name=='AbdominalsThigh':
        arms((.72,0,.69),(-.70,.15,.55));local_rotation('chest',(1,0,0),.07)
        direction('thigh.L',(.05,-.10,-.99));direction('shin.L',(0,.08,-.99));direction('foot.L',(0,-1,-.46));feet_to_ground()
    elif name=='MostMuscular':
        local_rotation('chest',(1,0,0),.16);arms((.62,-.35,-.70),(-.70,-.50,.51))
    elif name=='TrainingPress':
        arms((.86*(1-amount)+.24*amount,0,-.42*(1-amount)+.97*amount),(.08,-.08,.99))
    elif name=='TrainingRow':
        local_rotation('pelvis',(1,0,0),.10);local_rotation('spine',(1,0,0),.36);local_rotation('head',(1,0,0),-.18)
        arms((.20,-.55*(1-amount)+.27*amount,-.82*(1-amount)-.95*amount),(-.04,-.62*(1-amount)-.76*amount,-.77*(1-amount)+.64*amount))
    elif name=='TrainingSquat':
        a=amount
        local_rotation('pelvis',(1,0,0),.12*a);local_rotation('chest',(1,0,0),.13*a)
        for s,side in [(-1,'R'),(1,'L')]:
            direction('thigh.'+side,(s*.08,-.65*a,-1+.25*a));direction('shin.'+side,(0,.65*a,-1+.25*a));direction('foot.'+side,(0,-1,-.46))
        arms((.18,-.97,-.16),(-.12,-.99,-.02));feet_to_ground()
    elif name=='StageEntry':
        phase=amount*math.tau
        for s,side in [(-1,'R'),(1,'L')]:
            a=math.sin(phase)*s
            direction('thigh.'+side,(s*.02,-.22*a,-1));direction('shin.'+side,(0,.12*max(0,-a),-1));direction('foot.'+side,(0,-1,-.46))
            direction('upperArm.'+side,(s*.3,.20*a,-1));direction('forearm.'+side,(s*.1,.12*a,-1))
        feet_to_ground()
    elif name=='ResultCelebrate':
        arms((.55,0,.84),(.12,0,.99));local_rotation('head',(1,0,0),-.08)
    elif name=='ResultReflect':
        local_rotation('head',(1,0,0),.12);local_rotation('chest',(1,0,0),.045)
    elif name in ['Idle','Breathing']:
        local_rotation('chest',(1,0,0),.008*math.sin(amount*math.tau))
    if name.startswith('Back'):local_rotation('root',(0,0,1),math.pi)
    if name in ['SideChest','SideTriceps']:local_rotation('root',(0,0,1),math.pi/2)
    bpy.context.view_layer.update()

def action(name,samples):
    old=bpy.data.actions.get(name)
    if old:
        if rig.animation_data and rig.animation_data.action==old:rig.animation_data.action=None
        # Keep an editable backup instead of deleting a user's action.
        old.name='Archived_'+name
    a=bpy.data.actions.new(name);a.use_fake_user=True
    rig.animation_data_create();rig.animation_data.action=a
    for frame,amount in samples:
        studio.frame_set(frame);posed(name,amount)
        for p in rig.pose.bones:
            p.keyframe_insert(data_path='location',frame=frame,group=p.name)
            p.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=p.name)
    return a

pose_names=['FrontDoubleBiceps','FrontLatSpread','SideChest','BackDoubleBiceps','BackLatSpread','SideTriceps','AbdominalsThigh','MostMuscular']
made={}
for name in ['Breathing','Idle']:made[name]=action(name,[(1,0),(13,.25),(25,.5),(37,.75),(49,1)])
for name in pose_names:made[name]=action(name,[(1,1),(49,1)])
for name in ['TrainingPress','TrainingRow','TrainingSquat']:made[name]=action(name,[(1,0),(13,.5),(25,1),(37,.5),(49,0)])
made['StageEntry']=action('StageEntry',[(1,0),(7,.125),(13,.25),(19,.375),(25,.5),(31,.625),(37,.75),(43,.875),(49,1)])
for name in ['ResultCelebrate','ResultReflect']:made[name]=action(name,[(1,1),(49,1)])
rig.animation_data.action=made['Breathing'];studio.frame_start=1;studio.frame_end=49;studio.frame_set(1);reset_pose()

import io_scene_gltf2
props=bpy.ops.export_scene.gltf.get_rna_type().properties
fmt=next(x[0] for x in io_scene_gltf2.get_format_items(studio,bpy.context) if '.glb' in x[1])
def export_collection(collection,path,animate=False):
    bpy.ops.object.select_all(action='DESELECT')
    for o in collection.all_objects:
        if not o.hide_render:o.select_set(True)
    if animate:bpy.context.view_layer.objects.active=rig
    kwargs=dict(filepath=str(OUT/path),export_format=fmt,use_selection=True,use_active_scene=True,export_skins=True,export_morph=True,export_animations=animate,export_extras=True)
    if animate:
        modes=[x.identifier for x in props['export_animation_mode'].enum_items]
        kwargs['export_animation_mode']=next(x for x in modes if x=='ACTIONS')
        if 'export_action_filter' in props:
            from types import SimpleNamespace
            io_scene_gltf2.on_export_action_filter_changed(SimpleNamespace(export_action_filter=True),bpy.context)
            for item in bpy.data.scenes[0].gltf_action_filter:item.keep=item.action.name in made
            kwargs['export_action_filter']=True
    bpy.ops.export_scene.gltf(**kwargs)
export_collection(bpy.data.collections['BULK_LIFE_Athlete_v1'],'athlete-v1.glb',True)

def material(name,c,metal=0,rough=.6,emission=0):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*c,1)
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if emission:
        socket=next((s for s in p.inputs if 'Emission Color'==s.name),None)
        if socket:socket.default_value=(*c,1)
        strength=next((s for s in p.inputs if 'Emission Strength'==s.name),None)
        if strength:strength.default_value=emission
    return m
metal=material('BL_EquipmentMetal',(.16,.19,.18),.8,.35);rubber=material('BL_EquipmentRubber',(.025,.032,.03),0,.9)
gold=material('BL_StageGold',(.45,.31,.10),.6,.35);lightmat=material('BL_StageStrip',(.85,.75,.45),0,.4,2)

def new_scene(name):
    if name in bpy.data.scenes:
        raise RuntimeError('Career environment exists; inspect before rebuilding: '+name)
    sc=bpy.data.scenes.new(name);bpy.context.window.scene=sc
    c=bpy.data.collections.new(name+'_Geometry');sc.collection.children.link(c)
    sc.world=studio.world
    return sc,c
def link(obj,c,name,mat):
    for col in list(obj.users_collection):col.objects.unlink(obj)
    c.objects.link(obj);obj.name=name
    if mat:obj.data.materials.append(mat)
    return obj
def cube(c,n,loc,scale,m,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=link(bpy.context.object,c,n,m);o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('SoftEdges','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def cylinder(c,n,loc,r,depth,m,axis='Z'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=depth,location=loc);o=link(bpy.context.object,c,n,m)
    if axis=='X':o.rotation_euler.y=math.pi/2
    if axis=='Y':o.rotation_euler.x=math.pi/2
    for p in o.data.polygons:p.use_smooth=True
    return o
def text_obj(c,n,text,loc,size,m):
    curve=bpy.data.curves.new(n,'FONT');curve.body=text;curve.size=size;curve.align_x='CENTER';curve.extrude=.002
    o=bpy.data.objects.new(n,curve);c.objects.link(o);o.location=loc;o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(m)
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target=next(x.identifier for x in bpy.ops.object.convert.get_rna_type().properties['target'].enum_items if x.identifier=='MESH'));return bpy.context.object

stages=[('tokyo','TOKYO',(.04,.12,.10)),('japan-class','JAPAN CLASS',(.055,.11,.14)),('japan-men','JAPAN CHAMPIONSHIP',(.08,.09,.08)),('ifbb-world','WORLD CHAMPIONSHIP',(.025,.06,.15)),('mid-japan','MID JAPAN',(.10,.035,.06)),('amateur-olympia','AMATEUR CHAMPIONSHIP',(.08,.035,.12)),('new-york-pro','NEW YORK',(.025,.035,.055)),('olympia','WORLD STAGE',(.025,.025,.02))]
stage_info=[]
for slug,title,color in stages:
    sc,c=new_scene('BL_Stage_'+slug);mainmat=material('BL_Stage_'+slug+'_Color',color,0,.7)
    cube(c,'Platform',(0,0,-.12),(10,7,.24),rubber,.04)
    cube(c,'Backdrop',(0,6.5,1.8),(16,.12,3.6),mainmat)
    cube(c,'GoldHeader',(0,6.38,3.25),(9,.06,.035),gold)
    cube(c,'FootlightFront',(0,-2.5,.025),(8,.05,.045),lightmat,.01)
    for s in [-1,1]:
        cube(c,'StagePillar',(s*4,3,1.8),(.18,.18,3.6),metal)
        for z in [.8,1.5,2.2,2.9]:cylinder(c,'SpotFixture',(s*3.65,2.95,z),.12,.16,metal,'Y')
        cube(c,'SideGold',(s*3.8,6.38,1.75),(.04,.05,2.8),gold)
    cube(c,'Truss',(0,3,3.5),(8,.18,.18),metal)
    text_obj(c,'OriginalTitle','BULK LIFE',(0,6.36,2.25),.55,gold)
    text_obj(c,'EventCaption',title,(0,6.34,1.7),.22,gold)
    for x,h,label in [(0,.45,'1'),(-1.0,.3,'2'),(1.0,.2,'3')]:
        cube(c,'Podium_'+label,(x,1.9,h/2),(.85,.75,h),mainmat,.025)
        text_obj(c,'PodiumNumber_'+label,label,(x,1.51,h*.25),.18,gold)
    c['originalDesign']=True;c['seriesVisual']=slug
    export_collection(c,'stage-'+slug+'-v1.glb')
    stage_info.append({'id':slug,'url':'/assets/stage-'+slug+'-v1.glb','ground':0,'athletePosition':[0,0,0],'front':'+Z (glTF)','notice':'Independent original environment, not an official venue reproduction'})

sc,c=new_scene('BL_GymEnvironment')
floor=material('BL_GymFloor',(.055,.07,.06),0,.95);benchmat=material('BL_BenchPad',(.04,.09,.09),0,.85)
cube(c,'GymFloor',(0,0,-.07),(12,12,.14),floor)
for s in [-1,1]:
    cube(c,'RackUpright',(s*.65,1.6,1.2),(.07,.07,2.4),metal)
    cube(c,'RackFoot',(s*.65,1.6,.05),(.12,1,.1),metal)
cube(c,'RackTop',(0,1.6,2.35),(1.4,.07,.07),metal)
cube(c,'BenchPad',(0,1.1,.49),(.38,1.2,.10),benchmat,.04)
for y in [.7,1.5]:cube(c,'BenchLeg',(0,y,.24),(.08,.08,.45),metal)
cylinder(c,'BarbellShaft',(0,1.55,1.4),.014,2.0,metal,'X')
for s in [-1,1]:
    for x,r in [(s*.79,.22),(s*.86,.18)]:cylinder(c,'WeightPlate',(x,1.55,1.4),r,.055,rubber,'X')
    cube(c,'CableTower',(s*2.5,1,1.25),(.16,.25,2.5),metal)
    cube(c,'WeightStack',(s*2.5,1,.5),(.4,.32,.8),rubber)
cube(c,'CableTop',(0,1,2.45),(5.15,.2,.12),metal)
cube(c,'DumbbellShelf',(2.4,-.3,.75),(1.6,.55,.08),metal)
for y in [-.5,-.1]:
    for x in [1.9,2.4,2.9]:
        cylinder(c,'DumbbellHandle',(x,y,.82),.014,.25,metal,'X')
        for sign in [-1,1]:cylinder(c,'DumbbellHead',(x+sign*.13,y,.82),.07,.06,rubber,'X')
export_collection(c,'gym-v1.glb')
sc,c=new_scene('BL_DumbbellGrip')
cylinder(c,'GripHandle',(0,0,0),.014,.13,metal,'X')
for s in [-1,1]:cylinder(c,'GripWeight',(s*.105,0,0),.065,.07,rubber,'X')
export_collection(c,'dumbbell-v1.glb')

(OUT/'career-assets-v1.json').write_text(json.dumps({'version':'career-assets-v1','athlete':'/assets/athlete-v1.glb','clips':list(made),'mandatoryPoses':pose_names[:7],'additionalPose':'MostMuscular','equipment':{'gym':'/assets/gym-v1.glb','dumbbell':'/assets/dumbbell-v1.glb','dumbbellAttachment':'Clone onto handL/handR bone, local [0,0.04,0]; display during TrainingPress/TrainingRow only'},'stages':stage_info},indent=2),encoding='utf-8')
bpy.context.window.scene=studio;rig.animation_data.action=made['Breathing'];studio.frame_set(1);reset_pose()
studio['careerAssetsCreated']='career-assets-v1'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v1.blend'))
print(json.dumps({'clips':list(made),'stages':len(stages),'bodyBones':len(rig.data.bones),'bodyMorphs':len(body.data.shape_keys.key_blocks)-1}))
