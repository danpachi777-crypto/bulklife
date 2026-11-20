"""Refine the preserved v2 anatomical base in a separate working file.
Original authoring only: no purchased textures, scans, or external generators.
Run in the live Blender after Save As bulk-life-athlete-v3-work.blend.
"""
import bpy, math, json, random, hashlib, io, contextlib
import numpy as np
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix

ROOT = Path('C:/Users/shota/Documents/BulkLife')
if not bpy.data.filepath.endswith('bulk-life-athlete-v3-work.blend'):
    raise RuntimeError('Open the v3 working copy; do not edit the v2 source')
body = bpy.data.objects['BL_V2_AthleteBody']
if body.get('portraitRevision'):
    raise RuntimeError('v3 refinement already applied')
rig = bpy.data.objects['BL_V2_Rig']
col = bpy.data.collections['BULK_LIFE_Athlete_v2']
scene = bpy.context.scene
keys = body.data.shape_keys.key_blocks
basis = keys[0]
random.seed(7419)

def g(x,c,r): return math.exp(-2*((x-c)/r)**2)
def sat(x): return max(0,min(1,x))
def smooth(x):
    x=sat(x); return x*x*(3-2*x)
def principal(mat): return next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
def material(name, color, rough=0.7):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=principal(m);p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
    p.inputs['Specular IOR Level'].default_value=.28
    return m

# Vertex pigmentation survives glTF and every growth target without texture swimming.
skin = body.data.materials[0].copy();skin.name='BL_V3_Skin';body.data.materials[0]=skin
pr=principal(skin);pr.inputs['Specular IOR Level'].default_value=.28
pr.inputs['Subsurface Weight'].default_value=.055
attr=body.data.color_attributes['SkinTone']
roughness=[]
for i,v in enumerate(basis.data):
    x,y,z=v.co; ax=abs(x); front=smooth((-y-.055)/.06)
    warm=g(z,.50,.06)*.028+g(z,1.655,.05)*smooth((ax-.06)/.025)*.018
    cheeks=g(ax,.049,.026)*g(z,1.618,.032)*front
    nose=g(x,0,.015)*g(z,1.635,.025)*front
    lip=g(x,0,.028)*g(z,1.583,.010)*front
    mouth=g(x,0,.025)*g(z,1.582,.0016)*front
    lid=g(ax,.032,.020)*g(z,1.661,.008)*front
    beard=g(ax,.026,.043)*g(z,1.562,.039)*front
    noise=math.sin(x*257+z*131)*math.cos(y*311-z*181)*.003
    base=Vector((.345+noise+warm,.205+noise-warm*.3,.142+noise-warm*.2))
    base=base.lerp(Vector((.37,.17,.13)),sat(cheeks*.24+nose*.2))
    base=base.lerp(Vector((.27,.105,.088)),lip*.55)
    base=base.lerp(Vector((.07,.025,.019)),mouth*.55)
    base=base.lerp(Vector((.26,.14,.105)),lid*.26+beard*.09)
    attr.data[i].color=(*base,1)
    roughness.append(.60-.12*nose-.06*g(z,1.68,.055)*front+.08*g(z,.5,.08))

# Bake anatomical roughness through the existing UV atlas. The micro-normal is
# deliberately restrained; silhouette and pigmentation do most of the work.
N=1024
rng=np.random.default_rng(7419)
rough=np.full((N,N),.61,np.float32)
uv=body.data.uv_layers.active.data
for poly in body.data.polygons:
    loops=list(poly.loop_indices)
    for j in range(1,len(loops)-1):
        ids=[loops[0],loops[j],loops[j+1]]
        pts=np.array([[uv[k].uv.x*(N-1),uv[k].uv.y*(N-1)] for k in ids])
        x0=max(0,int(pts[:,0].min()));x1=min(N-1,int(pts[:,0].max())+1)
        y0=max(0,int(pts[:,1].min()));y1=min(N-1,int(pts[:,1].max())+1)
        if x1<x0 or y1<y0:continue
        a,b,c=pts;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(den)<1e-7:continue
        yy,xx=np.mgrid[y0:y1+1,x0:x1+1]
        w0=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
        w1=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;w2=1-w0-w1
        mask=(w0>=-.015)&(w1>=-.015)&(w2>=-.015)
        values=[roughness[body.data.loops[k].vertex_index] for k in ids]
        area=rough[y0:y1+1,x0:x1+1];area[mask]=(w0*values[0]+w1*values[1]+w2*values[2])[mask]
rough+=rng.normal(0,.012,(N,N)).astype(np.float32)
rgba=np.ones((N,N,4),np.float32);rgba[:,:,:3]=rough[:,:,None]
image=bpy.data.images.new('BL_V3_AnatomicalRoughness',width=N,height=N,alpha=True,is_data=True)
image.pixels.foreach_set(rgba.ravel());image.filepath_raw=str(ROOT/'assets/blender/skin-v3-roughness.png')
image.file_format=next(i.identifier for i in image.bl_rna.properties['file_format'].enum_items if i.identifier=='PNG');image.save();image.pack()
tex=skin.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
skin.node_tree.links.new(tex.outputs['Color'],pr.inputs['Roughness'])
for node in skin.node_tree.nodes:
    if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=.16

