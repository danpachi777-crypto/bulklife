"""Build BULK LIFE v2 on the pinned CC0 MakeHuman topology.
Original game anatomy/morph mapping, fitted opaque clothing, rig and textures.
Never writes the v1 .blend or GLB. See assets/sources/makehuman/provenance.json.
"""
import bpy,math,json,shutil,hashlib
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
ROOT=Path('C:/Users/shota/Documents/BulkLife');SRC=ROOT/'assets/sources/makehuman';OUT=ROOT/'public/assets'
SCENE='BULK_LIFE_Studio_v2'
if SCENE in bpy.data.scenes:raise RuntimeError('v2 exists: inspect before rebuilding')
scene=bpy.data.scenes.new(SCENE);bpy.context.window.scene=scene
collection=bpy.data.collections.new('BULK_LIFE_Athlete_v2');scene.collection.children.link(collection)
raw=[];uv=[];faces=[];face_uv=[];group=''
for line in (SRC/'base.obj').read_text().splitlines():
    if line.startswith('v '):raw.append(Vector(tuple(map(float,line.split()[1:4]))))
    elif line.startswith('vt '):uv.append(tuple(map(float,line.split()[1:3])))
    elif line.startswith('g '):group=line[2:]
    elif line.startswith('f ') and group=='body':
        tokens=[v.split('/') for v in line.split()[1:]]
        faces.append([int(v[0])-1 for v in tokens]);face_uv.append([int(v[1])-1 for v in tokens])
def read_target(name):
    result={}
    for line in (SRC/name).read_text().splitlines():
        if line.strip() and not line.startswith('#'):
            a=line.split();result[int(a[0])]=Vector(tuple(map(float,a[1:4])))
    return result
male=read_target('asian-male-young.target');muscle=read_target('universal-male-young-maxmuscle-averageweight.target');fat=read_target('universal-male-young-averagemuscle-maxweight.target')
coords=[v+male.get(i,Vector())+muscle.get(i,Vector())*.25 for i,v in enumerate(raw)]
used=sorted({i for f in faces for i in f});lookup={i:j for j,i in enumerate(used)}
ground=min(coords[i].y for i in used);top=max(coords[i].y for i in used);scale=1.77/(top-ground)
def convert(v):return Vector((v.x*scale,-v.z*scale,(v.y-ground)*scale))
def delta(v):return Vector((v.x*scale,-v.z*scale,v.y*scale))
verts=[convert(coords[i]) for i in used]
mesh=bpy.data.meshes.new('BL_V2_AnatomicalSurface');mesh.from_pydata(verts,[],[[lookup[i] for i in f] for f in faces]);mesh.update()
body=bpy.data.objects.new('BL_V2_AthleteBody',mesh);collection.objects.link(body)
layer=mesh.uv_layers.new(name='UVMap')
for p,tex in zip(mesh.polygons,face_uv):
    p.use_smooth=True
    for loop,t in zip(p.loop_indices,tex):layer.data[loop].uv=uv[t]
body['assetVersion']='athlete-v2';body['source']='MakeHuman CC0 hm08, pinned provenance';body['originalSourceIndices']=used

