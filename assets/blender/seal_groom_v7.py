"""A hidden rear-skull undercoat closes card/interpolation gaps. Hair and
brow roots share the actual facial fat target rather than piercing heavier heads.
"""
import bpy,json,math,random
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/portrait-v7'
body=bpy.data.objects['BL_V2_AthleteBody'];keys=body.data.shape_keys.key_blocks;basis=keys[0];hair=bpy.data.objects['BL_V4_Hair']
assert bpy.data.filepath.endswith('bulk-life-athlete-v7-work.blend')
assert not hair.get('v7ScalpSeal'),'Run on the groom without the undercoat'
old=hair.data;verts=[v.co.copy() for v in old.vertices];faces=[];materials=[];uvs=[]
removed=0
for p in old.polygons:
 c=sum((old.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
 # The rear cards' opaque centres read as flat dark rectangles in the game.
 # Replace this internal region with a skull-fitted groom, keeping feathered edges.
 if p.material_index==0 and c.y>.018:removed+=1;continue
 faces.append(tuple(p.vertices));materials.append(p.material_index);uvs.append([tuple(old.uv_layers.active.data[i].uv) for i in p.loop_indices])
mapping={}
rear=[]
for poly in body.data.polygons:
 if not all(basis.data[i].co.z>1.585+.25*abs(basis.data[i].co.x) and basis.data[i].co.y>-.024 for i in poly.vertices):continue
 face=[]
 for i in poly.vertices:
  if i not in mapping:mapping[i]=len(verts);verts.append(basis.data[i].co+body.data.vertices[i].normal*.0022)
  face.append(mapping[i])
 faces.append(tuple(face));materials.append(2);uvs.append([(0,0)]*len(face));rear.append(list(poly.vertices))
surfacePoints=[v.co.copy() for v in basis.data]
skinTree=BVHTree.FromPolygons(surfacePoints,[list(p.vertices) for p in body.data.polygons])
edgeCounts={}
for face in rear:
 for a,b in zip(face,face[1:]+face[:1]):edge=tuple(sorted((a,b)));edgeCounts[edge]=edgeCounts.get(edge,0)+1
edgeIds={i for edge,count in edgeCounts.items() if count==1 for i in edge}
for i in edgeIds:
 p=surfacePoints[i]
 if p.z<1.68 and p.y>.018:
  # Fit the nape to a continuous shallow curve. Selecting whole skull polygons
  # alone leaves three rectangular teeth at the cut line.
  sample=p.copy();sample.z=1.615+.32*abs(p.x)
  point,normal,_,_=skinTree.find_nearest(sample);surfacePoints[i]=point
  verts[mapping[i]]=point+normal*.0022
treeRear=BVHTree.FromPolygons(surfacePoints,rear)
random.seed(73180);locks=0
for _ in range(1800):
 ids=random.choice(rear);a,b,c=[surfacePoints[i] for i in [ids[0],ids[1],ids[-1]]];r=math.sqrt(random.random());t=random.random();point=a*(1-r)+b*r*(1-t)+c*r*t
 hit,n,_,_=treeRear.find_nearest(point);n.normalize();direction=Vector((.2,-.15,-1));direction-=n*direction.dot(n)
 if direction.length<.01:continue
 direction.normalize();across=n.cross(direction).normalized();length=random.uniform(.008,.018);width=random.uniform(.0003,.00065);start=len(verts)
 for f in [0,.3,.65,1]:
  q,normal,_,_=treeRear.find_nearest(point+direction*length*f);normal.normalize();q+=normal*(.0025+math.sin(f*math.pi)*.0015);w=width*(1-.95*f)
  verts.extend([q-across*w,q+normal*w*.25,q+across*w])
 shade=random.choices([1,2,3,4,5],[12,26,32,25,5])[0]
 for j in range(3):
  for k in range(2):faces.append((start+j*3+k,start+j*3+k+1,start+(j+1)*3+k+1,start+(j+1)*3+k));materials.append(shade);uvs.append([(0,0)]*4)
 locks+=1
mesh=bpy.data.meshes.new('V7_FittedLayersWithRearUndercoat');mesh.from_pydata(verts,[],faces);mesh.update();hair.data=mesh
for m in old.materials:mesh.materials.append(m)
# Opaque geometry must match the sampled brown card midtones, not its black
# transparent background. Keep the front feathered hairline texture unchanged.
for i,color in enumerate([(.050,.029,.016),(.065,.038,.021),(.080,.048,.027),(.095,.058,.033),(.110,.068,.040)],1):
 pr=next(n for n in mesh.materials[i].node_tree.nodes if n.type=='BSDF_PRINCIPLED');pr.inputs['Base Color'].default_value=(*color,1)
uv=mesh.uv_layers.new(name='UVMap')
for p,mi in zip(mesh.polygons,materials):p.use_smooth=True;p.material_index=mi
for p,values in zip(mesh.polygons,uvs):
 for i,value in zip(p.loop_indices,values):uv.data[i].uv=value
vg=hair.vertex_groups.get('head') or hair.vertex_groups.new(name='head');vg.add(list(range(len(verts))),1,'REPLACE')
tree=BVHTree.FromPolygons([v.co for v in basis.data],[list(p.vertices) for p in body.data.polygons])
counts={};maximum=0
for o in [hair,bpy.data.objects['BL_V4_Brow_-1'],bpy.data.objects['BL_V4_Brow_1']]:
 if o.data.shape_keys:o.shape_key_clear()
 base=o.shape_key_add(name='Basis');fat=o.shape_key_add(name='bodyFat');fat.slider_min=-.65;fat.slider_max=1.2
 for i,v in enumerate(base.data):
  hit,n,poly,_=tree.find_nearest(v.co);ids=list(body.data.polygons[poly].vertices);weights=[1/max(.0002,(basis.data[j].co-hit).length)**2 for j in ids];total=sum(weights)
  d=sum(((keys['bodyFat'].data[j].co-basis.data[j].co)*w/total for j,w in zip(ids,weights)),Vector());fat.data[i].co=v.co+d;maximum=max(maximum,d.length)
 counts[o.name]=len(base.data)
for j,i in mapping.items():hair.data.shape_keys.key_blocks['bodyFat'].data[i].co=verts[i]+keys['bodyFat'].data[j].co-basis.data[j].co
hair['v7ScalpSeal']='rear-skull surface copy only, concealed under the groom; hair/brows follow bodyFat'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v7-work.blend'))
(OUT/'root-fit-report.json').write_text(json.dumps({'rearUndercoatVertices':len(mapping),'replacedRearCardFaces':removed,'rearDirectionalLocks':locks,'morphedMeshes':counts,'maxFatFollowMetres':maximum,'method':hair['v7ScalpSeal']},indent=2),encoding='utf8')
print('V7 rear undercoat and facial-fat root following saved',flush=True)
