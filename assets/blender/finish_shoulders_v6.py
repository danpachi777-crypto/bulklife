"""Relax the posed shoulder ridge in surface space, retaining the chest fold.
The correction remains a glTF morph driven by arm elevation, not a material trick.
Run once on the final v6 work copy, after pose_elbows_v6.py.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[2]
assert bpy.data.filepath.endswith('bulk-life-athlete-v6-work.blend')
body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig']
keys=body.data.shape_keys.key_blocks;basis=keys[0];key=keys['shoulderRaise']
for k in keys:k.value=0
rig.animation_data.action=bpy.data.actions['FrontDoubleBiceps'];bpy.context.scene.frame_set(25);bpy.context.view_layer.update()
adj=[set() for _ in basis.data]
for e in body.data.edges:
 a,b=e.vertices;adj[a].add(b);adj[b].add(a)
matrices=[];posed=[]
for i,v in enumerate(basis.data):
 matrix=Matrix(((0,0,0,0),)*4);total=0
 for g in body.data.vertices[i].groups:
  name=body.vertex_groups[g.group].name
  if name in rig.pose.bones:matrix+=(rig.pose.bones[name].matrix@rig.data.bones[name].matrix_local.inverted())*g.weight;total+=g.weight
 matrix=matrix*(1/total) if total else Matrix.Identity(4)
 matrices.append(matrix);posed.append(matrix@key.data[i].co)
original=[v.copy() for v in posed]
def smooth(t):
 t=max(0,min(1,t));return t*t*(3-2*t)
def mask(v):
 x,y,z=v;ax=abs(x)
 return smooth((ax-.12)/.055)*smooth((.39-ax)/.075)*smooth((z-1.29)/.07)*smooth((1.52-z)/.045)
for step in range(6):
 posed=[v.lerp(sum((posed[j] for j in adj[i]),Vector())/len(adj[i]),.42*mask(original[i])) if adj[i] else v for i,v in enumerate(posed)]
changed=0;maximum=0
for i,v in enumerate(posed):
 delta=v-original[i]
 if delta.length>.012:delta*=.012/delta.length
 if delta.length<.00002:continue
 bind=matrices[i].inverted_safe().to_3x3()@delta
 candidate=key.data[i].co+bind-basis.data[i].co
 if candidate.length>.020:candidate*=.020/candidate.length
 key.data[i].co=basis.data[i].co+candidate;changed+=1;maximum=max(maximum,candidate.length)
body.data.update()
(ROOT/'docs/qa/decisions-v6/shoulder-surface-correction.json').write_text(json.dumps({'vertices':changed,'maxBindDisplacementMetres':maximum,'method':'six local surface-space relaxation passes on elevated shoulder; inverse four-bone skinning; same runtime shoulderRaise driver','limit':'A shallow corrective, not a replacement for a fully sculpted pose-specific anatomical surface.'},indent=2),encoding='utf8')
rig.animation_data.action=bpy.data.actions['GymIdle'];bpy.context.scene.frame_set(1)
for k in keys:k.value=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v6-work.blend'))
