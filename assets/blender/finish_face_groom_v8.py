"""Finish one coherent short groom and the actual face, preserving identity.
The undercoat and directional locks sample the licensed card albedo, avoiding
the v7 brown rear shell / dark front material discontinuity.
"""
import bpy,math,random,bisect,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import closest_point_on_tri
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/anatomy-v8';body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];keys=body.data.shape_keys.key_blocks
assert bpy.data.filepath.endswith('bulk-life-athlete-v8-work.blend')
assert not body.get('v8FaceGroom'),'Run once on the v8 anatomy copy'
def s(t):t=max(0,min(1,t));return t*t*(3-2*t)
def g(x,c,r):return math.exp(-2*((x-c)/r)**2)
base=keys[0];before=[v.co.copy() for v in base.data];faceCount=0
for i,p in enumerate(before):
 x,y,z=p;ax=abs(x);front=s((-y-.11)/.025);d=Vector()
 # Orbital planes and alar/upper-lip/chin volumes, not eye enlargement.
 d.y-=.0023*g(ax,.042,.020)*g(z,1.655,.015)*front
 d.y-=.0020*g(ax,.055,.024)*g(z,1.623,.020)*front
 d.y-=.0015*g(ax,.015,.012)*g(z,1.615,.010)*front
 d.y-=.0015*g(ax,.016,.018)*g(z,1.583,.005)*front
 d.y+=.0012*g(ax,.028,.018)*g(z,1.595,.007)*front
 d.y-=.0020*g(ax,.033,.030)*g(z,1.551,.016)*front
 # A little upper-lid clearance and thicker lower rim, with the same eye size.
 d.z+=.0008*g(ax,.031,.016)*g(z,1.655,.004)*front
 d.y-=.0009*g(ax,.031,.016)*g(z,1.644,.004)*front
 for k in keys:k.data[i].co+=d
 if 'blink' in keys:keys['blink'].data[i].co.z-=.0008*g(ax,.031,.016)*g(z,1.655,.004)*front
 if d.length>.00002:faceCount+=1
body.data.update();skin=BVHTree.FromPolygons([v.co for v in base.data],[list(p.vertices) for p in body.data.polygons])
# Reproject brows to the new actual face and replace their positive fat target.
for name in ['BL_V4_Brow_-1','BL_V4_Brow_1']:
 o=bpy.data.objects[name];old=[v.co.copy() for v in o.data.shape_keys.key_blocks[0].data]
 for i,p in enumerate(old):
  hit,n,poly,_=skin.find_nearest(p);oldHit=before[min(body.data.polygons[poly].vertices,key=lambda j:(before[j]-p).length_squared)];j=min(body.data.polygons[poly].vertices,key=lambda j:(base.data[j].co-p).length_squared);delta=base.data[j].co-before[j]
  for k in o.data.shape_keys.key_blocks:k.data[i].co+=delta
  o.data.shape_keys.key_blocks['bodyFat'].data[i].co=o.data.shape_keys.key_blocks[0].data[i].co+keys['bodyFat'].data[j].co-base.data[j].co
 for k in o.data.shape_keys.key_blocks:k.value=0
with bpy.data.libraries.load(str(ROOT/'assets/blender/bulk-life-athlete-v6-work.blend'),link=False) as (a,b):b.objects=['BL_V4_Hair']
source=b.objects[0];cap=source.data.copy();cap.update()
for v in cap.vertices:
 p,n,_,_=skin.find_nearest(v.co);top=s((v.co.z-1.685)/.055);delta=(v.co-p)*(.42+.30*top)
 if delta.length<.0012:delta=n*.0012
 v.co=p+delta
cap.update();capTree=BVHTree.FromPolygons([v.co for v in cap.vertices],[list(p.vertices) for p in cap.polygons])
cardMaterial=cap.materials[0].copy();cardMaterial.name='V8_LicensedFeatheredHair'
pr=next(n for n in cardMaterial.node_tree.nodes if n.type=='BSDF_PRINCIPLED');pr.inputs['Roughness'].default_value=.79;pr.inputs['Specular IOR Level'].default_value=.20
texture=next(n.image for n in cardMaterial.node_tree.nodes if n.type=='TEX_IMAGE' and n.image);pw,ph=texture.size[:];pix=list(texture.pixels[:]);tint=Vector((.30,.235,.18))
uvs=[[tuple(cap.uv_layers.active.data[j].uv) for j in p.loop_indices] for p in cap.polygons]
def sample(point):
 best=None
 for hit,normal,index,distance in capTree.find_nearest_range(point,.055):
  poly=cap.polygons[index];ids=list(poly.vertices);vs=[cap.vertices[i].co for i in ids];uv=uvs[index]
  a,b,c=vs[:3];q=closest_point_on_tri(hit,a,b,c);u=b-a;v=c-a;w=q-a;den=u.dot(u)*v.dot(v)-u.dot(v)**2
  if abs(den)<1e-12:continue
  t=(w.dot(u)*v.dot(v)-w.dot(v)*u.dot(v))/den;r=(w.dot(v)*u.dot(u)-w.dot(u)*u.dot(v))/den
  U=uv[0][0]*(1-t-r)+uv[1][0]*t+uv[2][0]*r;V=uv[0][1]*(1-t-r)+uv[1][1]*t+uv[2][1]*r
  j=(max(0,min(ph-1,int(V*ph)))*pw+max(0,min(pw-1,int(U*pw))))*4;alpha=pix[j+3]
  if alpha<.65:continue
  score=distance+(1-alpha)*.004
  if best is None or score<best[0]:best=(score,Vector(pix[j:j+3]))
 # Image.pixels exposes the file's encoded samples; the image shader converts
 # sRGB to linear before its tint multiply. Vertex colours must do the same.
 color=best[1] if best else Vector((.12,.09,.065))
 color=Vector(tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in color))
 return Vector((color.x*tint.x,color.y*tint.y,color.z*tint.z))
