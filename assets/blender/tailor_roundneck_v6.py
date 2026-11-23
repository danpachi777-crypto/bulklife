"""Re-cut the licensed shirt surface as a tank: remove its collar, cut curved
arm openings, rebuild thin hems and all skin/morph data. Use pre-garment v6.
"""
from pathlib import Path
import bpy,math,json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
helper=(ROOT/'assets/blender/refine_garment_v6.py').read_text(encoding='utf8')
exec(compile(helper[:helper.index('tank=')],'v6-surface-transfer-helpers','exec'))
tank=bpy.data.objects['BL_V4_TrainingTank'];old=tank.data
if tank.get('v6RoundNeckPattern'):raise RuntimeError('Run once on the pre-garment duplicate')
coords=[v.co.copy() for v in old.shape_keys.key_blocks[0].data]
uv=[Vector((0,0)) for _ in coords]
for loop in old.loops:uv[loop.vertex_index]=old.uv_layers.active.data[loop.index].uv.copy()
edgeCount={}
for poly in old.polygons:
    ids=list(poly.vertices)
    for a,b in zip(ids,ids[1:]+ids[:1]):edge=tuple(sorted((a,b)));edgeCount[edge]=edgeCount.get(edge,0)+1
inner={i for edge,n in edgeCount.items() if n==1 for i in edge}
panels=[list(p.vertices) for p in old.polygons if not any(i in inner for i in p.vertices)]
def smooth(v):
    t=max(0,min(1,v));return t*t*(3-2*t)
def neck(p):
    back=smooth((p.y+.025)/.05);q=(abs(p.x)/.115)**2
    return 1.355+.085*q+.05*back*max(0,1-q)-p.z
def armhole(p):
    return (p.y/.10)**2+((p.z-1.31)/.13)**2-1+max(0,(.14-abs(p.x))/.025)*3
def clip(poly,field):
    out=[]
    for a,b in zip(poly,poly[1:]+poly[:1]):
        va,vb=field(a[0]),field(b[0])
        if va>=0:out.append(a)
        if (va>=0)!=(vb>=0):
            t=va/(va-vb);out.append((a[0].lerp(b[0],t),a[1].lerp(b[1],t)))
    return out
points=[];tex=[];faces=[];lookup={}
for ids in panels:
    poly=[(coords[i],uv[i]) for i in ids]
    for field in [neck,armhole]:
        if poly:poly=clip(poly,field)
    if len(poly)<3:continue
    face=[]
    for p,t in poly:
        key=tuple(round(v,6) for v in p)
        if key not in lookup:lookup[key]=len(points);points.append(p.copy());tex.append(t.copy())
        if not face or face[-1]!=lookup[key]:face.append(lookup[key])
    if len(set(face))>=3:faces.append(face)
mesh=bpy.data.meshes.new('V6_RoundNeckTank');mesh.from_pydata(points,[],faces);mesh.update()
edgeCount={}
for f in faces:
    for a,b in zip(f,f[1:]+f[:1]):e=tuple(sorted((a,b)));edgeCount[e]=edgeCount.get(e,0)+1
rim={};outerCount=len(points)
for i in sorted({i for edge,n in edgeCount.items() if n==1 for i in edge}):
    rim[i]=len(points);points.append(points[i]-mesh.vertices[i].normal*.0015);tex.append(tex[i].copy())
for (a,b),n in edgeCount.items():
    if n==1:faces.append([a,b,rim[b],rim[a]])
mesh.clear_geometry();mesh.from_pydata(points,[],faces);mesh.validate(clean_customdata=False);mesh.update()
mesh.materials.append(old.materials[0].copy());mesh.materials[0].name='BL_V6_SlateKnit'
layer=mesh.uv_layers.new(name='UVMap')
for p in mesh.polygons:
    p.use_smooth=True
    for i in p.loop_indices:layer.data[i].uv=tex[mesh.loops[i].vertex_index]
old.use_fake_user=True;tank.data=mesh
for bone in rig.data.bones:
    if bone.name not in tank.vertex_groups:tank.vertex_groups.new(name=bone.name)
tank.shape_key_add(name='Basis');ks=mesh.shape_keys.key_blocks
mapping=[sample(p) for p in points[:outerCount]]
inverseRim={j:i for i,j in rim.items()}
for i in range(outerCount,len(points)):mapping.append(mapping[inverseRim[i]])
for name in list(keys.keys())[1:]+['seatedCloth']:
    if name=='blink':continue
    key=tank.shape_key_add(name=name)
    if name in keys:key.slider_min=keys[name].slider_min;key.slider_max=keys[name].slider_max
    for i,p in enumerate(points):
        key.data[i].co=p+(sum(((keys[name].data[j].co-basis.data[j].co)*w for j,w in mapping[i]),Vector()) if name in keys else Vector((0,.0045*math.sin(p.z*138+p.x*24)*math.exp(-((p.z-1.075)/.10)**2),0)))
for i,m in enumerate(mapping):
    group={}
    for j,w in m:
        for g in body.data.vertices[j].groups:
            name=body.vertex_groups[g.group].name
            if name in rig.data.bones:group[name]=group.get(name,0)+g.weight*w
    group=dict(sorted(group.items(),key=lambda q:-q[1])[:4]);total=sum(group.values())
    for name,w in group.items():tank.vertex_groups[name].add([i],w/total,'REPLACE')
adj=[set() for _ in points];counts={}
for e in mesh.edges:a,b=e.vertices;adj[a].add(b);adj[b].add(a)
for f in mesh.polygons:
    ids=list(f.vertices)
    for a,b in zip(ids,ids[1:]+ids[:1]):e=tuple(sorted((a,b)));counts[e]=counts.get(e,0)+1
boundary=set(inverseRim);partners=inverseRim
exec(compile(helper[helper.index('# Fabric spans'):helper.index('for m in tank.data.materials:')],'v6-shoulder-seam-response','exec'))
for mat in mesh.materials:
    p=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(.11,.16,.18,1);p.inputs['Roughness'].default_value=.91
vg=body.vertex_groups.get('V4_ClothEnclosed');vg.remove(list(range(len(body.data.vertices))));covered=[]
for i,v in enumerate(basis.data):
    x,y,z=v.co;arm=sum(g.weight for g in body.data.vertices[i].groups if body.vertex_groups[g.group].name.startswith(('finger','hand','forearm','upperArm')))
    if arm<.15 and (z<.112 or .695<z<.99 or (.985<z<1.17 and abs(x)<.16)):covered.append(i)
vg.add(covered,1,'REPLACE')
tank['v6RoundNeckPattern']=True
rig.animation_data.action=bpy.data.actions['GymIdle'];bpy.context.scene.frame_set(1)
report={'sourcePanels':len(panels),'tankVertices':len(points),'rimVertices':len(rim),'rimThicknessMetres':.0015,'poseEdgeVertices':corrected,'method':'collar removal and curved neck/arm-hole clipping; rebuilt mesh and hems; body/pose morph transfer, neckline anchors and shoulder weight diffusion; original v5 remains protected'}
(ROOT/'docs/qa/decisions-v6/garment-refinement.json').write_text(json.dumps(report,indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v6-work.blend'))
print(json.dumps(report),flush=True)
