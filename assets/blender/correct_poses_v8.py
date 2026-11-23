"""Pose corrections from volume-preserving dual-quaternion reference skinning.
The game still uses glTF LBS; the baked differences are ordinary morph targets,
driven by the actual shoulder/elbow angles and regional development.
"""
import bpy,json,math
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/anatomy-v8';body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];keys=body.data.shape_keys.key_blocks
assert Path(bpy.data.filepath).name.startswith('bulk-life-athlete-v8')
assert not body.get('v8PoseCorrection'),'Run once after the base rebuild'
parts=['upperChest','chest','frontDelts','sideDelts','rearDelts','lats','upperBack','erectors','biceps','triceps','forearms','quads','hamstrings','glutes','calves','abs']
base=[v.co.copy() for v in keys[0].data];high=[p+sum((keys[n].data[i].co-p for n in parts),Vector())*1.2 for i,p in enumerate(base)]
skin=[[(body.vertex_groups[g.group].name,g.weight) for g in v.groups if body.vertex_groups[g.group].name in rig.data.bones] for v in body.data.vertices]
def s(t):t=max(0,min(1,t));return t*t*(3-2*t)
def reset(clip,frame):
 for k in keys:k.value=0
 rig.animation_data.action=bpy.data.actions[clip];bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
def transforms():return {b.name:rig.pose.bones[b.name].matrix@b.matrix_local.inverted() for b in rig.data.bones}
def blend(i,trans):
 entries=skin[i];m=Matrix(((0,0,0,0),)*4);real=Quaternion((0,0,0,0));dual=Quaternion((0,0,0,0));reference=None;total=sum(w for n,w in entries)
 for n,w in entries:
  t=trans[n];m+=t*(w/total);q=t.to_quaternion().normalized();d=(Quaternion((0,*t.translation))@q)*.5
  if reference is None:reference=q.copy()
  sign=-1 if reference.dot(q)<0 else 1;real+=q*(w*sign/total);dual+=d*(w*sign/total)
 length=real.magnitude
 if length<1e-6:return m,m
 real*=1/length;dual*=1/length;dual-=real*real.dot(dual);translation=(dual@real.conjugated())*2
 dq=real.to_matrix().to_4x4();dq.translation=Vector((translation.x,translation.y,translation.z));return m,dq
report={}
reset('FrontDoubleBiceps',25);trans=transforms()
names=['shoulderRaise','shoulderRaiseMuscle','elbowFlexL','elbowFlexR','elbowMuscleL','elbowMuscleR','seatedHandsMuscle','seatedHandsFat']
for name in names:
 if name not in keys:body.shape_key_add(name=name)
 for i,p in enumerate(base):keys[name].data[i].co=p
for i,p in enumerate(base):
 x,y,z=p;ax=abs(x);side='L' if x>=0 else 'R';lbs,dq=blend(i,trans);inv=lbs.inverted_safe().to_3x3();difference=dq@p-lbs@p;developedDifference=(dq@high[i]-lbs@high[i])-difference
 shoulder=s((ax-.125)/.06)*s((.36-ax)/.10)*s((z-1.20)/.10)*s((1.49-z)/.055)
 if shoulder:
  a=inv@difference*shoulder*.85;b=inv@developedDifference*shoulder*.85
  if a.length>.026:a*=.026/a.length
  if b.length>.028:b*=.028/b.length
  keys['shoulderRaise'].data[i].co=p+a;keys['shoulderRaiseMuscle'].data[i].co=p+b
 elbow=rig.data.bones['forearm.'+side].head_local;mask=s((.14-(p-elbow).length)/.075)*s((ax-.245)/.06)
 if mask:
  a=inv@difference*mask*.8;b=inv@developedDifference*mask*.8
  if a.length>.018:a*=.018/a.length
  if b.length>.018:b*=.018/b.length
  keys['elbowFlex'+side].data[i].co=p+a;keys['elbowMuscle'+side].data[i].co=p+b
for n in names[:6]:report[n]={'maxBindMetres':max((v.co-base[i]).length for i,v in enumerate(keys[n].data))}
# Contact follows actual posed thigh surface growth. It is not an arbitrary
# vertical hand offset: ray differences are measured with identical pose/weights.
reset('SeatedPrepare',193);trans=transforms();matrices=[blend(i,trans)[0] for i in range(len(base))]
polys=[list(p.vertices) for p in body.data.polygons if all(not any(n.startswith(('hand','finger','forearm','upperArm')) and w>.1 for n,w in skin[i]) for i in p.vertices)]
posed={n:[matrices[i]@v for i,v in enumerate(points)] for n,points in [('base',base),('muscle',high),('fat',[p+keys['bodyFat'].data[i].co-p for i,p in enumerate(base)])]}
trees={n:BVHTree.FromPolygons(points,polys) for n,points in posed.items()}
contacts={}
for side in ['L','R']:
 bone=rig.pose.bones['hand.'+side];p=bone.head.lerp(bone.tail,.5);origin=p+Vector((0,0,.20));hits={n:tree.ray_cast(origin,Vector((0,0,-1)),.5)[0] for n,tree in trees.items()}
 if any(v is None for v in hits.values()):contacts[side]={'missingRay':True};continue
 contacts[side]={n:float(hits[n].z-hits['base'].z) for n in ['muscle','fat']}
 for i,point in enumerate(base):
  hand=sum(w for n,w in skin[i] if n.endswith('.'+side) and n.startswith(('hand','finger')));forearm=sum(w for n,w in skin[i] if n=='forearm.'+side)
  if hand+forearm<.01:continue
  b=rig.data.bones['forearm.'+side];axis=b.tail_local-b.head_local;t=(point-b.head_local).dot(axis)/axis.length_squared;amount=min(1,hand+forearm*s(t))
  for n,key in [('muscle','seatedHandsMuscle'),('fat','seatedHandsFat')]:
   offset=Vector((0,0,max(-.01,min(.065,contacts[side][n]))*amount));keys[key].data[i].co=point+matrices[i].inverted_safe().to_3x3()@offset
report['seatedContact']=contacts
# Carry the shoulder volume corrective into both real tank primitives.
for o in [bpy.data.objects['BL_V4_TrainingTank']]:
 for name in ['shoulderRaise','shoulderRaiseMuscle']:
  if name not in o.data.shape_keys.key_blocks:o.shape_key_add(name=name)
  tree=BVHTree.FromPolygons(base,[list(p.vertices) for p in body.data.polygons])
  for i,p in enumerate(o.data.shape_keys.key_blocks[0].data):
   hit,n,poly,d=tree.find_nearest(p.co);ids=body.data.polygons[poly].vertices;ws=[1/max(.001,(base[j]-hit).length)**2 for j in ids];total=sum(ws);delta=sum(((keys[name].data[j].co-base[j])*w/total for j,w in zip(ids,ws)),Vector());o.data.shape_keys.key_blocks[name].data[i].co=p.co+delta
body['v8PoseCorrection']='LBS to dual-quaternion shoulder/elbow differences, separate developed-volume target; measured seated thigh contacts'
reset('GymIdle',1)
(OUT/('pose-corrections'+('-'+body.get('frameV8') if body.get('frameV8') else '')+'.json')).write_text(json.dumps(report,indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
print('V8 pose corrections and measured hand contact saved',flush=True)
