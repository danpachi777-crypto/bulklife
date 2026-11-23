"""Finish continuous torso surfaces and sew thin binding around garment edges."""
import bpy,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/portrait-v7'
assert bpy.data.filepath.endswith('bulk-life-athlete-v7-work.blend')
body=bpy.data.objects['BL_V2_AthleteBody'];keys=body.data.shape_keys.key_blocks;basis=keys[0]
def s(t):t=max(0,min(1,t));return t*t*(3-2*t)
coords=[v.co.copy() for v in basis.data];adj=[set() for _ in coords]
for e in body.data.edges:a,b=e.vertices;adj[a].add(b);adj[b].add(a)
mask=[s((v.z-1.23)/.055)*s((1.46-v.z)/.055)*s((.22-abs(v.x))/.07)*s((-v.y-.025)/.065) for v in coords]
changed={}
for key in keys:
 before=[v.co.copy() for v in key.data];points=[v.copy() for v in before]
 # Alternating positive/negative Laplacian steps remove narrow ridges while
 # retaining broad pectoral volume, unlike repeatedly shrinking the whole torso.
 for step in range(12):
  factor=.44 if step%2==0 else -.46
  points=[v+(sum((points[j] for j in adj[i]),Vector())/len(adj[i])-v)*factor*mask[i] if adj[i] and mask[i]>.001 else v for i,v in enumerate(points)]
 delta=[v-old for v,old in zip(points,before)];changed[key.name]=delta
 for v,p in zip(key.data,points):v.co=p
body.data.update()
tank=bpy.data.objects['BL_V4_TrainingTank'];tk=tank.data.shape_keys.key_blocks
tree=BVHTree.FromPolygons(coords,[list(p.vertices) for p in body.data.polygons])
for i,p in enumerate(tk[0].data):
 _,_,poly,_=tree.find_nearest(p.co);j=min(body.data.polygons[poly].vertices,key=lambda j:(coords[j]-p.co).length)
 for key in tk:key.data[i].co+=changed[key.name if key.name in changed else 'Basis'][j]
tank.data.update();old=tank.data;old.use_fake_user=True
base=[v.co.copy() for v in tk[0].data];shapes={k.name:[p.co.copy() for p in k.data] for k in tk};ranges={k.name:(k.slider_min,k.slider_max) for k in tk}
groupNames=[g.name for g in tank.vertex_groups];groups=[[(g.group,g.weight) for g in v.groups] for v in old.vertices];uvs=[[tuple(old.uv_layers.active.data[i].uv) for i in p.loop_indices] for p in old.polygons]
faces=[tuple(p.vertices) for p in old.polygons];mats=[p.material_index for p in old.polygons];counts={};adj=[set() for _ in base]
for face in faces:
 for a,b in zip(face,face[1:]+face[:1]):e=tuple(sorted((a,b)));counts[e]=counts.get(e,0)+1;adj[a].add(b);adj[b].add(a)
boundary={i for edge,n in counts.items() if n==1 for i in edge};outer={i:next(j for j in adj[i] if j not in boundary) for i in boundary}
ring={i:[] for i in boundary}
for (a,b),n in counts.items():
 if n==1:ring[a].append(b);ring[b].append(a)
verts=[v.copy() for v in base];anchor=[];band={};loops=[];remaining=set(boundary)
while remaining:
 first=min(remaining);loop=[first];previous=None;current=first
 while True:
  choices=[j for j in ring[current] if j!=previous]
  if not choices:break
  nxt=choices[0]
  if nxt==first:break
  loop.append(nxt);previous,current=current,nxt
  if len(loop)>len(boundary):raise RuntimeError('Garment edge is not a closed loop')
 remaining.difference_update(loop);loops.append(loop)
# Average only the real fabric faces. Thin return faces give misleading normals
# at the cut edge and previously made the strip alternate in/out of the cloth.
surface={j:Vector() for j in outer.values()}
for poly in old.polygons:
 if any(i in boundary for i in poly.vertices):continue
 for j in poly.vertices:
  if j in surface:surface[j]+=poly.normal*poly.area
for loop in loops:
 normals=[surface[outer[i]].normalized() if surface[outer[i]].length else old.vertices[outer[i]].normal.copy() for i in loop]
 for _ in range(5):normals=[(normals[k]*2+normals[(k-1)%len(loop)]+normals[(k+1)%len(loop)]).normalized() for k in range(len(loop))]
 inside=[];score=0
 for k,i in enumerate(loop):
  j=outer[i];p=base[j];tangent=(base[outer[loop[(k+1)%len(loop)]]]-base[outer[loop[(k-1)%len(loop)]]]).normalized();direction=normals[k].cross(tangent).normalized();inside.append(direction)
  candidates=[a for a in adj[j] if a not in boundary and a not in surface]
  target=sum((base[a]-p for a in candidates),Vector())/len(candidates) if candidates else Vector((0,0,1.24))-p
  score+=direction.dot(target)
 if score<0:inside=[-v for v in inside]
 for k,i in enumerate(loop):
  j=outer[i];p=base[j];normal=normals[k];direction=inside[k];band[i]=len(verts)
  for q in [p+normal*.0007,p+direction*.004+normal*.0007,p+direction*.004-normal*.0002,p-normal*.0002]:verts.append(q);anchor.append(j)
 # Preserve cyclic edge order. Sorted vertex IDs randomly reversed old faces.
 for k,(a,b) in enumerate(zip(loop,loop[1:]+loop[:1])):
  x,y=band[a],band[b];outward=(verts[y]-verts[x]).cross(verts[y+1]-verts[x]).dot(normals[k])>=0
  for q in range(4):
   face=(x+q,y+q,y+(q+1)%4,x+(q+1)%4);faces.append(face if outward else tuple(reversed(face)));mats.append(len(old.materials))
mesh=bpy.data.meshes.new('V7_TankWithSewnBinding');mesh.from_pydata(verts,[],faces);mesh.update();tank.data=mesh
for name in groupNames:tank.vertex_groups.new(name=name)
for m in old.materials:mesh.materials.append(m)
binding=bpy.data.materials.new('V7_KnitBinding');binding.use_nodes=True;p=next(n for n in binding.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(.065,.105,.12,1);p.inputs['Roughness'].default_value=.94;mesh.materials.append(binding)
uv=mesh.uv_layers.new(name='UVMap')
for p,mi in zip(mesh.polygons,mats):p.material_index=mi;p.use_smooth=True
for p,values in zip(mesh.polygons,uvs):
 for loop,value in zip(p.loop_indices,values):uv.data[loop].uv=value
for name,points in shapes.items():
 key=tank.shape_key_add(name=name);key.slider_min,key.slider_max=ranges[name]
 for i,p in enumerate(points):key.data[i].co=p
 for extra,j in enumerate(anchor):key.data[len(base)+extra].co=verts[len(base)+extra]+points[j]-base[j]
for i,weights in enumerate(groups+[groups[j] for j in anchor]):
 for group,w in weights:tank.vertex_groups[group].add([i],w,'REPLACE')
report={'torsoSurfaceVertices':sum(v>.001 for v in mask),'maxTorsoFinishMetres':max(v.length for ds in changed.values() for v in ds),'bindingVertices':len(anchor),'bindingWidthMetres':.004,'bindingThicknessMetres':.0009,'method':'volume-preserving local torso surface finish; physical knitted edge binding shares every body and pose target and skin weights'}
(OUT/'finish-report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v7-work.blend'))
print('V7 torso finish and sewn binding saved',flush=True)
