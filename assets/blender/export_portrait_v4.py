"""Export the saved v4 duplicate in an isolated Blender process.
Never opens or overwrites the original v2/v3 production files.
"""
import bpy,json,hashlib,io_scene_gltf2
from pathlib import Path
from types import SimpleNamespace
ROOT=Path('C:/Users/shota/Documents/BulkLife')
scene=bpy.data.scenes['BULK_LIFE_Studio_v2']
if bpy.context.window:bpy.context.window.scene=scene
rig=bpy.data.objects['BL_V2_Rig'];body=bpy.data.objects['BL_V2_AthleteBody']
coverage=body.modifiers.get('V4_OutfitCoverage')
if coverage:coverage.show_render=False;coverage.show_viewport=False
col=bpy.data.collections['BULK_LIFE_Athlete_v2']
meta=json.loads((ROOT/'public/assets/portrait-v3.json').read_text())
names=['BL_V2_AthleteBody','BL_V2_Rig','BL_V2_Shorts','BL_V4_Hair','BL_V4_Brow_-1','BL_V4_Brow_1','BL_V4_TrainingTank','BL_V4_TrainingShorts','BL_V3_Trainers']
names += [o.name for o in col.objects if o.name.startswith(('BL_V2_EyeWhite.','BL_V2_Iris.','BL_V2_Pupil.'))]
for o in col.objects:
    if o.type=='MESH' and o.data.shape_keys:
        for k in list(o.data.shape_keys.key_blocks)[1:]:k.value=0
rig.location=(0,0,0);rig.animation_data.action=bpy.data.actions['GymIdle'];scene.frame_set(1)
io_scene_gltf2.on_export_action_filter_changed(SimpleNamespace(export_action_filter=True),bpy.context)
for item in bpy.data.scenes[0].gltf_action_filter:item.keep=bool(item.action) and item.action.name in meta['clips']
with bpy.context.temp_override(scene=scene,view_layer=scene.view_layers[0]):
    bpy.ops.object.select_all(action='DESELECT')
    for name in names:
        o=bpy.data.objects[name];o.hide_viewport=False;o.hide_render=False;o.hide_set(False);o.select_set(True)
    bpy.context.view_layer.objects.active=rig
    fmt=next(i[0] for i in io_scene_gltf2.get_format_items(scene,bpy.context) if '.glb' in i[1])
    path=ROOT/'public/assets/athlete-v4.glb'
    print('EXPORTING ACTOR',flush=True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format=fmt,use_selection=True,use_active_scene=True,export_skins=True,export_morph=True,export_animations=True,export_animation_mode='ACTIONS',export_action_filter=True,export_extras=True)
report={**meta,'revision':'portrait-v4','morphs':meta['morphs'],'expressionMorphs':['blink'],'clothMorphs':['seatedCloth'],'garments':['BL_V2_Shorts','BL_V4_TrainingTank','BL_V4_TrainingShorts'],'glbBytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'triangles':sum(len(p.vertices)-2 for name in names for o in [bpy.data.objects[name]] if o.type=='MESH' for p in o.data.polygons),'sources':['assets/sources/makehuman-system-v3/provenance.json','assets/sources/makehuman-clothing-v4/provenance.json']}
report.pop('source',None)
(ROOT/'public/assets/portrait-v4.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
for n in ['BL_V2_Shorts']:bpy.data.objects[n].hide_render=True
if coverage:coverage.show_render=True;coverage.show_viewport=True
for n in ['BL_V2_Hair','BL_V3_HairFlow','BL_V3_NaturalHair','BL_V3_TrainingTank']:
    if n in bpy.data.objects:bpy.data.objects[n].hide_render=True;bpy.data.objects[n].hide_viewport=True
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v4-final.blend'))
print(json.dumps(report),flush=True)
