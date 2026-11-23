"""Rebuild the shape endpoints on the licensed, connected hm08 topology.
The 16 regions partition ONE authored developed surface. Fat and leanness use
independent positive targets; a negative fat extrapolation cannot carve the ribs.
All values below are artistic metres in this 1.77m source, not physiological data.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from mathutils.geometry import closest_point_on_tri
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/anatomy-v8';OUT.mkdir(parents=True,exist_ok=True)
assert bpy.data.filepath.endswith('bulk-life-athlete-v8-work.blend')
body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];keys=body.data.shape_keys.key_blocks
assert not body.get('anatomyV8'),'Use a fresh v7 duplicate'
parts=['upperChest','chest','frontDelts','sideDelts','rearDelts','lats','upperBack','erectors','biceps','triceps','forearms','quads','hamstrings','glutes','calves','abs']
def s(t):t=max(0,min(1,t));return t*t*(3-2*t)
def g(v,c,r):return math.exp(-2*((v-c)/r)**2)
def target(name):
 d={}
 for line in (ROOT/'assets/sources/makehuman'/name).read_text().splitlines():
  if line.strip() and not line.startswith('#'):
   a=line.split();d[int(a[0])]=Vector(tuple(map(float,a[1:4])))
 return d
raw=[Vector(tuple(map(float,line.split()[1:4]))) for line in (ROOT/'assets/sources/makehuman/base.obj').read_text().splitlines() if line.startswith('v ')]
male=target('asian-male-young.target');mt=target('universal-male-young-maxmuscle-averageweight.target')
indices=list(body['originalSourceIndices']);initial=[raw[i]+male.get(i,Vector())+mt.get(i,Vector())*.25 for i in indices]
ground=min(v.y for v in initial);scale=1.77/(max(v.y for v in initial)-ground)
def convert(v):return Vector((v.x*scale,-v.z*scale,(v.y-ground)*scale))
def convertedDelta(v):return Vector((v.x,-v.z,v.y))*scale
oldBase=[v.co.copy() for v in keys[0].data];oldShapes={k.name:[v.co.copy() for v in k.data] for k in keys}
base=[]
for i,original in enumerate(indices):
 p=convert(raw[original]+male.get(original,Vector())+mt.get(original,Vector())*.15)
 # Keep the same facial identity and existing closed lips/eyelid loops. Remove
 # accumulated torso fields, not the current head or hand/foot anatomy.
 head=s((p.z-1.47)/.055);p=p.lerp(oldBase[i],head)
 # Ordinary A1 has an adult thorax and a soft waist, not a narrow adolescent
 # trunk. These are the neutral structure, shared by every muscle endpoint.
 front=s((-p.y-.015)/.06);ax=abs(p.x);sign=1 if p.x>=0 else -1
 trunk=s((p.z-.98)/.10)*s((1.45-p.z)/.08)*s((.20-ax)/.055)
 p.x+=sign*.011*g(p.z,1.10,.20)*s((ax-.06)/.07)*trunk
 p.y-=front*trunk*(.012*g(p.z,1.34,.14)+.014*g(p.z,1.10,.17))
 base.append(p)
def limb(p,name):
 b=rig.data.bones[name];axis=b.tail_local-b.head_local;t=(p-b.head_local).dot(axis)/axis.length_squared;c=b.head_local+axis*max(0,min(1,t));r=p-c;r-=axis*r.dot(axis)/axis.length_squared
 return t,c,r,r.normalized() if r.length>.00001 else Vector()
developed=[];fat=[];lean=[];weights=[]
for i,p in enumerate(base):
 x,y,z=p;ax=abs(x);sign=1 if x>=0 else -1;side='L' if x>=0 else 'R';front=s((-y-.015)/.065);back=s((y+.005)/.065)
 d={name:Vector() for name in parts}
 # The rib cage remains a volume. The pectoral fan adds forward depth over it;
 # the lower edge curves into the axillary insertion rather than a carved line.
 thorax=s((z-1.16)/.12)*s((1.47-z)/.075)*s((.205-ax)/.06)
 d['upperChest']+=Vector((sign*.007*thorax,-.010*thorax*front,0))
 lo=1.280+.035*s(ax/.20);hi=1.450-.032*s(ax/.20);v=(z-lo)/(hi-lo)
 fan=(math.sin(math.pi*v)**1.8 if 0<v<1 else 0)*s(ax/.025)*s((.215-ax)/.055)*front
 upper=s((z-1.345)/.055)
 d['chest'].y-=.047*fan*(1-upper*.40);d['upperChest'].y-=.028*fan*upper
 d['chest'].y-=.014*g(z,1.265,.12)*s((.18-ax)/.06)*front
 # Sternum is continuous: no narrow cleft through the thorax.
 d['chest'].y-=.011*g(ax,0,.035)*g(z,1.34,.075)*front
 t,c,r,n=limb(p,'upperArm.'+side);arm=s((ax-.145)/.055)*s((.105-r.length)/.035)
 cap=g(t,.19,.27)*arm*s((z-1.16)/.10)*s((1.49-z)/.075)
 f=s((c.y-y+.008)/.055);b=s((y-c.y+.008)/.055);lat=s((sign*r.x+.010)/.045);den=max(.001,f+b+lat)
 for name,w,a in [('frontDelts',f,.024),('sideDelts',lat,.030),('rearDelts',b,.025)]:d[name]+=n*(a*cap*w/den)
 bellyT=(t-.12)/.88
 bell=(math.sin(math.pi*bellyT)**1.4 if 0<bellyT<1 else 0)*arm
 d['biceps']+=n*(.014+.023*f)*bell;d['triceps']+=n*(.014+.027*b)*bell
 t,c,r,n=limb(p,'forearm.'+side);env=(math.sin(math.pi*t)**1.2 if 0<t<1 else 0)*s((ax-.29)/.08)*s((.10-r.length)/.04)
 d['forearms']+=n*.021*env*g(t,.35,.60)
 latMask=g(z,1.265,.18)*s((ax-.055)/.07)*s((.235-ax)/.07)*back
 d['lats']+=Vector((sign*.033*latMask,.020*latMask,0))
 trap=(g(ax,.065,.07)*g(z,1.425,.085)+g(ax,.105,.085)*g(z,1.35,.12))*back
 d['upperBack'].y+=.025*trap;d['erectors'].y+=.012*g(ax,.035,.030)*g(z,1.14,.20)*back
 # Shallow abdominal volumes; fat removal is not a deep rectangular groove.
 ab=sum(g(ax,.031,.038)*g(z,h,.046) for h in [1.225,1.163,1.101])*front
 d['abs'].y-=.023*ab
 t,c,r,n=limb(p,'thigh.'+side);env=(math.sin(math.pi*t)**1.05 if 0<t<1 else 0)*s((.92-z)/.10)*s((z-.48)/.065)*s((.155-r.length)/.06)*s((ax-.035)/.045)
 f=s((c.y-y+.01)/.075);b=s((y-c.y+.01)/.075)
 medial=g(t,.77,.19)*s((-sign*r.x+.02)/.05)*env
 d['quads']+=n*((.018+.040*f)*env+.012*medial*f);d['hamstrings']+=n*(.012+.036*b)*env
 glute=g(ax,.10,.11)*g(z,.91,.11)*back;d['glutes'].y+=.036*glute
 t,c,r,n=limb(p,'shin.'+side);calf=g(t,.29,.29)*s((z-.16)/.10)*s((.53-z)/.07)*s((.11-r.length)/.035)
 d['calves']+=n*(.009+.015*s((y-c.y+.015)/.05))*calf
 endpoint=convertedDelta(mt.get(indices[i],Vector()))*.90*s((1.49-z)/.06)*s((z-.13)/.08)
 # Do not move the hands with the muscle target or grow bone landmarks.
 deformWeights={body.vertex_groups[v.group].name:v.weight for v in body.data.vertices[i].groups}
 hand=sum(w for name,w in deformWeights.items() if name.startswith(('hand','finger')))
 endpoint*=1-hand
 endpoint+=sum(d.values(),Vector())
 if .99<z<1.43 and ax<.20 and sign*endpoint.x<0:endpoint.x=0
 # Sculpt a broad pectoral plane over an elliptical rib cage. Its projection
 # has a finite slope at the lower fold; the prior sine mound made a pointed
 # side profile and amplified small rings in the source breast topology.
 if 1.245<z<1.46 and ax<.215:
  grown=p+endpoint;width=.190+.020*g(z,1.34,.17)
  rib=-.012-(.120+.010*g(z,1.35,.12))*math.sqrt(max(0,1-(ax/width)**2))
  pec=.050*g(ax,.095,.135)*g(z,1.365,.110)
  desired=rib-pec
  blend=s((z-1.245)/.06)*s((1.46-z)/.065)*s((.215-ax)/.055)*front
  endpoint.y+=(desired-grown.y)*blend*.90
 # One endpoint, partitioned once. All 16 sliders together equal that endpoint.
 domain={name:d[name].length for name in parts};total=sum(domain.values())
 if total<.00001:
  domain={name:deformWeights.get('region_'+name,0) for name in parts};total=sum(domain.values())
 weights.append({name:w/total for name,w in domain.items()} if total>.00001 else {name:0 for name in parts})
 developed.append(endpoint)
 # Positive adipose target. Independent fat pads with joint/face scale limits.
 fd=Vector();waist=g(z,1.075,.18)*s((.24-ax)/.055)
 fd.x+=sign*.060*waist*s((ax-.055)/.07);fd.y-=.092*g(x,0,.19)*g(z,1.09,.18)*front;fd.y+=.040*waist*back
 fd.y-=.026*g(ax,.09,.135)*g(z,1.32,.12)*front
 hip=g(z,.94,.12)*s((ax-.06)/.08)*s((.26-ax)/.06);fd.x+=sign*.027*hip;fd.y+=.023*hip*back
 for name,amount,radius in [('thigh',.027,.15),('upperArm',.014,.10)]:
  t,c,r,n=limb(p,name+'.'+side);env=math.sin(math.pi*t)**1.3 if 0<t<1 else 0;fd+=n*amount*env*s((radius-r.length)/.05)*s((ax-(.04 if name=='thigh' else .17))/.05)
 face=g(z,1.59,.08)*s((.09-ax)/.025)*s((ax-.014)/.02);fd.x+=sign*.005*face;fd.y-=.004*face*front
 fat.append(fd)
 # Lean endpoint is deliberately smaller than the inverse obese target.
 ld=Vector((-sign*.010*waist*s((ax-.08)/.055),.018*g(x,0,.17)*g(z,1.10,.17)*front-.0045*ab,0))
 ld.x-=sign*.002*face;ld.y+=.002*face*front
 ld.y+=.006*g(ax,.09,.12)*g(z,1.32,.12)*front;lean.append(ld)

# Smooth field transitions only; preserve the shared endpoint and the base topology.
adj=[set() for _ in base]
for e in body.data.edges:a,b=e.vertices;adj[a].add(b);adj[b].add(a)
for _ in range(3):developed=[v.lerp(sum((developed[j] for j in adj[i]),Vector())/len(adj[i]),.24) if adj[i] else v for i,v in enumerate(developed)]
# Relax the developed shoulder surface itself, not just its offset field. This
# removes the source's small angular rings while preserving the clavicle/axilla.
for _ in range(3):
 surface=[p+d for p,d in zip(base,developed)];relaxed=[]
 for i,(p,d) in enumerate(zip(base,developed)):
  mask=s((abs(p.x)-.16)/.055)*s((.31-abs(p.x))/.07)*s((p.z-1.25)/.08)*s((1.46-p.z)/.045)
  relaxed.append(d+(sum((surface[j] for j in adj[i]),Vector())/len(adj[i])-surface[i])*.32*mask if adj[i] else d)
 developed=relaxed
for key in keys:
 if key.name=='Basis':continue
 for i,p in enumerate(base):key.data[i].co=p
for i,p in enumerate(base):keys[0].data[i].co=p
for name in parts:
 for i,p in enumerate(base):keys[name].data[i].co=p+developed[i]*weights[i][name]/1.2
for name in ['bodyFat','pump','leanDefinition','fatSoftening']:
 if name not in keys:body.shape_key_add(name=name)
 key=body.data.shape_keys.key_blocks[name];key.slider_min=0;key.slider_max=1.2
 for i,p in enumerate(base):key.data[i].co=p+(fat[i] if name=='bodyFat' else lean[i] if name=='leanDefinition' else developed[i]*.045 if name=='pump' else -developed[i]*.12)
# Preserve blinking geometry and current facial expression identity.
for i,p in enumerate(base):
 if 'blink' in oldShapes:keys['blink'].data[i].co=p+oldShapes['blink'][i]-oldBase[i]
body.data.update()

# Retarget the existing good garment topology/ease to the actual changed skin.
# Barycentric interpolation avoids nearest-vertex discontinuities at cuffs.
tree=BVHTree.FromPolygons(oldBase,[list(p.vertices) for p in body.data.polygons])
def sample(p):
 hit,n,poly,_=tree.find_nearest(p);ids=list(body.data.polygons[poly].vertices);best=None
 for j in range(1,len(ids)-1):
  tri=[ids[0],ids[j],ids[j+1]];a,b,c=[oldBase[k] for k in tri];q=closest_point_on_tri(hit,a,b,c);u=b-a;v=c-a;w=q-a;uu=u.dot(u);uv=u.dot(v);vv=v.dot(v);den=uu*vv-uv*uv
  if abs(den)<1e-12:continue
  t=(w.dot(u)*vv-w.dot(v)*uv)/den;r=(w.dot(v)*uu-w.dot(u)*uv)/den;entry=((q-hit).length_squared,list(zip(tri,[1-t-r,t,r])))
  if best is None or entry[0]<best[0]:best=entry
 return best[1]
garments={}
for name in ['BL_V2_Shorts','BL_V4_TrainingTank','BL_V4_TrainingShorts']:
 o=bpy.data.objects[name];ks=o.data.shape_keys.key_blocks;orig={k.name:[p.co.copy() for p in k.data] for k in ks};samples=[sample(p.co) for p in ks[0].data]
 for keyName in ['leanDefinition','fatSoftening']:
  if keyName not in ks:o.shape_key_add(name=keyName)
 for i,ws in enumerate(samples):
  shift=sum(((base[j]-oldBase[j])*w for j,w in ws),Vector());p=orig['Basis'][i]+shift
  ks[0].data[i].co=p
  for k in ks:
   if k.name=='Basis':continue
   k.data[i].co=p
   if k.name in body.data.shape_keys.key_blocks:
    k.data[i].co+=sum(((body.data.shape_keys.key_blocks[k.name].data[j].co-base[j])*w for j,w in ws),Vector())
   elif k.name=='seatedCloth':k.data[i].co+=orig[k.name][i]-orig['Basis'][i]
  # Keep the explicit seated cloth fold on top of the body endpoints.
  if 'seatedCloth' in orig:ks['seatedCloth'].data[i].co=p+orig['seatedCloth'][i]-orig['Basis'][i]
 o.data.update();garments[name]=len(samples)
body['anatomyV8']='one shared sculpted developed surface; positive fat and bounded lean endpoints; preserved hm08 topology'
for k in body.data.shape_keys.key_blocks:k.value=0
rig.animation_data.action=bpy.data.actions['GymIdle'];bpy.context.scene.frame_set(1)
report={'bodyVertices':len(base),'reference':'user-supplied A1/A3/A5, multiple views; image stages are artistic anchors, not physiological measurements','reset':'all body below the neck rebuilt from pinned CC0 male base, face identity retained','maxDevelopedMetres':max(v.length for v in developed),'maxFatMetres':max(v.length for v in fat),'maxLeanMetres':max(v.length for v in lean),'garmentBarycentricTransfers':garments,'growthPartition':'sum of the16 regional morphs at1.2 equals one developed endpoint, not16 overlapping endpoints','boneRestChanged':False,'simulationChanged':False}
(OUT/'anatomy-build.json').write_text(json.dumps(report,indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v8-work.blend'))
print(json.dumps(report),flush=True)
