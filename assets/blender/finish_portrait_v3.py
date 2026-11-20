"""Apply licensed CC0 skin, fit CC0 hair/shoes to our exact base, export v3.
The v2 original files and save model identifiers remain untouched.
"""
import bpy, json, math, io, contextlib, hashlib
from pathlib import Path
from mathutils import Vector
import io_scene_gltf2
from types import SimpleNamespace
ROOT=Path('C:/Users/shota/Documents/BulkLife')
SRC=ROOT/'assets/sources/makehuman-system-v3'
body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];col=bpy.data.collections['BULK_LIFE_Athlete_v2'];scene=bpy.context.scene
if not bpy.data.filepath.endswith('bulk-life-athlete-v3-work.blend'):raise RuntimeError('v3 working copy required')
if body.get('cc0PortraitFinish'):raise RuntimeError('CC0 portrait finish already applied')
def principal(m):return next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
def texload(path,size):
    image=bpy.data.images.load(str(path),check_existing=True)
    if image.size[0]>size:image.scale(size,size)
    image.pack();return image
skin=body.data.materials[0];pr=principal(skin)
tex=skin.node_tree.nodes.new('ShaderNodeTexImage');tex.image=texload(SRC/'skins/young_asian_male/young_lightskinned_male_diffuse3.png',2048)
skin.node_tree.links.new(tex.outputs['Color'],pr.inputs['Base Color'])
# glTF multiplies color_0 with the texture, so retain only subtle pigmentation.
for v in body.data.color_attributes['SkinTone'].data:v.color=(.98,.965,.95,1)
pr.inputs['Subsurface Weight'].default_value=.045

raw=[]
for line in (ROOT/'assets/sources/makehuman/base.obj').read_text().splitlines():
    if line.startswith('v '):raw.append(Vector(tuple(map(float,line.split()[1:4]))))
def target(name):
    out={}
    for line in (ROOT/'assets/sources/makehuman'/name).read_text().splitlines():
        if line.strip() and not line.startswith('#'):
            a=line.split();out[int(a[0])]=Vector(tuple(map(float,a[1:4])))
    return out
male=target('asian-male-young.target');muscle=target('universal-male-young-maxmuscle-averageweight.target')
coords=[v+male.get(i,Vector())+muscle.get(i,Vector())*.25 for i,v in enumerate(raw)]
meta=json.loads((ROOT/'public/assets/regions-v2.json').read_text());used=meta['sourceVertexIndices'];lookup={v:i for i,v in enumerate(used)}
ground=min(coords[i].y for i in used);scale=1.77/(max(coords[i].y for i in used)-ground)
def convert(v):return Vector((v.x*scale,-v.z*scale,(v.y-ground)*scale))
def sourcepos(i):return body.data.shape_keys.key_blocks[0].data[lookup[i]].co.copy() if i in lookup else convert(coords[i])
def fit_asset(folder,name,objectname,bone=None):
    lines=(folder/(name+'.mhclo')).read_text().splitlines();mapping=[];factors=[1,1,1];active=False
    for line in lines:
        s=line.split()
        if not s or s[0].startswith('#'):continue
        if s[0] in ['x_scale','y_scale','z_scale']:
            axis=['x_scale','y_scale','z_scale'].index(s[0]);factors[axis]=abs(coords[int(s[1])][axis]-coords[int(s[2])][axis])/float(s[3])
        elif s[0]=='verts':active=True
        elif active and s[0].lstrip('-').isdigit():
            try:
                if len(s)==9:mapping.append(([int(x) for x in s[:3]],[float(x) for x in s[3:6]],[float(x) for x in s[6:9]]))
                elif len(s)==1:mapping.append(([int(s[0])],[1.0],[0,0,0]))
                else:active=False
            except ValueError:active=False
    original=[];uvs=[];polys=[];uvfaces=[]
    for line in (folder/(name+'.obj')).read_text().splitlines():
        s=line.split()
        if not s:continue
        if s[0]=='v':original.append(tuple(map(float,s[1:4])))
        elif s[0]=='vt':uvs.append(tuple(map(float,s[1:3])))
        elif s[0]=='f':
            f=[x.split('/') for x in s[1:]];polys.append([int(x[0])-1 for x in f]);uvfaces.append([int(x[1])-1 for x in f])
    if len(mapping)!=len(original):raise RuntimeError(f'{name} mapping {len(mapping)} != vertices {len(original)}')
    vs=[]
    for ids,ws,offset in mapping:
        p=sum((sourcepos(i)*w for i,w in zip(ids,ws)),Vector())
        dx,dy,dz=[v*f*scale for v,f in zip(offset,factors)];vs.append(p+Vector((dx,-dz,dy)))
    mesh=bpy.data.meshes.new(objectname);mesh.from_pydata(vs,[],polys);mesh.update();layer=mesh.uv_layers.new(name='UVMap')
    for poly,tex in zip(mesh.polygons,uvfaces):
        poly.use_smooth=True
        for loop,index in zip(poly.loop_indices,tex):layer.data[loop].uv=uvs[index]
    o=bpy.data.objects.new(objectname,mesh);col.objects.link(o);o.parent=rig
    if bone:o.vertex_groups.new(name=bone).add(list(range(len(vs))),1,'REPLACE')
    else:
        for side in ['L','R']:
            indices=[i for i,v in enumerate(vs) if (v.x>0)==(side=='L')];o.vertex_groups.new(name='foot.'+side).add(indices,1,'REPLACE')
    mod=o.modifiers.new('FittedToAnatomicalRig','ARMATURE');mod.object=rig
    m=bpy.data.materials.new(objectname+'Material');m.use_nodes=True;p=principal(m);p.inputs['Roughness'].default_value=.86;p.inputs['Specular IOR Level'].default_value=.22
    t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=texload(folder/(name+'_diffuse.png'),1024);m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
    if bone:
        # Hair cards use explicit alpha clipping instead of blended dark planes.
        m.node_tree.links.new(t.outputs['Alpha'],p.inputs['Alpha'])
        m.diffuse_color=(.03,.025,.02,1)
    mesh.materials.append(m);return o
