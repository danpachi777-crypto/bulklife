"""Face planes, relaxed closed lips, eyelids, bone landmarks and a short groom.
Only runs on the v4 working copy. Original v2/v3 remain unchanged.
"""
import bpy,math,random
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path('C:/Users/shota/Documents/BulkLife')
assert bpy.data.filepath.endswith('bulk-life-athlete-v4-work.blend')
body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];col=bpy.data.collections['BULK_LIFE_Athlete_v2'];keys=body.data.shape_keys.key_blocks;basis=keys[0]
if body.get('portraitRevisionV4'):raise RuntimeError('Already applied')
def smooth(t):
    t=max(0,min(1,t));return t*t*(3-2*t)
def g(v,c,r):return math.exp(-2*((v-c)/r)**2)
def material(name,color,rough=.8):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Specular IOR Level'].default_value=.25;return m
for i,p in enumerate(basis.data):
    x,y,z=p.co;ax=abs(x);front=smooth((-y-.10)/.035);d=Vector()
    # Close the lip aperture while retaining lip volume and the nasolabial planes.
    mouth=g(x,0,.029)*g(z,1.576,.018)*front
    d.z += (1.576-z)*.54*mouth
    d.y += .0016*mouth*g(z,1.580,.015)
    # Relax high upper lids; retain tear ducts and lower-lid thickness.
    eye=g(ax,.032,.015)*g(z,1.656,.008)*front
    if z>1.651:d.z-=.00125*eye
    if 1.642<z<1.652:d.y-=.00045*g(ax,.032,.014)*g(z,1.648,.006)*front
    # Subtle bone planes, not etched muscle lines or a different facial identity.
    d.y-=.0017*g(ax,.040,.040)*g(z,1.545,.021)*front
    clav=g(z,1.450,.013)*g(ax,.085,.070)*smooth((-y-.015)/.055)
    d.y-=.0028*clav
    d.y+=.0017*g(ax,.040,.027)*g(z,1.465,.016)*front
    neck=g(ax,.034,.018)*g(z,1.494,.041)*smooth((-y-.02)/.045)
    d.y-=.0016*neck
    # Broaden the distal thigh transition, with distinct patella and ankle planes.
    d.x+=math.copysign(.004*g(z,.595,.085)*g(ax,.11,.10),x)
    d.y-=.0018*g(z,.515,.026)*g(ax,.105,.052)*smooth((-y-.02)/.04)
    d.y+=.0018*g(z,1.34,.10)*g(ax,.085,.06)*smooth((y-.03)/.05)
    for key in keys:key.data[i].co+=d
body.data.update()
# Blink closes the actual upper/lower lid loops over the eyeball.
blink=body.shape_key_add(name='blink');blink.slider_min=0;blink.slider_max=1
for i,p in enumerate(basis.data):blink.data[i].co=p.co
for i,p in enumerate(basis.data):
    x,y,z=p.co;ax=abs(x)
    if .016<ax<.05 and y<-.126 and 1.638<z<1.666:
        width=smooth((ax-.016)/.006)*smooth((.05-ax)/.006)
        upper=smooth((z-1.650)/.004)*smooth((1.668-z)/.008)
        lower=smooth((1.651-z)/.004)*smooth((z-1.637)/.008)
        blink.data[i].co.z+=width*(-.0068*upper+.0022*lower)
        blink.data[i].co.y-=.0008*width*(upper+lower)
# Unify excess leg redness without painting anatomical shadows into the skin.
for i,p in enumerate(basis.data):
    lower=1-smooth((p.co.z-.76)/.25)
    body.data.color_attributes['SkinTone'].data[i].color=(.96-.045*lower,.95+.012*lower,.94+.023*lower,1)
skin=body.data.materials[0];pr=next(n for n in skin.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
pr.inputs['Specular IOR Level'].default_value=.24
for n in skin.node_tree.nodes:
    if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.075
for n in ['BL_V2_EyeSclera','BL_V2_Iris','BL_V2_Pupil']:
    mat=bpy.data.materials[n];p=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Roughness'].default_value=.38;p.inputs['Specular IOR Level'].default_value=.28

def rig_mesh(name,vs,faces,mat):
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],faces);me.update();o=bpy.data.objects.new(name,me);col.objects.link(o);me.materials.append(mat)
    for p in me.polygons:p.use_smooth=True
    o.parent=rig;vg=o.vertex_groups.new(name='head');vg.add(list(range(len(vs))),1,'REPLACE');mod=o.modifiers.new('HeadSkin','ARMATURE');mod.object=rig
    return o
