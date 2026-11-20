"""Tailor a licensed CC0 sewn shirt/trouser pattern into gym separates.
Keep the independent clothing surface/UVs, fit to skin, transfer skin/morphs,
and add actual folded hems. No copied logo or branded garment texture.
"""
import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import closest_point_on_tri
ROOT=Path('C:/Users/shota/Documents/BulkLife');body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];col=bpy.data.collections['BULK_LIFE_Athlete_v2'];keys=body.data.shape_keys.key_blocks;basis=keys[0]
if body.get('garmentsV4'):raise RuntimeError('Garments already authored')
def smooth(t):
    t=max(0,min(1,t));return t*t*(3-2*t)
def principal(m):return next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
def material(name,color):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=principal(m);p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.93;p.inputs['Specular IOR Level'].default_value=.18;return m
# Use the exact hm08 barycentric fitting definitions from the already licensed
# v3 pipeline, without executing its editing/export side effects.
s=(ROOT/'assets/blender/finish_portrait_v3.py').read_text(encoding='utf-8')
exec(compile(s[s.index('raw=[]'):s.index('def fit_asset(')],'hm08-fitted-source','exec'))
folder=ROOT/'assets/sources/makehuman-clothing-v4/clothes/male_casualsuit06';name='male_casualsuit06'
mapping=[];factors=[1,1,1];active=False
for line in (folder/(name+'.mhclo')).read_text().splitlines():
    a=line.split()
    if not a or a[0].startswith('#'):continue
    if a[0] in ['x_scale','y_scale','z_scale']:
        axis=['x_scale','y_scale','z_scale'].index(a[0]);factors[axis]=abs(coords[int(a[1])][axis]-coords[int(a[2])][axis])/float(a[3])
    elif a[0]=='verts':active=True
    elif active and a[0].lstrip('-').isdigit():
        if len(a)==9:mapping.append(([int(x) for x in a[:3]],[float(x) for x in a[3:6]],[float(x) for x in a[6:9]]))
        elif len(a)==1:mapping.append(([int(a[0])],[1],[0,0,0]))
        else:active=False
uvs=[];sourcefaces=[];sourceuv=[]
for line in (folder/(name+'.obj')).read_text().splitlines():
    a=line.split()
    if not a:continue
    if a[0]=='vt':uvs.append(tuple(map(float,a[1:3])))
    elif a[0]=='f':
        f=[x.split('/') for x in a[1:]];sourcefaces.append([int(x[0])-1 for x in f]);sourceuv.append([int(x[1])-1 for x in f])
vs=[]
for ids,ws,off in mapping:
    p=sum((sourcepos(i)*w for i,w in zip(ids,ws)),Vector());dx,dy,dz=[v*f*scale for v,f in zip(off,factors)];vs.append(p+Vector((dx,-dz,dy)))
# Source has two connected sewn pieces. Never let the bottom of the shirt
# become an extra shorts waistband, or the trouser waist become a tank hem.
parent=list(range(len(vs)))
def find(i):
    while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
    return i
for f in sourcefaces:
    for i in f[1:]:parent[find(i)]=find(f[0])
groups={}
for i in range(len(vs)):groups.setdefault(find(i),[]).append(i)
shirt={i for ids in groups.values() if sum(vs[j].z for j in ids)/len(ids)>1 for i in ids}
def clip(points,field):
    out=[]
    for a,b in zip(points,points[1:]+points[:1]):
        va,vb=field(a[0]),field(b[0]);inside=va>=0
        if inside:out.append(a)
        if (va>=0)!=(vb>=0):
            t=va/(va-vb);out.append((a[0].lerp(b[0],t),a[1].lerp(b[1],t)))
    return out
tree=BVHTree.FromPolygons([v.co for v in basis.data],[list(p.vertices) for p in body.data.polygons])
def sample(p,clothTree,polygons):
    near,n,index,_=clothTree.find_nearest(p);ids=list(polygons[index]);best=None
    for j in range(1,len(ids)-1):
        tri=[ids[0],ids[j],ids[j+1]];a,b,c=[basis.data[i].co for i in tri];q=closest_point_on_tri(near,a,b,c);u,w=b-a,c-a;v=q-a;uu=u.dot(u);uw=u.dot(w);ww=w.dot(w);den=uu*ww-uw*uw
        if abs(den)<1e-12:continue
        t=(v.dot(u)*ww-v.dot(w)*uw)/den;s=(v.dot(w)*uu-v.dot(u)*uw)/den
        if best is None or (q-near).length_squared<best[0]:best=((q-near).length_squared,list(zip(tri,[1-t-s,t,s])))
    return best[1]
