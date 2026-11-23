"""One-shot facial, pectoral/deltoid and garment sculpt on a protected v6 copy.
No simulation numbers or prior authoring files are changed.
"""
import bpy,math,json,random
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/portrait-v7'
assert bpy.data.filepath.endswith('bulk-life-athlete-v7-work.blend')
body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];ks=body.data.shape_keys.key_blocks;base=ks[0]
if body.get('v7Sculpt'):raise RuntimeError('Start again from the protected v6 copy')
def s(t):
 t=max(0,min(1,t));return t*t*(3-2*t)
def g(x,c,r):return math.exp(-2*((x-c)/r)**2)
def limb(v,name):
 b=rig.data.bones[name];u=b.tail_local-b.head_local;t=max(0,min(1,(v-b.head_local).dot(u)/u.length_squared));center=b.head_local+u*t;r=v-center;r-=u*r.dot(u)/u.length_squared
 return t,center,r.normalized() if r.length>.000001 else Vector()
old=[v.co.copy() for v in base.data];oldDeltas={k.name:[p.co-v for p,v in zip(k.data,old)] for k in ks}
fields={n:[Vector() for _ in old] for n in ['chest','upperChest','frontDelts','sideDelts','rearDelts']};faceChanged=0
for i,v in enumerate(old):
 x,y,z=v;ax=abs(x);front=s((-y-.115)/.020);d=Vector()
 # Orbital rim / cheekbone / buccal and chin planes, retaining eye size and identity.
 d.y-=.0027*g(ax,.032,.022)*g(z,1.669,.011)*front
 d.y-=.0010*g(ax,.032,.018)*g(z,1.642,.005)*front
 d.y-=.0033*g(ax,.051,.025)*g(z,1.626,.019)*front
 d.y+=.0015*g(ax,.046,.022)*g(z,1.601,.020)*front
 d.y-=.0014*g(ax,.017,.013)*g(z,1.612,.010)*front
 d.y-=.0012*g(ax,.016,.019)*g(z,1.584,.0045)*front
 d.y-=.0015*g(ax,.016,.021)*g(z,1.572,.006)*front
 d.y-=.0018*g(ax,.029,.029)*g(z,1.551,.016)*front
 # Lower-lid volume is geometry, not a dark texture line.
 d.z+=.00055*g(ax,.032,.017)*g(z,1.644,.0045)*front
 if d.length>.00002:faceChanged+=1
 for k in ks:k.data[i].co+=d
 # Pectoral fan: broad sternum origin, lower sweep and narrowing humeral insertion.
 lo=1.265+.043*s(ax/.185);hi=1.423-.045*s(ax/.19)
 fan=s((ax-.007)/.025)*s((.205-ax)/.055)*s((-y-.032)/.07)
 t=max(0,min(1,(z-lo)/(hi-lo))) if hi>lo else 0
 belly=math.sin(math.pi*t)**.7 if lo<z<hi else 0
 upper=s((z-1.337)/.065)
 fields['chest'][i]=Vector((0,-.016*fan*belly*(1-upper)-.016*g(ax,0,.040)*g(z,1.332,.068)*s((-y-.04)/.06),.0015*fan*belly))
 fields['upperChest'][i]=Vector((0,-.013*fan*belly*upper,0))
 side='L' if x>0 else 'R';t,c,n=limb(v,'upperArm.'+side)
 shoulder=g(t,.13,.33)*s((ax-.145)/.045)*s((1.51-z)/.05)*s((z-1.18)/.12)
 a=s((c.y-y+.006)/.05);b=s((y-c.y+.006)/.05);lat=s((ax-abs(c.x)+.004)/.04);den=max(1,a+b+lat)
 for name,w,factor in [('frontDelts',a,.011),('sideDelts',lat,.013),('rearDelts',b,.011)]:fields[name][i]=n*(factor*shoulder*w/den)
 # Small corresponding basis change; development remains separate regional morphs.
 basisDelta=sum((f[i] for f in fields.values()),Vector())*.16
 for k in ks:k.data[i].co+=basisDelta
 for name,values in fields.items():ks[name].data[i].co+=values[i]
 ks['bodyFat'].data[i].co-=basisDelta*.45
 ks['pump'].data[i].co+=sum((f[i] for f in fields.values()),Vector())*.06