hair=fit_asset(SRC/'hair/short02','short02','BL_V3_NaturalHair','head')
shoes=fit_asset(SRC/'clothes/shoes02','shoes02','BL_V3_Trainers')
for name in ['BL_V2_Eyebrow.L','BL_V2_Eyebrow.R']:
    o=bpy.data.objects.get(name)
    if o:
        for c in list(o.users_collection):c.objects.unlink(o)
        o.hide_render=True;o.hide_viewport=True
# Crop remains a genuine second style; both assets share the same scalp/identity.
for name in ['BL_V2_Hair','BL_V3_HairFlow']:
    bpy.data.objects[name].hide_render=True;bpy.data.objects[name].hide_viewport=True
# Smooth cloth over small pectoral relief while maintaining shared growth deltas.
tank=bpy.data.objects['BL_V3_TrainingTank'];me=tank.data;adj=[set() for _ in me.vertices]
for edge in me.edges:
    a,b=edge.vertices;adj[a].add(b);adj[b].add(a)
boundary={}
for p in me.polygons:
    ids=list(p.vertices)
    for a,b in zip(ids,ids[1:]+ids[:1]):
        k=tuple(sorted((a,b)));boundary[k]=boundary.get(k,0)+1
fixed={i for e,n in boundary.items() if n==1 for i in e}
base=[v.co.copy() for v in tank.data.shape_keys.key_blocks[0].data];relaxed=[v.copy() for v in base]
for _ in range(4):
    relaxed=[v if i in fixed or not adj[i] else v.lerp(sum((relaxed[j] for j in adj[i]),Vector())/len(adj[i]),.42) for i,v in enumerate(relaxed)]
for i,(a,b) in enumerate(zip(base,relaxed)):
    delta=b-a
    if a.z<1.09:delta.z-=.025*max(0,(1.09-a.z)/.055)
    for key in tank.data.shape_keys.key_blocks:key.data[i].co+=delta
body['cc0PortraitFinish']=True
rig.animation_data.action=bpy.data.actions['GymIdle'];scene.frame_set(1)
# Export hidden crop objects too, for the game's selectable second hairstyle.
for name in ['BL_V2_Hair','BL_V3_HairFlow']:
    bpy.data.objects[name].hide_viewport=False;bpy.data.objects[name].hide_render=False
scene.frame_end=577
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v3-work.blend'))
clips=meta['clips']+['GymIdle','SeatedPrepare','StandUp']
io_scene_gltf2.on_export_action_filter_changed(SimpleNamespace(export_action_filter=True),bpy.context)
for item in bpy.data.scenes[0].gltf_action_filter:item.keep=bool(item.action) and item.action.name in clips and bool(item.action.get('v2CareerClip') or item.action.get('v3CareerClip'))
bpy.ops.object.select_all(action='DESELECT')
for o in col.objects:o.select_set(True)
bpy.context.view_layer.objects.active=rig
props=bpy.ops.export_scene.gltf.get_rna_type().properties
fmt=next(i[0] for i in io_scene_gltf2.get_format_items(scene,bpy.context) if '.glb' in i[1])
mode=next(i.identifier for i in props['export_animation_mode'].enum_items if i.identifier=='ACTIONS')
path=ROOT/'public/assets/athlete-v3.glb'
window=next(w for w in bpy.context.window_manager.windows if any(a.type=='VIEW_3D' for a in w.screen.areas))
window.scene=scene
area=next(a for a in window.screen.areas if a.type=='VIEW_3D')
region=next(r for r in area.regions if r.type=='WINDOW')
with bpy.context.temp_override(window=window,area=area,region=region,scene=scene,view_layer=scene.view_layers[0]):
    with contextlib.redirect_stdout(io.StringIO()):bpy.ops.export_scene.gltf(filepath=str(path),export_format=fmt,use_selection=True,use_active_scene=True,export_skins=True,export_morph=True,export_animations=True,export_animation_mode=mode,export_action_filter=True,export_extras=True)
report={'revision':'portrait-v3','compatibleSaveModel':'athlete-v2','body':body.name,'rig':rig.name,'clips':clips,'morphs':meta['morphs'],'bones':len(rig.data.bones),'garments':['BL_V2_Shorts','BL_V3_TrainingTank'],'glbBytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'triangles':sum(len(p.vertices)-2 for o in col.objects if o.type=='MESH' for p in o.data.polygons),'source':'assets/sources/makehuman-system-v3/provenance.json'}
(ROOT/'public/assets/portrait-v3.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