verts=[v.co.copy() for v in cap.vertices];faces=[tuple(p.vertices) for p in cap.polygons];faceUV=[x for x in uvs];mats=[0]*len(faces);colors=[Vector((1,1,1)) for _ in verts]
mapping={};rear=[]
for p in body.data.polygons:
 def interior(i):
  x,y,z=base.data[i].co;return z>(1.710 if y<-.025 else 1.688 if abs(x)>.06 else 1.645+.15*abs(x))
 if not all(interior(i) for i in p.vertices):continue
 face=[]
 for i in p.vertices:
  if i not in mapping:mapping[i]=len(verts);point=base.data[i].co+body.data.vertices[i].normal*.00015;verts.append(point);colors.append(sample(point))
  face.append(mapping[i])
 faces.append(tuple(face));faceUV.append([(0,0)]*len(face));mats.append(1)
# Hierarchical broad-to-fine locks follow the cap instead of uniform rear noise.
areas=[];total=0
for p in cap.polygons:total+=p.area;areas.append(total)
random.seed(82411);locks=0
for _ in range(520):
 poly=cap.polygons[bisect.bisect_left(areas,random.random()*total)];ids=list(poly.vertices);j=random.randrange(1,len(ids)-1);tri=[ids[0],ids[j],ids[j+1]];r=math.sqrt(random.random());t=random.random();ws=[1-r,r*(1-t),r*t];p=sum((cap.vertices[i].co*w for i,w in zip(tri,ws)),Vector());n=sum((cap.vertices[i].normal*w for i,w in zip(tri,ws)),Vector()).normalized();top=s((p.z-1.685)/.055)
 if p.z<1.642:continue
 flow=Vector((.65*top+.07*(1-top),.65*top+.30*(1-top),-.95*(1-top)));flow-=n*flow.dot(n)
 if flow.length<.01:continue
 flow.normalize();across=n.cross(flow).normalized();length=(.009+top*.022)*random.uniform(.8,1.2);width=(.0006+top*.0014)*random.uniform(.7,1.15);start=len(verts);rootColor=sample(p);shade=random.uniform(.88,1.12)
 for f in [0,.2,.45,.72,1]:
  q,normal,_,_=capTree.find_nearest(p+flow*length*f);normal.normalize();q+=normal*(.00035+math.sin(f*math.pi)*(.0006+top*.0025));w=width*(1-f*.96);verts.extend([q-across*w,q+normal*w*.20,q+across*w]);colors.extend([rootColor*shade]*3)
 for j in range(4):
  for k in range(2):faces.append((start+j*3+k,start+j*3+k+1,start+(j+1)*3+k+1,start+(j+1)*3+k));faceUV.append([(0,0)]*4);mats.append(1)
 locks+=1
me=bpy.data.meshes.new('V8_CoherentShortGroom');me.from_pydata(verts,[],faces);me.update();me.materials.append(cardMaterial)
m=bpy.data.materials.new('V8_HairSampledAlbedo');m.use_nodes=True;p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(1,1,1,1);p.inputs['Roughness'].default_value=.79;p.inputs['Specular IOR Level'].default_value=.20;vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='GroomColor';m.node_tree.links.new(vc.outputs['Color'],p.inputs['Base Color']);me.materials.append(m)
uv=me.uv_layers.new(name='UVMap');col=me.color_attributes.new(name='GroomColor',type='FLOAT_COLOR',domain='POINT')
for i,c in enumerate(colors):col.data[i].color=(*c,1)
for p,coords,mi in zip(me.polygons,faceUV,mats):
 p.use_smooth=True;p.material_index=mi
 for i,c in zip(p.loop_indices,coords):uv.data[i].uv=c
hair=bpy.data.objects['BL_V4_Hair'];hair.data=me;vg=hair.vertex_groups.get('head') or hair.vertex_groups.new(name='head');vg.add(list(range(len(verts))),1,'REPLACE')
hair.shape_key_add(name='Basis');fat=hair.shape_key_add(name='bodyFat');lean=hair.shape_key_add(name='leanDefinition')
for i,p in enumerate(verts):
 hit,n,poly,_=skin.find_nearest(p);ids=list(body.data.polygons[poly].vertices);j=min(ids,key=lambda j:(base.data[j].co-hit).length_squared)
 fat.data[i].co=p+keys['bodyFat'].data[j].co-base.data[j].co;lean.data[i].co=p+keys['leanDefinition'].data[j].co-base.data[j].co
hair['v8Groom']='licensed feathered card flow + sampled-color undercoat and520 tapered locks; common albedo and roughness around the head'
body['v8FaceGroom']='orbital/cheek/alar/lip/chin geometry; matching sampled hair albedo; no baked muscle shadows'
(OUT/'face-groom.json').write_text(json.dumps({'faceVertices':faceCount,'directionalLocks':locks,'hairVertices':len(verts),'hairTriangles':sum(len(f)-2 for f in faces),'hairMaterials':2,'method':hair['v8Groom']},indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v8-work.blend'))
print('V8 face and coherent short groom saved',flush=True)
