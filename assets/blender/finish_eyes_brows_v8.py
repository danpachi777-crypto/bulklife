"""Close-range face pass: radial iris structure and directional brows.
All features retain the existing eye size, head identity and gaze/blink controls.
"""
import bpy,math,random,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];body=bpy.data.objects['BL_V2_AthleteBody'];keys=body.data.shape_keys.key_blocks
assert Path(bpy.data.filepath).name=='bulk-life-athlete-v8-work.blend'
for side in ([] if body.get('v8EyesBrows') else ['L','R']):
 iris=bpy.data.objects['BL_V2_Iris.'+side];me=iris.data;col=me.color_attributes.new(name='IrisFibres',type='FLOAT_COLOR',domain='POINT')
 for v in me.vertices:
  r=min(1,math.hypot(v.co.x,v.co.z)/.0046);angle=math.atan2(v.co.z,v.co.x)
  fibre=.80+.12*math.sin(angle*53+math.sin(angle*9)*2+r*8)+.08*math.sin(angle*97-r*24)
  rim=max(0,min(1,(r-.84)/.14));inner=max(0,min(1,(.57-r)/.15));factor=fibre*(1-.63*rim)*(1-.35*inner)
  col.data[v.index].color=(.052*factor,.027*factor,.012*factor,1)
 material=bpy.data.materials.new('V8_BrownIrisFibres_'+side);material.use_nodes=True;p=material.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(1,1,1,1);p.inputs['Roughness'].default_value=.32;p.inputs['Specular IOR Level'].default_value=.32;p.inputs['Coat Weight'].default_value=.20;p.inputs['Coat Roughness'].default_value=.12
 color=material.node_tree.nodes.new('ShaderNodeVertexColor');color.layer_name=col.name;material.node_tree.links.new(color.outputs['Color'],p.inputs['Base Color']);me.materials.clear();me.materials.append(material)
 # Recess the pupil's former black sticker toward the curved iris surface.
 for v in bpy.data.objects['BL_V2_Pupil.'+side].data.vertices:v.co.y+=.00035
base=[v.co.copy() for v in keys[0].data];skin=BVHTree.FromPolygons(base,[list(p.vertices) for p in body.data.polygons]);counts=[]
for side in [-1,1]:
 random.seed(8300+side);vertices=[];faces=[];tones=[]
 for strand in range(250):
  t=random.betavariate(1.4,1.5);x=side*(.015+.047*t);z=1.6717+.0045*math.sin(math.pi*t)-.002*t+random.uniform(-.0016,.0016)*math.sin(math.pi*t)**.4
  p,n,_,_=skin.find_nearest(Vector((x,-.17,z)));direction=Vector((side*(.45+.55*t),0,.90*(1-t)+.10*t));direction-=n*direction.dot(n);direction.normalize();across=n.cross(direction).normalized();length=random.uniform(.0017,.0035)*(1-.25*t);width=random.uniform(.00020,.00033)*(1-.30*t);start=len(vertices);shade=random.uniform(.78,1.15)
  for f in [0,.25,.5,.75,1]:
   q,normal,_,_=skin.find_nearest(p+direction*length*f);q+=normal*(.00015+.00018*math.sin(math.pi*f));w=width*(1-.95*f);vertices.extend([q-across*w,q+across*w]);tones.extend([(shade*.024,shade*.014,shade*.008,1)]*2)
  for j in range(4):faces.append((start+j*2,start+(j+1)*2,start+(j+1)*2+1,start+j*2+1))
 me=bpy.data.meshes.new('V8_DirectionalBrow_'+str(side));me.from_pydata(vertices,[],faces);me.update();c=me.color_attributes.new(name='BrowTone',type='FLOAT_COLOR',domain='POINT')
 for i,color in enumerate(tones):c.data[i].color=color
 for p in me.polygons:p.use_smooth=True
 mat=bpy.data.materials.new('V8_BrowFibres_'+str(side));mat.use_nodes=True;pr=mat.node_tree.nodes.get('Principled BSDF');pr.inputs['Base Color'].default_value=(1,1,1,1);pr.inputs['Roughness'].default_value=.85;pr.inputs['Specular IOR Level'].default_value=.15;vc=mat.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name=c.name;mat.node_tree.links.new(vc.outputs['Color'],pr.inputs['Base Color']);me.materials.append(mat)
 brow=bpy.data.objects['BL_V4_Brow_'+str(side)];brow.data=me;head=brow.vertex_groups.get('head') or brow.vertex_groups.new(name='head');head.add(list(range(len(vertices))),1,'REPLACE');brow.shape_key_add(name='Basis')
 for name in ['bodyFat','leanDefinition']:
  k=brow.shape_key_add(name=name)
  for i,p in enumerate(vertices):
   hit,n,poly,_=skin.find_nearest(p);index=min(body.data.polygons[poly].vertices,key=lambda j:(base[j]-hit).length_squared);k.data[i].co=p+keys[name].data[index].co-base[index]
 counts.append({'side':side,'strands':250,'vertices':len(vertices)})
body['v8EyesBrows']='same eye size/gaze; radial brown iris and limbal transition; pupil recessed0.35mm;250 directional tapered brow hairs per side'
(ROOT/'docs/qa/anatomy-v8/eyes-brows.json').write_text(json.dumps({'method':body['v8EyesBrows'],'brows':counts,'irisSizeChanged':False,'faceIdentityChanged':False},indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
print('V8 close-range iris and directional brows saved',flush=True)
