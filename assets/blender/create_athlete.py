"""BULK LIFE original parametric base. Run inside live Blender. Non-destructive to other scenes."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife')
OUT=ROOT/'public/assets'; OUT.mkdir(parents=True,exist_ok=True)
SCENE='BULK_LIFE_Studio_v1'
if SCENE in bpy.data.scenes:
    raise RuntimeError('Dedicated scene already exists. Inspect it before rebuilding.')
original=bpy.context.scene
if not bpy.data.filepath:
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/before_bulk_life.blend'))
scene=bpy.data.scenes.new(SCENE); bpy.context.window.scene=scene
collection=bpy.data.collections.new('BULK_LIFE_Athlete_v1');scene.collection.children.link(collection)
def move(o):
    for col in list(o.users_collection):col.objects.unlink(o)
    collection.objects.link(o)
    return o
def mat(name,color,rough=.6,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    return m
skin=mat('BL_Skin_warm',(.48,.26,.15),.58);hair=mat('BL_Hair',(.028,.023,.018),.85)
shortmat=mat('BL_Shorts',(.035,.09,.095),.88);white=mat('BL_Eye',(.78,.74,.65),.5);dark=mat('BL_Iris',(.025,.02,.017),.5)
parts=[]
def ell(name,loc,scale,material=None,body=False):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=loc)
    o=move(bpy.context.object);o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if material:o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    if body:parts.append(o)
    return o
def rings(name,rs):
    verts=[];faces=[];n=48
    for z,rx,ry,cy in rs:
        for i in range(n):
            t=i*math.tau/n;verts.append((rx*math.cos(t),cy+ry*math.sin(t),z))
    for j in range(len(rs)-1):
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    faces.extend([tuple(range(n-1,-1,-1)),tuple((len(rs)-1)*n+i for i in range(n))])
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);collection.objects.link(o);parts.append(o);return o
rings('Torso',[(.83,.09,.075,0),(.93,.15,.105,0),(1.02,.142,.092,0),(1.12,.13,.082,0),(1.22,.16,.095,0),(1.34,.194,.108,0),(1.43,.205,.097,.005),(1.49,.15,.07,.015),(1.52,.065,.055,.01)])
ell('Neck',(0,.008,1.525),(.058,.056,.10),body=True)
ell('Head',(0,-.003,1.66),(.079,.081,.109),body=True)
ell('Jaw',(0,-.018,1.61),(.068,.066,.058),body=True)
ell('Nose',(0,-.083,1.652),(.018,.025,.033),body=True)
for s in [-1,1]:
    ell('Pectoral',(s*.095,-.079,1.355),(.097,.045,.065),body=True)
    ell('Lat',(s*.15,.018,1.29),(.051,.085,.113),body=True)
    ell('Shoulder',(s*.216,0,1.422),(.068,.074,.078),body=True)
    o=ell('UpperArm',(s*.263,0,1.297),(.05,.054,.13),body=True);o.rotation_euler.y=s*-.27
    ell('Elbow',(s*.295,0,1.18),(.037,.04,.047),body=True)
    o=ell('Forearm',(s*.321,-.006,1.071),(.039,.045,.116),body=True);o.rotation_euler.y=s*-.19
    ell('Wrist',(s*.341,-.006,.975),(.026,.028,.035),body=True)
    ell('Palm',(s*.351,-.008,.924),(.032,.025,.059),body=True)
    for j in range(4):ell('Finger',(s*(.334+j*.011),-.01,.874+abs(j-1.2)*.004),(.007,.01,.036),body=True)
    ell('Thumb',(s*.318,-.015,.917),(.012,.014,.033),body=True)
    ell('Hip',(s*.089,.01,.91),(.083,.104,.11),body=True)
    ell('Thigh',(s*.099,-.008,.716),(.075,.086,.207),body=True)
    ell('Knee',(s*.101,-.014,.525),(.048,.055,.057),body=True)
    ell('Calf',(s*.102,.025,.361),(.05,.063,.142),body=True)
    ell('Shin',(s*.102,-.009,.276),(.034,.041,.174),body=True)
    ell('Ankle',(s*.102,0,.115),(.03,.034,.055),body=True)
    ell('Foot',(s*.102,-.05,.05),(.045,.105,.044),body=True)
    ell('Ear',(s*.078,.002,1.655),(.014,.021,.032),body=True)
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name='BL_AthleteBody'
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
rem=body.modifiers.new('UnifiedSurface','REMESH')
print('remesh modes',[x.identifier for x in rem.bl_rna.properties['mode'].enum_items])
if any(x.identifier=='VOXEL' for x in rem.bl_rna.properties['mode'].enum_items):rem.mode='VOXEL';rem.voxel_size=.012
bpy.ops.object.modifier_apply(modifier=rem.name)
sm=body.modifiers.new('SurfaceRelax','SMOOTH');sm.factor=1.1;sm.iterations=5;bpy.ops.object.modifier_apply(modifier=sm.name)
body.data.materials.clear();body.data.materials.append(skin)
for p in body.data.polygons:p.use_smooth=True
regions={
 'upperChest':[(.09,-.10,1.40,.09,.08,.045)],'chest':[(.095,-.10,1.34,.1,.08,.065)],
 'frontDelts':[(.215,-.045,1.424,.065,.06,.075)],'sideDelts':[(.24,0,1.425,.06,.07,.08)],'rearDelts':[(.215,.045,1.425,.065,.06,.075)],
 'lats':[(.16,.025,1.28,.07,.10,.15)],'upperBack':[(.09,.08,1.395,.11,.08,.09)],'erectors':[(.055,.075,1.16,.06,.06,.15)],
 'biceps':[(.27,-.03,1.29,.07,.07,.12)],'triceps':[(.265,.03,1.29,.07,.07,.13)],'forearms':[(.322,0,1.075,.055,.07,.11)],
 'quads':[(.099,-.045,.724,.09,.10,.20)],'hamstrings':[(.099,.05,.72,.09,.10,.20)],'glutes':[(.09,.075,.91,.10,.09,.10)],
 'calves':[(.102,.025,.34,.065,.08,.15)],'abs':[(.055,-.07,1.14,.085,.07,.15)]}
body.shape_key_add(name='Basis',from_mix=False)
def influence(v,c):
    x,y,z,rx,ry,rz=c
    return math.exp(-2*((abs(v.x)-x)**2/rx**2+(v.y-y)**2/ry**2+(v.z-z)**2/rz**2))
for name,centers in regions.items():
    key=body.shape_key_add(name=name,from_mix=False);key.value=0;key.slider_min=-.6;key.slider_max=1.5
    vg=body.vertex_groups.new(name='region_'+name)
    for i,v in enumerate(body.data.vertices):
        w=max(influence(v.co,c) for c in centers)
        if w>.025:vg.add([i],w,'REPLACE')
        if w>.001:
            sign=1 if v.co.x>0 else -1
            center=Vector((sign*centers[0][0],0,v.co.z));direction=v.co-center;direction.z=0
            if direction.length>.001:direction.normalize()
            key.data[i].co+=direction*w*.04
for name,amount in [('bodyFat',.05),('pump',.007)]:
    k=body.shape_key_add(name=name,from_mix=False);k.value=0;k.slider_min=-.7;k.slider_max=1.5
    for i,v in enumerate(body.data.vertices):
        z=v.co.z;w=math.exp(-((z-1.07)/.30)**4) if name=='bodyFat' else max(max(influence(v.co,c) for c in cs) for cs in regions.values())
        if z<1.5:
            sign=1 if v.co.x>0 else -1;k.data[i].co.x+=sign*amount*w*.65;k.data[i].co.y+=(-1 if v.co.y<0 else 1)*amount*w
# Face and hair retain identity through all development morphs.
details=[]
for s in [-1,1]:
    details.append(ell('EyeWhite',(s*.031,-.073,1.677),(.016,.01,.008),white))
    details.append(ell('Iris',(s*.031,-.082,1.677),(.006,.003,.006),dark))
    details.append(ell('Brow',(s*.031,-.076,1.691),(.021,.007,.005),hair))
details.append(ell('Mouth',(0,-.078,1.618),(.025,.003,.003),dark))
details.append(ell('Hair',(0,.006,1.727),(.081,.079,.048),hair))
for s in [-1,1]:details.append(ell('HairSide',(s*.068,.012,1.70),(.015,.061,.047),hair))
shorts=[]
for s in [-1,1]:shorts.append(ell('BL_ShortsLeg',(s*.083,0,.899),(.091,.112,.12),shortmat))
shorts.append(ell('BL_ShortsWaist',(0,0,.969),(.151,.111,.054),shortmat))
shorts.append(ell('BL_ShortsCenter',(0,-.005,.927),(.144,.111,.067),shortmat))
# Armature and explicit weights. No Blender-only constraints/drivers.
armdata=bpy.data.armatures.new('BL_Rig');rig=bpy.data.objects.new('BL_AthleteRig',armdata);collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
bones={}
def bone(n,h,t,parent=None):
    b=armdata.edit_bones.new(n);b.head=h;b.tail=t
    if parent:b.parent=armdata.edit_bones[parent]
    bones[n]=(Vector(h),Vector(t));return b
bone('root',(0,0,0),(0,0,.86));bone('pelvis',(0,0,.86),(0,0,1.02),'root');bone('spine',(0,0,1.02),(0,0,1.29),'pelvis');bone('chest',(0,0,1.29),(0,0,1.49),'spine');bone('head',(0,0,1.49),(0,0,1.77),'chest')
for s,side in [(-1,'R'),(1,'L')]:
    bone('upperArm.'+side,(s*.205,0,1.43),(s*.295,0,1.18),'chest');bone('forearm.'+side,(s*.295,0,1.18),(s*.341,0,.975),'upperArm.'+side);bone('hand.'+side,(s*.341,0,.975),(s*.35,0,.86),'forearm.'+side)
    bone('thigh.'+side,(s*.095,0,.93),(s*.101,0,.525),'pelvis');bone('shin.'+side,(s*.101,0,.525),(s*.102,0,.11),'thigh.'+side);bone('foot.'+side,(s*.102,0,.11),(s*.102,-.13,.05),'shin.'+side)
bpy.ops.object.mode_set(mode='OBJECT')
def segment_distance(v,h,t):
    u=t-h;f=max(0,min(1,(v-h).dot(u)/u.length_squared));return (v-h-u*f).length
for name in bones:
    if name!='root':body.vertex_groups.new(name=name)
for v in body.data.vertices:
    candidates=[]
    for name,(h,t) in bones.items():
        if name=='root':continue
        if v.co.z>.99 and abs(v.co.x)<.18 and ('Arm' in name or 'forearm' in name or 'hand' in name):continue
        candidates.append((segment_distance(v.co,h,t),name))
    nearest=sorted(candidates)[:2];weights=[1/(d+.012)**6 for d,n in nearest];total=sum(weights)
    for (d,n),w in zip(nearest,weights):body.vertex_groups[n].add([v.index],w/total,'REPLACE')
mod=body.modifiers.new('Skinning','ARMATURE');mod.object=rig;body.parent=rig
bpy.context.view_layer.update()
for o in details:
    world=o.matrix_world.copy();o.parent=rig;o.parent_type='BONE';o.parent_bone='head';o.matrix_world=world
for o in shorts:
    world=o.matrix_world.copy();o.parent=rig;o.parent_type='BONE';o.parent_bone='pelvis';o.matrix_world=world
scene.render.fps=24;scene.frame_start=1;scene.frame_end=96
for f,angle in [(1,0),(25,.009),(49,0),(73,-.004),(96,0)]:
    pb=rig.pose.bones['chest'];pb.rotation_mode='XYZ';pb.rotation_euler.x=angle;pb.keyframe_insert(data_path='rotation_euler',frame=f)
rig.animation_data.action.name='Breathing'
scene.frame_set(1)
body['assetVersion']='athlete-v1';body['mappingVersion']='regions-v1';body['regionNames']=list(regions)
# Export only the athlete. Inspect live enum identifiers instead of assuming.
bpy.ops.object.select_all(action='DESELECT')
for o in collection.objects:o.select_set(True)
bpy.context.view_layer.objects.active=rig
props=bpy.ops.export_scene.gltf.get_rna_type().properties
import io_scene_gltf2
formats=[x[0] for x in io_scene_gltf2.get_format_items(scene,bpy.context)];fmt=next(x for x in formats if x.upper()=='GLB')
kwargs=dict(filepath=str(OUT/'athlete-v1.glb'),export_format=fmt,use_selection=True,export_skins=True,export_morph=True,export_animations=True,export_extras=True)
if 'export_animation_mode' in props:
    modes=[x.identifier for x in props['export_animation_mode'].enum_items]
    if 'ACTIONS' in modes:kwargs['export_animation_mode']='ACTIONS'
bpy.ops.export_scene.gltf(**kwargs)
(OUT/'regions-v1.json').write_text(json.dumps({'version':'regions-v1','coordinates':'Blender Z-up; glTF Y-up, front +Z','regions':regions,'morphs':list(regions)+['bodyFat','pump'],'selection':'List selection in stage 1; deformed-mesh hit testing pending'},indent=2),encoding='utf-8')
# Body-check studio: original geometry and material, no external assets.
studio=bpy.data.collections.new('BULK_LIFE_Studio');scene.collection.children.link(studio)
def studio_link(o):
    for co in list(o.users_collection):co.objects.unlink(o)
    studio.objects.link(o);return o
def cube(n,loc,scale,m):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=studio_link(bpy.context.object);o.name=n;o.scale=scale;o.data.materials.append(m);be=o.modifiers.new('SoftEdges','BEVEL');be.width=.02;be.segments=3;return o
floor=mat('BL_Rubber',(.047,.065,.06),.9);wall=mat('BL_Wall',(.09,.12,.11),.9);wood=mat('BL_Oak',(.24,.17,.10),.7)
cube('StudioFloor',(0,0,-.04),(5,5,.08),floor);cube('StudioWall',(0,1.1,1.4),(5,.1,3),wall)
for x in [-1.8,-1.7,-1.6,-1.5,-1.4,1.4,1.5,1.6,1.7,1.8]:cube('OakSlat',(x,1.02,1.4),(.045,.08,2.8),wood)
def area(n,loc,power,color,size):
    data=bpy.data.lights.new(n,'AREA');data.energy=power;data.color=color;data.shape=next(x.identifier for x in data.bl_rna.properties['shape'].enum_items if x.identifier=='DISK');data.size=size;o=bpy.data.objects.new(n,data);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
area('Key',(-2,-3,3),350,(1,.89,.75),3);area('Fill',(2,-1,2),220,(.74,.86,1),2);area('Rim',(0,.8,2.5),350,(1,.96,.88),1.5)
world=bpy.data.worlds.new('BL_StudioWorld');world.use_nodes=True;next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs[0].default_value=(.13,.16,.15,1);next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs[1].default_value=.4;scene.world=world
camdata=bpy.data.cameras.new('BL_Camera');cam=bpy.data.objects.new('BL_Camera',camdata);studio.objects.link(cam);cam.location=(2.7,-5,2.3);cam.rotation_euler=(Vector((0,0,.93))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type=next(x.identifier for x in camdata.bl_rna.properties['type'].enum_items if x.identifier=='ORTHO');camdata.ortho_scale=2.15;scene.camera=cam
scene.render.resolution_x=900;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
for screen in bpy.data.screens:
    for ar in screen.areas:
        if ar.type=='VIEW_3D':ar.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v1.blend'))
print(json.dumps({'scene':scene.name,'vertices':len(body.data.vertices),'morphs':len(body.data.shape_keys.key_blocks)-1,'bones':len(armdata.bones),'glb':str(OUT/'athlete-v1.glb'),'blend':bpy.data.filepath}))
