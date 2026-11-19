"""Replace proximity-only shoulder weights with bounded anatomical regions.
The garment shares exact weights with its source body vertices.
"""
import bpy,math,json
from mathutils import Vector
from pathlib import Path
body=bpy.data.objects['BL_AthleteBody'];rig=bpy.data.objects['BL_AthleteRig'];garment=bpy.data.objects['BL_FittedShorts']
bone_names=[b.name for b in rig.data.bones if b.name!='root']
for obj in [body,garment]:
    for name in bone_names:
        vg=obj.vertex_groups.get(name)
        if vg:vg.remove(list(range(len(obj.data.vertices))))
def distance(v,b):
    h=b.head_local;t=b.tail_local;u=t-h;f=max(0,min(1,(v-h).dot(u)/u.length_squared));return (v-h-u*f).length
def mix_weights(v,names):
    d=sorted([(distance(v,rig.data.bones[n]),n) for n in names])[:2]
    w=[1/(a+.018)**5 for a,n in d];total=sum(w);return {n:s/total for (a,n),s in zip(d,w)}
def blend(a,b,t):
    result={k:v*(1-t) for k,v in a.items()}
    for k,v in b.items():result[k]=result.get(k,0)+v*t
    return result
def threshold(z):
    pts=[(.84,.245),(.98,.245),(1.16,.22),(1.3,.203),(1.4,.192),(1.5,.19)]
    for (za,xa),(zb,xb) in zip(pts,pts[1:]):
        if za<=z<=zb:return xa+(xb-xa)*(z-za)/(zb-za)
    return pts[0][1] if z<pts[0][0] else pts[-1][1]
all_weights=[]
for v in body.data.vertices:
    x,y,z=v.co;side='L' if x>0 else 'R';axial=mix_weights(v.co,['pelvis','spine','chest','head'])
    if z> .84:
        arm=mix_weights(v.co,['upperArm.'+side,'forearm.'+side,'hand.'+side])
        factor=max(0,min(1,(abs(x)-threshold(z))/.035)) if z<1.51 else 0
        factor=factor*factor*(3-2*factor)
        weights=blend(axial,arm,factor)
    else:weights=mix_weights(v.co,['thigh.'+side,'shin.'+side,'foot.'+side])
    if .80<z<1.01 and abs(x)<.21:
        leg=mix_weights(v.co,['thigh.'+side,'shin.'+side]);t=max(0,min(1,(.99-z)/.17));t=t*t*(3-2*t)
        weights=blend(axial,leg,t)
    weights={k:w for k,w in weights.items() if w>.0001};total=sum(weights.values());weights={k:w/total for k,w in weights.items()}
    all_weights.append(weights)
    for name,w in weights.items():body.vertex_groups[name].add([v.index],w,'REPLACE')
indices=list(garment['bodyVertexIndices'])
for j,i in enumerate(indices):
    for name,w in all_weights[i].items():garment.vertex_groups[name].add([j],w,'REPLACE')
body['skinningRevision']='anatomical-shoulder-v1';garment['skinningRevision']='anatomical-shoulder-v1'
print(json.dumps({'bodyVertices':len(all_weights),'garmentVertices':len(indices),'maxWeights':max(map(len,all_weights))}))