body.data.update()
tree=BVHTree.FromPolygons([v.co for v in base.data],[list(p.vertices) for p in body.data.polygons])
# Brow roots are re-projected AFTER the face sculpt. Previous hair roots were
# partly behind the moved forehead. Three-segment tapered fibers, not a line.
for side in [-1,1]:
 o=bpy.data.objects['BL_V4_Brow_'+str(side)];verts=[];faces=[];random.seed(7200+side)
 for n in range(390):
  t=random.random();x=side*(.012+.044*t);z=1.668+.0037*math.sin(t*math.pi)-.0030*t+random.gauss(0,.0011)*(1-t*.55)
  p,normal,_,_=tree.ray_cast(Vector((x,-.25,z)),Vector((0,1,0)))
  if p is None:continue
  p+=normal*.00045
  direction=Vector((side*(.18+.8*t),0,.93-.72*t)).normalized();across=direction.cross(normal).normalized();length=(.0025+random.random()*.0016)*(1-.35*t);width=(.00012+random.random()*.00007)*(1-.5*t);j=len(verts)
  for a in [0,.4,.75,1]:
   q=p+direction*length*a+normal*(math.sin(a*math.pi)*.00025);w=width*(1-a*.92);verts.extend([q-across*w,q+across*w])
  for a in range(3):faces.append((j+2*a,j+2*a+1,j+2*a+3,j+2*a+2))
 me=bpy.data.meshes.new('V7_SurfaceFollowingBrow');me.from_pydata(verts,[],faces);me.update();me.materials.append(o.data.materials[0].copy());o.data=me
 for p in me.polygons:p.use_smooth=True
 vg=o.vertex_groups.get('head') or o.vertex_groups.new(name='head');vg.add(list(range(len(verts))),1,'REPLACE')
# Cloth keeps all existing keys and skinning. Remove the uneven inherited shirt
# tail and smooth the actual neckline/armhole edges in every shape, not normals.
tank=bpy.data.objects['BL_V4_TrainingTank'];tk=tank.data.shape_keys.key_blocks;before=[v.co.copy() for v in tk[0].data]
adj=[set() for _ in before];counts={}
for p in tank.data.polygons:
 ids=list(p.vertices)
 for a,b in zip(ids,ids[1:]+ids[:1]):edge=tuple(sorted((a,b)));counts[edge]=counts.get(edge,0)+1;adj[a].add(b);adj[b].add(a)
boundary={v for e,n in counts.items() if n==1 for v in e};ring={v:set() for v in boundary}
for (a,b),n in counts.items():
 if n==1:ring[a].add(b);ring[b].add(a)
# Each open inner hem vertex has a corresponding outer point 1.5mm away.
outer={i:next(j for j in adj[i] if j not in boundary) for i in boundary}
edgeSet=boundary|set(outer.values());mapOuter={v:k for k,v in outer.items()}
for key in tk:
 points=[v.co.copy() for v in key.data]
 for i,p in enumerate(points):
  blend=1-s((before[i].z-1.045)/.09)
  target=.981-.003*g(p.x,0,.10)+.0015*math.sin(p.x*34)
  # Preserve body-dependent vertical motion and the seated cloth response.
  offset=key.data[i].co.z-before[i].z
  p.z=p.z*(1-blend)+(target+offset)*blend
 for step in range(8):
  nxt=[p.copy() for p in points]
  for i in boundary:
   if len(ring[i])!=2:continue
   delta=sum((points[j] for j in ring[i]),Vector())/2-points[i];delta*=.42
   nxt[i]+=delta;nxt[outer[i]]+=delta
  points=nxt
 # Transfer only the new sculpt, maintaining v6 garment ease and old morphs.
 for i,p in enumerate(points):
  near,normal,poly,dist=tree.find_nearest(before[i]);ids=list(body.data.polygons[poly].vertices);j=min(ids,key=lambda j:(base.data[j].co-before[i]).length)
  baseChange=base.data[j].co-old[j]
  p+=baseChange
  if key.name in fields:p+=fields[key.name][j]
  # The neckline must wrap the shoulder, not hover as a pointed flap.
  if before[i].z>1.43:
   fit,n,_,_=tree.find_nearest(before[i]);p+=(fit+n*.006-before[i])*s((before[i].z-1.43)/.05)*.65
  key.data[i].co=p
