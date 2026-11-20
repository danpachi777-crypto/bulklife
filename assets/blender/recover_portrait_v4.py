"""Recover appended v4 assets into a clean scene after 5.3 depsgraph failure.
Source is read-only. Rebuild scene/view-layer state instead of loading broken UI state.
"""
import bpy
from pathlib import Path
ROOT=Path('C:/Users/shota/Documents/BulkLife')
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.name='BULK_LIFE_Studio_v2'
with bpy.data.libraries.load(str(ROOT/'assets/blender/bulk-life-athlete-v4-work.blend'),link=False) as (src,dst):
    dst.collections=[n for n in src.collections if n in ['BULK_LIFE_Athlete_v2','BL_V4_QA_Neutral']]
    dst.actions=src.actions
    dst.objects=['BL_V3_GymCamera']
for col in dst.collections:scene.collection.children.link(col)
for o in dst.objects:
    if o and not o.users_collection:scene.collection.objects.link(o)
scene.camera=bpy.data.objects.get('BL_V3_GymCamera')
scene.world=bpy.data.worlds.new('V4_Studio_World');scene.world.use_nodes=True
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.fps=24
print('Rebuilt scene from protected asset library',flush=True)
exec(compile((ROOT/'assets/blender/gym_room_v4.py').read_text(encoding='utf-8'),'gym_room_v4.py','exec'))
exec(compile((ROOT/'assets/blender/export_portrait_v4.py').read_text(encoding='utf-8'),'export_portrait_v4.py','exec'))
