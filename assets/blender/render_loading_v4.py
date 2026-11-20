import bpy,math
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife')
exec(compile((ROOT/'assets/blender/qa_portrait_v4.py').read_text(encoding='utf-8'),'qa_portrait_v4.py','exec'))
state(wear=True,clip='SeatedPrepare',frame=193)
for c in ['BL_V4_QA_Neutral']:bpy.data.collections[c].hide_render=True
bpy.data.collections['BULK_LIFE_Gym_v4'].hide_render=False
for o in scene.objects:
    if o.type=='LIGHT':o.hide_render=not o.name.startswith('GymV4_')
scene.world.use_nodes=True
bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.15,.17,.18,1);bg.inputs['Strength'].default_value=.45
camera=scene.camera;camera.location=(0,-3.15,1.10);camera.rotation_euler=(Vector((0,.30,.85))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=45
scene.render.resolution_x=640;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=86;scene.render.filepath=str(ROOT/'public/assets/gym-loading.jpg')
bpy.ops.render.render(write_still=True,scene=scene.name)
coverage=body.modifiers.get('V4_OutfitCoverage')
if coverage:coverage.show_viewport=True;coverage.show_render=True
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v4-final.blend'))