# Darker warm sclera, brown radial iris coloration and restrained eye reflection.
for oldname,color,rough in [('BL_V2_EyeSclera',(.68,.65,.59),.28),('BL_V2_Iris',(.065,.037,.018),.36),('BL_V2_Pupil',(.006,.004,.003),.18)]:
    p=principal(bpy.data.materials[oldname]);p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Specular IOR Level'].default_value=.35

# A scalp following the actual skull plus short swept tapered locks. Geometry
# follows the surface; it is not a glossy sphere or hair-length scale of the head.
hair=bpy.data.objects['BL_V2_Hair'];hairmat=material('BL_V3_CroppedHair',(.019,.014,.011),.87)
hair.data.materials.clear();hair.data.materials.append(hairmat)
hair.data.update()
hairverts=[v.co.copy() for v in hair.data.vertices]
hairnorm=[v.normal.copy() for v in hair.data.vertices]
verts=[];faces=[]
for _ in range(1350):
    p=random.choice(list(hair.data.polygons));ids=list(p.vertices)
    ws=[random.random() for _ in ids];total=sum(ws);ws=[w/total for w in ws]
    point=sum((hairverts[k]*w for k,w in zip(ids,ws)),Vector())
    normal=sum((hairnorm[k]*w for k,w in zip(ids,ws)),Vector()).normalized()
    tangent=Vector((.24,.9,-.10));tangent=(tangent-normal*tangent.dot(normal)).normalized()
    across=normal.cross(tangent).normalized();length=random.uniform(.004,.011);width=random.uniform(.00020,.00048)
    start=len(verts)
    for j in range(3):
        t=j/2;center=point+tangent*length*t+normal*(.0005+math.sin(t*math.pi)*.0007)
        verts.extend([center-across*width*(1-t*.88),center+across*width*(1-t*.88)])
    faces.extend([(start,start+1,start+3,start+2),(start+2,start+3,start+5,start+4)])
mesh=bpy.data.meshes.new('BL_V3_HairFlow');mesh.from_pydata(verts,[],faces);mesh.update()
flow=bpy.data.objects.new('BL_V3_HairFlow',mesh);col.objects.link(flow);mesh.materials.append(hairmat)
flow.parent=rig;flow.vertex_groups.new(name='head').add(list(range(len(verts))),1,'REPLACE');mod=flow.modifiers.new('FollowHead','ARMATURE');mod.object=rig
for p in mesh.polygons:p.use_smooth=True

# Clothing is sampled from the continuous skin, preserving each morph delta and
# the same four-bone blend. Boundary rings form actual garment thickness.
def combine(a,b,t):
    out={i:w*(1-t) for i,w in a.items()}
    for i,w in b.items():out[i]=out.get(i,0)+w*t
    return {i:w for i,w in out.items() if w>1e-8}
def pos(d):return sum((basis.data[i].co*w for i,w in d.items()),Vector())
def clipped(poly,field):
    out=[]
    for a,b in zip(poly,poly[1:]+poly[:1]):
        fa,fb=field(pos(a)),field(pos(b))
        if fa>=0:out.append(a)
        if (fa>=0)!=(fb>=0):out.append(combine(a,b,fa/(fa-fb)))
    return out
def garment(name, fields, offset, mat):
    samples=[];lookup={};faces=[]
    for poly in body.data.polygons:
        points=[{i:1.0} for i in poly.vertices]
        for field in fields:
            points=clipped(points,field)
            if len(points)<3:break
        if len(points)<3:continue
        face=[]
        for d in points:
            k=tuple((i,round(w,7)) for i,w in sorted(d.items()))
            if k not in lookup:lookup[k]=len(samples);samples.append(d)
            face.append(lookup[k])
        faces.append(face)
    vs=[]
    for d in samples:
        v=pos(d);n=sum((body.data.vertices[i].normal*w for i,w in d.items()),Vector()).normalized()
        wrinkle=.0012*math.sin(v.z*121+v.x*70)*g(v.z,1.08,.06)
        vs.append(v+n*(offset+wrinkle))
    # Add a narrow inner ring at every open hem.
    edges={}
    for f in faces:
        for a,b in zip(f,f[1:]+f[:1]):
            k=tuple(sorted((a,b)));edges[k]=edges.get(k,0)+1
    outer=len(vs);boundary=sorted({i for e,n in edges.items() if n==1 for i in e});inner={}
    for i in boundary:
        inner[i]=len(vs);samples.append(samples[i]);n=(vs[i]-pos(samples[i])).normalized();vs.append(vs[i]-n*.002)
    for (a,b),count in edges.items():
        if count==1:faces.append((a,b,inner[b],inner[a]))
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],faces);me.update();o=bpy.data.objects.new(name,me);col.objects.link(o);me.materials.append(mat)
    for p in me.polygons:p.use_smooth=True
    o.shape_key_add(name='Basis')
    for source in list(keys)[1:]:
        key=o.shape_key_add(name=source.name);key.slider_min=source.slider_min;key.slider_max=source.slider_max
        for j,d in enumerate(samples):key.data[j].co=vs[j]+sum(((source.data[i].co-basis.data[i].co)*w for i,w in d.items()),Vector())
    for b in rig.data.bones:o.vertex_groups.new(name=b.name)
    for j,d in enumerate(samples):
        groups={}
        for i,w in d.items():
            for group in body.data.vertices[i].groups:
                name=body.vertex_groups[group.group].name
                if name in rig.data.bones:groups[name]=groups.get(name,0)+w*group.weight
        groups=dict(sorted(groups.items(),key=lambda p:-p[1])[:4]);total=sum(groups.values())
        for name,w in groups.items():o.vertex_groups[name].add([j],w/total,'REPLACE')
    o.parent=rig;mod=o.modifiers.new('SharedBodySkinning','ARMATURE');mod.object=rig
    return o
