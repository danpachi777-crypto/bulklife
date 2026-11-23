"""v6: rebuild regional targets rather than layering another inflation field.
Uses the protected v5 copy as input. No v2-v5 authoring file is saved.
"""
import bpy,math,json,random
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from mathutils.geometry import closest_point_on_tri
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/decisions-v6';OUT.mkdir(parents=True,exist_ok=True)
assert bpy.data.filepath.endswith('bulk-life-athlete-v6-work.blend')
body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];keys=body.data.shape_keys.key_blocks;basis=keys[0]
parts=['upperChest','chest','frontDelts','sideDelts','rearDelts','lats','upperBack','erectors','biceps','triceps','forearms','quads','hamstrings','glutes','calves','abs']
source=(ROOT/'assets/blender/sculpt_athlete_v2.py').read_text(encoding='utf8')
exec(source[source.index('def clamp'):source.index('summaries=')])
old={p:[(v.co-b.co).copy() for v,b in zip(keys[p].data,basis.data)] for p in parts}
# Build only the anatomically partitioned fan / spindle fields. The former raw
# MakeHuman target contribution (broad regions) is deliberately not added again.
loop=source[source.index('    v=point.co.copy();'):source.index('    total=sum(d.values()')]
code=compile('\n'.join(line[4:] for line in loop.splitlines()),'v6-anatomical-targets','exec')
fields={p:[] for p in parts}
for i,point in enumerate(basis.data):
    exec(code)
    for p in parts:fields[p].append(d[p]*({'chest':1.35,'upperChest':1.35,'biceps':1.25,'triceps':1.25,'quads':1.10}.get(p,1.15)))
# Use the licensed sculpted full-muscle endpoint as a shared envelope, partitioned
# across regions. Simultaneous chest/shoulder/arm growth cannot add that endpoint
# several times. The small fan/spindle component supplies directional definition.
def target_file(name):
    result={}
    for line in (ROOT/'assets/sources/makehuman'/name).read_text().splitlines():
        if line.strip() and not line.startswith('#'):
            a=line.split();result[int(a[0])]=Vector(tuple(map(float,a[1:4])))
    return result
raw=[]
for line in (ROOT/'assets/sources/makehuman/base.obj').read_text().splitlines():
    if line.startswith('v '):raw.append(Vector(tuple(map(float,line.split()[1:4]))))
male=target_file('asian-male-young.target');muscle_target=target_file('universal-male-young-maxmuscle-averageweight.target')
indices=json.loads((ROOT/'public/assets/regions-v2.json').read_text())['sourceVertexIndices']
ys=[(raw[i]+male.get(i,Vector())+muscle_target.get(i,Vector())*.25).y for i in indices];scale=1.77/(max(ys)-min(ys))
for i,original in enumerate(indices):
    v=muscle_target.get(original,Vector());endpoint=Vector((v.x,-v.z,v.y))*scale*.75
    weights={p:fields[p][i].length for p in parts};total=sum(weights.values())
    if not total:continue
    # Preserve a pronounced spindle at the upper arm and the anterior/posterior
    # thigh. The former .35 blend erased most of these volumes when flexed.
    # Joint masks come from the anatomical fields; joint centres stay unchanged.
    for p in parts:
        definition={'biceps':.95,'triceps':.95,'chest':.65,'upperChest':.65,'quads':.75,'hamstrings':.75,'glutes':.70}.get(p,.55)
        fields[p][i]=endpoint*(weights[p]/total)+fields[p][i]*definition
adj=[set() for _ in basis.data]
for edge in body.data.edges:a,b=edge.vertices;adj[a].add(b);adj[b].add(a)
for p,values in fields.items():
    for step in range(2):values=[v.lerp(sum((values[j] for j in adj[i]),Vector())/len(adj[i]),.22) if adj[i] else v for i,v in enumerate(values)]
    fields[p]=values
    for i,d in enumerate(values):keys[p].data[i].co=basis.data[i].co+d
# Flesh follows bony landmarks; facial identity and eye size are retained.
for i,v in enumerate(basis.data):
    x,y,z=v.co;ax=abs(x);front=smooth((-y-.105)/.030);d=Vector()
    d.y-=.0020*gauss(ax,.033,.027)*gauss(z,1.675,.010)*front
    d.y-=.0012*gauss(ax,.033,.020)*gauss(z,1.642,.009)*front
    d.y-=.0025*gauss(ax,.048,.024)*gauss(z,1.626,.018)*front
    d.y+=.0014*gauss(ax,.044,.022)*gauss(z,1.594,.018)*front
    d.y-=.0015*gauss(ax,.018,.011)*gauss(z,1.605,.010)*front
    d.y-=.0010*gauss(ax,.017,.019)*gauss(z,1.578,.007)*front
    # Clavicle/neck base planes, not texture-painted lines.
    d.y-=.0021*gauss(ax,.065,.055)*gauss(z,1.447,.010)*smooth((-y-.025)/.045)
    d.y+=.0015*gauss(ax,0,.020)*gauss(z,1.464,.016)*smooth((-y-.025)/.045)
    for key in keys:key.data[i].co+=d
