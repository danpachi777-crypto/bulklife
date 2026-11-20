"""A small manufactured gym: bevels, independent surfaces and window depth.
The actual authored collection is exported and loaded by the game.
"""
import bpy,math,random,json,io,contextlib,io_scene_gltf2
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife');OUT=ROOT/'assets/blender/portrait-v4-textures';OUT.mkdir(exist_ok=True)
scene=bpy.data.scenes['BULK_LIFE_Studio_v2']
if bpy.data.collections.get('BULK_LIFE_Gym_v4'):raise RuntimeError('Room already authored')
col=bpy.data.collections.new('BULK_LIFE_Gym_v4');scene.collection.children.link(col)
floorGroup=bpy.data.objects.new('GymV4Floor',None);backdrop=bpy.data.objects.new('GymV4Backdrop',None);col.objects.link(floorGroup);col.objects.link(backdrop)
def material(name,color,rough=.8,metal=0,emit=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
    return m
wall=material('GymV4_PaintedWall',(.20,.235,.225),.92);steel=material('GymV4_PowderSteel',(.07,.085,.094),.47,.4);grip=material('GymV4_BrushedGrip',(.38,.40,.42),.37,.72);black=material('GymV4_Rubber',(.025,.031,.035),.94);cushion=material('GymV4_Cushion',(.065,.073,.075),.82);locker=material('GymV4_LockerPaint',(.10,.125,.13),.63,.12);light=material('GymV4_Diffuser',(.9,.88,.80),.5,0,.7)
def box(name,at,size,mat,bevel=.006,group=backdrop):
    x,y,z=at;a,b,c=[v/2 for v in size];vs=[(x+i*a,y+j*b,z+k*c) for i,j,k in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]];faces=[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],faces);me.materials.append(mat);me.update();o=bpy.data.objects.new(name,me);col.objects.link(o);o.parent=group
    if bevel:mod=o.modifiers.new('ManufacturedEdge','BEVEL');mod.width=bevel;mod.segments=3
    return o
def cylinder(name,at,length,radius,mat,n=24):
    vs=[];faces=[];x,y,z=at
    edge=min(.004,length*.2)
    for a,r in [(-length/2,radius*.87),(-length/2+edge,radius),(length/2-edge,radius),(length/2,radius*.87)]:
        for j in range(n):angle=j*math.tau/n;vs.append((x+a,y+math.cos(angle)*r,z+math.sin(angle)*r))
    faces.extend([tuple(reversed(range(n))),tuple(3*n+j for j in range(n))])
    for k in range(3):
        for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],faces);me.materials.append(mat);me.update();o=bpy.data.objects.new(name,me);col.objects.link(o);o.parent=backdrop
    for p in me.polygons:p.use_smooth=n>6
    return o
# A millimetre-grain rubber image, tiled at one metre rather than a giant grid.
N=256;random.seed(121);pixels=[]
for y in range(N):
    for x in range(N):
        v=.175+random.random()*.028;pixels.extend((v,v*1.015,v*1.025,1))
