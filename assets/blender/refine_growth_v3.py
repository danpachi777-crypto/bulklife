"""Tendon-preserving regional growth on one connected skin.
Removes squared overlapping shoulder displacement found in developed-body QA.
Changes visual morph deltas only, never simulation values or the bone skeleton.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import closest_point_on_tri
ROOT=Path('C:/Users/shota/Documents/BulkLife');body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];keys=body.data.shape_keys.key_blocks;basis=keys[0]
if body.get('growthRevisionV3'):raise RuntimeError('v3 growth already applied')
source=(ROOT/'assets/blender/sculpt_athlete_v2.py').read_text(encoding='utf-8')
exec(source[source.index('def clamp('):source.index('summaries=')])
parts=[k.name for k in list(keys)[1:] if k.name not in ['bodyFat','pump']]
old={p:[(v.co-b.co).copy() for v,b in zip(keys[p].data,basis.data)] for p in parts}
adj=[set() for _ in basis.data]
for edge in body.data.edges:
    a,b=edge.vertices;adj[a].add(b);adj[b].add(a)
fields={p:[] for p in parts}
loop=source[source.index('    v=point.co.copy();'):source.index('    total=sum(d.values()')]
compiled=compile('\n'.join(line[4:] for line in loop.splitlines()),'anatomical-fields','exec')
for i,point in enumerate(basis.data):
    exec(compiled)
    for p in parts:
        if p.endswith('Delts'):a,b=.24,.70
        elif p in ['biceps','triceps','forearms']:a,b=.30,1.50
        elif p in ['chest','upperChest']:a,b=.40,1.15
        elif p in ['quads','hamstrings','glutes','calves']:a,b=.42,1.25
        else:a,b=.45,.85
        fields[p].append(old[p][i]*a+d[p]*b)
for name,values in fields.items():
    for _ in range(3):
        values=[v.lerp(sum((values[j] for j in adj[i]),Vector())/len(adj[i]),.30) if adj[i] else v for i,v in enumerate(values)]
    for i,v in enumerate(values):keys[name].data[i].co=basis.data[i].co+v
# Limb proportions: upper-arm bellies should develop more than the wrist-side
# forearm. Preserve the original elbow/wrist taper and shared clothing mapping.
for name,factor in [('forearms',.65),('biceps',1.35),('triceps',1.25)]:
    for v,b in zip(keys[name].data,basis.data):v.co=b.co+(v.co-b.co)*factor
# Keep all interpolation continuous. Clothing receives the corresponding actual
# body morph delta, not a separate scale of its objects.
tree=BVHTree.FromPolygons([v.co for v in basis.data],[list(p.vertices) for p in body.data.polygons])
def samples(v):
    near,n,index,d=tree.find_nearest(v);ids=list(body.data.polygons[index].vertices);best=None
    for j in range(1,len(ids)-1):
        tri=[ids[0],ids[j],ids[j+1]];a,b,c=[basis.data[i].co for i in tri];q=closest_point_on_tri(near,a,b,c);distance=(q-near).length_squared
        u,w=b-a,c-a;v0=q-a;uu=u.dot(u);uw=u.dot(w);ww=w.dot(w);den=uu*ww-uw*uw
        if abs(den)<1e-12:continue
        t=(v0.dot(u)*ww-v0.dot(w)*uw)/den;s=(v0.dot(w)*uu-v0.dot(u)*uw)/den
        item=(distance,list(zip(tri,[1-t-s,t,s])))
        if best is None or distance<best[0]:best=item
    return best[1]
meta=json.loads((ROOT/'public/assets/regions-v2.json').read_text())
for name in ['BL_V2_Shorts','BL_V3_TrainingTank']:
    garment=bpy.data.objects[name];ks=garment.data.shape_keys.key_blocks
    mapping=meta['garmentSamples'] if name=='BL_V2_Shorts' else [samples(v.co) for v in ks[0].data]
    for part in parts:
        for j,weights in enumerate(mapping):ks[part].data[j].co=ks[0].data[j].co+sum(((keys[part].data[int(i)].co-basis.data[int(i)].co)*w for i,w in weights),Vector())
body['growthRevisionV3']='regional-taper-shoulder-transition-v1'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v3-work.blend'))
print('Refined 16 continuous regional morphs and transferred them to both garments')
