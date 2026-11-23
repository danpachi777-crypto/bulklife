"""A feathered licensed groom with layered directional short locks.
Curves follow the surface at every segment; no straight-edged solid scalp cap.
"""
import bpy,bmesh,math,random,bisect,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/portrait-v7'
body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];hair=bpy.data.objects['BL_V4_Hair'];scalp=bpy.data.objects['BL_V2_Hair']
assert bpy.data.filepath.endswith('bulk-life-athlete-v7-work.blend')
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
skin=BVHTree.FromPolygons([v.co for v in body.data.shape_keys.key_blocks[0].data],[list(p.vertices) for p in body.data.polygons])
with bpy.data.libraries.load(str(ROOT/'assets/blender/bulk-life-athlete-v6-work.blend'),link=False) as (source,dest):dest.objects=['BL_V4_Hair']
source=dest.objects[0];cap=source.data.copy()
for v in cap.vertices:
 p,n,_,_=skin.find_nearest(v.co)
 # A cropped temple/nape lies close to the skull; only the crown keeps length.
 fit=.28+.46*smooth((v.co.z-1.681)/.055)
 v.co=p+(v.co-p)*fit
cap.update()
uvFaces=[[tuple(cap.uv_layers.active.data[i].uv) for i in p.loop_indices] for p in cap.polygons]
cap.update();capTree=BVHTree.FromPolygons([v.co for v in cap.vertices],[list(p.vertices) for p in cap.polygons])
vertices=[v.co.copy() for v in cap.vertices];faces=[tuple(p.vertices) for p in cap.polygons];materials=[0]*len(faces)
areas=[];total=0
for p in cap.polygons:total+=p.area;areas.append(total)
random.seed(73179);made=0
for index in range(1000):
 poly=cap.polygons[bisect.bisect_left(areas,random.random()*total)];ids=list(poly.vertices)
 # Sample triangles with sqrt barycentric coordinates rather than clumping at centres.
 j=random.randrange(1,len(ids)-1);tri=[ids[0],ids[j],ids[j+1]];r=math.sqrt(random.random());t=random.random();ws=[1-r,r*(1-t),r*t]
 p=sum((cap.vertices[k].co*w for k,w in zip(tri,ws)),Vector());n=sum((cap.vertices[k].normal*w for k,w in zip(tri,ws)),Vector()).normalized();top=smooth((p.z-1.681)/.055)
 if p.z<1.706:continue
 direction=Vector((.58*top,-.9*top+.20*(1-top),-.9*(1-top)));direction-=n*direction.dot(n)
 if direction.length<.001:continue
 direction.normalize();across=n.cross(direction).normalized()
 length=(.004+top*.015)*(0.75+random.random()*.5);width=(.00020+top*.00035)*(0.65+random.random()*.7);made+=1
 start=len(vertices);shade=random.choices([1,2,3,4,5],[26,28,25,16,5])[0]
 for f in [0,.20,.45,.72,1]:
  q,normal,_,_=capTree.find_nearest(p+direction*(length*f));normal.normalize()
  # Distinct length/height by crown and temple, restrained lifted tips at the fringe.
  q+=normal*(.00020+math.sin(f*math.pi)*(.0005+top*.0015)+f*f*top*.0003)
  w=width*(1-f*.94);vertices.extend([q-across*w,q+normal*w*.30,q+across*w])
 for k in range(4):
  for a in range(2):faces.append((start+k*3+a,start+k*3+a+1,start+(k+1)*3+a+1,start+(k+1)*3+a));materials.append(shade)
me=bpy.data.meshes.new('V7_FittedShortLayers');me.from_pydata(vertices,[],faces);me.update();hair.data=me
if 'v7ScalpSeal' in hair:del hair['v7ScalpSeal']
me.materials.append(cap.materials[0].copy())
uv=me.uv_layers.new(name='UVMap')
for p,values in zip(me.polygons,uvFaces):
 for i,v in zip(p.loop_indices,values):uv.data[i].uv=v
for i,color in enumerate([(.025,.015,.009),(.032,.019,.011),(.040,.024,.014),(.048,.030,.018),(.055,.035,.022)]):
 m=bpy.data.materials.new('V7_HairTone_'+str(i));m.use_nodes=True;pr=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');pr.inputs['Base Color'].default_value=(*color,1);pr.inputs['Roughness'].default_value=.77;pr.inputs['Specular IOR Level'].default_value=.18;me.materials.append(m)
for p,i in zip(me.polygons,materials):p.material_index=i;p.use_smooth=True
vg=hair.vertex_groups.get('head') or hair.vertex_groups.new(name='head');vg.add(list(range(len(vertices))),1,'REPLACE')
hair['v7Groom']='feathered CC0 card underlayer with surface-projected tapered geometric locks; no straight scalp boundary'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v7-work.blend'))
(OUT/'groom-report.json').write_text(json.dumps({'locks':made,'vertices':len(vertices),'triangles':sum(len(f)-2 for f in faces),'materialTones':6,'method':hair['v7Groom']},indent=2),encoding='utf8')
print('V7 directional groom saved',flush=True)