tree=BVHTree.FromPolygons([p.co for p in basis.data],[list(p.vertices) for p in body.data.polygons])
random.seed(20421);browmat=material('BL_V4_BrowHair',(.031,.021,.014),.82)
for side in [-1,1]:
    vs=[];faces=[]
    for i in range(230):
        t=random.random();x=side*(.013+.041*t)
        z=1.669+.004*math.sin(t*math.pi)-.003*t+random.uniform(-.0011,.0011)
        p,n,_,_=tree.find_nearest(Vector((x,-.17,z)));p+=n*.00055
        length=.0028+random.random()*.0018;direction=Vector((side*(.25+.7*t),.10,.95-.75*t)).normalized()
        across=direction.cross(n).normalized()*(.00014+.00010*random.random())
        j=len(vs);vs.extend([p-across,p+across,p+direction*length+n*.00025]);faces.append((j,j+1,j+2))
    rig_mesh('BL_V4_Brow_'+str(side),vs,faces,browmat)
for n in ['BL_V2_Eyebrow.L','BL_V2_Eyebrow.R']:
    o=bpy.data.objects[n];o.hide_render=True;o.hide_viewport=True
# One finished short hairstyle: scalp-following base and tapered 3D fibers.
scalp=bpy.data.objects['BL_V2_Hair'];scalp.data.update();vs=[v.co.copy()-v.normal*.0008 for v in scalp.data.vertices];faces=[tuple(p.vertices) for p in scalp.data.polygons]
for i,v in enumerate(vs):
    edge=smooth((1.71-v.z)/.055);v.z+=edge*(.0012*math.sin(v.x*377)+.0007*math.cos(v.y*411))
hairmat=material('BL_V4_ShortHair',(.035,.023,.014),.73)
hair=rig_mesh('BL_V4_Hair',vs,faces,hairmat)
colors=[(.48,.42,.36,1) for _ in vs]
for _ in range(2600):
    poly=random.choice(list(scalp.data.polygons));ids=list(poly.vertices);weights=[random.random() for _ in ids];total=sum(weights);weights=[w/total for w in weights]
    p=sum((scalp.data.vertices[k].co*w for k,w in zip(ids,weights)),Vector());n=sum((scalp.data.vertices[k].normal*w for k,w in zip(ids,weights)),Vector()).normalized()
    top=smooth((p.z-1.685)/.065);length=.003+top*.013+random.random()*.004
    flow=Vector((.50*top,.65*top+.22,-(1-top)*.8));flow-=n*flow.dot(n);flow.normalize()
    along=n.cross(flow).normalized();width=.00032+random.random()*.00038;j=len(vs)
    for t in [0,.38,.74,1]:
        q=p+flow*(length*t)+n*(.001+math.sin(t*math.pi)*length*.28);w=width*(1-t*.9)
        vs.extend([q-along*w,q+along*w]);shade=.75+random.random()*.42;colors.extend([(shade,shade*.92,shade*.82,1)]*2)
    for k in range(3):faces.append((j+k*2,j+k*2+1,j+k*2+3,j+k*2+2))
old=hair.data;me=bpy.data.meshes.new('BL_V4_ShortGroom');me.from_pydata(vs,[],faces);me.update();hair.data=me;me.materials.append(hairmat)
for p in me.polygons:p.use_smooth=True
color=me.color_attributes.new(name='HairVariation',type='FLOAT_COLOR',domain='POINT')
for c,v in zip(color.data,colors):c.color=v
vg=hair.vertex_groups.get('head') or hair.vertex_groups.new(name='head');vg.add(list(range(len(vs))),1,'REPLACE')
attr=hairmat.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='HairVariation';p=next(n for n in hairmat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
mix=hairmat.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[1].default_value=(.045,.029,.018,1);hairmat.node_tree.links.new(attr.outputs['Color'],mix.inputs[2]);hairmat.node_tree.links.new(mix.outputs[0],p.inputs['Base Color'])
for name in ['BL_V2_Hair','BL_V3_HairFlow','BL_V3_NaturalHair']:
    bpy.data.objects[name].hide_render=True;bpy.data.objects[name].hide_viewport=True
body['portraitRevisionV4']='closed-mouth-lid-planes-short-groom'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v4-work.blend'))
print('Refined facial planes, lips, brows, eyelids, body landmarks and short groom')