def material(name,color,rough=.55,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    return m
skin=material('BL_V2_Skin',(.43,.265,.18),.56)
pr=next(n for n in skin.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
if 'Subsurface Weight' in pr.inputs:pr.inputs['Subsurface Weight'].default_value=.12
body.data.materials.append(skin)
cloth=material('BL_V2_TrainingShorts',(.022,.055,.064),.82)
eye_white=material('BL_V2_EyeSclera',(.66,.64,.57),.35);iris=material('BL_V2_Iris',(.055,.035,.02),.38);pupil=material('BL_V2_Pupil',(.006,.005,.004),.26)
hair_mat=material('BL_V2_Hair',(.022,.014,.009),.72)

# Anatomical rig landmarks are evaluated on this exact male shape.
mh=json.loads((SRC/'default.mhskel').read_text());mh_weights=json.loads((SRC/'default_weights.mhw').read_text())['weights']
def joint(name):
    ids=mh['joints'][name];return sum((convert(coords[i]) for i in ids),Vector())/len(ids)
def mh_head(name):return joint(mh['bones'][name]['head'])
def mh_tail(name):return joint(mh['bones'][name]['tail'])
armdata=bpy.data.armatures.new('BL_V2_AnatomicalRig');rig=bpy.data.objects.new('BL_V2_Rig',armdata);collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,h,t,parent=None):
    b=armdata.edit_bones.new(name);b.head=h;b.tail=t
    if parent:b.parent=armdata.edit_bones[parent]
    return b
bone('root',(0,0,0),(0,0,.90));bone('pelvis',mh_tail('root'),mh_tail('spine04'),'root');bone('spine',mh_tail('spine04'),mh_tail('spine02'),'pelvis');bone('chest',mh_tail('spine02'),mh_head('neck01'),'spine');bone('neck',mh_head('neck01'),mh_head('head'),'chest');bone('head',mh_head('head'),mh_tail('head'),'neck')
for side in ['L','R']:
    bone('clavicle.'+side,mh_head('clavicle.'+side),mh_head('upperarm01.'+side),'chest')
    bone('upperArm.'+side,mh_head('upperarm01.'+side),mh_tail('upperarm02.'+side),'clavicle.'+side)
    bone('forearm.'+side,mh_head('lowerarm01.'+side),mh_tail('lowerarm02.'+side),'upperArm.'+side)
    bone('hand.'+side,mh_head('wrist.'+side),mh_tail('wrist.'+side)+Vector((0,0,-.06)),'forearm.'+side)
    bone('thigh.'+side,mh_head('upperleg01.'+side),mh_tail('upperleg02.'+side),'pelvis')
    bone('shin.'+side,mh_head('lowerleg01.'+side),mh_tail('lowerleg02.'+side),'thigh.'+side)
    bone('foot.'+side,mh_head('foot.'+side),mh_tail('foot.'+side),'shin.'+side)
    for finger in range(1,6):
        for segment in range(1,4):
            name=f'finger{finger}-{segment}.{side}';parent='hand.'+side if segment==1 else f'finger{finger}-{segment-1}.{side}'
            bone(name,mh_head(name),mh_tail(name),parent)
bpy.ops.object.mode_set(mode='OBJECT')
def map_bone(name):
    side=name[-1] if name.endswith(('.L','.R')) else ''
    if name.startswith('finger'):return name
    if name.startswith(('upperarm','shoulder')):return 'upperArm.'+side
    if name.startswith('clavicle'):return 'clavicle.'+side
    if name.startswith('lowerarm'):return 'forearm.'+side
    if name.startswith(('wrist','metacarpal')):return 'hand.'+side
    if name.startswith('upperleg'):return 'thigh.'+side
    if name.startswith('lowerleg'):return 'shin.'+side
    if name.startswith(('foot','toe')):return 'foot.'+side
    if name.startswith('pelvis') or name in ['root','spine05','spine04']:return 'pelvis'
    if name in ['spine03','spine02']:return 'spine'
    if name=='spine01' or name.startswith('breast'):return 'chest'
    if name.startswith('neck'):return 'neck'
    return 'head'
weights=[{} for _ in used]
for source_name,entries in mh_weights.items():
    name=map_bone(source_name)
    for original,w in entries:
        if original in lookup:
            d=weights[lookup[original]];d[name]=d.get(name,0)+w
for b in armdata.bones:body.vertex_groups.new(name=b.name)
for i,d in enumerate(weights):
    # glTF's four influences, chosen from the authored weight envelope.
    d=dict(sorted(d.items(),key=lambda kv:-kv[1])[:4]);total=sum(d.values())
    if total==0:d={'head' if verts[i].z>1.5 else 'pelvis':1};total=1
    weights[i]={k:v/total for k,v in d.items()}
    for name,w in weights[i].items():body.vertex_groups[name].add([i],w,'REPLACE')
body.parent=rig;mod=body.modifiers.new('AnatomicalSkinning','ARMATURE');mod.object=rig

# Muscle growth is based on the anatomical authored target, regionally blended.
# Regions overlap smoothly and their sum cannot exceed one full target.
regions={
 'upperChest':[(.09,-.115,1.38,.13,.10,.065)],'chest':[(.09,-.13,1.30,.14,.11,.095)],
 'frontDelts':[(.205,-.065,1.40,.095,.09,.095)],'sideDelts':[(.225,-.005,1.40,.095,.09,.105)],'rearDelts':[(.205,.04,1.40,.095,.08,.10)],
 'lats':[(.135,.075,1.25,.13,.10,.16)],'upperBack':[(.08,.10,1.39,.16,.10,.12)],'erectors':[(.045,.09,1.13,.07,.08,.19)],
 'biceps':[(.285,-.07,1.29,.10,.10,.12)],'triceps':[(.285,.005,1.30,.10,.10,.13)],'forearms':[(.435,-.10,1.14,.10,.13,.14)],
 'quads':[(.125,-.075,.71,.13,.14,.23)],'hamstrings':[(.125,.07,.72,.13,.14,.23)],'glutes':[(.10,.085,.93,.14,.13,.13)],
 'calves':[(.175,.025,.30,.10,.09,.18)],'abs':[(.04,-.10,1.12,.12,.10,.17)]}
parts=list(regions)
body.shape_key_add(name='Basis',from_mix=False)
def influence(v,c):
    x,y,z,rx,ry,rz=c;return math.exp(-1.5*((abs(v.x)-x)**2/rx**2+(v.y-y)**2/ry**2+(v.z-z)**2/rz**2))
region_weights=[]
for v in verts:
    raw_w=[max(influence(v,c) for c in cs) for cs in regions.values()]
    total=max(1,sum(raw_w));region_weights.append([w/total for w in raw_w])
for part_index,name in enumerate(parts):
    key=body.shape_key_add(name=name,from_mix=False);key.value=0;key.slider_min=-.6;key.slider_max=1.5
    group=body.vertex_groups.new(name='region_'+name)
    for j,original in enumerate(used):
        w=region_weights[j][part_index]
        key.data[j].co=verts[j]+delta(muscle.get(original,Vector()))*.95*w
        if w>.01:group.add([j],w,'REPLACE')
for name,target,amount in [('bodyFat',fat,.75),('pump',muscle,.055)]:
    key=body.shape_key_add(name=name,from_mix=False);key.value=0;key.slider_min=-.7;key.slider_max=1.5
    for j,original in enumerate(used):key.data[j].co=verts[j]+delta(target.get(original,Vector()))*amount

# Opaque fitted shorts from the actual pelvis / thighs; same morphs / skin weights.
mesh.update();cloth_faces=[p for p in mesh.polygons if .745<=p.center.z<=1.025 and abs(p.center.x)<.27]
cloth_ids=sorted({i for p in cloth_faces for i in p.vertices});clook={i:j for j,i in enumerate(cloth_ids)}
cloth_verts=[verts[i]+mesh.vertices[i].normal*.008 for i in cloth_ids]
cm=bpy.data.meshes.new('BL_V2_FittedGarment');cm.from_pydata(cloth_verts,[],[tuple(clook[i] for i in p.vertices) for p in cloth_faces]);cm.update()
shorts=bpy.data.objects.new('BL_V2_Shorts',cm);collection.objects.link(shorts);cm.materials.append(cloth)
for p in cm.polygons:p.use_smooth=True
shorts.shape_key_add(name='Basis',from_mix=False)
for key in list(body.data.shape_keys.key_blocks)[1:]:
    k=shorts.shape_key_add(name=key.name,from_mix=False);k.value=0;k.slider_min=key.slider_min;k.slider_max=key.slider_max
    for j,i in enumerate(cloth_ids):k.data[j].co=cloth_verts[j]+key.data[i].co-verts[i]
for b in armdata.bones:shorts.vertex_groups.new(name=b.name)
for j,i in enumerate(cloth_ids):
    for name,w in weights[i].items():shorts.vertex_groups[name].add([j],w,'REPLACE')
shorts.parent=rig;mod=shorts.modifiers.new('SharedAnatomicalSkinning','ARMATURE');mod.object=rig;shorts['bodyVertexIndices']=cloth_ids

def ell(name,loc,size,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=loc);o=bpy.context.object;o.name=name;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for c in list(o.users_collection):c.objects.unlink(o)
    collection.objects.link(o);o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=rig;o.parent_type='BONE';o.parent_bone='head';o.matrix_world=world
    return o
for s,side in [(-1,'R'),(1,'L')]:
    center=mh_head('eye.'+side)
    ell('BL_V2_EyeWhite.'+side,center,(.0118,.0118,.0118),eye_white)
    ell('BL_V2_Iris.'+side,center+Vector((0,-.01145,0)),(.0046,.0012,.0046),iris)
    ell('BL_V2_Pupil.'+side,center+Vector((0,-.0123,0)),(.0022,.00055,.0022),pupil)

# Original scalp cap follows the anatomical skull, with a receding curved hairline.
hair_faces=[]
for p in mesh.polygons:
    x,y,z=p.center
    forehead=1.686+.014*min(1,abs(x)/.07)
    if z>forehead or (z>1.645 and y>.015 and abs(x)<.10):hair_faces.append(p)
hids=sorted({i for p in hair_faces for i in p.vertices});hlookup={i:j for j,i in enumerate(hids)}
hm=bpy.data.meshes.new('BL_V2_Scalp');hm.from_pydata([verts[i]+mesh.vertices[i].normal*.002 for i in hids],[],[tuple(hlookup[i] for i in p.vertices) for p in hair_faces]);hm.update()
hair=bpy.data.objects.new('BL_V2_Hair',hm);collection.objects.link(hair);hm.materials.append(hair_mat)
for p in hm.polygons:p.use_smooth=True
vg=hair.vertex_groups.new(name='head');vg.add(list(range(len(hids))),1,'REPLACE');hair.parent=rig;mod=hair.modifiers.new('HeadSkinning','ARMATURE');mod.object=rig

# Borrow only the original project studio lighting/camera, as copies in the v2 scene.
environment=bpy.data.collections.new('BULK_LIFE_V2_Studio');scene.collection.children.link(environment)
source_scene=bpy.data.scenes.get('BULK_LIFE_Studio_v1')
if source_scene:
    scene.render.engine=source_scene.render.engine
    scene.world=source_scene.world.copy() if source_scene.world else None
    for old in source_scene.objects:
        if old.type in ['LIGHT','CAMERA'] or old.name in ['StudioFloor','StudioWall'] or old.name.startswith('OakSlat'):
            o=old.copy()
            if old.data:o.data=old.data.copy()
            environment.objects.link(o)
            if old==source_scene.camera:scene.camera=o
scene.render.fps=24;scene.frame_start=1;scene.frame_end=49;scene.render.resolution_x=900;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
if scene.camera:
    scene.camera.location=(2.8,-5,2.1);scene.camera.rotation_euler=(Vector((0,0,.95))-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.ortho_scale=2.15
scene['athleteV2']='anatomical-base-v2';scene['v1Preserved']=True
meta={'version':'athlete-v2','source':'MakeHuman CC0 hm08 anatomical topology + game morph/rig/garment authoring','sourceCommit':'a8bc2d54ff0ac92e78ff71431b1023eda42bf482','body':'BL_V2_AthleteBody','garment':'BL_V2_Shorts','rig':'BL_V2_Rig','hair':'BL_V2_Hair','heightMetres':1.77,'gltfFront':'+Z','morphs':parts+['bodyFat','pump'],'regions':regions,'vertices':len(verts),'polygons':len(faces),'bones':len(armdata.bones),'sourceVertexIndices':used,'garmentBodyVertexIndices':cloth_ids}
(OUT/'regions-v2.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v2.blend'))
print(json.dumps({k:v for k,v in meta.items() if k not in ['sourceVertexIndices','garmentBodyVertexIndices','regions']}))
