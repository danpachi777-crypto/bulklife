"""Fitted opaque shorts with clipped hems, interpolated morphs and skin weights."""
import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife');scene=bpy.data.scenes['BULK_LIFE_Studio_v2'];bpy.context.window.scene=scene
body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];collection=bpy.data.collections['BULK_LIFE_Athlete_v2']
old=bpy.data.objects.get('BL_V2_Shorts')
if old:
    collection.objects.unlink(old);archive=bpy.data.collections.get('BL_V2_PreviousClothes')
    if not archive:archive=bpy.data.collections.new('BL_V2_PreviousClothes');scene.collection.children.link(archive)
    archive.objects.link(old);old.name='Archived_V2_Shorts';archive.hide_render=True;archive.hide_viewport=True
body.data.update();basis=body.data.shape_keys.key_blocks[0]
def combine(a,b,t):
    result={i:w*(1-t) for i,w in a.items()}
    for i,w in b.items():result[i]=result.get(i,0)+w*t
    return {i:w for i,w in result.items() if w>1e-8}
def position(d):return sum((basis.data[i].co*w for i,w in d.items()),Vector())
def clip(poly,z,above):
    out=[]
    for a,b in zip(poly,poly[1:]+poly[:1]):
        pa=position(a);pb=position(b);ina=pa.z>=z if above else pa.z<=z;inb=pb.z>=z if above else pb.z<=z
        if ina:out.append(a)
        if ina!=inb:out.append(combine(a,b,(z-pa.z)/(pb.z-pa.z)))
    return out
samples=[];lookup={};faces=[]
for p in body.data.polygons:
    if abs(p.center.x)>.27:continue
    poly=[{i:1.0} for i in p.vertices];poly=clip(poly,.745,True)
    if len(poly)<3:continue
    poly=clip(poly,1.025,False)
    if len(poly)<3:continue
    face=[]
    for d in poly:
        k=tuple((i,round(w,7)) for i,w in sorted(d.items()))
        if k not in lookup:lookup[k]=len(samples);samples.append(d)
        face.append(lookup[k])
    faces.append(face)
verts=[]
for d in samples:
    normal=sum((body.data.vertices[i].normal*w for i,w in d.items()),Vector()).normalized();verts.append(position(d)+normal*.008)
mesh=bpy.data.meshes.new('BL_V2_ClippedFittedShorts');mesh.from_pydata(verts,[],faces);mesh.update();shorts=bpy.data.objects.new('BL_V2_Shorts',mesh);collection.objects.link(shorts);mesh.materials.append(bpy.data.materials['BL_V2_TrainingShorts'])
for p in mesh.polygons:p.use_smooth=True
shorts.shape_key_add(name='Basis',from_mix=False)
for key in list(body.data.shape_keys.key_blocks)[1:]:
    k=shorts.shape_key_add(name=key.name,from_mix=False);k.value=0;k.slider_min=key.slider_min;k.slider_max=key.slider_max
    for j,d in enumerate(samples):k.data[j].co=verts[j]+sum(((key.data[i].co-basis.data[i].co)*w for i,w in d.items()),Vector())
for b in rig.data.bones:shorts.vertex_groups.new(name=b.name)
for j,d in enumerate(samples):
    weights={}
    for i,weight in d.items():
        for group in body.data.vertices[i].groups:
            name=body.vertex_groups[group.group].name
            if name in rig.data.bones:weights[name]=weights.get(name,0)+group.weight*weight
    weights=dict(sorted(weights.items(),key=lambda x:-x[1])[:4]);total=sum(weights.values())
    for name,w in weights.items():shorts.vertex_groups[name].add([j],w/total,'REPLACE')
shorts.parent=rig;mod=shorts.modifiers.new('AnatomicalGarmentSkinning','ARMATURE');mod.object=rig
shorts['garmentRevision']='v2-clipped-hem';shorts['coverage']='Clipped z=.745..1.025, 8mm offset, shared morph deltas and weights'
meta=json.loads((ROOT/'public/assets/regions-v2.json').read_text());meta['garmentSamples']=[list(d.items()) for d in samples];meta['garmentBodyVertexIndices']=[max(d,key=d.get) for d in samples];meta['garmentOffsetMetres']=.008
(ROOT/'public/assets/regions-v2.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v2.blend'))
print(json.dumps({'garmentVertices':len(verts),'garmentPolygons':len(faces),'straightClippedHems':True}))
