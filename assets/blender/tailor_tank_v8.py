"""Retailor the actual tank: bounded ease, curved edges and thin sewn binding.
One Catmull-Clark level is concentrated on the retained garment panels, not body.
Every target and skin weight uses the same interpolation, so it exports to glTF.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import closest_point_on_tri
ROOT=Path(__file__).resolve().parents[2];body=bpy.data.objects['BL_V2_AthleteBody'];tank=bpy.data.objects['BL_V4_TrainingTank'];old=tank.data;ks=old.shape_keys.key_blocks;bk=body.data.shape_keys.key_blocks
assert not tank.get('v8Tailored'),'Run once on the v8 copy'
assert Path(bpy.data.filepath).name=='bulk-life-athlete-v8-work.blend'
panels=[p for p in old.polygons if p.material_index==0];ids=sorted({i for p in panels for i in p.vertices});remap={v:i for i,v in enumerate(ids)};faces=[tuple(remap[i] for i in p.vertices) for p in panels];points=[ks[0].data[i].co.copy() for i in ids]
uvs=[[old.uv_layers.active.data[i].uv.copy() for i in p.loop_indices] for p in panels]
weights=[{tank.vertex_groups[g.group].name:g.weight for g in old.vertices[i].groups} for i in ids]
# The current body, excluding arm skin, is the fitting surface for every endpoint.
base=[p.co.copy() for p in bk[0].data]
polys=[list(p.vertices) for p in body.data.polygons if all(sum(v.weight for v in body.data.vertices[i].groups if body.vertex_groups[v.group].name.startswith(('upperArm','forearm','hand','finger')))<.2 for i in p.vertices)]
tree=BVHTree.FromPolygons(base,polys)
def sample(point):
 hit,normal,index,distance=tree.find_nearest(point);poly=polys[index];best=None
 for j in range(1,len(poly)-1):
  tri=[poly[0],poly[j],poly[j+1]];a,b,c=[base[k] for k in tri];q=closest_point_on_tri(hit,a,b,c);u=b-a;v=c-a;w=q-a;den=u.dot(u)*v.dot(v)-u.dot(v)**2
  if abs(den)<1e-12:continue
  t=(w.dot(u)*v.dot(v)-w.dot(v)*u.dot(v))/den;r=(w.dot(v)*u.dot(u)-w.dot(u)*u.dot(v))/den
  e=((q-hit).length_squared,list(zip(tri,[1-t-r,t,r])))
  if best is None or e[0]<best[0]:best=e
 return hit,normal,best[1]
shape={k.name:[] for k in ks};fit=[]
for i,p in enumerate(points):
 hit,n,ws=sample(p);offset=p-hit
 # Preserve visible cloth ease without a rigid collar several cm from the chest.
 distance=offset.length;limit=.014 if p.z>1.35 else .020
 if distance>limit:p=hit+offset.normalized()*limit
 fit.append(p)
 for name in shape:
  if name=='Basis':q=p
  elif name=='seatedCloth':q=p+ks[name].data[ids[i]].co-ks[0].data[ids[i]].co
  elif name in bk:q=p+sum(((bk[name].data[j].co-base[j])*w for j,w in ws),Vector())
  else:q=p
  shape[name].append(q)
# Linear subdivision stencil: same geometry, morph and weight interpolation.
edgeFaces={};vertexFaces=[[] for _ in ids];neighbors=[set() for _ in ids]
for fi,face in enumerate(faces):
 for j,a in enumerate(face):
  b=face[(j+1)%len(face)];edgeFaces.setdefault(tuple(sorted((a,b))),[]).append(fi);vertexFaces[a].append(fi);neighbors[a].add(b);neighbors[b].add(a)
edgeKeys=list(edgeFaces);edgeIndex={e:len(ids)+j for j,e in enumerate(edgeKeys)};faceStart=len(ids)+len(edgeKeys)
stencils=[]
def average(indices):
 result={}
 for i in indices:result[i]=result.get(i,0)+1/len(indices)
 return result
fp=[average(face) for face in faces]
for i in range(len(ids)):
 boundary=[j for j in neighbors[i] if len(edgeFaces[tuple(sorted((i,j)))])==1]
 if len(boundary)==2:stencils.append({i:.75,boundary[0]:.125,boundary[1]:.125});continue
 n=len(vertexFaces[i]);d={i:(n-3)/n}
 for fi in vertexFaces[i]:
  for j,w in fp[fi].items():d[j]=d.get(j,0)+w/(n*n)
 for j in neighbors[i]:d[i]=d.get(i,0)+1/(n*n);d[j]=d.get(j,0)+1/(n*n)
 stencils.append(d)
for a,b in edgeKeys:
 adj=edgeFaces[(a,b)]
 if len(adj)==1:stencils.append({a:.5,b:.5})
 else:
  d={a:.25,b:.25}
  for fi in adj:
   for j,w in fp[fi].items():d[j]=d.get(j,0)+w*.25
  stencils.append(d)
stencils+=fp
newfaces=[];newuv=[]
for fi,face in enumerate(faces):
 uv=uvs[fi];center=sum(uv,Vector((0,0)))/len(uv)
 for j,a in enumerate(face):
  b=face[(j+1)%len(face)];prev=face[j-1];newfaces.append((a,edgeIndex[tuple(sorted((a,b)))],faceStart+fi,edgeIndex[tuple(sorted((prev,a)))]));newuv.append([uv[j],(uv[j]+uv[(j+1)%len(face)])*.5,center,(uv[j-1]+uv[j])*.5])
shape={name:[sum((values[j]*w for j,w in stencil.items()),Vector()) for stencil in stencils] for name,values in shape.items()}
newWeights=[]
for stencil in stencils:
 d={}
 for j,w in stencil.items():
  for name,amount in weights[j].items():d[name]=d.get(name,0)+amount*w
 newWeights.append(d)
# Sew a 1.4mm thick / 3mm wide rounded band along ordered open borders.
edgeCount={};faceAt={}
for fi,face in enumerate(newfaces):
 for j,a in enumerate(face):
  b=face[(j+1)%len(face)];e=tuple(sorted((a,b)));edgeCount[e]=edgeCount.get(e,0)+1;faceAt[(a,b)]=fi
boundary=[(a,b) for (a,b),fi in faceAt.items() if edgeCount[tuple(sorted((a,b)))]==1];anchors=sorted({i for a,b in boundary for i in [a,b]});adjFaces={i:[] for i in anchors}
for fi,face in enumerate(newfaces):
 for i in face:
  if i in adjFaces:adjFaces[i].append(fi)
start=len(shape['Basis']);lookup={i:start+n*4 for n,i in enumerate(anchors)}
for name,values in shape.items():
 for i in anchors:
  p=values[i];normal=Vector();center=Vector()
  for fi in adjFaces[i]:
   face=newfaces[fi];a,b,c=[values[j] for j in face[:3]];normal+=(b-a).cross(c-a);center+=sum((values[j] for j in face),Vector())/len(face)
  normal.normalize();inward=center/len(adjFaces[i])-p;inward-=normal*inward.dot(normal);inward.normalize()
  values.extend([p-normal*.0006,p+normal*.0008,p+inward*.003+normal*.0008,p+inward*.003-normal*.0006])
panelCount=len(newfaces)
for a,b in boundary:
 for k in range(4):newfaces.append((lookup[a]+k,lookup[b]+k,lookup[b]+(k+1)%4,lookup[a]+(k+1)%4));newuv.append([Vector((0,0))]*4)
for i in anchors:newWeights.extend([newWeights[i].copy() for _ in range(4)])
me=bpy.data.meshes.new('V8_FittedKnitWithThinSewnEdges');me.from_pydata(shape['Basis'],[],newfaces);me.update();me.materials.append(old.materials[0]);me.materials.append(old.materials[1]);uv=me.uv_layers.new(name='UVMap')
for fi,p in enumerate(me.polygons):
 p.use_smooth=True;p.material_index=0 if fi<panelCount else 1
 for loop,coord in zip(p.loop_indices,newuv[fi]):uv.data[loop].uv=coord
tank.data=me
for i,w in enumerate(newWeights):
 for name,amount in w.items():
  if amount>.00001:
   group=tank.vertex_groups.get(name) or tank.vertex_groups.new(name=name)
   group.add([i],amount,'REPLACE')
for name,values in shape.items():
 k=tank.shape_key_add(name=name);k.slider_min=-.3 if name in ['upperChest','chest','frontDelts','sideDelts','rearDelts','lats','upperBack','erectors','biceps','triceps','forearms','quads','hamstrings','glutes','calves','abs'] else 0;k.slider_max=1.2
 for i,p in enumerate(values):k.data[i].co=p
tank['v8Tailored']='bounded14–20mm ease; shared body endpoint fitting; one surface subdivision for curved collar/armholes;1.4mm x3mm stitched binding'
(ROOT/'docs/qa/anatomy-v8/tailoring.json').write_text(json.dumps({'panelVerticesBefore':len(ids),'verticesAfter':len(newWeights),'boundaryAnchors':len(anchors),'triangles':sum(len(p.vertices)-2 for p in me.polygons),'bindingThicknessMetres':.0014,'bindingWidthMetres':.003,'morphs':list(shape),'method':tank['v8Tailored']},indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
print('V8 fitted knit tank and thin binding saved',flush=True)