# Broader adipose distribution retains the original cheeks/flanks/limb target;
# soften belly definition with fat without adding noise or changing joint centres.
for i,v in enumerate(basis.data):
    relief=sum((fields[p][i] for p in parts),Vector())
    keys['bodyFat'].data[i].co-=relief*.22
    keys['pump'].data[i].co=v.co+relief*.075
body.data.update()
# Do not drag the medial thorax with the arm. Preserve transition over a finite
# strip rather than assigning a hard chest/arm boundary.
changed=0
for v in body.data.vertices:
    x,y,z=basis.data[v.index].co;ax=abs(x)
    if not(1.20<z<1.46 and .09<ax<.205):continue
    blend=(1-smooth((ax-.145)/.065))*smooth((z-1.20)/.09)
    groups={body.vertex_groups[g.group].name:g.weight for g in v.groups if body.vertex_groups[g.group].name in rig.data.bones}
    moved=0
    for name in list(groups):
        if name.startswith('upperArm.'):
            take=groups[name]*blend*.78;groups[name]-=take;moved+=take
    if not moved:continue
    groups['chest']=groups.get('chest',0)+moved
    groups=dict(sorted(groups.items(),key=lambda q:-q[1])[:4]);total=sum(groups.values())
    for g in list(v.groups):
        if body.vertex_groups[g.group].name in rig.data.bones:body.vertex_groups[g.group].remove([v.index])
    for name,w in groups.items():
        if w>0:body.vertex_groups[name].add([v.index],w/total,'REPLACE')
    changed+=1
# Pose-space axillary lift: inverse-skin a shallow correction that preserves the
# continuous pectoral fold instead of pulling a large flat web from the chest.
coverage=body.modifiers.get('V4_OutfitCoverage')
if coverage:coverage.show_render=False;coverage.show_viewport=False
for k in keys:k.value=0
rig.animation_data.action=bpy.data.actions['FrontDoubleBiceps'];bpy.context.scene.frame_set(25);bpy.context.view_layer.update()
for i,v in enumerate(basis.data):
    matrix=Matrix(((0,0,0,0),)*4);total=0
    for g in body.data.vertices[i].groups:
        name=body.vertex_groups[g.group].name
        if name in rig.pose.bones:matrix+=(rig.pose.bones[name].matrix@rig.data.bones[name].matrix_local.inverted())*g.weight;total+=g.weight
    if not total:continue
    matrix*=1/total;posed=matrix@v.co
    mask=gauss(abs(posed.x),.225,.075)*gauss(posed.z,1.365,.090)*smooth((abs(v.co.x)-.12)/.075)
    target=posed+Vector((0,0,.016*mask));delta=matrix.inverted_safe()@target-v.co
    if delta.length>.020:delta*=.020/delta.length
    keys['shoulderRaise'].data[i].co=v.co+delta
# Transfer the same surface fields and actual bone weights to all garments.
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
for name in ['BL_V2_Shorts','BL_V4_TrainingTank','BL_V4_TrainingShorts']:
    o=bpy.data.objects[name];ks=o.data.shape_keys.key_blocks
    for i,v in enumerate(ks[0].data):
        mapping=sample(v.co);ease=Vector()
        if name=='BL_V4_TrainingTank':
            point,n,_,_=tree.find_nearest(v.co);ease=n*(.004+.005*gauss(v.co.z,1.12,.20))
        elif name=='BL_V4_TrainingShorts':
            point,n,_,_=tree.find_nearest(v.co);ease=n*.003
        for key in ks:key.data[i].co+=ease
        for p in parts+['bodyFat','pump']:
            ks[p].data[i].co=ks[0].data[i].co+sum(((keys[p].data[j].co-basis.data[j].co)*w for j,w in mapping),Vector())
        groups={}
        for j,w in mapping:
            for g in body.data.vertices[j].groups:
                gn=body.vertex_groups[g.group].name
                if gn in rig.data.bones:groups[gn]=groups.get(gn,0)+g.weight*w
        groups=dict(sorted(groups.items(),key=lambda p:-p[1])[:4]);total=sum(groups.values())
        for g in list(o.data.vertices[i].groups):
            if o.vertex_groups[g.group].name in rig.data.bones:o.vertex_groups[g.group].remove([i])
        for gn,w in groups.items():
            vg=o.vertex_groups.get(gn) or o.vertex_groups.new(name=gn)
            if total and w>0:vg.add([i],w/total,'REPLACE')
    o['v6SurfaceTransfer']='barycentric regional targets and four-bone weights';o.data.update()
