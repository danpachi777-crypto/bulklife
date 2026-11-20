"""Author the compact gym in the working blend and a room-only loading still.
Room dimensions match the runtime GymRoom component (Y-up -> Blender Z-up).
"""
import bpy,math
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife');scene=bpy.data.scenes['BULK_LIFE_Studio_v2']
if bpy.data.collections.get('BULK_LIFE_Gym_v3'):raise RuntimeError('Gym v3 already authored')
col=bpy.data.collections.new('BULK_LIFE_Gym_v3');scene.collection.children.link(col)
for o in scene.objects:
    if o.name not in bpy.data.collections['BULK_LIFE_Athlete_v2'].objects and o.type in ['MESH','LIGHT']:o.hide_render=True
def mat(name,color,rough=.85,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
    if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
    return m
rubber=mat('BL_V3_Rubber',(.035,.045,.041),.98);wall=mat('BL_V3_Wall',(.055,.10,.075));metal=mat('BL_V3_Metal',(.12,.15,.14),.6);black=mat('BL_V3_Padding',(.018,.035,.027),.8);glass=mat('BL_V3_EveningWindow',(.025,.06,.105),.45,.4)
def box(name,at,size,material):
    x,y,z=at;sx,sy,sz=[v/2 for v in size]
    verts=[(x+a*sx,-z-b*sz,y+c*sy) for a,b,c in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]);mesh.update();o=bpy.data.objects.new(name,mesh);col.objects.link(o);mesh.materials.append(material)
    mod=o.modifiers.new('SmallManufacturedEdges','BEVEL');mod.width=.008;mod.segments=2
    return o
box('GymRubberFloor',(0,-.05,0),(12,.05,12),rubber)
box('GymWall',(0,1.6,-2.3),(8,3.2,.08),wall)
box('EveningWindow',(-.95,1.7,-2.24),(1.5,1.55,.035),glass)
for x in [-1.72,-.95,-.18]:box('WindowFrame',(x,1.7,-2.20),(.04,1.65,.05),black)
for y in [.9,1.7,2.5]:box('WindowFrame',(-.95,y,-2.20),(1.6,.04,.05),black)
box('BenchSeat',(0,.435,-.48),(1.18,.095,.36),black)
for x in [-.43,.43]:box('BenchLeg',(x,.21,-.48),(.055,.4,.065),metal)
box('BenchBrace',(0,.12,-.48),(.92,.045,.045),metal)
for y in [.33,.65]:box('DumbbellRack',(-1.2,y,-1.2),(.9,.06,.4),metal)
for x in [-1.57,-.83]:box('RackLeg',(x,.37,-1.2),(.045,.7,.05),metal)
for i in range(4):
    x=-1.5+i*.2
    box('DumbbellHandle',(x,.72,-1.2),(.15,.035,.035),metal)
    for side in [-1,1]:box('DumbbellHead',(x+side*.065,.72,-1.2),(.04,.10,.10),black)
box('GymLocker',(1.2,1.15,-2.17),(1.2,2.2,.18),wall)
box('LockerSeam',(1.2,1.15,-2.06),(.012,2.1,.015),black)
for x in [1.05,1.35]:box('LockerHandle',(x,1.2,-2.04),(.025,.17,.025),metal)
def light(name,at,power,color,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape=next(i.identifier for i in d.bl_rna.properties['shape'].enum_items if i.identifier=='DISK');d.size=size;o=bpy.data.objects.new(name,d);col.objects.link(o);o.location=at;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
light('GymWarmKey',(-2,-3,3.2),160,(1,.87,.69),3)
light('GymWindowFill',(-1,1.5,2.4),95,(.61,.76,1),2)
light('GymSoftFill',(2,-2,2.5),80,(.85,.95,1),3)
scene.world=scene.world.copy();scene.world.use_nodes=True
bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.09,.13,.12,1);bg.inputs['Strength'].default_value=.35
data=bpy.data.cameras.new('BL_V3_GymCamera');cam=bpy.data.objects.new('BL_V3_GymCamera',data);col.objects.link(cam);scene.camera=cam;data.lens=42
cam.location=(0,-3.0,1.2);cam.rotation_euler=(Vector((0,.1,.90))-cam.location).to_track_quat('-Z','Y').to_euler()
athlete=bpy.data.collections['BULK_LIFE_Athlete_v2'];athlete.hide_render=True
scene.render.resolution_x=576;scene.render.resolution_y=800;scene.render.image_settings.file_format=next(i.identifier for i in scene.render.image_settings.bl_rna.properties['file_format'].enum_items if i.identifier=='JPEG');scene.render.image_settings.quality=85
scene.render.filepath=str(ROOT/'public/assets/gym-loading.jpg');bpy.ops.render.render(write_still=True)
athlete.hide_render=False
for name in ['BL_V2_Hair','BL_V3_HairFlow']:bpy.data.objects[name].hide_render=True
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v3-work.blend'))
print('Saved gym source and room-only loading still')