def tailored(label,fields,mat):
    points=[];tex=[];faces=[];lookup={}
    for ids,tids in zip(sourcefaces,sourceuv):
        if (ids[0] in shirt) != label.endswith('Tank'):continue
        poly=[(vs[i],Vector(uvs[u])) for i,u in zip(ids,tids)]
        for f in fields:poly=clip(poly,f)
        if len(poly)<3:continue
        face=[]
        for p,uv in poly:
            key=tuple(round(x,6) for x in p)
            if key not in lookup:lookup[key]=len(points);points.append(p.copy());tex.append(uv.copy())
            face.append(lookup[key])
        faces.append(face)
    # Loose fabric hangs across the pectorals, rather than tracing their groove.
    for p in points:
        if label.endswith('Tank'):
            if p.y<-.04:p.y=min(p.y,-.122-.012*smooth((p.z-1.10)/.22))
            p.y+=.0015*math.sin(p.x*64+p.z*28)*(1-smooth((p.z-1.13)/.12))
        else:
            sign=1 if p.x>0 else -1;center=sign*.10
            p.x=center+(p.x-center)*(1.08+.12*(1-smooth((p.z-.68)/.22)))
            p.y*=1.06
    me=bpy.data.meshes.new(label);me.from_pydata(points,[],faces);me.update()
    # A 2.5mm inner ring and quad faces make the hems real geometry.
    edges={}
    for f in faces:
        for a,b in zip(f,f[1:]+f[:1]):k=tuple(sorted((a,b)));edges[k]=edges.get(k,0)+1
    boundary={i for e,n in edges.items() if n==1 for i in e};inner={}
    for i in sorted(boundary):
        inner[i]=len(points);points.append(points[i]-me.vertices[i].normal*.0025);tex.append(tex[i].copy())
    for (a,b),n in edges.items():
        if n==1:faces.append([a,b,inner[b],inner[a]])
    me.clear_geometry();me.from_pydata(points,[],faces);me.validate(clean_customdata=False);me.update()
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();me.materials.append(mat)
    uv=me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        poly.use_smooth=True
        for loop in poly.loop_indices:uv.data[loop].uv=tex[me.loops[loop].vertex_index]
    o=bpy.data.objects.new(label,me);col.objects.link(o);o.parent=rig
    # Nearest surface alone can bind a shorts hem to an adjacent finger.
    # Restrict transfer to anatomical garment support, including morph deltas.
    support=[]
    for poly in body.data.polygons:
        z=sum(basis.data[i].co.z for i in poly.vertices)/len(poly.vertices)
        excluded=('finger','hand','forearm') if label.endswith('Tank') and z>1.28 else ('finger','hand','forearm','upperArm')
        bad=sum(sum(v.weight for v in body.data.vertices[i].groups if body.vertex_groups[v.group].name.startswith(excluded)) for i in poly.vertices)/len(poly.vertices)
        if bad<.20:support.append(list(poly.vertices))
    clothTree=BVHTree.FromPolygons([v.co for v in basis.data],support)
    samples=[sample(p,clothTree,support) for p in points];o.shape_key_add(name='Basis')
    for k in list(keys)[1:]:
        if k.name=='blink':continue
        target=o.shape_key_add(name=k.name);target.slider_min=k.slider_min;target.slider_max=k.slider_max
        for j,weights in enumerate(samples):target.data[j].co=points[j]+sum(((k.data[i].co-basis.data[i].co)*w for i,w in weights),Vector())
    seat=o.shape_key_add(name='seatedCloth')
    for j,p in enumerate(points):
        w=math.exp(-((p.z-(1.075 if label.endswith('Tank') else .90))/.10)**2)
        seat.data[j].co=p+Vector((0,.0045*math.sin(p.z*138+p.x*24)*w,0))
    for bone in rig.data.bones:o.vertex_groups.new(name=bone.name)
    for j,sampleweights in enumerate(samples):
        group={}
        for i,w in sampleweights:
            for v in body.data.vertices[i].groups:
                name=body.vertex_groups[v.group].name
                if name in rig.data.bones:group[name]=group.get(name,0)+v.weight*w
        group=dict(sorted(group.items(),key=lambda p:-p[1])[:4]);total=sum(group.values())
        for name,w in group.items():o.vertex_groups[name].add([j],max(0,w)/total,'REPLACE')
    mod=o.modifiers.new('SharedBodySkin','ARMATURE');mod.object=rig
    return o
tank=tailored('BL_V4_TrainingTank',[lambda p:p.z-.965,lambda p:(.156+.030*(1-smooth((p.z-1.25)/.17)))-abs(p.x)],material('BL_V4_StoneKnit',(.24,.285,.275)))
shorts=tailored('BL_V4_TrainingShorts',[lambda p:1.015-p.z,lambda p:p.z-.665],material('BL_V4_NavyWoven',(.032,.044,.062)))
for n in ['BL_V3_TrainingTank','BL_V2_Shorts']:bpy.data.objects[n].hide_render=True
# Sports shoes: neutral uppers, a separate light sole and muted socks.
shoes=bpy.data.objects['BL_V3_Trainers'];shoes.data.materials.clear()
for m in [material('BL_V4_TrainerUpper',(.055,.066,.081)),material('BL_V4_TrainerSole',(.42,.45,.46)),material('BL_V4_CottonSock',(.51,.53,.52))]:shoes.data.materials.append(m)
for p in shoes.data.polygons:p.material_index=2 if p.center.z>.115 else 1 if p.center.z<.035 else 0
body['garmentsV4']='tailored-cc0-independent-pattern-folded-hems'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v4-final.blend'))
print('Tailored',len(tank.data.vertices),'tank and',len(shorts.data.vertices),'shorts vertices')