tank.data.update()
# Preserve visible waist skin below the new hem. No invisible-body gap.
vg=body.vertex_groups.get('V4_ClothEnclosed');vg.remove(list(range(len(body.data.vertices))))
enclosed=[]
for i,v in enumerate(base.data):
 x,y,z=v.co;arm=sum(gp.weight for gp in body.data.vertices[i].groups if body.vertex_groups[gp.group].name.startswith(('finger','hand','forearm','upperArm')))
 if arm<.15 and (z<.112 or .695<z<.97):enclosed.append(i)
vg.add(enclosed,1,'REPLACE')
# Pose-specific anterior axillary volume and the raised deltoid cap.
for k in ks:k.value=0
rig.animation_data.action=bpy.data.actions['FrontDoubleBiceps'];bpy.context.scene.frame_set(25);bpy.context.view_layer.update()
for i,v in enumerate(base.data):
 matrix=Matrix(((0,0,0,0),)*4);total=0
 for gp in body.data.vertices[i].groups:
  name=body.vertex_groups[gp.group].name
  if name in rig.pose.bones:matrix+=(rig.pose.bones[name].matrix@rig.data.bones[name].matrix_local.inverted())*gp.weight;total+=gp.weight
 if not total:continue
 matrix*=1/total;pos=matrix@ks['shoulderRaise'].data[i].co;x,y,z=pos;ax=abs(x)
 d=Vector((0,-.007*g(ax,.19,.07)*g(z,1.375,.065)*s((-y-.025)/.06),.011*g(ax,.26,.085)*g(z,1.475,.045)))
 ks['shoulderRaise'].data[i].co+=matrix.inverted_safe().to_3x3()@d
 side='L' if v.co.x>0 else 'R';bone=rig.data.bones['upperArm.'+side];axis=bone.tail_local-bone.head_local;t=(v.co-bone.head_local).dot(axis)/axis.length_squared;center=bone.head_local+axis*t
 if .12<t<.90 and (v.co-center).length<.095:
  front=s((center.y-v.co.y+.012)/.055);bell=math.sin(math.pi*t)**2
  bunch=matrix.inverted_safe().to_3x3()@Vector((0,0,.013*bell*front))
  if bunch.length>.018:bunch*=.018/bunch.length
  ks['elbowFlex'+side].data[i].co+=bunch
# Gaze sits centrally in the socket rather than riding the upper lid.
rig.animation_data.action=bpy.data.actions['GymIdle'];bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
for o in bpy.data.objects:
 if o.name.startswith(('BL_V2_Iris.','BL_V2_Pupil.')):
  matrix=o.matrix_world.copy();matrix.translation.z-=.0009;o.matrix_world=matrix
for name,color,rough in [('BL_V2_EyeSclera',(.50,.48,.44),.38),('BL_V2_Iris',(.065,.037,.018),.25),('BL_V2_Pupil',(.006,.004,.003),.24)]:
 m=bpy.data.materials[name];p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
# Less uniform specular skin; keep licensed colour/normal maps and identity.
skin=body.data.materials[0];pr=next(n for n in skin.node_tree.nodes if n.type=='BSDF_PRINCIPLED');pr.inputs['Specular IOR Level'].default_value=.27;pr.inputs['Roughness'].default_value=.52
body['v7Sculpt']='orbital-cheek-mouth planes; projected brows; continuous pectoral and deltoid volumes; tailored edges'
rig.animation_data.action=bpy.data.actions['GymIdle'];bpy.context.scene.frame_set(1)
for key in ks:key.value=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v7-work.blend'))
(OUT/'sculpt-report.json').write_text(json.dumps({'faceVertices':faceChanged,'browFibresEach':390,'clothEdgeVertices':len(edgeSet),'regionalVolumeMaxMetres':{k:max(v.length for v in vs) for k,vs in fields.items()},'method':'actual basis/morph/edge changes; no simulation changes'},indent=2),encoding='utf8')
print('V7 facial/torso/cloth sculpt saved',flush=True)