tankmat=material('BL_V3_TrainingTank',(.022,.055,.043),.91)
tank=garment('BL_V3_TrainingTank',[
    lambda v:v.z-1.035,
    lambda v:1.465-v.z,
    lambda v:(.165-.055*smooth((v.z-1.31)/.11))-abs(v.x),
    lambda v:(1.36+.106*smooth(abs(v.x)/.085) if v.y<-.01 else 1.414+.052*smooth(abs(v.x)/.085))-v.z,
],.014,tankmat)
shorts=bpy.data.objects['BL_V2_Shorts'];cloth=material('BL_V3_TrainingShorts',(.035,.060,.068),.91);shorts.data.materials[0]=cloth
# Relax the previous close-fitting cloth and add restrained folds on all keys.
for i,v in enumerate(shorts.data.vertices):
    n=v.normal; p=v.co;delta=n*(.004+.0015*math.sin(p.z*93+p.x*37)*g(p.z,.90,.12))
    for key in shorts.data.shape_keys.key_blocks:key.data[i].co+=delta

# Longer breathing/idle, seated preparation, and a brief seated-to-standing clip.
source=(ROOT/'assets/blender/animate_athlete_v2.py').read_text(encoding='utf-8')
exec(source[source.index('def reset():'):source.index('made={}')],globals())
def seated(t):
    pose('Idle',0)
    for s,side in [(-1,'R'),(1,'L')]:
        direction('thigh.'+side,(s*.16,-1,-.08));direction('shin.'+side,(0,.10,-1));direction('foot.'+side,(0,-1,-.46))
        direction('upperArm.'+side,(s*.12,-.50,-.86));direction('forearm.'+side,(-s*.08,-.55,-.83));direction('hand.'+side,(0,-.8,-.45));curl(side,.32)
    rotate('chest',(1,0,0),.055)
    rotate('head',(1,0,0),.13*(1-smooth(t/.20))+.018)
    grounded()
def capture():return {p.name:(p.location.copy(),p.rotation_quaternion.copy(),p.scale.copy()) for p in rig.pose.bones}
rig.animation_data_create();idlepose=None
newclips=[]
for name,length in [('GymIdle',577),('SeatedPrepare',577),('StandUp',37)]:
    action=bpy.data.actions.new(name);action.use_fake_user=True;action['v3CareerClip']=True;rig.animation_data.action=action
    if name=='StandUp':
        seated(1);start=capture();pose('Idle',0);end=capture()
    for frame in (range(1,length+1,12) if name!='StandUp' else range(1,38,3)):
        scene.frame_set(frame);t=(frame-1)/(length-1)
        if name=='GymIdle':
            pose('Idle',0)
            rotate('head',(0,0,1),.045*math.sin(t*math.tau)+.018)
            turn=rig.pose.bones['head'].rotation_quaternion.copy()
            rotate('head',(1,0,0),.018+.012*math.sin(t*math.tau*2))
            rig.pose.bones['head'].rotation_quaternion=turn @ rig.pose.bones['head'].rotation_quaternion
        elif name=='SeatedPrepare':seated(t)
        else:
            k=smooth(t)
            for p in rig.pose.bones:
                a,q,sc=start[p.name];b,r,ss=end[p.name];p.location=a.lerp(b,k);p.rotation_quaternion=q.slerp(r,k);p.scale=sc.lerp(ss,k)
            bpy.context.view_layer.update()
            grounded()
        if name!='StandUp':
            rig.pose.bones['chest'].scale.y=1+.0035*math.sin(t*math.tau*6)
        for p in rig.pose.bones:
            p.keyframe_insert('location',frame=frame,group=p.name);p.keyframe_insert('rotation_quaternion',frame=frame,group=p.name);p.keyframe_insert('scale',frame=frame,group=p.name)
    newclips.append(name)
rig.animation_data.action=bpy.data.actions['GymIdle'];scene.frame_set(1)
body['portraitRevision']='v3-original-pigmentation-roughness-hairflow-garments'
scene.frame_end=577
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v3-work.blend'))
print(json.dumps({'newClips':newclips,'tankVertices':len(tank.data.vertices),'hairFlowVertices':len(mesh.vertices),'workingCopy':bpy.data.filepath}))