im=bpy.data.images.new('GymV4_RubberGrain',N,N);im.pixels.foreach_set(pixels);im.filepath_raw=str(OUT/'rubber.png');im.file_format='PNG';im.save();im.pack()
floorMat=material('GymV4_Floor',(.05,.05,.05),.96);p=next(n for n in floorMat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');tex=floorMat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;floorMat.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
o=box('GymFloor',(0,0,-.05),(12,12,.05),floorMat,0,floorGroup);uv=o.data.uv_layers.new(name='FloorMetres')
for loop in o.data.loops:pt=o.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(pt.x,pt.y)
seam=material('GymV4_SubtleSeam',(.027,.031,.034),.98)
for a in range(-3,4):
    box('MatJointX',(a,0,-.024),(0.0015,6,.001),seam,0,floorGroup);box('MatJointY',(0,a,-.024),(6,.0015,.001),seam,0,floorGroup)
box('WarmNeutralWall',(0,2.35,1.6),(8,.08,3.25),wall,.003)
box('WallSkirting',(0,2.285,.055),(8,.035,.11),steel,.006)
# Window has a recessed frame, a quiet skyline and a restrained fixture reflection.
W,H=256,320;pixels=[];random.seed(41)
for y in range(H):
    for x in range(W):
        t=y/H;base=(.035+.035*t,.055+.055*t,.085+.080*t)
        building=(x//21)%3;skyline=y<H*(.19+.025*building)
        lit=skyline and (x%21 in [5,6,12,13]) and (y%17 in [5,6]) and ((x//21+y//17)%4==0)
        c=(.32,.30,.23) if lit else tuple(v*.55 for v in base) if skyline else base
        pixels.extend((*c,1))
im=bpy.data.images.new('GymV4_EveningOutside',W,H);im.pixels.foreach_set(pixels);im.filepath_raw=str(OUT/'evening.png');im.file_format='PNG';im.save();im.pack()
window=material('GymV4_Outside',(.07,.10,.15),.40,0,.2);p=next(n for n in window.node_tree.nodes if n.type=='BSDF_PRINCIPLED');t=window.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;window.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color']);window.node_tree.links.new(t.outputs['Color'],p.inputs['Emission Color'])
o=box('RecessedEveningWindow',(-.96,2.285,1.72),(1.55,.03,1.60),window,.004);uv=o.data.uv_layers.new(name='WindowUV')
for l in o.data.loops:pt=o.data.vertices[l.vertex_index].co;uv.data[l.index].uv=((pt.x+1.735)/1.55,(pt.z-.92)/1.60)
for x in [-1.75,-.96,-.17]:box('WindowMullion',(x,2.245,1.72),(.045,.075,1.68),steel,.007)
for z in [.90,1.72,2.54]:box('WindowMullion',(-.96,2.245,z),(1.63,.075,.045),steel,.007)
reflection=material('GymV4_WindowReflection',(.15,.19,.20),.25,.15)
box('WindowFixtureReflection',(-.53,2.222,2.27),(.45,.002,.018),reflection,.003)
# Locker is an actual cabinet with inset door, ventilation slots and a plinth.
box('LockerCabinet',(1.16,2.16,1.13),(1.12,.30,2.18),locker,.018)
for x in [.885,1.435]:
    box('LockerDoor',(x,1.994,1.15),(.53,.025,2.07),locker,.010)
    box('LockerHandle',(x+.16,1.957,1.14),(.018,.035,.17),grip,.006)
    for z in [1.89,1.93,1.97]:box('LockerVent',(x,1.975,z),(.22,.004,.007),steel,.002)
box('LockerPlinth',(1.16,2.14,.06),(1.10,.28,.08),steel,.008)
# Same seating height as the athlete's authored rest pose.
box('BenchCushion',(0,.48,.435),(1.18,.36,.095),cushion,.023)
box('BenchUnderside',(0,.48,.372),(1.10,.30,.035),steel,.008)
for x in [-.43,.43]:
    box('BenchSupport',(x,.48,.205),(.055,.065,.34),steel,.010)
    box('BenchFoot',(x,.48,.035),(.20,.53,.045),steel,.010)
    for y in [.245,.715]:box('BenchRubberEnd',(x,y,.032),(.21,.065,.05),black,.008)
box('BenchCrossbar',(0,.48,.13),(.86,.045,.045),steel,.008)
# Compact rack and explicit six-sided rubber heads / metal handles.
for z in [.35,.70]:box('DumbbellShelf',(-1.28,1.25,z),(.92,.40,.045),steel,.010)
for x in [-1.65,-.91]:box('RackUpright',(x,1.25,.37),(.04,.05,.70),steel,.007)
for x in [-1.60,-1.34,-1.08]:
    cylinder('KnurledGrip',(x,1.22,.78),.115,.012,grip)
    for end in [-1,1]:cylinder('HexRubberWeight',(x+end*.085,1.22,.78),.065,.065,black,6)
    for r in range(7):cylinder('GripRing',(x-.045+r*.015,1.22,.78),.002,.0125,grip,18)
box('CeilingFixture',(-.6,.0,2.82),(1.55,.13,.055),steel,.010)
box('CeilingDiffuser',(-.6,-.005,2.783),(1.47,.10,.014),light,.005)
# Author matching artist-preview light sources; runtime uses the same directions.
for name,loc,energy,size in [('Key',(-1.5,-2.2,3.3),420,2.6),('Fill',(2,-2.5,2.0),230,3),('Window',(-.9,2,2.5),250,2)]:
    data=bpy.data.lights.new('GymV4_'+name,'AREA');data.energy=energy;data.size=size;o=bpy.data.objects.new('GymV4_'+name,data);col.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
# Export only this environment; no human or saves in the room asset.
if bpy.context.window:bpy.context.window.scene=scene
with bpy.context.temp_override(scene=scene,view_layer=scene.view_layers[0]):
    bpy.ops.object.select_all(action='DESELECT')
    for o in col.objects:
        if o.type!='LIGHT':o.select_set(True)
    for o in col.objects:
        if o.type=='MESH':
            bpy.context.view_layer.objects.active=o
            for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.context.view_layer.objects.active=floorGroup
    props=bpy.ops.export_scene.gltf.get_rna_type().properties
    fmt=next(i[0] for i in io_scene_gltf2.get_format_items(scene,bpy.context) if '.glb' in i[1])
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets/gym-v4-room.glb'),export_format=fmt,use_selection=True,export_animations=False,export_apply=False,export_lights=False,export_cameras=False,export_extras=True)
for name in ['BULK_LIFE_Gym_v3','BL_V4_QA_Neutral']:
    if name in bpy.data.collections:bpy.data.collections[name].hide_render=True
col.hide_render=False
for o in scene.objects:
    if o.type=='LIGHT':o.hide_render=o.name not in ['GymV4_Key','GymV4_Fill','GymV4_Window']
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v4-final.blend'))
print('Gym asset', (ROOT/'public/assets/gym-v4-room.glb').stat().st_size, 'bytes')
