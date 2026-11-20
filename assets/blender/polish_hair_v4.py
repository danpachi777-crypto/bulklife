"""Replace rejected cap-like groom with a fitted, trimmed CC0 card hairstyle."""
import bpy,bmesh,math,random
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path('C:/Users/shota/Documents/BulkLife');body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];col=bpy.data.collections['BULK_LIFE_Athlete_v2'];basis=body.data.shape_keys.key_blocks[0]
if body.get('hairPolishV4'):raise RuntimeError('Hair already fitted')
old=bpy.data.objects.get('BL_V4_Hair')
if old:bpy.data.objects.remove(old,do_unlink=True)
source=bpy.data.objects['BL_V3_NaturalHair'];hair=source.copy();hair.data=source.data.copy();hair.name='BL_V4_Hair';col.objects.link(hair);hair.hide_render=False;hair.hide_viewport=False
tree=BVHTree.FromPolygons([v.co for v in basis.data],[list(p.vertices) for p in body.data.polygons])
for v in hair.data.vertices:
    p,n,_,dist=tree.find_nearest(v.co)
    if v.co.z>1.69:v.co=p+(v.co-p)*.75
    elif abs(v.co.x)>.065:v.co=p+(v.co-p)*.67
# Keep the source's feathered UV edge at the nape. Cutting across card faces
# creates rectangular steps that become obvious in the back close-up.
hair.data.update();m=source.data.materials[0].copy();m.name='BL_V4_FittedHair';hair.data.materials[0]=m
p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Roughness'].default_value=.78;p.inputs['Specular IOR Level'].default_value=.25
# Multiply the existing colored fiber image by warm brown, not opaque black.
base=p.inputs['Base Color'];links=list(base.links)
if links:
    socket=links[0].from_socket;m.node_tree.links.remove(links[0]);mix=m.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(.34,.27,.21,1);m.node_tree.links.new(socket,mix.inputs[1]);m.node_tree.links.new(mix.outputs[0],base)
for n in ['BL_V2_Hair','BL_V3_HairFlow','BL_V3_NaturalHair']:bpy.data.objects[n].hide_render=True;bpy.data.objects[n].hide_viewport=True
for side in [-1,1]:
    o=bpy.data.objects['BL_V4_Brow_'+str(side)];vs=[];faces=[];random.seed(500+side)
    for i in range(620):
        t=random.random();x=side*(.013+.039*t);z=1.667+.0034*math.sin(t*math.pi)-.0015*t+random.uniform(-.0013,.0013)*math.sin(t*math.pi)**.35
        q,n,_,_=tree.find_nearest(Vector((x,-.17,z)));q+=n*.00065
        d=Vector((side*(.25+.6*t),0,1-.8*t)).normalized();across=d.cross(n).normalized()*(.00010+.00005*random.random());length=.0015+random.random()*.0013
        j=len(vs);vs.extend([q-across,q+across,q+d*length+n*.0002]);faces.append((j,j+1,j+2))
    for v in vs:v.z=1.667+(v.z-1.667)*.70
    me=bpy.data.meshes.new('BL_V4_FeatheredBrow');me.from_pydata(vs,[],faces);me.materials.append(o.data.materials[0]);o.data=me
    vg=o.vertex_groups.get('head') or o.vertex_groups.new(name='head');vg.add(list(range(len(vs))),1,'REPLACE')
body['hairPolishV4']=True
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v4-work.blend'))
