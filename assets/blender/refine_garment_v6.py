"""Tailor a round neck and continuous shoulder response on the v6 duplicate.
The protected v5 file is never saved. Run once after refine_decision_v6.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from mathutils.geometry import closest_point_on_tri
ROOT=Path(__file__).resolve().parents[2]
assert bpy.data.filepath.endswith('bulk-life-athlete-v6-work.blend')
body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];keys=body.data.shape_keys.key_blocks;basis=keys[0]
tree=BVHTree.FromPolygons([v.co for v in basis.data],[list(p.vertices) for p in body.data.polygons])
def sample(v):
    point,n,idx,dist=tree.find_nearest(v);ids=list(body.data.polygons[idx].vertices);best=None
    for j in range(1,len(ids)-1):
        tri=[ids[0],ids[j],ids[j+1]];a,b,c=[basis.data[k].co for k in tri];q=closest_point_on_tri(point,a,b,c);u,w=b-a,c-a;d=q-a;uu=u.dot(u);uw=u.dot(w);ww=w.dot(w);den=uu*ww-uw*uw
        if abs(den)<1e-12:continue
        t=(d.dot(u)*ww-d.dot(w)*uw)/den;s=(d.dot(w)*uu-d.dot(u)*uw)/den
        item=((q-point).length_squared,list(zip(tri,[1-t-s,t,s])))
        if best is None or item[0]<best[0]:best=item
    return best[1]
tank=bpy.data.objects['BL_V4_TrainingTank'];ks=tank.data.shape_keys.key_blocks
if 'shoulderRaise' not in ks:tank.shape_key_add(name='shoulderRaise')
if tank.get('v6TailoredRoundNeck'):raise RuntimeError('Run once on the pre-tailoring v6 copy')
adj=[set() for _ in tank.data.vertices];counts={}
for p in tank.data.polygons:
    ids=list(p.vertices)
    for a,b in zip(ids,ids[1:]+ids[:1]):edge=tuple(sorted((a,b)));counts[edge]=counts.get(edge,0)+1
for e in tank.data.edges:a,b=e.vertices;adj[a].add(b);adj[b].add(a)
boundary={i for edge,n in counts.items() if n==1 for i in edge}
partners={i:min((j for j in adj[i] if j not in boundary),key=lambda j:(ks[0].data[i].co-ks[0].data[j].co).length,default=i) for i in boundary}
old=[v.co.copy() for v in ks[0].data];moves={}
for i,p in enumerate(old):
    if i in boundary:continue
    x,y,z=p;ax=abs(x)
    if y<-.04 and ax<.085 and z>1.32:
        neck=1.355+.065*(min(ax,.085)/.085)**2
        if z>neck:
            d=Vector((0,0,-min(.065,(z-neck)*.90)))
            q,normal,_,_=tree.ray_cast(Vector((x,-.4,z+d.z)),Vector((0,1,0)))
            if q is not None:d.y=min(0,q.y-.014-y)
            moves[i]=d
for i,j in partners.items():
    if j in moves:moves[i]=moves[j]
for i,d in moves.items():
    for key in ks:key.data[i].co+=d
# Resample physical AND raised-shoulder targets at the new garment surface.
for i,v in enumerate(ks[0].data):
    mapping=sample(v.co)
    for key in ks:
        if key.name in keys and key.name!='Basis':key.data[i].co=v.co+sum(((keys[key.name].data[j].co-basis.data[j].co)*w for j,w in mapping),Vector())
# Fabric spans the clavicle rather than following abrupt skin-weight changes.
names={b.name for b in rig.data.bones};weights=[]
for v in tank.data.vertices:weights.append({tank.vertex_groups[g.group].name:g.weight for g in v.groups if tank.vertex_groups[g.group].name in names})
for _ in range(4):
    updated=[]
    for i,w in enumerate(weights):
        if ks[0].data[i].co.z<1.27 or not adj[i]:updated.append(w);continue
        average={}
        for j in adj[i]:
            for name,n in weights[j].items():average[name]=average.get(name,0)+n/len(adj[i])
        updated.append({name:w.get(name,0)*.55+average.get(name,0)*.45 for name in set(w)|set(average)})
    weights=updated
for i,w in enumerate(weights):
    p=ks[0].data[i].co
    if p.z>1.30:
        t=max(0,min(1,(abs(p.x)-.075)/.045));anchor=1-t*t*(3-2*t)
        w={name:n*(1-anchor) for name,n in w.items()};w['chest']=w.get('chest',0)+anchor
    w=dict(sorted(w.items(),key=lambda q:-q[1])[:4]);total=sum(w.values())
    for g in list(tank.data.vertices[i].groups):
        if tank.vertex_groups[g.group].name in names:tank.vertex_groups[g.group].remove([i])
    for name,n in w.items():
        if n>0:tank.vertex_groups[name].add([i],n/total,'REPLACE')
# Pose-space edge correction keeps the seam round when the arms rise.
for key in keys:key.value=0
rig.animation_data.action=bpy.data.actions['FrontDoubleBiceps'];bpy.context.scene.frame_set(25);bpy.context.view_layer.update()
matrices=[];posed=[]
for i,v in enumerate(ks[0].data):
    mat=Matrix(((0,0,0,0),)*4)
    for g in tank.data.vertices[i].groups:
        name=tank.vertex_groups[g.group].name
        if name in names:mat+=(rig.pose.bones[name].matrix@rig.data.bones[name].matrix_local.inverted())*g.weight
    matrices.append(mat);posed.append(mat@ks['shoulderRaise'].data[i].co)
edgeAdj={i:set() for i in boundary}
for (a,b),n in counts.items():
    if n==1:edgeAdj[a].add(b);edgeAdj[b].add(a)
targets=[v.copy() for v in posed]
for _ in range(5):
    targets=[v.lerp(sum((targets[j] for j in edgeAdj[i]),Vector())/len(edgeAdj[i]),.30) if i in edgeAdj and edgeAdj[i] and ks[0].data[i].co.z>1.27 else v for i,v in enumerate(targets)]
corrected=0
for i in boundary:
    if ks[0].data[i].co.z<=1.27:continue
    d=targets[i]-posed[i]
    if d.length>.018:d*=.018/d.length
    for index in {i,partners[i]}:
        delta=matrices[index].inverted_safe().to_3x3()@d
        ks['shoulderRaise'].data[index].co+=delta
    corrected+=1
for m in tank.data.materials:
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(.11,.16,.18,1);p.inputs['Roughness'].default_value=.91
tank['v6TailoredRoundNeck']=True;tank.data.update()
# Preserve visible upper chest around the new neckline and arm openings.
vg=body.vertex_groups.get('V4_ClothEnclosed')
if vg:
    vg.remove(list(range(len(body.data.vertices))))
    ids=[]
    for i,v in enumerate(basis.data):
        x,y,z=v.co;arm=sum(g.weight for g in body.data.vertices[i].groups if body.vertex_groups[g.group].name.startswith(('finger','hand','forearm','upperArm')))
        if arm<.15 and (z<.112 or .695<z<.99 or (.985<z<1.30 and abs(x)<.16)):ids.append(i)
    vg.add(ids,1,'REPLACE')
rig.animation_data.action=bpy.data.actions['GymIdle'];bpy.context.scene.frame_set(1)
(ROOT/'docs/qa/decisions-v6/garment-refinement.json').write_text(json.dumps({'neckVertices':len(moves),'poseEdgeVertices':corrected,'method':'round neck fitting; shoulder weight diffusion; matching physical/pose target transfer; raised seam correction; upper chest coverage retained'},indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v6-work.blend'))
print('V6 garment neck, shoulder weights, pose edge and upper-body coverage updated',flush=True)