# Sculpt directional short clumps on a smooth scalp shell, replacing uniform
# tiny random fibers. Thick-to-thin strands use opaque geometry for stable mobile.
hair=bpy.data.objects['BL_V4_Hair'];scalp=bpy.data.objects['BL_V2_Hair'];scalp.data.update();random.seed(23917)
vs=[v.co.copy()+v.normal*.0004 for v in scalp.data.vertices];faces=[tuple(p.vertices) for p in scalp.data.polygons]
for strand in range(540):
    poly=random.choice(list(scalp.data.polygons));ids=list(poly.vertices);ws=[random.random() for _ in ids];total=sum(ws);ws=[w/total for w in ws]
    p=sum((scalp.data.vertices[k].co*w for k,w in zip(ids,ws)),Vector());n=sum((scalp.data.vertices[k].normal*w for k,w in zip(ids,ws)),Vector()).normalized();top=smooth((p.z-1.687)/.055)
    flow=Vector((.75*top,.8*top+.1,-.9*(1-top)));flow-=n*flow.dot(n)
    if flow.length<.01:continue
    flow.normalize();cross=n.cross(flow).normalized();length=.007+top*.023+random.random()*.006;width=.0011+top*.0018+random.random()*.0007;j=len(vs)
    for t in [0,.2,.45,.7,1]:
        q=p+flow*length*t+n*(.0007+math.sin(t*math.pi)*(.001+top*.002));w=width*(1-t*.93)
        vs.extend([q-cross*w,q+n*.0006,q+cross*w])
    for k in range(4):
        for side in range(2):faces.append((j+k*3+side,j+k*3+side+1,j+(k+1)*3+side+1,j+(k+1)*3+side))
me=bpy.data.meshes.new('V6_DirectionalShortGroom');me.from_pydata(vs,[],faces);me.update();hair.data=me
mat=bpy.data.materials.new('V6_ShortHair');mat.use_nodes=True;pr=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');pr.inputs['Base Color'].default_value=(.032,.021,.014,1);pr.inputs['Roughness'].default_value=.66;pr.inputs['Specular IOR Level'].default_value=.28;me.materials.append(mat)
for p in me.polygons:p.use_smooth=True
vg=hair.vertex_groups.get('head') or hair.vertex_groups.new(name='head');vg.add(list(range(len(vs))),1,'REPLACE')
exec(compile((ROOT/'assets/blender/refine_hair_v6.py').read_text(encoding='utf8'),'refine_hair_v6','exec'))
body['v6Revision']='independent-anatomical-fields; medial-thorax-weight-fix; pose-space-fold';body['v6ThoraxWeights']=changed
report={'source':'v5 protected copy','thoraxWeightsChanged':changed,'hairVertices':len(hair.data.vertices),'morphs':{p:{'beforeMax':max(v.length for v in old[p]),'afterMax':max(v.length for v in fields[p])} for p in parts},'notes':'Growth targets replaced with a partitioned full-muscle endpoint, not added to old deltas. Continuous skin and original simulation mapping preserved.'}
(OUT/'authoring-changes.json').write_text(json.dumps(report,indent=2),encoding='utf8')
rig.animation_data.action=bpy.data.actions['GymIdle'];bpy.context.scene.frame_set(1)
for k in keys:k.value=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v6-work.blend'))
# Export through the selected-mesh pipeline. Keep all prior exports unchanged.
export=(ROOT/'assets/blender/export_portrait_v4.py').read_text(encoding='utf8').replace('athlete-v4.glb','athlete-v6.glb').replace('portrait-v4.json','portrait-v6.json').replace("'portrait-v4'","'portrait-v6'").replace('bulk-life-athlete-v4-final.blend','bulk-life-athlete-v6-work.blend')
exec(compile(export,'export_portrait_v6','exec'))
path=ROOT/'public/assets/portrait-v6.json';meta=json.loads(path.read_text());meta['poseMorphs']=['shoulderRaise'];path.write_text(json.dumps(meta,indent=2)+'\n',encoding='utf8')
print('V6 new regional targets, thorax weights, face planes, groom and garment surface transfer exported',flush=True)
