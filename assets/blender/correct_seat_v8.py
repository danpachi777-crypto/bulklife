"""Bake soft contact with the actual exported bench, while keeping feet grounded.
Three source-height anchors accommodate the six unchanged athlete heights.
"""
import bpy,json
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];keys=body.data.shape_keys.key_blocks;parts=['upperChest','chest','frontDelts','sideDelts','rearDelts','lats','upperBack','erectors','biceps','triceps','forearms','quads','hamstrings','glutes','calves','abs']
base=[v.co.copy() for v in keys[0].data];high=[p+sum((keys[n].data[i].co-p for n in parts),Vector())*1.2 for i,p in enumerate(base)];fat=[keys['bodyFat'].data[i].co.copy() for i in range(len(base))]
for k in keys:k.value=0
rig.animation_data.action=bpy.data.actions['SeatedPrepare'];bpy.context.scene.frame_set(193);bpy.context.view_layer.update()
trans={b.name:rig.pose.bones[b.name].matrix@b.matrix_local.inverted() for b in rig.data.bones};matrices=[]
for v in body.data.vertices:
 entries=[(body.vertex_groups[g.group].name,g.weight) for g in v.groups if body.vertex_groups[g.group].name in trans];total=sum(w for n,w in entries);m=Matrix(((0,0,0,0),)*4)
 for name,w in entries:m+=trans[name]*(w/total)
 matrices.append(m)
def s(t):t=max(0,min(1,t));return t*t*(3-2*t)
report={};names=[]
for label,plane in [('Low',.445),('Mid',.472),('High',.500)]:
 for suffix in ['', 'Muscle','Fat']:
  name='seatedSeat'+label+suffix;names.append(name)
  if name not in keys:body.shape_key_add(name=name)
 for i,p in enumerate(base):
  m=matrices[i];a=m@p;b=m@high[i];c=m@fat[i]
  mask=s((p.z-.73)/.065)*s((1.05-p.z)/.06)*s((p.y+.015)/.035)*s((.23-abs(p.x))/.05)*s((.18-abs(a.y))/.035)
  def compression(z):return max(0,plane-z)*mask
  baseRaise=compression(a.z)
  for suffix,amount in [('',baseRaise),('Muscle',compression(b.z)-baseRaise),('Fat',compression(c.z)-baseRaise)]:keys['seatedSeat'+label+suffix].data[i].co=p+m.inverted_safe().to_3x3()@Vector((0,0,amount))
 report[label]={'sourceSeatPlane':plane,'maxBaseCorrection':max((keys['seatedSeat'+label].data[i].co-p).length for i,p in enumerate(base))}
# Carry real seated contact into both shorts, retaining their cloth allowance.
tree=BVHTree.FromPolygons(base,[list(p.vertices) for p in body.data.polygons])
for o in [bpy.data.objects['BL_V2_Shorts'],bpy.data.objects['BL_V4_TrainingShorts']]:
 ks=o.data.shape_keys.key_blocks
 for name in names:
  if name not in ks:o.shape_key_add(name=name)
 for i,p in enumerate(ks[0].data):
  hit,n,index,_=tree.find_nearest(p.co);ids=body.data.polygons[index].vertices;ws=[1/max(.001,(base[j]-hit).length)**2 for j in ids];total=sum(ws)
  for name in names:ks[name].data[i].co=p.co+sum(((keys[name].data[j].co-base[j])*w/total for j,w in zip(ids,ws)),Vector())
body['v8SeatedSupport']='bench top0.4825m, feet remain grounded; local contact compression with three height anchors, separately driven muscle/fat'
rig.animation_data.action=bpy.data.actions['GymIdle'];bpy.context.scene.frame_set(1)
(ROOT/('docs/qa/anatomy-v8/seat-'+body.get('frameV8','standard')+'.json')).write_text(json.dumps(report,indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
print('V8 bench-contact shape anchors saved',flush=True)
