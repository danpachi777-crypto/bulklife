"""A connected short fringe softens the cropped outline without skin flecks."""
import bpy,math,random,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
ROOT=Path(__file__).resolve().parents[2];hair=bpy.data.objects['BL_V4_Hair'];body=bpy.data.objects['BL_V2_AthleteBody'];old=hair.data
count=len(old.vertices)-(1450 if hair.get('v8FeatheredHairline') else 0)
keys={k.name:[v.co.copy() for v in k.data[:count]] for k in old.shape_keys.key_blocks};vertices=[v.copy() for v in keys['Basis']];polygons=[p for p in old.polygons if all(i<count for i in p.vertices)];faces=[tuple(p.vertices) for p in polygons];uvs=[[old.uv_layers.active.data[i].uv.copy() for i in p.loop_indices] for p in polygons];mats=[p.material_index for p in polygons];colors=[old.color_attributes['GroomColor'].data[i].color[:] for i in range(count)]
base=[p.co for p in body.data.shape_keys.key_blocks[0].data];skin=BVHTree.FromPolygons(base,[list(p.vertices) for p in body.data.polygons]);candidates=[i for i,c in enumerate(colors) if max(c[:3])<.3];tree=KDTree(len(candidates))
for i in candidates:tree.insert(vertices[i],i)
tree.balance();random.seed(82733);new=[]
for j in range(145):
 x=-.074+.148*(j+random.random())/145;ax=abs(x)
 edge=[v.z for v in vertices[:count] if abs(v.x-x)<.0035 and v.y<-.075 and 1.69<v.z<1.735]
 line=min(edge) if edge else 1.705+.008*(min(1,ax/.077)**1.6)
 # A forward ray preserves root height. Nearest-point projection from far in
 # front had slid roots down the forehead and detached them from the fringe.
 p,n,_,_=skin.ray_cast(Vector((x,-.30,line+.0028)),Vector((0,1,0)),.40)
 if p is None:p,n,_,_=skin.find_nearest(Vector((x,-.14,line+.0028)))
 _,index,_=tree.find(p);color=colors[index];flow=Vector((math.copysign(.12,x),0,-1));flow-=n*flow.dot(n);flow.normalize();across=n.cross(flow).normalized();length=random.uniform(.0028,.0044);width=random.uniform(.00027,.00048);start=len(vertices)
 for f in [0,.25,.5,.75,1]:
  q,normal,_,_=skin.find_nearest(p+flow*length*f);q+=normal*(.0012*(1-f)+.0002*f);w=width*(1-.96*f);vertices.extend([q-across*w,q+across*w]);colors.extend([color,color])
 for k in range(4):faces.append((start+2*k,start+2*(k+1),start+2*(k+1)+1,start+2*k+1));uvs.append([Vector((0,0))]*4);mats.append(1)
me=bpy.data.meshes.new('V8_ShortGroomFeatheredFront');me.from_pydata(vertices,[],faces);me.update()
for material in old.materials:me.materials.append(material)
uv=me.uv_layers.new(name='UVMap');color=me.color_attributes.new(name='GroomColor',type='FLOAT_COLOR',domain='POINT')
for i,c in enumerate(colors):color.data[i].color=c
for p,coords,mi in zip(me.polygons,uvs,mats):
 p.material_index=mi;p.use_smooth=True
 for loop,c in zip(p.loop_indices,coords):uv.data[loop].uv=c
hair.data=me;group=hair.vertex_groups.get('head') or hair.vertex_groups.new(name='head');group.add(list(range(len(vertices))),1,'REPLACE')
for name,original in keys.items():
 k=hair.shape_key_add(name=name)
 for i,p in enumerate(vertices):
  if i<len(original):k.data[i].co=original[i]
  elif name=='Basis':k.data[i].co=p
  else:
   hit,n,poly,_=skin.find_nearest(p);index=min(body.data.polygons[poly].vertices,key=lambda j:(base[j]-hit).length_squared);k.data[i].co=p+body.data.shape_keys.key_blocks[name].data[index].co-base[index]
hair['v8FeatheredHairline']='145 short connected tapered fringe clusters; irregular tips extend1–3mm past the cropped base outline, not disconnected forehead specks'
(ROOT/'docs/qa/anatomy-v8/fringe.json').write_text(json.dumps({'clusters':145,'vertices':len(vertices),'method':hair['v8FeatheredHairline']},indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
