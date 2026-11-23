"""Compare the licensed anatomical endpoint without overlapping sculpt fields."""
import bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
exec(compile((ROOT/'assets/blender/qa_anatomy_v8_initial.py').read_text().split('for stage,m,bf')[0],'qa-helper','exec'))
raw=[Vector(tuple(map(float,l.split()[1:4]))) for l in (ROOT/'assets/sources/makehuman/base.obj').read_text().splitlines() if l.startswith('v ')]
def read(n):
 return {int(a[0]):Vector(tuple(map(float,a[1:4]))) for l in (ROOT/'assets/sources/makehuman'/n).read_text().splitlines() if l.strip() and not l.startswith('#') for a in [l.split()]}
male=read('asian-male-young.target');mt=read('universal-male-young-maxmuscle-averageweight.target');ids=list(body['originalSourceIndices'])
ini=[raw[i]+male.get(i,Vector())+mt.get(i,Vector())*.25 for i in ids];scale=1.77/(max(v.y for v in ini)-min(v.y for v in ini))
base=[v.co.copy() for v in body.data.shape_keys.key_blocks[0].data]
draft=body.shape_key_add(name='SourceDiagnostic')
for amount in [1.5,2.5]:
 state(0,0,False,'GymIdle',1)
 for k in body.data.shape_keys.key_blocks:k.value=0
 for j,i in enumerate(ids):
  d=mt.get(i,Vector());d=Vector((d.x,-d.z,d.y))*scale*amount
  if base[j].z>1.49:d*=0
  draft.data[j].co=base[j]+d
 draft.value=1
 for label,eye in [('FRONT',(0,-4.3,1.2)),('SIDE',(4.3,0,1.2))]:render('diagnostic-source-'+str(amount)+'-'+label,eye)
hair=bpy.data.objects['BL_V4_Hair']
for m in hair.data.materials:
 print('HAIRMATERIAL',m.name,flush=True)
 for n in m.node_tree.nodes:
  print(n.type,n.name,[(i.name,list(i.default_value) if hasattr(i.default_value,'__len__') else i.default_value) for i in n.inputs if hasattr(i,'default_value') and i.name in ['Base Color','Color1','Color2','Fac']],flush=True)
