"""Clipped cropped hairline, tapered eyebrows and restrained lip pigmentation."""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife');scene=bpy.data.scenes['BULK_LIFE_Studio_v2'];bpy.context.window.scene=scene
body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];collection=bpy.data.collections['BULK_LIFE_Athlete_v2'];basis=body.data.shape_keys.key_blocks[0]
old=bpy.data.objects.get('BL_V2_Hair')
if old:bpy.data.objects.remove(old,do_unlink=True)
def pos(d):return sum((basis.data[i].co*w for i,w in d.items()),Vector())
def field(v):
    front=max(0,min(1,(-v.y-.015)/.095));line=1.624*(1-front)+(1.693+.009*(abs(v.x)/.075)**2)*front
    return v.z-line
def combine(a,b,t):
    d={i:w*(1-t) for i,w in a.items()}
    for i,w in b.items():d[i]=d.get(i,0)+w*t
    return {i:w for i,w in d.items() if w>1e-8}
samples=[];lookup={};faces=[]
for poly in body.data.polygons:
    points=[{i:1.0} for i in poly.vertices];cut=[]
    for a,b in zip(points,points[1:]+points[:1]):
        fa=field(pos(a));fb=field(pos(b))
        if fa>=0:cut.append(a)
        if (fa>=0)!=(fb>=0):cut.append(combine(a,b,fa/(fa-fb)))
    if len(cut)<3:continue
    face=[]
    for d in cut:
        key=tuple((i,round(w,7)) for i,w in sorted(d.items()))
        if key not in lookup:lookup[key]=len(samples);samples.append(d)
        face.append(lookup[key])
    faces.append(face)
verts=[pos(d)+sum((body.data.vertices[i].normal*w for i,w in d.items()),Vector()).normalized()*.0022 for d in samples]
def object_mesh(name,vertices,polygons):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],polygons);mesh.update();o=bpy.data.objects.new(name,mesh);collection.objects.link(o);o.data.materials.append(bpy.data.materials['BL_V2_Hair'])
    for p in mesh.polygons:p.use_smooth=True
    o.vertex_groups.new(name='head').add(list(range(len(vertices))),1,'REPLACE');o.parent=rig;mod=o.modifiers.new('HeadSkinning','ARMATURE');mod.object=rig
    return o
hair=object_mesh('BL_V2_Hair',verts,faces)
# Thin eyebrow ribbons follow the forehead surface instead of hovering planes.
headverts=[v.co.copy() for v in body.data.vertices if 1.66<v.co.z<1.70 and v.co.y<-.07]
for side in [-1,1]:
    name='BL_V2_Eyebrow.'+('L' if side>0 else 'R');old=bpy.data.objects.get(name)
    if old:bpy.data.objects.remove(old,do_unlink=True)
    vs=[];fs=[]
    for j in range(13):
        t=j/12;x=side*(.012+.045*t);z=1.679+.0035*math.sin(math.pi*t)-.005*t
        nearest=sorted(headverts,key=lambda v:(v.x-x)**2+(v.z-z)**2)[:4];y=min(v.y for v in nearest)-.0012
        width=.001*(.4+.6*math.sin(math.pi*t))
        vs.extend([(x,y,z-width),(x,y-.0004,z+width)])
        if j:fs.append((2*j-2,2*j,2*j+1,2*j-1))
    object_mesh(name,vs,fs)
attr=body.data.color_attributes['SkinTone']
for i,v in enumerate(body.data.vertices):
    x,y,z=v.co;noise=math.sin(x*173+z*71)*math.cos(y*293-z*137)*.004
    red=math.exp(-((z-.50)/.055)**2)*.015+math.exp(-((z-1.66)/.025)**2)*max(0,(abs(x)-.065))*.25
    lip=math.exp(-2*((x/.026)**2+((z-1.580)/.008)**2))*max(0,min(1,(-y-.13)/.022))
    base=Vector((.43+noise+red,.265+noise-red*.35,.18+noise-red*.25));base=base*(1-lip*.55)+Vector((.34,.14,.115))*lip*.55
    attr.data[i].color=(*base,1)
body['faceFinish']='clipped cropped hairline, forehead brows, lip vertex color'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v2.blend'))
print(json.dumps({'hairVertices':len(verts),'hairPolygons':len(faces),'eyebrows':2}))
